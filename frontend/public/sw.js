// ─── Campainha Digital — Service Worker ───────────────────────────────────────
// Versão do cache — altere para forçar atualização
const CACHE_NAME = 'campainha-v32';

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
  const basePath = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);
  const BASE_URL = self.location.origin + basePath;

  let data = {
    title: '🔔 Alguém na sua porta!',
    body: 'Toque para atender agora.',
    tag: 'incoming-call',
    data: { url: BASE_URL }
  };

  try {
    const parsed = event.data?.json();
    if (parsed) data = { ...data, ...parsed };
  } catch (e) {
    console.warn('[SW] Erro ao parsear push payload:', e);
  }

  // Ajusta a URL dos dados para a origem correta do PWA instalado
  if (data.data && typeof data.data.url === 'string' && data.data.url.includes('/#/')) {
    try {
      const hashIndex = data.data.url.indexOf('/#/');
      const routePath = data.data.url.substring(hashIndex + 1);
      data.data.url = BASE_URL + routePath;
    } catch (err) {
      console.warn('[SW] Erro ao reescrever URL no push event:', err);
    }
  }

  // Detecção precisa de iOS (incluindo iPad em modo desktop)
  let isIOS = false;
  try {
    const ua = (self.navigator && self.navigator.userAgent) || '';
    isIOS = /iPad|iPhone|iPod/.test(ua) || 
            (ua.includes('Macintosh') && self.navigator && self.navigator.maxTouchPoints > 0);
  } catch (e) {
    console.warn('[SW] Erro ao detectar iOS:', e);
  }

  // Configuração das opções base de notificação
  const options = {
    body: data.body,
    tag: data.tag || 'campainha',
    data: data.data || {}
  };

  // Só adiciona opções complexas/mídia se NÃO for iOS para evitar bloqueios ou downloads lentos
  if (!isIOS) {
    try {
      options.icon = data.icon || BASE_URL + 'logo.png';
      options.badge = data.badge || BASE_URL + 'badge.png';
      options.silent = false;
      options.actions = [
        { action: 'answer', title: '📞 Atender' },
        { action: 'dismiss', title: '❌ Ignorar' }
      ];
      options.vibrate = data.vibrate || [300, 100, 600, 800, 300, 100, 600, 800, 300, 100, 600];
      options.requireInteraction = true;
      options.renotify = true;
    } catch (e) {
      console.warn('[SW] Erro ao configurar opções complexas:', e);
    }
  }

  // 1. Dispara a notificação imediatamente de forma síncrona
  const notificationPromise = self.registration.showNotification(data.title, options)
    .catch((err) => {
      console.warn('[SW] Falha com opções normais, tentando simplificada:', err);
      // Fallback ultra-simples, garantido sem carregar ícones/links externos que possam falhar em sleep mode
      return self.registration.showNotification(data.title, {
        body: data.body,
        tag: 'campainha',
        data: data.data || {}
      });
    });

  // 2. Agenda ações paralelas (como acordar janelas abertas) após a exibição
  const postNotificationPromise = notificationPromise
    .then(() => {
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
      console.error('[SW] Erro no fluxo pós-notificação:', err);
    });

  // Retorna a promessa combinada para o navegador manter o SW ativo até a finalização completa
  event.waitUntil(Promise.all([notificationPromise, postNotificationPromise]));
});

// ─── NotificationClick: Abre o app quando o usuário toca na notificação ──────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || './';

  // Reescreve a URL se ela contiver o hash routing para garantir que abra no mesmo domínio/origem do PWA instalado
  if (targetUrl.includes('/#/')) {
    try {
      const hashIndex = targetUrl.indexOf('/#/');
      const routePath = targetUrl.substring(hashIndex + 1); // e.g. "#/morador/..."
      
      const basePath = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);
      const BASE_URL = self.location.origin + basePath;
      
      targetUrl = BASE_URL + routePath;
    } catch (err) {
      console.error('[SW] Erro ao reescrever targetUrl no click:', err);
    }
  }

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
