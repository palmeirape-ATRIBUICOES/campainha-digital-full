const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Busca o usuário pelo email
  const user = await p.user.findFirst({
    where: { email: 'teste1@hotmail.com' },
    include: { units: { include: { residents: true } } }
  });

  if (!user) {
    console.log('❌ Usuário teste1@hotmail.com NÃO encontrado no banco!');
    return;
  }

  console.log('\n=== USUÁRIO ===');
  console.log('ID (userId):', user.id);
  console.log('Email:', user.email);
  console.log('doorbellEnabled:', user.doorbellEnabled);
  console.log('trialEndsAt:', user.trialEndsAt);
  console.log('isAdmin:', user.isAdmin);

  console.log('\n=== UNIDADES DO USUÁRIO ===');
  user.units.forEach(unit => {
    console.log('  Unit ID:', unit.id);
    console.log('  Unit Name:', unit.name);
    console.log('  Residents nessa unidade:');
    unit.residents.forEach(r => {
      console.log('    - Resident ID:', r.id, '| Email:', r.email, '| doorbellEnabled:', r.doorbellEnabled);
    });
  });

  // Verifica se o backend vai encontrar o usuário como resident
  // quando o visitor fizer initiate_call com unitId = unit.id
  if (user.units.length > 0) {
    const unitId = user.units[0].id;
    const unit = await p.unit.findUnique({
      where: { id: unitId },
      include: { residents: true }
    });
    
    console.log('\n=== SIMULAÇÃO: initiate_call com unitId =', unitId, '===');
    console.log('Residents encontrados pelo backend:', unit.residents.length);
    
    const activeResidents = unit.residents.filter(r => {
      if (!r.trialEndsAt) return true;
      return new Date(r.trialEndsAt) >= new Date();
    });
    console.log('Active residents (licença válida):', activeResidents.length);
    
    activeResidents.forEach(r => {
      console.log('\n  Residente:', r.name, '(', r.email, ')');
      console.log('  doorbellEnabled:', r.doorbellEnabled);
      const shouldRing = r.doorbellEnabled !== false;
      console.log('  shouldRing (doorbellEnabled !== false):', shouldRing);
      console.log('  Backend vai emitir para: user_' + r.id);
      console.log('  Backend vai emitir para: user_' + unitId);
    });
  }
}

main().catch(e => console.error('ERRO:', e.message)).finally(() => p.$disconnect());
