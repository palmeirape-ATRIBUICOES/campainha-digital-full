const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findFirst({
    where: { email: 'teste1@hotmail.com' },
    include: { units: { include: { property: true } } }
  });

  if (!user) { console.log('NOT FOUND'); return; }
  
  const unit = user.units[0];
  console.log('UNIT_ID:', unit?.id);
  console.log('PROPERTY_ID:', unit?.property?.id);
  console.log('PROPERTY_NAME:', unit?.property?.name);
  
  // Verifica geofence
  const prop = await p.property.findUnique({
    where: { id: unit?.property?.id },
    select: { geofenceEnabled: true, geofenceLat: true, geofenceLng: true, geofenceRadius: true }
  });
  console.log('\nGEOFENCE:', JSON.stringify(prop));
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
