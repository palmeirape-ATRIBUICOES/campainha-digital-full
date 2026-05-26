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
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOL7TRhhhHHze0bnWJY7w3ucZ9JhcxEzycbKQaCCPs2XCed4SVuLxSplr-dqfVeT6nfAmvj7JEvEUbXlnbZUT6U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Cj-7L7Qzqfe3d_AxJ_KRL_wOq4jT2_ZWorgUXZDg8oE';
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
  // Render.com fecha conexões inativas após 30s
  // Reduzimos o ping para 10s para manter o WebSocket vivo
  pingTimeout: 25000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
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

// ─── ICE Servers (TURN credentials) ────────────────────────────────────────────
// Returns a fresh set of STUN+TURN servers.
// Uses the Metered.ca free-tier API or falls back to multiple public STUNs + 
// Twilio-style time-limited HMAC credentials if TURN_SECRET is configured.
app.get('/api/ice-servers', async (req, res) => {
  const TURN_SECRET = process.env.TURN_SECRET;
  const TURN_HOST   = process.env.TURN_HOST;   // e.g. "global.turn.twilio.com"
  const TURN_USER   = process.env.TURN_USER;   // Twilio Account SID or username

  let iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  if (TURN_SECRET && TURN_HOST && TURN_USER) {
    // Twilio / coturn-style HMAC time-limited credentials
    const ttl = 86400; // 24h
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:${TURN_USER}`;
    const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
    iceServers.push(
      { urls: `turn:${TURN_HOST}:3478?transport=udp`, username, credential },
      { urls: `turn:${TURN_HOST}:3478?transport=tcp`, username, credential },
      { urls: `turns:${TURN_HOST}:5349?transport=tcp`, username, credential }
    );
  } else {
    // Fallback: Metered.ca free TURN (more reliable than openrelay)
    const METERED_API_KEY = process.env.METERED_API_KEY;
    const METERED_APP = process.env.METERED_APP || 'campainha';
    if (METERED_API_KEY) {
      // Metered returns credentials via API — we cache them in memory for 1h
      const now = Date.now();
      if (!app._meteredCache || now - app._meteredCache.ts > 3600000) {
        try {
          const r = await fetch(`https://${METERED_APP}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`);
          if (r.ok) {
            const servers = await r.json();
            app._meteredCache = { ts: now, servers };
            console.log('[Metered] TURN servers successfully cached:', servers.length);
          } else {
            console.error('[Metered] Error response from API:', await r.text());
          }
        } catch (err) {
          console.error('[Metered] Error fetching TURN credentials:', err.message);
        }
      }
      if (app._meteredCache && app._meteredCache.servers) {
        iceServers = [...iceServers, ...app._meteredCache.servers];
      }
    }
    // Always add fallback public TURN servers (UDP + TCP + TLS)
    iceServers.push(
      { urls: 'turn:relay1.expressturn.com:3478', username: 'efJCKBFJ9BOE8KXWM1', credential: 'ixbvR6FkW1IA3Zu0' },
      { urls: 'turns:relay1.expressturn.com:5349', username: 'efJCKBFJ9BOE8KXWM1', credential: 'ixbvR6FkW1IA3Zu0' },
      { urls: 'turn:a.relay.metered.ca:80', username: 'e9b0a4a59ffa6516efb33c42', credential: 'VJMqfWlVT/MV7p0C' },
      { urls: 'turn:a.relay.metered.ca:80?transport=tcp', username: 'e9b0a4a59ffa6516efb33c42', credential: 'VJMqfWlVT/MV7p0C' },
      { urls: 'turn:a.relay.metered.ca:443', username: 'e9b0a4a59ffa6516efb33c42', credential: 'VJMqfWlVT/MV7p0C' },
      { urls: 'turns:a.relay.metered.ca:443?transport=tcp', username: 'e9b0a4a59ffa6516efb33c42', credential: 'VJMqfWlVT/MV7p0C' }
    );
  }

  res.json({ iceServers });
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
    console.log(`[Push] Enviando para userId=${userId}, ${subs.length} dispositivo(s) registrado(s)`);
    if (subs.length === 0) {
      console.warn(`[Push] ⚠ Nenhum dispositivo registrado para userId=${userId}. O morador precisa ativar notificações.`);
      return;
    }
    const dead = [];
    let successCount = 0;
    await Promise.all(subs.map(async (sub) => {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
        successCount++;
        console.log(`[Push] ✔ Notificação enviada com sucesso para endpoint: ${sub.endpoint.substring(0, 60)}...`);
      } catch (err) {
        console.error(`[Push] ✘ Erro ao enviar push para endpoint ${sub.endpoint.substring(0, 60)}...: status=${err.statusCode}, msg=${err.body || err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.id); // Subscription expirada
        }
      }
    }));
    console.log(`[Push] Resultado para userId=${userId}: ${successCount}/${subs.length} enviados, ${dead.length} expirados removidos`);
    if (dead.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  } catch (err) {
    console.error('[Push] Erro crítico ao enviar:', err.message, err.stack);
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
  let baseUrl = process.env.FRONTEND_URL || 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
  if (baseUrl.includes('palmeirape-atribuicoes.github.io') && !baseUrl.includes('campainha-digital-full')) {
    baseUrl = 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
  }

  await sendPushToUser(req.user.id, {
    title: '🔔 Teste de Campainha!',
    body: 'Se você está vendo isso, as notificações push estão funcionando!',
    icon: `${baseUrl}/logo.png`,
    badge: `${baseUrl}/badge.png`,
    tag: 'test-notification',
    data: { url: `${baseUrl}/#/morador/${req.user.id}` }
  });
  res.json({ success: true, message: 'Notificação de teste enviada!' });
});

// Diagnóstico: Quantas subscriptions push o usuário tem registradas?
app.get('/api/push/status', authenticate, async (req, res) => {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: req.user.id },
      select: { id: true, endpoint: true, createdAt: true }
    });
    res.json({
      userId: req.user.id,
      userName: req.user.name,
      subscriptionCount: subs.length,
      subscriptions: subs.map(s => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 80) + '...',
        createdAt: s.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Geofence Routes ──────────────────────────────────────────────────────────

/**
 * Fórmula de Haversine: calcula distância em metros entre dois pontos GPS.
 * @param {number} lat1  Latitude ponto 1
 * @param {number} lng1  Longitude ponto 1
 * @param {number} lat2  Latitude ponto 2
 * @param {number} lng2  Longitude ponto 2
 * @returns {number} Distância em metros
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET  /api/properties/:id/geofence — Retorna configuração atual de geofence
app.get('/api/properties/:id/geofence', authenticate, async (req, res) => {
  try {
    const prop = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: { id: true, geofenceEnabled: true, geofenceLat: true, geofenceLng: true, geofenceRadius: true }
    });
    if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
    res.json(prop);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configuração de geofence.', details: err.message });
  }
});

// POST /api/properties/:id/geofence — Salva/atualiza configuração de geofence
app.post('/api/properties/:id/geofence', authenticate, async (req, res) => {
  const { geofenceEnabled, geofenceLat, geofenceLng, geofenceRadius } = req.body;
  try {
    const prop = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!prop) return res.status(404).json({ error: 'Propriedade não encontrada.' });
    // Somente o admin da propriedade pode configurar
    if (prop.adminId !== req.user.id && !req.user.isSuperAdmin) {
      return res.status(403).json({ error: 'Sem permissão para alterar esta propriedade.' });
    }
    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        geofenceEnabled: !!geofenceEnabled,
        geofenceLat: geofenceLat != null ? parseFloat(geofenceLat) : null,
        geofenceLng: geofenceLng != null ? parseFloat(geofenceLng) : null,
        geofenceRadius: geofenceRadius != null ? parseInt(geofenceRadius, 10) : 10
      },
      select: { id: true, geofenceEnabled: true, geofenceLat: true, geofenceLng: true, geofenceRadius: true }
    });
    res.json({ success: true, geofence: updated });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configuração de geofence.', details: err.message });
  }
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
        trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 dias de teste grátis
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
          nextPaymentAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 dias de teste grátis
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

// Endpoint para verificar o status premium (para polling do frontend)
app.get('/api/payment/status/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trialEndsAt: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    
    const isPremium = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
    res.json({ isPremium, trialEndsAt: user.trialEndsAt });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar status do pagamento.' });
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
      external_reference: userId || 'unknown',
      notification_url: 'https://campainha-digital.onrender.com/api/payment/webhook'
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
      external_reference: paymentData.external_reference, // ID do usuário
      notification_url: 'https://campainha-digital.onrender.com/api/payment/webhook'
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
    const cleanCode = (accessCode || '').trim().toUpperCase();

    // 1. Busca usuário pelo clientCode (Código Único) ou plateCode (Placa) - case-insensitive
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { clientCode: { equals: cleanCode, mode: 'insensitive' } },
          { plateCode: { equals: cleanCode, mode: 'insensitive' } }
        ]
      },
      include: {
        propertiesManaged: true,
        units: { include: { property: true } }
      }
    });

    // 2. Se não encontrar o usuário diretamente, verifica se o código inserido é o Código Geral da Unidade (inviteCode) - case-insensitive
    if (!user) {
      const unitByInvite = await prisma.unit.findFirst({
        where: { inviteCode: { equals: cleanCode, mode: 'insensitive' } },
        include: {
          property: true,
          residents: {
            include: {
              propertiesManaged: true,
              units: { include: { property: true } }
            }
          }
        }
      });

      if (unitByInvite && unitByInvite.residents.length > 0) {
        // Loga como o primeiro morador cadastrado nessa unidade
        user = unitByInvite.residents[0];
      }
    }

    if (!user) return res.status(401).json({ error: 'Código inválido.' });

    // Vila Admin: detecta e redireciona para painel de Vila
    if (user.isVilaAdmin) {
      const vilaProperty = await prisma.property.findFirst({
        where: {
          OR: [
            { vilaAdminId: user.id },
            { adminId: user.id }
          ]
        }
      });
      return res.json({
        role: 'vila_admin',
        token: user.id,
        userId: user.id,
        propertyId: vilaProperty?.id,
        propertyName: vilaProperty?.name,
        adminName: user.name,
        adminEmail: user.email
      });
    }

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
      isCondoResident: user.isCondoResident,
      isDependent: user.isDependent ?? false,
      parentUserId: user.parentUserId ?? null
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

    // Vila Admin
    if (user.isVilaAdmin) {
      const vilaProperty = await prisma.property.findFirst({
        where: {
          OR: [
            { vilaAdminId: user.id },
            { adminId: user.id }
          ]
        }
      });
      return res.json({
        role: 'vila_admin',
        token: user.id,
        userId: user.id,
        propertyId: vilaProperty?.id,
        propertyName: vilaProperty?.name,
        adminName: user.name,
        adminEmail: user.email
      });
    }

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

// Listar todas as propriedades para o Super Admin
app.get('/api/master/properties', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        admin: true,
        doorman: true,
        units: {
          include: {
            residents: true
          }
        }
      }
    });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar propriedades.' });
  }
});

// Ativar/Desativar módulos de um usuário
app.post('/api/master/users/:id/modules', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { isAdmin, isDoorman, isResident, isSuperAdmin, isReseller, isHouseResident, isCondoResident, isVilaAdmin } = req.body;
  
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin, isDoorman, isResident, isSuperAdmin, isReseller, isHouseResident, isCondoResident, isVilaAdmin }
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

// Gerar números únicos e sequenciais de placa
app.post('/api/master/plates/generate', authenticate, async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
  const { quantity } = req.body;
  const qty = parseInt(quantity, 10) || 4;
  
  try {
    let currentSeq = 0;
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'last_plate_seq' } });
    if (setting && setting.value) {
      currentSeq = parseInt(setting.value, 10);
    }
    
    const startNum = currentSeq + 1;
    const endNum = currentSeq + qty;
    
    await prisma.systemSetting.upsert({
      where: { key: 'last_plate_seq' },
      update: { value: String(endNum) },
      create: { key: 'last_plate_seq', value: String(endNum) }
    });
    
    res.json({ startNum, quantity: qty });
  } catch (err) {
    console.error('[Placas] Erro ao gerar numeração:', err);
    res.status(500).json({ error: 'Erro ao gerar numeração de placas.' });
  }
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
        isVilaAdmin: true,
        doorbellEnabled: true,
        quietModeStart: true,
        quietModeEnd: true,
        clientCode: true,
        plateCode: true,
        trialEndsAt: true,
        propertiesManaged: { select: { id: true, name: true } },
        propertiesVilaAdmin: { select: { id: true, name: true } },
        units: { select: { id: true, name: true, propertyId: true, property: { select: { name: true } } } }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
    }

    // Obtém o propertyId sendo o usuário admin da propriedade, morador de uma unidade ou admin de vila
    const propertyId = user.propertiesManaged?.[0]?.id || user.units?.[0]?.propertyId || user.propertiesVilaAdmin?.[0]?.id;
    const propertyName = user.propertiesManaged?.[0]?.name || user.units?.[0]?.name || user.propertiesVilaAdmin?.[0]?.name || '';
    
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
  const { name, type, id, clientName, units, adminEmail, subdomain } = req.body;
  
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
        subdomain: subdomain ? subdomain.toLowerCase().trim() : null,
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

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam);
    let property = null;

    if (isValidUUID) {
      property = await prisma.property.findUnique({
        where: { id: idParam },
        include: {
          units: { select: { id: true, name: true } }
        }
      });

      if (!property) {
        // 1. Verificar se idParam é um ID de Unidade
        const unit = await prisma.unit.findUnique({
          where: { id: idParam },
          include: { property: { include: { units: { select: { id: true, name: true } } } } }
        });
        if (unit && unit.property) {
          property = unit.property;
        }
      }

      if (!property) {
        // 2. Verificar se idParam é um ID de Usuário (para retrocompatibilidade)
        const userById = await prisma.user.findUnique({
          where: { id: idParam },
          include: {
            propertiesManaged: { include: { units: { select: { id: true, name: true } } } },
            units: { include: { property: { include: { units: { select: { id: true, name: true } } } } } }
          }
        });
        if (userById) {
          property = userById.propertiesManaged?.[0] || userById.units?.[0]?.property;
        }
      }
    }

    if (!property) {
      // 3. Verificar se idParam (ou code) é um clientCode ou plateCode (case-insensitive)
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { clientCode: { equals: code, mode: 'insensitive' } },
            { plateCode: { equals: code, mode: 'insensitive' } }
          ]
        },
        include: {
          propertiesManaged: { include: { units: { select: { id: true, name: true } } } },
          units: { include: { property: { include: { units: { select: { id: true, name: true } } } } } }
        }
      });
      if (user) {
        property = user.propertiesManaged?.[0] || user.units?.[0]?.property;
      }
    }

    if (!property) {
      // 4. Verificar se idParam é um subdomínio cadastrado
      const propertyBySub = await prisma.property.findFirst({
        where: { subdomain: idParam.toLowerCase().trim() },
        include: {
          units: { select: { id: true, name: true } }
        }
      });
      if (propertyBySub) {
        property = propertyBySub;
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

// Buscar moradores cadastrados em uma unidade
app.get('/api/units/:unitId/residents', async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params.unitId },
      include: { residents: true }
    });
    if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });
    res.json(unit.residents);
  } catch (err) {
    console.error('Get unit residents error:', err);
    res.status(500).json({ error: 'Erro ao buscar moradores da unidade.' });
  }
});

// Criar um morador específico sob uma unidade (Pelo Admin/Porteiro)
app.post('/api/properties/:propertyId/units/:unitId/residents', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do morador é obrigatório.' });

  try {
    const unit = await prisma.unit.findUnique({ where: { id: req.params.unitId } });
    if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

    // Gera um código único amigável e legível: ex: 101-MARIA-X9A
    const cleanUnit = unit.name.replace(/\s+/g, '').toUpperCase();
    const cleanName = name.trim().split(' ')[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const generatedCode = `${cleanUnit}-${cleanName}-${rand}`;

    // Cria a conta do morador vinculada à unidade
    const user = await prisma.user.create({
      data: {
        name,
        password: Math.random().toString(36).substring(2, 8).toUpperCase(), // Senha gerada aleatória por compatibilidade
        clientCode: generatedCode,
        isResident: true,
        isCondoResident: true,
        units: { connect: { id: req.params.unitId } }
      }
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Create resident error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar morador no sistema.' });
  }
});

// Criar um morador (dependente) diretamente pelo morador da unidade
app.post('/api/units/:unitId/residents', async (req, res) => {
  const { name, requesterId } = req.body; // requesterId = userId do morador principal que está criando
  if (!name) return res.status(400).json({ error: 'Nome do morador é obrigatório.' });

  try {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params.unitId },
      include: { residents: true }
    });
    if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

    // Identifica o morador principal para herdar as flags dele
    const primaryResident = requesterId
      ? unit.residents.find(r => r.id === requesterId)
      : unit.residents.find(r => !r.isDependent); // Fallback: primeiro não-dependente

    const cleanUnit = unit.name.replace(/\s+/g, '').toUpperCase();
    const cleanName = name.trim().split(' ')[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const generatedCode = `${cleanUnit}-${cleanName}-${rand}`;

    const user = await prisma.user.create({
      data: {
        name,
        password: Math.random().toString(36).substring(2, 8).toUpperCase(),
        clientCode: generatedCode,
        isResident: true,
        isDependent: true,
        parentUserId: primaryResident?.id || null,
        // Herda o tipo de residência do morador principal
        isHouseResident: primaryResident?.isHouseResident ?? false,
        isCondoResident: primaryResident?.isCondoResident ?? true,
        // Herda o prazo de licença do morador principal
        trialEndsAt: primaryResident?.trialEndsAt ?? null,
        doorbellEnabled: true,
        units: { connect: { id: req.params.unitId } }
      }
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Create dependent resident error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar morador.' });
  }
});


// Remover um morador específico de uma unidade
app.delete('/api/properties/:propertyId/units/:unitId/residents/:residentId', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.residentId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete resident error:', err);
    res.status(500).json({ error: 'Erro ao remover morador do sistema.' });
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

// ─── Vila (Conjunto de Casas) ─────────────────────────────────────────────────

// Busca info da Vila para o QR Code (inclui units para mostrar campanhas)
app.get('/api/vila/:propertyId', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.propertyId },
      include: {
        units: {
          include: { residents: { select: { id: true, name: true, email: true, clientCode: true, plateCode: true } } },
          orderBy: { name: 'asc' }
        },
        vilaAdmin: { select: { id: true, name: true, email: true } }
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada.' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar Vila.', details: err.message });
  }
});

// Admin de Vila: atualizar configurações + sincronizar unidades (campanhas)
app.put('/api/vila/:propertyId/settings', async (req, res) => {
  const { name, vilaHouseCount } = req.body;
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      },
      include: { units: true }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    const count = parseInt(vilaHouseCount) || property.vilaHouseCount;
    const currentCount = property.units.length;

    // Sincroniza unidades: cria as que faltam, remove as excedentes (sem moradores)
    if (count > currentCount) {
      for (let i = currentCount + 1; i <= count; i++) {
        const inviteCode = `VILA-${property.name.replace(/\s+/g,'').toUpperCase().substring(0,6)}-C${i}`;
        await prisma.unit.create({
          data: {
            propertyId: property.id,
            name: `Campainha ${i}`,
            inviteCode: inviteCode + '-' + Math.random().toString(36).substring(2,5).toUpperCase()
          }
        });
      }
    } else if (count < currentCount) {
      // Remove units excedentes sem moradores (da última para a primeira)
      const toRemove = property.units
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, currentCount - count);
      for (const unit of toRemove) {
        const hasResidents = await prisma.user.count({ where: { units: { some: { id: unit.id } } } });
        if (hasResidents === 0) {
          await prisma.unit.delete({ where: { id: unit.id } });
        }
      }
    }

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: {
        name: name || property.name,
        vilaHouseCount: count,
        isVila: true,
        type: 'village',
        vilaAdminId: admin.id
      },
      include: { units: { orderBy: { name: 'asc' } } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar Vila.', details: err.message });
  }
});

// Vila Admin: vincular admin a uma Vila (usado pelo MasterAdmin)
app.post('/api/master/vila/:propertyId/set-admin', async (req, res) => {
  const { userId } = req.body;
  const token = req.headers['authorization'];
  try {
    const master = await prisma.user.findUnique({ where: { id: token } });
    if (!master?.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });
    await prisma.property.update({
      where: { id: req.params.propertyId },
      data: { vilaAdminId: userId, isVila: true }
    });
    await prisma.user.update({ where: { id: userId }, data: { isVilaAdmin: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro.', details: err.message });
  }
});

// Vila: listar mensagens (filtradas por unitId ou todas para o admin)
app.get('/api/vila/:propertyId/messages', async (req, res) => {
  const { unitId } = req.query;
  try {
    const where = { propertyId: req.params.propertyId };
    if (unitId) {
      // Morador: vê mensagens para sua unit + broadcasts (unitId === null)
      where.OR = [{ unitId: unitId }, { unitId: null }];
    }
    const messages = await prisma.vilaMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mensagens da Vila.', details: err.message });
  }
});

// Vila: enviar mensagem (admin → individual/broadcast OU morador → admin)
app.post('/api/vila/:propertyId/messages', async (req, res) => {
  const { senderId, senderName, content, unitId, isFromAdmin } = req.body;
  if (!senderId || !content?.trim()) {
    return res.status(400).json({ error: 'senderId e content são obrigatórios.' });
  }
  try {
    const msg = await prisma.vilaMessage.create({
      data: {
        propertyId: req.params.propertyId,
        senderId,
        senderName: senderName || 'Usuário',
        content: content.trim(),
        unitId: unitId || null,       // null = broadcast
        isFromAdmin: !!isFromAdmin
      }
    });
    // Notifica via socket em tempo real
    io.to(`vila_${req.params.propertyId}`).emit('vila_message', msg);
    if (unitId) {
      io.to(`user_${unitId}`).emit('vila_message', msg);
    }
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem.', details: err.message });
  }
});

// ─── Autonomia do Administrador de Vila: Gestão de Campanhas e Moradores ───

// Criar Campainha (Unidade) na Vila
app.post('/api/vila/:propertyId/units', async (req, res) => {
  const { name } = req.body;
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Nome da campainha é obrigatório.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    // Gera inviteCode automático
    const nextIndex = (await prisma.unit.count({ where: { propertyId: property.id } })) + 1;
    const invitePrefix = `VILA-${property.name.replace(/\s+/g,'').toUpperCase().substring(0,6)}-C${nextIndex}`;
    const inviteCode = invitePrefix + '-' + Math.random().toString(36).substring(2,5).toUpperCase();

    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        name: name.trim(),
        inviteCode
      }
    });

    // Atualiza vilaHouseCount da propriedade
    const currentCount = await prisma.unit.count({ where: { propertyId: property.id } });
    await prisma.property.update({
      where: { id: property.id },
      data: { vilaHouseCount: currentCount }
    });

    res.status(201).json(unit);
  } catch (err) {
    console.error('Create Vila unit error:', err);
    res.status(500).json({ error: 'Erro ao criar campainha.', details: err.message });
  }
});

// Editar Campainha (Unidade) na Vila
app.put('/api/vila/:propertyId/units/:unitId', async (req, res) => {
  const { name } = req.body;
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Nome da campainha é obrigatório.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    const updated = await prisma.unit.update({
      where: { id: req.params.unitId },
      data: { name: name.trim() }
    });

    res.json(updated);
  } catch (err) {
    console.error('Update Vila unit error:', err);
    res.status(500).json({ error: 'Erro ao atualizar campainha.', details: err.message });
  }
});

// Excluir Campainha (Unidade) da Vila (e seus moradores vinculados)
app.delete('/api/vila/:propertyId/units/:unitId', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    const unit = await prisma.unit.findUnique({
      where: { id: req.params.unitId },
      include: { residents: true }
    });
    if (!unit) return res.status(404).json({ error: 'Campainha não encontrada.' });

    // Exclui moradores associados à unidade
    for (const resident of unit.residents) {
      await prisma.user.delete({ where: { id: resident.id } }).catch(() => {});
    }

    await prisma.unit.delete({ where: { id: req.params.unitId } });

    // Atualiza vilaHouseCount da propriedade
    const currentCount = await prisma.unit.count({ where: { propertyId: property.id } });
    await prisma.property.update({
      where: { id: property.id },
      data: { vilaHouseCount: currentCount }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete Vila unit error:', err);
    res.status(500).json({ error: 'Erro ao excluir campainha.', details: err.message });
  }
});

// Cadastrar Morador sob uma Campainha na Vila
app.post('/api/vila/:propertyId/units/:unitId/residents', async (req, res) => {
  const { name, email, password, plateCode } = req.body;
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Nome do morador é obrigatório.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    const unit = await prisma.unit.findFirst({
      where: { id: req.params.unitId, propertyId: property.id }
    });
    if (!unit) return res.status(404).json({ error: 'Campainha não encontrada.' });

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    if (plateCode) {
      const cleanPlate = plateCode.trim().toUpperCase();
      const existingPlate = await prisma.user.findFirst({ where: { plateCode: cleanPlate } });
      if (existingPlate) return res.status(400).json({ error: 'Esta placa já está sendo usada.' });
    }

    const generatedClientCode = generateAccessCode() + generateAccessCode();
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email?.trim().toLowerCase() || null,
        password: password || Math.random().toString(36).substring(2, 8).toUpperCase(),
        clientCode: generatedClientCode,
        plateCode: plateCode?.trim().toUpperCase() || null,
        isResident: true,
        isCondoResident: true,
        trialEndsAt: property.nextPaymentAt,
        units: { connect: { id: unit.id } }
      }
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Create Vila resident error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar morador.', details: err.message });
  }
});

// Remover Morador de uma Campainha na Vila
app.delete('/api/vila/:propertyId/units/:unitId/residents/:residentId', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    // Exclui o morador do banco de dados
    await prisma.user.delete({ where: { id: req.params.residentId } });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete Vila resident error:', err);
    res.status(500).json({ error: 'Erro ao remover morador.', details: err.message });
  }
});

// Editar Morador de uma Campainha na Vila
app.put('/api/vila/:propertyId/units/:unitId/residents/:residentId', async (req, res) => {
  const { name, email, password, plateCode } = req.body;
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Nome do morador é obrigatório.' });

  try {
    const admin = await prisma.user.findUnique({ where: { id: token } });
    if (!admin?.isVilaAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const property = await prisma.property.findFirst({
      where: {
        id: req.params.propertyId,
        OR: [
          { vilaAdminId: admin.id },
          { adminId: admin.id }
        ]
      }
    });
    if (!property) return res.status(404).json({ error: 'Vila não encontrada ou sem permissão.' });

    const unit = await prisma.unit.findFirst({
      where: { id: req.params.unitId, propertyId: property.id }
    });
    if (!unit) return res.status(404).json({ error: 'Campainha não encontrada.' });

    // Verificar se o e-mail editado pertence a outro usuário
    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          NOT: { id: req.params.residentId }
        }
      });
      if (existing) return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema por outro usuário.' });
    }

    // Verificar se a placa editada pertence a outro usuário
    if (plateCode) {
      const cleanPlate = plateCode.trim().toUpperCase();
      const existingPlate = await prisma.user.findFirst({
        where: {
          plateCode: cleanPlate,
          NOT: { id: req.params.residentId }
        }
      });
      if (existingPlate) return res.status(400).json({ error: 'Esta placa já está sendo usada por outro usuário.' });
    }

    const updateData = {
      name: name.trim(),
      email: email?.trim().toLowerCase() || null,
      plateCode: plateCode?.trim().toUpperCase() || null
    };

    if (password?.trim()) {
      updateData.password = password.trim();
    }

    const user = await prisma.user.update({
      where: { id: req.params.residentId },
      data: updateData
    });

    res.json(user);
  } catch (err) {
    console.error('Update Vila resident error:', err);
    res.status(500).json({ error: 'Erro ao atualizar morador.', details: err.message });
  }
});

// ─── Demonstração do Sistema (Dados de Exemplo para Vendas) ──────────────────

// Lista todos os usuários demo do sistema
app.get('/api/master/demo/users', async (req, res) => {
  const token = req.headers['authorization'];
  try {
    const master = await prisma.user.findUnique({ where: { id: token } });
    if (!master?.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const demoEmails = [
      'admindevilas@campainha.com',
      'morador@campainha.com',
      'casa1@campainha.com',
      'casa2@campainha.com',
      'casa3@campainha.com'
    ];

    const users = await prisma.user.findMany({
      where: { email: { in: demoEmails } },
      include: {
        propertiesVilaAdmin: { include: { units: true } },
        units: { include: { property: true } }
      }
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar demos.', details: err.message });
  }
});

// Cria / reseta todos os usuários demo (idempotente)
app.post('/api/master/demo/setup', async (req, res) => {
  const token = req.headers['authorization'];
  try {
    const master = await prisma.user.findUnique({ where: { id: token } });
    if (!master?.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado.' });

    const far = new Date('2099-12-31');
    const results = [];

    // ── 1. Admin de Vila Demo ────────────────────────────────────────────
    let vilaAdmin = await prisma.user.upsert({
      where: { email: 'admindevilas@campainha.com' },
      update: { password: 'adminvilas', isVilaAdmin: true, trialEndsAt: far, clientCode: 'VILADEMOACCESS', plateCode: 'ADM-VILA' },
      create: {
        email: 'admindevilas@campainha.com',
        password: 'adminvilas',
        name: 'Admin de Vilas (Demo)',
        isVilaAdmin: true,
        trialEndsAt: far,
        clientCode: 'VILADEMOACCESS',
        plateCode: 'ADM-VILA'
      }
    });

    // ── 2. Propriedade Vila Demo ─────────────────────────────────────────
    let vilaProperty = await prisma.property.findFirst({
      where: { vilaAdminId: vilaAdmin.id },
      include: { units: true }
    });

    if (!vilaProperty) {
      vilaProperty = await prisma.property.create({
        data: {
          name: 'Vila Demonstração',
          type: 'village',
          isVila: true,
          vilaHouseCount: 3,
          vilaAdminId: vilaAdmin.id,
          nextPaymentAt: far,
          plan: 'PREMIUM',
          clientName: 'Admin Demo',
          clientPhone: '(00) 00000-0000'
        },
        include: { units: true }
      });
    } else {
      // Garante flags corretas
      vilaProperty = await prisma.property.update({
        where: { id: vilaProperty.id },
        data: { isVila: true, vilaHouseCount: 3, name: 'Vila Demonstração' },
        include: { units: true }
      });
    }

    // ── 3. Unidades (Campanhas) da Vila Demo ─────────────────────────────
    const demoUnits = [
      { name: 'Campainha 1', code: 'CASADEVILA1' },
      { name: 'Campainha 2', code: 'CASADEVILA2' },
      { name: 'Campainha 3', code: 'CASADEVILA3' }
    ];

    for (const u of demoUnits) {
      const existing = await prisma.unit.findUnique({
        where: { inviteCode: u.code }
      });

      if (!existing) {
        await prisma.unit.create({
          data: {
            propertyId: vilaProperty.id,
            name: u.name,
            inviteCode: u.code
          }
        });
      } else {
        await prisma.unit.update({
          where: { id: existing.id },
          data: {
            name: u.name,
            propertyId: vilaProperty.id
          }
        });
      }
    }

    // Recarrega unidades da Vila para vincular moradores corretos
    const updatedUnits = await prisma.unit.findMany({
      where: { propertyId: vilaProperty.id }
    });

    // ── 3.1 Residentes das Casas da Vila Demo ─────────────────────────────
    const demoResidents = [
      { email: 'casa1@campainha.com', password: 'casa1', name: 'Morador Casa 1', unitName: 'Campainha 1', plate: 'VILA-C1' },
      { email: 'casa2@campainha.com', password: 'casa2', name: 'Morador Casa 2', unitName: 'Campainha 2', plate: 'VILA-C2' },
      { email: 'casa3@campainha.com', password: 'casa3', name: 'Morador Casa 3', unitName: 'Campainha 3', plate: 'VILA-C3' }
    ];

    for (const resData of demoResidents) {
      const unit = updatedUnits.find(u => u.name === resData.unitName);
      if (!unit) continue;

      const clientCode = generateAccessCode() + generateAccessCode();
      const residentUser = await prisma.user.upsert({
        where: { email: resData.email },
        update: {
          password: resData.password,
          name: resData.name,
          isCondoResident: true,
          trialEndsAt: far,
          plateCode: resData.plate,
          clientCode: clientCode
        },
        create: {
          email: resData.email,
          password: resData.password,
          name: resData.name,
          clientCode: clientCode,
          plateCode: resData.plate,
          isCondoResident: true,
          trialEndsAt: far
        }
      });

      // Vincula o morador à unidade (substitui moradores antigos na unidade)
      await prisma.unit.update({
        where: { id: unit.id },
        data: {
          residents: {
            set: [{ id: residentUser.id }]
          }
        }
      });
    }

    // ── 4. Morador Padrão Demo (casa isolada) ───────────────────────────
    let morador = await prisma.user.upsert({
      where: { email: 'morador@campainha.com' },
      update: { password: 'morador123', isHouseResident: true, trialEndsAt: far },
      create: {
        email: 'morador@campainha.com',
        password: 'morador123',
        name: 'Morador Padrão (Demo)',
        isHouseResident: true,
        trialEndsAt: far
      }
    });

    // Garante que o morador demo tem uma property demo
    let moradorProp = await prisma.property.findFirst({
      where: { adminId: morador.id, type: 'house' }
    });

    if (!moradorProp) {
      moradorProp = await prisma.property.create({
        data: {
          name: 'Casa Demo',
          type: 'house',
          adminId: morador.id,
          nextPaymentAt: far,
          plan: 'BASIC',
          clientName: 'Morador Demo'
        }
      });

      // Cria a unit da casa demo (Corrigindo caractere cirílico em MORADORDEMO)
      const unitDemo = await prisma.unit.create({
        data: { propertyId: moradorProp.id, name: 'Casa Principal', inviteCode: 'MORADORDEMO' }
      });

      // Vincula o morador à unidade
      await prisma.unit.update({
        where: { id: unitDemo.id },
        data: { residents: { connect: { id: morador.id } } }
      });

      await prisma.user.update({
        where: { id: morador.id },
        data: { isHouseResident: true }
      });
    }

    // Retorna resultado
    const finalVila = await prisma.property.findUnique({
      where: { id: vilaProperty.id },
      include: { units: { include: { residents: true } }, vilaAdmin: { select: { id: true, name: true, email: true } } }
    });

    results.push({
      type: 'vila_admin',
      email: 'admindevilas@campainha.com',
      password: 'adminvilas',
      property: finalVila
    });

    results.push({
      type: 'morador',
      email: 'morador@campainha.com',
      password: 'morador123'
    });

    res.json({ success: true, created: results });
  } catch (err) {
    console.error('[Demo Setup]', err);
    res.status(500).json({ error: 'Erro ao criar dados demo.', details: err.message });
  }
});

// ─── Mensagens Internas Família (Morador Principal ↔ Dependentes) ─────────────

// Enviar mensagem (principal → dependente ou dependente → principal)
app.post('/api/family-messages', async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  if (!senderId || !receiverId || !content?.trim()) {
    return res.status(400).json({ error: 'Campos obrigatórios: senderId, receiverId, content.' });
  }
  try {
    const msg = await prisma.familyMessage.create({
      data: { senderId, receiverId, content: content.trim() },
      include: { sender: { select: { id: true, name: true } }, receiver: { select: { id: true, name: true } } }
    });
    // Notifica via socket em tempo real
    io.to(`user_${receiverId}`).emit('family_message', msg);
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem.', details: err.message });
  }
});

// Buscar conversa entre dois usuários
app.get('/api/family-messages/:userId/conversation/:otherId', async (req, res) => {
  const { userId, otherId } = req.params;
  try {
    const messages = await prisma.familyMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherId },
          { senderId: otherId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { sender: { select: { id: true, name: true } } }
    });
    // Marca como lidas as mensagens recebidas pelo userId
    await prisma.familyMessage.updateMany({
      where: { senderId: otherId, receiverId: userId, read: false },
      data: { read: true }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mensagens.', details: err.message });
  }
});

// Listar dependentes de um morador principal (para exibir a lista de chats)
app.get('/api/family-messages/:userId/contacts', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isDependent: true, parentUserId: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    let contacts = [];
    if (!user.isDependent) {
      // Morador principal → lista seus dependentes
      contacts = await prisma.user.findMany({
        where: { parentUserId: userId },
        select: {
          id: true, name: true, clientCode: true,
          receivedFamilyMessages: {
            where: { read: false, senderId: { not: userId } },
            select: { id: true }
          }
        }
      });
    } else if (user.parentUserId) {
      // Dependente → só pode falar com o morador principal
      const parent = await prisma.user.findUnique({
        where: { id: user.parentUserId },
        select: { id: true, name: true }
      });
      if (parent) contacts = [{ ...parent, receivedFamilyMessages: [] }];
    }

    res.json(contacts.map(c => ({
      id: c.id,
      name: c.name,
      clientCode: c.clientCode,
      unreadCount: c.receivedFamilyMessages?.length ?? 0
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contatos.', details: err.message });
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
  let { plateCode, userId } = req.body;
  if (!plateCode || !userId) return res.status(400).json({ error: 'Dados incompletos.' });

  // Limpa o código da placa caso seja uma URL inteira
  let cleanedPlateCode = plateCode.trim();
  if (cleanedPlateCode.includes('plate=')) {
    try {
      const match = cleanedPlateCode.match(/[?&]plate=([^&]+)/);
      if (match && match[1]) {
        cleanedPlateCode = decodeURIComponent(match[1]).trim();
      }
    } catch (e) {}
  }
  if (cleanedPlateCode.includes('/')) {
    cleanedPlateCode = cleanedPlateCode.substring(cleanedPlateCode.lastIndexOf('/') + 1);
  }
  cleanedPlateCode = cleanedPlateCode.toUpperCase();

  // Verifica se a placa já pertence a outro usuário
  const plateOwner = await prisma.user.findFirst({ where: { plateCode: cleanedPlateCode } });
  
  if (plateOwner && plateOwner.id !== userId) {
    return res.status(400).json({ error: 'Esta placa física já está vinculada a outra conta.' });
  }

  // Vincula a placa ao usuário atual (mantendo seu clientCode intacto)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { plateCode: cleanedPlateCode }
  });
  
  res.json({ success: true, plateCode: updated.plateCode, message: 'Placa vinculada com sucesso!' });
});

// ─── COMUNICAÇÃO DE VILAS, SUBDOMÍNIOS E CÓDIGOS DE VISITANTE ─────────────────

// Buscar dados de uma Propriedade por Subdomínio
app.get('/api/properties/subdomain/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const property = await prisma.property.findFirst({
      where: { subdomain: subdomain.toLowerCase().trim() },
      include: {
        units: { select: { id: true, name: true, block: true, street: true, number: true } }
      }
    });
    if (!property) return res.status(404).json({ error: 'Propriedade não encontrada por subdomínio' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar propriedade por subdomínio' });
  }
});

// Atualizar propriedade (subdomínio, nome, etc.)
app.put('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  const { name, subdomain } = req.body;
  try {
    const updated = await prisma.property.update({
      where: { id },
      data: {
        name,
        subdomain: subdomain ? subdomain.toLowerCase().trim() : null
      }
    });
    res.json(updated);
  } catch (err) {
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Erro ao atualizar propriedade. Talvez o subdomínio já esteja em uso.' });
  }
});

// Listar status online dos moradores para o painel administrador da vila
app.get('/api/properties/:propertyId/online-status', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const units = await prisma.unit.findMany({
      where: { propertyId },
      include: { residents: true }
    });
    
    const statusMap = {};
    units.forEach(u => {
      // O frontend as vezes registra usando o unit.id (id da rota) como fallback
      let unitOnline = activeSockets.has(u.id); 
      
      u.residents.forEach(r => {
        const isOnline = activeSockets.has(r.id);
        statusMap[r.id] = isOnline ? 'online' : 'offline';
        if (isOnline) unitOnline = true;
      });
      statusMap[u.id] = unitOnline ? 'online' : 'offline';
    });
    res.json(statusMap);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar status online' });
  }
});

// Listar códigos de visitantes da unidade
app.get('/api/units/:unitId/visitor-codes', async (req, res) => {
  try {
    const { unitId } = req.params;
    const codes = await prisma.visitorCode.findMany({
      where: { unitId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar códigos de visitantes' });
  }
});

// Criar código de visitante para a unidade (6 dígitos único)
app.post('/api/units/:unitId/visitor-codes', async (req, res) => {
  try {
    const { unitId } = req.params;
    const { visitorName, daysValid } = req.body;
    if (!visitorName) return res.status(400).json({ error: 'Nome do visitante é obrigatório.' });
    
    let code = '';
    let exists = true;
    while (exists) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const check = await prisma.visitorCode.findUnique({ where: { code } });
      if (!check) exists = false;
    }

    const expiresAt = new Date(Date.now() + (daysValid || 1) * 24 * 60 * 60 * 1000);
    
    const newCode = await prisma.visitorCode.create({
      data: {
        code,
        unitId,
        visitorName,
        expiresAt
      }
    });
    res.status(201).json(newCode);
  } catch (err) {
    console.error('Create visitor code error:', err);
    res.status(500).json({ error: 'Erro ao criar código de visitante' });
  }
});

// Deletar/cancelar código de visitante
app.delete('/api/units/:unitId/visitor-codes/:codeId', async (req, res) => {
  try {
    const { codeId } = req.params;
    await prisma.visitorCode.delete({ where: { id: codeId } });
    res.json({ success: true, message: 'Código cancelado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar código de visitante' });
  }
});

// Validar código de visitante na Portaria / Porteiro / Totem
app.post('/api/properties/:propertyId/validate-visitor-code', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código é obrigatório.' });
    
    const visitorCode = await prisma.visitorCode.findUnique({
      where: { code },
      include: { unit: { include: { property: true } } }
    });

    if (!visitorCode || visitorCode.unit.propertyId !== propertyId) {
      return res.status(404).json({ error: 'Código inválido ou não pertence a esta vila/condomínio.' });
    }

    if (new Date() > new Date(visitorCode.expiresAt)) {
      return res.status(400).json({ error: 'Este código já expirou.' });
    }

    // Registra no histórico de visitantes
    const visit = await prisma.visitor.create({
      data: {
        unitId: visitorCode.unitId,
        propertyId: propertyId,
        callerName: `Pre-aut: ${visitorCode.visitorName} (Cód. ${code})`
      }
    });

    // Notifica o doorman/porteiro via socket
    io.emit('incoming_visitor_code', {
      propertyId,
      visitorName: visitorCode.visitorName,
      unitName: visitorCode.unit.name,
      code: code,
      timestamp: new Date()
    });

    // Notifica os moradores da unidade via socket e push
    io.to(`user_${visitorCode.unitId}`).emit('visitor_arrived', {
      visitorName: visitorCode.visitorName,
      timestamp: new Date()
    });

    // Envia Push Notification para o morador
    const unit = await prisma.unit.findUnique({
      where: { id: visitorCode.unitId },
      include: { residents: true }
    });
    if (unit) {
      unit.residents.forEach(resident => {
        sendPushToUser(resident.id, {
          title: '🔑 Visitante Chegou!',
          body: `${visitorCode.visitorName} chegou na portaria com código de acesso ativo!`,
          tag: 'visitor-arrived',
          vibrate: [300, 100, 300]
        });
      });
    }

    res.json({
      success: true,
      visitorName: visitorCode.visitorName,
      unitName: visitorCode.unit.name,
      message: 'Código de visitante válido! Porteiro notificado para liberação.'
    });
  } catch (err) {
    console.error('Validate code error:', err);
    res.status(500).json({ error: 'Erro ao validar código de visitante' });
  }
});

// ─── Socket.io Logic ─────────────────────────────────────────────────────────

const activeSockets = new Map();


io.on('connection', (socket) => {
  console.log('[WS] conectado:', socket.id);

  socket.on('register_user', ({ userId }) => {
    socket.userId = userId;
    activeSockets.set(userId, socket.id);
    socket.join(`user_${userId}`);
    console.log(`[WS] Usuário ${userId} registrado no socket ${socket.id}`);
  });

  const handleIncomingCall = async ({ unitId, propertyId, photoBase64, callerName, visitorLat, visitorLng }) => {
    console.log(`\n[WS Call] ===== NOVA CHAMADA =====`);
    console.log(`[WS Call] unitId: ${unitId}`);
    console.log(`[WS Call] propertyId: ${propertyId}`);
    console.log(`[WS Call] callerName: ${callerName}`);
    console.log(`[WS Call] photo: ${photoBase64 ? 'SIM (' + photoBase64.length + ' chars)' : 'NÃO'}`);
    console.log(`[WS Call] visitorSocket: ${socket.id}`);
    
    if (!unitId) {
      console.error('[WS Call] ✘ ABORTADO: unitId não fornecido!');
      return;
    }

    // Busca os moradores da unidade
    console.log('[WS Call] Buscando unidade no banco...');
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { residents: true }
    });

    if (!unit) {
      console.error(`[WS Call] ✘ ABORTADO: unidade ${unitId} não encontrada no banco!`);
      return;
    }
    console.log(`[WS Call] ✔ Unidade encontrada: ${unit.name} com ${unit.residents.length} morador(es)`);


    // ─── Validação de Geofence ─────────────────────────────────────────────
    // Busca configuração de geofence da propriedade
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { geofenceEnabled: true, geofenceLat: true, geofenceLng: true, geofenceRadius: true }
    });

    if (property?.geofenceEnabled && property.geofenceLat != null && property.geofenceLng != null) {
      if (visitorLat == null || visitorLng == null) {
        // Visitante não compartilhou GPS — bloqueia
        console.log(`[Geofence] Chamada BLOQUEADA: GPS do visitante não disponível para unidade ${unit.name}`);
        socket.emit('call_failed', {
          reason: 'geofence_no_gps',
          message: 'Esta campainha requer que você compartilhe sua localização para ser usada. Ative o GPS e tente novamente.'
        });
        return;
      }
      const distanceM = haversineDistance(
        property.geofenceLat, property.geofenceLng,
        parseFloat(visitorLat), parseFloat(visitorLng)
      );
      const radius = property.geofenceRadius || 10;
      if (distanceM > radius) {
        console.log(`[Geofence] Chamada BLOQUEADA: Visitante a ${distanceM.toFixed(1)}m (máx ${radius}m) da unidade ${unit.name}`);
        socket.emit('call_failed', {
          reason: 'geofence_too_far',
          message: `Você está a ${Math.round(distanceM)} metros do endereço. É necessário estar a menos de ${radius} metros para tocar a campainha.`
        });
        return;
      }
      console.log(`[Geofence] Visitante a ${distanceM.toFixed(1)}m — dentro do raio de ${radius}m ✔`);
    }
    // ─────────────────────────────────────────────────────────────────────────

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

    // Salvar visita no banco de dados
    // BUG FIX CRÍTICO: NÃO abortar a chamada se o banco falhar!
    // O morador DEVE ser notificado mesmo se a foto não puder ser salva.
    let visit;
    try {
      visit = await prisma.visitor.create({
        data: {
          unitId,
          propertyId,
          photo: photoBase64,
          callerName: callerName || 'Visitante'
        }
      });
      console.log(`[WS Call] ✔ Visita registrada: visitId=${visit.id}, unidade=${unit.name}`);
    } catch (e) {
      // ANTES: return aqui silenciava TODAS as chamadas quando o banco falhava
      // AGORA: loga o erro mas continua para notificar o morador
      console.error('[WS Call] ⚠️ Erro ao salvar visita no banco (CONTINUANDO mesmo assim):', e.message);
      visit = { id: 'temp-' + Date.now(), timestamp: new Date() };
    }

    // Notifica SOMENTE os moradores ATIVOS da unidade (com licença válida)
    console.log(`[WS Call] Notificando ${activeResidents.length} morador(es) ativo(s) da unidade ${unit.name}`);
    
    let baseUrl = process.env.FRONTEND_URL || 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
    if (baseUrl.includes('palmeirape-atribuicoes.github.io') && !baseUrl.includes('campainha-digital-full')) {
      baseUrl = 'https://palmeirape-atribuicoes.github.io/campainha-digital-full';
    }

    for (const resident of activeResidents) {
      try {
        // Verifica se está no horário de silêncio
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // BUG FIX: doorbellEnabled pode ser null em contas antigas (antes da migration @default(true))
        // Tratamos null/undefined como true — o usuário deve explicitamente DESATIVAR para silenciar
        let shouldRing = resident.doorbellEnabled !== false;
        if (resident.quietModeStart && resident.quietModeEnd) {
          if (resident.quietModeStart < resident.quietModeEnd) {
            if (currentTime >= resident.quietModeStart && currentTime <= resident.quietModeEnd) shouldRing = false;
          } else {
            if (currentTime >= resident.quietModeStart || currentTime <= resident.quietModeEnd) shouldRing = false;
          }
        }

        if (!shouldRing) {
          console.log(`[WS Call] ⏸ Morador ${resident.name} SILENCIADO`);
          console.log(`[WS Call]   doorbellEnabled: ${resident.doorbellEnabled}`);
          console.log(`[WS Call]   quietModeStart: ${resident.quietModeStart}`);
          console.log(`[WS Call]   quietModeEnd: ${resident.quietModeEnd}`);
          console.log(`[WS Call]   horário atual (servidor UTC): ${currentTime}`);
          console.log(`[WS Call]   → Para receber chamadas, desative o Modo Silencioso nas configurações do app`);
          continue;
        }

        // 1. Notifica via Socket.io (funciona se o app está aberto em primeiro plano)
        const socketRoomUser = `user_${resident.id}`;
        const socketRoomUnit = `user_${unitId}`;
        
        // Diagnóstico: verifica quantos sockets estão em cada sala
        const roomUser = io.sockets.adapter.rooms.get(socketRoomUser);
        const roomUnit = io.sockets.adapter.rooms.get(socketRoomUnit);
        console.log(`[WS Call] 📡 Emitindo para sala ${socketRoomUser} (${roomUser?.size || 0} socket(s)) e ${socketRoomUnit} (${roomUnit?.size || 0} socket(s))`);
        
        if (!roomUser?.size && !roomUnit?.size) {
          console.warn(`[WS Call] ⚠️ ALERTA: Nenhum socket conectado para o morador ${resident.name} (${resident.id}) — o app pode estar fechado ou com ID errado registrado`);
        }
        
        // DEDUP FIX: emite para ambas as salas mas inclui um callId único
        // O frontend usa o callId para ignorar duplicatas (mesmo evento chegando por 2 salas)
        const callId = `${socket.id}-${Date.now()}`;
        
        // Emite para ambas as salas para redundância absoluta (morador / unidade)
        io.to(socketRoomUser).to(socketRoomUnit).emit('incoming_call', {
          callId,
          visitorSocketId: socket.id,
          photo: photoBase64,
          callerName: callerName || 'Visitante',
          timestamp: visit.timestamp,
          visitId: visit.id,
          propertyId
        });

        // 2. Push Notification: Acorda o app mesmo fechado/background (SEMPRE envia, independente do socket)
        await sendPushToUser(resident.id, {
          title: '🔔 Alguém na sua porta!',
          body: `${callerName || 'Visitante'} está chamando. Toque para atender.`,
          icon: `${baseUrl}/logo.png`,
          badge: `${baseUrl}/badge.png`,
          tag: 'incoming-call',
          renotify: true,
          requireInteraction: true,
          vibrate: [400, 200, 400, 200, 800],
          data: { 
            url: `${baseUrl}/#/morador/${unitId}?call=true&visitorSocketId=${socket.id}`, 
            unitId, 
            propertyId,
            visitorSocketId: socket.id
          }
        });

        console.log(`[WS Call] ✔ Morador ${resident.name} (${resident.id}) notificado com sucesso via Socket + Push`);
      } catch (e) {
        console.error(`[WS Call] ✘ Erro ao notificar morador ${resident.id}:`, e.message);
        // Continua para o próximo morador — não interrompe o loop
      }
    }
  };

  socket.on('initiate_call', handleIncomingCall);
  socket.on('doorman_call', handleIncomingCall);

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

  socket.on('disconnect', () => {
    console.log('[WS] desconectado:', socket.id);
    if (socket.userId) {
      activeSockets.delete(socket.userId);
    }
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
