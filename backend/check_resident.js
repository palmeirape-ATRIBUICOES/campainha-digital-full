const prisma = require('./prismaClient');

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { clientCode: 'B1-1001-ANALICE-IMW' },
          { name: { contains: 'analice', mode: 'insensitive' } }
        ]
      },
      include: {
        units: {
          include: {
            property: true
          }
        }
      }
    });

    console.log('USER DETAILS:', JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
