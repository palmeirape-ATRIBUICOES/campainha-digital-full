const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');

const prisma = new PrismaClient();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOL7TRhhhHHze0bnWJY7w3ucZ9JhcxEzycbKQaCCPs2XCed4SVuLxSplr-dqfVeT6nfAmvj7JEvEUbXlnbZUT6U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Cj-7L7Qzqfe3d_AxJ_KRL_wOq4jT2_ZWorgUXZDg8oE';

webpush.setVapidDetails('mailto:admin@campainha.digital', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function run() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Successfully connected to DB.');

  const subs = await prisma.pushSubscription.findMany({
    include: {
      user: true
    }
  });

  console.log(`Found ${subs.length} push subscriptions in the database:`);
  for (const sub of subs) {
    console.log(`- Sub ID: ${sub.id}`);
    console.log(`  User: ${sub.user ? sub.user.name : 'Unknown'} (${sub.userId})`);
    console.log(`  Endpoint: ${sub.endpoint.substring(0, 100)}...`);
    console.log(`  Created At: ${sub.createdAt}`);
  }

  if (subs.length === 0) {
    console.log('No subscriptions found. Cannot send test push.');
    await prisma.$disconnect();
    return;
  }

  console.log('\nSending test push notifications to all endpoints...');
  const payload = JSON.stringify({
    title: '🔔 Teste Diagnóstico!',
    body: 'Este é um teste do terminal local para validar a integridade das chaves VAPID.',
    icon: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/logo.png',
    badge: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/badge.png',
    tag: 'test-diagnostic'
  });

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      console.log(`Sending to sub for user ${sub.user ? sub.user.name : sub.userId}...`);
      const response = await webpush.sendNotification(pushSub, payload);
      console.log(`SUCCESS! Response Status: ${response.statusCode}`);
      console.log(`Headers:`, response.headers);
    } catch (err) {
      console.error(`FAILED! Error Status: ${err.statusCode}`);
      console.error(`Error Body:`, err.body);
      console.error(`Error Message:`, err.message);
    }
  }

  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Unhandled error:', err);
});
