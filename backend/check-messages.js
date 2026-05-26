const prisma = require('./prismaClient.js');

async function check() {
  console.log('=== VILA MESSAGES ===');
  const messages = await prisma.vilaMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log(`Found ${messages.length} messages:`);
  for (const msg of messages) {
    console.log(`ID: ${msg.id}`);
    console.log(`  PropertyId: ${msg.propertyId}`);
    console.log(`  SenderId: ${msg.senderId}`);
    console.log(`  SenderName: ${msg.senderName}`);
    console.log(`  UnitId: ${msg.unitId}`);
    console.log(`  IsFromAdmin: ${msg.isFromAdmin}`);
    console.log(`  Content: "${msg.content}"`);
    console.log(`  Read: ${msg.read}`);
    console.log(`  CreatedAt: ${msg.createdAt}`);
    console.log('-----------------------------------');
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
