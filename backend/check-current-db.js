const prisma = require('./prismaClient.js');

async function check() {
  console.log('=== DATABASE DIAGNOSTICS ===');
  
  const properties = await prisma.property.findMany({
    include: {
      units: {
        include: {
          residents: true
        }
      }
    }
  });

  console.log(`Found ${properties.length} properties:`);
  for (const prop of properties) {
    console.log(`\nProperty: ${prop.name} (ID: ${prop.id}, Type: ${prop.type}, Plan: ${prop.plan})`);
    console.log(`Geofence Enabled: ${prop.geofenceEnabled}, Lat: ${prop.geofenceLat}, Lng: ${prop.geofenceLng}, Radius: ${prop.geofenceRadius}`);
    console.log(`Units (${prop.units.length}):`);
    for (const unit of prop.units) {
      console.log(`  - Unit: ${unit.name} (ID: ${unit.id}, InviteCode: ${unit.inviteCode})`);
      console.log(`    Residents (${unit.residents.length}):`);
      for (const res of unit.residents) {
        const isTrialExpired = res.trialEndsAt && new Date(res.trialEndsAt) < new Date();
        console.log(`      * Resident: ${res.name} (ID: ${res.id}, Trial Ends: ${res.trialEndsAt || 'Never'}, Expired: ${isTrialExpired})`);
        console.log(`        ClientCode: ${res.clientCode}, PlateCode: ${res.plateCode}, DoorbellEnabled: ${res.doorbellEnabled}`);
      }
    }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    include: {
      user: true
    }
  });
  console.log(`\nFound ${subscriptions.length} Push Subscriptions:`);
  for (const sub of subscriptions) {
    console.log(`- Sub ID: ${sub.id}, User: ${sub.user?.name || 'Unknown'} (${sub.userId}), Endpoint: ${sub.endpoint.substring(0, 80)}...`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
