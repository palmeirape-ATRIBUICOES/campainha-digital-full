const prisma = require('./prismaClient.js');

async function fix() {
  console.log('Updating all users to have doorbellEnabled = true...');
  const result = await prisma.user.updateMany({
    data: {
      doorbellEnabled: true
    }
  });
  console.log(`Updated ${result.count} users successfully!`);
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
