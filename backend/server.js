 const express = require('express');
const path = require('path');

const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');
const prisma = require('./prismaClient'); // Usando Prisma!

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

    res.status(201).json({ 
      success: true, 
      token: user.id, 
      user: { id: user.id, name: user.name, role: 'resident' } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta.' });
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
      user: { 
        id: user.id, 
        name: user.name, 
        isSuperAdmin: user.isSuperAdmin,
        isAdmin: user.isAdmin,
        isDoorman: user.isDoorman,
        isResident: user.isResident
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar login.' });
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
      plateCode: true
    }
  });
  res.json(user);
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

  const code = generateAccessCode() + generateAccessCode(); // Ex: A3F9C2B1
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { clientCode: code }
  });
  res.json({ clientCode: updated.clientCode });
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
