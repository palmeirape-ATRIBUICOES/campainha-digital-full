require('dotenv').config();
const express = require('express');
const path = require('path');

// Mercado Pago Access Token centralizado
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-2782203393851760-051715-d99612a87266aa73cb5cc571aa401c2c-126980400';

const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');
const webpush = require('web-push');
const prisma = require('./prismaClient'); // Usando Prisma!

// VAPID keys para Push Notifications
const VAPID_PUBLIC_KEY = 'BOL7TRhhhHHze0bnWJY7w3ucZ9JhcxEzycbKQaCCPs2XCed4SVuLxSplr-dqfVeT6nfAmvj7JEvEUbXlnbZUT6U';
const VAPID_PRIVATE_KEY = 'Cj-7L7Qzqfe3d_AxJ_KRL_wOq4jT2_ZWorgUXZDg8oE';
webpush.setVapidDetails('mailto:admin@campainha.digital', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Debug: Verificação de conexão com o banco de dados
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('[DB] Conectado ao banco de dados com sucesso!');
    // Conta usuários para verificar integridade
    const count = await prisma.user.count();
    console.log(`[DB] ${count} usuário(s) registrado(s) no banco.`);
  } catch (err) {
    console.error('[DB] ERRO ao conectar ao banco de dados:', err.message);
    console.error('[DB] Verifique a variável DATABASE_URL no ambiente.');
  }
}

checkDatabaseConnection();


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Health check endpoint
app.get('/api/ping', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ status: 'ok', database: 'connected', users: count, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ─── Middlewares ─────────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  // Simulação de JWT/Auth por enquanto
  const user = await prisma.user.findFirst({ where: { id: token } });
  if (!user) return res.status(401).json({ error: 'Usuário inválido' });
  req.user = user;
  next();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getPlanPrice = async () => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'plan_price' } });
    if (setting && setting.value) {
      const parsed = parseFloat(setting.value);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (err) {
    console.error('[Settings] Erro ao buscar preco do plano:', err.message);
  }
  return 39.90;
};

const generateAccessCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// Helper: Enviar push para todos os dispositivos de um usuário
const sendPushToUser = async (userId, payload) => {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    const dead = [];
    await Promise.all(subs.map(async (sub) => {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) dead.push(sub.id); // Subscription expirada
      }
    }));
    if (dead.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  } catch (err) {
    console.error('[Push] Erro ao enviar:', err.message);
  }
};

// ─── Push Notification Routes ──────────────────────────────────────────────────

// Retorna a chave pública VAPID para o frontend se inscrever
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Salva a subscription do dispositivo do morador
app.post('/api/push/subscribe', authenticate, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Dados de subscription inválidos.' });
  }
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user.id },
      create: { id: crypto.randomUUID(), userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });
    res.json({ success: true, message: 'Dispositivo registrado para notificações!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar subscription.', details: err.message });
  }
});

// Remove a subscription do dispositivo (quando o morador desativa notificações)
app.delete('/api/push/unsubscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } }).catch(() => {});
  res.json({ success: true });
});

// Rota de TESTE para validar se o push está chegando
app.post('/api/push/test', authenticate, async (req, res) => {
  await sendPushToUser(req.user.id, {
    title: '🔔 Teste de Campainha!',
    body: 'Se você está vendo isso, as notificações push estão funcionando!',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'test-notification',
    data: { url: '/morador/' + req.user.id }
  });
  res.json({ success: true, message: 'Notificação de teste enviada!' });
});

// ─── Auth Routes (Unificadas) ─────────────────────────────────────────────────

// Login Unificado (Para AuthPage)
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Credenciais inválidas.' });
  
  const isEmail = identifier.includes('@');
  const loginId = isEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, '');
  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: loginId } : { phone: loginId },
          { password: password }
        ]
      },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais incorretas.' });
    }

    const property = user.propertiesManaged[0] || (user.units[0] ? user.units[0].property : null);
    const unit = user.units[0];

    res.json({ 
      success: true, 
      token: user.id, 
      user: { 
        id: user.id, 
        name: user.name, 
        isSuperAdmin: user.isSuperAdmin, 
        isAdmin: user.isAdmin, 
        isDoorman: user.isDoorman, 
        isResident: user.isResident, 
        isReseller: user.isReseller,
        isHouseResident: user.isHouseResident,
        isCondoResident: user.isCondoResident,
        unitId: unit?.id,
        unitName: user.name,
        propertyName: property?.name,
        propertyId: property?.id,
        accessCode: user.clientCode || user.plateCode
      } 
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Erro ao processar login.', details: err.message });
  }
});

// Registro Simples (E-mail ou Celular)
app.post('/api/auth/register', async (req, res) => {
  const { name, identifier, password, isHouseResident, isCondoResident, planType } = req.body;
  
  if (!name || !identifier || !password) {
    return res.status(400).json({ error: 'Nome, e-mail/celular e senha são obrigatórios para o cadastro.' });
  }

  const isEmail = identifier.includes('@');
  const cleanIdentifier = isEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, '');
  
  try {
    const existing = await prisma.user.findFirst({
      where: isEmail ? { email: cleanIdentifier } : { phone: cleanIdentifier }
    });

    if (existing) {
      return res.status(400).json({ error: 'Este usuário já está cadastrado.' });
    }

    const durationDays = planType === 'annual' ? 365 : 15;

    const user = await prisma.user.create({
      data: {
        name,
        email: isEmail ? cleanIdentifier : null,
        phone: !isEmail ? cleanIdentifier : null,
        password: password, // TODO: Hash password
        clientCode: generateAccessCode() + generateAccessCode(), // Gera código automaticamente na criação
        isResident: true,
        isHouseResident: !!isHouseResident,
        isCondoResident: !!isCondoResident,
        trialEndsAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      }
    });

    // Se for um morador de CASA ou CONDOMÍNIO individual, cria uma "Propriedade" e "Unidade" individual para ele receber chamadas imediatamente
    if (user.isResident && (user.isHouseResident || user.isCondoResident)) {
      const isHouse = user.isHouseResident;
      const property = await prisma.property.create({
        data: {
          id: crypto.randomUUID(), // Geração manual para garantir sucesso
          name: isHouse ? `Residência de ${user.name}` : `Apartamento de ${user.name}`,
          clientAddress: 'Individual',
          type: isHouse ? 'individual' : 'condo_individual',
          adminId: user.id,
          nextPaymentAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        }
      });
      await prisma.unit.create({
        data: {
          id: crypto.randomUUID(), // Geração manual para garantir sucesso
          name: 'Principal',
          propertyId: property.id,
          residents: { connect: { id: user.id } }
        }
      });
    }

    // Mercado Pago Preference Creation (Only for Annual Plan)
    let initPoint = null;
    if (planType === 'annual') {
      try {
        const activePrice = await getPlanPrice();
        const mpAccessToken = MERCADOPAGO_ACCESS_TOKEN;
        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: [
              {
                title: 'Campainha Digital - Plano Anual Premium',
                quantity: 1,
                unit_price: activePrice,
                currency_id: 'BRL'
              }
            ],
            back_urls: {
              success: (req.headers.referer && !req.headers.referer.includes('localhost') && !req.headers.referer.includes('127.0.0.1')) ? req.headers.referer.split('#')[0].split('?')[0] : 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/',
              failure: (req.headers.referer && !req.headers.referer.includes('localhost') && !req.headers.referer.includes('127.0.0.1')) ? req.headers.referer.split('#')[0].split('?')[0] : 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/',
              pending: (req.headers.referer && !req.headers.referer.includes('localhost') && !req.headers.referer.includes('127.0.0.1')) ? req.headers.referer.split('#')[0].split('?')[0] : 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/'
            },
            auto_return: 'approved',
            external_reference: user.id
          })
        });
        
        if (mpResponse.ok) {
          const mpData = await mpResponse.json();
          initPoint = mpData.init_point;
          console.log('[MP] Preferência criada com sucesso:', initPoint);
        } else {
          console.error('[MP] Erro ao criar preferência:', await mpResponse.text());
        }
      } catch (err) {
        console.error('[MP] Exceção ao integrar com Mercado Pago:', err);
      }
    }

    // Reload user with relations to return all info
    const reloadedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    const finalProperty = reloadedUser.propertiesManaged[0] || (reloadedUser.units[0] ? reloadedUser.units[0].property : null);
    const finalUnit = reloadedUser.units[0];

    res.status(201).json({ 
      success: true, 
      token: user.id, 
      initPoint,
      user: { 
        id: user.id, 
        name: user.name, 
        role: 'resident',
        isSuperAdmin: user.isSuperAdmin,
        isAdmin: user.isAdmin,
        isDoorman: user.isDoorman,
        isResident: user.isResident,
        isReseller: user.isReseller,
        isHouseResident: user.isHouseResident,
        isCondoResident: user.isCondoResident,
        unitId: finalUnit?.id,
        unitName: user.name,
        propertyName: finalProperty?.name,
        propertyId: finalProperty?.id,
        accessCode: user.clientCode || user.plateCode
      } 
    });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    res.status(500).json({ error: 'Erro ao criar conta.', details: err.message });
  }
});

// Confirmar pagamento Mercado Pago (ativar conta anual)
app.post('/api/payment/confirm', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'ID do usuário é obrigatório.' });

  try {
    // Estende a validade do plano anual
    await prisma.user.update({
      where: { id: userId },
      data: {
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    const userProp = await prisma.property.findFirst({ where: { adminId: userId } });
    if (userProp) {
      await prisma.property.update({
        where: { id: userProp.id },
        data: {
          nextPaymentAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
    }

    res.json({ success: true, message: 'Pagamento confirmado e conta ativada por 365 dias!' });
  } catch (err) {
    console.error('[MP] Erro ao confirmar:', err);
    res.status(500).json({ error: 'Erro ao confirmar ativação do pagamento.' });
  }
});

// Webhook do Mercado Pago (Notificações automáticas de pagamento)
app.post('/api/payment/webhook', async (req, res) => {
  const { action, type, data } = req.body;
  const topic = req.query.topic || type;
  const paymentId = (data && data.id) || req.query.id;

  if (topic === 'payment' || action === 'payment.updated') {
    try {
      const mpAccessToken = MERCADOPAGO_ACCESS_TOKEN;
      
      // Busca detalhes do pagamento na API do Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      });

      if (mpRes.ok) {
        const paymentDetails = await mpRes.json();
        
        // Verifica se o pagamento foi aprovado
        if (paymentDetails.status === 'approved') {
          const userId = paymentDetails.external_reference;
          
          if (userId) {
            console.log(`[Webhook MP] Ativando conta para usuário: ${userId} - Pagamento: ${paymentId}`);
            
            // Estende a validade do plano anual
            await prisma.user.update({
              where: { id: userId },
              data: {
                trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              }
            });

            const userProp = await prisma.property.findFirst({ where: { adminId: userId } });
            if (userProp) {
              await prisma.property.update({
                where: { id: userProp.id },
                data: {
                  nextPaymentAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
              });
            }
            
            console.log(`[Webhook MP] Conta ativada com sucesso!`);
          }
        }
      }
    } catch (err) {
      console.error('[Webhook MP] Erro ao processar:', err);
    }
  }

  // Sempre retorna 200/201 OK para o Mercado Pago
  res.status(200).send('OK');
});

// ─── Rota dedicada para gerar pagamento PIX (sem SDK externo) ────────────────
app.post('/api/payment/pix', async (req, res) => {
  try {
    const mpAccessToken = MERCADOPAGO_ACCESS_TOKEN;
    const { email, userId, cpf } = req.body;
    const activePrice = await getPlanPrice();

    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

    // Busca o nome do usuário no banco para enviar ao Mercado Pago
    let firstName = 'Cliente';
    let lastName = 'Campainha';
    
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        if (user && user.name) {
          const parts = user.name.trim().split(/\s+/);
          firstName = parts[0] || 'Cliente';
          lastName = parts.slice(1).join(' ') || 'Digital';
        }
      } catch (e) {
        console.log('[MP PIX] Não conseguiu buscar nome do usuário:', e.message);
      }
    }

    const mpPayload = {
      transaction_amount: activePrice,
      description: 'Campainha Digital - Plano Anual Premium',
      payment_method_id: 'pix',
      payer: {
        email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cpf || '12345678909' // CPF de teste válido (se não informado)
        }
      },
      external_reference: userId || 'unknown'
    };

    console.log('[MP PIX] Gerando pagamento PIX para:', email, '| Nome:', firstName, lastName, '| Valor:', activePrice);

    let data;
    try {
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix-${userId || 'anon'}-${Date.now()}`
        },
        body: JSON.stringify(mpPayload)
      });
      data = await mpResponse.json();

      if (!mpResponse.ok) {
        throw new Error(data.cause?.[0]?.description || data.message || 'Erro na API do Mercado Pago');
      }

      console.log('[MP PIX] PIX gerado com sucesso! ID:', data.id, '| Status:', data.status);

      return res.json({
        id: data.id,
        status: data.status,
        qr_code: data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        is_mock: false
      });
    } catch (mpError) {
      console.error('[MP PIX] API do Mercado Pago falhou ao gerar PIX:', mpError.message);
      return res.status(500).json({ error: 'Erro de conexão com o Mercado Pago ao gerar Pix. Por favor, tente novamente.' });
    }
  } catch (err) {
    console.error('[MP PIX] Erro interno:', err);
    res.status(500).json({ error: 'Erro de conexão com Mercado Pago.' });
  }
});

// Processamento Transparente de Pagamento (Usado pelo MP Bricks e fallback PIX)
app.post('/api/payment/process', async (req, res) => {
  try {
    const mpAccessToken = MERCADOPAGO_ACCESS_TOKEN;
    const paymentData = req.body;
    const activePrice = await getPlanPrice();
    
    // Busca nome do usuário no banco se for PIX e não tiver first_name
    let firstName = 'Cliente';
    let lastName = 'Digital';
    
    if (paymentData.external_reference && paymentData.payment_method_id === 'pix') {
      try {
        const user = await prisma.user.findUnique({ where: { id: paymentData.external_reference }, select: { name: true } });
        if (user && user.name) {
          const parts = user.name.trim().split(/\s+/);
          firstName = parts[0] || 'Cliente';
          lastName = parts.slice(1).join(' ') || 'Digital';
        }
      } catch (e) { /* ignora */ }
    }

    // Configura os dados obrigatórios do Mercado Pago
    const mpPayload = {
      transaction_amount: activePrice, // Valor dinâmico do plano anual
      description: 'Campainha Digital - Plano Anual Premium',
      payment_method_id: paymentData.payment_method_id,
      payer: {
        email: paymentData.payer?.email || 'cliente@campainhadigital.com',
        first_name: paymentData.payer?.first_name || firstName,
        last_name: paymentData.payer?.last_name || lastName,
        identification: paymentData.payer?.identification || { type: 'CPF', number: '12345678909' }
      },
      external_reference: paymentData.external_reference // ID do usuário
    };

    // Adiciona campos específicos para cartão de crédito
    if (paymentData.token) mpPayload.token = paymentData.token;
    if (paymentData.installments) mpPayload.installments = paymentData.installments;
    if (paymentData.issuer_id) mpPayload.issuer_id = paymentData.issuer_id;

    console.log('[MP] Processando pagamento interno:', mpPayload.payment_method_id, '| Payer:', mpPayload.payer.email);

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': Date.now().toString() // Previne pagamentos duplicados
      },
      body: JSON.stringify(mpPayload)
    });

    const data = await mpResponse.json();

    if (mpResponse.ok) {
      console.log('[MP] Pagamento criado com sucesso! ID:', data.id, '| Status:', data.status);
      res.json({
        id: data.id,
        status: data.status,
        status_detail: data.status_detail,
        qr_code: data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: data.transaction_details?.external_resource_url
      });
    } else {
      console.error('[MP] Erro da API MP:', JSON.stringify(data, null, 2));
      const cause = data.cause?.[0]?.description || data.message || 'Erro ao processar pagamento.';
      res.status(400).json({ error: cause, details: data });
    }
  } catch (err) {
    console.error('[MP] Erro interno:', err);
    res.status(500).json({ error: 'Erro de conexão com Mercado Pago.' });
  }
});

// Criar preferência de pagamento de upgrade do Mercado Pago para usuário logado
app.post('/api/payment/upgrade-preference', authenticate, async (req, res) => {
  try {
    const mpAccessToken = MERCADOPAGO_ACCESS_TOKEN;
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            title: 'Campainha Digital - Plano Anual Premium',
            quantity: 1,
            unit_price: 39.90,
            currency_id: 'BRL'
          }
        ],
        back_urls: {
          success: (req.headers.referer && !req.headers.referer.includes('localhost') && !req.headers.referer.includes('127.0.0.1')) ? req.headers.referer.split('#')[0].split('?')[0] : 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/',
          failure: (req.headers.referer && !req.headers.referer.includes('localhost') && !req.headers.referer.includes('127.0.0.1')) ? req.headers.referer.split('#')[0].split('?')[0] : 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/',
          pending: (req.headers.referer && !req.headers.referer.includes('localhost') && !req.headers.referer.includes('127.0.0.1')) ? req.headers.referer.split('#')[0].split('?')[0] : 'https://palmeirape-atribuicoes.github.io/campainha-digital-full/'
        },
        auto_return: 'approved',
        external_reference: req.user.id
      })
    });

    if (mpResponse.ok) {
      const data = await mpResponse.json();
      res.json({ initPoint: data.init_point });
    } else {
      const errData = await mpResponse.json();
      res.status(500).json({ error: 'Erro ao gerar preferência do Mercado Pago.', details: errData });
    }
  } catch (err) {
    console.error('[MP] Erro ao criar preferência de upgrade:', err);
    res.status(500).json({ error: 'Erro de conexão com Mercado Pago.' });
  }
});

// Login por Código (Para Moradores e Síndicos via Código Único)
app.post('/api/resident/login-by-code', async (req, res) => {
  const { accessCode } = req.body;
  try {
    // Busca usuário pelo clientCode (Código Único) ou plateCode (Placa)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { clientCode: accessCode },
          { plateCode: accessCode }
        ]
      },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    if (!user) return res.status(401).json({ error: 'Código inválido.' });

    const property = user.propertiesManaged[0] || (user.units[0] ? user.units[0].property : null);
    const unit = user.units[0];

    res.json({
      role: user.isAdmin ? 'admin' : (user.isDoorman ? 'doorman' : 'resident'),
      token: user.id,
      userId: user.id,
      propertyId: property?.id,
      propertyName: property?.name,
      unitId: unit?.id,
      unitName: user.name,
      accessCode: user.clientCode || user.plateCode,
      clientCode: user.clientCode,
      adminEmail: user.email,
      isHouseResident: user.isHouseResident,
      isCondoResident: user.isCondoResident
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.', details: err.message });
  }
});

// Login por E-mail/Senha/Celular (Para Moradores)
app.post('/api/resident/login', async (req, res) => {
  const { email, identifier, accessCode } = req.body; // accessCode aqui é usado como senha
  const rawId = identifier || email || '';
  const isEmail = rawId.includes('@');
  const loginId = isEmail ? rawId.toLowerCase() : rawId.replace(/\D/g, '');
  
  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: loginId } : { phone: loginId },
          { password: accessCode }
        ]
      },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    if (!user) return res.status(401).json({ error: 'Credenciais incorretas.' });

    const property = user.propertiesManaged[0] || (user.units[0] ? user.units[0].property : null);
    const unit = user.units[0];

    res.json({
      role: user.isAdmin ? 'admin' : 'resident',
      token: user.id,
      userId: user.id,
      propertyId: property?.id,
      propertyName: property?.name,
      unitId: unit?.id,
      unitName: user.name,
      accessCode: user.clientCode || user.plateCode,
      clientCode: user.clientCode,
      adminEmail: user.email,
      isHouseResident: user.isHouseResident,
      isCondoResident: user.isCondoResident
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.', details: err.message });
  }
});


// Recuperação de Senha - Solicitar
app.post('/api/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  const isEmail = identifier.includes('@');
  
  try {
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Gera um código de 6 dígitos para recuperação
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 3600000); // 1 hora de validade

    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryToken: token, recoveryTokenExp: expiry }
    });

    res.json({ success: true, message: 'Código de recuperação gerado.', debug_token: token });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});

// Recuperação de Senha - Redefinir
app.post('/api/auth/reset-password', async (req, res) => {
  const { identifier, token, newPassword } = req.body;
  const isEmail = identifier.includes('@');

  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          isEmail ? { email: identifier.toLowerCase() } : { phone: identifier },
          { recoveryToken: token },
          { recoveryTokenExp: { gt: new Date() } }
        ]
      }
    });

    if (!user) return res.status(400).json({ error: 'Código inválido ou expirado.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: newPassword, // TODO: Hash
        recoveryToken: null,
        recoveryTokenExp: null
      }
    });

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

// Login Unificado is handled above in server.js



// ─── Super Admin (Master) Routes ──────────────────────────────────────────────

// Listar todos os usuários para o Super Admin
app.get('/api/master/users', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { propertiesManaged: true }
  });
  res.json(users);
});

// Ativar/Desativar módulos de um usuário
app.post('/api/master/users/:id/modules', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { isAdmin, isDoorman, isResident, isSuperAdmin, isReseller, isHouseResident, isCondoResident } = req.body;
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin, isDoorman, isResident, isSuperAdmin, isReseller, isHouseResident, isCondoResident }
  });
  
  res.json(updated);
});

// Dar 1 mês grátis (promoção)
app.post('/api/master/users/:id/promo', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  const currentEnd = user.trialEndsAt || new Date();
  const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { trialEndsAt: newEnd, promoActive: true }
  });
  
  res.json(updated);
});

// Excluir usuário (Super Admin)
app.delete('/api/master/users/:id', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário.', details: err.message });
  }
});

// Editar usuário (Super Admin)
app.put('/api/master/users/:id', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { name, email, phone, password } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        password
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar usuário.', details: err.message });
  }
});

// ─── Configurações de Usuário (Horários, etc) ────────────────────────────────

app.get('/api/user/settings', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        email: true,
        phone: true,
        doorbellEnabled: true,
        quietModeStart: true,
        quietModeEnd: true,
        clientCode: true,
        plateCode: true,
        trialEndsAt: true,
        propertiesManaged: { select: { id: true, name: true } },
        units: { select: { id: true, name: true, propertyId: true, property: { select: { name: true } } } }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
    }

    // Obtém o propertyId sendo o usuário admin da propriedade ou morador de uma unidade
    const propertyId = user.propertiesManaged?.[0]?.id || user.units?.[0]?.propertyId;
    const propertyName = user.propertiesManaged?.[0]?.name || user.units?.[0]?.name || '';
    
    res.json({ ...user, propertyId, propertyName });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Erro ao carregar configs' });
  }
});


app.put('/api/user/settings', authenticate, async (req, res) => {
  try {
    const { doorbellEnabled, quietModeStart, quietModeEnd, generateClientCode, propertyName } = req.body;
    
    let data = { doorbellEnabled, quietModeStart, quietModeEnd };
    
    if (generateClientCode) {
      data.clientCode = generateAccessCode() + generateAccessCode();
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { propertiesManaged: true }
    });
    
    // Atualiza o nome da residência se o usuário for o dono (admin da propriedade)
    if (propertyName && updated.propertiesManaged.length > 0) {
      await prisma.property.update({
        where: { id: updated.propertiesManaged[0].id },
        data: { name: propertyName }
      });
    } else if (propertyName) {
      // Se for um morador comum, busca a primeira unidade vinculada a ele e atualiza o nome da unidade
      const userWithUnits = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { units: true }
      });
      if (userWithUnits.units && userWithUnits.units.length > 0) {
        await prisma.unit.update({
          where: { id: userWithUnits.units[0].id },
          data: { name: propertyName }
        });
      }
    }
    
    res.json(updated);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Erro ao atualizar configurações. Talvez o usuário não exista mais.' });
  }
});


// ─── Propriedades e Unidades (Adaptado) ──────────────────────────────────────

// Registro de Propriedade (Não obrigatório QR Code na hora)
app.post('/api/properties', async (req, res) => {
  const { name, type, id, clientName, units, adminEmail } = req.body;
  
  try {
    const finalId = id || uuidv4();
    let adminId = null;

    // Se estiver autenticado via token na request
    if (req.headers.authorization) {
      const user = await prisma.user.findFirst({ where: { id: req.headers.authorization } });
      if (user) adminId = user.id;
    }

    // Se não tiver adminId mas tiver adminEmail (do onboarding)
    if (!adminId && adminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (user) adminId = user.id;
    }

    if (!adminId) {
      return res.status(401).json({ error: 'Sessão administrativa inválida. Faça login novamente.' });
    }

    // Cria a propriedade de forma limpa
    const property = await prisma.property.create({
      data: {
        id: finalId,
        name,
        type: type === 'individual' ? 'individual' : 'collective',
        clientName: clientName || '',
        adminId,
        nextPaymentAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias de teste
      }
    });

    // Se tiver unidades especificadas, cria as unidades
    if (Array.isArray(units) && units.length > 0) {
      await Promise.all(units.map(async (u) => {
        const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        await prisma.unit.create({
          data: {
            id: crypto.randomUUID(),
            propertyId: finalId,
            name: u.name,
            block: u.block || null,
            street: u.street || null,
            number: u.number || null,
            inviteCode
          }
        });
      }));
    }

    res.status(201).json(property);
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Erro ao criar/ativar propriedade.', details: err.message });
  }
});

// Buscar dados de uma Propriedade para o Visitante (Acesso Público)
app.get('/api/properties/:id', async (req, res) => {
  try {
    const idParam = req.params.id;
    let code = idParam;
    if (idParam.startsWith('CAMPAINHA:')) code = idParam.split(':')[1];

    let property = await prisma.property.findUnique({
      where: { id: idParam },
      include: {
        units: { select: { id: true, name: true } }
      }
    });

    if (!property) {
      const user = await prisma.user.findFirst({
        where: { OR: [{ clientCode: code }, { plateCode: code }] },
        include: {
          propertiesManaged: { include: { units: { select: { id: true, name: true } } } },
          units: { include: { property: { include: { units: { select: { id: true, name: true } } } } } }
        }
      });
      if (user) {
        property = user.propertiesManaged?.[0] || user.units?.[0]?.property;
      }
    }

    if (!property) return res.status(404).json({ error: 'Propriedade não encontrada' });

    res.json(property);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar propriedade' });
  }
});

// Histórico de Visitantes por UnitId (ID da unidade no banco)
app.get('/api/visitors/:unitId', async (req, res) => {
  try {
    const visitors = await prisma.visitor.findMany({
      where: { unitId: req.params.unitId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar visitantes.' });
  }
});

// Histórico de Visitantes por UserId (ID do usuário logado)
app.get('/api/visitors/by-user/:userId', async (req, res) => {
  try {
    // Busca a unidade vinculada ao usuário
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { units: { include: { visitors: { orderBy: { timestamp: 'desc' }, take: 100 } } } }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    
    // Junta visitantes de todas as unidades do usuário
    const visitors = user.units
      .flatMap(u => u.visitors.map(v => ({ ...v, unitName: u.name })))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico.', details: err.message });
  }
});

// ─── Propriedades / Unidades APIs ─────────────────────────────────────────────

// Buscar todas as propriedades de um administrador (por e-mail)
app.get('/api/properties', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'E-mail do administrador é obrigatório.' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        propertiesManaged: {
          include: {
            units: {
              orderBy: { name: 'asc' },
              include: {
                residents: true
              }
            }
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'Administrador não encontrado.' });

    // Injeta a url e qrCodeUrl dinamicamente para o frontend ler perfeitamente
    let frontendUrl = process.env.FRONTEND_URL || 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
    
    // Corrige automaticamente se o FRONTEND_URL de produção foi configurado sem o subdiretório do GitHub Pages
    if (frontendUrl.includes('palmeirape-atribuicoes.github.io') && !frontendUrl.includes('campainha-digital-full')) {
      frontendUrl = 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
    }

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    const propsWithUrls = user.propertiesManaged.map(p => {
      const url = `${frontendUrl}/#/chamada/${p.id}`;

      // Transforma cada unit.inviteCode em accessCode para compatibilidade com o frontend
      const unitsWithAccess = p.units.map(u => ({
        ...u,
        accessCode: u.inviteCode
      }));
      return {
        ...p,
        url,
        qrCodeUrl: `${backendUrl}/api/qrcode?text=${encodeURIComponent(url)}`,
        units: unitsWithAccess
      };
    });

    res.json(propsWithUrls);
  } catch (err) {
    console.error('Fetch properties managed error:', err);
    res.status(500).json({ error: 'Erro ao buscar propriedades.' });
  }
});

// Deletar propriedade
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.property.delete({ where: { id } });
    res.json({ success: true, message: 'Propriedade excluída com sucesso.' });
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Erro ao excluir propriedade.' });
  }
});

// Buscar unidades de uma propriedade
app.get('/api/properties/:propertyId/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({
      where: { propertyId: req.params.propertyId },
      orderBy: { name: 'asc' },
      include: { residents: true }
    });
    // Injeta accessCode como o inviteCode
    const mapped = units.map(u => ({
      ...u,
      accessCode: u.inviteCode
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar unidades.' });
  }
});

// Adicionar unidade
app.post('/api/properties/:propertyId/units', async (req, res) => {
  try {
    const { name, block, street, number } = req.body;
    const { propertyId } = req.params;

    if (!name) return res.status(400).json({ error: 'Nome da unidade é obrigatório.' });

    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const unit = await prisma.unit.create({
      data: {
        id: crypto.randomUUID(),
        propertyId,
        name,
        block: block || null,
        street: street || null,
        number: number || null,
        inviteCode
      }
    });

    res.status(201).json({ ...unit, accessCode: inviteCode });
  } catch (err) {
    console.error('Create unit error:', err);
    res.status(500).json({ error: 'Erro ao criar unidade.' });
  }
});

// Editar unidade
app.put('/api/properties/:propertyId/units/:unitId', async (req, res) => {
  try {
    const { name, block, street, number } = req.body;
    const updated = await prisma.unit.update({
      where: { id: req.params.unitId },
      data: {
        name,
        block: block || null,
        street: street || null,
        number: number || null
      }
    });
    res.json({ ...updated, accessCode: updated.inviteCode });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar unidade.' });
  }
});

// Excluir unidade
app.delete('/api/properties/:propertyId/units/:unitId', async (req, res) => {
  try {
    await prisma.unit.delete({ where: { id: req.params.unitId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir unidade.' });
  }
});

// Buscar visitantes de uma propriedade (Histórico do Painel)
app.get('/api/visitors/property/:propertyId', async (req, res) => {
  try {
    const visitors = await prisma.visitor.findMany({
      where: { propertyId: req.params.propertyId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico de visitantes da propriedade.' });
  }
});


// ─── Caixa Postal (Fale com a Administração) ─────────────────────────────────

// Enviar mensagem de unidade à administração
app.post('/api/properties/:propertyId/mailbox', async (req, res) => {
  try {
    const { unitId, subject, body } = req.body;
    const { propertyId } = req.params;

    if (!unitId || !subject || !body) {
      return res.status(400).json({ error: 'Dados incompletos para envio da mensagem.' });
    }

    const message = await prisma.mailboxMessage.create({
      data: {
        id: crypto.randomUUID(),
        propertyId,
        unitId,
        subject,
        body
      }
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Mailbox message creation error:', err);
    res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
});

// Buscar todas as mensagens da Caixa Postal da administração
app.get('/api/properties/:propertyId/mailbox', async (req, res) => {
  try {
    const messages = await prisma.mailboxMessage.findMany({
      where: { propertyId: req.params.propertyId },
      include: { unit: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar caixa postal.' });
  }
});

// Atualizar status de mensagem da Caixa Postal (Ex: Resolvido)
app.put('/api/properties/:propertyId/mailbox/:msgId', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.mailboxMessage.update({
      where: { id: req.params.msgId },
      data: { status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar mensagem.' });
  }
});


// ─── Alertas Visuais de Unidade (Flashing Mini Blocks) ───────────────────────

// Criar Alerta de Unidade (ex: solicitação de liberação, encomenda, etc)
app.post('/api/properties/:propertyId/alerts', async (req, res) => {
  try {
    const { unitId, type, title, description } = req.body;
    const { propertyId } = req.params;

    if (!unitId || !title) {
      return res.status(400).json({ error: 'Unidade e título do alerta são obrigatórios.' });
    }

    const alert = await prisma.unitAlert.create({
      data: {
        id: crypto.randomUUID(),
        propertyId,
        unitId,
        type: type || 'alert',
        title,
        description: description || ''
      }
    });

    // Avisa via Socket.io em tempo real para piscar o bloco correspondente no painel do porteiro
    io.emit('new_unit_alert', { propertyId, unitId, alert });

    res.status(201).json(alert);
  } catch (err) {
    console.error('UnitAlert error:', err);
    res.status(500).json({ error: 'Erro ao disparar alerta.' });
  }
});

// Buscar todos os alertas ativos do condomínio
app.get('/api/properties/:propertyId/alerts', async (req, res) => {
  try {
    const alerts = await prisma.unitAlert.findMany({
      where: { propertyId: req.params.propertyId, active: true },
      include: { unit: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar alertas.' });
  }
});

// Limpar/Resolver Alerta
app.delete('/api/properties/:propertyId/alerts/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const updated = await prisma.unitAlert.update({
      where: { id: alertId },
      data: { active: false }
    });
    io.emit('clear_unit_alert', { propertyId: req.params.propertyId, unitId: updated.unitId, alertId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao limpar alerta.' });
  }
});


// ─── Comunicação Interna (Condômino-a-Condômino) ─────────────────────────────

// Solicitar conexão entre unidades
app.post('/api/units/:unitId/connections', async (req, res) => {
  try {
    const { targetUnitId, propertyId } = req.body;
    const { unitId } = req.params;

    if (!targetUnitId || !propertyId) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    // Evita duplicados
    const existing = await prisma.internalConnection.findFirst({
      where: {
        propertyId,
        OR: [
          { senderUnitId: unitId, receiverUnitId: targetUnitId },
          { senderUnitId: targetUnitId, receiverUnitId: unitId }
        ]
      }
    });

    if (existing) {
      return res.json(existing);
    }

    const conn = await prisma.internalConnection.create({
      data: {
        id: crypto.randomUUID(),
        propertyId,
        senderUnitId: unitId,
        receiverUnitId: targetUnitId
      }
    });

    res.status(201).json(conn);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar solicitação de conversa.' });
  }
});

// Listar conexões da unidade
app.get('/api/units/:unitId/connections', async (req, res) => {
  try {
    const { unitId } = req.params;
    const connections = await prisma.internalConnection.findMany({
      where: {
        OR: [
          { senderUnitId: unitId },
          { receiverUnitId: unitId }
        ]
      },
      include: {
        senderUnit: true,
        receiverUnit: true
      }
    });
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar conversas.' });
  }
});

// Aceitar/Bloquear conexão
app.put('/api/units/:unitId/connections/:connId', async (req, res) => {
  try {
    const { status } = req.body; // 'connected' | 'blocked'
    const updated = await prisma.internalConnection.update({
      where: { id: req.params.connId },
      data: { status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status.' });
  }
});

// Enviar mensagem de chat interno
app.post('/api/units/:unitId/connections/:connId/messages', async (req, res) => {
  try {
    const { body } = req.body;
    const { connId, unitId } = req.params;

    const message = await prisma.internalMessage.create({
      data: {
        id: crypto.randomUUID(),
        connectionId: connId,
        senderUnitId: unitId,
        body
      }
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
});

// Buscar mensagens do chat
app.get('/api/units/:unitId/connections/:connId/messages', async (req, res) => {
  try {
    const messages = await prisma.internalMessage.findMany({
      where: { connectionId: req.params.connId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar mensagens.' });
  }
});


// ─── Integração eWelink / Sonoff Mock ────────────────────────────────────────

// Trigger para abertura de portão
app.post('/api/units/:unitId/open-gate', async (req, res) => {
  try {
    const { unitId } = req.params;
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { property: true }
    });

    if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

    console.log(`[Sonoff / eWelink] COMANDO ABRIR PORTÃO RECEBIDO PARA A UNIDADE: ${unit.name} no condomínio ${unit.property.name}`);

    // Avisa em tempo real via Socket.io para o painel de gerenciamento registrar a abertura
    io.emit('gate_opened', { unitId, unitName: unit.name, propertyId: unit.propertyId, timestamp: new Date() });

    res.json({ success: true, message: 'Comando Sonoff disparado com sucesso! Portão liberado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao disparar acionamento do portão.' });
  }
});

// ─── QR Code & Código de Cliente ─────────────────────────────────────────────

// Gerar/resetar o código único de cliente (Opção 2 - cliente gera o próprio QR)
app.post('/api/master/users/:id/generate-client-code', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const code = generateAccessCode() + generateAccessCode(); // Ex: A3F9C2B1
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { clientCode: code }
    });
    const prop = await prisma.property.findFirst({ where: { adminId: req.params.id } });
    res.json({ clientCode: updated.clientCode, propertyId: prop?.id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar código.' });
  }
});

// Definir código de placa pré-configurada (Opção 1 - placa entregue pronta)
app.post('/api/master/users/:id/set-plate-code', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { plateCode } = req.body;
  if (!plateCode) return res.status(400).json({ error: 'Código da placa é obrigatório.' });

  // Verifica se o código de placa já está em uso por outro usuário
  const existing = await prisma.user.findFirst({ where: { plateCode, NOT: { id: req.params.id } } });
  if (existing) return res.status(400).json({ error: 'Este código de placa já está em uso.' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { plateCode }
  });
});

// ─── System Settings Routes ──────────────────────────────────────────────────
// Retorna configurações do sistema (público para o frontend de cadastro poder ler)
app.get('/api/settings', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'plan_price' } });
    res.json({ plan_price: setting?.value || '39.90' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter configurações.' });
  }
});

// Atualiza uma configuração do sistema (apenas Master Admin)
app.post('/api/settings', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });

  try {
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configuração.' });
  }
});

// Gerar imagem de QR Code (retorna imagem PNG diretamente ou JSON se solicitado)
app.get('/api/qrcode', async (req, res) => {
  const { text, json } = req.query;
  if (!text) return res.status(400).json({ error: 'Texto para QR code é obrigatório.' });
  try {
    const wantsJson = json === 'true' || (req.headers.accept && req.headers.accept.includes('application/json'));
    
    if (wantsJson) {
      const qr = await QRCode.toDataURL(text, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
      return res.json({ qrcode: qr });
    } else {
      const qrBuffer = await QRCode.toBuffer(text, { width: 400, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
      res.setHeader('Content-Type', 'image/png');
      return res.send(qrBuffer);
    }
  } catch (err) {
    console.error('[QRCode] Erro ao gerar:', err);
    res.status(500).json({ error: 'Erro ao gerar QR Code.' });
  }
});

// Escanear placa: ao cadastrar ou logar, o usuário escaneia a placa para vinculá-la à sua conta
app.post('/api/auth/scan-plate', async (req, res) => {
  const { plateCode, userId } = req.body;
  if (!plateCode || !userId) return res.status(400).json({ error: 'Dados incompletos.' });

  // Verifica se a placa já pertence a outro usuário
  const plateOwner = await prisma.user.findFirst({ where: { plateCode } });
  
  if (plateOwner && plateOwner.id !== userId) {
    return res.status(400).json({ error: 'Esta placa física já está vinculada a outra conta.' });
  }

  // Vincula a placa ao usuário atual (mantendo seu clientCode intacto)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { plateCode }
  });
  
  res.json({ success: true, plateCode: updated.plateCode, message: 'Placa vinculada com sucesso!' });
});



// ─── Socket.io Logic ─────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('[WS] conectado:', socket.id);

  socket.on('register_user', ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log(`[WS] Usuário ${userId} registrado no socket ${socket.id}`);
  });

  socket.on('initiate_call', async ({ unitId, propertyId, photoBase64, callerName }) => {
    // Busca os moradores da unidade
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { residents: true }
    });

    if (!unit) return;

    // Filtra moradores que ainda possuem a assinatura ativa
    const activeResidents = unit.residents.filter(resident => {
      if (!resident.trialEndsAt) return true; // Conta vitalícia (legada/super admin)
      return new Date(resident.trialEndsAt) >= new Date();
    });

    if (activeResidents.length === 0) {
      console.log(`[WS Call] Chamada recusada! Unidade ${unit.name} com licença expirada.`);
      socket.emit('call_failed', { reason: 'license_expired', message: 'A campainha digital desta residência está inativa. O período de teste expirou.' });
      return;
    }

    try {
      const visit = await prisma.visitor.create({
        data: {
          unitId,
          propertyId,
          photo: photoBase64,
          callerName: callerName || 'Visitante'
        }
      });

      // Notifica todos os moradores da unidade
      unit.residents.forEach(resident => {
        // Verifica se está no horário de silêncio
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        let shouldRing = resident.doorbellEnabled;
        if (resident.quietModeStart && resident.quietModeEnd) {
          if (resident.quietModeStart < resident.quietModeEnd) {
            if (currentTime >= resident.quietModeStart && currentTime <= resident.quietModeEnd) shouldRing = false;
          } else {
            // Caso passe da meia-noite (ex: 22:00 as 07:00)
            if (currentTime >= resident.quietModeStart || currentTime <= resident.quietModeEnd) shouldRing = false;
          }
        }

        if (shouldRing) {
          io.to(`user_${resident.id}`).emit('incoming_call', {
            visitorSocketId: socket.id,
            photo: photoBase64,
            callerName: callerName || 'Visitante',
            timestamp: visit.timestamp,
            visitId: visit.id,
            propertyId
          });

          // 🔔 Push Notification: Acorda o app mesmo fechado
          const baseUrl = 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
          sendPushToUser(resident.id, {
            title: '🔔 Alguém na sua porta!',
            body: `${callerName || 'Visitante'} está chamando. Toque para atender.`,
            icon: `${baseUrl}/logo.png`,
            badge: `${baseUrl}/badge.png`,
            tag: 'incoming-call',
            renotify: true,
            requireInteraction: true,
            vibrate: [400, 200, 400, 200, 800],
            data: { url: `${baseUrl}/#/morador/${unitId}?call=true&visitorSocketId=${socket.id}`, unitId, propertyId }
          });
        }
      });
    } catch (e) {
      console.error('Error initiating call:', e);
    }
  });

  // Outros eventos WebRTC...
  socket.on('answer_call', ({ visitorSocketId, mode, unitId }) => {
    io.to(visitorSocketId).emit('call_answered', { residentSocketId: socket.id, mode, unitId });
  });
  
  socket.on('webrtc_ready', ({ target }) => {
    io.to(target).emit('webrtc_ready', { residentSocketId: socket.id });
  });
  
  socket.on('webrtc_offer', ({ target, offer }) => {
    io.to(target).emit('webrtc_offer', { sender: socket.id, offer });
  });

  socket.on('webrtc_answer', ({ target, answer }) => {
    io.to(target).emit('webrtc_answer', { sender: socket.id, answer });
  });

  socket.on('webrtc_ice_candidate', ({ target, candidate }) => {
    io.to(target).emit('webrtc_ice_candidate', { sender: socket.id, candidate });
  });

  // Relays para Mensagens Rápidas, Encerrar Chamada e Abrir Portão
  socket.on('send_quick_message', ({ target, message }) => {
    io.to(target).emit('quick_message', { message });
  });

  socket.on('call_ended', ({ target }) => {
    io.to(target).emit('call_ended');
  });

  socket.on('authorize_entry', ({ visitorId }) => {
    // visitorId neste contexto contém o visitorSocketId para notificar a tela
    io.to(visitorId).emit('entry_authorized');
  });
});

// Health Check (Keep-Alive)
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Catch-all para o Frontend (React Router)

app.use( (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
