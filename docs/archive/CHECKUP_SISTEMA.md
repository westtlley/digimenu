# Checkup do Sistema DigiMenu

Relatório de verificação e correções aplicadas para finalizar o projeto antes da oferta.  
**Data:** 2025 (atualização contínua)

---

## ✅ Correções Aplicadas

### 1. Ícone Grid3x3 → LayoutGrid

- **Problema:** Erro em produção `Grid3x3 is not defined` (ou possível tree-shaking em alguns bundles).
- **Solução:** Substituído `Grid3x3` por `LayoutGrid` do `lucide-react` em:
  - `src/components/admin/DishesTab.jsx` (aba Complementos)
  - `src/components/admin/SharedSidebar.jsx` (menu Complementos)
  - `src/components/admin/AdminSidebar.jsx` (import)
- **Status:** ✅ Aplicado

### 2. Prop duplicada `currentDish` em ReuseGroupModal (DishesTab)

- **Problema:** `ReuseGroupModal` recebia `currentDish` duas vezes, gerando aviso no build.
- **Solução:** Removida a segunda ocorrência; mantida a primeira.
- **Status:** ✅ Aplicado

### 3. Proteção contra `.filter is not a function`

- **Problema:** Chamadas `.filter()` em valores que podem não ser array (API, props), causando erro em produção.
- **Solução:** Uso de `safeX = Array.isArray(x) ? x : []` e uso de `safeX` em todos os `.filter` / `.find` nos componentes:
  - `EnhancedKanbanBoard.jsx` → `safeOrders`
  - `AdvancedOrderFilters.jsx` → `list` em `applyFilters`
  - `GestorStatsPanel.jsx` → `safeOrders`, `safeEntregadores`
  - `DeliveryPanel.jsx` → `safeOrders`, `safeEntregadores`
  - `SubscriberStats.jsx` → `safeSubscribers`
- **Status:** ✅ Aplicado

### 4. Rate limit da API (apiLimiter)

- **Problema:** Limite de 500 req/15min podia gerar “Muitas requisições” em uso normal.
- **Solução:** `max` aumentado de 500 para **1500** req/15min. Rotas `/api/auth/login` e `/api/public/` continuam com `skip` (não contam no limite).
- **Arquivo:** `backend/middlewares/rateLimit.js`
- **Status:** ✅ Aplicado

---

## ✔️ Itens Verificados (sem alteração necessária)

### EmptyState vs “Sem categoria” no DishesTab

- A condição de `EmptyState` é `(0 categorias e 0 pratos)` ou `(>0 categorias e 0 pratos)`.
- O bloco “Sem categoria” aparece quando `dishesWithoutCategory.length > 0`, **independente** de haver ou não categorias.
- Com 0 categorias e >0 pratos (todos sem categoria), apenas “Sem categoria” é exibido; `EmptyState` não é exibido. **OK.**

### Complementos após refresh

- Em `DishesTab`, a query de `complementGroups` usa `refetchOnMount: 'always'` e `Array.isArray` no `queryFn`.
- `safeComplementGroups` garante array. Se o bug persistir, verificar: `dish.complement_groups` vs `complementGroups` e invalidação/refetch em `ComplementsTab` e modais.

### Fluxo `owner_email` (cardápio `/s/:slug`)

- **Cardapio.jsx:** Inclui `owner_email: publicData.subscriber_email` no `orderData` quando `slug` e `publicData?.subscriber_email` existem.
- **orderService:** Repassa o `orderData` inteiro para `createOrderMutation.mutateAsync(orderData)`.
- **Backend (server.js):** Em `POST /api/entities/:entity`, lê `data.owner_email` e define `createOpts.forSubscriberEmail` para que o pedido fique no assinante. Valida se `owner_email` é assinante; se não for, retorna 400 em Order.
- **Repository:** `createEntity` usa `options.forSubscriberEmail` para definir `subscriber_email` na entidade.
- **Status:** Fluxo consistente. Se pedidos ainda caírem no master, checar: `publicData.subscriber_email` em `/api/public/cardapio/:slug`, persistência (PostgreSQL vs JSON) e filtros no Gestor por `owner_email`/`subscriber_email`.

---

## 📋 Melhorias Sugeridas (não críticas)

| Item | Descrição | Onde |
|------|-----------|------|
| Campo “email personalizado” | Não existe em StoreTab. Se for requisito, definir modelo (Store/Subscriber) e tela. | StoreTab, backend |
| Aumentar `apiLimiter` se necessário | Se 1500 req/15min for pouco em picos, subir para 2000 ou ajustar `skip` em mais rotas de leitura. | `rateLimit.js` |
| Testes e2e do fluxo `/s/:slug` | Pedido no cardápio do assinante e checagem no Gestor do assinante e do master. | QA / e2e |
| Cache de `complementGroups` | Se complementos ainda sumirem após refresh, considerar `queryClient.invalidateQueries(['complementGroups'])` em mutações de pratos que alteram `complement_groups`. | DishesTab, ComplementsTab |

---

## 🔧 Arquivos Alterados (resumo)

- `src/components/admin/DishesTab.jsx` – LayoutGrid; remoção de `currentDish` duplicado em ReuseGroupModal; `safe*` já existiam.
- `src/components/admin/SharedSidebar.jsx` – LayoutGrid.
- `src/components/admin/AdminSidebar.jsx` – LayoutGrid no import.
- `src/components/gestor/EnhancedKanbanBoard.jsx` – `safeOrders`.
- `src/components/gestor/AdvancedOrderFilters.jsx` – `list` em `applyFilters`.
- `src/components/gestor/GestorStatsPanel.jsx` – `safeOrders`, `safeEntregadores`.
- `src/components/gestor/DeliveryPanel.jsx` – `safeOrders`, `safeEntregadores`.
- `src/components/admin/subscribers/SubscriberStats.jsx` – `safeSubscribers`.
- `backend/middlewares/rateLimit.js` – `apiLimiter.max` 500 → 1500.

---

## 🚀 Antes de Oferecer o Produto

1. **Build e testes**
   - `npm run build` (front e back, se aplicável).
   - Testar login, cardápio `/s/:slug`, gestor de pedidos, assinantes e fluxos de pagamento.

2. **Variáveis de ambiente**
   - `JWT_SECRET`, `DATABASE_URL` (PostgreSQL em produção), Cloudinary, `FRONTEND_URL`/`CORS_ORIGINS`, etc. Conferir `.env.example`.

3. **Deploy**
   - Backend (Render, Railway, etc.) com `DATABASE_URL` e envs corretas.
   - Front (Vercel, Netlify, etc.) apontando para a API.

4. **Documentação**
   - README com setup, `.env`, e link para este `CHECKUP_SISTEMA.md` para manutenção futura.

5. **Mobile e PWA**
   - Ver `MOBILE_RESPONSIVO.md` para viewport, safe-area, touch targets, sidebars em drawer e padrões para novas telas.

---

*Documento gerado no contexto do checkup do sistema DigiMenu.*
