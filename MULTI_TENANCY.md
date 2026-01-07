# Sistema de Multi-Tenancy (Isolamento por Assinante)

## Visão Geral

O sistema implementa **isolamento completo de dados por assinante** (multi-tenancy). Cada assinante possui seu próprio "banco de dados" privado, onde todos os dados gerados são isolados e não podem ser acessados por outros assinantes.

## Como Funciona

### 1. Identificação do Tenant

- Cada usuário está associado a um `subscriber_id` através do campo `subscriber_email`
- O middleware `authenticate` identifica automaticamente o `subscriber_id` do usuário logado
- Master admin (`is_master = true`) não possui `subscriber_id` e pode acessar todos os dados

### 2. Isolamento Automático

Todas as rotas CRUD aplicam automaticamente o filtro de isolamento:

- **GET /api/entities/:entity**: Retorna apenas itens do `subscriber_id` do usuário
- **GET /api/entities/:entity/:id**: Verifica se o item pertence ao `subscriber_id` do usuário
- **POST /api/entities/:entity**: Associa automaticamente o `subscriber_id` ao novo item
- **PUT /api/entities/:entity/:id**: Verifica se o item pertence ao `subscriber_id` antes de atualizar
- **DELETE /api/entities/:entity/:id**: Verifica se o item pertence ao `subscriber_id` antes de deletar

### 3. Regras de Acesso

#### Master Admin
- `subscriber_id = null`
- Pode acessar **todos** os dados de **todos** os assinantes
- Pode criar dados globais (`subscriber_id = null`) ou específicos de um assinante
- Usado para administração do sistema

#### Assinantes Normais
- Possuem `subscriber_id` específico
- Só podem acessar dados com o **mesmo** `subscriber_id`
- Novos dados são automaticamente associados ao seu `subscriber_id`
- Não podem alterar o `subscriber_id` de itens existentes

#### Clientes
- Podem ser globais (`subscriber_id = null`) ou associados a um assinante
- Quando um cliente se cadastra diretamente, `subscriber_id = null`
- Quando um assinante cria um cliente, o cliente é associado ao `subscriber_id` do assinante

## Estrutura de Dados

### Campos Obrigatórios

Todas as entidades (exceto `Plan` e entidades globais) devem ter:

```javascript
{
  id: "entity_123",
  subscriber_id: "sub_456", // null para dados globais ou master admin
  created_date: "2024-01-01T00:00:00.000Z",
  updated_date: "2024-01-01T00:00:00.000Z",
  // ... outros campos
}
```

### Exemplo de Isolamento

**Assinante A** (`subscriber_id: "sub_123"`):
- Cria `Dish` com `subscriber_id: "sub_123"`
- Só vê seus próprios pratos
- Não vê pratos de outros assinantes

**Assinante B** (`subscriber_id: "sub_456"`):
- Cria `Dish` com `subscriber_id: "sub_456"`
- Só vê seus próprios pratos
- Não vê pratos de outros assinantes

**Master Admin** (`subscriber_id: null`):
- Vê **todos** os pratos de **todos** os assinantes
- Pode criar pratos para qualquer assinante

## Segurança

### Validações Implementadas

1. **Filtro Automático**: Todas as consultas filtram por `subscriber_id`
2. **Validação de Propriedade**: Operações de atualização/deleção verificam se o item pertence ao assinante
3. **Prevenção de Manipulação**: Usuários não podem alterar o `subscriber_id` de itens existentes
4. **Associação Automática**: Novos itens são automaticamente associados ao `subscriber_id` correto

### Logs

O sistema registra todas as operações com informações de `subscriber_id`:

```
✅ [Dish] Item criado com subscriber_id: sub_123
🗑️ [Dish] Item deletado (subscriber_id: sub_123)
```

## Migração de Dados Existentes

Se você tem dados existentes sem `subscriber_id`, você precisa:

1. Identificar a qual assinante cada dado pertence
2. Adicionar o `subscriber_id` correspondente
3. Garantir que todos os novos dados tenham `subscriber_id`

## Melhorias Futuras

- [ ] Migração automática de dados antigos
- [ ] Dashboard de estatísticas por tenant
- [ ] Backup e restore por tenant
- [ ] Limites de recursos por tenant
- [ ] Auditoria de acesso cross-tenant

## Exemplo de Uso

```javascript
// Assinante cria um prato
POST /api/entities/Dish
{
  "name": "Pizza Margherita",
  "price": 25.90
  // subscriber_id será adicionado automaticamente pelo backend
}

// Assinante lista seus pratos
GET /api/entities/Dish
// Retorna apenas pratos com subscriber_id do assinante

// Master admin lista todos os pratos
GET /api/entities/Dish
// Retorna pratos de todos os assinantes
```
