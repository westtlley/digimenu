# ✅ Correções Aplicadas para Testes

## 📋 Problemas Corrigidos

### ✅ 1. Schema Atualizado
- **Arquivo:** `backend/db/schema.sql`
- **Correções:**
  - Adicionado `password_hash` na tabela `users` (necessário para testes)
  - Adicionado `slug` na tabela `subscribers` (necessário para testes)
  - Adicionados campos adicionais conforme necessário

### ✅ 2. sanitizePhone Corrigido
- **Arquivo:** `backend/utils/sanitize.js`
- **Problema:** Aceitava apenas 10-11 dígitos
- **Solução:** Agora aceita:
  - 10-11 dígitos (DDD + número)
  - 12-13 dígitos começando com 55 (DDI Brasil)
- **Teste:** `expect(sanitizePhone('5586999999999')).toBe('5586999999999')` agora passa ✅

### ✅ 3. Middleware de Autenticação
- **Arquivos:** 
  - `backend/middlewares/auth.js`
  - `backend/src/middlewares/auth.js`
- **Correções:**
  - Removido `/api/auth/me` das rotas públicas
  - Em modo TEST, sempre exige token (sem fallback)
  - Em desenvolvimento, mantém fallback para admin (apenas não-test)

### ✅ 4. DATABASE_URL Corrigida
- **Arquivo:** `backend/env.test`
- **Problema:** Formato inválido `postgresql://postgres=SUA_SENHA@...`
- **Solução:** Corrigido para `postgresql://postgres:SUA_SENHA@localhost:5432/digimenu_test`
- **Nota:** Usa `:` (dois pontos) entre usuário e senha, não `=`

### ✅ 5. testHelpers.js Atualizado
- **Arquivo:** `backend/tests/setup/testHelpers.js`
- **Correção:** Usa `full_name` em vez de `name` na tabela `users`

## 🧪 Como Rodar Testes

### 1. Configurar .env.test
```bash
cd backend
cp .env.test.example .env.test
# Editar .env.test com suas credenciais:
# DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/digimenu_test
```

### 2. Rodar Testes
```bash
npm test
```

Os testes criam bancos isolados automaticamente usando `schema.sql`.

## 📝 Formato Correto do DATABASE_URL

```
postgresql://usuario:senha@host:porta/banco
```

**Exemplo:**
```
postgresql://postgres:minhasenha123@localhost:5432/digimenu_test
```

**Importante:**
- Use `:` (dois pontos) entre usuário e senha
- Use `@` antes do host
- Use `/` antes do nome do banco
- Para testes, use `digimenu_test` como banco

## ✅ Status

- ✅ Schema atualizado
- ✅ sanitizePhone corrigido
- ✅ Autenticação corrigida para testes
- ✅ DATABASE_URL corrigida
- ✅ testHelpers atualizado

**Próximo passo:** Rodar `npm test` e corrigir erros restantes conforme aparecerem.
