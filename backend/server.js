const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // Configurações para Render Free Tier
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Paths dos bancos JSON ────────────────────────────────────────────────────
const dbPath           = path.join(__dirname, 'db.json');
const residentsDbPath  = path.join(__dirname, 'residents.json');
const visitorsDbPath   = path.join(__dirname, 'visitors.json');

let properties = [];
let residents  = [];
let visitors   = []; // histórico de visitantes

function loadDb() {
  if (fs.existsSync(dbPath))          properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (fs.existsSync(residentsDbPath)) residents  = JSON.parse(fs.readFileSync(residentsDbPath, 'utf8'));
  if (fs.existsSync(visitorsDbPath))  visitors   = JSON.parse(fs.readFileSync(visitorsDbPath, 'utf8'));
}
loadDb();

const saveDb        = () => fs.writeFileSync(dbPath,          JSON.stringify(properties, null, 2));
const saveResidents = () => fs.writeFileSync(residentsDbPath, JSON.stringify(residents,  null, 2));
const saveVisitors  = () => fs.writeFileSync(visitorsDbPath,  JSON.stringify(visitors,   null, 2));

// ─── Keep-Alive endpoint (previne spin-down no Render Free) ──────────────────
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateAccessCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// ─── Properties Routes ───────────────────────────────────────────────────────
app.post('/api/properties', async (req, res) => {
  const { type, name, units } = req.body;
  const id = uuidv4();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/chamada/${id}`;

  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    width: 500,
    margin: 2,
    color: { dark: '#000', light: '#FFF' }
  });

  const property = {
    id,
    type,
    name,
    units: type === 'collective'
      ? units.map(u => ({ id: uuidv4(), name: u.name, accessCode: generateAccessCode() }))
      : [{ id: uuidv4(), name: 'Principal', accessCode: generateAccessCode() }],
    qrCodeUrl: qrCodeDataUrl,
    url,
    createdAt: new Date().toISOString()
  };

  properties.push(property);
  saveDb();
  res.status(201).json(property);
});

app.get('/api/properties', (_req, res) => res.json(properties));

app.get('/api/properties/:id', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  res.json(prop);
});

app.delete('/api/properties/:id', (req, res) => {
  properties = properties.filter(p => p.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

// ─── Visitor History Routes ───────────────────────────────────────────────────
// Retorna histórico por unitId
app.get('/api/visitors/:unitId', (req, res) => {
  const unitVisitors = visitors
    .filter(v => v.unitId === req.params.unitId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 100); // últimas 100 visitas
  res.json(unitVisitors);
});

// Retorna histórico por propertyId (todos as unidades)
app.get('/api/visitors/property/:propertyId', (req, res) => {
  // Busca todas as unidades da propriedade
  const prop = properties.find(p => p.id === req.params.propertyId);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  
  const unitIds = prop.units.map(u => u.id);
  const propVisitors = visitors
    .filter(v => unitIds.includes(v.unitId))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 200);
  res.json(propVisitors);
});

// ─── Resident Auth Routes ─────────────────────────────────────────────────────
app.post('/api/resident/register', (req, res) => {
  const { email, accessCode } = req.body;
  if (!email || !accessCode)
    return res.status(400).json({ error: 'E-mail e código de acesso são obrigatórios.' });

  let foundUnit = null, foundProperty = null;
  for (const prop of properties) {
    const unit = prop.units.find(u => u.accessCode === accessCode);
    if (unit) { foundUnit = unit; foundProperty = prop; break; }
  }
  if (!foundUnit) return res.status(404).json({ error: 'Código de acesso inválido.' });

  const existing = residents.find(r => r.email === email && r.unitId === foundUnit.id);
  if (existing)
    return res.json({ unitId: foundUnit.id, unitName: foundUnit.name, propertyName: foundProperty.name, propertyId: foundProperty.id, message: 'Já registrado.' });

  residents.push({
    email, unitId: foundUnit.id, unitName: foundUnit.name,
    propertyId: foundProperty.id, propertyName: foundProperty.name,
    createdAt: new Date().toISOString()
  });
  saveResidents();
  res.status(201).json({ unitId: foundUnit.id, unitName: foundUnit.name, propertyName: foundProperty.name, propertyId: foundProperty.id });
});

app.post('/api/resident/login', (req, res) => {
  const { email, accessCode } = req.body;
  if (!email || !accessCode)
    return res.status(400).json({ error: 'E-mail e código de acesso são obrigatórios.' });

  let foundUnit = null, foundProperty = null;
  for (const prop of properties) {
    const unit = prop.units.find(u => u.accessCode === accessCode);
    if (unit) { foundUnit = unit; foundProperty = prop; break; }
  }
  if (!foundUnit) return res.status(401).json({ error: 'Código de acesso inválido.' });

  const existing = residents.find(r => r.email === email && r.unitId === foundUnit.id);
  if (!existing) {
    residents.push({
      email, unitId: foundUnit.id, unitName: foundUnit.name,
      propertyId: foundProperty.id, propertyName: foundProperty.name,
      createdAt: new Date().toISOString()
    });
    saveResidents();
  }
  res.json({ unitId: foundUnit.id, unitName: foundUnit.name, propertyName: foundProperty.name, propertyId: foundProperty.id });
});

// Login por CÓDIGO apenas (para condomínios e vilas — sem precisar de e-mail)
app.post('/api/resident/login-by-code', (req, res) => {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ error: 'Código de acesso é obrigatório.' });

  let foundUnit = null, foundProperty = null;
  for (const prop of properties) {
    const unit = prop.units.find(u => u.accessCode === accessCode.trim().toUpperCase());
    if (unit) { foundUnit = unit; foundProperty = prop; break; }
  }
  if (!foundUnit) return res.status(401).json({ error: 'Código de acesso inválido. Verifique com o síndico/proprietário.' });

  res.json({
    unitId: foundUnit.id,
    unitName: foundUnit.name,
    propertyName: foundProperty.name,
    propertyId: foundProperty.id,
    propertyType: foundProperty.type
  });
});

// ─── Mapa de sockets de moradores ativos ─────────────────────────────────────
// unitId → Set<socketId>
const residentSockets = new Map();

// ─── WebSockets ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[WS] conectado:', socket.id);

  // Morador entra na sala da sua unidade
  socket.on('register_resident', ({ unitId }) => {
    socket.join(`unit_${unitId}`);
    if (!residentSockets.has(unitId)) residentSockets.set(unitId, new Set());
    residentSockets.get(unitId).add(socket.id);
    console.log(`[WS] Morador ${socket.id} → unit_${unitId}`);
  });

  // Visitante toca a campainha
  socket.on('initiate_call', ({ unitId, photoBase64 }) => {
    console.log(`[WS] Chamada para unit_${unitId} de ${socket.id}`);

    // Salva o visitante no histórico
    const visit = {
      id: uuidv4(),
      unitId,
      visitorSocketId: socket.id,
      photo: photoBase64 || null,
      timestamp: new Date().toISOString()
    };
    visitors.push(visit);
    // Mantém apenas as últimas 500 visitas para não inflar o JSON
    if (visitors.length > 500) visitors = visitors.slice(-500);
    saveVisitors();

    // Notifica moradores da unidade
    io.to(`unit_${unitId}`).emit('incoming_call', {
      visitorSocketId: socket.id,
      photo: photoBase64,
      timestamp: visit.timestamp,
      visitId: visit.id
    });
  });

  // Morador atende a chamada
  socket.on('answer_call', ({ visitorSocketId, mode, unitId }) => {
    console.log(`[WS] Morador ${socket.id} atende ${visitorSocketId} modo=${mode}`);
    io.to(visitorSocketId).emit('call_answered', {
      residentSocketId: socket.id,
      mode,
      unitId
    });
  });

  // ─── WebRTC Signaling puro (sem PeerJS) ─────────────────────────────────
  // O visitante envia offer para o morador
  socket.on('webrtc_offer', ({ target, offer }) => {
    console.log(`[WRTc] offer de ${socket.id} para ${target}`);
    io.to(target).emit('webrtc_offer', { sender: socket.id, offer });
  });

  // O morador responde com answer
  socket.on('webrtc_answer', ({ target, answer }) => {
    console.log(`[WRTc] answer de ${socket.id} para ${target}`);
    io.to(target).emit('webrtc_answer', { sender: socket.id, answer });
  });

  // Troca de ICE candidates (ambos os lados)
  socket.on('webrtc_ice_candidate', ({ target, candidate }) => {
    io.to(target).emit('webrtc_ice_candidate', { sender: socket.id, candidate });
  });

  // Sinaliza encerramento de chamada
  socket.on('call_ended', ({ target }) => {
    if (target) io.to(target).emit('call_ended');
  });

  // Morador envia mensagem rápida para o visitante
  socket.on('send_quick_message', ({ target, message }) => {
    if (target) io.to(target).emit('quick_message', { message });
  });

  socket.on('disconnect', () => {
    console.log('[WS] desconectado:', socket.id);
    // Remove morador dos maps
    residentSockets.forEach((sockets, unitId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) residentSockets.delete(unitId);
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
