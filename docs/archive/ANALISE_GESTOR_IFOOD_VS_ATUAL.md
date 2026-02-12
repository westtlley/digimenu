# Análise: Gestor iFood vs Gestor Atual (DigiMenu)

Este documento analisa a pasta `gestordepedidos.ifood.com.br` (cópia do Gestor de Pedidos do iFood) e lista **design** e **funções** que podem ser aproveitados no gestor atual do DigiMenu.

---

## 1. DESIGN – O que o iFood usa (adaptado à identidade DigiMenu)

### 1.1 Cores e identidade – **Laranja DigiMenu (#f97316 e variações)**

O Gestor de Pedidos usa a **identidade visual do DigiMenu**: laranja `#f97316` e variações. Cores de **erro, perigo e cancelamento** (vermelho) são mantidas para semântica.

| Uso | HEX | Tailwind | Onde usar no Gestor |
|-----|-----|----------|----------------------|
| **Principal** | `#f97316` | `orange-500` | Botões primários, ícone/logo, abas e menu ativo, badge “Ativos”, spinner de loading |
| **Hover** | `#fb923c` | `orange-400` | Botão primário hover (ou `#ea580c` para contraste maior) |
| **Active / pressionado** | `#ea580c` | `orange-600` | Botão active, borda da aba ativa |
| **Mais escuro (gradientes, destaque)** | `#c2410c` | `orange-700` | Gradiente do header do modal, extremo de gradientes |
| **Fundo claro** | `#fff7ed` | `orange-50` | Fundo de item ativo na sidebar, estado “selecionado” suave |
| **Fundo médio** | `#ffedd5` | `orange-100` | Cards de destaque, hover suave em áreas amplas |
| **Borda** | `#fed7aa` | `orange-200` | Bordas de cards, divisórias em contexto laranja |
| **Texto em fundo laranja** | `#fff` ou `#fff7ed` | `white` / `orange-50` | Texto sobre `orange-500`/`600` (botão, header) |
| **Cinza desabilitado** | `#A6A6A5` | `gray-400` | Botão disabled, placeholder |
| **Tela de loading (fundo)** | `#6b7280` | `gray-500` | Splash fullscreen (opcional) ou `gray-100` mais suave |
| **Erro / validação** | `#ef4444` | `red-500` | Input com erro, label de erro, “Atrasado”, Recusar, Cancelar |

**Escala completa (Tailwind) para referência:**

```
orange-50:  #fff7ed   orange-100: #ffedd5   orange-200: #fed7aa
orange-300: #fdba74   orange-400: #fb923c   orange-500: #f97316  ← principal
orange-600: #ea580c   orange-700: #c2410c   orange-800: #9a3412
orange-900: #7c2d12
```

**Onde aplicar (checklist):**

- **GestorPedidos.jsx:** spinner de loading, botão “Fazer login”, logo/ícone Package, abas “Agora”/“Agendados” (borda e texto ativo), sidebar (item ativo `bg-orange-50 text-orange-600`), badge “Ativos” e “Novos” em laranja, menu mobile (header `from-orange-500 to-orange-600`, item ativo `bg-orange-500`).
- **OrderDetailModal.jsx:** header do modal (`from-orange-600 to-orange-500`). Manter **vermelho** em: Recusar, Reprovada, alteração recusada, cancelar.
- **EnhancedKanbanBoard.jsx:** coluna “Em preparo” já em `orange-50`/`orange-600`. Manter **vermelho** em: “Atrasado”, `isLate`/`isVeryLate`.
- **DeliveryPanel.jsx:** botões “Mapa”/“Lista” ativos, “Novo entregador”, submit de formulários.
- **NotificationConfig.jsx / NotificationSettings.jsx:** ícone de volume, barra de volume, toggles de notificação (estado ativo), “Repetir até visualizar”.
- **GestorStatsPanel.jsx:** números de destaque, ícones de métrica (quando forem identidade, não “erro”).
- **AdvancedOrderFilters.jsx:** ícone de busca ativo, botão de filtro ativo (se houver).
- **designTokens.js:** `gestor: { primary, hover, active, ... }` apontando para a escala orange.

---

### 1.2 Tela de carregamento (splash)
O iFood usa:
- **Fundo:** `#7A7775`, tela cheia, centralizado.
- **Spinner:** dois anéis concêntricos girando; no DigiMenu: `#f97316` (orange-500) e `#ffedd5` (orange-100), animação `1.7s` linear.
- **Textos atraso:**  
  - 15s: “Isso está demorando mais que o esperado” / “Estamos verificando o seu problema!”  
  - 35s: “Vamos reiniciar seu Gestor de Pedidos. Aguarde.”  
  - 45s: `clearCache()` + reload.
- **Internacionalização:** `__localesModule` com `pt-BR`; mensagens por `id`.

**O que pegar:**
- Spinner de dois anéis (SVG) como opção na tela de loading do Gestor, quando `isLoading` no `GestorPedidos`.
- Mensagens de “demorou” e “vamos recarregar” em português, com `setTimeout` semelhantes (valores podem ser 10s / 20s / 30s para não ficar pesado).
- Não é obrigatório copiar o `clearCache`; pode só mostrar “Recarregar” e `window.location.reload()`.

---

### 1.3 Botões
```css
/* DigiMenu Gestor – laranja #f97316 */
background: #f97316;
border-radius: 4px;
color: #fff;
font-weight: 700;
padding: 13.5px 12px;
text-transform: uppercase;
transition: all .1s;
```
- **Secundário:** `.Button--plain` (#a6a6a5).
- **Disabled:** #a6a6a5, `cursor: not-allowed`.

**O que pegar:**
- `text-transform: uppercase` e `font-weight: 700` nos botões principais do Gestor (Aceitar, Recusar, Imprimir, etc.) para dar cara de “ação forte”.
- `border-radius: 4px` se quiser alinhar ao iFood; o DigiMenu já usa `rounded` do Tailwind, pode manter.
- Cores: `#f97316` (orange-500) e `#ea580c` (orange-600) para hover/active; `designTokens.gestor`.

---

### 1.4 Tipografia e ícones
- **Fontes:** `iFoodRCTextos-Bold`, `iFoodRCTextos-Medium`, `iFoodRCTextos-Regular` (woff2).
- **Ícones:** fontes custom `ifdl-icons-line` e `ifdl-icons-filled` (ex.: `ifdl-icon-order`, `ifdl-icon-chat`, `ifdl-icon-delivery`, `ifdl-icon-cutlery`, `ifdl-icon-configuration`, `ifdl-icon-search`, etc.).

**O que pegar:**
- **Não é necessário** usar as fontes do iFood (licença/identidade).  
- **Ideia:** manter Lucide no gestor, mas **organizar um conjunto de ícones por conceito** (pedido, chat, entrega, configuração, ocorrência) para ficar consistente, parecido com o que o iFood faz com a `ifdl`.

---

### 1.5 Skeleton / carregamento de conteúdo
O iFood usa `react-loading-skeleton`:
- `--base-color: #ebebeb`, `--highlight-color: #f5f5f5`, `duration: 1.5s`.
- Respeita `prefers-reduced-motion` desligando a animação.

**O que pegar:**
- Adicionar `react-loading-skeleton` (ou equivalente em CSS) no **Kanban** e no **modal de pedido** enquanto `isLoading` ou `!order`, para evitar “flash” de conteúdo vazio.
- Replicar a lógica de `prefers-reduced-motion` em qualquer loading animado.

---

### 1.6 Inputs (OTP e formulários)
- Inputs com `min-height: 52px`, `border-radius: 4px`, `border: 1px solid #dcdcdc`.
- Erro: `border: 2px solid #ff7752` e label `color: #ff7752`.
- Foco: `border: 1px solid #3e3e3e`.

**O que pegar:**
- Padrão de **estado de erro** (borda + cor) nos inputs do Gestor (ex.: tempo de preparo, motivo de cancelamento).
- Altura mínima ~52px em campos críticos (ex.: código de retirada, tempo de preparo) para toque fácil em tablet.

---

## 2. FUNCIONALIDADES – O que o iFood tem (inferido dos arquivos)

### 2.1 Sons por tipo de evento
O iFood usa **vários áudios** por contexto:

| Arquivo | Uso provável |
|---------|--------------|
| `placed-order-sound-1.ogg` / `placed-order-sound-2.mp3` | **Novo pedido** (2 opções) |
| `order-occurrence-sound.ogg` (3 variantes) | **Ocorrência** (problema, alteração, etc.) |
| `autoAcceptedOrder.mp3` | **Pedido aceito automaticamente** |
| `autoAcceptedTotemOrder.mp3` | Aceite automático via totem |
| `consumerChatMessage.mp3` | **Nova mensagem no chat com o cliente** |
| `are-you-there-sound.mp3` | **“Você está aí?”** (alerta de presença / inatividade) |

**O que pegar:**
- **Seleção de som por tipo** em `NotificationConfig` / `GestorSettings`:
  - Novo pedido (2–3 opções, incluindo a atual do DigiMenu).
  - Ocorrência / alteração (ex.: mudança de endereço, solicitação do cliente).
  - Aceite automático (som mais suave que o de “novo pedido”).
  - Mensagem no chat (cliente ou entregador) – quando existir chat com cliente.
- **“Está aí?” (are-you-there):** após X minutos sem interação, tocar um som e/ou mostrar um modal “Você ainda está aí?” para evitar que o operador deixe o gestor aberto sem atender. Pode ser opcional em Ajustes.

---

### 2.2 Conteúdo da home (banners / dicas)
API `gp-home-contents`: cards em carrossel (Slick) com:
- Anotaí (WhatsApp), iFood Shop, Saipos, vídeo de cancelamento, etc.
- Cada item: `content` (HTML), `contentImage`, `backgroundColor`, `externalUrl`, `contentFontColor`, `order`.

**O que pegar:**
- **Área “Dicas e atalhos”** na home do Gestor (ou numa aba “Início” ao lado de Quadros/Entregadores/Resumo/Ajustes):
  - Cards com: título, descrição curta, link (externo ou rota interna), cor de fundo, opcionalmente imagem.
  - Conteúdo inicial: atalhos de teclado (1–4, Ctrl+F, Esc), link para documentação, “Como cancelar um pedido”, “Impressão de comandas”, etc.
- Não precisa de backend: um JSON estático ou um `homeContents.js` com array de cards; o restante igual ao `gp-home-contents`.

---

### 2.3 Métricas e comparação com mês anterior
API de contagem:
```json
{
  "concludedOrdersCurrentMonth": 62,
  "concludedOrdersLastMonth": 68,
  "diffFromLastMonth": 91.17
}
```

**O que pegar:**
- No `GestorStatsPanel` (ou equivalente):
  - **Pedidos concluídos no mês** (já se aproxima com `orders` em `delivered`).
  - **Variação em relação ao mês passado** (`diffFromLastMonth`):  
    - Calcular no backend ou no front: `concluídos_mês_atual` vs `concluídos_mês_passado`, e exibir “+X%” ou “-X%” em relação ao mês anterior.
- Isso cobre a melhoria “Métricas reais” do `MELHORIAS_GESTOR_PEDIDOS.md`.

---

### 2.4 Tempo de preparo
API `localconfigs/preparationTime`:
```json
{
  "preparationtime-enabled": true,
  "isManualPreparationTimeEnabled": true,
  "canManageManualPreparationTime": true,
  "preparationTime": 20
}
```

**O que pegar:**
- **Tempo padrão** configurável em Ajustes (já existe `default_prep_time` no `GestorSettings`).
- **Sobreposição manual:** o iFood deixa alterar por pedido mesmo com padrão; o `OrderDetailModal` já permite editar `prep_time` ao aceitar. Garantir que:
  - O padrão seja sempre sugerido.
  - O operador possa alterar por pedido sem desativar o padrão global.
- Nomes como `preparationTime` / `isManualPreparationTimeEnabled` podem inspirar os labels em Ajustes (“Tempo de preparo padrão”, “Permitir alterar por pedido”).

---

### 2.5 QR Code para logística
API `shipping/merchants/.../logistics/qrcode`:
- `current.qrCode`, `startDate`, `expirationDate`, `printed`.
- Uso típico: entregador escaneia no restaurante para associar à logística.

**O que pegar (se fizer sentido no seu fluxo):**
- Se vocês tiverem “entrega própria” com identificação no ponto de saída:
  - Gerar um QR code por turno/sessão (ou por dia) e marcar “impresso” após imprimir.
  - Pode ser uma tela em Ajustes ou em “Entregadores”: “QR de saída para logística”.

---

### 2.6 Chat com o consumidor
- Sendbird + `consumerChatMessage.mp3` + labels como “Atendimento iFood”, “Digite sua mensagem”, “unreadMessageLabel”, “consumerChatEntryPoint”.
- Integração com fluxo de cancelamento (`cancellationHandshake.consumerChat`).

**O que pegar:**
- **Funcionalidade:** canal de chat **cliente–restaurante** por pedido (hoje o DigiMenu tem chat com entregador).
  - Requer backend (mensagens, leitura/não lida) e, se quiser, integração tipo Sendbird ou similar.
- **Design/UX:**
  - Ícone/botão de chat no card do pedido e no modal com contador de “não lidas”.
  - Som específico para nova mensagem do cliente (usar `consumerChatMessage` como referência de “tom” ao escolher o áudio).
- **Atalho:** no modal, botão “Chat com cliente” que abre o `OrderChatModal` (ou um `OrderConsumerChatModal`) quando o backend existir.

---

### 2.7 “Está aí?” (Are-you-there)
- `are-you-there` como experiência (`enabled-experiences`).
- Som `are-you-there-sound.mp3` quando o sistema detecta inatividade.

**O que pegar:**
- Após **N minutos** sem interação (clique, tecla, movimentação), disparar:
  - Som opcional (configurável em Ajustes).
  - Modal ou toast: “Você ainda está aí? O gestor está pausado.” com [Continuar] / [Pausar notificações].
- N e “ligado/desligado” configuráveis; ideal desligado por padrão até usuários pedirem.

---

### 2.8 App Electron (desktop)
- `IS_ELECTRON`, `electron.remote`, `electron-store` para persistência, “Clear cache”, “Clear storage”, “Open Dev Tools”, “Reload”.
- `clearCache` faz unregister de Service Workers + `caches.delete` + reload.

**O que pegar:**
- **Não** copiar o app Electron; o foco é o gestor web.
- **Sim:** a lógica de **“Clear cache” / “Recarregar”** pode ser reaproveitada:
  - Em Ajustes, link “Limpar cache e recarregar” para quem tiver problema de versão antiga em cache.
  - Implementação: `navigator.serviceWorker?.getRegistrations` + `unregister`; `caches?.keys` + `delete`; `localStorage` opcional; `location.reload()`.

---

### 2.9 Outros (APIs e conceitos)
- **Events polling:** `order/v1.0/events:polling` (FOOD, FOOD_SELF_SERVICE, GROCERY) – iFood usa polling; o DigiMenu já usa `refetchInterval`; manter ou evoluir para WebSockets quando fizer sentido.
- **Experiences:** `csat`, `are-you-there` – CSAT pode inspirar pesquisa de satisfação pós-entrega (já existe `EntregadorRating`; dá para estender para “avaliação do pedido”).
- **Chat de suporte (Atendimento iFood):** widget de suporte; pode ser um link “Fale conosco” ou iframe de suporte próprio no Gestor.

---

## 3. Resumo: o que implementar no gestor atual

### Design (prioridade)

| Item | Onde | Esforço |
|------|------|---------|
| Spinner de dois anéis na loading do Gestor | `GestorPedidos.jsx` (quando `isLoading`/splash) | Pequeno |
| Cores #f97316 / #ea580c (laranja) em botões e identidade | `designTokens.js` + classes `orange-500`/`orange-600` no Gestor | Pequeno |
| Botões de ação em UPPERCASE e font-weight 700 | `OrderDetailModal`, `EnhancedKanbanBoard`, header | Pequeno |
| Skeleton no Kanban e no modal | `EnhancedKanbanBoard`, `OrderDetailModal` | Pequeno |
| Mensagens de “demorou” / “recarregar” na loading | `GestorPedidos.jsx` ou componente `GestorLoading` | Pequeno |
| Padrão de erro em inputs (borda + cor) | `OrderDetailModal`, `GestorSettings`, `NotificationConfig` | Pequeno |

---

### Funcionalidades (prioridade)

| Item | Onde | Esforço |
|------|------|---------|
| Múltiplos sons por evento (novo pedido, ocorrência, aceite auto, chat) | `NotificationConfig`, `GestorSettings`, `GestorPedidos` (lógica de toque) | Médio |
| “Está aí?” (inatividade) | Novo `useInactivity` ou lógica em `GestorPedidos` + Ajustes | Médio |
| Métricas: pedidos concluídos no mês + diff mês anterior | `GestorStatsPanel` + backend ou cálculo no front | Pequeno–Médio |
| Área “Dicas e atalhos” (cards na home do gestor) | Nova seção/aba “Início” ou bloco no topo do Kanban | Médio |
| “Limpar cache e recarregar” em Ajustes | `GestorSettings` | Pequeno |
| Tempo de preparo: reforçar “permitir alterar por pedido” | `GestorSettings`, `OrderDetailModal` (labels/UX) | Pequeno |
| QR Code logística (se houver entrega própria com ponto de saída) | Nova tela em Ajustes ou Entregadores | Médio (se fizer sentido) |
| Chat com cliente (quando houver backend) | `OrderDetailModal`, novo `OrderConsumerChatModal`, som `consumerChat` | Grande |

---

## 4. O que o gestor atual já tem e está alinhado ao iFood

- Kanban com drag-and-drop (colunas por status).
- Modal de detalhe com aceitar, recusar, tempo de preparo, códigos (retirada/entrega).
- Notificações (som único, browser, por status).
- Aceite automático.
- Filtros e busca.
- Mapa de entregadores.
- Chat com entregador.
- Ajustes (tempo de preparo padrão, impressora, notificações, templates).
- Resumo financeiro (FinancialDashboard).
- Exportar CSV/PDF, atalhos 1–4 / Ctrl+F / Esc, alerta de atraso no Kanban, etc.

Ou seja: a **base** já está próxima; as melhorias acima trazem **refinamento de UX** e **funcionalidades extras** que deixam o gestor mais parecido com o do iFood em experiência, sem depender da infraestrutura específica do iFood (APIs, Sendbird, Electron).

---

## 5. Arquivos de referência na pasta do iFood

- `gestordepedidos.ifood.com.br/index.html` – splash, loading, cores, mensagens, `clearCache`.
- `gestordepedidos.ifood.com.br/32.0c5bdd4dc412b541.css` – ícones `ifdl-*`, skeleton.
- `gestordepedidos.ifood.com.br/195.d8d3baa5fb85a403.css` – `.Button`, `.OTPStep`, Slick.
- `gestordepedidos.ifood.com.br/*.mp3` e `*.ogg` – referência de tipos de som (nomes e uso).
- `merchant-api.ifood.com.br/orderManager/.../gp-home-contents.html` – estrutura dos cards da home.
- `merchant-api.ifood.com.br/orderManager/.../orders/count.html` – métricas (mês atual/anterior).
- `merchant-api.ifood.com.br/orderManager/.../localconfigs/preparationTime.html` – tempo de preparo.
- `merchant-api.ifood.com.br/orderManager/.../logistics/qrcode.html` – QR logística.

Se quiser, posso detalhar a implementação de algum ítem (por exemplo: sons por evento, “Está aí?”, ou área de dicas na home) em passos de código.

---

## 6. Detalhamento de implementação – Laranja #f97316

Substituições **Tailwind** aplicadas no Gestor: `red-*` → `orange-*` em identidade (**GestorPedidos**, **OrderDetailModal** header, **DeliveryPanel**, **NotificationSettings**, **AdvancedOrderFilters**). Manter `red` em erro, atraso, cancelar, recusar, Remover. **designTokens.gestor:** `primary` #f97316, `primaryHover` #ea580c, `primaryBg` #fff7ed. **Spinner:** `stroke` #f97316 e #ffedd5.
