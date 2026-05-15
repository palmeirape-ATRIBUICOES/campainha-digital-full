const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campainha.com' },
    update: {},
    create: {
      email: 'admin@campainha.com',
      password: 'admin', // Em produção use hash!
      name: 'Administrador Master',
      isSuperAdmin: true,
      isAdmin: true,
      isResident: true,
      isDoorman: true
    }
  });
  console.log('Admin Master criado/verificado:', admin.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
