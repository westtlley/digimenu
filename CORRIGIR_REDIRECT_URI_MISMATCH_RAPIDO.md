# 🚨 Correção Rápida: Erro redirect_uri_mismatch

## ❌ Erro
```
Erro 400: redirect_uri_mismatch
Acesso bloqueado: a solicitação desse app é inválida
```

## ✅ Solução em 3 Passos

### 1️⃣ Descobrir a URL Exata do Backend

**Opção A: Verificar logs do backend**
Quando o backend inicia, você verá:
```
✅ Google OAuth configurado
🔗 URL de Callback: https://seu-backend.onrender.com/api/auth/google/callback
📋 IMPORTANTE: Adicione esta URL exata no Google Cloud Console:
   → URIs de redirecionamento autorizados: https://seu-backend.onrender.com/api/auth/google/callback
```

**Opção B: Verificar variável BACKEND_URL**
- No Render: Vá em **Environment** → Procure `BACKEND_URL`
- Exemplo: `BACKEND_URL=https://digimenu-backend-3m6t.onrender.com`
- URL de callback será: `https://digimenu-backend-3m6t.onrender.com/api/auth/google/callback`

### 2️⃣ Adicionar URI no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione seu projeto
3. Vá em **"APIs e Serviços"** → **"Credenciais"**
4. Clique no seu **"ID do cliente OAuth"** (o que você criou para DigiMenu)
5. Na seção **"URIs de redirecionamento autorizados"**, clique em **"+ Adicionar URI"**
6. Cole a URL **EXATAMENTE** como aparece nos logs do backend

**Exemplo:**
```
https://digimenu-backend-3m6t.onrender.com/api/auth/google/callback
```

**⚠️ ATENÇÃO:**
- ✅ Use `https://` (não `http://`) em produção
- ✅ Inclua o caminho completo: `/api/auth/google/callback`
- ❌ **NÃO** adicione barra no final
- ❌ **NÃO** adicione espaços

### 3️⃣ Salvar e Aguardar

1. Clique em **"Salvar"**
2. **Aguarde 2-5 minutos** para o Google propagar as mudanças
3. Tente fazer login novamente

## 🔍 Verificar se Está Correto

### Checklist:
- [ ] URL no Google Console é **exatamente igual** à do backend
- [ ] Usa `https://` (produção) ou `http://localhost:3000` (desenvolvimento)
- [ ] Caminho completo: `/api/auth/google/callback`
- [ ] Sem barra no final
- [ ] Sem espaços extras
- [ ] Aguardou 2-5 minutos após salvar

## 🐛 Ainda Não Funciona?

### Verificar Variável BACKEND_URL no Render

1. Acesse o painel do Render
2. Vá em **Environment** → **Environment Variables**
3. Verifique se `BACKEND_URL` está configurada corretamente
4. Exemplo correto: `BACKEND_URL=https://digimenu-backend-3m6t.onrender.com`
5. **NÃO** inclua `/api` no final
6. **NÃO** inclua barra no final

### Verificar Logs do Backend

Ao iniciar, o backend deve mostrar:
```
✅ Google OAuth configurado
🔗 URL de Callback: [URL EXATA AQUI]
```

Use essa URL exata no Google Console!

### URLs Comuns

**Desenvolvimento:**
```
http://localhost:3000/api/auth/google/callback
```

**Produção (Render):**
```
https://digimenu-backend-3m6t.onrender.com/api/auth/google/callback
```

**⚠️ IMPORTANTE:** Substitua pela URL do SEU backend!

## 📝 Exemplo Completo

**Backend no Render:**
- URL: `https://digimenu-backend-3m6t.onrender.com`
- Variável `BACKEND_URL`: `https://digimenu-backend-3m6t.onrender.com`

**Google Cloud Console:**
- URI de redirecionamento: `https://digimenu-backend-3m6t.onrender.com/api/auth/google/callback`

**✅ Deve funcionar!**
