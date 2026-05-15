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
const messagesDbPath   = path.join(__dirname, 'messages.json');

let properties = [];
let residents  = [];
let visitors   = []; // histórico de visitantes
let messages   = []; // mensagens do condomínio

function loadDb() {
  if (fs.existsSync(dbPath))          properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (fs.existsSync(residentsDbPath)) residents  = JSON.parse(fs.readFileSync(residentsDbPath, 'utf8'));
  if (fs.existsSync(visitorsDbPath))  visitors   = JSON.parse(fs.readFileSync(visitorsDbPath, 'utf8'));
  if (fs.existsSync(messagesDbPath))  messages   = JSON.parse(fs.readFileSync(messagesDbPath, 'utf8'));
}
loadDb();

const saveDb        = () => fs.writeFileSync(dbPath,          JSON.stringify(properties, null, 2));
const saveResidents = () => fs.writeFileSync(residentsDbPath, JSON.stringify(residents,  null, 2));
const saveVisitors  = () => fs.writeFileSync(visitorsDbPath,  JSON.stringify(visitors,   null, 2));
const saveMessages  = () => fs.writeFileSync(messagesDbPath,  JSON.stringify(messages,   null, 2));

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
  
  const rawEmail = (email || '').trim().toLowerCase();
  const rawPassword = (password || '').trim();
  
  // 1. Master Admin
  if (rawEmail === MASTER_ADMIN_EMAIL.toLowerCase() && rawPassword === MASTER_ADMIN_PASSWORD) {
    return res.json({ success: true, role: 'master', email: MASTER_ADMIN_EMAIL });
  }
  
  // 2. Property Admin (Client) - aceita clientCode OU password como código OU adminPassword
  const codeInput = (clientCode || '').trim().toUpperCase();
  const passwordInput = (password || '').trim();
  const propAdmin = properties.find(p => {
    if ((p.adminEmail || '').toLowerCase() !== rawEmail) return false;
    // Check clientCode match (case-insensitive)
    if (p.clientCode && (p.clientCode === codeInput || p.clientCode === passwordInput.toUpperCase())) return true;
    // Check adminPassword match (exact)
    if (p.adminPassword && p.adminPassword === passwordInput) return true;
    return false;
  });
  if (propAdmin) {
    return res.json({
      success: true, role: 'admin', email: propAdmin.adminEmail,
      propertyId: propAdmin.id, propertyName: propAdmin.name,
      clientCode: propAdmin.clientCode
    });
  }

  // 3. Doorman - aceita doormanCode OU password
  const doorCode = (doormanCode || password || '').trim().toUpperCase();
  const propDoor = properties.find(p =>
    (p.doormanEmail || '').toLowerCase() === rawEmail &&
    (p.doormanCode === doorCode || p.doormanCode === rawPassword)
  );
  if (propDoor) {
    return res.json({
      success: true, role: 'doorman', email: propDoor.doormanEmail,
      propertyId: propDoor.id, propertyName: propDoor.name
    });
  }

  res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha/código.' });
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
  const { type, name, units, adminEmail, adminPassword, id, clientName, clientPhone, clientDocument, clientAddress, doormanEmail, companyName, plan } = req.body;

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
  const trialDays = (type === 'house' || type === 'individual') ? 15 : 30;
  nextPaymentDate.setDate(nextPaymentDate.getDate() + trialDays);

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
      ? (units && units.length > 0 ? units.map(u => ({
          id: uuidv4(),
          name: u.name,
          block: u.block || '',
          street: u.street || '',
          number: u.number || '',
          accessCode: generateAccessCode()
        })) : [])
      : [{ id: uuidv4(), name: 'Principal', block: '', street: '', number: '', accessCode: clientCode }], // Use clientCode as accessCode for single units
    qrCodeUrl: qrCodeDataUrl,
    url,
    adminEmail: adminEmail || null,
    adminPassword: adminPassword || null,
    createdAt: existingIndex > -1 ? properties[existingIndex].createdAt : new Date().toISOString(),
    nextPaymentDate: existingIndex > -1 ? properties[existingIndex].nextPaymentDate : nextPaymentDate.toISOString()
  };

  if (existingIndex > -1) {
    // Preserve existing password if not updated
    if (properties[existingIndex].adminPassword && !adminPassword) {
      property.adminPassword = properties[existingIndex].adminPassword;
    }
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
  if (email && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return res.json(properties);
  }

  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  // Filter by adminEmail OR doormanEmail (case-insensitive)
  const emailLower = email.toLowerCase();
  const filtered = properties.filter(p => 
    (p.adminEmail || '').toLowerCase() === emailLower || 
    (p.doormanEmail || '').toLowerCase() === emailLower
  );
  res.json(filtered);
});

app.get('/api/properties/:id', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  res.json(prop);
});

app.get('/api/properties/:id/units', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  // Return unit list with names, IDs, address info, and access codes
  res.json(prop.units.map(u => ({ id: u.id, name: u.name, block: u.block || '', street: u.street || '', number: u.number || '', accessCode: u.accessCode || '' })));
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

// Editar dados do cliente/propriedade (Master Admin ou Admin)
app.put('/api/properties/:id', (req, res) => {
  const { adminEmail, clientName, clientPhone, clientDocument, clientAddress, companyName, plan, name } = req.body;
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Unauthorized to edit this property' });
  }

  if (clientName !== undefined) prop.clientName = clientName;
  if (clientPhone !== undefined) prop.clientPhone = clientPhone;
  if (clientDocument !== undefined) prop.clientDocument = clientDocument;
  if (clientAddress !== undefined) prop.clientAddress = clientAddress;
  if (companyName !== undefined) prop.companyName = companyName;
  if (plan !== undefined) prop.plan = plan;
  if (name !== undefined) prop.name = name;

  saveDb();
  res.json(prop);
});

// Liberar mais 15 dias de teste
app.post('/api/properties/:id/extend-trial', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const currentPaymentDate = new Date(prop.nextPaymentDate);
  const now = new Date();
  
  // Se já venceu, começa a contar de hoje. Se não venceu, adiciona ao final.
  const baseDate = currentPaymentDate > now ? currentPaymentDate : now;
  baseDate.setDate(baseDate.getDate() + 15);
  
  prop.nextPaymentDate = baseDate.toISOString();
  saveDb();
  res.json({ success: true, nextPaymentDate: prop.nextPaymentDate });
});

// Ativar acesso anual (12 meses) após pagamento
app.post('/api/properties/:id/activate-annual', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const currentPaymentDate = new Date(prop.nextPaymentDate);
  const now = new Date();
  
  // Se já venceu, começa a contar de hoje. Se não venceu, adiciona ao final.
  const baseDate = currentPaymentDate > now ? currentPaymentDate : now;
  baseDate.setFullYear(baseDate.getFullYear() + 1);
  
  prop.nextPaymentDate = baseDate.toISOString();
  prop.plan = 'Anual';
  saveDb();
  res.json({ success: true, nextPaymentDate: prop.nextPaymentDate });
});

// ─── Unit Management Routes (Admin Panel do Condomínio) ───────────────────────

// Adicionar nova unidade a uma propriedade
app.post('/api/properties/:id/units', (req, res) => {
  const { adminEmail } = req.body;
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
  
  // Verificação de permissão
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Sem permissão para editar esta propriedade.' });
  }

  const { name, block, street, number } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da unidade é obrigatório.' });

  const newUnit = {
    id: uuidv4(),
    name: name.trim(),
    block: (block || '').trim(),
    street: (street || '').trim(),
    number: (number || '').trim(),
    accessCode: generateAccessCode()
  };

  prop.units.push(newUnit);
  saveDb();
  res.status(201).json(newUnit);
});

// Editar unidade existente
app.put('/api/properties/:propId/units/:unitId', (req, res) => {
  const { adminEmail, name, block, street, number } = req.body;
  const prop = properties.find(p => p.id === req.params.propId);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
  
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Sem permissão para editar esta propriedade.' });
  }

  const unit = prop.units.find(u => u.id === req.params.unitId);
  if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

  if (name !== undefined) unit.name = name.trim();
  if (block !== undefined) unit.block = block.trim();
  if (street !== undefined) unit.street = street.trim();
  if (number !== undefined) unit.number = number.trim();

  saveDb();
  res.json(unit);
});

// Deletar unidade
app.delete('/api/properties/:propId/units/:unitId', (req, res) => {
  const { adminEmail } = req.query;
  const prop = properties.find(p => p.id === req.params.propId);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
  
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Sem permissão para editar esta propriedade.' });
  }

  const unitIndex = prop.units.findIndex(u => u.id === req.params.unitId);
  if (unitIndex === -1) return res.status(404).json({ error: 'Unidade não encontrada.' });

  prop.units.splice(unitIndex, 1);
  saveDb();
  res.json({ success: true });
});

// ─── Gerenciar Porteiro ───────────────────────────────────────────────────────
app.put('/api/properties/:id/doorman', (req, res) => {
  const { adminEmail, doormanEmail } = req.body;
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
  
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Sem permissão.' });
  }

  prop.doormanEmail = doormanEmail || null;
  // Gera código de porteiro se não existir e email foi fornecido
  if (doormanEmail && !prop.doormanCode) {
    prop.doormanCode = generateAccessCode();
  }
  // Remove código se email foi removido
  if (!doormanEmail) {
    prop.doormanCode = null;
  }

  saveDb();
  res.json({ success: true, doormanCode: prop.doormanCode, doormanEmail: prop.doormanEmail });
});

// ─── Regenerar código de acesso (bloqueia morador atual) ──────────────────────
app.post('/api/properties/:propId/units/:unitId/regenerate-code', (req, res) => {
  const { adminEmail } = req.body;
  const prop = properties.find(p => p.id === req.params.propId);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
  
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Sem permissão.' });
  }

  const unit = prop.units.find(u => u.id === req.params.unitId);
  if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

  unit.accessCode = generateAccessCode();
  saveDb();
  res.json({ success: true, newCode: unit.accessCode });
});

// ─── Buscar vizinho por endereço (bloco/rua + número) ─────────────────────────
app.get('/api/properties/:id/search-unit', (req, res) => {
  const { block, street, number } = req.query;
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });

  // Busca por combinação de bloco/rua + número
  const results = prop.units.filter(u => {
    const matchBlock = block ? (u.block || '').toLowerCase().includes(block.toLowerCase()) : true;
    const matchStreet = street ? (u.street || '').toLowerCase().includes(street.toLowerCase()) : true;
    const matchNumber = number ? (u.number || '').toLowerCase() === number.toLowerCase() : true;
    
    // Precisa ter pelo menos bloco ou rua + número para ser encontrado
    const hasAddress = (u.block || u.street) && u.number;
    if (!hasAddress) return false;
    
    return matchBlock && matchStreet && matchNumber;
  });

  if (results.length === 0) {
    return res.status(404).json({ error: 'Nenhuma unidade encontrada com esse endereço. Verifique se os dados estão cadastrados.' });
  }

  res.json(results.map(u => ({ id: u.id, name: u.name, block: u.block || '', street: u.street || '', number: u.number || '' })));
});

// ─── Mensagens do Condomínio (Broadcast) ──────────────────────────────────────

// Enviar mensagem para todos os moradores de uma propriedade
app.post('/api/properties/:id/broadcast', (req, res) => {
  const { adminEmail, title, body, priority } = req.body;
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
  
  if (adminEmail !== MASTER_ADMIN_EMAIL && prop.adminEmail !== adminEmail) {
    return res.status(403).json({ error: 'Sem permissão para enviar mensagens.' });
  }

  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'O corpo da mensagem é obrigatório.' });
  }

  const message = {
    id: uuidv4(),
    propertyId: prop.id,
    propertyName: prop.name,
    title: (title || 'Aviso do Condomínio').trim(),
    body: body.trim(),
    priority: priority || 'normal', // normal | urgent
    senderEmail: adminEmail,
    createdAt: new Date().toISOString(),
    readBy: []
  };

  messages.push(message);
  if (messages.length > 1000) messages = messages.slice(-1000);
  saveMessages();

  // Emitir via WebSocket para todos os moradores da propriedade
  prop.units.forEach(unit => {
    io.to(`unit_${unit.id}`).emit('broadcast_message', {
      id: message.id,
      title: message.title,
      body: message.body,
      priority: message.priority,
      propertyName: prop.name,
      createdAt: message.createdAt
    });
  });

  res.status(201).json(message);
});

// Buscar mensagens de uma propriedade
app.get('/api/properties/:id/messages', (req, res) => {
  const prop = properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });

  const propMessages = messages
    .filter(m => m.propertyId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);

  res.json(propMessages);
});

// Marcar mensagem como lida
app.post('/api/messages/:msgId/read', (req, res) => {
  const { unitId } = req.body;
  const msg = messages.find(m => m.id === req.params.msgId);
  if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada.' });
  
  if (!msg.readBy.includes(unitId)) {
    msg.readBy.push(unitId);
    saveMessages();
  }
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

  // 2. Check if it's an admin/client code (síndico/administrador do condomínio)
  const adminProp = properties.find(p => p.clientCode === code);
  if (adminProp) {
    return res.json({
      role: 'admin',
      propertyId: adminProp.id,
      propertyName: adminProp.name,
      clientCode: adminProp.clientCode,
      adminEmail: adminProp.adminEmail
    });
  }

  // 3. Check if it's a resident unit code
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

  socket.on('initiate_call', ({ unitId, propertyId, photoBase64, callerName }) => {
    console.log(`[WS] Chamada para unit_${unitId} na prop_${propertyId} de ${socket.id} (${callerName || 'visitante'})`);

    const visit = {
      id: uuidv4(),
      unitId,
      propertyId,
      visitorSocketId: socket.id,
      photo: photoBase64 || null,
      callerName: callerName || 'Visitante',
      timestamp: new Date().toISOString()
    };
    visitors.push(visit);
    if (visitors.length > 500) visitors = visitors.slice(-500);
    saveVisitors();

    io.to(`unit_${unitId}`).emit('incoming_call', {
      visitorSocketId: socket.id,
      photo: photoBase64,
      callerName: callerName || 'Visitante',
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

  // Porteiro envia mensagem de texto para uma unidade específica
  socket.on('doorman_message', ({ unitId, propertyId, message, senderName }) => {
    if (!unitId || !message) return;
    console.log(`[WS] Porteiro → unit_${unitId}: ${message}`);
    io.to(`unit_${unitId}`).emit('doorman_message', {
      message,
      senderName: senderName || 'Portaria',
      propertyId,
      timestamp: new Date().toISOString()
    });
  });

  // Porteiro inicia chamada (interfone) para uma unidade
  socket.on('doorman_call', ({ unitId, propertyId, callerName }) => {
    if (!unitId) return;
    console.log(`[WS] Porteiro chamando unit_${unitId}`);
    io.to(`unit_${unitId}`).emit('incoming_call', {
      visitorSocketId: socket.id,
      photo: null,
      callerName: callerName || 'Portaria',
      timestamp: new Date().toISOString(),
      visitId: uuidv4(),
      propertyId,
      fromDoorman: true
    });
  });

  // Morador envia mensagem para a portaria
  socket.on('resident_message_doorman', ({ propertyId, unitId, message, senderName, authorizeEntry }) => {
    if (!propertyId || !message) return;
    console.log(`[WS] Morador → doorman_${propertyId}: ${message} (Auth: ${!!authorizeEntry})`);
    io.to(`doorman_${propertyId}`).emit('resident_message', {
      message,
      senderName: senderName || 'Morador',
      unitId,
      authorizeEntry: !!authorizeEntry,
      timestamp: new Date().toISOString()
    });
  });

  // Morador inicia chamada para a portaria
  socket.on('resident_call_doorman', ({ propertyId, unitId, callerName }) => {
    if (!propertyId) return;
    console.log(`[WS] Morador ${unitId} chamando doorman_${propertyId}`);
    io.to(`doorman_${propertyId}`).emit('incoming_resident_call', {
      residentSocketId: socket.id,
      unitId,
      callerName: callerName || 'Morador',
      timestamp: new Date().toISOString()
    });
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
