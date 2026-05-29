const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const prisma = new PrismaClient();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOL7TRhhhHHze0bnWJY7w3ucZ9JhcxEzycbKQaCCPs2XCed4SVuLxSplr-dqfVeT6nfAmvj7JEvEUbXlnbZUT6U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Cj-7L7Qzqfe3d_AxJ_KRL_wOq4jT2_ZWorgUXZDg8oE';
webpush.setVapidDetails('mailto:admin@campainha.digital', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function main() {
  console.log('--- DIAGNÓSTICO PUSH PARA ANALICE ---');
  try {
    const user = await prisma.user.findFirst({
      where: { name: { contains: 'analice', mode: 'insensitive' } },
      include: { pushSubscriptions: true }
    });

    if (!user) {
      console.log('Usuário analice não encontrado.');
      return;
    }

    console.log(`Usuário: ${user.name} - ID: ${user.id}`);
    console.log(`Assinaturas encontradas: ${user.pushSubscriptions.length}`);

    for (const sub of user.pushSubscriptions) {
      console.log(`\nDisparando para endpoint: ${sub.endpoint.substring(0, 80)}...`);
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const payload = {
        title: '🔔 Teste Especial!',
        body: 'Teste de fundo para Analice.',
        icon: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/logo.png',
        badge: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/badge.png',
        tag: 'incoming-call',
        data: { url: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/' }
      };

      try {
        const res = await webpush.sendNotification(pushSub, JSON.stringify(payload), {
          TTL: 60,
          urgency: 'high'
        });
        console.log(`✅ SUCESSO! Status: ${res.statusCode}`);
      } catch (err) {
        console.error(`❌ FALHA! Status: ${err.statusCode}`);
        console.error('Mensagem:', err.message);
        console.error('Body do Erro:', err.body);
      }
    }
  } catch (err) {
    console.error('Erro no diagnóstico:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
