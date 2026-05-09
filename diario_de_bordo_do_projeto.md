# 📝 Diário de Bordo - Campainha-Digital

---

## Fase 1–4: Fundação, Design, PWA e Git
(Ver histórico completo no git log)

---

## 🔗 v2.0.0 — WebRTC P2P Nativo (09/05/2026)
- Removido PeerJS. Signaling via Socket.io próprio.
- STUN Google + TURN OpenRelay. Endpoint `/api/ping` keep-alive Render.
- Histórico de visitantes em `visitors.json`. Aba no AdminPanel.

## 🎛️ v2.1.0 — Painel do Morador Completo
- Navegação inferior: Campainha / Histórico / Configurações / Sair.
- 3 modos: Modo Oculto / Só Áudio / Câmera + Áudio.
- Modo oculto invisível: visitante permanece na tela "Chamando".
- Mensagens rápidas por categoria com banner na tela do visitante.

## 🔔 v2.2.0 — Som Real + Histórico Pro + Paywall
- DING-DONG via Web Audio API (osciladores sine 880Hz/660Hz, gain 1.5x).
- Vibração: `[400,200,400,200,800,500,400,200,400]`.
- Histórico com grupos por data, stats (Total/Hoje/Com Foto), filtros, foto expandível.
- Paywall R$15/mês para endereços adicionais. Modal com benefícios.
- QR Code: 1 único por cadastro (UUID v4), nunca se repete.

---

## 🔑 v2.3.0 — Login Duplo por Tipo de Imóvel (09/05/2026)

### Problema
O login do morador pedia e-mail + código para TODOS os tipos, tornando o processo complexo desnecessariamente para moradores de condomínio.

### Solução — Dois modos de login

| Tipo de Imóvel | Modo de Login | Como funciona |
|---|---|---|
| Condomínio / Vila | **Código de Acesso** | Morador digita o código único (ex: `A3F9C2`) — sem e-mail |
| Casa Simples | **E-mail + Senha** | Login tradicional com e-mail e código de acesso |

**Backend:**
- Nova rota `POST /api/resident/login-by-code`: aceita só o `accessCode`, busca em todas as propriedades, retorna `unitId`, `unitName`, `propertyName`.
- Código normalizado em `toUpperCase()` antes da busca — evita erro de digitação.

**Frontend (ResidentLogin.jsx):**
- Dois tabs visuais: `Hash` (Código) e `Mail` (E-mail).
- Campo de código: maiúsculas automáticas + letter-spacing 4px + tamanho 18px — fácil de digitar e conferir.
- Sem e-mail obrigatório no modo código — 1 campo só.

### PWA Install Agressivo
- Banner fixo no rodapé da página de login (não desaparece).
- Ícone + descrição + botão "Instalar" em destaque.
- Ao instalar: banner some e aparece confirmação "App instalado!".
- Evento `appinstalled` capturado para feedback visual.
- O app instalado abre direto na página correta (configurado no `manifest.json`).

---

## 🛠️ Próximos Passos
- [ ] Integração Pix (R$15 por novo endereço).
- [ ] Síndico Admin: reconfigurar códigos dos moradores.
- [ ] Migração banco → PostgreSQL/Neon.
- [ ] Push notifications via FCM (Firebase Cloud Messaging).
