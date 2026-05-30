const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const prisma = require('./prismaClient');

class VoipService {
  /**
   * Gera uma senha forte altamente segura para o registro SIP.
   * Mínimo de 24 caracteres aleatórios e seguros.
   */
  generateStrongPassword(length = 24) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    // Usar crypto para segurança criptográfica
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Gera o ramal WebRTC numérico para um morador com base no número do apartamento.
   * Ex: Apt 101, Morador 1 -> 10101
   * Limpa caracteres não-numéricos para garantir compatibilidade SIP.
   */
  generateExtensionForResident(apartmentNumber, residentIndex) {
    const cleaned = (apartmentNumber || '').replace(/\D/g, '');
    const indexStr = String(residentIndex).padStart(2, '0');
    return `${cleaned || '100'}${indexStr}`;
  }

  /**
   * Gera o ramal do grupo de toque para o apartamento.
   * Ex: Apt 101 -> 6101
   */
  generateApartmentRingGroup(apartmentNumber) {
    const cleaned = (apartmentNumber || '').replace(/\D/g, '');
    return `6${cleaned || '100'}`;
  }

  /**
   * Formata e compila as credenciais VoIP de um usuário para retorno na API do PWA.
   */
  getCredentials(user, property, unitName = '') {
    const domain = property.dominio_pbx || process.env.PBX_DOMAIN || 'pbx.meudominio.com.br';
    const websocket = process.env.PBX_WEBSOCKET || `wss://${domain}:8089/ws`;
    
    return {
      extension: user.ramal_webrtc || user.ramal_sip || '',
      password: user.senha_sip || '',
      domain: domain,
      websocket: websocket,
      stun: 'stun:stun.l.google.com:19302',
      turn: null, // Pode ser configurado dinamicamente caso o cliente tenha servidor TURN
      displayName: user.name || `Apartamento ${unitName || ''}`
    };
  }

  /**
   * Sincroniza/gera ramais automaticamente para moradores de uma unidade (Apartamento).
   */
  async syncUnitExtensions(unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { residents: true, property: true }
    });

    if (!unit) throw new Error('Unidade não encontrada');

    // Sincroniza ramal de grupo do apartamento
    const groupExt = this.generateApartmentRingGroup(unit.number || unit.name);
    if (unit.ramal_grupo !== groupExt) {
      await prisma.unit.update({
        where: { id: unitId },
        data: { ramal_grupo: groupExt }
      });
    }

    // Sincroniza ramais WebRTC para cada morador
    const updatedResidents = [];
    for (let i = 0; i < unit.residents.length; i++) {
      const resident = unit.residents[i];
      const expectedExt = this.generateExtensionForResident(unit.number || unit.name, i + 1);
      
      let needsUpdate = false;
      const dataToUpdate = {};

      if (!resident.ramal_webrtc || resident.ramal_webrtc !== expectedExt) {
        dataToUpdate.ramal_webrtc = expectedExt;
        needsUpdate = true;
      }

      if (!resident.senha_sip) {
        dataToUpdate.senha_sip = this.generateStrongPassword();
        needsUpdate = true;
      }

      if (needsUpdate) {
        const updated = await prisma.user.update({
          where: { id: resident.id },
          data: dataToUpdate
        });
        updatedResidents.push(updated);
      } else {
        updatedResidents.push(resident);
      }
    }

    return {
      groupExtension: groupExt,
      residents: updatedResidents
    };
  }

  /**
   * Sincroniza e garante que a portaria (doorman) da propriedade tenha um ramal SIP 9000.
   */
  async syncDoormanExtension(doormanId, extension = '9000') {
    const doorman = await prisma.user.findUnique({
      where: { id: doormanId }
    });

    if (!doorman || !doorman.isDoorman) {
      throw new Error('Usuário não é porteiro ou não encontrado');
    }

    let needsUpdate = false;
    const dataToUpdate = {};

    if (!doorman.ramal_sip || doorman.ramal_sip !== extension) {
      dataToUpdate.ramal_sip = extension;
      needsUpdate = true;
    }

    if (!doorman.senha_sip) {
      dataToUpdate.senha_sip = this.generateStrongPassword();
      needsUpdate = true;
    }

    if (needsUpdate) {
      return await prisma.user.update({
        where: { id: doormanId },
        data: dataToUpdate
      });
    }

    return doorman;
  }

  /**
   * Gera arquivos de configuração customizados do Asterisk (chan_pjsip) para um condomínio.
   * Retorna os textos formatados de pjsip_custom.conf e extensions_custom.conf.
   */
  async generateAsteriskConfigs(propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        units: {
          include: {
            residents: true
          }
        }
      }
    });

    if (!property) throw new Error('Propriedade não encontrada');

    // Buscar porteiros vinculados
    const doormen = await prisma.user.findMany({
      where: {
        isDoorman: true,
        propertiesDoorman: {
          some: { id: propertyId }
        }
      }
    });

    let pjsip = `; =========================================================================\n`;
    pjsip += `; CONFIGURAÇÃO AUTOMÁTICA DE RAMAIS PJSIP - CONDOMÍNIO: ${property.name}\n`;
    pjsip += `; Gerado pelo SaaS de Condomínio Inteligente em: ${new Date().toISOString()}\n`;
    pjsip += `; =========================================================================\n\n`;

    pjsip += `; --- Configurações de Transporte ---\n`;
    pjsip += `[transport-udp]\n`;
    pjsip += `type=transport\n`;
    pjsip += `protocol=udp\n`;
    pjsip += `bind=0.0.0.0:5060\n\n`;

    pjsip += `[transport-wss]\n`;
    pjsip += `type=transport\n`;
    pjsip += `protocol=wss\n`;
    pjsip += `bind=0.0.0.0:8089\n\n`;

    let extensions = `; =========================================================================\n`;
    extensions += `; DIALPLAN DE CONDOMÍNIO SEGURO - CONDOMÍNIO: ${property.name}\n`;
    extensions += `; Gerado pelo SaaS de Condomínio Inteligente em: ${new Date().toISOString()}\n`;
    extensions += `; =========================================================================\n\n`;
    extensions += `[interno]\n\n`;

    // 1. Porteiros (SIP UDP - Cisco 8831)
    pjsip += `; === SEÇÃO 1: RAMAIS SIP DA PORTARIA (Cisco 8831) ===\n\n`;
    doormen.forEach((doorman) => {
      const ext = doorman.ramal_sip || '9000';
      const pass = doorman.senha_sip || 'CiscoPortariaSecutiry100!';
      
      pjsip += `[${ext}]\n`;
      pjsip += `type=endpoint\n`;
      pjsip += `transport=transport-udp\n`;
      pjsip += `context=interno\n`;
      pjsip += `disallow=all\n`;
      pjsip += `allow=alaw,ulaw\n`;
      pjsip += `auth=${ext}-auth\n`;
      pjsip += `aors=${ext}\n`;
      pjsip += `direct_media=no\n`;
      pjsip += `rtp_symmetric=yes\n`;
      pjsip += `force_rport=yes\n`;
      pjsip += `rewrite_contact=yes\n\n`;

      pjsip += `[${ext}-auth]\n`;
      pjsip += `type=auth\n`;
      pjsip += `auth_type=userpass\n`;
      pjsip += `username=${ext}\n`;
      pjsip += `password=${pass}\n\n`;

      pjsip += `[${ext}]\n`;
      pjsip += `type=aor\n`;
      pjsip += `max_contacts=2\n`;
      pjsip += `remove_existing=yes\n\n`;

      extensions += `; Rota para o Porteiro: ${doorman.name}\n`;
      extensions += `exten => ${ext},1,Dial(PJSIP/${ext},30)\n`;
      extensions += ` same => n,Hangup()\n\n`;
    });

    // 2. Moradores (WebRTC WSS - DTLS, SRTP, ICE)
    pjsip += `; === SEÇÃO 2: RAMAIS WEBRTC DOS MORADORES ===\n\n`;
    
    // Agrupar rotas de grupos de apartamento
    let ringGroupsDialplan = ``;

    property.units.forEach((unit) => {
      const residentExts = [];
      
      unit.residents.forEach((resident) => {
        if (resident.ramal_webrtc) {
          const ext = resident.ramal_webrtc;
          const pass = resident.senha_sip || 'SenhaSegura123!';
          residentExts.push(`PJSIP/${ext}`);

          pjsip += `; Morador: ${resident.name} - Apt: ${unit.number || unit.name}\n`;
          pjsip += `[${ext}]\n`;
          pjsip += `type=endpoint\n`;
          pjsip += `transport=transport-wss\n`;
          pjsip += `context=interno\n`;
          pjsip += `disallow=all\n`;
          pjsip += `allow=opus,alaw,ulaw\n`;
          pjsip += `auth=${ext}-auth\n`;
          pjsip += `aors=${ext}\n`;
          pjsip += `webrtc=yes\n`;
          pjsip += `direct_media=no\n`;
          pjsip += `rtp_symmetric=yes\n`;
          pjsip += `force_rport=yes\n`;
          pjsip += `rewrite_contact=yes\n`;
          pjsip += `ice_support=yes\n`;
          pjsip += `media_encryption=dtls\n`;
          pjsip += `dtls_auto_generate_cert=yes\n`;
          pjsip += `dtls_verify=fingerprint\n`;
          pjsip += `dtls_setup=actpass\n`;
          pjsip += `use_avpf=yes\n`;
          pjsip += `rtcp_mux=yes\n\n`;

          pjsip += `[${ext}-auth]\n`;
          pjsip += `type=auth\n`;
          pjsip += `auth_type=userpass\n`;
          pjsip += `username=${ext}\n`;
          pjsip += `password=${pass}\n\n`;

          pjsip += `[${ext}]\n`;
          pjsip += `type=aor\n`;
          pjsip += `max_contacts=3\n`;
          pjsip += `remove_existing=no\n\n`;

          // Dialplan individual
          extensions += `; Morador individual: ${resident.name}\n`;
          extensions += `exten => ${ext},1,Dial(PJSIP/${ext},30)\n`;
          extensions += ` same => n,Hangup()\n\n`;
        }
      });

      // Grupo do apartamento
      if (unit.ramal_grupo && residentExts.length > 0) {
        ringGroupsDialplan += `; Grupo de toque do Apartamento ${unit.number || unit.name}\n`;
        ringGroupsDialplan += `exten => ${unit.ramal_grupo},1,Dial(${residentExts.join('&')},30)\n`;
        ringGroupsDialplan += ` same => n,Hangup()\n\n`;
      }
    });

    if (ringGroupsDialplan) {
      extensions += `; === SEÇÃO 3: GRUPOS DE TOQUE DOS APARTAMENTOS ===\n\n` + ringGroupsDialplan;
    }

    // Salvar no diretório scratch local para fins de auditoria/cópia
    try {
      const scratchDir = path.join(__dirname, 'scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      fs.writeFileSync(path.join(scratchDir, 'pjsip_custom.conf'), pjsip);
      fs.writeFileSync(path.join(scratchDir, 'extensions_custom.conf'), extensions);
      console.log(`[VoipConfig] Arquivos temporários gerados em backend/scratch/`);
    } catch (e) {
      console.warn('[VoipConfig] Não foi possível salvar arquivos temporários:', e.message);
    }

    return { pjsip, extensions };
  }
}

module.exports = new VoipService();
