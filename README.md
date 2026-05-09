# 🔔 Campainha Digital

> **SaaS de Campainha Inteligente via QR Code com Videochamada P2P Real**

[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20WebRTC-blue)](#)
[![Version](https://img.shields.io/badge/Versão-2.0.0-green)](#)
[![License](https://img.shields.io/badge/Licença-MIT-gray)](#)

---

## 🚀 O que é

Campainha Digital é uma plataforma SaaS que transforma um simples QR Code em uma campainha inteligente com **videochamada P2P em tempo real** entre visitante e morador — sem aplicativo, sem hardware adicional.

**Fluxo básico:**
1. Visitante escaneia o QR Code na porta do imóvel
2. Câmera captura foto automática para identificação
3. Morador recebe alerta instantâneo com a foto do visitante
4. Morador escolhe **Atender** (áudio bidirecional) ou **Monitorar** (furtivo)
5. Videochamada P2P é estabelecida diretamente entre os dispositivos

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + Socket.io-client |
| Backend | Node.js + Express + Socket.io |
| Realtime | **WebRTC Nativo** (sem bibliotecas externas) |
| Signaling | Socket.io no próprio servidor |
| ICE/STUN | Google STUN servers |
| TURN (fallback) | OpenRelay (redes NAT restritivas) |
| Deploy | Render.com |
| Persistência | JSON files (roadmap: PostgreSQL/Neon) |

---

## ⚡ Como a Videochamada P2P Funciona

O servidor atua **apenas como mensageiro de sinalização** — a mídia (áudio/vídeo) flui diretamente entre os dispositivos sem passar pelo servidor.

```
[Visitante]            [Servidor Render]          [Morador]
     │                        │                       │
     │── initiate_call ───────►│                       │
     │   (foto do visitante)   │── incoming_call ─────►│
     │                         │        (alerta toca)  │
     │                         │◄── answer_call ───────│
     │◄── call_answered ───────│  (morador clicou)     │
     │                         │                       │
     │── webrtc_offer ─────────►────────────────────── ►│
     │◄── webrtc_answer ────── ◄──────────────────────  │
     │◄══ ICE candidates ══════════════════════════════►│
     │                                                   │
     │◄═══════ CONEXÃO P2P DIRETA (áudio/vídeo) ════════►│
```

**Por que funciona em qualquer rede:**
- **STUN servers do Google** — descobre o IP público do dispositivo
- **TURN server OpenRelay** — relay de fallback para redes corporativas/móveis com NAT restritivo
- **Sem servidor externo** — toda sinalização passa pelo seu próprio backend no Render

---

## 🌐 Deploy no Render (Conta Free)

### Backend — Web Service
| Campo | Valor |
|-------|-------|
| Diretório | `backend/` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Variável de ambiente | `FRONTEND_URL=https://seu-frontend.onrender.com` |

### Frontend — Static Site
| Campo | Valor |
|-------|-------|
| Diretório | `frontend/` |
| Build Command | `npm install --legacy-peer-deps && npm run build` |
| Publish Directory | `frontend/dist` |
| Variável de ambiente | `VITE_API_URL=https://seu-backend.onrender.com` |

### ⚠️ Keep-Alive (Render Free Tier)
O Render gratuito suspende o servidor após 15min sem requisições. Para manter online:

1. Crie conta gratuita em [uptimerobot.com](https://uptimerobot.com)
2. Adicione monitor HTTP apontando para: `https://seu-backend.onrender.com/api/ping`
3. Intervalo: **10 minutos**

O endpoint `/api/ping` responde `{ok: true}` instantaneamente, mantendo o servidor vivo.

---

## 📱 Tipos de Imóvel

| Tipo | Descrição | Acesso do Morador |
|------|-----------|-------------------|
| Casa Simples | 1 unidade | Código de acesso |
| Vila de Casas | N casas, 1 QR Code | Código por casa |
| Condomínio | N apartamentos, 1 QR Code | Código por apartamento |

---

## 📋 Funcionalidades

- ✅ QR Code único por propriedade (gerado automaticamente)
- ✅ Foto automática do visitante no momento da chamada
- ✅ Videochamada P2P via WebRTC (sem PeerJS, sem servidor de mídia)
- ✅ Modo Furtivo — morador monitora sem o visitante saber
- ✅ Histórico de visitantes com foto, data e hora
- ✅ Notificação push via Service Worker (mesmo com app minimizado)
- ✅ PWA instalável (Android e iOS)
- ✅ Códigos de acesso copiáveis com feedback visual
- ✅ Suporte a múltiplas unidades (condomínio/vila)
- ✅ Encerramento de chamada sinalizado para ambos os lados

---

## 🏗️ Estrutura do Projeto

```
campainha-digital/
├── backend/
│   ├── server.js          # Express + Socket.io + WebRTC signaling
│   ├── db.json            # Propriedades e QR Codes
│   ├── residents.json     # Moradores registrados
│   └── visitors.json      # Histórico de visitas (foto + timestamp)
└── frontend/
    └── src/
        └── pages/
            ├── LandingPage.jsx       # Página inicial (B2B)
            ├── AdminPanel.jsx        # Painel do proprietário + histórico
            ├── ResidentDashboard.jsx # App do morador (WebRTC answer)
            ├── VisitorCall.jsx       # Interface do visitante (WebRTC offer)
            ├── ResidentLogin.jsx     # Login do morador
            └── AuthPage.jsx          # Cadastro/Login do proprietário
```

---

## 📄 Licença

MIT © [Leo Palmeira](https://github.com/leopalmeira)
