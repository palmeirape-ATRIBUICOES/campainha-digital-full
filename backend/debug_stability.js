const io_client = require('socket.io-client');

const USER_ID = '8142305e-4287-4783-883b-bebf936c45b6';
const UNIT_ID = 'e3534ed7-9bc2-4b28-bfbd-741c9ae48d2f';
const API_URL = 'https://campainha-digital.onrender.com';

console.log('=== TESTE DE ESTABILIDADE DE SOCKET ===\n');
let connectTime = null;
let disconnectCount = 0;

const socket = io_client(API_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  connectTime = Date.now();
  disconnectCount = 0;
  console.log(`[${new Date().toISOString()}] ✅ Conectado! socket.id = ${socket.id}`);
  socket.emit('register_user', { userId: USER_ID });
  socket.emit('register_user', { userId: UNIT_ID });
  console.log(`[${new Date().toISOString()}] 📡 Registrado nas salas`);
});

socket.on('disconnect', (reason) => {
  const uptime = connectTime ? ((Date.now() - connectTime) / 1000).toFixed(1) : '?';
  disconnectCount++;
  console.log(`[${new Date().toISOString()}] ❌ DESCONECTADO após ${uptime}s — motivo: ${reason}`);
  if (disconnectCount >= 3) {
    console.log('\n📊 CONCLUSÃO: Socket cai consistentemente. Render está fechando conexões.');
    process.exit(0);
  }
});

socket.on('incoming_call', (data) => {
  console.log(`[${new Date().toISOString()}] 🔔 incoming_call recebido!`, data.callerName);
});

socket.on('connect_error', (err) => {
  console.log(`[${new Date().toISOString()}] ⚠️ connect_error: ${err.message}`);
});

// Mantém o processo vivo
setTimeout(() => {
  console.log('\n⏱️ Tempo total de teste: 60s');
  socket.disconnect();
  process.exit(0);
}, 60000);

// Pings manuais a cada 5s para ver quando cai
setInterval(() => {
  if (socket.connected) {
    const uptime = connectTime ? ((Date.now() - connectTime) / 1000).toFixed(0) : '?';
    console.log(`[${new Date().toISOString()}] ✓ Socket ainda conectado (${uptime}s uptime)`);
  }
}, 5000);
