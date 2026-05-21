// ─── Campainha Digital — Service Worker ───────────────────────────────────────
// Versão do cache — altere para forçar atualização
const CACHE_NAME = 'campainha-v7';

const STATIC_ASSETS = [
  './',
  './index.html',
  './logo.png',
  './badge.png'
];

// ─── Install: Pré-cache de assets estáticos ───────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Alguns assets não cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: Limpa caches antigos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: Estratégia Network-first com fallback para cache ──────────────────
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e APIs externas
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Push: Recebe notificação e exibe para o usuário ─────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido!');

  // Constrói URLs absolutas dinamicamente com base na origem do PWA
  const BASE_URL = self.location.origin + '/campainha-digital-full/';

  let data = {
    title: '🔔 Alguém na sua porta!',
    body: 'Toque para atender agora.',
    icon: BASE_URL + 'logo.png',
    badge: BASE_URL + 'badge.png',
    tag: 'incoming-call',
    requireInteraction: true,
    vibrate: [
      300, 100, 600, 800,
      300, 100, 600, 800,
      300, 100, 600, 800
    ],
    data: { url: BASE_URL }
  };

  try {
    const parsed = event.data?.json();
    if (parsed) data = { ...data, ...parsed };
  } catch (e) {
    console.warn('[SW] Erro ao parsear push payload:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || 'campainha',
    renotify: data.renotify ?? true,
    requireInteraction: data.requireInteraction ?? true,
    vibrate: data.vibrate || [
      300, 100, 600, 800,
      300, 100, 600, 800,
      300, 100, 600
    ],
    data: data.data || {},
    actions: [
      { action: 'answer', title: '📞 Atender' },
      { action: 'dismiss', title: '❌ Ignorar' }
    ]
  };

  event.waitUntil(
    // 1. Exibe a notificação do sistema com fallback resiliente para iOS/Android
    self.registration.showNotification(data.title, options)
      .catch((err) => {
        console.warn('[SW] Falha ao exibir com opções complexas, tentando simplificada:', err);
        // Fallback robusto sem ações ou padrões complexos de vibração (seguro para todas as versões de iOS/Android)
        return self.registration.showNotification(data.title, {
          body: data.body,
          icon: BASE_URL + 'logo.png',
          badge: BASE_URL + 'badge.png',
          tag: 'campainha',
          data: data.data || {}
        });
      })
      .then(() => {
        // 2. Tenta acordar qualquer janela aberta do app para tocar o som de campainha
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'INCOMING_CALL',
            payload: data.data || {}
          });
        });
        console.log(`[SW] Push processado com sucesso. ${clientList.length} janela(s) acordada(s).`);
      })
      .catch((err) => {
        console.error('[SW] Erro crítico no pipeline do push handler:', err);
      })
  );
});

// ─── NotificationClick: Abre o app quando o usuário toca na notificação ──────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já está aberto, foca nele e navega
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Se o app está fechado, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Message: Comunicação com o app principal ─────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
