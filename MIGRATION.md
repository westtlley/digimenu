# Guia de Migração: Base44 para API Própria

Este guia explica como migrar do Base44 SDK para sua própria API.

## O que foi feito

1. ✅ Criado cliente de API genérico (`src/api/apiClient.js`)
2. ✅ Sistema de autenticação próprio
3. ✅ Wrapper de entidades compatível
4. ✅ Atualizado `base44Client.js` para usar o novo cliente

## Configuração

### 1. Configurar URL da API

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Ou configure diretamente no código em `src/api/apiClient.js`.

### 2. Estrutura da API Backend

Sua API deve seguir esta estrutura de endpoints:

#### Autenticação

```
POST /api/auth/login
Body: { email, password }
Response: { token, user }

GET /api/auth/me
Headers: Authorization: Bearer {token}
Response: { id, email, full_name, is_master, ... }
```

#### Entidades (CRUD)

```
GET /api/entities/{entityName}?order_by={field}
GET /api/entities/{entityName}?{filters}
GET /api/entities/{entityName}/{id}
POST /api/entities/{entityName}
Body: { ...data }
PUT /api/entities/{entityName}/{id}
Body: { ...data }
DELETE /api/entities/{entityName}/{id}
POST /api/entities/{entityName}/bulk
Body: { items: [...] }
```

#### Funções Customizadas

```
POST /api/functions/{functionName}
Body: { ...data }
```

## Entidades Usadas no Projeto

O projeto usa as seguintes entidades que você precisa implementar no backend:

- `StoreConfig` - Configurações da loja
- `Dish` - Pratos/Produtos
- `Category` - Categorias
- `ComplementGroup` - Grupos de complementos
- `Order` - Pedidos
- `Store` - Lojas
- `Entregador` - Entregadores
- `OrderMessage` - Mensagens de pedido
- `OrderLog` - Logs de pedido
- `MessageTemplate` - Templates de mensagem
- `Coupon` - Cupons
- `Promotion` - Promoções
- `Subscriber` - Assinantes
- `PaymentConfig` - Configurações de pagamento
- `DeliveryZone` - Zonas de entrega
- `Combo` - Combos
- `PrinterConfig` - Configurações de impressora
- `DeliveryRating` - Avaliações de entrega
- `DeliveryProof` - Comprovantes de entrega
- `Caixa` - Caixas
- `CaixaOperation` - Operações de caixa
- `PermissionLog` - Logs de permissão
- `LoyaltyConfig` - Configurações de fidelidade
- `LoyaltyReward` - Recompensas de fidelidade
- `Notification` - Notificações
- `DeliveryMessage` - Mensagens de entrega
- `PedidoPDV` - Pedidos do PDV
- `Plan` - Planos
- `Flavor` - Sabores
- `FlavorCategory` - Categorias de sabores
- `PizzaSize` - Tamanhos de pizza
- `PizzaFlavor` - Sabores de pizza
- `PizzaEdge` - Bordas de pizza
- `PizzaExtra` - Extras de pizza
- `PizzaVisualizationConfig` - Configurações de visualização de pizza

## Funções Customizadas

O projeto usa as seguintes funções que você precisa implementar:

- `updateStoreSettings`
- `updateSubscriberPlan`
- `checkSubscriptionStatus`
- `createSubscriber`
- `updateSubscriber`
- `deleteSubscriber`
- `getSubscribers`
- `getGoogleMapsRoute`
- `getFullSubscriberProfile`
- `syncUserSubscriberEmail`
- `diagnoseRLS`
- `fixRLSData`
- `trackPizzaCombination`

## Exemplo de Implementação Backend (Node.js/Express)

```javascript
// routes/entities.js
const express = require('express');
const router = express.Router();

// GET /api/entities/Dish
router.get('/:entityName', async (req, res) => {
  const { entityName } = req.params;
  const { order_by, ...filters } = req.query;
  
  // Sua lógica de busca aqui
  const items = await db[entityName].findAll({
    where: filters,
    order: order_by ? [[order_by]] : undefined
  });
  
  res.json(items);
});

// GET /api/entities/Dish/:id
router.get('/:entityName/:id', async (req, res) => {
  const { entityName, id } = req.params;
  const item = await db[entityName].findByPk(id);
  res.json(item);
});

// POST /api/entities/Dish
router.post('/:entityName', async (req, res) => {
  const { entityName } = req.params;
  const item = await db[entityName].create(req.body);
  res.json(item);
});

// PUT /api/entities/Dish/:id
router.put('/:entityName/:id', async (req, res) => {
  const { entityName, id } = req.params;
  const item = await db[entityName].update(req.body, {
    where: { id }
  });
  res.json(item);
});

// DELETE /api/entities/Dish/:id
router.delete('/:entityName/:id', async (req, res) => {
  const { entityName, id } = req.params;
  await db[entityName].destroy({ where: { id } });
  res.json({ success: true });
});
```

## Autenticação

O token JWT é armazenado em `localStorage` com a chave `auth_token`.

## Próximos Passos

1. Implemente sua API backend seguindo a estrutura acima
2. Configure `VITE_API_BASE_URL` no `.env`
3. Teste a aplicação
4. Remova a dependência `@base44/sdk` do `package.json` se não for mais usar

## Voltar para Base44 SDK

Se quiser voltar a usar o Base44 SDK original, edite `src/api/base44Client.js` e:
1. Comente a importação do `apiClient`
2. Descomente o código do Base44 SDK
3. Configure o `APP_ID` correto
