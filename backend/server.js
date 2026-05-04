const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory db for simplicity. In production this should be a DB.
const dbPath = path.join(__dirname, 'db.json');
let properties = [];

if (fs.existsSync(dbPath)) {
  properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

const saveDb = () => {
  fs.writeFileSync(dbPath, JSON.stringify(properties, null, 2));
};

// Admin Routes
app.post('/api/properties', async (req, res) => {
  const { type, name, units } = req.body;
  // type: 'individual' | 'collective'
  const id = uuidv4();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/chamada/${id}`;
  
  // Generate QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(url, { 
    width: 500, 
    margin: 2, 
    color: { dark: '#000', light: '#FFF' } 
  });
  
  const property = {
    id,
    type,
    name,
    units: type === 'collective' ? units.map(u => ({ id: uuidv4(), name: u.name })) : [{ id: uuidv4(), name: 'Principal' }],
    qrCodeUrl: qrCodeDataUrl,
    url,
    createdAt: new Date().toISOString()
  };
  
  properties.push(property);
  saveDb();
  
  res.status(201).json(property);
});

app.get('/api/properties', (req, res) => {
  res.json(properties);
});

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

// WebSockets for Real-time Signaling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Resident connects and joins their unit's room
  socket.on('register_resident', ({ unitId }) => {
    socket.join(`unit_${unitId}`);
    console.log(`Resident ${socket.id} joined unit_${unitId}`);
  });
  
  // Visitor initiates a call
  socket.on('initiate_call', ({ unitId, photoBase64 }) => {
    console.log(`Visitor initiating call to unit_${unitId}`);
    // Notify residents of the unit
    io.to(`unit_${unitId}`).emit('incoming_call', {
      visitorSocketId: socket.id,
      photo: photoBase64,
      timestamp: Date.now()
    });
  });
  
  // Resident answers call
  socket.on('answer_call', ({ visitorSocketId }) => {
    io.to(visitorSocketId).emit('call_answered', { residentSocketId: socket.id });
  });
  
  // WebRTC Signaling
  socket.on('webrtc_offer', ({ target, offer }) => {
    io.to(target).emit('webrtc_offer', { sender: socket.id, offer });
  });
  
  socket.on('webrtc_answer', ({ target, answer }) => {
    io.to(target).emit('webrtc_answer', { sender: socket.id, answer });
  });
  
  socket.on('webrtc_ice_candidate', ({ target, candidate }) => {
    io.to(target).emit('webrtc_ice_candidate', { sender: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
