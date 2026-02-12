# 📝 Arquivos Alterados - Correção ENV ESM

## ✅ Arquivos Criados

1. **`backend/bootstrap.js`** (NOVO)
   - Entry point seguro que carrega env ANTES de importar server.js
   - Garante ordem correta de execução em ESM

2. **`backend/config/loadEnv.js`** (NOVO)
   - Carregador centralizado de variáveis de ambiente
   - Suporta `.env` (dev) e `.env.test` (testes)
   - Valida variáveis críticas

3. **`backend/tests/setup/loadTestEnv.js`** (NOVO)
   - Setup file para Vitest
   - Força NODE_ENV=test e carrega .env.test

4. **`backend/.env.example`** (NOVO)
   - Template de variáveis de ambiente

5. **`backend/.env.test.example`** (NOVO)
   - Template de variáveis de ambiente para testes

## ✅ Arquivos Modificados

1. **`backend/db/postgres.js`**
   - **ANTES:** Pool criado no top-level com `process.env.DATABASE_URL` (undefined)
   - **DEPOIS:** Lazy initialization - Pool criado apenas quando necessário
   - Validação de DATABASE_URL antes de criar pool
   - Garante que password seja string (não undefined)

2. **`backend/server.js`**
   - **ANTES:** `console.log("DATABASE_URL:", process.env.DATABASE_URL)` na linha 1 (antes do dotenv)
   - **DEPOIS:** Removido log antes do env, movido para depois com setImmediate
   - Removido import dinâmico problemático

3. **`backend/package.json`**
   - **ANTES:** `"start": "node server.js"`, `"dev": "node --watch server.js"`
   - **DEPOIS:** `"start": "node bootstrap.js"`, `"dev": "node --watch bootstrap.js"`

4. **`backend/tests/setup/testDb.js`**
   - **ANTES:** `dotenv.config()` no topo
   - **DEPOIS:** Importa `loadEnv.js` que já foi executado pelo vitest.config.js
   - Validação de host (garante localhost, não 'base')
   - Uso de parâmetros preparados (evita SQL injection)

5. **`backend/vitest.config.js`**
   - **ANTES:** Configuração básica
   - **DEPOIS:** Setup files incluem `loadTestEnv.js` antes de `testDb.js`

## 📋 Resumo das Mudanças

### Problema Raiz
ESM avalia imports antes do código do arquivo. `db/postgres.js` criava Pool no top-level com `DATABASE_URL=undefined`, causando erro SCRAM "password must be a string".

### Solução
1. **Bootstrap.js** carrega env primeiro (side-effect)
2. **postgres.js** usa lazy initialization (pool criado apenas quando necessário)
3. **loadEnv.js** centraliza carregamento e validação
4. Scripts atualizados para usar `bootstrap.js`

## 🎯 Como Validar

### Teste 1: Servidor Local
```bash
cd backend
node bootstrap.js
```

**Esperado:**
- ✅ `Variáveis de ambiente carregadas de .env`
- ✅ `PostgreSQL conectado: { timestamp: ..., version: ... }`
- ✅ `Servidor rodando na porta 3000`

**NÃO deve aparecer:**
- ❌ `DATABASE_URL: undefined`
- ❌ `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`
- ❌ `⚠️ PostgreSQL não disponível`

### Teste 2: Testes
```bash
cd backend
npm test
```

**Esperado:**
- Testes executam sem erro de conexão
- Banco de teste criado corretamente
- Nenhum erro de "password must be a string"

---

**Status:** ✅ Todas as correções aplicadas
