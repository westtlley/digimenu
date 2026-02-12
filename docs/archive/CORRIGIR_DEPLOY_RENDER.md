# 🔧 Corrigir Deploy no Render - Erro package.json não encontrado

## ⚠️ Problema

O Render está tentando encontrar `package.json` em `/opt/render/project/src/backend/package.json`, mas o projeto tem a estrutura:
- Raiz: `package.json` (frontend)
- `backend/package.json` (backend)

## ✅ Solução: Configurar no Dashboard do Render

### Passo 1: Acessar Configurações do Serviço

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Faça login
3. Encontre seu serviço de backend (ex: `digimenu-backend-3m6t`)
4. Clique no serviço
5. Vá para **Settings** (Configurações)

### Passo 2: Configurar Build & Deploy

Na seção **Build & Deploy**, configure:

```
Root Directory: ./
Build Command: cd backend && npm install
Start Command: cd backend && npm start
```

**OU se preferir usar o arquivo render.yaml:**

```
Root Directory: ./
Build Command: (deixe vazio - o render.yaml será usado)
Start Command: (deixe vazio - o render.yaml será usado)
```

### Passo 3: Verificar Environment Variables

Certifique-se de que as seguintes variáveis estão configuradas:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://digimenu-chi.vercel.app
```

### Passo 4: Salvar e Fazer Deploy

1. Clique em **Save Changes**
2. Vá para **Manual Deploy** → **Deploy latest commit**
3. Aguarde o deploy terminar

## 🔍 Verificação

Após o deploy, verifique os logs:

```
✅ Build succeeded
✅ Installing dependencies in backend/
✅ Starting server...
✅ Server running on port 10000
```

## 📝 Arquivo render.yaml (Alternativa)

Se preferir usar o arquivo `render.yaml` que foi criado:

1. O arquivo `render.yaml` já está na raiz do projeto
2. No Render Dashboard, certifique-se de que:
   - **Root Directory**: `./`
   - **Build Command**: (deixe vazio)
   - **Start Command**: (deixe vazio)

O Render vai usar automaticamente o `render.yaml` se ele estiver presente.

## 🚨 Se o Problema Persistir

### Opção 1: Verificar Estrutura do Repositório

Certifique-se de que o repositório no GitHub tem a estrutura correta:

```
digimenu/
├── package.json (frontend)
├── backend/
│   ├── package.json (backend)
│   └── server.js
└── render.yaml
```

### Opção 2: Limpar Cache e Redeploy

1. Render Dashboard → Settings → **Clear Build Cache**
2. Manual Deploy → **Deploy latest commit**

### Opção 3: Verificar Logs de Clone

Nos logs do Render, verifique se o clone do repositório está funcionando:

```
✅ Cloning from https://github.com/westtlley/digimenu
✅ Cloned successfully
```

Se houver erros de clone (erro 500 do GitHub), pode ser um problema temporário do GitHub. Tente novamente em alguns minutos.

## ✅ Checklist Final

- [ ] Root Directory configurado como `./`
- [ ] Build Command: `cd backend && npm install`
- [ ] Start Command: `cd backend && npm start`
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy iniciado
- [ ] Logs mostram sucesso

## 📞 Suporte

Se o problema persistir:
1. Verifique os logs completos no Render
2. Verifique se o repositório GitHub está acessível
3. Entre em contato com o suporte do Render: Dashboard → Help
