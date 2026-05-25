const io_client = require('socket.io-client');

const USER_ID = '8142305e-4287-4783-883b-bebf936c45b6';
const UNIT_ID = 'e3534ed7-9bc2-4b28-bfbd-741c9ae48d2f';
const PROPERTY_ID_ENV = process.env.PROP_ID || null;
const API_URL = 'https://campainha-digital.onrender.com';

console.log('=== TESTE DE CHAMADA COMPLETO ===\n');
console.log('1. Conectando como MORADOR...');

// Socket 1: simula o MORADOR logado
const residentSocket = io_client(API_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true
});

residentSocket.on('connect', () => {
  console.log(`✅ Morador conectado! socket.id = ${residentSocket.id}`);
  residentSocket.emit('register_user', { userId: USER_ID });
  residentSocket.emit('register_user', { userId: UNIT_ID });
  console.log(`📡 Morador registrado nas salas: user_${USER_ID} e user_${UNIT_ID}`);
  console.log('\n2. Aguardando 2s e simulando VISITANTE tocando a campainha...\n');

  setTimeout(async () => {
    // Socket 2: simula o VISITANTE
    const visitorSocket = io_client(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false
    });

    visitorSocket.on('connect', async () => {
      console.log(`✅ Visitante conectado! socket.id = ${visitorSocket.id}`);
      console.log('📞 Emitindo initiate_call...');
      
      visitorSocket.emit('initiate_call', {
        unitId: UNIT_ID,
        propertyId: PROPERTY_ID_ENV,
        photoBase64: null,
        callerName: 'TESTE DEBUG',
        visitorLat: null,
        visitorLng: null
      });
      
      console.log('   unitId:', UNIT_ID);
      console.log('   propertyId:', PROPERTY_ID_ENV || '(nulo — pode falhar sem propertyId)');
      
      visitorSocket.on('call_failed', (data) => {
        console.log('\n❌ call_failed recebido pelo visitante:', data.reason, '-', data.message);
        visitorSocket.disconnect();
        setTimeout(() => {
          residentSocket.disconnect();
          process.exit(0);
        }, 2000);
      });
      
      // Timeout visitante
      setTimeout(() => {
        console.log('\n⏰ Timeout do visitante. Desconectando...');
        visitorSocket.disconnect();
      }, 15000);
    });
    
    visitorSocket.on('connect_error', (e) => {
      console.log('❌ Erro visitante:', e.message);
    });
  }, 2000);
});

// Listener do morador
residentSocket.on('incoming_call', (data) => {
  console.log('\n🔔🔔🔔 incoming_call RECEBIDO pelo morador! 🔔🔔🔔');
  console.log('   callerName:', data.callerName);
  console.log('   visitorSocketId:', data.visitorSocketId);
  console.log('   photo:', data.photo ? 'SIM (base64)' : 'NÃO');
  console.log('\n✅ SOCKET FUNCIONA! O problema é no front-end (áudio/UI iOS)');
  residentSocket.disconnect();
  process.exit(0);
});

residentSocket.on('connect_error', (e) => {
  console.log('❌ Erro morador:', e.message);
});

// Timeout geral
setTimeout(() => {
  console.log('\n❌ Timeout geral — incoming_call não chegou em 20s');
  console.log('   Possíveis causas:');
  console.log('   1. propertyId está nulo → backend retorna erro silencioso');
  console.log('   2. Geofence está ativo e bloqueando');
  console.log('   3. Visitor model requer photoBase64');
  residentSocket.disconnect();
  process.exit(1);
}, 25000);
