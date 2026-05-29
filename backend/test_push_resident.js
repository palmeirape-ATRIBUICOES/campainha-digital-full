const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const prisma = new PrismaClient();

// VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOL7TRhhhHHze0bnWJY7w3ucZ9JhcxEzycbKQaCCPs2XCed4SVuLxSplr-dqfVeT6nfAmvj7JEvEUbXlnbZUT6U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Cj-7L7Qzqfe3d_AxJ_KRL_wOq4jT2_ZWorgUXZDg8oE';
webpush.setVapidDetails('mailto:admin@campainha.digital', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function main() {
  console.log('--- TESTANDO ENVIOS DE PUSH DO BANCO ---');
  console.log('Chave Pública VAPID:', VAPID_PUBLIC_KEY);
  console.log('Chave Privada VAPID:', VAPID_PRIVATE_KEY.substring(0, 10) + '...');

  try {
    // Busca o usuário do Thiago ou o morador mais recente
    const user = await prisma.user.findFirst({
      where: {
        pushSubscriptions: {
          some: {}
        }
      },
      include: {
        pushSubscriptions: true
      }
    });

    if (!user) {
      console.warn('Nenhum usuário com assinaturas de push encontrado no banco.');
      return;
    }

    console.log(`Encontrado usuário: ${user.name} (${user.email}) - ID: ${user.id}`);
    console.log(`Assinaturas de push: ${user.pushSubscriptions.length}`);

    for (const sub of user.pushSubscriptions) {
      console.log(`\nTestando Envio para Endpoint: ${sub.endpoint.substring(0, 80)}...`);
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const payload = {
        title: '🔔 Teste de Diagnóstico!',
        body: 'Executando teste profundo de envio push.',
        icon: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/logo.png',
        badge: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/badge.png',
        tag: 'diagnostic-test',
        data: { url: 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/' }
      };

      try {
        const res = await webpush.sendNotification(pushSub, JSON.stringify(payload), {
          TTL: 60,
          urgency: 'high'
        });
        console.log(`✅ SUCESSO! Status: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        console.log('Body:', res.body);
      } catch (err) {
        console.error(`❌ FALHA! Status: ${err.statusCode}`);
        console.error('Mensagem:', err.message);
        console.error('Body do Erro:', err.body);
        console.error('Headers do Erro:', err.headers);
      }
    }
  } catch (err) {
    console.error('Erro crítico no teste:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
