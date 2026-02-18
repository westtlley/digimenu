# Uso dos limites de plano e modais de upgrade

## Visão geral

- **Limites** estão em `src/constants/planLimits.js` (frontend) e em `backend/utils/plans.js` (backend, fonte de verdade).
- **Uso atual** (pedidos no mês, produtos, colaboradores) vem em `subscriberData.usage` retornado por `/user/context`.
- O hook **`usePlanLimits()`** expõe: `limits`, `usage`, `canCreateOrder`, `canAddProduct`, `canAddCollaborator`, `show80Banner`, `isOrdersLimitReached`, etc.

## Onde integrar

### 1. Limite de pedidos atingido (bloquear novo pedido)

Quando o usuário for criar/aceitar um pedido (cardápio ou gestor):

```jsx
const { canCreateOrder, isOrdersLimitReached } = usePlanLimits();
const [showLimitModal, setShowLimitModal] = useState(false);

// Ao tentar criar/aceitar pedido:
if (!canCreateOrder) {
  setShowLimitModal(true);
  return;
}

// No JSX:
<LimitOrdersReachedModal
  open={showLimitModal}
  onOpenChange={setShowLimitModal}
  onUpgradeClick={() => navigate('/assinatura')}
  onViewPlansClick={() => setActiveTab('store')}
/>
```

### 2. Recurso bloqueado por plano (ex.: cupons no Basic)

Ao abrir ou ao clicar em "Novo cupom" / "Nova promoção" no Basic:

```jsx
const { plan } = usePlanLimits();
const [showFeatureModal, setShowFeatureModal] = useState(false);

// Se plano basic e tentar criar cupom:
if (plan === 'basic') {
  setShowFeatureModal(true);
  return;
}

<FeatureBlockedModal
  open={showFeatureModal}
  onOpenChange={setShowFeatureModal}
  feature="coupons"
  onUpgradeClick={() => navigate('/assinatura')}
/>
```

### 3. Limite de colaboradores

Em ColaboradoresTab, ao clicar em "Adicionar colaborador":

```jsx
const { canAddCollaborator } = usePlanLimits();
const [showCollabModal, setShowCollabModal] = useState(false);

if (!canAddCollaborator) {
  setShowCollabModal(true);
  return;
}

<CollaboratorsLimitModal
  open={showCollabModal}
  onOpenChange={setShowCollabModal}
  onUpgradeClick={() => navigate('/assinatura')}
/>
```

### 4. Banner 80% (já integrado)

O **LimitBanner80** já é exibido no PainelAssinante quando `show80Banner` é true (uso ≥ 80% do limite de pedidos). Não bloqueia; só avisa.

## Eventos de métricas

Em `src/utils/planEvents.js` estão os eventos:

- `upgrade_modal_shown`
- `limit_orders_80_percent`
- `limit_orders_reached`
- `feature_blocked_by_plan`
- `addon_volume_clicked`
- `plan_upgrade_clicked`

Eles são disparados pelos modais. Em produção pode-se enviar para analytics (ex.: `window.gtag`) em `trackPlanEvent`.

## Preços e add-ons

- **Preços** (mensal/anual): `src/constants/planLimits.js` → `PLAN_PRICING`, copy "Economize 2 meses pagando anual".
- **Add-ons de volume**: `ADDONS_VOLUME` e `ADDON_COPY` no mesmo arquivo. Use em uma aba/modal "Adicionar pedidos" ou "Planos".
