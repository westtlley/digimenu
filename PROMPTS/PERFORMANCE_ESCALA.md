# 🧠 PROMPT — PERFORMANCE E ESCALABILIDADE DIGIMENU

## Instruções

Copie e cole este prompt no Cursor para análise de performance e escalabilidade do DigiMenu.

---

```
Você é um engenheiro backend sênior focado em performance, concorrência e escalabilidade SaaS.

## Contexto

O DigiMenu é um sistema SaaS multi-tenant para gestão de cardápios digitais e pedidos. O sistema precisa suportar múltiplos estabelecimentos simultâneos, com picos de tráfego durante horários de pico (almoço, jantar).

## Objetivo

Analisar gargalos de performance, prevenir problemas de concorrência e preparar o sistema para múltiplos pedidos simultâneos.

## Tarefas

### 1. Revisar Fluxo de Criação de Pedidos

Analise o arquivo `backend/modules/orders/orders.service.js` e verifique:
- Há validação atômica de limites? (transações PostgreSQL)
- Há risco de race conditions na criação simultânea?
- A validação de limite é feita antes ou depois de criar o pedido?
- Há locks adequados para prevenir duplicatas?

### 2. Garantir Consistência de Status (Race Conditions)

Analise `backend/services/orderStatusValidation.service.js` e verifique:
- Transições de status são validadas de forma atômica?
- Há risco de dois usuários alterarem status simultaneamente?
- A atualização de status usa transações ou locks?

### 3. Avaliar Queries Críticas

Revise queries em `backend/db/repository.js` e identifique:
- Queries sem índices que podem ser lentas
- Queries que fazem full table scan
- Queries que não usam WHERE clauses adequadas
- Queries que podem ser otimizadas com JOINs

### 4. Sugerir Índices PostgreSQL

Analise `backend/db/schema.sql` e sugira índices para:
- `entities` table: `entity_type`, `subscriber_email`, `created_at`
- `subscribers` table: `email`, `slug`, `plan`
- `users` table: `email`, `subscriber_email`
- Queries frequentes de contagem (COUNT) para validação de limites

### 5. Verificar Uso Excessivo de Memória

Analise:
- Pool de conexões PostgreSQL está configurado corretamente?
- Há vazamentos de memória em WebSocket connections?
- Cache está sendo usado adequadamente?
- Há queries que carregam muitos dados desnecessariamente?

### 6. Garantir Idempotência Onde Necessário

Verifique:
- Criação de pedidos é idempotente? (mesmo pedido criado duas vezes = erro ou sucesso?)
- Atualização de status é idempotente? (mesmo status aplicado duas vezes = erro ou sucesso?)
- Há proteção contra requisições duplicadas?

## Restrições

- ❌ NÃO adicione features
- ❌ NÃO refatore sem impacto real
- ❌ NÃO altere regra de negócio
- ✅ Foque apenas em performance e escalabilidade

## Formato da Resposta

Para cada item analisado, explique:

1. **Onde está o risco**
   - Arquivo e linha específica
   - Código problemático

2. **O impacto**
   - O que pode acontecer em produção
   - Quantos usuários simultâneos podem causar o problema

3. **A correção mínima necessária**
   - Código específico para corrigir
   - Sem over-engineering

## Arquivos Principais

- `backend/modules/orders/orders.service.js` - Criação de pedidos
- `backend/services/planValidation.service.js` - Validação de limites
- `backend/services/orderStatusValidation.service.js` - Validação de status
- `backend/db/repository.js` - Queries do banco
- `backend/db/schema.sql` - Schema do banco
- `backend/db/postgres.js` - Pool de conexões

## Exemplo de Análise Esperada

```
### 1. Race Condition na Criação de Pedidos

**Onde está o risco:**
- Arquivo: `backend/modules/orders/orders.service.js:33-56`
- Problema: Validação de limite e criação de pedido não são atômicas

**Impacto:**
- 2 pedidos simultâneos podem passar pela validação antes de qualquer um ser criado
- Resultado: Limite pode ser ultrapassado

**Correção mínima:**
- Usar transação PostgreSQL com BEGIN/COMMIT
- Validar limite e criar pedido na mesma transação
```

---

## Como Usar

1. Copie o conteúdo acima (a partir de "Você é um engenheiro...")
2. Cole no Cursor
3. Aguarde a análise
4. Revise as sugestões
5. Implemente apenas as correções críticas
