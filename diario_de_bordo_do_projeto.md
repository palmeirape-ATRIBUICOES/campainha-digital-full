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

## 🔒 v2.4.0 e v2.5.0 — Privacidade, Código no Painel e UI Premium (09/05/2026)

### Correções de Cadastro
- Reset da lista de unidades (`unitsList`) no `AdminPanel` ao trocar entre Individual / Condomínio (Bug Corrigido).
- Exibição de contador de unidades no botão "Adicionar".

### Privacidade no Histórico do Admin
- Adicionado um filtro de segurança baseado no dispositivo (`localStorage: cd_admin_props`).
- Administradores visualizam **apenas o histórico das propriedades que eles mesmos criaram**, impedindo vazamento de dados de outras contas e condomínios no banco compartilhado.

### Nova Interface de Autenticação (ResidentLogin)
- **Redesign Absoluto:** Substituição da interface antiga por um design de alto padrão (Glassmorphism, Dark Mode Profundo, Gradientes Aurora).
- Tipografia em alto contraste com feedback tátil de foco para a digitação dos códigos.

### Experiência do Morador
- **Código no Painel de Espera:** Enquanto aguarda chamadas (`idle` state), o painel agora exibe em grande destaque o `Código de Acesso` da unidade, facilitando o compartilhamento e memorização.
- **Botão Sair Imediato:** Botão "Sair do App" posicionado de forma ergonômica, que desloga o usuário e o envia diretamente para o `/morador-login` (novo PWA) limpando as credenciais seguras do navegador.

---

## 📲 v2.6.0 — Compartilhamento Inteligente e Cópia Robusta (10/05/2026)

### Melhoria no Botão Copiar
- Navegadores às vezes bloqueiam a API nativa do `navigator.clipboard` se o ambiente não for HTTPS rigoroso ou em certos webviews.
- Adicionado um **fallback automático** (plano B) que recria a função de cópia criando um input invisível e usando `document.execCommand('copy')`. O botão de copiar agora funciona 100% das vezes em qualquer cenário.

### Novo Recurso: Compartilhar no WhatsApp
- Criado o componente `WhatsAppButton` no `AdminPanel.jsx`.
- Ao lado do código do morador, agora existe um botão "WHATSAPP" verde de alto contraste.
- Ao clicar, ele já abre o app do WhatsApp (via API `wa.me`) com uma **mensagem pré-formatada amigável** contendo:
  1. Texto explicativo sobre o aplicativo.
  2. A chave / código único de acesso do morador.
  3. O link exato do PWA de login direto (pego automaticamente via `window.location.origin`).

---

## 💎 v2.8.0 — Master Admin White Theme & Dossiê Detalhado (12/05/2026)

### Redesign Visual (White Theme)
- Mudança radical da estética escura/brutalista para um design **White Theme (Clean & Professional)**.
- Fundo em cinza ultra-claro (`#F8FAFC`) com painéis brancos puros e sombras suaves.
- Sidebar fixa em branco com tipografia em `Inter` de alto contraste.
- Cards estatísticos com indicadores de performance (ex: faturamento estimado, variação percentual).

### Gestão Detalhada de Clientes & Empresas
- **Dossiê do Cliente**: Adição de campos detalhados para **Razão Social/Empresa**, **CPF/CNPJ**, **Plano de Assinatura** e **Endereço Completo**.
- **Dashboard Analítico**: Sidebar agora inclui links funcionais para "Análise de Dados", "Logs do Sistema" e "Configurações de Rede".
- **Visualização Expandida**: Implementado modal de detalhes ("Dossiê") para visualização profunda de todos os dados de um cliente específico sem sair da lista principal.

### Melhorias de UX
- Campo de busca global aprimorado (busca por empresa, documento ou código).
- Sistema de cores semântico para planos (Basic, Pro, Enterprise).
- Feedback visual de status global (Operacional/Offline) integrado ao Master Admin.

---

## ☁️ v2.9.0 — Migração Global para White Theme (12/05/2026)

### Padronização Visual (Premium Clean)
- **Migração Completa de Todos os Painéis**: `AdminPanel`, `ResidentDashboard`, `PorteiroDashboard` e `ResidentPanels` foram totalmente redesenhados para o **White Theme**.
- **Consistência de Marca**: Agora todo o ecossistema segue a estética do Master Admin (Fundo `#F8FAFC`, Cards `#FFFFFF` com sombras suaves e bordas sutis).
- **Paleta de Cores**: Substituição do Ciano `#00E5FF` pelo Azul Profissional `#3B82F6` como cor primária global.
- **Tipografia & Contraste**: Melhoria drástica na legibilidade com textos em `#0F172A` e `#64748B`.

### Fluxos de Autenticação Redesenhados
- **Páginas de Login**: `ResidentLogin`, `PorteiroLogin` e `AuthPage` (Admin) agora possuem um visual limpo, focado em conversão e facilidade de uso, mantendo o banner de PWA integrado.
- **Elementos de UI**: Atualização do `index.css` com variáveis globais para o tema claro, garantindo que novos componentes já nasçam no padrão visual correto.

### Melhorias de Infraestrutura UI
- **Shadow Tokens**: Implementação de sombras multinível para criar profundidade em superfícies brancas.
- **Border System**: Uso de `--border-subtle` (`#E2E8F0`) para delimitação de seções sem poluição visual.

---

## 🔧 v2.9.1 — Correção de Cadastro & Simplificação Master HQ (12/05/2026)

### Correções de Backend
- **Fix 500 Error**: Corrigido erro de referência no endpoint `POST /api/properties` onde as variáveis `companyName` e `plan` não estavam sendo extraídas do corpo da requisição, causando falha no registro de novos clientes.
- **Normalização de Acesso**: Adicionado `.trim().toUpperCase()` nos endpoints de login e registro de moradores para garantir que códigos digitados com espaços ou minúsculas funcionem corretamente.

### UX & Interface (Master HQ)
- **Limpeza de Interface**: Removidos módulos redundantes ou não funcionais solicitados pelo usuário: "Logs do Sistema", "Rede Global", "Preferências" e "Banco de Dados".
- **Foco Operacional**: O painel Master agora foca exclusivamente no que é essencial: **Gerenciar Clientes** e **Novo Registro**.

---

## 🛠️ Próximos Passos
- [ ] Implementação real dos gráficos no módulo de Analytics.
- [ ] Integração Pix automatizada via API de pagamentos.
- [ ] Sistema de notificações push (FCM) para o Master Admin sobre novas ativações.
- [ ] Migração final para PostgreSQL/Neon.

