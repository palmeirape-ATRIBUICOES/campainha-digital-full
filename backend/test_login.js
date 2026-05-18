const prisma = require('./prismaClient.js');

async function test() {
  const code1 = 'b1-1001-analice-imw'; // Lowercase user code
  const code2 = '067033'; // Unit general code

  console.log('--- TEST 1: User Code (Lowercase) ---');
  let user1 = await prisma.user.findFirst({
    where: {
      OR: [
        { clientCode: { equals: code1, mode: 'insensitive' } },
        { plateCode: { equals: code1, mode: 'insensitive' } }
      ]
    },
    include: {
      propertiesManaged: true,
      units: { include: { property: true } }
    }
  });
  console.log('Found user by lowercase code:', user1 ? user1.name : 'Not Found');

  console.log('\n--- TEST 2: Unit General Code ---');
  const unitByInvite = await prisma.unit.findFirst({
    where: { inviteCode: { equals: code2, mode: 'insensitive' } },
    include: {
      property: true,
      residents: {
        include: {
          propertiesManaged: true,
          units: { include: { property: true } }
        }
      }
    }
  });

  if (unitByInvite && unitByInvite.residents.length > 0) {
    const resolvedUser = unitByInvite.residents[0];
    console.log('Successfully resolved unit inviteCode to resident:', resolvedUser.name);
  } else {
    console.log('Unit inviteCode not found or has no residents');
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
