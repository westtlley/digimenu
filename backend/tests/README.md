# Testes Automatizados - DigiMenu

## Estrutura

```
backend/tests/
  setup/
    testDb.js          # Configuração de banco isolado
    testHelpers.js     # Helpers para testes
  integration/
    auth.test.js       # Autenticação
    establishments.test.js
    menus.test.js
    orders.test.js
    planValidation.test.js
    permissions.test.js
```

## Executar Testes

```bash
cd backend
npm test
```

## Configuração

Os testes usam:
- **Vitest** como framework de testes
- **Supertest** para testes de API
- **Banco isolado** para testes (PostgreSQL de teste)

## Variáveis de Ambiente

Para testes, configure `.env.test`:

```bash
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/digimenu_test
JWT_SECRET=test-secret-key-minimo-32-caracteres-1234567890
NODE_ENV=test
```

**⚠️ IMPORTANTE - Formato do DATABASE_URL:**
- Use `:` (dois pontos) entre usuário e senha: `postgresql://usuario:senha@host:porta/banco`
- **NÃO** use `=` (igual): `postgresql://usuario=senha@...` ❌
- Para testes, use `digimenu_test` como nome do banco
- Exemplo correto: `postgresql://postgres:minhasenha@localhost:5432/digimenu_test`

## Nota

Os testes podem falhar se:
- PostgreSQL não estiver disponível
- Banco de teste não puder ser criado
- Variáveis de ambiente não estiverem configuradas

Nesses casos, os testes serão pulados com avisos.
