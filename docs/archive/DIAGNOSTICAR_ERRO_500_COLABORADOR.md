# 🔍 Diagnosticar Erro 500 ao Adicionar Colaborador

## ⚠️ Problema

Erro 500 (Internal Server Error) ao tentar adicionar colaborador:
- **Endpoint:** `POST /api/colaboradores`
- **Erro:** `500 (Internal Server Error)`
- **Mensagem:** "Erro interno do servidor"

## ✅ Passos para Diagnosticar

### 1. Verificar Logs do Backend no Render

1. Acesse: https://dashboard.render.com
2. Vá para o serviço do backend
3. Clique em **Logs**
4. Procure por mensagens relacionadas ao erro:
   - `📥 [POST /api/colaboradores] Requisição recebida:`
   - `🔍 [POST /api/colaboradores] Owner e Subscriber:`
   - `🔍 [POST /api/colaboradores] Criando usuário no PostgreSQL:`
   - `✅ [POST /api/colaboradores] Usuário criado com sucesso:` ou `❌ [POST /api/colaboradores] Erro ao criar usuário:`

### 2. Possíveis Causas e Soluções

#### Causa 1: Constraint Única no Banco de Dados

**Sintoma nos logs:**
```
❌ [POST /api/colaboradores] Erro ao criar usuário:
code: '23505'
error: 'duplicate key value violates unique constraint'
```

**Solução:**
1. Verificar se a migration `allow_multiple_users_same_email.sql` foi aplicada
2. Se não foi aplicada, executar a migration no banco de dados
3. Verificar se a constraint única composta está correta

#### Causa 2: Campo `active` não existe na tabela

**Sintoma nos logs:**
```
❌ [POST /api/colaboradores] Erro ao criar usuário:
error: 'column "active" does not exist'
```

**Solução:**
1. Executar a migration `add_active_field_to_users.sql`
2. Verificar se a coluna `active` foi criada na tabela `users`

#### Causa 3: Erro ao criar usuário no PostgreSQL

**Sintoma nos logs:**
```
❌ [POST /api/colaboradores] Erro ao criar usuário:
error: '...'
code: '...'
```

**Solução:**
1. Verificar a mensagem de erro completa nos logs
2. Verificar se todos os campos obrigatórios estão sendo enviados
3. Verificar se o banco de dados está acessível

#### Causa 4: Problema com `getOwnerAndSubscriber`

**Sintoma nos logs:**
```
🔍 [POST /api/colaboradores] Owner e Subscriber: { owner: null, subscriber: null }
```

**Solução:**
1. Verificar se o parâmetro `as_subscriber` está sendo enviado corretamente
2. Verificar se o usuário logado tem permissão para criar colaboradores
3. Verificar se o assinante existe no banco de dados

### 3. Verificar no Banco de Dados

Se você tem acesso ao banco de dados PostgreSQL:

```sql
-- Verificar se a coluna active existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'active';

-- Verificar constraints da tabela users
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass;

-- Verificar se a migration foi aplicada
SELECT * FROM pg_constraint 
WHERE conname = 'users_email_role_subscriber_unique';
```

### 4. Aplicar Migrations Necessárias

Se as migrations não foram aplicadas:

```sql
-- 1. Adicionar campo active
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
        UPDATE users SET active = TRUE WHERE active IS NULL;
    END IF;
END $$;

-- 2. Remover constraint única do email (se existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_key' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
    END IF;
END $$;

-- 3. Adicionar constraint única composta
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_role_subscriber_unique' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_email_role_subscriber_unique 
        UNIQUE (email, role, COALESCE(subscriber_email, ''::varchar));
    END IF;
END $$;
```

### 5. Verificar Dados Enviados

No console do navegador (F12), verifique o que está sendo enviado:

```javascript
// Verificar requisição
fetch('https://digimenu-backend-3m6t.onrender.com/api/colaboradores?as_subscriber=temperodaneta1%40gmail.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    name: 'Carlos Alberto',
    email: 'sejadigno4587@gmail.com',
    password: '123456',
    roles: ['entregador', 'cozinha', 'pdv', 'garcom', 'gerente']
  })
})
.then(r => r.json())
.then(data => console.log('✅ Sucesso:', data))
.catch(err => console.error('❌ Erro:', err));
```

## 🚨 Solução Rápida

Se o problema persistir após verificar os logs:

1. **Verificar se as migrations foram aplicadas:**
   - Acesse o banco de dados PostgreSQL
   - Execute as migrations manualmente se necessário

2. **Verificar se o campo `active` existe:**
   - Se não existir, adicione manualmente:
     ```sql
     ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
     ```

3. **Verificar constraints:**
   - Remova a constraint única do email se ainda existir
   - Adicione a constraint única composta

4. **Tentar novamente:**
   - Após aplicar as correções, tente adicionar o colaborador novamente

## 📊 Checklist de Verificação

- [ ] Verificou logs do backend no Render
- [ ] Confirmou que o campo `active` existe na tabela `users`
- [ ] Confirmou que a constraint única composta foi aplicada
- [ ] Verificou se o parâmetro `as_subscriber` está sendo enviado
- [ ] Verificou se o usuário logado tem permissão
- [ ] Tentou aplicar as migrations manualmente
- [ ] Verificou se o banco de dados está acessível

## 🔗 Próximos Passos

Após verificar os logs do backend, você saberá exatamente qual é o problema:
- Se for constraint única → Aplicar migration
- Se for campo `active` → Adicionar coluna manualmente
- Se for outro erro → Verificar mensagem de erro específica nos logs
