const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('./prismaClient');

// Helper to generate a secure random password of specified length
function generateSecurePassword(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01233456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  return password;
}

/**
 * VoipService handles provisioning of WebRTC and physical SIP credentials for FreePBX/Asterisk,
 * ring group generation, and configuration template exporting.
 */
class VoipService {
  /**
   * Syncs VoIP credentials for a User.
   * If the user is a Doorman, they get physical SIP extension 9000 by default.
   * If they are a Resident, they get a WebRTC extension in the 20000 range.
   */
  static async syncUserCredentials(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { units: true }
    });

    if (!user) throw new Error('User not found');

    let updatedData = {};
    let changed = false;

    // 1. Password generation if not present
    if (!user.senha_sip) {
      updatedData.senha_sip = generateSecurePassword(24);
      changed = true;
    }

    // 2. Extension allocation based on role
    if (user.isDoorman) {
      if (!user.ramal_sip) {
        // Physical SIP phone for Portaria defaults to 9000
        updatedData.ramal_sip = '9000';
        changed = true;
      }
    } else if (user.isResident || user.isHouseResident || user.isCondoResident) {
      if (!user.ramal_webrtc) {
        // Find highest existing WebRTC extension to increment
        const lastUser = await prisma.user.findFirst({
          where: { ramal_webrtc: { not: null } },
          orderBy: { ramal_webrtc: 'desc' }
        });
        
        let nextExt = 20001;
        if (lastUser && lastUser.ramal_webrtc) {
          const lastExt = parseInt(lastUser.ramal_webrtc, 10);
          if (!isNaN(lastExt) && lastExt >= 20001) {
            nextExt = lastExt + 1;
          }
        }
        updatedData.ramal_webrtc = String(nextExt);
        changed = true;
      }
    }

    if (changed) {
      return await prisma.user.update({
        where: { id: userId },
        data: updatedData
      });
    }

    return user;
  }

  /**
   * Syncs unit ring group extension.
   * A ring group allows Asterisk to dial all residents in the unit simultaneously.
   */
  static async syncUnitRingGroup(unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { residents: true }
    });

    if (!unit) throw new Error('Unit not found');

    if (!unit.ramal_grupo) {
      const lastUnit = await prisma.unit.findFirst({
        where: { ramal_grupo: { not: null } },
        orderBy: { ramal_grupo: 'desc' }
      });

      let nextGroupExt = 8001;
      if (lastUnit && lastUnit.ramal_grupo) {
        const lastGroup = parseInt(lastUnit.ramal_grupo, 10);
        if (!isNaN(lastGroup) && lastGroup >= 8001) {
          nextGroupExt = lastGroup + 1;
        }
      }

      return await prisma.unit.update({
        where: { id: unitId },
        data: { ramal_grupo: String(nextGroupExt) }
      });
    }

    return unit;
  }

  /**
   * Syncs PBX domain for a property.
   */
  static async syncPropertyPbxDomain(propertyId, domain = 'pbx.campainhadigital.com.br') {
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) throw new Error('Property not found');

    if (!property.dominio_pbx) {
      return await prisma.property.update({
        where: { id: propertyId },
        data: { dominio_pbx: domain }
      });
    }

    return property;
  }

  /**
   * Exports an Asterisk/FreePBX chan_pjsip configuration block.
   * Generates a fully compliant text file containing endpoints, aors, auths,
   * and dialplan hints. Saved under Ccwd/scratch/pjsip.conf
   */
  static async exportAsteriskPjsipConfig() {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { ramal_webrtc: { not: null } },
          { ramal_sip: { not: null } }
        ]
      }
    });

    let configText = `;; ==========================================
;; PJSIP CONFIGURATION FOR CAMPAINHA DIGITAL SAAS
;; Generated on: ${new Date().toISOString()}
;; ==========================================\n\n`;

    configText += `;; [TRANSPORTS]\n`;
    configText += `;; Make sure to have a WebRTC WSS transport defined in your Asterisk, e.g.:\n`;
    configText += `;; [transport-wss]\n`;
    configText += `;; type=transport\n`;
    configText += `;; protocol=wss\n`;
    configText += `;; bind=0.0.0.0:8089\n\n`;

    for (const u of users) {
      // 1. WebRTC Extension configuration
      if (u.ramal_webrtc) {
        configText += `;; ------------------------------------------\n`;
        configText += `;; Resident: ${u.name} (WebRTC)\n`;
        configText += `;; ------------------------------------------\n`;
        
        configText += `[${u.ramal_webrtc}]\n`;
        configText += `type=aor\n`;
        configText += `max_contacts=5\n`;
        configText += `remove_existing=yes\n\n`;

        configText += `[${u.ramal_webrtc}]\n`;
        configText += `type=auth\n`;
        configText += `auth_type=userpass\n`;
        configText += `username=${u.ramal_webrtc}\n`;
        configText += `password=${u.senha_sip}\n\n`;

        configText += `[${u.ramal_webrtc}]\n`;
        configText += `type=endpoint\n`;
        configText += `context=from-internal\n`;
        configText += `disallow=all\n`;
        configText += `allow=opus,ulaw,alaw,g722\n`;
        configText += `webrtc=yes\n`;
        configText += `dtls_auto_use=yes\n`;
        configText += `auth=${u.ramal_webrtc}\n`;
        configText += `outbound_auth=${u.ramal_webrtc}\n`;
        configText += `aors=${u.ramal_webrtc}\n`;
        configText += `dtls_verify_profile=no\n`;
        configText += `dtls_cert_file=/etc/asterisk/keys/asterisk.pem\n`;
        configText += `dtls_ca_file=/etc/asterisk/keys/ca.crt\n`;
        configText += `dtls_setup=actpass\n`;
        configText += `ice_support=yes\n`;
        configText += `use_avpf=yes\n`;
        configText += `rtp_symmetric=yes\n`;
        configText += `force_rport=yes\n`;
        configText += `rewrite_contact=yes\n\n`;
      }

      // 2. Physical Cisco SIP Extension configuration (e.g. Cisco 8831)
      if (u.ramal_sip) {
        configText += `;; ------------------------------------------\n`;
        configText += `;; Doorman/Portaria: ${u.name} (Physical SIP Phone)\n`;
        configText += `;; ------------------------------------------\n`;

        configText += `[${u.ramal_sip}]\n`;
        configText += `type=aor\n`;
        configText += `max_contacts=1\n`;
        configText += `remove_existing=yes\n\n`;

        configText += `[${u.ramal_sip}]\n`;
        configText += `type=auth\n`;
        configText += `auth_type=userpass\n`;
        configText += `username=${u.ramal_sip}\n`;
        configText += `password=${u.senha_sip}\n\n`;

        configText += `[${u.ramal_sip}]\n`;
        configText += `type=endpoint\n`;
        configText += `context=from-internal\n`;
        configText += `disallow=all\n`;
        configText += `allow=ulaw,alaw,g722\n`;
        configText += `auth=${u.ramal_sip}\n`;
        configText += `outbound_auth=${u.ramal_sip}\n`;
        configText += `aors=${u.ramal_sip}\n`;
        configText += `rtp_symmetric=yes\n`;
        configText += `force_rport=yes\n`;
        configText += `rewrite_contact=yes\n\n`;
      }
    }

    // 3. Dialplan/Ring Groups generation
    const units = await prisma.unit.findMany({
      where: { ramal_grupo: { not: null } },
      include: { residents: { where: { ramal_webrtc: { not: null } } } }
    });

    configText += `;; ==========================================\n`;
    configText += `;; DIALPLAN EXTENSIONS & RING GROUPS\n`;
    configText += `;; Add the following to /etc/asterisk/extensions.conf under [from-internal]\n`;
    configText += `;; ==========================================\n\n`;

    for (const unit of units) {
      if (unit.residents.length > 0) {
        const dialString = unit.residents.map(r => `PJSIP/${r.ramal_webrtc}`).join('&');
        configText += `;; Ring Group for Unit ${unit.name} (${unit.block || 'No Block'})\n`;
        configText += `exten => ${unit.ramal_grupo},1,Verbose(1, Calling Unit ${unit.name} Ring Group)\n`;
        configText += ` same => n,Dial(${dialString},30,tT)\n`;
        configText += ` same => n,Hangup()\n\n`;
      }
    }

    // Ensure scratch directory exists
    const scratchDir = path.join(__dirname, 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const configPath = path.join(scratchDir, 'pjsip.conf');
    fs.writeFileSync(configPath, configText, 'utf8');

    return {
      filePath: configPath,
      totalUsers: users.length,
      totalGroups: units.length
    };
  }

  /**
   * Log a VoIP Call
   */
  static async logCall({ senderId, receiverId, callerName, status, duration = 0 }) {
    return await prisma.voipCallLog.create({
      data: {
        senderId,
        receiverId,
        callerName,
        status,
        duration
      }
    });
  }
}

module.exports = VoipService;
