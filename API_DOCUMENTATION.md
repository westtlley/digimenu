# 📚 Documentação da API - DigiMenu

## Base URL

- **Desenvolvimento**: `http://localhost:3000/api`
- **Produção**: `https://digimenu-backend-3m6t.onrender.com/api`

---

## Autenticação

Todas as rotas (exceto públicas) requerem autenticação via JWT Bearer Token.

**Header**: `Authorization: Bearer {token}`

### Rotas Públicas

- `GET /api/health` - Status do servidor
- `POST /api/auth/login` - Login
- `POST /api/auth/set-password` - Definir senha
- `POST /api/upload-image` - Upload de imagem
- `GET /api/public/cardapio/:slug` - Cardápio público

---

## Autenticação

### POST /api/auth/login

Autentica usuário e retorna token JWT.

**Request Body**:
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response 200**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "usuario@example.com",
    "full_name": "Nome do Usuário",
    "is_master": false,
    "role": "user"
  }
}
```

**Erros**:
- `401` - Credenciais inválidas
- `429` - Muitas tentativas de login

---

### GET /api/auth/me

Retorna dados do usuário autenticado.

**Headers**: `Authorization: Bearer {token}`

**Response 200**:
```json
{
  "id": "1",
  "email": "usuario@example.com",
  "full_name": "Nome do Usuário",
  "is_master": false,
  "role": "user",
  "subscriber_email": "restaurante@example.com"
}
```

---

## Entidades

Sistema genérico de CRUD para todas as entidades.

### GET /api/entities/:entity

Lista entidades do tipo especificado.

**Parâmetros**:
- `entity` (path): Tipo da entidade (Store, Dish, Order, Category, etc.)
- `order` (query): Campo de ordenação (ex: `name`, `-created_at`)
- `as_subscriber` (query): Email do assinante (apenas master)

**Exemplos**:
- `GET /api/entities/Store`
- `GET /api/entities/Dish?order=-created_at`
- `GET /api/entities/Order?as_subscriber=restaurante@example.com`

**Response 200**:
```json
[
  {
    "id": "1",
    "name": "Restaurante Exemplo",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### GET /api/entities/:entity/:id

Obtém uma entidade específica por ID.

**Response 200**: Objeto da entidade

**Erros**:
- `404` - Entidade não encontrada

---

### POST /api/entities/:entity

Cria nova entidade.

**Request Body**: Objeto com dados da entidade

**Response 201**: Entidade criada

---

### PUT /api/entities/:entity/:id

Atualiza entidade existente.

**Request Body**: Campos a serem atualizados

**Response 200**: Entidade atualizada

---

### DELETE /api/entities/:entity/:id

Deleta entidade.

**Response 200**: `{ "success": true }`

**Erros**:
- `404` - Entidade não encontrada

---

## Funções

### POST /api/functions/:name

Invoca função customizada no backend.

**Parâmetros**:
- `name` (path): Nome da função
- Body: Parâmetros da função

**Exemplos**:
```bash
POST /api/functions/checkSubscriptionStatus
{
  "user_email": "restaurante@example.com"
}
```

---

## Analytics (Apenas Master)

### GET /api/analytics/dashboard

Dashboard de métricas principais.

**Query Params**:
- `subscriber_email` (opcional): Filtrar por assinante

**Response 200**:
```json
{
  "metrics": [
    {
      "event_name": "order.created",
      "total": 150,
      "days_active": 7,
      "first_occurrence": "2024-01-01T00:00:00.000Z",
      "last_occurrence": "2024-01-08T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/analytics/metrics

Métricas de um período específico.

**Query Params**:
- `start_date` (obrigatório): Data inicial (ISO 8601)
- `end_date` (obrigatório): Data final (ISO 8601)
- `subscriber_email` (opcional): Filtrar por assinante

**Response 200**:
```json
{
  "metrics": [
    {
      "event_name": "order.created",
      "count": 45,
      "date": "2024-01-01"
    }
  ]
}
```

---

## Backup (Apenas Master)

### POST /api/backup/create

Cria backup manual do banco de dados.

**Response 200**:
```json
{
  "success": true,
  "filename": "backup-2024-01-01T10-30-00.sql",
  "filepath": "./backups/backup-2024-01-01T10-30-00.sql"
}
```

---

### GET /api/backup/list

Lista backups disponíveis.

**Response 200**:
```json
{
  "backups": [
    {
      "filename": "backup-2024-01-01T10-30-00.sql",
      "filepath": "./backups/backup-2024-01-01T10-30-00.sql",
      "size": 1024000,
      "created": "2024-01-01T10:30:00.000Z"
    }
  ]
}
```

---

### POST /api/backup/restore

Restaura backup do banco de dados.

**Request Body**:
```json
{
  "filename": "backup-2024-01-01T10-30-00.sql"
}
```

**Response 200**:
```json
{
  "success": true
}
```

---

## Rate Limiting

- **Login**: 5 tentativas por 15 minutos por IP
- **API Geral**: 100 requisições por 15 minutos por IP
- **Criação**: 10 requisições por minuto por IP

---

## Códigos de Erro

- `400` - Bad Request (dados inválidos)
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Não encontrado
- `429` - Rate limit excedido
- `500` - Erro interno do servidor

---

## Eventos de Analytics

### Pedidos
- `order.created` - Pedido criado
- `order.accepted` - Pedido aceito
- `order.completed` - Pedido concluído
- `order.cancelled` - Pedido cancelado

### PDV
- `pdv.sale` - Venda iniciada
- `pdv.sale.completed` - Venda concluída

### Caixa
- `caixa.opened` - Caixa aberto
- `caixa.closed` - Caixa fechado

### Usuários
- `user.login` - Login realizado
- `user.logout` - Logout realizado
- `user.signup` - Cadastro realizado

### Assinantes
- `subscriber.created` - Assinante criado
- `subscriber.activated` - Assinante ativado
- `subscriber.deactivated` - Assinante desativado

---

## Exemplos de Uso

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:3000/api/entities/Store', {
  headers: {
    'Authorization': 'Bearer seu-token-jwt',
    'Content-Type': 'application/json'
  }
});
const stores = await response.json();
```

### cURL
```bash
curl -X GET http://localhost:3000/api/entities/Store \
  -H "Authorization: Bearer seu-token-jwt"
```

---

**Última atualização**: 2024-01-28
