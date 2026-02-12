# 🔧 Correção de Carregamento de ENV em ESM

## 📋 Problema Identificado

### Causa Raiz
Em ESM (ES Modules), os imports são **avaliados antes do código do arquivo**. Isso significa:

1. `server.js` tinha `console.log("DATABASE_URL:", process.env.DATABASE_URL)` na linha 1, **antes** de carregar dotenv
2. `db/postgres.js` criava o Pool no **top-level** usando `process.env.DATABASE_URL` que ainda estava `undefined`
3. Quando o Pool tentava conectar, a senha era `undefined`, causando erro SCRAM: "client password must be a string"

### Fluxo do Erro
```
1. node server.js
2. ESM avalia imports → importa db/postgres.js
3. postgres.js linha 5: new Pool({ connectionString: undefined })
4. Pool tenta conectar com password=undefined
5. PostgreSQL rejeita: "password must be a string"
6. server.js linha 1: console.log(undefined) ← muito tarde!
7. server.js linha 6: dotenv.config() ← muito tarde!
```

## ✅ Solução Implementada

### 1. Bootstrap Seguro (`bootstrap.js`)
Criado arquivo que:
- **Primeiro** carrega env (side-effect do import)
- **Depois** importa server.js dinamicamente
- Garante ordem correta de execução

### 2. LoadEnv Centralizado (`config/loadEnv.js`)
- Carrega `.env` em desenvolvimento
- Carrega `.env.test` em modo teste
- Valida variáveis críticas
- Erros claros se faltar algo

### 3. Lazy Initialization (`db/postgres.js`)
- Pool **não** é criado no top-level
- Função `getPool()` cria pool apenas quando necessário
- Valida DATABASE_URL antes de criar pool
- Garante que password seja string (não undefined)

### 4. Correções em `server.js`
- Removido `console.log` antes do dotenv
- Logs movidos para depois do carregamento de env
- Fallback para carregar env se executado diretamente

## 📁 Arquivos Alterados

1. ✅ **`backend/bootstrap.js`** (NOVO) - Entry point seguro
2. ✅ **`backend/config/loadEnv.js`** (NOVO) - Carregador de env
3. ✅ **`backend/db/postgres.js`** - Refatorado para lazy init
4. ✅ **`backend/server.js`** - Removido log antes do dotenv
5. ✅ **`backend/package.json`** - Scripts atualizados para usar bootstrap
6. ✅ **`backend/tests/setup/testDb.js`** - Usa loadEnv
7. ✅ **`backend/vitest.config.js`** - Configurado para testes
8. ✅ **`backend/.env.example`** (NOVO) - Template de env
9. ✅ **`backend/.env.test.example`** (NOVO) - Template de env de teste

## 🚀 Como Usar

### Desenvolvimento
```bash
cd backend
cp .env.example .env
# Editar .env com suas credenciais
npm run dev  # ou npm start
```

### Testes
```bash
cd backend
cp .env.test.example .env.test
# Editar .env.test com credenciais de teste
npm test
```

### Produção (Render)
- Render injeta `DATABASE_URL` via variáveis de ambiente
- Não precisa de `.env` em produção
- Código funciona automaticamente

## ✅ Validação

### Teste 1: Servidor Local
```bash
cd backend
node bootstrap.js
```

**Esperado:**
```
✅ Variáveis de ambiente carregadas de .env
🧪 ENV VALIDATED: { DATABASE_URL: '✅ Configurado', ... }
✅ PostgreSQL conectado: { timestamp: ..., version: ... }
🚀 Servidor rodando na porta 3000
```

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

## 🔍 Por Que Funciona Agora

### Antes (ERRADO)
```javascript
// server.js
console.log(process.env.DATABASE_URL); // undefined ❌
import { testConnection } from './db/postgres.js'; // Pool criado com undefined ❌
import { config } from 'dotenv';
config(); // Muito tarde! ❌
```

### Depois (CORRETO)
```javascript
// bootstrap.js
import './config/loadEnv.js'; // Carrega env PRIMEIRO ✅
await import('./server.js'); // Agora server.js tem env ✅

// db/postgres.js
function getPool() {
  // Pool criado apenas quando necessário, com env já carregado ✅
  return new Pool({ connectionString: process.env.DATABASE_URL });
}
```

## 📝 Resumo em 5 Linhas

**Problema:** ESM avalia imports antes do código, então `db/postgres.js` criava Pool com `DATABASE_URL=undefined` antes do dotenv carregar, causando erro SCRAM "password must be a string".

**Solução:** Criado `bootstrap.js` que carrega env primeiro (via `loadEnv.js`), depois importa server.js. `postgres.js` refatorado para lazy initialization, criando Pool apenas quando necessário (com env já carregado). Scripts atualizados para usar `bootstrap.js` como entry point.

---

**Status:** ✅ Correção completa aplicada. Pronto para teste.
