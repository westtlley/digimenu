# 📋 Guia Completo - Sistema de Assinantes e Planos

## 🎯 Visão Geral

O sistema agora possui um controle completo de assinantes com planos pré-configurados e permissões automáticas.

## 📦 Planos Disponíveis

### 1. **Básico** (`basic`)
- **Descrição**: Visualização de pedidos e cardápio básico
- **Permissões**:
  - ✅ Ver Dashboard
  - ✅ Ver Cardápio (Pratos)
  - ✅ Ver Pedidos
  - ❌ Sem acesso a outras funcionalidades

### 2. **Pro** (`pro`)
- **Descrição**: Gestão completa de cardápio e entregas
- **Permissões**:
  - ✅ Dashboard completo
  - ✅ PDV (Ponto de Venda)
  - ✅ Gestor de Pedidos (criar, editar, deletar)
  - ✅ Caixa
  - ✅ WhatsApp
  - ✅ Gerenciar Cardápio completo
  - ✅ Zonas de Entrega
  - ✅ Cupons e Promoções
  - ✅ Configurar Tema e Loja
  - ✅ Ver Gráficos
  - ✅ Gerenciar Pedidos e Clientes
  - ✅ Ver Financeiro

### 3. **Premium** (`premium`)
- **Descrição**: Acesso total ao sistema
- **Permissões**:
  - ✅ Todas as permissões do Pro
  - ✅ Gerenciar Pagamentos
  - ✅ Configurar Impressora
  - ✅ Gerenciar Clientes (criar, editar, deletar)
  - ✅ Gerenciar Pedidos completo

### 4. **Personalizado** (`custom`)
- **Descrição**: Configuração manual de permissões
- **Permissões**: Definidas manualmente pelo administrador

## 🔧 Como Cadastrar um Assinante

### Passo 1: Acessar a Página de Assinantes

1. Faça login como **master** (`admin@digimenu.com`)
2. Acesse a página **Admin**
3. Clique em **Assinantes** no menu lateral

### Passo 2: Adicionar Novo Assinante

1. Clique no botão **"Adicionar Assinante"**
2. Preencha os campos:
   - **Email**: Email do assinante (obrigatório)
   - **Nome**: Nome completo
   - **Plano**: Selecione o plano (Básico, Pro, Premium ou Personalizado)
   - **Status**: `active` (ativo) ou `inactive` (inativo)
   - **Data de Expiração**: Opcional (deixe vazio para sem expiração)

### Passo 3: Configurar Permissões

- **Se escolher um plano pré-definido** (Básico, Pro, Premium):
  - As permissões são aplicadas **automaticamente**
  - Não precisa configurar manualmente

- **Se escolher "Personalizado"**:
  - Você pode configurar cada permissão manualmente
  - Use o editor de permissões para habilitar/desabilitar funcionalidades

### Passo 4: Salvar

1. Clique em **"Salvar"**
2. O sistema irá:
   - Criar o assinante
   - Aplicar as permissões do plano automaticamente
   - Criar o usuário automaticamente (se não existir)
   - Liberar acesso ao sistema

## 🔐 Como Funciona o Acesso

### 1. **Criação Automática de Usuário**

Quando você cadastra um assinante:
- ✅ O sistema cria automaticamente um usuário em `db.users`
- ✅ O email fica na whitelist (pode fazer login)
- ✅ A senha inicial é `null` (será definida no primeiro login)

### 2. **Aplicação de Permissões**

- Ao criar/atualizar assinante com plano pré-definido:
  - As permissões do plano são aplicadas automaticamente
  - Não precisa configurar manualmente

- Ao mudar o plano:
  - As permissões são atualizadas automaticamente
  - Mantém permissões customizadas se houver

### 3. **Verificação de Acesso**

Quando o usuário tenta acessar uma página:
1. Sistema verifica se está autenticado
2. Verifica se tem assinatura ativa
3. Verifica se tem permissão para o módulo
4. Permite ou bloqueia o acesso

## 📝 Exemplos Práticos

### Exemplo 1: Cadastrar Cliente com Plano Básico

```javascript
// Dados do formulário
{
  email: "cliente@exemplo.com",
  name: "João Silva",
  plan: "basic",
  status: "active",
  expires_at: null
}

// Resultado:
// - Usuário criado automaticamente
// - Assinante criado com permissões do plano Básico
// - Acesso liberado para: Dashboard, Ver Cardápio, Ver Pedidos
```

### Exemplo 2: Atualizar para Plano Pro

```javascript
// Ao mudar o plano de "basic" para "pro"
// Sistema automaticamente:
// 1. Atualiza o plano
// 2. Aplica todas as permissões do Pro
// 3. Libera acesso a todas as funcionalidades do Pro
```

### Exemplo 3: Plano Personalizado

```javascript
// Dados do formulário
{
  email: "especial@exemplo.com",
  name: "Cliente Especial",
  plan: "custom",
  status: "active",
  permissions: {
    dashboard: ['view'],
    dishes: ['view', 'create'],
    orders: ['view', 'update']
    // ... outras permissões customizadas
  }
}
```

## 🛠️ Estrutura Técnica

### Backend (`backend/server.js`)

```javascript
// Planos pré-configurados
db.plans = [
  { slug: 'basic', name: 'Básico', permissions: {...} },
  { slug: 'pro', name: 'Pro', permissions: {...} },
  { slug: 'premium', name: 'Premium', permissions: {...} }
]

// Assinantes
db.subscribers = [
  {
    email: 'usuario@email.com',
    plan: 'pro',
    status: 'active',
    permissions: {...} // Aplicadas automaticamente do plano
  }
]
```

### Frontend (`src/pages/Assinantes.jsx`)

- Interface para gerenciar assinantes
- Seleção de planos
- Editor de permissões (para planos custom)
- Visualização de status e permissões

## ✅ Checklist de Funcionalidades

- [x] Planos pré-configurados (Básico, Pro, Premium)
- [x] Aplicação automática de permissões
- [x] Criação automática de usuário
- [x] Editor de permissões para planos custom
- [x] Atualização de permissões ao mudar plano
- [x] Verificação de acesso baseada em permissões
- [x] Interface de gerenciamento de assinantes

## 🚀 Próximos Passos

1. **Testar o sistema**:
   - Cadastrar um novo assinante
   - Verificar se as permissões foram aplicadas
   - Testar o acesso com o email cadastrado

2. **Personalizar planos** (se necessário):
   - Editar `backend/server.js` → `db.plans`
   - Ajustar permissões conforme necessário

3. **Adicionar mais planos**:
   - Adicionar novos planos em `db.plans`
   - Configurar permissões específicas

---

**Nota**: Em produção, considere:
- Hash de senhas
- Banco de dados real
- Logs de auditoria
- Notificações de expiração
