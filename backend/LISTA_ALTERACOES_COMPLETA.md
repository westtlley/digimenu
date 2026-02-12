# 📋 Lista Completa de Alterações - Correção ENV ESM

## ✅ Arquivos Criados (5)

1. **`backend/bootstrap.js`**
   - Entry point seguro que carrega env ANTES de qualquer import
   - Importa server.js dinamicamente após carregar env

2. **`backend/config/loadEnv.js`**
   - Carregador centralizado de variáveis de ambiente
   - Suporta `.env` (dev) e `.env.test` (testes)
   - Valida DATABASE_URL, JWT_SECRET e outras variáveis críticas
   - Carrega automaticamente ao ser importado (side-effect)

3. **`backend/tests/setup/loadTestEnv.js`**
   - Setup file para Vitest
   - Força NODE_ENV=test antes de carregar env
   - Garante que `.env.test` seja carregado

4. **`backend/.env.example`**
   - Template completo de variáveis de ambiente
   - Inclui todas as variáveis necessárias com exemplos

5. **`backend/.env.test.example`**
   - Template de variáveis de ambiente para testes
   - Configurado para usar `digimenu_test`

## ✅ Arquivos Modificados (6)

1. **`backend/db/postgres.js`**
   - **ANTES:** 
     ```javascript
     const pool = new Pool({
       connectionString: process.env.DATABASE_URL, // undefined!
     });
     ```
   - **DEPOIS:**
     ```javascript
     let pool = null;
     function getPool() {
       if (!pool) {
         // Valida DATABASE_URL e cria pool apenas quando necessário
         pool = new Pool({ connectionString: process.env.DATABASE_URL });
       }
       return pool;
     }
     ```
   - Validação de DATABASE_URL antes de criar pool
   - Garante que password seja string (não undefined)
   - Erros claros se DATABASE_URL estiver faltando ou inválida

2. **`backend/server.js`**
   - **ANTES:** 
     ```javascript
     console.log("DATABASE_URL:", process.env.DATABASE_URL); // linha 1 - undefined!
     import { config } from 'dotenv';
     config(); // linha 6 - muito tarde!
     ```
   - **DEPOIS:**
     ```javascript
     // Env já foi carregado pelo bootstrap.js
     setImmediate(() => {
       console.log('🧪 ENV VALIDATED:', { ... }); // Log após env carregado
     });
     ```
   - Removido log antes do env
   - Removido import dinâmico problemático

3. **`backend/package.json`**
   - **ANTES:** 
     ```json
     "start": "node server.js",
     "dev": "node --watch server.js",
     ```
   - **DEPOIS:**
     ```json
     "start": "node bootstrap.js",
     "dev": "node --watch bootstrap.js",
     ```

4. **`backend/tests/setup/testDb.js`**
   - **ANTES:** 
     ```javascript
     import dotenv from 'dotenv';
     dotenv.config(); // Não carrega .env.test automaticamente
     ```
   - **DEPOIS:**
     ```javascript
     // loadTestEnv.js já foi executado pelo vitest.config.js
     // process.env.DATABASE_URL já está carregado do .env.test
     ```
   - Validação de host (garante localhost, não 'base')
   - Uso de parâmetros preparados (evita SQL injection)

5. **`backend/vitest.config.js`**
   - **ANTES:** Configuração básica sem setup files
   - **DEPOIS:**
     ```javascript
     setupFiles: ['./tests/setup/loadTestEnv.js', './tests/setup/testDb.js']
     ```
   - Garante que env seja carregado antes dos testes

6. **`backend/.gitignore`**
   - Adicionado `.env.test` para não commitar arquivos de teste

## 🔍 Explicação do Problema (5 Linhas)

**Causa:** Em ESM, os imports são avaliados antes do código do arquivo. `server.js` tinha `console.log(process.env.DATABASE_URL)` na linha 1 (antes do dotenv), e `db/postgres.js` criava Pool no top-level com `DATABASE_URL=undefined`. Quando o Pool tentava conectar, a senha era `undefined`, causando erro SCRAM "client password must be a string".

**Solução:** Criado `bootstrap.js` que carrega env primeiro (via `loadEnv.js`), depois importa server.js. `postgres.js` refatorado para lazy initialization, criando Pool apenas quando necessário (com env já carregado). Scripts atualizados para usar `bootstrap.js` como entry point.

## ✅ Critérios de Aceite

### ✅ Teste 1: Servidor Local
```bash
cd backend
node bootstrap.js
```

**Resultado Esperado:**
- ✅ `✅ Variáveis de ambiente carregadas de .env`
- ✅ `✅ PostgreSQL conectado: { timestamp: ..., version: ... }`
- ✅ `🚀 Servidor rodando na porta 3000`
- ❌ **NÃO** deve aparecer: `DATABASE_URL: undefined`
- ❌ **NÃO** deve aparecer: `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`
- ❌ **NÃO** deve aparecer: `⚠️ PostgreSQL não disponível`

### ✅ Teste 2: Testes
```bash
cd backend
npm test
```

**Resultado Esperado:**
- ✅ Testes executam sem erro de conexão
- ✅ Banco de teste criado corretamente
- ❌ **NÃO** deve aparecer: `password must be a string`
- ❌ **NÃO** deve falhar por "Banco de teste não disponível" por causa de host errado

## 🔒 Compatibilidade

- ✅ **Produção (Render):** Funciona automaticamente (env injetado via variáveis de ambiente)
- ✅ **Desenvolvimento:** Usa `.env` local
- ✅ **Testes:** Usa `.env.test` automaticamente quando `NODE_ENV=test`

---

**Status:** ✅ Todas as correções aplicadas. Backend pronto para rodar localmente.
