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

// ─── Master Admin Credentials ────────────────────────────────────────────────
const MASTER_ADMIN_EMAIL = 'leandro2703palmeira@gmail.com';
const MASTER_ADMIN_PASSWORD = '27031981';

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { email, password, clientCode, doormanCode } = req.body;
  
  // 1. Master Admin
  if (email === MASTER_ADMIN_EMAIL && password === MASTER_ADMIN_PASSWORD) {
    return res.json({ success: true, role: 'master', email });
  }
  
  // 2. Property Admin (Client)
  const codeToUse = clientCode || password;
  const propAdmin = properties.find(p => p.adminEmail === email && p.clientCode === codeToUse);
  if (propAdmin) {
    return res.json({ success: true, role: 'admin', email });
  }

  // 3. Doorman
  const doorCode = doormanCode || password;
  const propDoor = properties.find(p => p.doormanEmail === email && p.doormanCode === doorCode);
  if (propDoor) {
    return res.json({ success: true, role: 'doorman', email, propertyId: propDoor.id, propertyName: propDoor.name });
  }

  res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e código.' });
});

// ─── Doorman Auth Route ──────────────────────────────────────────────────────
app.post('/api/doorman/login', (req, res) => {
  const { email, doormanCode } = req.body;
  const prop = properties.find(p => p.doormanEmail === email && p.doormanCode === doormanCode);
  if (!prop) return res.status(401).json({ error: 'Credenciais do porteiro inválidas.' });
  res.json({ success: true, propertyId: prop.id, propertyName: prop.name });
});

// ─── Properties Routes ───────────────────────────────────────────────────────
app.post('/api/properties', async (req, res) => {
  const { type, name, units, adminEmail, id, clientName, clientPhone, clientDocument, clientAddress, doormanEmail, companyName, plan } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Nenhum ID de QR Code foi fornecido. O cadastro exige um escaneamento prévio.' });
  }

  // Ensure ID is unique
  if (properties.some(p => p.id === id)) {
    return res.status(400).json({ error: 'Este QR Code / ID já está em uso por outro cliente.' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/chamada/${id}`;

  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    width: 500,
    margin: 2,
    color: { dark: '#000', light: '#FFF' }
  });

  const existingIndex = properties.findIndex(p => p.id === id);
  const isCollective = type === 'village' || type === 'condo' || type === 'collective';
  
  const nextPaymentDate = new Date();
  nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

  const clientCode = existingIndex > -1 ? properties[existingIndex].clientCode : generateAccessCode();
  const doormanCode = isCollective ? (existingIndex > -1 && properties[existingIndex].doormanCode ? properties[existingIndex].doormanCode : generateAccessCode()) : null;

  const property = {
    id,
    type: type || 'house',
    name: name || 'Nova Propriedade',
    clientName: clientName || '',
    clientPhone: clientPhone || '',
    clientDocument: clientDocument || '',
    clientAddress: clientAddress || '',
    companyName: companyName || '',
    plan: plan || 'PRO',
    clientCode,
    doormanCode,
    doormanEmail: doormanEmail || null,
    units: isCollective
      ? (units && units.length > 0 ? units.map(u => ({ id: uuidv4(), name: u.name, accessCode: generateAccessCode() })) : [])
      : [{ id: uuidv4(), name: 'Principal', accessCode: generateAccessCode() }],
    qrCodeUrl: qrCodeDataUrl,
    url,
    adminEmail: adminEmail || null,
    createdAt: existingIndex > -1 ? properties[existingIndex].createdAt : new Date().toISOString(),
    nextPaymentDate: existingIndex > -1 ? properties[existingIndex].nextPaymentDate : nextPaymentDate.toISOString()
  };

  if (existingIndex > -1) {
    properties[existingIndex] = property;
  } else {
    properties.push(property);
  }

  saveDb();
  res.status(201).json(property);
});

app.get('/api/properties', (req, res) => {
  const { email } = req.query;
  
  // Master Admin always sees everything
  if (email === MASTER_ADMIN_EMAIL) {
    return res.json(properties);
  }

  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  // Filter by adminEmail OR doormanEmail
  const filtered = properties.filter(p => p.adminEmail === email || p.doormanEmail === email);
  res.json(filtered);
});

app.get('/api/properties/:id', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  res.json(prop);
});

app.delete('/api/properties/:id', (req, res) => {
  const { adminEmail } = req.query;
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  
  // Isolamento: Apenas o dono ou Master Admin pode deletar
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Unauthorized to delete this property' });
  }

  properties = properties.filter(p => p.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

// ─── Visitor History Routes ───────────────────────────────────────────────────
// Retorna histórico por unitId - Apenas para moradores daquela unidade
app.get('/api/visitors/:unitId', (req, res) => {
  const { propertyId } = req.query; // Validamos o propertyId para garantir isolamento
  
  const unitVisitors = visitors
    .filter(v => v.unitId === req.params.unitId && (!propertyId || v.propertyId === propertyId))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 100);
  res.json(unitVisitors);
});

// Retorna histórico por propertyId (todos as unidades) - Apenas para o admin da propriedade
app.get('/api/visitors/property/:propertyId', (req, res) => {
  const { adminEmail } = req.query;
  
  // Validação de propriedade e admin
  const prop = properties.find(p => p.id === req.params.propertyId);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  
  // Se adminEmail for fornecido, verificamos se ele é o dono (Isolamento)
  if (adminEmail && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Unauthorized access to this property history' });
  }
  
  const propVisitors = visitors
    .filter(v => v.propertyId === req.params.propertyId)
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
    const unit = prop.units.find(u => u.accessCode === accessCode.trim().toUpperCase());
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
    const unit = prop.units.find(u => u.accessCode === accessCode.trim().toUpperCase());
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

app.post('/api/resident/login-by-code', (req, res) => {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ error: 'Código de acesso é obrigatório.' });

  const code = accessCode.trim().toUpperCase();

  // 1. Check if it's a doorman code first
  const doormanProp = properties.find(p => p.doormanCode === code);
  if (doormanProp) {
    return res.json({
      role: 'doorman',
      propertyId: doormanProp.id,
      propertyName: doormanProp.name
    });
  }

  // 2. Check if it's a resident unit code
  let foundUnit = null, foundProperty = null;
  for (const prop of properties) {
    const unit = prop.units.find(u => u.accessCode === code);
    if (unit) { foundUnit = unit; foundProperty = prop; break; }
  }

  if (!foundUnit) return res.status(401).json({ error: 'Código de acesso inválido. Verifique com o síndico/proprietário.' });

  res.json({
    role: 'resident',
    unitId: foundUnit.id,
    unitName: foundUnit.name,
    propertyName: foundProperty.name,
    propertyId: foundProperty.id,
    propertyType: foundProperty.type
  });
});

const residentSockets = new Map();
const doormanSockets = new Map();

io.on('connection', (socket) => {
  console.log('[WS] conectado:', socket.id);

  socket.on('register_doorman', ({ propertyId }) => {
    socket.join(`doorman_${propertyId}`);
    if (!doormanSockets.has(propertyId)) doormanSockets.set(propertyId, new Set());
    doormanSockets.get(propertyId).add(socket.id);
    console.log(`[WS] Porteiro ${socket.id} → property_${propertyId}`);
  });

  socket.on('register_resident', ({ unitId }) => {
    socket.join(`unit_${unitId}`);
    if (!residentSockets.has(unitId)) residentSockets.set(unitId, new Set());
    residentSockets.get(unitId).add(socket.id);
    console.log(`[WS] Morador ${socket.id} → unit_${unitId}`);
  });

  socket.on('initiate_call', ({ unitId, propertyId, photoBase64 }) => {
    console.log(`[WS] Chamada para unit_${unitId} na prop_${propertyId} de ${socket.id}`);

    const visit = {
      id: uuidv4(),
      unitId,
      propertyId, // Isolamento vinculado à propriedade
      visitorSocketId: socket.id,
      photo: photoBase64 || null,
      timestamp: new Date().toISOString()
    };
    visitors.push(visit);
    if (visitors.length > 500) visitors = visitors.slice(-500);
    saveVisitors();

    io.to(`unit_${unitId}`).emit('incoming_call', {
      visitorSocketId: socket.id,
      photo: photoBase64,
      timestamp: visit.timestamp,
      visitId: visit.id,
      propertyId
    });
  });

  socket.on('answer_call', ({ visitorSocketId, mode, unitId }) => {
    io.to(visitorSocketId).emit('call_answered', {
      residentSocketId: socket.id,
      mode,
      unitId
    });
  });

  socket.on('webrtc_offer', ({ target, offer }) => {
    io.to(target).emit('webrtc_offer', { sender: socket.id, offer });
  });

  socket.on('webrtc_answer', ({ target, answer }) => {
    io.to(target).emit('webrtc_answer', { sender: socket.id, answer });
  });

  socket.on('webrtc_ready', ({ target }) => {
    io.to(target).emit('webrtc_ready', { residentSocketId: socket.id });
  });

  socket.on('webrtc_ice_candidate', ({ target, candidate }) => {
    io.to(target).emit('webrtc_ice_candidate', { sender: socket.id, candidate });
  });

  socket.on('call_ended', ({ target }) => {
    if (target) io.to(target).emit('call_ended');
  });

  socket.on('send_quick_message', ({ target, message }) => {
    if (target) io.to(target).emit('quick_message', { message });
  });

  socket.on('authorize_entry', ({ unitId, propertyId, visitorId }) => {
    // Notify the doorman that entry was authorized by the resident
    io.to(`doorman_${propertyId}`).emit('entry_authorized', { unitId, visitorId, timestamp: new Date().toISOString() });
    
    // Notify the visitor as well
    if (visitorId) {
      io.to(visitorId).emit('entry_authorized', { unitId, timestamp: new Date().toISOString() });
    }
  });

  socket.on('disconnect', () => {
    residentSockets.forEach((sockets, unitId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) residentSockets.delete(unitId);
    });
    doormanSockets.forEach((sockets, propId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) doormanSockets.delete(propId);
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

