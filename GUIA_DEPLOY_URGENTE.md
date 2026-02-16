# 🚨 GUIA DE DEPLOY URGENTE - Corrigir Pedidos e Clientes Vazios

## 🎯 PROBLEMA
Pedidos e clientes não aparecem para `temperodaneta1@gmail.com` (e outros assinantes) porque o backend no Render está com código antigo.

## ✅ SOLUÇÃO (5 MINUTOS)

### Passo 1: Verificar se tem repositório Git
```bash
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu-main (1)\digimenu"
git status
```

**Se der erro "not a git repository":**
```bash
git init
git add .
git commit -m "fix: listar pedidos por owner_email e subscriber_email"
```

### Passo 2: Conectar com GitHub (se ainda não estiver)
1. Crie um repositório no GitHub: https://github.com/new
   - Nome: `digimenu` (ou o que preferir)
   - Privado ou público
   - **NÃO** marque "Add README"

2. Conecte o repositório local:
```bash
git remote add origin https://github.com/SEU_USUARIO/digimenu.git
git branch -M main
git push -u origin main
```

### Passo 3: Conectar Render ao GitHub
1. Entre no Render: https://dashboard.render.com
2. Encontre seu serviço: `digimenu-backend-3m6t`
3. Clique em **Settings**
4. Em **Build & Deploy**, procure por **Connect Repository**
5. Conecte o repositório do GitHub que você criou
6. **Auto-Deploy**: Deixe marcado "Yes" (deploy automático)

### Passo 4: Deploy Manual (AGORA)
1. No serviço do Render, vá em **Manual Deploy**
2. Clique em **Deploy latest commit**
3. Aguarde 3-5 minutos (o Render vai compilar e reiniciar)

### Passo 5: Testar
1. Espere aparecer "Live" no Render
2. Abra o app: https://digimenu.vercel.app (ou seu domínio)
3. Faça login com `temperodaneta1@gmail.com`
4. Acesse **Operação** (pedidos) e **Clientes**
5. ✅ Deve aparecer os pedidos e clientes!

---

## 📋 ARQUIVOS QUE FORAM ALTERADOS (para referência)

### Backend (principal)
- `backend/db/repository.js` - considera `owner_email` legado
- `backend/server.js` - dono pode alterar status + ordenação
- `backend/src/routes/entities.routes.js` - permissão de dono

### Frontend (melhorias)
- `src/components/permissions/usePermission.jsx` - logs limpos
- `src/hooks/useOrders.js` - logs limpos
- `src/components/admin/OrdersTab.jsx` - passa `as_subscriber`
- `src/components/garcom/TipsView.jsx` - URL corrigida
- `src/components/entregador/EarningsView.jsx` - URL corrigida

---

## 🆘 ALTERNATIVA: Deploy Direto (se não usar Git)

### Se o Render permite upload direto de ZIP:
1. Compacte a pasta `digimenu` inteira em `digimenu.zip`
2. No Render, procure por "Manual Deploy" ou "Upload"
3. Faça upload do ZIP
4. Aguarde o build

### Se usar outro serviço (Heroku, Railway, etc.):
Me avise qual plataforma você usa que adapto o guia.

---

## ❓ DÚVIDAS RÁPIDAS

**P: Quanto tempo demora o deploy?**  
R: 3-5 minutos (Render) após fazer push no GitHub.

**P: Vai afetar outros assinantes?**  
R: Não. As correções são melhorias; pedidos antigos continuam funcionando.

**P: Preciso mudar algo no frontend?**  
R: Não. O frontend já está correto no seu código local.

**P: E se eu não tiver GitHub?**  
R: Crie uma conta grátis em https://github.com/signup - leva 2 minutos.

---

## 📞 SUPORTE RÁPIDO

Se travar em algum passo, me avise:
1. Em qual passo travou
2. Mensagem de erro (se houver)
3. Print da tela (se ajudar)

Vou resolver na hora!
