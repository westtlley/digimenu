# Monetização Agressiva 2.0

Documentação da camada de **limites (entitlements)** e **add-ons** sem substituir o sistema de permissões existente. O backend é a fonte de verdade; a UI reflete e bloqueia com modais e avisos.

## Limites por plano

| Plano  | Pedidos/mês | Produtos | Colaboradores | Unidades |
|--------|-------------|----------|---------------|----------|
| Free   | 200         | 20       | 0             | 1        |
| Basic  | 600         | 150      | 2             | 1        |
| Pro    | 3.000       | 800      | 5             | 2        |
| Ultra  | Ilimitado   | Ilimitado| 20            | 5        |

- **Colaboradores**: Free = somente dono (1 usuário); Basic = até 2; Pro = até 5; Ultra = até 20.
- **Unidades**: localizações/estabelecimentos. Por enquanto o uso (`locationsCount`) pode ser 0; o limite define o máximo permitido.

## Add-ons de volume de pedidos

- **Conceito**: pacotes de pedidos/mês adicionais ao plano base.
- **Opções**: 0, +1.000, +3.000, +5.000 pedidos/mês.
- **Armazenamento**: `subscriber.addons = { orders: 0 | 1000 | 3000 | 5000 }` (backend, coluna `addons` JSONB).
- **Limite efetivo**: `effective_orders_limit = base_plan.orders_per_month + addons.orders`.

## Onde integrar novos bloqueios

1. **Pedidos**: antes de criar/duplicar pedido (ex.: GestorPedidos ao duplicar). Usar `useEntitlements().canCreateOrder` e, se `false`, abrir `<LimitBlockModal type="orders" ... />`.
2. **Produtos**: antes de abrir o modal de novo prato (ex.: DishesTab em `handleOpenProductTypeModal`). Usar `canAddProduct` e `LimitBlockModal type="products"`.
3. **Colaboradores**: antes de abrir o modal de adicionar colaborador (ex.: ColaboradoresTab em `openAdd`). Usar `canAddCollaborator` e `LimitBlockModal type="collaborators"`.
4. **Localizações**: quando existir fluxo de “adicionar unidade”, checar `canAddLocation` e `LimitBlockModal type="locations"`.

Em todos os casos, o hook `useEntitlements()` expõe `canCreateOrder`, `canAddProduct`, `canAddCollaborator`, `canAddLocation`, `limitReached` e `effectiveLimits`/`usage` para preencher o modal.

## Como configurar no Admin (Assinantes)

1. Acesse **Admin → Assinantes** (apenas master).
2. Clique em **Editar** no assinante desejado.
3. Na seção **Limites e add-ons**:
   - **Limites efetivos**: exibidos em somente leitura (pedidos/mês, produtos, colaboradores, unidades).
   - **Volume extra de pedidos/mês**: select com 0, +1.000, +3.000, +5.000. Ao salvar, o valor é persistido em `subscriber.addons.orders`.
4. Salvar o assinante. O contexto do usuário (`/api/user/context`) passa a devolver `effectiveLimits` e `addons` atualizados.

## Backend

- **Contexto** (`GET /api/user/context`): retorna `subscriberData.usage` (ordersCurrentMonth, productsCount, collaboratorsCount, locationsCount), `subscriberData.effectiveLimits` e `subscriberData.addons`.
- **effectiveLimits**: calculado em `getEffectiveLimitsForSubscriber(subscriber)` (planValidation.service), usando `getEffectiveLimits(plan, addons)` (utils/planLimits.js).
- **Migração**: coluna `addons` JSONB em `subscribers` (default `'{}'`). Migração em `backend/db/migrate.js` e `backend/db/migrations/add_addons_to_subscribers.sql`.

## Frontend

- **Hook**: `useEntitlements()` em `src/hooks/useEntitlements.js`. Retorna `plan`, `limits`, `usage`, `effectiveLimits`, `percentUsed`, `canPerform`, `canCreateOrder`, `canAddProduct`, `canAddCollaborator`, `canAddLocation`, `limitReached`, `isMaster`.
- **Modal único**: `LimitBlockModal` em `src/components/plans/LimitBlockModal.jsx` com `type` em `orders | collaborators | products | locations`. Copy em `src/constants/planLimits.js` (`LIMIT_BLOCK_COPY`).
- **Aviso 80%**: `LimitBanner80` com cooldown 1x por dia por tipo (localStorage em `src/utils/limitCooldown.js`).

## Checklist de testes manuais

- [ ] Admin → Assinantes → Editar assinante: alterar “Volume extra de pedidos/mês”, salvar e reabrir; valor persistido.
- [ ] Painel (assinante): com uso ≥ 80% do limite de pedidos, banner de aviso aparece (respeitando cooldown 1x/dia).
- [ ] Gestor de Pedidos: com limite de pedidos atingido, ao duplicar pedido o modal de bloqueio abre e “Fazer upgrade” leva a /assinar.
- [ ] Produtos (DishesTab): com limite de produtos atingido, ao clicar em “Adicionar prato” o modal de bloqueio abre.
- [ ] Colaboradores: com limite de colaboradores atingido, ao clicar em “Adicionar colaborador” o modal de bloqueio abre.
- [ ] Página /assinar: cards exibem limites (pedidos/mês, equipe, produtos, unidades); seção Add-ons exibe opções +1.000 e +3.000; override via API (`plans_override`) continua funcionando.

## Resumo do que mudou

- **Constantes** (`src/constants/planLimits.js`): Limites por plano (FREE 200/20/0/1, BASIC 600/150/2/1, PRO 3000/800/5/2, ULTRA ilimitado/20/5), `LIMIT_BLOCK_COPY` por tipo, `ADDONS_ORDERS_OPTIONS`, `formatLimitCopy`.
- **Backend**: Coluna `addons` em `subscribers` (migração + repository read/write). `getEffectiveLimits(plan, addons)` em `utils/planLimits.js`. `getUsageForSubscriber` com `locationsCount`. `getEffectiveLimitsForSubscriber`. Contexto `/api/user/context` retorna `usage`, `effectiveLimits`, `addons`.
- **Frontend**: Hook `useEntitlements()`, componente `LimitBlockModal`, aviso 80% com cooldown em `LimitBanner80` e `limitCooldown.js`. Integração de bloqueio em GestorPedidos (duplicar pedido), DishesTab (adicionar prato), ColaboradoresTab (adicionar colaborador). PainelAssinante usa `percentUsed` no banner 80%.
- **Admin Assinantes**: No modal de edição, seção "Limites e add-ons" (read-only + select Volume extra pedidos). Payload de atualização inclui `addons`.
- **Página /assinar**: Bloco "Incluído no plano" nos cards (pedidos, equipe, produtos, unidades). Seção "Add-ons" com +1.000 e +3.000 pedidos/mês.
