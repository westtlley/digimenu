# 🎯 Checklist Operacional Pré-Primeiro Cliente - DigiMenu

## Objetivo

Garantir que:
- ✅ Nada quebra
- ✅ Nenhum limite falha
- ✅ Nenhuma permissão vaza
- ✅ Nenhum erro 500 aparece

---

## PARTE 1 — CHECKLIST MANUAL (VOCÊ EXECUTANDO)

### 🧍 1. Fluxo de Dono do Estabelecimento

#### ✅ 1.1 Cadastro

- [ ] **Criar conta nova**
  - Acessar `/register` ou `/signup`
  - Preencher: email, senha, nome
  - Confirmar criação

- [ ] **Confirmar login**
  - Fazer login com credenciais criadas
  - Verificar redirecionamento correto

- [ ] **Verificar JWT válido**
  - Token armazenado no `localStorage` como `auth_token`
  - Token presente no header `Authorization: Bearer <token>`
  - Endpoint `/api/auth/me` retorna dados do usuário

- [ ] **Verificar isolamento de dados**
  - Criar usuário A e usuário B
  - Usuário A não acessa dados do estabelecimento do usuário B
  - Tentar acessar `/api/entities/Establishment/:id` de outro usuário retorna 403

#### ✅ 1.2 Criar Estabelecimento

- [ ] **Criação básica**
  - Criar estabelecimento via `/api/establishments` (POST)
  - Preencher: nome, categoria
  - Plano padrão deve ser `free`
  - Verificar vínculo correto com usuário logado

- [ ] **Testar limites**
  - Criar dois establishments com mesmo usuário (se plano permitir)
  - Tentar criar além do limite do plano
  - **Esperado:** 400 com mensagem clara, nunca 500

#### ✅ 1.3 Criar Cardápio

- [ ] **Criação de menu**
  - Criar menu via `/api/entities/Menu` (POST)
  - Vincular ao estabelecimento criado

- [ ] **Criação de produtos**
  - Criar 5 produtos via `/api/entities/Dish` (POST)
  - Verificar produtos aparecem no cardápio público

- [ ] **Edição de produto**
  - Editar produto existente via `/api/entities/Dish/:id` (PUT)
  - Verificar alterações refletem no cardápio público

- [ ] **Deleção de produto**
  - Deletar produto via `/api/entities/Dish/:id` (DELETE)
  - Verificar produto removido do cardápio público

- [ ] **Testar limite de produtos (plano Free)**
  - Plano Free: limite de 30 produtos
  - Criar 30 produtos (deve funcionar)
  - Tentar criar o 31º produto
  - **Esperado:** 403 com mensagem: "Limite de produtos excedido. Seu plano permite 30 produtos. Você já tem 30."

#### ✅ 1.4 Pedido Real (Simulação Cliente)

- [ ] **Abrir cardápio público**
  - Acessar `/s/:slug` (slug do estabelecimento)
  - Verificar cardápio carrega corretamente
  - Verificar produtos aparecem

- [ ] **Criar pedido**
  - Adicionar item ao carrinho
  - Finalizar pedido
  - Verificar pedido criado com status `new`

- [ ] **Alterar status do pedido (no painel)**
  - Acessar painel do estabelecimento
  - Alterar status: `new` → `accepted`
  - Alterar status: `accepted` → `preparing`
  - Alterar status: `preparing` → `ready`
  - Alterar status: `ready` → `delivered`
  - Verificar cada transição funciona

- [ ] **Testar transição inválida**
  - Tentar pular status: `new` → `delivered` (direto)
  - **Esperado:** 400 com mensagem: "Transição inválida: 'new' → 'delivered'. Transições permitidas de 'new': accepted, preparing, cancelled"

#### ✅ 1.5 Permissões

Testar com diferentes perfis:

- [ ] **Admin (Master)**
  - Pode criar produto? ✅
  - Pode alterar status? ✅
  - Pode ver relatórios? ✅
  - Pode acessar todos os estabelecimentos? ✅

- [ ] **Dono do Estabelecimento**
  - Pode criar produto? ✅
  - Pode alterar status? ✅
  - Pode ver relatórios? ✅ (se plano permitir)
  - Pode acessar outros estabelecimentos? ❌

- [ ] **Colaborador (Gerente)**
  - Pode criar produto? ✅ (se plano Pro/Ultra)
  - Pode alterar status? ✅
  - Pode ver relatórios? ✅ (se plano permitir)
  - Pode criar outro gerente? ❌

- [ ] **Colaborador (Entregador)**
  - Pode criar produto? ❌
  - Pode alterar status? ✅ (apenas para entregar)
  - Pode ver relatórios? ❌

- [ ] **Colaborador (Cozinha)**
  - Pode criar produto? ❌
  - Pode alterar status? ✅ (apenas preparing → ready)
  - Pode ver relatórios? ❌

- [ ] **Usuário comum (sem vínculo)**
  - Pode criar produto? ❌
  - Pode alterar status? ❌
  - Pode ver relatórios? ❌

**Importante:** Todas as validações devem ser feitas no **backend**, não no frontend.

#### ✅ 1.6 Troca de Plano

- [ ] **Simular upgrade**
  - Alterar plano de `free` → `pro` via `/api/establishments/:id` (PUT)
  - Verificar limites aumentam:
    - Produtos: 30 → ilimitado
    - Pedidos: 20/mês → ilimitado
  - Criar produto além do limite antigo (deve funcionar)

- [ ] **Simular downgrade**
  - Alterar plano de `pro` → `free`
  - Verificar sistema bloqueia novos cadastros além do limite
  - **Esperado:** Não quebra, apenas bloqueia com mensagem clara

#### ✅ 1.7 Teste de Erro Forçado

- [ ] **Token inválido**
  - Fazer requisição com token inválido
  - **Esperado:** 401 Unauthorized

- [ ] **Token expirado**
  - Fazer requisição com token expirado
  - **Esperado:** 401 Unauthorized

- [ ] **ID inexistente**
  - Tentar acessar `/api/entities/Dish/999999` (inexistente)
  - **Esperado:** 404 Not Found

- [ ] **Payload incompleto**
  - Tentar criar produto sem `name` ou `price`
  - **Esperado:** 400 Bad Request com mensagem clara

- [ ] **Sem permissão**
  - Tentar criar produto sem permissão
  - **Esperado:** 403 Forbidden com mensagem clara

**Critério:** Nunca deve retornar 500 em casos esperados. Sempre 401, 403, 404 ou 400 com mensagem clara.

---

## PARTE 2 — TESTES AUTOMATIZADOS (EXECUTÁVEIS)

Os testes automatizados devem ser executados com:

```bash
cd backend
npm test
```

### 🔐 auth.test.js

Cobrir:
- [ ] Login válido retorna token
- [ ] Login inválido retorna 401
- [ ] Token inválido retorna 401
- [ ] Token expirado retorna 401
- [ ] Endpoint `/api/auth/me` retorna dados do usuário

### 🏪 establishments.test.js

Cobrir:
- [ ] Criar establishment válido
- [ ] Criar acima do limite do plano retorna 403
- [ ] Usuário tentando acessar establishment de outro usuário retorna 403
- [ ] Master pode acessar qualquer establishment

### 📋 menus.test.js

Cobrir:
- [ ] Criar produto válido
- [ ] Ultrapassar limite do plano retorna 403
- [ ] Editar produto existente
- [ ] Deletar produto inexistente retorna 404
- [ ] Produto aparece no cardápio público

### 🛒 orders.test.js

Cobrir:
- [ ] Criar pedido válido
- [ ] Alterar status válido (new → accepted → preparing → ready → delivered)
- [ ] Alterar status inválido retorna 400
- [ ] Usuário sem permissão alterando status retorna 403
- [ ] Pedido criado emite evento WebSocket

### 💰 planValidation.test.js

Cobrir:
- [ ] Plano Free bloqueando produtos além de 30
- [ ] Plano Free bloqueando pedidos além de 20/mês
- [ ] Plano Pro permitindo produtos ilimitados
- [ ] Plano Pro permitindo pedidos ilimitados
- [ ] Downgrade bloqueando novos cadastros além do limite

### 🔒 permissions.test.js

Cobrir:
- [ ] Middleware `requirePermission` bloqueia sem permissão
- [ ] Middleware `requireAccess` bloqueia sem acesso
- [ ] Middleware `requireMaster` bloqueia não-master
- [ ] Master tem bypass em todas as validações

---

## PARTE 3 — TESTE DE STRESS LEVE

Executar script:

```bash
node backend/scripts/stressTest.js
```

Verificar:
- [ ] 50 pedidos simultâneos criados com sucesso
- [ ] Nenhum status inconsistente
- [ ] Nenhum pedido duplicado
- [ ] Nenhum erro 500
- [ ] Limite de pedidos respeitado (se aplicável)

---

## PARTE 4 — SIMULAÇÃO REALISTA

### Teste com Usuário Leigo

Pegue:
- Um amigo
- Ou sua sócia
- Ou alguém que não sabe programar

Peça:
> "Cria um cardápio e faz um pedido."

Observe:
- [ ] Onde trava?
- [ ] Onde pergunta?
- [ ] Onde fica confuso?
- [ ] Fluxo completo em menos de 5 minutos?

**Esse teste vale mais que 100 testes unitários.**

---

## 📌 CRITÉRIO FINAL DE LIBERAÇÃO

Você só libera para cliente se:

- [ ] **0 erros 500** em casos esperados
- [ ] **0 bypass de permissão** (backend sempre valida)
- [ ] **0 limite quebrado** (validação sempre funciona)
- [ ] **Pedido completo funcionando** (criar → preparar → finalizar)
- [ ] **Fluxo simples em menos de 5 minutos** (criar estabelecimento → cardápio → pedido)

---

## 🚨 Realidade

**Se passar por tudo isso:**
👉 Você está pronto para vender.

**Se falhar em algo:**
👉 Melhor descobrir agora do que com cliente pagando.

---

## 📝 Notas de Execução

Use este espaço para anotar problemas encontrados durante a execução:

```
Data: ___________
Executor: ___________

Problemas encontrados:
1. 
2. 
3. 

Correções aplicadas:
1. 
2. 
3. 
```

---

## 🔗 Links Úteis

- [Documentação da API](backend/README.md)
- [Testes de Fluxos Core](TESTES_FLUXOS_CORE.md)
- [Validação de Deploy](VALIDACAO_DEPLOY.md)
