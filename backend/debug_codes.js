const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Busca o usuário e suas unidades/códigos
  const u = await p.user.findFirst({
    where: { email: 'teste1@hotmail.com' },
    include: {
      units: {
        include: {
          visitorCodes: true
        }
      }
    }
  });

  console.log('=== USUÁRIO ===');
  console.log('ID:', u.id);
  console.log('Nome:', u.name);
  console.log('isHouseResident:', u.isHouseResident);
  console.log('isCondoResident:', u.isCondoResident);
  console.log('clientCode:', u.clientCode);

  console.log('\n=== UNIDADES ===');
  for (const unit of u.units) {
    console.log('Unit ID:', unit.id);
    console.log('Unit Name:', unit.name);
    console.log('inviteCode:', unit.inviteCode);
    console.log('visitorCodes:', unit.visitorCodes.map(vc => ({
      code: vc.code,
      visitorName: vc.visitorName,
      expiresAt: vc.expiresAt
    })));
  }

  // Busca o código PRINCIPAL-ELEN-5GI em todas as tabelas possíveis
  console.log('\n=== BUSCA PELO CÓDIGO PRINCIPAL-ELEN-5GI ===');
  
  // No User (clientCode)
  const byClientCode = await p.user.findFirst({ where: { clientCode: { equals: 'PRINCIPAL-ELEN-5GI', mode: 'insensitive' } } });
  console.log('Encontrado como clientCode:', byClientCode ? 'SIM - userId: ' + byClientCode.id : 'NÃO');

  // No Unit (inviteCode)
  const byInviteCode = await p.unit.findFirst({ where: { inviteCode: { equals: 'PRINCIPAL-ELEN-5GI', mode: 'insensitive' } } });
  console.log('Encontrado como inviteCode:', byInviteCode ? 'SIM - unitId: ' + byInviteCode.id : 'NÃO');

  // No VisitorCode
  const byVisitorCode = await p.visitorCode.findFirst({ where: { code: { equals: 'PRINCIPAL-ELEN-5GI', mode: 'insensitive' } } }).catch(() => null);
  console.log('Encontrado como visitorCode:', byVisitorCode ? 'SIM' : 'NÃO');
}

main().catch(e => console.error('ERRO:', e.message)).finally(() => p.$disconnect());
