# 📝 Diário de Bordo - Campainha-Digital

Este documento registra a evolução, decisões técnicas e marcos do projeto.

## 🚀 Fase 1: Fundação e Visão (Início - 04/05/2026)
- **Objetivo:** Transformar o conceito de campainha via QR Code em um SaaS ultra-premium para casas e condomínios.
- **Stack Definida:** React (Vite) + Node.js (Express) + Socket.io (WebRTC Nativo).
- **Design System:** Implementação de um tema "Midnight Corporate" com Glassmorphism e Mesh Gradients (Aurora).

## 🎨 Fase 2: Redesign e Experiência do Usuário
- **Landing Page:** Reconstruída do zero focando em B2B e segurança (8 vantagens competitivas).
- **Auth Page:** Login e Cadastro com visual imersivo e correções de layout mobile.
- **Painel do Cliente (Admin):** Refatoração completa. Otimização para mobile, ocultação de formulários complexos e foco na gestão de placas.
- **Resident Dashboard:** Criação de uma interface estilo App Nativo para recebimento de chamadas com alertas sonoros e visuais de alto impacto.
- **Visitor Experience:** Interface ultra-simplificada para visitantes no portão, com suporte a múltiplos apartamentos.

## 📱 Fase 3: Mobilidade e PWA
- **Configuração PWA:** Integração total com `vite-plugin-pwa`.
- **Instalação:** Implementação do prompt de instalação nativo no Painel e no Dashboard do Morador.
- **Single House Flow:** Criado fluxo específico de configuração para casas individuais ("Casa Única").

## 📂 Fase 4: Sincronização e Git
- **Repositório:** Vinculação bem-sucedida ao repositório oficial [leopalmeira/campainha-digital](https://github.com/leopalmeira/campainha-digital).
- **Versionamento:** Commits estruturados para cada grande mudança visual e funcional.

## 🔗 Fase 5: WebRTC P2P Real — Videochamada Funcional (09/05/2026) — v2.0.0
- **Problema crítico resolvido:** A videochamada entre visitante e morador não estava sendo estabelecida.
- **Causa raiz:** Uso do PeerJS (servidor externo) com ID fixo, causando conflitos e falhas em redes NAT.
- **Solução:** Substituição completa do PeerJS por **WebRTC nativo** com signaling via **Socket.io próprio**.
  - Visitante cria `RTCPeerConnection`, captura câmera+áudio, envia **offer** via Socket.io.
  - Morador recebe offer, cria `RTCPeerConnection`, responde com **answer**.
  - ICE candidates trocados em tempo real através do servidor Socket.io.
  - STUN servers públicos do Google configurados (`stun.l.google.com:19302` e variantes).
  - TURN server público de fallback (`openrelay.metered.ca`) para redes NAT restritivas.
- **Compatibilidade com Render Free Tier:**
  - Endpoint `/api/ping` adicionado (keep-alive para evitar spin-down de 15min).
  - Socket.io configurado com `pingTimeout: 60000` e suporte a polling como fallback.
  - Reconexão automática no cliente com `reconnectionAttempts: 20`.
- **Histórico de Visitantes:**
  - Backend persiste foto, timestamp e unitId de cada visita em `visitors.json`.
  - Nova rota `GET /api/visitors/property/:propertyId` retorna histórico ordenado.
  - Painel do Admin tem nova aba "Histórico de Visitantes" com foto, data, hora e unidade.
  - Botão de atalho "Ver Histórico" em cada card de propriedade.
- **Códigos de acesso copiáveis:** Botão com feedback visual "COPIADO!" nos cards de unidade.

## 🛠️ Próximos Passos (Em Andamento)
- [ ] **Auth por tipo:** Casa simples → email+senha; Condo/vila → código de acesso.
- [ ] **Síndico Admin:** Interface para síndico reconfigurar acesso dos moradores.
- [ ] **Painel de Vendas/Admin Master:** Monitorar crescimento e gerenciar vendedores.
- [ ] **README.md Profissional:** Documentação completa do projeto para o GitHub.
- [ ] **Backend Robustecimento:** Migração para banco de dados relacional.
