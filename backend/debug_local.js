const io_client = require('socket.io-client');

const USER_ID = '8142305e-4287-4783-883b-bebf936c45b6';
const UNIT_ID = 'e3534ed7-9bc2-4b28-bfbd-741c9ae48d2f';
const PROP_ID = '4b495d67-a9d8-45bb-9dac-6a09d315e2da';
const API_URL = 'http://localhost:3001';

console.log('=== TESTE LOCAL E2E ===\n');

const residentSocket = io_client(API_URL, { transports: ['websocket', 'polling'], reconnection: false });

residentSocket.on('connect', () => {
  console.log(`✅ Morador conectado: ${residentSocket.id}`);
  residentSocket.emit('register_user', { userId: USER_ID });
  residentSocket.emit('register_user', { userId: UNIT_ID });
  console.log('📡 Registrado nas salas\n');

  setTimeout(() => {
    const visitorSocket = io_client(API_URL, { transports: ['websocket', 'polling'], reconnection: false });
    visitorSocket.on('connect', () => {
      console.log(`✅ Visitante conectado: ${visitorSocket.id}`);
      console.log('📞 Emitindo initiate_call...\n');
      visitorSocket.emit('initiate_call', {
        unitId: UNIT_ID,
        propertyId: PROP_ID,
        photoBase64: null,
        callerName: 'TESTE LOCAL',
        visitorLat: null,
        visitorLng: null
      });

      visitorSocket.on('call_failed', (d) => {
        console.log('❌ call_failed:', d.reason, '-', d.message);
        cleanup();
      });

      setTimeout(() => { console.log('⏰ Timeout visitante'); visitorSocket.disconnect(); }, 10000);
    });
  }, 1000);
});

residentSocket.on('incoming_call', (data) => {
  console.log('🔔🔔🔔 incoming_call RECEBIDO!');
  console.log('   callerName:', data.callerName);
  console.log('   visitorSocketId:', data.visitorSocketId);
  console.log('\n✅ SOCKET FUNCIONA! Bug está no frontend/áudio.');
  cleanup();
});

const cleanup = () => { residentSocket.disconnect(); setTimeout(() => process.exit(0), 500); };

residentSocket.on('connect_error', (e) => console.log('❌ Erro:', e.message));

setTimeout(() => {
  console.log('❌ Timeout total — incoming_call não chegou em 15s');
  console.log('→ Bug CONFIRMADO no backend handleIncomingCall');
  cleanup();
}, 15000);
