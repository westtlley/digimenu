# 🧪 Testes de Fluxos Core - DigiMenu

Este documento lista os testes essenciais para validar os fluxos principais do sistema.

## ✅ Checklist de Testes

### 1. Autenticação e Autorização

#### 1.1 Login
- [ ] Login com email e senha válidos retorna token
- [ ] Login com credenciais inválidas retorna erro 401
- [ ] Token é armazenado no localStorage
- [ ] Endpoint `/api/auth/me` retorna dados do usuário autenticado

#### 1.2 Google OAuth
- [ ] Redirecionamento para Google OAuth funciona
- [ ] Callback do Google cria/atualiza usuário
- [ ] Token é retornado após autenticação Google

#### 1.3 Contexto de Usuário
- [ ] Endpoint `/api/auth/user/context` retorna:
  - [ ] Dados do usuário
  - [ ] Permissões do plano
  - [ ] Dados do assinante (se aplicável)
  - [ ] Menu context (slug ou subscriber)

### 2. Estabelecimentos e Planos

#### 2.1 Criação de Estabelecimento
- [ ] Master pode criar estabelecimento via `/api/establishments`
- [ ] Estabelecimento criado tem plano padrão (basic)
- [ ] Token de senha é gerado para novo estabelecimento

#### 2.2 Atualização de Estabelecimento
- [ ] Master pode atualizar qualquer estabelecimento
- [ ] Dono do estabelecimento pode atualizar seu próprio estabelecimento
- [ ] Colaborador não pode atualizar estabelecimento

#### 2.3 Validação de Planos
- [ ] Plano FREE: limite de 20 produtos
- [ ] Plano BASIC: limite de 100 produtos
- [ ] Plano PRO: limite de 500 produtos
- [ ] Plano ULTRA: produtos ilimitados

### 3. Menus e Produtos

#### 3.1 Criação de Produto (Dish)
- [ ] Produto criado com sucesso dentro do limite do plano
- [ ] Tentativa de criar produto além do limite retorna erro 403
- [ ] Mensagem de erro indica limite atual e permitido
- [ ] Master não tem limite de produtos

#### 3.2 Cardápio Público
- [ ] Endpoint `/api/public/cardapio/:slug` retorna dados do cardápio
- [ ] Cardápio inclui: dishes, categories, complementGroups, store
- [ ] Slug inválido retorna erro 404
- [ ] Cardápio funciona para subscriber e master (com slug)

### 4. Pedidos

#### 4.1 Criação de Pedido
- [ ] Pedido criado com sucesso dentro do limite diário
- [ ] Tentativa de criar pedido além do limite retorna erro 403
- [ ] Mensagem de erro indica limite atual e permitido
- [ ] Master não tem limite de pedidos

#### 4.2 Pedido de Mesa
- [ ] Endpoint `/api/public/pedido-mesa` cria pedido
- [ ] Pedido criado tem status 'new'
- [ ] Código do pedido é gerado automaticamente
- [ ] Evento WebSocket é emitido quando pedido é criado

#### 4.3 Transições de Status
- [ ] Transição válida: new → accepted → preparing → ready → delivered
- [ ] Transição inválida retorna erro 400
- [ ] Mensagem de erro indica transições permitidas
- [ ] Master pode fazer qualquer transição (bypass)

**Status válidos:**
- `new` → `accepted`, `preparing`, `cancelled`
- `pending` → `accepted`, `cancelled`
- `accepted` → `preparing`, `cancelled`
- `preparing` → `ready`, `cancelled`
- `ready` → `delivering`, `delivered`, `cancelled`
- `delivering` → `delivered`, `cancelled`
- `delivered` → (final)
- `cancelled` → (final)

### 5. Usuários e Colaboradores

#### 5.1 Criação de Colaborador
- [ ] Colaborador criado com sucesso dentro do limite de usuários
- [ ] Tentativa de criar colaborador além do limite retorna erro 403
- [ ] Mensagem de erro indica limite atual e permitido
- [ ] Colaborador só pode ser criado em planos Pro e Ultra

#### 5.2 Perfis de Colaborador
- [ ] Perfis válidos: entregador, cozinha, pdv, garcom, gerente
- [ ] Gerente não pode criar outro gerente
- [ ] Colaborador pode ter múltiplos perfis

#### 5.3 Atualização de Perfil
- [ ] Usuário pode atualizar seu próprio perfil
- [ ] Master pode atualizar qualquer perfil
- [ ] Colaborador não pode atualizar perfil de outro

### 6. Validação de Permissões

#### 6.1 Middleware requirePermission
- [ ] Usuário sem permissão retorna erro 403
- [ ] Master tem acesso a tudo (bypass)
- [ ] Mensagem de erro indica permissão necessária e plano atual

#### 6.2 Middleware requireAccess
- [ ] Usuário sem acesso ao recurso retorna erro 403
- [ ] Master tem acesso a tudo (bypass)
- [ ] Mensagem de erro indica recurso necessário e plano atual

#### 6.3 Middleware requireMaster
- [ ] Usuário não-master retorna erro 403
- [ ] Master tem acesso permitido

### 7. Integração Frontend-Backend

#### 7.1 Tratamento de Erros
- [ ] Erro 400 (Bad Request) mostra mensagem clara
- [ ] Erro 401 (Unauthorized) redireciona para login
- [ ] Erro 403 (Forbidden) mostra mensagem de permissão negada
- [ ] Erro 500 (Server Error) mostra mensagem genérica

#### 7.2 Validação de Limites no Frontend
- [ ] Frontend NÃO valida limites (apenas backend)
- [ ] Frontend apenas exibe erros do backend
- [ ] Mensagens de erro do backend são exibidas ao usuário

## 🚀 Como Executar os Testes

### Testes Manuais

1. **Autenticação:**
   ```bash
   # Teste login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"senha123"}'
   ```

2. **Criação de Produto:**
   ```bash
   # Teste criação de produto (dentro do limite)
   curl -X POST http://localhost:3000/api/entities/Dish \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Produto Teste","price":10.50}'
   ```

3. **Criação de Pedido:**
   ```bash
   # Teste criação de pedido
   curl -X POST http://localhost:3000/api/public/pedido-mesa \
     -H "Content-Type: application/json" \
     -d '{"table_number":1,"items":[],"total":50.00,"customer_name":"Cliente Teste"}'
   ```

### Testes Automatizados (Futuro)

Os testes automatizados devem ser criados usando:
- **Backend:** Jest ou Vitest
- **Frontend:** Vitest (já configurado)
- **E2E:** Playwright ou Cypress (opcional)

## 📝 Notas

- Todos os testes devem validar que o **backend é a única fonte de verdade**
- Frontend apenas consome e renderiza dados
- Validações de limites e permissões são feitas apenas no backend
- Mensagens de erro devem ser claras e úteis para o usuário

## ✅ Critérios de Sucesso

- [ ] Todos os fluxos core funcionam corretamente
- [ ] Validações de limites funcionam
- [ ] Validações de permissões funcionam
- [ ] Transições de status funcionam
- [ ] Erros são tratados adequadamente
- [ ] Mensagens de erro são claras
