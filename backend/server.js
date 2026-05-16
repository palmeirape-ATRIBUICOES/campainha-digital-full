 const express = require('express');
const path = require('path');

const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');
const prisma = require('./prismaClient'); // Usando Prisma!

// Debug database location
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log('Database Path:', dbPath);

// Auto-fix: Garantir que as colunas existam (SQLite hack)
async function ensureColumnsExist() {
  console.log('Verificando integridade das colunas...');
  try {
    // Tenta adicionar as colunas. Se já existirem, o SQLite apenas dará erro e nós ignoramos.
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "clientCode" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "plateCode" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "recoveryToken" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "recoveryTokenExp" DATETIME;`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_clientCode_key" ON "User"("clientCode");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_plateCode_key" ON "User"("plateCode");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_recoveryToken_key" ON "User"("recoveryToken");`).catch(() => {});
    console.log('Sincronização de colunas concluída.');
  } catch (err) {
    console.error('Erro ao verificar colunas:', err);
  }
}

if (fs.existsSync(dbPath)) {
  try {
    fs.accessSync(dbPath, fs.constants.W_OK);
    console.log('Database is WRITABLE');
    ensureColumnsExist();
  } catch (err) {
    console.error('Database is NOT WRITABLE:', err);
  }
}


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));


// ─── Middlewares ─────────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  // Simulação de JWT/Auth por enquanto
  const user = await prisma.user.findFirst({ where: { id: token } });
  if (!user) return res.status(401).json({ error: 'Usuário inválido' });
  req.user = user;
  next();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateAccessCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// ─── Auth Routes (Unificadas) ─────────────────────────────────────────────────

// Login Unificado (Para AuthPage)
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Credenciais inválidas.' });
  
  const isEmail = identifier.includes('@');
  const loginId = isEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, '');
  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: loginId } : { phone: loginId },
          { password: password }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais incorretas.' });
    }

    res.json({ 
      success: true, 
      token: user.id, 
      user: { id: user.id, name: user.name, isSuperAdmin: user.isSuperAdmin, isAdmin: user.isAdmin, isDoorman: user.isDoorman, isResident: user.isResident, isReseller: user.isReseller } 
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Erro ao processar login.', details: err.message });
  }
});

// Registro Simples (E-mail ou Celular)
app.post('/api/auth/register', async (req, res) => {
  const { name, identifier, password } = req.body;
  
  if (!name || !identifier || !password) {
    return res.status(400).json({ error: 'Nome, e-mail/celular e senha são obrigatórios para o cadastro.' });
  }

  const isEmail = identifier.includes('@');
  const cleanIdentifier = isEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, '');
  
  try {
    const existing = await prisma.user.findFirst({
      where: isEmail ? { email: cleanIdentifier } : { phone: cleanIdentifier }
    });

    if (existing) {
      return res.status(400).json({ error: 'Este usuário já está cadastrado.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: isEmail ? cleanIdentifier : null,
        phone: !isEmail ? cleanIdentifier : null,
        password: password, // TODO: Hash password
        clientCode: generateAccessCode() + generateAccessCode(), // Gera código automaticamente na criação
        isResident: true,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Se for um morador comum, cria uma "Propriedade" e "Unidade" para ele receber chamadas
    if (user.isResident) {
      const property = await prisma.property.create({
        data: {
          id: crypto.randomUUID(), // Geração manual para garantir sucesso
          name: `Residência de ${user.name}`,
          clientAddress: 'Individual',
          type: 'individual',
          adminId: user.id,
          nextPaymentAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      await prisma.unit.create({
        data: {
          id: crypto.randomUUID(), // Geração manual para garantir sucesso
          name: 'Principal',
          propertyId: property.id,
          residents: { connect: { id: user.id } }
        }
      });
    }

    res.status(201).json({ 
      success: true, 
      token: user.id, 
      user: { id: user.id, name: user.name, role: 'resident' } 
    });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    res.status(500).json({ error: 'Erro ao criar conta.', details: err.message });
  }
});

// Login por Código (Para Moradores e Síndicos via Código Único)
app.post('/api/resident/login-by-code', async (req, res) => {
  const { accessCode } = req.body;
  try {
    // Busca usuário pelo clientCode (Código Único) ou plateCode (Placa)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { clientCode: accessCode },
          { plateCode: accessCode }
        ]
      },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    if (!user) return res.status(401).json({ error: 'Código inválido.' });

    const property = user.propertiesManaged[0] || (user.units[0] ? user.units[0].property : null);
    const unit = user.units[0];

    res.json({
      role: user.isAdmin ? 'admin' : (user.isDoorman ? 'doorman' : 'resident'),
      propertyId: property?.id,
      propertyName: property?.name,
      unitId: unit?.id,
      unitName: user.name,
      accessCode: user.clientCode || user.plateCode,
      clientCode: user.clientCode,
      adminEmail: user.email
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.', details: err.message });
  }
});

// Login por E-mail/Senha/Celular (Para Moradores)
app.post('/api/resident/login', async (req, res) => {
  const { email, identifier, accessCode } = req.body; // accessCode aqui é usado como senha
  const rawId = identifier || email || '';
  const isEmail = rawId.includes('@');
  const loginId = isEmail ? rawId.toLowerCase() : rawId.replace(/\D/g, '');
  
  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: loginId } : { phone: loginId },
          { password: accessCode }
        ]
      },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    if (!user) return res.status(401).json({ error: 'Credenciais incorretas.' });

    const property = user.propertiesManaged[0] || (user.units[0] ? user.units[0].property : null);
    const unit = user.units[0];

    res.json({
      role: user.isAdmin ? 'admin' : 'resident',
      propertyId: property?.id,
      propertyName: property?.name,
      unitId: unit?.id,
      unitName: user.name,
      accessCode: user.clientCode || user.plateCode,
      clientCode: user.clientCode,
      adminEmail: user.email
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.', details: err.message });
  }
});


// Recuperação de Senha - Solicitar
app.post('/api/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  const isEmail = identifier.includes('@');
  
  try {
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Gera um código de 6 dígitos para recuperação
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 3600000); // 1 hora de validade

    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryToken: token, recoveryTokenExp: expiry }
    });

    res.json({ success: true, message: 'Código de recuperação gerado.', debug_token: token });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});

// Recuperação de Senha - Redefinir
app.post('/api/auth/reset-password', async (req, res) => {
  const { identifier, token, newPassword } = req.body;
  const isEmail = identifier.includes('@');

  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: identifier.toLowerCase() } : { phone: identifier },
          { recoveryToken: token },
          { recoveryTokenExp: { gt: new Date() } }
        ]
      }
    });

    if (!user) return res.status(400).json({ error: 'Código inválido ou expirado.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: newPassword, // TODO: Hash
        recoveryToken: null,
        recoveryTokenExp: null
      }
    });

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

// Login Unificado
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  const isEmail = identifier.includes('@');

  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: identifier.toLowerCase() } : { phone: identifier },
          { password: password } // TODO: Compare hash
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    res.json({ 
      success: true, 
      token: user.id, 
      user: { id: user.id, name: user.name, role: user.isAdmin ? 'admin' : (user.isDoorman ? 'doorman' : 'resident') } 
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Erro ao processar login.', details: err.message });
  }
});


// ─── Super Admin (Master) Routes ──────────────────────────────────────────────

// Listar todos os usuários para o Super Admin
app.get('/api/master/users', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { propertiesManaged: true }
  });
  res.json(users);
});

// Ativar/Desativar módulos de um usuário
app.post('/api/master/users/:id/modules', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { isAdmin, isDoorman, isResident, isSuperAdmin, isReseller } = req.body;
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin, isDoorman, isResident, isSuperAdmin, isReseller }
  });
  
  res.json(updated);
});

// Dar 1 mês grátis (promoção)
app.post('/api/master/users/:id/promo', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  const currentEnd = user.trialEndsAt || new Date();
  const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { trialEndsAt: newEnd, promoActive: true }
  });
  
  res.json(updated);
});

// ─── Configurações de Usuário (Horários, etc) ────────────────────────────────

app.get('/api/user/settings', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        doorbellEnabled: true,
        quietModeStart: true,
        quietModeEnd: true,
        clientCode: true,
        plateCode: true,
        propertiesManaged: { select: { id: true, name: true } },
        units: { select: { propertyId: true, property: { select: { name: true } } } }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
    }

    // Obtém o propertyId sendo o usuário admin da propriedade ou morador de uma unidade
    const propertyId = user.propertiesManaged?.[0]?.id || user.units?.[0]?.propertyId;
    const propertyName = user.propertiesManaged?.[0]?.name || user.units?.[0]?.property?.name || '';
    
    res.json({ ...user, propertyId, propertyName });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Erro ao carregar configs' });
  }
});


app.put('/api/user/settings', authenticate, async (req, res) => {
  try {
    const { doorbellEnabled, quietModeStart, quietModeEnd, generateClientCode, propertyName } = req.body;
    
    let data = { doorbellEnabled, quietModeStart, quietModeEnd };
    
    if (generateClientCode) {
      data.clientCode = generateAccessCode() + generateAccessCode();
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { propertiesManaged: true }
    });
    
    // Atualiza o nome da residência se o usuário for o dono (admin da propriedade)
    if (propertyName && updated.propertiesManaged.length > 0) {
      await prisma.property.update({
        where: { id: updated.propertiesManaged[0].id },
        data: { name: propertyName }
      });
    }
    
    res.json(updated);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Erro ao atualizar configurações. Talvez o usuário não exista mais.' });
  }
});


// ─── Propriedades e Unidades (Adaptado) ──────────────────────────────────────

// Registro de Propriedade (Não obrigatório QR Code na hora)
app.post('/api/properties', authenticate, async (req, res) => {
  const { name, type } = req.body;
  
  // Se não fornecer ID, gera um temporário
  const id = req.body.id || uuidv4();

  const property = await prisma.property.create({
    data: {
      id,
      name,
      type,
      adminId: req.user.id,
      nextPaymentAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias de teste
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/chamada/${id}`
    }
  });

  res.status(201).json(property);
});

// Buscar dados de uma Propriedade para o Visitante (Acesso Público)
app.get('/api/properties/:id', async (req, res) => {
  try {
    const idParam = req.params.id;
    let code = idParam;
    if (idParam.startsWith('CAMPAINHA:')) code = idParam.split(':')[1];

    let property = await prisma.property.findUnique({
      where: { id: idParam },
      include: {
        units: { select: { id: true, name: true } }
      }
    });

    if (!property) {
      const user = await prisma.user.findFirst({
        where: { OR: [{ clientCode: code }, { plateCode: code }] },
        include: {
          propertiesManaged: { include: { units: { select: { id: true, name: true } } } },
          units: { include: { property: { include: { units: { select: { id: true, name: true } } } } } }
        }
      });
      if (user) {
        property = user.propertiesManaged?.[0] || user.units?.[0]?.property;
      }
    }

    if (!property) return res.status(404).json({ error: 'Propriedade não encontrada' });

    res.json(property);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar propriedade' });
  }
});

// Histórico de Visitantes
app.get('/api/visitors/:unitId', async (req, res) => {
  try {
    const visitors = await prisma.visitor.findMany({
      where: { unitId: req.params.unitId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar visitantes.' });
  }
});

// TODO: Implementar demais rotas (Units, Visitors, Messages) migrando para Prisma

// ─── QR Code & Código de Cliente ─────────────────────────────────────────────

// Gerar/resetar o código único de cliente (Opção 2 - cliente gera o próprio QR)
app.post('/api/master/users/:id/generate-client-code', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const code = generateAccessCode() + generateAccessCode(); // Ex: A3F9C2B1
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { clientCode: code }
    });
    const prop = await prisma.property.findFirst({ where: { adminId: req.params.id } });
    res.json({ clientCode: updated.clientCode, propertyId: prop?.id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar código.' });
  }
});

// Definir código de placa pré-configurada (Opção 1 - placa entregue pronta)
app.post('/api/master/users/:id/set-plate-code', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { plateCode } = req.body;
  if (!plateCode) return res.status(400).json({ error: 'Código da placa é obrigatório.' });

  // Verifica se o código de placa já está em uso por outro usuário
  const existing = await prisma.user.findFirst({ where: { plateCode, NOT: { id: req.params.id } } });
  if (existing) return res.status(400).json({ error: 'Este código de placa já está em uso.' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { plateCode }
  });
  res.json({ plateCode: updated.plateCode });
});

// Gerar imagem de QR Code (retorna URL de dados base64) para qualquer texto
app.get('/api/qrcode', async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'Texto para QR code é obrigatório.' });
  try {
    const qr = await QRCode.toDataURL(text, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
    res.json({ qrcode: qr });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar QR Code.' });
  }
});

// Escanear placa: ao cadastrar ou logar, o usuário escaneia a placa para vinculá-la à sua conta
app.post('/api/auth/scan-plate', async (req, res) => {
  const { plateCode, userId } = req.body;
  if (!plateCode || !userId) return res.status(400).json({ error: 'Dados incompletos.' });

  // Verifica se a placa já pertence a outro usuário
  const plateOwner = await prisma.user.findFirst({ where: { plateCode } });
  
  if (plateOwner && plateOwner.id !== userId) {
    return res.status(400).json({ error: 'Esta placa física já está vinculada a outra conta.' });
  }

  // Vincula a placa ao usuário atual (mantendo seu clientCode intacto)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { plateCode }
  });
  
  res.json({ success: true, plateCode: updated.plateCode, message: 'Placa vinculada com sucesso!' });
});



// ─── Socket.io Logic ─────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('[WS] conectado:', socket.id);

  socket.on('register_user', ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log(`[WS] Usuário ${userId} registrado no socket ${socket.id}`);
  });

  socket.on('initiate_call', async ({ unitId, propertyId, photoBase64, callerName }) => {
    // Busca os moradores da unidade
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { residents: true }
    });

    if (!unit) return;

    try {
      const visit = await prisma.visitor.create({
        data: {
          unitId,
          propertyId,
          photo: photoBase64,
          callerName: callerName || 'Visitante'
        }
      });

      // Notifica todos os moradores da unidade
      unit.residents.forEach(resident => {
        // Verifica se está no horário de silêncio
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        let shouldRing = resident.doorbellEnabled;
        if (resident.quietModeStart && resident.quietModeEnd) {
          if (resident.quietModeStart < resident.quietModeEnd) {
            if (currentTime >= resident.quietModeStart && currentTime <= resident.quietModeEnd) shouldRing = false;
          } else {
            // Caso passe da meia-noite (ex: 22:00 as 07:00)
            if (currentTime >= resident.quietModeStart || currentTime <= resident.quietModeEnd) shouldRing = false;
          }
        }

        if (shouldRing) {
          io.to(`user_${resident.id}`).emit('incoming_call', {
            visitorSocketId: socket.id,
            photo: photoBase64,
            callerName: callerName || 'Visitante',
            timestamp: visit.timestamp,
            visitId: visit.id,
            propertyId
          });
        }
      });
    } catch (e) {
      console.error('Error initiating call:', e);
    }
  });

  // Outros eventos WebRTC...
  socket.on('answer_call', ({ visitorSocketId, mode, unitId }) => {
    io.to(visitorSocketId).emit('call_answered', { residentSocketId: socket.id, mode, unitId });
  });
  
  socket.on('webrtc_ready', ({ target }) => {
    io.to(target).emit('webrtc_ready', { residentSocketId: socket.id });
  });
  
  socket.on('webrtc_offer', ({ target, offer }) => {
    io.to(target).emit('webrtc_offer', { sender: socket.id, offer });
  });

  socket.on('webrtc_answer', ({ target, answer }) => {
    io.to(target).emit('webrtc_answer', { sender: socket.id, answer });
  });

  socket.on('webrtc_ice_candidate', ({ target, candidate }) => {
    io.to(target).emit('webrtc_ice_candidate', { sender: socket.id, candidate });
  });

  // Relays para Mensagens Rápidas, Encerrar Chamada e Abrir Portão
  socket.on('send_quick_message', ({ target, message }) => {
    io.to(target).emit('quick_message', { message });
  });

  socket.on('call_ended', ({ target }) => {
    io.to(target).emit('call_ended');
  });

  socket.on('authorize_entry', ({ visitorId }) => {
    // visitorId neste contexto contém o visitorSocketId para notificar a tela
    io.to(visitorId).emit('entry_authorized');
  });
});

// Health Check (Keep-Alive)
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Catch-all para o Frontend (React Router)

app.use( (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
