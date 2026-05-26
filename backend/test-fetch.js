const prisma = require('./prismaClient.js');

async function run() {
  const propertyId = '1bfd9923-23e4-4a49-acd4-f02c710be5c8';
  // Let's find a unit in this property
  const units = await prisma.unit.findMany({
    where: { propertyId }
  });
  console.log('Units for property:', units.map(u => ({ id: u.id, name: u.name })));

  if (units.length > 0) {
    const testUnitId = units[0].id;
    console.log(`\nSimulating fetch for propertyId=${propertyId}, unitId=${testUnitId}:`);
    
    const where = { propertyId };
    where.OR = [{ unitId: testUnitId }, { unitId: null }];
    
    const messages = await prisma.vilaMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Fetched ${messages.length} messages:`);
    messages.forEach(m => {
      console.log(`- ID: ${m.id}, unitId: ${m.unitId}, content: "${m.content}"`);
    });
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
