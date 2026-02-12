# 🧪 PROMPT — TESTES AUTOMATIZADOS DIGIMENU

## Instruções

Copie e cole este prompt no Cursor para criação de testes automatizados para o DigiMenu.

---

```
Você é um engenheiro QA + backend especializado em testes automatizados para SaaS.

## Contexto

O DigiMenu é um sistema SaaS multi-tenant para gestão de cardápios digitais e pedidos. O sistema precisa garantir que o backend nunca permita estados inválidos, mesmo sob carga.

## Objetivo

Criar testes para os fluxos CORE do DigiMenu, garantindo que o backend sempre valide corretamente limites, permissões e transições de status.

## Tarefas

### 1. Autenticação

Criar testes em `backend/tests/integration/auth.test.js`:
- Login válido retorna token
- Login inválido retorna 401
- Token inválido retorna 401
- Token expirado retorna 401
- Endpoint `/api/auth/me` retorna dados do usuário

### 2. Criação de Estabelecimento

Criar testes em `backend/tests/integration/establishments.test.js`:
- Master pode criar estabelecimento
- Usuário não-master não pode criar estabelecimento
- Estabelecimento criado tem plano padrão (free)
- Usuário não pode acessar estabelecimento de outro usuário

### 3. Criação de Cardápio

Criar testes em `backend/tests/integration/menus.test.js`:
- Criar produto válido dentro do limite
- Ultrapassar limite de produtos retorna 403
- Mensagem de erro indica limite atual e permitido
- Master não tem limite de produtos

### 4. Criação de Pedido

Criar testes em `backend/tests/integration/orders.test.js`:
- Criar pedido válido dentro do limite
- Ultrapassar limite de pedidos retorna 403
- Mensagem de erro indica limite atual e permitido
- Master não tem limite de pedidos

### 5. Validação de Limites de Plano

Criar testes em `backend/tests/integration/planValidation.test.js`:
- Plano Free bloqueando produtos além de 30
- Plano Free bloqueando pedidos além de 20/mês
- Plano Pro permitindo produtos ilimitados
- Plano Pro permitindo pedidos ilimitados
- Downgrade bloqueando novos cadastros além do limite

### 6. Validação de Transições de Status

Criar testes em `backend/tests/integration/orders.test.js`:
- Transição válida: new → accepted → preparing → ready → delivered
- Transição inválida retorna 400
- Mensagem de erro indica transições permitidas
- Master pode fazer qualquer transição (bypass)

### 7. Permissões por Perfil

Criar testes em `backend/tests/integration/permissions.test.js`:
- Middleware `requirePermission` bloqueia sem permissão
- Middleware `requireAccess` bloqueia sem acesso
- Middleware `requireMaster` bloqueia não-master
- Master tem bypass em todas as validações

## Estrutura de Testes

Use:
- **Vitest** como framework de testes
- **Supertest** para testes de API
- **Banco isolado** para testes (PostgreSQL de teste)
- **Dados controlados** (criar e limpar entre testes)

## Critérios de Qualidade

Cada teste deve:
- ✅ Testar casos válidos e inválidos
- ✅ Verificar mensagens de erro claras
- ✅ Nunca permitir 500 em casos esperados
- ✅ Validar que backend é a única fonte de verdade
- ✅ Resetar dados entre testes

## Não Teste

- ❌ UI (frontend)
- ❌ Estilos CSS
- ❌ Componentes React
- ✅ Apenas backend (API)

## Arquivos de Referência

- `backend/tests/setup/testDb.js` - Configuração de banco de teste
- `backend/tests/setup/testHelpers.js` - Helpers para testes
- `backend/tests/integration/auth.test.js` - Exemplo de teste
- `backend/modules/orders/orders.service.js` - Lógica de negócio
- `backend/services/planValidation.service.js` - Validação de limites
- `backend/services/orderStatusValidation.service.js` - Validação de status

## Exemplo de Teste Esperado

```javascript
describe('POST /api/entities/Dish', () => {
  it('deve retornar 403 ao ultrapassar limite do plano Free (30 produtos)', async () => {
    // Setup: criar 30 produtos
    // Action: tentar criar o 31º
    // Assert: 403 com mensagem clara
  });
});
```

## Foco Principal

👉 Garantir que o backend nunca permita estados inválidos, mesmo sob carga ou requisições simultâneas.

---

## Como Usar

1. Copie o conteúdo acima (a partir de "Você é um engenheiro...")
2. Cole no Cursor
3. Aguarde a criação dos testes
4. Execute: `cd backend && npm test`
5. Corrija qualquer teste que falhar
