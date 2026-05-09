# 📝 Diário de Bordo - Campainha-Digital

Este documento registra a evolução, decisões técnicas e marcos do projeto.

---

## 🚀 Fase 1: Fundação e Visão (Início - 04/05/2026)
- **Objetivo:** Transformar o conceito de campainha via QR Code em um SaaS ultra-premium para casas e condomínios.
- **Stack Definida:** React (Vite) + Node.js (Express) + Socket.io + WebRTC Nativo.
- **Design System:** Tema "Midnight Corporate" com Glassmorphism e Aurora Gradients.

## 🎨 Fase 2: Redesign e Experiência do Usuário
- **Landing Page:** Reconstruída do zero focando em B2B e segurança.
- **Auth Page:** Login e Cadastro com visual imersivo, correções mobile.
- **Painel do Cliente (Admin):** Refatoração completa, otimização mobile, gestão de placas.
- **Resident Dashboard:** Interface estilo App Nativo com alertas sonoros e visuais.
- **Visitor Experience:** Interface ultra-simplificada com suporte a múltiplos apartamentos.

## 📱 Fase 3: Mobilidade e PWA
- **PWA:** Integração com `vite-plugin-pwa`. Prompt de instalação nativo.
- **Single House Flow:** Fluxo específico para casas individuais.

## 📂 Fase 4: Sincronização e Git
- **Repositório:** [leopalmeira/campainha-digital](https://github.com/leopalmeira/campainha-digital)
- **Versionamento:** Commits estruturados por marco funcional.

---

## 🔗 Fase 5: WebRTC P2P Real — Videochamada Funcional (09/05/2026) — v2.0.0

### Por que a videochamada não funcionava antes

O projeto usava **PeerJS**, uma biblioteca que depende de um servidor público externo para conectar os dois lados da chamada. Havia 3 falhas críticas:

**1. ID fixo causava conflito**
```js
// CÓDIGO ANTIGO — problemático
const peer = new Peer(`campainha_resident_${unitId}`)
```
Se o morador fechasse o app e reabrisse, o servidor PeerJS já tinha esse ID registrado e rejeitava o novo registro. Resultado: morador invisível, chamada nunca chegava.

**2. Servidor externo fora do nosso controle**
O servidor público do PeerJS pode estar lento, indisponível ou bloqueado pela operadora. Impossível diagnosticar ou corrigir.

**3. Corrida de eventos (race condition)**
O visitante tentava ligar ao morador **antes** do morador terminar de se registrar no PeerJS. A notificação pelo Socket.io era mais rápida que o registro no servidor externo.

---

### Como funciona agora — WebRTC Nativo com Signaling próprio

**Não existe mais servidor externo.** O próprio servidor no Render faz a sinalização.

```
[Visitante]              [Servidor Render]             [Morador]
     │                         │                           │
     │── initiate_call ────────►│                           │
     │   (envia foto)           │── incoming_call ─────────►│
     │                          │         (tela toca)       │
     │                          │◄── answer_call ───────────│
     │◄── call_answered ────────│   (morador clicou atender)│
     │                          │                           │
     │── webrtc_offer ──────────►────────────────────────── ►│
     │◄── webrtc_answer ─────── ◄──────────────────────────  │
     │◄══ ICE candidates trocados via servidor ══════════════►│
     │                                                        │
     │◄═══════ CONEXÃO P2P DIRETA ESTABELECIDA ══════════════►│
     │          áudio/vídeo fluem direto entre eles           │
```

**Por que cada parte funciona:**

| Problema antigo | Solução nova |
|---|---|
| ID fixo conflitava | Socket.id único gerado a cada conexão, sem conflito |
| Servidor externo instável | Só usa o servidor Render — sob nosso controle |
| Race condition | Offer só criado DEPOIS do `call_answered` — sequência garantida |
| Falha em redes móveis | TURN servers OpenRelay como fallback para qualquer NAT |

**O detalhe mais importante — ordem garantida:**
```js
// Visitante ESPERA o sinal do servidor para só então criar o WebRTC
socket.on('call_answered', async ({ residentSocketId }) => {
  await startWebRTC(residentSocketId) // só aqui cria o offer
})
```

### Compatibilidade com Render Free Tier
- **`/api/ping`** — endpoint keep-alive. Configure UptimeRobot (gratuito) para chamar a cada 10min e evitar spin-down de 15min.
- Socket.io com `pingTimeout: 60000`, `pingInterval: 25000` e fallback para polling.
- Reconexão automática no cliente com 20 tentativas.
- O áudio/vídeo **nunca passa pelo servidor** (é P2P direto) — o servidor só carrega os textos leves de sinalização.

### O que foi entregue na v2.0.0
- ✅ WebRTC nativo substituindo PeerJS completamente
- ✅ STUN servers Google + TURN OpenRelay (fallback NAT restritivo)
- ✅ Histórico de visitantes com foto, data, hora em `visitors.json`
- ✅ Nova aba "Histórico de Visitantes" no painel do proprietário
- ✅ Códigos de acesso com botão COPIAR com feedback visual
- ✅ Botão "Encerrar chamada" funcional com sinalização P2P
- ✅ Mudo funcional no dashboard do morador

---

## 🛠️ Próximos Passos (Em Andamento)
- [ ] **Auth por tipo:** Casa simples → email+senha; Condo/vila → código + número da unidade.
- [ ] **Síndico Admin:** Interface para síndico reconfigurar acesso dos moradores.
- [ ] **Keep-alive automático:** Integrar UptimeRobot ao processo de deploy.
- [ ] **Backend Robustecimento:** Migração para banco de dados relacional (PostgreSQL/Neon).
- [ ] **Painel de Vendas/Admin Master:** Monitorar crescimento e gerenciar vendedores.
