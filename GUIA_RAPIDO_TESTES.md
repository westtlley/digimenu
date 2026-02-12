# 🚀 Guia Rápido - Execução de Testes

## Setup Inicial

### 1. Instalar Dependências
```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar .env.example para .env (se não existir)
cp .env.example .env

# Editar .env e configurar:
# - DATABASE_URL (obrigatório)
# - JWT_SECRET (obrigatório)
# - TEST_DATABASE_URL (opcional, usa DATABASE_URL se não definido)
# - BACKEND_URL (opcional, para stress test)
```

### 3. Validar Configuração
```bash
node backend/scripts/setupTestEnv.js
```

## Executar Testes

### Testes Automatizados
```bash
cd backend
npm test
```

**Nota:** Os testes podem precisar de ajustes dependendo da configuração do ambiente. Eles foram criados como estrutura base.

### Testes em Modo Watch
```bash
cd backend
npm run test:watch
```

### Stress Test
```bash
# Configurar variáveis
export BACKEND_URL="http://localhost:3000"
export TEST_SLUG="seu-slug-de-teste"

# Executar
node backend/scripts/stressTest.js
```

## Checklist Manual

Siga o checklist completo em `CHECKLIST_PRE_CLIENTE.md`:

1. ✅ Cadastro e Login
2. ✅ Criar Estabelecimento
3. ✅ Criar Cardápio
4. ✅ Pedido Real
5. ✅ Permissões
6. ✅ Troca de Plano
7. ✅ Teste de Erro Forçado

## Estrutura de Testes

```
backend/tests/
  setup/
    testDb.js          # Configuração de banco isolado
    testHelpers.js     # Helpers (tokens, usuários, etc.)
  integration/
    auth.test.js       # Autenticação
    establishments.test.js
    menus.test.js
    orders.test.js
    planValidation.test.js
    permissions.test.js
```

## Troubleshooting

### Erro: "Banco de teste não disponível"
- Verifique se PostgreSQL está rodando
- Verifique se DATABASE_URL está correto
- Verifique permissões do usuário do banco

### Erro: "JWT_SECRET não definido"
- Configure JWT_SECRET no arquivo .env
- Ou use: `export JWT_SECRET="test-secret-key"`

### Testes falhando
- Os testes foram criados como estrutura base
- Podem precisar de ajustes dependendo da configuração real
- Verifique logs para identificar problemas específicos

## Próximos Passos

1. ✅ Executar checklist manual
2. ✅ Executar testes automatizados
3. ✅ Executar stress test
4. ✅ Usar prompts em `PROMPTS/` para análises adicionais
