const prisma = require('./prismaClient');

async function main() {
  try {
    const count = await prisma.pushSubscription.count();
    console.log('--- SUBSCRIPTION COUNT ---');
    console.log('Total de assinaturas registradas no banco:', count);
    
    if (count > 0) {
      const sample = await prisma.pushSubscription.findMany({ take: 3 });
      console.log('Amostra de assinaturas (primeiras 3):');
      sample.forEach(s => {
        console.log(`- ID: ${s.id}, UserID: ${s.userId}, Endpoint: ${s.endpoint.substring(0, 50)}...`);
      });
    }
  } catch (err) {
    console.error('Erro ao ler assinaturas:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
