const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const u = await p.user.findFirst({
    where: { email: 'teste1@hotmail.com' },
    select: { id: true, name: true, doorbellEnabled: true, quietModeStart: true, quietModeEnd: true }
  });
  
  console.log('=== CONFIGURAÇÕES DE SILÊNCIO DO USUÁRIO ===');
  console.log(JSON.stringify(u, null, 2));
  
  // Simula o check que o backend faz agora
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  console.log('\nHorário atual (servidor):', currentTime);
  
  if (u.quietModeStart && u.quietModeEnd) {
    console.log('\nModo silencioso configurado:', u.quietModeStart, 'até', u.quietModeEnd);
    
    let silenced = false;
    if (u.quietModeStart < u.quietModeEnd) {
      if (currentTime >= u.quietModeStart && currentTime <= u.quietModeEnd) silenced = true;
    } else {
      if (currentTime >= u.quietModeStart || currentTime <= u.quietModeEnd) silenced = true;
    }
    
    console.log('→ Silenciado agora?', silenced ? '❌ SIM — BLOQUEANDO CHAMADAS!' : '✅ NÃO');
  } else {
    console.log('\n→ Sem modo silencioso configurado');
  }
  
  // Reseta o modo silencioso para testes
  console.log('\n🔧 Resetando modo silencioso para null/null...');
  await p.user.update({
    where: { id: u.id },
    data: { quietModeStart: null, quietModeEnd: null, doorbellEnabled: true }
  });
  console.log('✅ Modo silencioso REMOVIDO. Agora a campainha deve funcionar.');
}

main().catch(e => console.error('ERRO:', e.message)).finally(() => p.$disconnect());
