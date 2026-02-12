# 🔍 Diagnosticar Problema de Login - Tempero da Neta

## ⚠️ Problema

Login falhando com "Credenciais inválidas" para:
- **Email:** `temperodaneta1@gmail.com`
- **Senha:** `@TemperodaNeta@2025`

## ✅ Passos para Diagnosticar

### 1. Verificar Logs do Backend no Render

1. Acesse: https://dashboard.render.com
2. Vá para o serviço do backend
3. Clique em **Logs**
4. Procure por mensagens relacionadas ao login:
   - `🔐 [login] Tentativa de login para: temperodaneta1@gmail.com`
   - `🔍 [login] Buscando usuário com email: temperodaneta1@gmail.com`
   - `✅ [login] Usuário encontrado:` ou `❌ [login] Usuário não encontrado`
   - `🔐 [login] Verificando senha para:`
   - `✅ [login] Senha válida!` ou `❌ [login] Senha incorreta`

### 2. Possíveis Causas e Soluções

#### Causa 1: Usuário não existe no banco

**Sintoma nos logs:**
```
❌ [login] Usuário não encontrado: temperodaneta1@gmail.com
```

**Solução:**
1. Verificar se o usuário foi criado corretamente
2. Verificar se o email está correto (pode ter diferenças de case ou espaços)
3. Criar o usuário se não existir

#### Causa 2: Senha incorreta

**Sintoma nos logs:**
```
✅ [login] Usuário encontrado: ...
❌ [login] Senha incorreta para: temperodaneta1@gmail.com
```

**Solução:**
1. Verificar se a senha no banco está correta
2. Resetar a senha do usuário
3. Verificar se há espaços extras na senha

#### Causa 3: Senha sem hash bcrypt

**Sintoma nos logs:**
```
⚠️ [login] Erro ao comparar com bcrypt: ...
⚠️ [login] Tentando verificar se senha está em texto plano...
```

**Solução:**
O sistema tentará converter automaticamente, mas se falhar:
1. Resetar a senha do usuário
2. Garantir que a senha seja salva com hash bcrypt

#### Causa 4: Usuário inativo (colaborador)

**Sintoma nos logs:**
```
❌ [login] Colaborador desativado: temperodaneta1@gmail.com
```

**Solução:**
1. Ativar o usuário no painel administrativo
2. Verificar se `active = true` no banco de dados

### 3. Verificar no Banco de Dados

Se você tem acesso ao banco de dados PostgreSQL:

```sql
-- Verificar se o usuário existe
SELECT id, email, full_name, role, profile_role, subscriber_email, active, 
       CASE WHEN password IS NULL THEN 'SEM SENHA' 
            WHEN password LIKE '$2%' THEN 'COM HASH BCRYPT' 
            ELSE 'SENHA EM TEXTO PLANO' END as password_status
FROM users 
WHERE LOWER(TRIM(email)) = LOWER(TRIM('temperodaneta1@gmail.com'));

-- Verificar assinante relacionado
SELECT * FROM subscribers 
WHERE LOWER(TRIM(email)) = LOWER(TRIM('temperodaneta1@gmail.com'));
```

### 4. Resetar Senha (Se Necessário)

#### Opção A: Via Painel Administrativo

1. Acesse o painel administrativo como master
2. Vá para a seção de usuários/colaboradores
3. Encontre o usuário `temperodaneta1@gmail.com`
4. Clique em "Redefinir Senha" ou "Editar"
5. Defina uma nova senha

#### Opção B: Via SQL (Apenas se tiver acesso direto)

```sql
-- Gerar hash bcrypt da senha (use um gerador online ou script Node.js)
-- Exemplo: @TemperodaNeta@2025
-- Hash gerado: $2b$10$...

-- Atualizar senha
UPDATE users 
SET password = '$2b$10$...' -- Substitua pelo hash gerado
WHERE LOWER(TRIM(email)) = LOWER(TRIM('temperodaneta1@gmail.com'));
```

### 5. Criar Script de Diagnóstico

Crie um script para verificar o usuário:

```javascript
// scripts/diagnose-user.js
import bcrypt from 'bcrypt';
import * as repo from '../db/repository.js';

const email = 'temperodaneta1@gmail.com';
const password = '@TemperodaNeta@2025';

async function diagnose() {
  console.log('🔍 Diagnosticando usuário:', email);
  
  // Buscar usuário
  const user = await repo.getUserByEmail(email.toLowerCase().trim());
  
  if (!user) {
    console.log('❌ Usuário não encontrado!');
    return;
  }
  
  console.log('✅ Usuário encontrado:', {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    profile_role: user.profile_role,
    subscriber_email: user.subscriber_email,
    active: user.active,
    hasPassword: !!user.password,
    passwordLength: user.password ? user.password.length : 0,
    isBcryptHash: user.password ? user.password.startsWith('$2') : false
  });
  
  // Verificar senha
  if (user.password) {
    try {
      const isValid = await bcrypt.compare(password, user.password);
      console.log('🔐 Verificação de senha:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    } catch (err) {
      console.log('❌ Erro ao verificar senha:', err.message);
      if (user.password === password) {
        console.log('⚠️ Senha está em texto plano! Precisa ser convertida para hash.');
      }
    }
  } else {
    console.log('⚠️ Usuário não tem senha definida!');
  }
}

diagnose();
```

Execute:
```bash
cd backend
node scripts/diagnose-user.js
```

## 🚨 Solução Rápida

Se você precisa resolver rapidamente:

1. **Acesse o painel administrativo como master**
2. **Vá para Colaboradores/Usuários**
3. **Encontre ou crie o usuário `temperodaneta1@gmail.com`**
4. **Defina uma nova senha** (ex: `@TemperodaNeta@2025`)
5. **Salve e tente fazer login novamente**

## 📊 Checklist de Verificação

- [ ] Verificou logs do backend no Render
- [ ] Confirmou que o usuário existe no banco
- [ ] Verificou se a senha está com hash bcrypt
- [ ] Verificou se o usuário está ativo (se for colaborador)
- [ ] Tentou resetar a senha
- [ ] Verificou se não há espaços extras no email ou senha

## 🔗 Próximos Passos

Após verificar os logs do backend, você saberá exatamente qual é o problema:
- Se o usuário não existe → Criar usuário
- Se a senha está incorreta → Resetar senha
- Se a senha não tem hash → O sistema tentará converter automaticamente
- Se o usuário está inativo → Ativar no painel
