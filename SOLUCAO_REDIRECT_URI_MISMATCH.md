# 🔧 Solução: Erro redirect_uri_mismatch no Google OAuth

## ❌ Erro
```
Erro 400: redirect_uri_mismatch
Acesso bloqueado: a solicitação desse app é inválida
```

## 🔍 Causa
A URI de redirecionamento configurada no Google Cloud Console não corresponde **exatamente** à URL que o backend está usando.

## ✅ Solução Passo a Passo

### 1️⃣ Descobrir a URL do Backend

**Se estiver em desenvolvimento (localhost):**
- URL do callback: `http://localhost:3000/api/auth/google/callback`

**Se estiver em produção (Render/Vercel):**
- Verifique a variável `BACKEND_URL` no Render
- Exemplo: Se `BACKEND_URL=https://digimenu-backend-3m6t.onrender.com`
- URL do callback: `https://digimenu-backend-3m6t.onrender.com/api/auth/google/callback`

### 2️⃣ Acessar Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione seu projeto
3. Vá em **"APIs e Serviços"** → **"Credenciais"**
4. Clique no seu **"ID do cliente OAuth"** (o que você criou para o DigiMenu)

### 3️⃣ Adicionar/Corrigir URI de Redirecionamento

1. Na seção **"URIs de redirecionamento autorizados"**, clique em **"+ Adicionar URI"**
2. Adicione a URL **EXATAMENTE** como está configurada no backend:

**Para desenvolvimento:**
```
http://localhost:3000/api/auth/google/callback
```

**Para produção (substitua pela sua URL):**
```
https://digimenu-backend-3m6t.onrender.com/api/auth/google/callback
```

**⚠️ IMPORTANTE:**
- Use `http://` para localhost (não `https://`)
- Use `https://` para produção
- Inclua a porta `:3000` se for localhost
- O caminho deve ser exatamente: `/api/auth/google/callback`
- **NÃO** adicione barra no final
- **NÃO** adicione espaços

### 4️⃣ Salvar e Aguardar

1. Clique em **"Salvar"**
2. **Aguarde 2-5 minutos** para o Google propagar as mudanças
3. Tente fazer login novamente

### 5️⃣ Verificar Variável BACKEND_URL

Certifique-se de que a variável `BACKEND_URL` no backend está correta:

**No arquivo `.env` do backend (desenvolvimento):**
```env
BACKEND_URL=http://localhost:3000
```

**No Render (produção):**
- Vá em **Environment** → **Environment Variables**
- Verifique se `BACKEND_URL` está configurada corretamente
- Exemplo: `BACKEND_URL=https://digimenu-backend-3m6t.onrender.com`

### 6️⃣ Reiniciar o Backend

Após atualizar as URIs no Google Console:
1. Reinicie o servidor backend
2. Tente fazer login novamente

## 📋 Checklist

- [ ] Identifiquei a URL exata do backend (desenvolvimento ou produção)
- [ ] Acessei o Google Cloud Console
- [ ] Adicionei a URI correta em "URIs de redirecionamento autorizados"
- [ ] A URI está **exatamente** igual (incluindo http/https, porta, caminho)
- [ ] Cliquei em "Salvar"
- [ ] Aguardei 2-5 minutos
- [ ] Verifiquei a variável `BACKEND_URL` no backend
- [ ] Reiniciei o backend
- [ ] Testei o login novamente

## 🔍 Como Verificar Qual URL Está Sendo Usada

### No Backend (Logs)
Quando o backend inicia, você deve ver:
```
✅ Google OAuth configurado
```

Se não aparecer, verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configurados.

### No Código
A URL é construída em `backend/server.js`:
```javascript
callbackURL: `${BACKEND_URL}/api/auth/google/callback`
```

Onde `BACKEND_URL` vem de:
- `process.env.BACKEND_URL` (variável de ambiente)
- Ou padrão: `http://localhost:${PORT}` (desenvolvimento)

## 🚨 Erros Comuns

### ❌ URI com barra no final
```
https://backend.com/api/auth/google/callback/  ← ERRADO
https://backend.com/api/auth/google/callback   ← CORRETO
```

### ❌ URI sem porta no localhost
```
http://localhost/api/auth/google/callback       ← ERRADO
http://localhost:3000/api/auth/google/callback ← CORRETO
```

### ❌ URI com http em produção
```
http://backend.onrender.com/api/auth/google/callback  ← ERRADO
https://backend.onrender.com/api/auth/google/callback ← CORRETO
```

### ❌ URI diferente da variável BACKEND_URL
Se `BACKEND_URL=https://backend.com`, a URI deve ser:
```
https://backend.com/api/auth/google/callback
```

## 📞 Ainda com Problemas?

1. Verifique os logs do backend ao iniciar
2. Verifique o console do navegador (F12) para ver a URL exata sendo chamada
3. Certifique-se de que não há múltiplas URIs conflitantes no Google Console
4. Tente remover todas as URIs e adicionar apenas a correta
