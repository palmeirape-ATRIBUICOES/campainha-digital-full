const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- BUSCANDO ASSINATURAS DE PUSH ---');
  try {
    const subs = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    console.log(`Encontradas ${subs.length} assinatura(s) no banco:`);
    subs.forEach(s => {
      console.log(`ID: ${s.id}`);
      console.log(`Usuário: ${s.user.name} (${s.user.email}) - ID: ${s.userId}`);
      console.log(`Endpoint: ${s.endpoint.substring(0, 100)}...`);
      console.log(`Criado em: ${s.createdAt}`);
      console.log('------------------------------------');
    });
  } catch (err) {
    console.error('Erro ao buscar no banco:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
