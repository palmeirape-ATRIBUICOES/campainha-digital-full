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
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_clientCode_key" ON "User"("clientCode");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_plateCode_key" ON "User"("plateCode");`).catch(() => {});
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

// Registro Simples (E-mail ou Celular)
app.post('/api/auth/register', async (req, res) => {
  const { name, identifier, password } = req.body;
  
  if (!name || !identifier || !password) {
    return res.status(400).json({ error: 'Nome, e-mail/celular e senha são obrigatórios para o cadastro.' });
  }

  const isEmail = identifier.includes('@');
  
  try {
    const existing = await prisma.user.findFirst({
      where: isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    });

    if (existing) {
      return res.status(400).json({ error: 'Este usuário já está cadastrado.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: isEmail ? identifier.toLowerCase() : null,
        phone: !isEmail ? identifier : null,
        password: password, // TODO: Hash password
        isResident: true, // Por padrão, todo novo usuário é um residente/cliente
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias grátis por padrão
      }
    });

    // Se for um morador comum, cria uma "Propriedade" e "Unidade" para ele receber chamadas
    if (user.isResident) {
      const property = await prisma.property.create({
        data: {
          name: `Residência de ${user.name}`,
          address: 'Individual',
          type: 'individual',
          adminId: user.id
        }
      });
      await prisma.unit.create({
        data: {
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
        properties: true,
        units: { include: { property: true } }
      }
    });

    if (!user) return res.status(401).json({ error: 'Código inválido.' });

    const property = user.properties[0] || (user.units[0] ? user.units[0].property : null);
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

// Login por E-mail/Senha (Para Moradores)
app.post('/api/resident/login', async (req, res) => {
  const { email, accessCode } = req.body; // accessCode aqui é usado como senha
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        password: accessCode
      },
      include: {
        properties: true,
        units: { include: { property: true } }
      }
    });

    if (!user) return res.status(401).json({ error: 'Credenciais incorretas.' });

    const property = user.properties[0] || (user.units[0] ? user.units[0].property : null);
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
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

// Ativar/Desativar módulos de um usuário
app.post('/api/master/users/:id/modules', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { isAdmin, isDoorman, isResident, isSuperAdmin } = req.body;
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin, isDoorman, isResident, isSuperAdmin }
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
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      doorbellEnabled: true,
      quietModeStart: true,
      quietModeEnd: true,
      clientCode: true,
      plateCode: true,
      properties: {
        select: { id: true }
      }
    }
  });
  const propertyId = user.properties?.[0]?.id;
  res.json({ ...user, propertyId });
});


app.put('/api/user/settings', authenticate, async (req, res) => {
  const { doorbellEnabled, quietModeStart, quietModeEnd, generateClientCode } = req.body;
  
  let data = { doorbellEnabled, quietModeStart, quietModeEnd };
  
  if (generateClientCode) {
    data.clientCode = generateAccessCode() + generateAccessCode();
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data
  });
  
  res.json(updated);
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

// Escanear placa: ao cadastrar, se o usuário escanear um QR com plateCode, vincula ao seu perfil
app.post('/api/auth/scan-plate', async (req, res) => {
  const { plateCode, userId } = req.body;
  if (!plateCode || !userId) return res.status(400).json({ error: 'Dados incompletos.' });

  // Verifica se o plateCode pertence a algum usuário (placa pré-configurada)
  const plateOwner = await prisma.user.findFirst({ where: { plateCode } });
  
  if (plateOwner && plateOwner.id !== userId) {
    // A placa pertence a outro usuário — gera um clientCode único para o novo usuário
    const newCode = generateAccessCode() + generateAccessCode();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { clientCode: newCode }
    });
    return res.json({ success: true, clientCode: updated.clientCode, message: 'Código gerado com sucesso!' });
  }

  if (!plateOwner) {
    return res.status(404).json({ error: 'Placa não encontrada ou não pré-configurada.' });
  }

  // A placa pertence ao próprio usuário (placa do próprio cliente)
  const newCode = generateAccessCode() + generateAccessCode();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { clientCode: newCode }
  });
  res.json({ success: true, clientCode: updated.clientCode, message: 'Código gerado!' });
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

    const visit = await prisma.visitor.create({
      data: {
        unitId,
        propertyId,
        visitorSocketId: socket.id,
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
  });

  // Outros eventos WebRTC...
  socket.on('answer_call', ({ visitorSocketId, mode, unitId }) => {
    io.to(visitorSocketId).emit('call_answered', { residentSocketId: socket.id, mode, unitId });
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
});

// Health Check (Keep-Alive)
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Catch-all para o Frontend (React Router)

app.use( (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
