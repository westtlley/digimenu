# 🚀 Guia de Deploy - DigiMenu SaaS

## 📋 Visão Geral

- **Backend (Node.js + PostgreSQL)** → Render
- **Frontend (React + Vite)** → Vercel
- **Repositório** → GitHub

---

## 🔧 PARTE 1: DEPLOY DO BACKEND NO RENDER

### ✅ Deploy Automático (Recomendado)

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Conecte seu repositório GitHub
3. Configure o serviço:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Root Directory**: `backend`

### ⚙️ Variáveis de Ambiente (Backend)

Configure no Render Dashboard → Environment:

```env
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT (OBRIGATÓRIO em produção)
JWT_SECRET=sua_chave_secreta_super_segura_de_pelo_menos_32_caracteres

# Cloudinary (Upload de Imagens)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# CORS
FRONTEND_URL=https://seu-frontend.vercel.app
CORS_ORIGINS=https://seu-frontend.vercel.app,http://localhost:5173

# Backend URL
BACKEND_URL=https://seu-backend.onrender.com

# Google OAuth (Opcional)
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# SendGrid (Opcional - Emails)
SENDGRID_API_KEY=sua_sendgrid_api_key

# Mercado Pago (Opcional)
MERCADOPAGO_ACCESS_TOKEN=seu_mercadopago_token
```

---

## 🎨 PARTE 2: DEPLOY DO FRONTEND NO VERCEL

### ✅ Deploy Automático via GitHub

1. Acesse [https://vercel.com](https://vercel.com)
2. Conecte seu repositório GitHub
3. Configure o projeto:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### ⚙️ Variáveis de Ambiente (Frontend)

Configure no Vercel Dashboard → Settings → Environment Variables:

```env
# API Backend (OBRIGATÓRIO)
VITE_API_BASE_URL=https://seu-backend.onrender.com/api

# Google Maps (Opcional)
VITE_GOOGLE_MAPS_KEY=sua_chave_maps_javascript_api

# OpenRouteService (Opcional)
VITE_ORS_KEY=sua_chave_openrouteservice
```

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### 1. Testar Backend

```bash
# Health check
curl https://seu-backend.onrender.com/api/health

# Cardápio público
curl https://seu-backend.onrender.com/api/public/cardapio/seu-slug
```

### 2. Testar Frontend

1. Acesse: `https://seu-frontend.vercel.app/s/seu-slug`
2. Verifique:
   - ✅ Cardápio carrega
   - ✅ Imagens aparecem
   - ✅ Login funciona
   - ✅ Pedidos funcionam

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### CORS Error

**Solução:** Adicione `CORS_ORIGINS` no backend com todas as origens permitidas.

### Build Falhou

**Solução:** Verifique se todas as dependências estão no `package.json`.

### Database Connection Failed

**Solução:** Verifique se `DATABASE_URL` está no formato correto: `postgresql://user:pass@host:5432/dbname`

### JWT_SECRET Error

**Solução:** Configure `JWT_SECRET` no backend (mínimo 32 caracteres).

---

## 📊 CHECKLIST FINAL

- [ ] ✅ Backend online no Render
- [ ] ✅ PostgreSQL conectado
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Frontend online no Vercel
- [ ] ✅ VITE_API_BASE_URL configurada
- [ ] ✅ Cardápio público carrega
- [ ] ✅ Login funciona
- [ ] ✅ Pedidos funcionam

---

**Criado em:** Janeiro 2025  
**Versão:** 1.0
