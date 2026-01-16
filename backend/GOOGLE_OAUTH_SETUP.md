# 🔐 Configuração de Login com Google OAuth

Este guia explica como configurar o login com Google no DigiMenu.

## 📋 Pré-requisitos

1. Conta Google (Gmail)
2. Acesso ao [Google Cloud Console](https://console.cloud.google.com/)

## 🚀 Passo a Passo

### 1️⃣ Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **"Selecionar um projeto"** → **"Novo Projeto"**
3. Nomeie o projeto (ex: "DigiMenu")
4. Clique em **"Criar"**

### 2️⃣ Configurar OAuth Consent Screen

1. No menu lateral, vá em **"APIs e Serviços"** → **"Tela de consentimento OAuth"**
2. Selecione **"Externo"** (para desenvolvimento) ou **"Interno"** (para Google Workspace)
3. Preencha:
   - **Nome do aplicativo**: DigiMenu
   - **Email de suporte**: seu email
   - **Email do desenvolvedor**: seu email
4. Clique em **"Salvar e continuar"**
5. Na tela de **Escopos**, clique em **"Salvar e continuar"**
6. Na tela de **Usuários de teste**, adicione emails que podem testar (opcional)
7. Clique em **"Voltar ao painel"**

### 3️⃣ Criar Credenciais OAuth 2.0

1. Vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ Criar credenciais"** → **"ID do cliente OAuth"**
3. Selecione **"Aplicativo da Web"**
4. Configure:
   - **Nome**: DigiMenu Web Client
   - **URIs de redirecionamento autorizados**:
     - `http://localhost:3000/api/auth/google/callback` (desenvolvimento)
     - `https://seu-backend.onrender.com/api/auth/google/callback` (produção)
5. Clique em **"Criar"**
6. **Copie o Client ID e Client Secret** (você precisará deles!)

### 4️⃣ Configurar Variáveis de Ambiente

Adicione no arquivo `.env` do backend:

```env
GOOGLE_CLIENT_ID=seu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

**Para produção (Render):**

1. Acesse o painel do Render
2. Vá em **"Environment"**
3. Adicione as variáveis:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `BACKEND_URL` (ex: `https://digimenu-backend-3m6t.onrender.com`)
   - `FRONTEND_URL` (ex: `https://digimenu-chi.vercel.app`)

### 5️⃣ Atualizar URIs de Redirecionamento

**IMPORTANTE:** Sempre que mudar o `BACKEND_URL`, atualize as URIs no Google Cloud Console:

1. Vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique no seu **ID do cliente OAuth**
3. Adicione/atualize as **URIs de redirecionamento autorizados**
4. Clique em **"Salvar"**

## ✅ Testar

1. Inicie o servidor backend
2. Acesse: `http://localhost:3000/api/auth/google`
3. Você será redirecionado para o Google
4. Após autorizar, será redirecionado de volta com o token

## 🔧 Como Funciona

1. **Usuário clica em "Login com Google"** no frontend
2. **Frontend redireciona para**: `/api/auth/google`
3. **Google autentica** o usuário
4. **Google redireciona para**: `/api/auth/google/callback`
5. **Backend cria/atualiza usuário** no banco
6. **Backend gera token JWT**
7. **Backend redireciona para frontend** com token na URL
8. **Frontend salva token** e autentica o usuário

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"
- Verifique se a URI no Google Cloud Console está **exatamente igual** à do `BACKEND_URL`
- Inclua o caminho completo: `/api/auth/google/callback`

### Erro: "invalid_client"
- Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos
- Certifique-se de que não há espaços extras

### Usuário não é criado
- Verifique os logs do backend
- Certifique-se de que o banco de dados está configurado corretamente

## 📝 Notas Importantes

- **Desenvolvimento**: Use `http://localhost:3000` como `BACKEND_URL`
- **Produção**: Use a URL completa do seu backend (ex: `https://digimenu-backend.onrender.com`)
- O Google OAuth só funciona se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estiverem configurados
- Se não estiverem configurados, o sistema continua funcionando normalmente, apenas sem login Google
