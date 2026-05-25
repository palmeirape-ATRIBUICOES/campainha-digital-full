const prisma = require('./prismaClient.js');

async function check() {
  console.log('=== VISITS DIAGNOSTICS ===');
  
  const visits = await prisma.visitor.findMany({
    orderBy: {
      timestamp: 'desc'
    },
    take: 10,
    include: {
      unit: true,
      property: true
    }
  });

  console.log(`Found ${visits.length} recent visits:`);
  for (const visit of visits) {
    console.log(`- Visit ID: ${visit.id}`);
    console.log(`  Unit: ${visit.unit?.name || 'Unknown'} (${visit.unitId})`);
    console.log(`  Property: ${visit.property?.name || 'Unknown'} (${visit.propertyId})`);
    console.log(`  Caller Name: ${visit.callerName}`);
    console.log(`  Photo length: ${visit.photo ? visit.photo.length : 0} bytes`);
    console.log(`  Timestamp: ${visit.timestamp}`);
    console.log('-----------------------------------');
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
