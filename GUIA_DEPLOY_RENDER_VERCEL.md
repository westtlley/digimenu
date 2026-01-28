# 🚀 Guia Completo de Deploy - Render + Vercel

## 📋 Visão Geral

- **Backend (Node.js + PostgreSQL)** → Render
- **Frontend (React + Vite)** → Vercel
- **Repositório** → GitHub (já sincronizado ✅)

---

## 🔧 PARTE 1: DEPLOY DO BACKEND NO RENDER

### ✅ **Opção A: Deploy Automático (Recomendado)**

Se você já tem o Render conectado ao GitHub, o deploy é automático!

#### **1. Verificar Status no Render**

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Faça login
3. Encontre seu serviço de backend (deve estar listado)
4. Clique no serviço

#### **2. Verificar se o Deploy Iniciou Automaticamente**

- **Deploy Automático Ativo?** ✅
  - O Render detecta novos commits no GitHub
  - Deploy inicia automaticamente
  - Aguarde 3-5 minutos

- **Deploy Manual Necessário?** 
  - Clique em **"Manual Deploy"** → **"Deploy latest commit"**

#### **3. Acompanhar o Deploy**

```
Render Dashboard → Seu Serviço → Logs

Procure por:
✅ Build succeeded
✅ Deploy live
✅ Server running on port 3000
```

#### **4. Testar o Backend**

```bash
# Teste a API pública (cardápio)
curl https://seu-backend.onrender.com/api/public/cardapio/seu-slug

# Ou abra no navegador:
https://seu-backend.onrender.com/api/public/cardapio/seu-slug
```

---

### ✅ **Opção B: Deploy Manual (Se Necessário)**

Se o Render não está conectado ao GitHub:

#### **1. Instalar Render CLI (Opcional)**

```powershell
npm install -g render-cli
render login
```

#### **2. Deploy via Git Push**

```bash
cd backend
git remote add render https://git.render.com/srv-xxxxx.git
git push render main
```

---

## 🎨 PARTE 2: DEPLOY DO FRONTEND NO VERCEL

### ✅ **Opção A: Deploy Automático via Vercel CLI**

#### **1. Instalar Vercel CLI (se não tiver)**

```powershell
npm install -g vercel
```

#### **2. Login no Vercel**

```powershell
vercel login
```

- Escolha método de login (GitHub, Email, etc.)
- Autorize no navegador

#### **3. Deploy do Frontend**

```powershell
cd C:\Users\POSITIVO\Downloads\digimenu\digimenu-main

# Deploy de produção
vercel --prod
```

**Perguntas que o Vercel vai fazer:**

```
? Set up and deploy "digimenu-main"? [Y/n] → Y
? Which scope? → Sua conta
? Link to existing project? [y/N] → y (se já existe) ou n (para criar novo)
? What's your project's name? → digimenu
? In which directory is your code located? → ./
? Want to override the settings? [y/N] → y
```

**Configurações importantes:**

```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Development Command: npm run dev
```

#### **4. Aguardar Deploy**

```
✓ Deployment ready [20s]
🔗 https://digimenu.vercel.app
```

---

### ✅ **Opção B: Deploy via Dashboard do Vercel**

#### **1. Acessar Vercel Dashboard**

1. Acesse [https://vercel.com](https://vercel.com)
2. Faça login
3. Clique em **"Add New Project"**

#### **2. Importar do GitHub**

1. Conecte sua conta GitHub (se necessário)
2. Procure por `westtlley/digimenu`
3. Clique em **"Import"**

#### **3. Configurar o Projeto**

```yaml
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install

Environment Variables:
  VITE_API_URL: https://seu-backend.onrender.com
  VITE_GOOGLE_MAPS_KEY: sua_chave_aqui (opcional)
```

#### **4. Deploy**

- Clique em **"Deploy"**
- Aguarde 2-3 minutos
- Projeto estará disponível em: `https://digimenu.vercel.app`

---

## ⚙️ CONFIGURAÇÕES IMPORTANTES

### **1. Variáveis de Ambiente**

#### **Backend (Render):**

```env
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui

# Cloudinary (Upload de Imagens)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# CORS
FRONTEND_URL=https://digimenu.vercel.app
CORS_ORIGINS=https://digimenu.vercel.app,http://localhost:5173

# Backend
BACKEND_URL=https://seu-backend.onrender.com
```

**Como adicionar no Render:**
1. Dashboard → Seu Serviço → Environment
2. Clique em **"Add Environment Variable"**
3. Adicione cada variável acima
4. Clique em **"Save Changes"**
5. Render fará redeploy automático

---

#### **Frontend (Vercel):**

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_GOOGLE_MAPS_KEY=sua_chave_maps (opcional)
```

**Como adicionar no Vercel:**
1. Dashboard → Seu Projeto → Settings → Environment Variables
2. Adicione cada variável
3. Selecione: Production, Preview, Development
4. Clique em **"Save"**
5. Redeploy: Overview → ... → Redeploy

---

### **2. Conectar Backend com Frontend**

#### **No Backend (Render):**

```javascript
// backend/server.js - Já configurado!
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
```

#### **No Frontend (Vercel):**

Crie/edite `.env.production`:

```env
VITE_API_URL=https://seu-backend.onrender.com
```

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### **1. Testar Backend**

```bash
# Health check
curl https://seu-backend.onrender.com/api/health

# Cardápio público
curl https://seu-backend.onrender.com/api/public/cardapio/seu-slug

# Deve retornar JSON com:
# - store
# - dishes
# - categories
# - complementGroups
```

### **2. Testar Frontend**

1. Acesse: `https://digimenu.vercel.app/s/seu-slug`
2. Verifique:
   - ✅ Cardápio carrega
   - ✅ Imagens aparecem
   - ✅ Modo noturno funciona
   - ✅ Adicionar ao carrinho funciona
   - ✅ Checkout funciona
   - ✅ Login/cadastro funciona

### **3. Testar Integração**

```javascript
// Abra Console do Navegador (F12) e execute:
fetch('https://seu-backend.onrender.com/api/public/cardapio/seu-slug')
  .then(r => r.json())
  .then(data => console.log('✅ Backend OK:', data))
  .catch(e => console.error('❌ Erro:', e));
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS COMUNS

### **Problema 1: CORS Error**

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solução:**
```bash
# No Render, adicione variável:
CORS_ORIGINS=https://digimenu.vercel.app,https://seu-dominio-custom.com

# Ou no código backend/server.js:
const CORS_ORIGINS = [
  'https://digimenu.vercel.app',
  'http://localhost:5173',
  'https://seu-dominio-custom.com'
];
```

---

### **Problema 2: Build Falhou no Vercel**

```
Error: Cannot find module 'vite'
```

**Solução:**
```bash
# Verificar package.json
# Build Command deve ser: npm run build
# Não: vite build

# Se persistir, limpar cache:
Vercel Dashboard → Projeto → Settings → General → Clear Cache
```

---

### **Problema 3: Backend não inicia no Render**

```
Error: JWT_SECRET is required in production
```

**Solução:**
```bash
# Adicionar no Render Environment:
JWT_SECRET=sua_chave_super_segura_de_pelo_menos_32_caracteres_aqui_1234567890
```

---

### **Problema 4: Database Connection Failed**

```
Error: connect ECONNREFUSED
```

**Solução:**
1. Verificar `DATABASE_URL` no Render
2. Formato correto: `postgresql://user:pass@host:5432/dbname`
3. Se usar Render PostgreSQL, copiar Internal Database URL
4. Reiniciar serviço após adicionar

---

### **Problema 5: Imagens não aparecem**

```
Failed to load image from Cloudinary
```

**Solução:**
```bash
# Verificar credenciais Cloudinary no Render:
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Testar upload:
# Backend → Admin → Adicionar Prato → Upload Imagem
```

---

## 🔄 WORKFLOW DE DESENVOLVIMENTO

### **Desenvolvimento Local:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd digimenu-main
npm run dev

# Testar em: http://localhost:5173
```

### **Enviar para Produção:**

```bash
# 1. Fazer alterações
# 2. Commit
git add .
git commit -m "feat: sua nova funcionalidade"

# 3. Push para GitHub
git push origin main

# 4. Deploy automático!
# - Render detecta push → redeploy backend
# - Vercel detecta push → redeploy frontend
```

---

## 📊 MONITORAMENTO

### **Render:**
- Logs em tempo real
- Métricas de CPU/RAM
- Alertas de downtime

### **Vercel:**
- Analytics de acesso
- Performance metrics
- Error tracking

### **Recomendação:**
Configure alertas no [UptimeRobot](https://uptimerobot.com) (gratuito):
```
Monitor 1: https://seu-backend.onrender.com/api/health
Monitor 2: https://digimenu.vercel.app
Notificação: Email/Telegram quando ficar offline
```

---

## 🎯 CHECKLIST FINAL

Antes de considerar deploy completo:

- [ ] ✅ Render: Backend online
- [ ] ✅ Render: PostgreSQL conectado
- [ ] ✅ Render: Variáveis de ambiente configuradas
- [ ] ✅ Vercel: Frontend online
- [ ] ✅ Vercel: Variável VITE_API_URL configurada
- [ ] ✅ Teste: Cardápio público carrega
- [ ] ✅ Teste: Login funciona
- [ ] ✅ Teste: Fazer pedido funciona
- [ ] ✅ Teste: WhatsApp integração funciona
- [ ] ✅ Teste: Modo noturno funciona
- [ ] ✅ Configurar domínio personalizado (opcional)
- [ ] ✅ Configurar SSL/HTTPS (automático)
- [ ] ✅ Configurar monitoramento

---

## 🌐 DOMÍNIO PERSONALIZADO (OPCIONAL)

### **No Vercel:**

1. Compre domínio (ex: `seurestaurante.com.br`)
2. Vercel → Settings → Domains → Add Domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

### **No Render:**

1. Render → Settings → Custom Domains → Add Custom Domain
2. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: seu-backend.onrender.com
   ```

**Resultado:**
- Frontend: `https://seurestaurante.com.br`
- Backend: `https://api.seurestaurante.com.br`

---

## 💡 DICAS PRO

1. **Use Preview Deploys:**
   - Vercel cria deploy automático para cada PR
   - Teste antes de mergear para main

2. **Ative Deploy Hooks:**
   - Render: Webhook para redeploy manual
   - Útil para CI/CD

3. **Configure Rollback:**
   - Vercel: pode voltar para deploy anterior em 1 clique
   - Render: pode redeployar commit específico

4. **Monitore Performance:**
   - Vercel Analytics (gratuito)
   - Sentry para error tracking

5. **Backup do Banco:**
   - Render PostgreSQL: backup automático diário
   - Configure backup manual também

---

## 📞 SUPORTE

### **Render:**
- Docs: https://render.com/docs
- Status: https://status.render.com
- Support: Dashboard → Help

### **Vercel:**
- Docs: https://vercel.com/docs
- Status: https://vercel-status.com
- Support: Dashboard → Help → Contact

---

## ✅ CONCLUSÃO

Seu projeto DigiMenu agora está:

🚀 **Deploy Automático** - Push no GitHub = Deploy automático  
🔄 **CI/CD Configurado** - Workflow profissional  
📊 **Monitorável** - Logs e métricas em tempo real  
🌍 **Acessível Globalmente** - CDN do Vercel + Render  
🔒 **Seguro** - HTTPS automático em ambos  

**Seu SaaS está PRONTO para ESCALAR! 🎉**

---

**Criado em:** 28/01/2026  
**Versão:** 1.0  
**Desenvolvido com ❤️ para facilitar sua vida**
