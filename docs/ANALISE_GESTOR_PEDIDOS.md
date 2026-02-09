# Análise e Crítica – Gestor de Pedidos Avançado

Documento de revisão do **Gestor de Pedidos** (`GestorPedidos.jsx` e componentes relacionados), com foco em arquitetura, UX, segurança e manutenção.

---

## 1. Visão geral

O Gestor de Pedidos é a tela central para operação de pedidos: **Agora** / **Agendados**, quadros Kanban com drag-and-drop, painel de entregadores, resumo financeiro e ajustes. Inclui notificações (som, vibração, notificação do navegador), atalhos de teclado, auto-aceitar e “Está aí?” por inatividade.

---

## 2. Pontos positivos

### 2.1 Arquitetura e organização
- **Separação de views**: Início, Quadros (Kanban), Entregadores, Resumo, Ajustes, com sidebar fixa e menu mobile.
- **Componentes dedicados**: `EnhancedKanbanBoard`, `AdvancedOrderFilters`, `OrderDetailModal`, `DeliveryPanel`, `GestorSettings`, `GestorStatsPanel` – responsabilidades bem delimitadas.
- **Contexto multi-estabelecimento**: Uso de `useSlugContext` e `asSub` para listar pedidos do slug/assinante correto; controle de acesso por `canAccessSlug` e `hasModuleAccess('gestor_pedidos')`.

### 2.2 Experiência do usuário
- **Filtros avançados**: Status, período (hoje/semana/mês), entregador, horário agendado, valor min/max, tipo de entrega/pagamento, produto no pedido.
- **Kanban com drag-and-drop** (`@hello-pangea/dnd`): arrastar pedido entre colunas atualiza status; colunas agrupadas (Em preparo → Pronto → Em rota → Finalizados).
- **Atalhos de teclado**: Esc (fechar), Ctrl+F (busca), Ctrl+R (atualizar), K/D/R/S/H (views), N (só novos), 1–5 (status no modal), Shift+F (filtros).
- **Notificações**: som configurável, vibração, notificação do navegador, por status; “Está aí?” após N minutos de inatividade.
- **Detalhe do pedido**: timeline, chat, aceitar/rejeitar, tempo de preparo, atribuir entregador, duplicar, fila de impressão.

### 2.3 Dados e tempo real
- **Polling a cada 3s** para pedidos e entregadores (adequado para “tempo quase real” sem WebSocket).
- **Filtro de origem**: exclusão de pedidos PDV e balcão no Gestor (`order_code?.startsWith('PDV-')`, `delivery_method === 'balcao'`).
- **Tempo de preparo sugerido**: média dos últimos pedidos com `accepted_at` e `ready_at`.

### 2.4 Acessibilidade e preferências
- **Redução de movimento**: `EnhancedKanbanBoard` usa `prefers-reduced-motion` para animações.
- **Atualização de “Há X min”**: intervalo de 1 min no Kanban para não ficar estático.

---

## 3. Problemas e críticas

### 3.1 Código morto
- **`KanbanBoard`** é importado em `GestorPedidos.jsx` mas não é usado; só `EnhancedKanbanBoard` aparece.  
**Sugestão:** remover o import de `KanbanBoard`.

### 3.2 Auto-cancelamento de pedidos atrasados
- Pedidos são **cancelados automaticamente** quando `minutosDecorridos > prep_time + 10` (a cada 1 minuto).
- Não há confirmação do operador; um pedido só atrasado (ex.: cliente ainda esperando) pode ser cancelado sem aviso.
- **Risco:** insatisfação do cliente e perda de venda.  
**Sugestões:**
  - Tornar **configurável** em GestorSettings (ativar/desativar e margem em minutos).
  - Ou substituir por **alerta** (badge/toast) e ação manual de “Cancelar por atraso”.

### 3.3 Autorização gerencial não aplicada
- **Exportar CSV** e **Relatório do dia (PDF)** no header do Gestor não passam por `useManagerialAuth`.
- No resto do sistema, exportar e ações sensíveis já exigem matrícula/senha (ex.: FinancialDashboard, DishesTab).
- **Duplicar pedido** no `OrderDetailModal` também não exige autorização gerencial.  
**Sugestão:** usar `requireAuthorization('exportar', …)` para CSV/PDF e `requireAuthorization('duplicar', …)` antes de duplicar o pedido; exibir o modal do Gestor e renderizar `modal` na página.

### 3.4 Sincronização do estado de filtros
- `filteredOrders` é estado no pai; `AdvancedOrderFilters` aplica filtros e chama `onFilterChange(filtered)`.
- Inicialização: `useEffect` só preenche `filteredOrders` quando `!searchTerm && filteredOrders.length === 0`; na primeira render, `filteredOrders` pode estar `[]` e o Kanban ficar vazio até o efeito rodar.
- Se o usuário limpar a busca (`searchTerm`), o pai não reaplica `baseFilteredOrders` em `filteredOrders`; depende do filho ter “limpar” e chamar `onFilterChange` com a lista correta.  
**Sugestão:** quando `searchTerm` voltar a ser vazio, o pai pode fazer `setFilteredOrders(baseFilteredOrders)` em um `useEffect` dependente de `searchTerm` e `baseFilteredOrders`, ou centralizar a lógica de “lista exibida” em um único lugar (ex.: sempre derivar da busca + filtros no pai).

### 3.5 Configurações apenas em localStorage
- `gestorSettings` e `gestor_notification_config` ficam só em `localStorage`.
- Não há persistência no backend: troca de dispositivo ou navegador perde configurações (auto-aceitar, tempo de preparo padrão, “Está aí?”, notificações por status, etc.).  
**Sugestão (médio prazo):** endpoint de preferências do gestor por usuário/estabelecimento e carregar/salvar essas opções no backend.

### 3.6 Performance e polling
- `refetchInterval: 3000` busca **todos** os pedidos a cada 3s.
- Em lojas com muitos pedidos (centenas/milhares), o payload e o re-render podem pesar.  
**Sugestões:**  
  - Paginação ou “só ativos” (ex.: não entregues/não cancelados) na API.  
  - Ou aumentar o intervalo quando a aba estiver em background (Page Visibility API).

### 3.7 Invalidação em loop (auto-cancel)
- No `useEffect` de auto-cancel, para cada pedido cancelado chama-se `queryClient.invalidateQueries({ queryKey: ['gestorOrders'] })` dentro do `for`.
- Várias invalidações seguidas podem gerar refetch múltiplos.  
**Sugestão:** acumular os pedidos a cancelar, fazer os updates e invocar `invalidateQueries` **uma vez** após o loop.

### 3.8 Descoberta dos atalhos
- Atalhos (K, D, R, S, H, N, 1–5) são poderosos mas pouco óbvios.
- “Dicas” aparecem só na view **Início** (`GestorDicasAtalhos`); em Quadros o usuário pode não saber que existem.  
**Sugestão:** botão “Atalhos” ou “?” no header que abre um pequeno modal/panel com a lista (ex.: “K = Quadros, D = Entregadores…”).

### 3.9 Tratamento de erros
- Vários `try/catch` vazios ou que só fazem `console.error` (ex.: `loadGestorSettings`, `playNotificationSound`, efeito de auto-aceitar).
- Falhas de rede ou de API podem passar silenciosas para o usuário.  
**Sugestão:** padrão mínimo: toast de erro em ações críticas (aceitar, rejeitar, atualizar status) e log em desenvolvimento.

### 3.10 Coluna “Em preparo” muito carregada
- Uma única coluna agrupa `new`, `accepted` e `preparing`.
- Em picos, a coluna fica longa e difícil de escanear.  
**Sugestão:** subcolunas ou separar em “Novos” / “Aceitos” / “Em preparo” (ou manter 3 colunas e mover entre elas apenas por drag), e ordenar por data (mais antigo no topo).

---

## 4. Resumo das prioridades

| Prioridade | Item | Ação sugerida |
|------------|------|----------------|
| Alta | Autorização gerencial em export/duplicar | Integrar `useManagerialAuth` em CSV, PDF e duplicar pedido |
| Alta | Auto-cancel agressivo | Tornar configurável ou trocar por alerta + cancelamento manual |
| Média | Import morto | Remover import de `KanbanBoard` |
| Média | Estado filteredOrders / busca | Sincronizar quando searchTerm limpar; ou derivar lista no pai |
| Média | Invalidação em loop | Uma única `invalidateQueries` após o loop de auto-cancel |
| Baixa | Atalhos pouco visíveis | Botão “Atalhos” ou “?” no header com resumo |
| Baixa | Configurações só local | Persistir preferências do gestor no backend |
| Baixa | Performance com muitos pedidos | Paginação ou refetch condicional (ex.: aba em foco) |

---

## 5. Conclusão

O Gestor de Pedidos está **bem estruturado**, com boa separação de componentes, filtros avançados, Kanban com drag-and-drop e atalhos úteis. Os principais pontos a corrigir são: **alinhar export e duplicar à autorização gerencial**, **revisar o auto-cancel** para não impactar clientes e **evitar código morto e efeitos colaterais desnecessários** (invalidação em loop, estado de filtros). Com esses ajustes, o módulo fica mais seguro, previsível e fácil de evoluir.
