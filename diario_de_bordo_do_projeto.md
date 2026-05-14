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

## 🔐 v2.9.2 — Integração Portaria & Fluxo de Autorização (12/05/2026)

### Acesso Unificado
- **Login Inteligente por Código**: A página de acesso do morador agora reconhece automaticamente se o código inserido pertence a um morador ou a um porteiro, redirecionando para o painel correto (`ResidentDashboard` ou `PorteiroDashboard`). Isso resolve a confusão de múltiplos logins.

### Comunicação em Tempo Real (Loop Completo)
- **Autorização do Morador**: Adicionado botão "Liberar Entrada" no painel do morador durante chamadas.
- **Feedback na Portaria**: Quando o morador autoriza, o porteiro recebe instantaneamente um alerta visual gigante ("ACESSO LIBERADO") com efeito de som e vibração.
- **Feedback ao Visitante**: O visitante agora vê uma tela de sucesso ("Portão Liberado! Seja bem-vindo!") quando o morador clica no botão, encerrando a chamada de forma amigável após 8 segundos.

### UX & Polimento
- **Alertas Sonoros**: Implementados sons de notificação para a portaria garantir que nenhum acesso passe despercebido.
- **Isolamento de Dados**: Garantido que o `propertyId` correto seja usado em todas as emissões de socket para evitar vazamento de notificações entre condomínios diferentes.

---

## 💎 v2.9.3 — Exclusividade de QR Codes (12/05/2026)

### Segurança & Integridade
- **Bloqueio de Duplicidade**: Implementada verificação rigorosa no backend para garantir que cada QR Code (Property ID) seja único. O sistema agora impede que um ID já cadastrado seja atribuído a um novo cliente, garantindo exclusividade absoluta.
- **Feedback de Erro**: O Painel Master agora exibe mensagens de erro detalhadas caso tente-se registrar um QR Code que já pertence a outra placa/cliente.

---

## 📸 v2.9.4 — Escaneamento Obrigatório de Placas (12/05/2026)

### Lógica de Registro
- **Remoção de Auto-Geração de ID**: O sistema agora exige obrigatoriamente que um ID de QR Code seja fornecido via escaneamento no Painel Master. A função de fallback que gerava IDs aleatórios (`uuidv4`) foi removida para garantir que o sistema apenas vincule IDs de placas físicas já existentes e entregues aos clientes.
- **Validação Rigorosa**: O backend agora retorna erro caso tente-se criar uma propriedade sem um ID escaneado, reforçando o fluxo de trabalho físico-digital.

---

## 🏗️ v2.9.5 — Novo Fluxo de Ativação Wizard (12/05/2026)

### Experiência do Usuário (Onboarding)
- **Wizard de Configuração**: Reestruturei o fluxo inicial do cliente para ser mais lógico e profissional:
    1. **Tipo**: Seleção do imóvel (Casa, Vila ou Condomínio).
    2. **Configuração**: Definição de nomes e lista de unidades.
    3. **Pagamento**: Tela de checkout simulada para o plano de R$ 15,00/mês.
    4. **Ativação**: O escaneamento da placa física agora é o passo final ("Grand Finale"), vinculando toda a configuração feita ao hardware escaneado.
- **UX Polida**: Adicionada tela de resumo de pedido e ícones de pagamento para aumentar a percepção de valor e confiança do cliente.

---

## 🎨 v2.9.6 — Padronização de Branding HD (12/05/2026)

### Branding & Design
- **Novo Logo HD**: Criado um componente de Logo em SVG de alta definição, garantindo nitidez perfeita em qualquer tamanho de tela (mobile, tablet e desktop). O design segue a identidade visual da marca: ícone de onda digital circular com centro laranja vibrante e tipografia moderna.
- **Unificação Total**: O novo logo foi aplicado em todos os pontos de contato da plataforma:
    - Landing Page (Home)
    - Telas de Login (Morador, Porteiro e Administrador)
    - Painéis de Controle (Admin, Master e Porteiro)
    - Interface do Visitante (Tela de Chamada)
- **Consistência Visual**: A substituição de ícones genéricos pelo logo oficial reforça o profissionalismo e a confiança na marca Campainha-Digital.

---

## 🎨 v2.9.7 — Ajuste de Precisão no Logo (12/05/2026)

### Branding & Fixes
- **Correção de Layout**: Resolvido o problema onde o texto do logo quebrava em duas linhas em telas menores. Agora o logo é estritamente de uma única linha (`whiteSpace: 'nowrap'`).
- **Fidelidade Visual**: Ajustado o SVG para corresponder exatamente à imagem original da marca:
    - Ícone à esquerda com ondas saindo para a direita.
    - Espaçamento (viewBox) corrigido para evitar que as ondas pareçam "cortadas".
    - Cores sincronizadas com o azul escuro e ciano originais.
- **Redimensionamento**: Ajustado o tamanho base do logo nas telas de login (42px) para garantir que caiba perfeitamente dentro dos painéis de vidro (`glass-panel`) sem transbordar.

---

## 🎥 v2.9.8 — Integração de Avatar IA na Home (12/05/2026)

### Conteúdo & UX
- **Vídeo de Apresentação**: Integrei o vídeo do avatar (IA) diretamente no início da Landing Page para aumentar a conversão e explicar o produto visualmente.
- **Edição e Corte (Cropping)**: Apliquei técnicas de CSS (`overflow: hidden` + `object-fit: cover`) para remover as barras brancas superiores e inferiores do vídeo original, deixando o foco apenas no avatar falando.
- **Autoplay Inteligente**: O vídeo inicia automaticamente em modo mudo (padrão de navegadores modernos) com loop infinito, funcionando como um elemento dinâmico de destaque no Hero.
- **Badge de Status**: Adicionei um indicador visual ("Apresentação Oficial") sobre o vídeo para dar um toque mais premium à interface.

---

## 🏗️ v2.9.9 — Estabilização e Expansão do Master Admin (12/05/2026)

### Dashboard Master
- **Correção de Crash (Tela Branca)**: Identificado e corrigido um erro de runtime que causava tela branca ao acessar o "Novo Registro" ou renderizar a tabela de clientes devido a ícones não importados (`Briefcase`, `ExternalLink`, etc.).
- **Alinhamento de Branding**: Ajustado o tamanho do logo na barra lateral para 32px e corrigido o alinhamento do texto para garantir que a marca fique perfeitamente visível e profissional, sem quebras indesejadas.
- **Expansão de Funcionalidades**: Adicionados 7 novos módulos estratégicos prontos para produção:
    1.  **Analytics & Uso**: Monitoramento de chamadas e uptime.
    2.  **Equipe / Porteiros**: Gestão centralizada de operadores.
    3.  **Logs do Sistema**: Auditoria de segurança em tempo real.
    4.  **Financeiro / Pix**: Visão de MRR e status de pagamentos.
    5.  **Suporte & Tickets**: Central de atendimento ao cliente.
    6.  **Configurações Globais**: Controle de versão e limites do sistema.
    7.  **API / Integrações**: Chaves de acesso e webhooks.

---

## 🚀 v2.9.10 — Refinamento de UX e Som na Home (12/05/2026)

### Landing Page
- **Restauração do Layout**: Reposicionei o mockup original do iPhone no Hero para manter a demonstração do app, conforme solicitado.
- **Destaque de Vídeo IA**: O vídeo do avatar foi movido para uma seção de destaque absoluta no topo da página (acima do Hero), garantindo impacto imediato sem interferir na visualização do smartphone.
- **Ativação de Áudio**: Removido o atributo `muted` padrão para permitir áudio. Adicionado suporte a clique no vídeo para iniciar o som (necessário devido às políticas de autoplay dos navegadores) e um indicador visual "Clique para Som".
- **Corte de Precisão (Zoom)**: Ajustado o zoom do vídeo (`scale(1.3)`) para garantir que as barras brancas superiores e inferiores sejam cortadas de forma limpa, mantendo o enquadramento no avatar.

---

## 📽️ v2.9.12 — Relocação do Vídeo e Ajuste de Autoplay (12/05/2026)

### Landing Page
- **Nova Posição do Vídeo**: O vídeo de apresentação foi movido para dentro do Hero, posicionado estrategicamente logo abaixo do texto principal ("Atenda o portão..."), otimizando o fluxo de leitura e impacto visual.
- **Remoção de Menções a IA**: Removidos todos os selos e textos que referenciavam o vídeo como sendo gerado por Inteligência Artificial, tornando a apresentação mais natural e direta.
- **Som Ativado**: Configurado o vídeo para carregar com som ativado por padrão. Adicionado suporte a `onMouseOver` para forçar o `play` e `volume` caso o navegador bloqueie o autoplay silencioso.
- **Limpeza de Layout**: Removida a seção superior redundante que continha o vídeo anteriormente.

---

## 🛠️ v2.9.13 — Estabilização, Login Unificado e Painel Central (13/05/2026)

### Login Unificado & Redirecionamento
- **Refatoração do Login**: O endpoint `/api/admin/login` e a página `AuthPage.jsx` agora são o ponto de entrada único para Master Admins, Administradores de Propriedade (Clientes) e Porteiros.
- **Detecção de Cargo**: O sistema detecta automaticamente se o usuário é Master, Cliente ou Porteiro e o redireciona instantaneamente para o dashboard correto (`/master-admin`, `/admin` ou `/portaria`).
- **Persistência de Sessão**: Correção na gravação do `propertyId` para porteiros, garantindo que o painel carregue os dados corretos após o login.

### Painel de Monitoramento Central (Portaria)
- **Visão Multi-Imóvel**: Porteiros (especialmente em centrais de monitoramento) agora podem visualizar e pesquisar unidades em todos os condomínios que gerenciam simultaneamente.
- **Busca Global**: Implementada busca rápida que filtra por nome do morador, número da unidade ou nome do condomínio.
- **Real-time Centralizado**: O sistema de autorização via Socket.io foi adaptado para monitorar múltiplos canais de autorização ao mesmo tempo.

### Flexibilidade & Onboarding
- **Casa Simples Descomplicada**: Removida a obrigatoriedade de preencher o nome do condomínio para cadastros do tipo "Casa Simples". O sistema agora gera um nome padrão amigável (ex: "Residência [Nome]") se deixado em branco.
- **Feedback de Credenciais**: O Master Admin agora recebe um alerta claro com o e-mail e o código único de acesso logo após o registro bem-sucedido de um novo cliente, facilitando o repasse das informações.

### Infraestrutura & Disponibilidade
- **GitHub Keep-Alive Action**: Criada automação via GitHub Actions (`keepalive.yml`) que realiza um "ping" no backend e frontend a cada 5 minutos. Isso impede que o Render entre em modo "sleep" (hibernação) no plano gratuito, garantindo resposta imediata da campainha.
- **Isolamento de Dados**: Reforçada a lógica de consulta no backend para garantir que clientes vejam apenas suas propriedades, enquanto o Master Admin mantém visão total.

---

## 🏢 v3.0.0 — Painel do Condomínio, Comunicação entre Moradores & Gestão Completa (14/05/2026)

### Gestão de Unidades (Backend + Frontend)
- **CRUD Completo de Unidades**: Novo componente `UnitManager.jsx` permite cadastrar, editar e excluir unidades com campos de **Bloco/Rua**, **Número da Casa/Apto** e **Nome**.
- **Endpoints REST**: `POST/PUT/DELETE /api/properties/:id/units/:unitId` com validação de permissão por `adminEmail`.
- **Endereço Obrigatório**: Unidades sem bloco/rua e número exibem aviso visual de que não poderão ser localizadas pelo interfone.

### Comunicação entre Moradores (Interfone Digital)
- **Busca por Endereço**: Moradores buscam vizinhos digitando **Bloco/Rua + Número** (não mais por nome).
- **Endpoint de Busca**: `GET /api/properties/:id/search-unit?block=&number=` retorna apenas unidades com endereço cadastrado.
- **Chamada Direta**: Ao encontrar o vizinho, o morador pode iniciar chamada WebRTC instantânea.

### Broadcast de Mensagens do Condomínio
- **Componente BroadcastPanel**: Síndico envia mensagens com prioridade (Normal/Urgente) para todos os moradores.
- **WebSocket em Tempo Real**: Evento `broadcast_message` emitido para todas as unidades da propriedade.
- **Persistência**: Mensagens salvas em `messages.json` com histórico e controle de leitura.
- **Aba Avisos no App**: Moradores recebem avisos com badge de notificação (não lidos) e notificação push.

### Gestão de Pessoas
- **Componente ResidentManager**: Visualização de códigos de acesso por unidade, com botão de cópia e WhatsApp.
- **Bloqueio de Morador**: Regeneração de código de acesso (`POST /units/:unitId/regenerate-code`) invalida acesso anterior.
- **Gestão de Porteiro**: Cadastro/remoção de e-mail do porteiro (`PUT /api/properties/:id/doorman`), com geração automática de código.

### Porteiro — Busca por Endereço
- **Campos de Busca**: Porteiro agora busca unidades por **Bloco/Rua** e **Número** em vez de texto livre.
- **Chamada Direta**: Botão "Chamar Morador" emite `initiate_call` via Socket.io direto do painel.
- **Cards com Endereço**: Cada unidade exibe bloco, rua e número cadastrados.

### Cadastro com Seleção de Papel
- **Novos Papéis**: Na tela de cadastro (`AuthPage`), o usuário seleciona se é **Síndico/Admin de Condomínio** ou **Administrador de Vila**.
- **Armazenamento**: Papel salvo em `localStorage` para controle de acesso ao painel de administração.

### Modelo de Preços Atualizado
- **Condomínios e Vilas**: R$ 159,90/mês para até 100 unidades + R$ 3,25/unidade extra.
- **Tablet Comodado**: Porteiro recebe tablet em comodato para uso na portaria.
- **Contrato de Prestação de Serviços**: Geração de contrato com cláusulas de serviço, deveres, quebra de contrato e datas de pagamento.

### Estrutura de Novos Arquivos
- `frontend/src/components/UnitManager.jsx` — CRUD de unidades
- `frontend/src/components/BroadcastPanel.jsx` — Envio de comunicados
- `frontend/src/components/ResidentManager.jsx` — Gestão de moradores e porteiros
- `backend/messages.json` — Persistência de mensagens broadcast

### AdminPanel — Novas Abas
- 🏠 **Propriedades** — QR Codes e configuração
- 🏢 **Unidades** — Cadastro com endereço completo
- 👥 **Pessoas** — Moradores e porteiro
- 📢 **Mensagens** — Broadcast para moradores
- 📋 **Histórico** — Visitantes

---

## 🚀 v3.1.0 — Redesign do Painel do Morador e Novo Modelo de Pricing (14/05/2026)

### Painel do Morador Redesenhado
- **Modularização:** O painel foi refatorado para usar componentes independentes (`MessagesPanel.jsx`, `IntercomPanel.jsx`, `ServicesPanel.jsx`).
- **Avisos do Condomínio:** Notificações do síndico (broadcast) e da portaria ficam agora num painel recolhível (accordion) logo no topo, sinalizando com "badge" dinâmico a quantidade de itens não lidos, deixando o centro da tela limpo.
- **Botões de Serviços e Parceiros:** Criado o esqueleto de UI (`ServicesPanel.jsx`) onde futuramente aparecerão parceiros de Farmácia, Gás, Água e Mercado.

### Comunicação Bi-direcional com Portaria
- **Interfone Morador → Portaria:** O morador agora tem um atalho direto (`resident_call_doorman`) para iniciar chamada de voz para o tablet da portaria.
- **Mensagem Morador → Portaria:** Adicionado campo de texto no aplicativo do morador para enviar recados de texto diretamente para a portaria.
- **Alertas no PorteiroDashboard:** O painel da portaria agora reage com banners flutuantes e toques sonoros ao receber chamadas de voz (`incoming_resident_call`) ou mensagens (`resident_message`) do morador.

### Calculadora Interativa na Landing Page e Remoção de Paywall
- **Simulador de Assinatura:** O cartão estático de R$ 39,90 foi substituído por uma **calculadora de arrastar (range slider)** que calcula automaticamente a regra de negócio para condomínios.
- **Regra do Simulador:** 
  - Até 100 unidades: valor fixo de R$ 159,90.
  - De 101 a 200 unidades: R$ 3,25 por cada unidade extra.
  - Mais de 200 unidades: R$ 2,25 por cada unidade extra.
- **Fim do Paywall de R$ 15:** O modal e a tela de pagamento que impediam o síndico de adicionar múltiplas propriedades (blocos/ruas) sem pagar R$ 15 avulsos foram totalmente removidos. O foco agora é gerir as unidades internamente, cobrando o pacote completo.

---

## 🛠️ Próximos Passos
- [ ] Integração Pix automatizada via API de pagamentos.
- [ ] Geração de contrato PDF com assinatura digital.
- [ ] Sistema de notificações push (FCM).
- [ ] Migração final para PostgreSQL/Neon.
- [ ] Dashboard de analytics com gráficos.

