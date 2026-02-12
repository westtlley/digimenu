# 🔐 Guia de Controle de Acesso - DigiMenu

## 📋 Visão Geral

O sistema agora possui controle de acesso baseado em **email cadastrado**. Apenas emails que estão na whitelist podem fazer login e acessar páginas exclusivas.

## 🏗️ Como Funciona

### 1. **Sistema de Whitelist de Emails**

- Apenas emails cadastrados em `db.users` podem fazer login
- Emails não cadastrados recebem erro: "Email não cadastrado"
- Cada email pode ter uma senha (em produção, usar hash)

### 2. **Níveis de Acesso**

#### **Master (Administrador)**
- `is_master: true`
- Acesso total a todas as funcionalidades
- Pode gerenciar assinantes
- Não precisa de assinatura ativa

#### **Assinante Ativo**
- Email cadastrado em `db.subscribers`
- `status: 'active'`
- Acesso às páginas exclusivas (Admin, etc.)
- Permissões baseadas no plano

#### **Usuário Sem Assinatura**
- Email cadastrado mas sem assinatura ativa
- Acesso apenas a páginas públicas (Cardápio, etc.)

### 3. **Páginas Protegidas**

- **Admin**: Requer assinatura ativa OU master
- **Assinantes**: Requer master apenas
- **PainelAssinante**: Requer assinatura ativa OU master
- **GestorPedidos**: Requer assinatura ativa OU master

## 🔧 Como Adicionar Novos Usuários

### Opção 1: Via Backend (Código)

Edite `backend/server.js` e adicione ao array `db.users`:

```javascript
users: [
  {
    id: '2',
    email: 'novo@email.com',
    full_name: 'Nome do Usuário',
    is_master: false,
    subscriber_email: 'novo@email.com',
    role: 'user',
    password: 'senha123' // Em produção, usar hash
  }
]
```

### Opção 2: Via API (Criar Assinante)

1. Faça login como master
2. Acesse a página **Assinantes**
3. Clique em **Adicionar Assinante**
4. Preencha:
   - Email
   - Nome
   - Plano
   - Status: `active`
   - Data de expiração (opcional)

O sistema criará automaticamente:
- Um registro em `db.subscribers`
- Um registro em `db.users` (se não existir)

## 📝 Estrutura de Dados

### Usuário (`db.users`)

```javascript
{
  id: '1',
  email: 'usuario@email.com',
  full_name: 'Nome Completo',
  is_master: false,           // true = acesso total
  subscriber_email: 'usuario@email.com',
  role: 'user',               // 'admin', 'user', etc.
  password: 'senha123'        // Em produção, usar hash
}
```

### Assinante (`db.subscribers`)

```javascript
{
  id: '1',
  email: 'usuario@email.com',
  name: 'Nome do Assinante',
  plan: 'basic',              // 'basic', 'premium', etc.
  status: 'active',           // 'active', 'inactive', 'expired'
  expires_at: null,           // null = sem expiração, ou ISO date
  permissions: {},            // Permissões específicas
  created_date: '2024-01-01T00:00:00.000Z',
  updated_date: '2024-01-01T00:00:00.000Z'
}
```

## 🔒 Proteção de Rotas

### Usando ProtectedRoute

```jsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function MinhaPagina() {
  return (
    <ProtectedRoute 
      requireActiveSubscription={true}
      requireMaster={false}
    >
      <div>Conteúdo protegido</div>
    </ProtectedRoute>
  );
}
```

### Propriedades do ProtectedRoute

- `requireMaster`: Se `true`, apenas master pode acessar
- `requireActiveSubscription`: Se `true`, requer assinatura ativa
- `requiredRole`: Role específico necessário (ex: `'admin'`)

## 🧪 Testando o Sistema

### 1. Testar Login com Email Não Cadastrado

```javascript
// Tentar fazer login com email não cadastrado
POST /api/auth/login
{
  "email": "naoexiste@email.com",
  "password": "qualquer"
}

// Resposta esperada:
{
  "message": "Email não cadastrado. Entre em contato para solicitar acesso."
}
```

### 2. Testar Acesso sem Assinatura

1. Crie um usuário sem assinatura ativa
2. Tente acessar `/Admin`
3. Deve mostrar tela de "Acesso Não Autorizado"

### 3. Testar Acesso Master

1. Faça login com `admin@digimenu.com`
2. Deve ter acesso total a todas as páginas

## 🚀 Próximos Passos (Produção)

### 1. Autenticação Real

- Implementar JWT tokens
- Hash de senhas (bcrypt)
- Refresh tokens

### 2. Banco de Dados Real

- Substituir `db` em memória por PostgreSQL/MongoDB
- Migrations para estrutura
- Backup automático

### 3. Segurança Adicional

- Rate limiting
- CORS configurado
- Validação de inputs
- Sanitização de dados

### 4. Auditoria

- Logs de acesso
- Histórico de alterações
- Notificações de segurança

## 📞 Suporte

Para adicionar novos emails à whitelist:
1. Entre em contato via WhatsApp: [link]
2. Ou acesse como master e adicione via interface

---

**Nota**: Em desenvolvimento, o sistema aceita qualquer senha para emails cadastrados. Em produção, implemente validação de senha adequada.
