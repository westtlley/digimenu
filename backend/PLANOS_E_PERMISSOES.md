# 📋 Planos e Permissões - DigiMenu

Este documento descreve os planos disponíveis e as permissões de cada um.

## 🎯 Planos Disponíveis

### 1. **Básico** (`basic`)

**Ideal para:** Começar com cardápio digital

**Funcionalidades incluídas:**
- ✅ **Cardápio Digital**
  - Visualizar cardápio
  - Criar cardápio
  - Editar cardápio
  - Deletar cardápio
  
- ✅ **Dashboard**
  - Visualizar dashboard básico
  
- ✅ **Criação de Cardápio/Restaurante/Pizzaria**
  - Criar restaurante/pizzaria
  - Editar informações
  - Visualizar configurações
  
- ✅ **Gestor de Pedidos Simplificado**
  - Visualizar pedidos
  - Criar pedidos
  - Atualizar pedidos
  - ❌ Deletar pedidos (apenas visualização e criação)
  
- ✅ **Comanda Automática WhatsApp**
  - Ativar comanda automática
  - **Desativar comanda automática** (botão disponível)

**Funcionalidades NÃO incluídas:**
- ❌ Gestor de Pedidos Avançado
- ❌ PDV (Ponto de Venda)
- ❌ Controle de Caixa
- ❌ Relatórios Avançados
- ❌ Funções Admin

---

### 2. **Premium** (`premium`)

**Ideal para:** Restaurantes que precisam de mais controle

**Funcionalidades incluídas:**
- ✅ **Tudo do plano Básico**
  
- ✅ **Gestor de Pedidos Avançado**
  - Visualizar pedidos avançado
  - Criar pedidos avançado
  - Atualizar pedidos avançado
  - Deletar pedidos
  - Relatórios de pedidos
  - Analytics de pedidos
  
- ✅ **PDV (Ponto de Venda)**
  - Visualizar PDV
  - Criar vendas
  - Atualizar vendas
  - Deletar vendas
  - Relatórios de vendas
  
- ✅ **Controle de Caixa**
  - Visualizar controle de caixa
  - Abrir caixa
  - Fechar caixa
  - Relatórios de caixa
  - Histórico de caixa
  
- ✅ **Relatórios Avançados**

**Funcionalidades NÃO incluídas:**
- ❌ Integrações Avançadas
- ❌ API e Webhooks
- ❌ Funções Admin

---

### 3. **Pro** (`pro`)

**Ideal para:** Restaurantes profissionais que precisam de solução completa

**Funcionalidades incluídas:**
- ✅ **Tudo do plano Premium**
  
- ✅ **Integrações Avançadas**
  - Integrações customizadas
  - API completa
  - Webhooks
  - Integrações personalizadas
  
- ✅ **Analytics Avançado**
  - Analytics detalhado
  - Exportações avançadas
  
- ✅ **Customização Completa**
  - Configurações avançadas
  - Branding avançado
  - Customização completa
  
- ✅ **Gerenciamento de Usuários**
  - Gerenciar usuários da própria conta
  - Alterar configurações da própria conta

**Funcionalidades NÃO incluídas:**
- ❌ Gerenciar outros assinantes
- ❌ Funções Admin Master
- ❌ Acesso a dados de outros assinantes

---

### 4. **Admin** (`admin`)

**Ideal para:** Administradores do sistema

**Funcionalidades incluídas:**
- ✅ **Todas as funcionalidades do plano Pro**
  
- ✅ **Funções Admin Master**
  - Gerenciar todos os usuários
  - Gerenciar todos os assinantes
  - Configurações do sistema
  - Acesso a todos os dados
  - Configurações master

---

## 🔐 Sistema de Permissões

### Como Funciona

1. **Cada usuário está associado a um assinante** através do campo `subscriber_email`
2. **Cada assinante tem um plano** (`basic`, `premium`, `pro`, `admin`)
3. **Cada plano tem permissões definidas** no arquivo `backend/utils/plans.js`
4. **O middleware de permissões verifica** se o usuário pode acessar um recurso

### Verificação de Permissões

```javascript
// No backend
import { requirePermission, requireAccess } from './middlewares/permissions.js';

// Verificar permissão específica
app.get('/api/orders/advanced', authenticate, requirePermission('orders_advanced'), (req, res) => {
  // Rota protegida
});

// Verificar acesso a recurso
app.get('/api/pdv', authenticate, requireAccess('pdv'), (req, res) => {
  // Rota protegida
});
```

### Permissões Customizadas

Cada assinante pode ter permissões customizadas no campo `permissions` (JSONB), que sobrescrevem as permissões padrão do plano.

---

## 📊 Tabela Comparativa

| Funcionalidade | Básico | Premium | Pro | Admin |
|----------------|--------|---------|-----|-------|
| Cardápio Digital | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Criação de Cardápio | ✅ | ✅ | ✅ | ✅ |
| Gestor Pedidos Simplificado | ✅ | ✅ | ✅ | ✅ |
| Comanda WhatsApp (pode desativar) | ✅ | ✅ | ✅ | ✅ |
| Gestor Pedidos Avançado | ❌ | ✅ | ✅ | ✅ |
| PDV | ❌ | ✅ | ✅ | ✅ |
| Controle de Caixa | ❌ | ✅ | ✅ | ✅ |
| Relatórios Avançados | ❌ | ✅ | ✅ | ✅ |
| Integrações Avançadas | ❌ | ❌ | ✅ | ✅ |
| API e Webhooks | ❌ | ❌ | ✅ | ✅ |
| Gerenciar Usuários | ❌ | ❌ | ✅ | ✅ |
| Gerenciar Assinantes | ❌ | ❌ | ❌ | ✅ |
| Funções Admin Master | ❌ | ❌ | ❌ | ✅ |

---

## 🔧 Configuração

### Criar Assinante

```javascript
// Via API
POST /api/functions/createSubscriber
{
  "email": "restaurante@exemplo.com",
  "name": "Restaurante Exemplo",
  "plan": "basic", // ou "premium", "pro", "admin"
  "status": "active",
  "whatsapp_auto_enabled": true
}
```

### Atualizar Plano

```javascript
// Via API
POST /api/functions/updateSubscriber
{
  "email": "restaurante@exemplo.com",
  "plan": "premium"
}
```

### Desativar Comanda WhatsApp

```javascript
// Via API
POST /api/functions/updateSubscriber
{
  "email": "restaurante@exemplo.com",
  "whatsapp_auto_enabled": false
}
```

---

## 📝 Notas Importantes

1. **Usuários Master**: Usuários com `is_master = true` sempre têm acesso total, independente do plano
2. **Assinatura Expirada**: Se `expires_at` estiver no passado, o usuário perde acesso
3. **Status Inativo**: Se `status != 'active'`, o usuário perde acesso
4. **Permissões Customizadas**: Podem ser definidas no campo `permissions` (JSONB) para sobrescrever padrões do plano

---

## 🚀 Próximos Passos

- [ ] Implementar verificação de permissões nas rotas do frontend
- [ ] Criar interface de gerenciamento de planos no admin
- [ ] Implementar sistema de upgrade/downgrade de planos
- [ ] Adicionar notificações quando funcionalidade requer plano superior
- [ ] Implementar sistema de pagamento e assinaturas
