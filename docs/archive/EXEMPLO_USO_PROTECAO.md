# 📖 Exemplo de Uso - Proteção de Rotas

## Como Proteger uma Página

### Exemplo 1: Página que Requer Assinatura Ativa

```jsx
// src/pages/MinhaPaginaExclusiva.jsx
import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function MinhaPaginaExclusiva() {
  return (
    <ProtectedRoute requireActiveSubscription={true}>
      <div>
        <h1>Conteúdo Exclusivo</h1>
        <p>Apenas assinantes ativos podem ver isso.</p>
      </div>
    </ProtectedRoute>
  );
}
```

### Exemplo 2: Página Apenas para Master

```jsx
// src/pages/PaginaMaster.jsx
import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function PaginaMaster() {
  return (
    <ProtectedRoute requireMaster={true}>
      <div>
        <h1>Painel Master</h1>
        <p>Apenas administradores master podem acessar.</p>
      </div>
    </ProtectedRoute>
  );
}
```

### Exemplo 3: Página com Role Específico

```jsx
// src/pages/PaginaAdmin.jsx
import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function PaginaAdmin() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>
        <h1>Painel Admin</h1>
        <p>Apenas usuários com role 'admin' podem acessar.</p>
      </div>
    </ProtectedRoute>
  );
}
```

### Exemplo 4: Proteção Múltipla

```jsx
// src/pages/PaginaSuperExclusiva.jsx
import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function PaginaSuperExclusiva() {
  return (
    <ProtectedRoute 
      requireMaster={true}
      requireActiveSubscription={true}
      requiredRole="admin"
    >
      <div>
        <h1>Conteúdo Super Exclusivo</h1>
        <p>Requer: Master + Assinatura Ativa + Role Admin</p>
      </div>
    </ProtectedRoute>
  );
}
```

## Como Adicionar Usuário Manualmente

### Via Código (Backend)

Edite `backend/server.js`:

```javascript
const db = {
  users: [
    {
      id: '1',
      email: 'admin@digimenu.com',
      full_name: 'Administrador',
      is_master: true,
      subscriber_email: 'admin@digimenu.com',
      role: 'admin',
      password: 'admin123'
    },
    // Adicione aqui:
    {
      id: '2',
      email: 'novo@email.com',
      full_name: 'Novo Usuário',
      is_master: false,
      subscriber_email: 'novo@email.com',
      role: 'user',
      password: 'senha123'
    }
  ],
  subscribers: [
    {
      id: '1',
      email: 'admin@digimenu.com',
      name: 'Administrador',
      plan: 'premium',
      status: 'active',
      expires_at: null,
      permissions: {},
      created_date: new Date().toISOString()
    },
    // Adicione aqui:
    {
      id: '2',
      email: 'novo@email.com',
      name: 'Novo Usuário',
      plan: 'basic',
      status: 'active',
      expires_at: null,
      permissions: {},
      created_date: new Date().toISOString()
    }
  ]
};
```

### Via Interface (Recomendado)

1. Faça login como master (`admin@digimenu.com`)
2. Acesse a página **Assinantes**
3. Clique em **Adicionar Assinante**
4. Preencha os dados
5. O sistema criará automaticamente o usuário e assinante

## Fluxo de Autenticação

```
1. Usuário tenta fazer login
   ↓
2. Sistema verifica se email está em db.users
   ↓
3. Se não estiver → Erro: "Email não cadastrado"
   ↓
4. Se estiver → Verifica senha (se tiver)
   ↓
5. Retorna token e dados do usuário
   ↓
6. Usuário tenta acessar página protegida
   ↓
7. ProtectedRoute verifica:
   - Está autenticado?
   - É master? (se requireMaster)
   - Tem assinatura ativa? (se requireActiveSubscription)
   - Tem role correto? (se requiredRole)
   ↓
8. Se tudo OK → Renderiza conteúdo
   Se não → Mostra tela de acesso negado
```

## Testando

### 1. Testar Email Não Cadastrado

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"naoexiste@email.com","password":"qualquer"}'
```

**Resposta esperada:**
```json
{
  "message": "Email não cadastrado. Entre em contato para solicitar acesso."
}
```

### 2. Testar Login Válido

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@digimenu.com","password":"admin123"}'
```

**Resposta esperada:**
```json
{
  "token": "fake_token_...",
  "user": {
    "id": "1",
    "email": "admin@digimenu.com",
    "full_name": "Administrador",
    "is_master": true,
    "subscriber_email": "admin@digimenu.com",
    "role": "admin"
  }
}
```

### 3. Testar Verificação de Assinatura

```bash
curl -X POST http://localhost:3000/api/functions/checkSubscriptionStatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"user_email":"admin@digimenu.com"}'
```

## Dicas

1. **Sempre reinicie o backend** após modificar `db.users` ou `db.subscribers` no código
2. **Use a interface** para adicionar assinantes (mais seguro)
3. **Em produção**, implemente hash de senhas e JWT tokens
4. **Mantenha backup** da lista de usuários e assinantes
