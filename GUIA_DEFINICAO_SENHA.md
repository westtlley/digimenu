# 🔐 Guia de Definição de Senha - DigiMenu

## 📋 Visão Geral

Quando um assinante é cadastrado, o sistema gera automaticamente um **token temporário** que permite ao cliente definir sua senha de acesso. Este token é válido por **7 dias**.

## 🔄 Fluxo Completo

### 1. **Cadastro do Assinante (Master)**

Quando você cadastra um novo assinante na página **Assinantes**:

1. O sistema cria automaticamente:
   - ✅ Registro em `db.subscribers`
   - ✅ Registro em `db.users` (se não existir)
   - ✅ **Token temporário** para definir senha

2. Após criar, o sistema exibe:
   - ✅ Link de definição de senha
   - ✅ Link copiado automaticamente para área de transferência

### 2. **Enviar Link para o Cliente**

Você pode enviar o link para o cliente via:
- 📧 Email
- 💬 WhatsApp
- 📱 SMS
- Ou qualquer outro meio de comunicação

**Formato do link:**
```
http://localhost:5173/definir-senha?token=pwd_1234567890_abc123
```

### 3. **Cliente Define a Senha**

O cliente acessa o link e:
1. Preenche a nova senha (mínimo 6 caracteres)
2. Confirma a senha
3. Clica em "Definir Senha"
4. É redirecionado para a página de login

### 4. **Cliente Faz Login**

Após definir a senha, o cliente pode:
1. Acessar `/login`
2. Informar email e senha
3. Fazer login normalmente

## 🔧 Endpoints da API

### POST `/api/auth/set-password`

Define a senha usando o token.

**Request:**
```json
{
  "token": "pwd_1234567890_abc123",
  "password": "senha123"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "Senha definida com sucesso! Você já pode fazer login."
}
```

**Response (Erro):**
```json
{
  "error": "Token inválido ou expirado"
}
```

### POST `/api/auth/generate-password-token`

Gera um novo token para um usuário existente.

**Request:**
```json
{
  "email": "cliente@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "token": "pwd_1234567890_abc123",
  "message": "Token gerado com sucesso",
  "expires_at": "2024-01-08T00:00:00.000Z"
}
```

## 🔒 Segurança

### Validações Implementadas

- ✅ Token deve existir no sistema
- ✅ Token não pode estar expirado (7 dias)
- ✅ Token não pode ter sido usado anteriormente
- ✅ Senha deve ter no mínimo 6 caracteres
- ✅ Senhas devem coincidir (senha e confirmação)

### Em Produção

⚠️ **Importante**: Em produção, você deve:
- Usar **hash** para senhas (bcrypt, argon2, etc.)
- Usar **JWT** para tokens de autenticação
- Implementar **rate limiting** para evitar brute force
- Usar **HTTPS** para proteger os dados em trânsito
- Implementar **expiração automática** de tokens antigos

## 📝 Estrutura de Dados

### Token de Senha (`db.passwordTokens`)

```javascript
{
  "pwd_1234567890_abc123": {
    "email": "cliente@email.com",
    "expires_at": "2024-01-08T00:00:00.000Z",
    "used": false
  }
}
```

### Usuário com Token (`db.users`)

```javascript
{
  "id": "user_123",
  "email": "cliente@email.com",
  "full_name": "Nome do Cliente",
  "password": null, // Será definida via token
  "password_token": "pwd_1234567890_abc123",
  "is_master": false,
  "role": "user"
}
```

## 🎯 Casos de Uso

### Caso 1: Cliente Perdeu o Link

1. Master acessa a página de Assinantes
2. Gera novo token via API: `POST /api/auth/generate-password-token`
3. Envia novo link para o cliente

### Caso 2: Token Expirado

1. Cliente tenta usar token expirado
2. Sistema retorna erro: "Token expirado"
3. Master gera novo token
4. Cliente recebe novo link

### Caso 3: Cliente Já Tem Senha

1. Cliente tenta usar token novamente
2. Sistema retorna erro: "Este token já foi utilizado"
3. Cliente pode fazer login normalmente com email/senha

## 🧪 Testando

### 1. Criar Assinante

1. Acesse como master
2. Vá para Assinantes
3. Adicione novo assinante
4. Copie o link exibido

### 2. Definir Senha

1. Acesse o link em nova aba/incógnito
2. Preencha senha e confirmação
3. Clique em "Definir Senha"
4. Verifique redirecionamento para login

### 3. Fazer Login

1. Acesse `/login`
2. Use email e senha definida
3. Verifique login bem-sucedido

---

**Status**: ✅ Sistema Completo e Funcional
