# 🔔 Campainha Digital

> **SaaS de Campainha Inteligente via QR Code com Videochamada P2P Real**

[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20WebRTC-blue)](#)
[![Version](https://img.shields.io/badge/Versão-2.0.0-green)](#)

---

## 🚀 O que é

Campainha Digital é uma plataforma SaaS que transforma um simples QR Code em uma campainha inteligente com **videochamada P2P em tempo real** entre visitante e morador — sem aplicativo, sem hardware adicional.

**Fluxo:**
1. Visitante escaneia o QR Code na porta
2. Tira uma foto e toca a campainha
3. Morador recebe alerta com foto + opção de Atender ou Monitorar
4. Videochamada P2P é estabelecida via WebRTC

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + Socket.io-client |
| Backend | Node.js + Express + Socket.io |
| Realtime | **WebRTC Nativo** (sem PeerJS) |
| Signaling | Socket.io (servidor próprio) |
| ICE/STUN | Google STUN + OpenRelay TURN |
| Deploy | Render.com |
| DB | JSON file (em migração para PostgreSQL) |

---

## ⚡ WebRTC P2P — Como Funciona

```
[Visitante]                    [Servidor Socket.io]              [Morador]
    |  initiate_call (foto)  →  |                                    |
    |                           |  → incoming_call (foto)            |
    |                           |                ← answer_call       |
    |  ← call_answered          |                                    |
    |  webrtc_offer →           |  → webrtc_offer                    |
    |                           |                ← webrtc_answer     |
    |  ← webrtc_answer          |                                    |
    |  webrtc_ice_candidate ↔   |  ↔ webrtc_ice_candidate           |
    |                                                                 |
    |◄══════════════ Conexão P2P Direta Estabelecida ══════════════►|
```

O servidor atua apenas como **mensageiro de sinalização** — a mídia flui diretamente entre os dispositivos.

---

## 🌐 Deploy no Render (Conta Free)

### Backend
1. Novo Web Service → conectar repositório GitHub
2. **Build Command:** `npm install`
3. **Start Command:** `node server.js`
4. **Diretório:** `backend/`
5. **Variáveis de ambiente:**
   - `FRONTEND_URL=https://seu-frontend.onrender.com`

### Frontend
1. Novo Static Site → conectar repositório GitHub
2. **Build Command:** `npm install && npm run build`
3. **Publish Directory:** `frontend/dist`
4. **Variáveis de ambiente:**
   - `VITE_API_URL=https://seu-backend.onrender.com`

> **ℹ️ Render Free Tier:** O backend possui endpoint `/api/ping` para keep-alive. Configure um serviço de ping externo (ex: UptimeRobot) para chamar esse endpoint a cada 10 minutos e evitar o spin-down automático.

---

## 📱 Tipos de Imóvel Suportados

| Tipo | Acesso do Morador | Unidades |
|------|-------------------|----------|
| Casa Simples | Email + código de acesso | 1 |
| Vila de Casas | Código da casa | N casas |
| Condomínio | Código do apartamento | N aptos |

---

## 📋 Funcionalidades

- ✅ QR Code único por propriedade
- ✅ Foto automática do visitante
- ✅ Videochamada P2P via WebRTC
- ✅ Modo Furtivo (morador vê, visitante não sabe)
- ✅ Notificação push via Service Worker
- ✅ Histórico de visitantes com foto, data e hora
- ✅ PWA instalável (Android/iOS)
- ✅ Suporte a múltiplas unidades (condomínio/vila)
- ✅ Códigos de acesso copiáveis

---

## 🏗️ Estrutura do Projeto

```
campainha-digital/
├── backend/
│   ├── server.js          # Express + Socket.io + WebRTC signaling
│   ├── db.json            # Propriedades
│   ├── residents.json     # Moradores
│   └── visitors.json      # Histórico de visitas
└── frontend/
    └── src/
        └── pages/
            ├── LandingPage.jsx
            ├── AdminPanel.jsx        # Painel do proprietário + histórico
            ├── ResidentDashboard.jsx # App do morador (WebRTC)
            ├── VisitorCall.jsx       # Interface do visitante (WebRTC)
            ├── ResidentLogin.jsx
            └── AuthPage.jsx
```

---

## 📄 Licença

MIT © [Leo Palmeira](https://github.com/leopalmeira)
