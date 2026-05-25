const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require('socket.io');
const io_client = require('socket.io-client');

const p = new PrismaClient();

// IDs reais do banco
const USER_ID = '8142305e-4287-4783-883b-bebf936c45b6';
const UNIT_ID = 'e3534ed7-9bc2-4b28-bfbd-741c9ae48d2f';
const API_URL = 'https://campainha-digital.onrender.com';

console.log('=== DIAGNÓSTICO DE SOCKET EM TEMPO REAL ===\n');
console.log('Conectando ao servidor de produção:', API_URL);
console.log('Simulando morador logado com userId:', USER_ID);
console.log('unitId:', UNIT_ID);
console.log('');

const socket = io_client(API_URL, {
  transports: ['websocket', 'polling'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Socket conectado! socket.id =', socket.id);
  console.log('');
  
  // Simula exatamente o que o ResidentDashboard faz
  const ids = new Set();
  
  const doRegister = (uid) => {
    if (uid && !ids.has(uid)) {
      ids.add(uid);
      console.log('📡 Registrando na sala: user_' + uid);
      socket.emit('register_user', { userId: uid });
    }
  };
  
  doRegister(USER_ID);   // cd_user_id
  doRegister(USER_ID);   // cd_token (igual ao userId neste sistema)
  doRegister(UNIT_ID);   // residentUnitId
  doRegister(UNIT_ID);   // id da URL (= unitId)
  
  console.log('');
  console.log('⏳ Aguardando evento incoming_call por 30 segundos...');
  console.log('👉 Agora clique em TOCAR CAMPAINHA no PC!');
  console.log('');
  
  setTimeout(() => {
    console.log('❌ Timeout: nenhum evento incoming_call recebido em 30s');
    console.log('   → O socket está registrado mas o backend não está emitindo para essas salas');
    console.log('   → OU o socket registrou mas o backend reiniciou e perdeu o estado');
    socket.disconnect();
    p.$disconnect();
    process.exit(0);
  }, 30000);
});

socket.on('incoming_call', (data) => {
  console.log('🔔 SUCESSO! incoming_call recebido!');
  console.log('   callerName:', data.callerName);
  console.log('   visitorSocketId:', data.visitorSocketId);
  console.log('   photoBase64 length:', data.photo ? data.photo.length : 'SEM FOTO');
  console.log('');
  console.log('✅ O socket está funcionando corretamente!');
  console.log('   → O problema é apenas no frontend (áudio/UI)');
  socket.disconnect();
  p.$disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.log('❌ Erro de conexão:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Socket desconectado:', reason);
});
