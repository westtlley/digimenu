# 🚀 Deploy das Atualizações - Plano FREE + Trials

## ✅ O que foi implementado

### 1. **Plano FREE** (R$ 0/mês)
- ✅ Card na página `/assinar`
- ✅ Endpoint `/api/mercadopago/create-free-subscriber`
- ✅ 20 produtos, 10 pedidos/dia, histórico 7 dias
- ✅ Sem expiração (`expires_at: null`)

### 2. **Trials Automáticos**
- ✅ Básico: 10 dias grátis
- ✅ Pro: 7 dias grátis
- ✅ Ultra: 7 dias grátis
- ✅ Cálculo automático no webhook

### 3. **Sistema de Emails**
- ✅ Boas-vindas
- ✅ Renovação
- ✅ Avisos de expiração (7, 3, 1 dia)
- ✅ Assinatura expirada

### 4. **Tabela Comparativa**
- ✅ 4 planos (Free, Básico, Pro, Ultra)
- ✅ Grid responsivo (2 colunas mobile, 4 desktop)
- ✅ Badges de trial

---

## 📦 Commits Realizados

```
83c34c9 docs: adicionar guia de configuração de emails automáticos
7718a48 feat: implementar trials automáticos (10d Básico, 7d Pro/Ultra)
84b383d feat: adicionar plano FREE no PaymentConfig (preço R$ 0)
03992ba feat: adicionar plano FREE na página de assinatura com badges trial
a515998 fix: atualizar lista de planos no PermissionsEditor (free, basic, pro, ultra)
```

---

## 🔄 Como Atualizar no RENDER (Backend)

### Opção 1: Deploy Automático (Git Push)

Se o Render está conectado ao GitHub, ele já deve ter detectado o push e iniciado o deploy automaticamente.

**Verificar:**
1. Acesse: https://dashboard.render.com
2. Clique no seu serviço de backend
3. Aba **Events** → Deve aparecer "Deploy live" recente
4. Aguarde ~2-5 min até status "Live"

### Opção 2: Deploy Manual

Se não aconteceu automaticamente:
1. Acesse o serviço no Render
2. Canto superior direito: botão **"Manual Deploy"**
3. Selecione **"Deploy latest commit"**
4. Aguarde o build

### ⚠️ Verificar Variáveis de Ambiente

Certifique-se de que o `.env` no Render tem:
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=https://seu-app.vercel.app
```

---

## 🔄 Como Atualizar no VERCEL (Frontend)

### Opção 1: Deploy Automático (Git Push)

O Vercel já deve ter detectado o push e iniciado o deploy.

**Verificar:**
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Aba **Deployments** → Deve aparecer deploy recente
4. Status **"Ready"** = Está no ar
5. Clique em **"Visit"** para testar

### Opção 2: Deploy Manual

Se não aconteceu automaticamente:
1. Acesse o projeto no Vercel
2. Botão **"Redeploy"** no último deployment
3. Aguarde ~1-2 min

### ⚠️ Verificar Variáveis de Ambiente

Certifique-se de que o Vercel tem:
```env
VITE_API_BASE_URL=https://seu-backend.onrender.com
```

---

## 🧪 Testar as Atualizações

### 1. Testar Plano FREE

1. Acesse: `https://seu-app.vercel.app/assinar`
2. Deve aparecer **4 cards** (Free, Básico, Pro, Ultra)
3. Clique em **"Começar Grátis"** no plano FREE
4. Digite email e nome
5. Deve criar conta sem pedir pagamento
6. Redireciona para `/login/cliente`

### 2. Testar Trials

1. Clique em **"Começar Grátis"** no plano **Básico**
2. Badge deve mostrar **"10 dias grátis"**
3. Após criar a conta, verificar no AdminMasterDashboard:
   - MRR deve mostrar a conta
   - "Active Trials" deve aumentar
4. Verificar no banco/JSON que `expires_at` foi calculado corretamente:
   - Básico: `hoje + 10 dias + 1 mês`
   - Pro/Ultra: `hoje + 7 dias + 1 mês (ou 12 meses se anual)`

### 3. Testar Tabela Comparativa

1. Scroll down na página `/assinar`
2. Tabela deve ter **5 colunas**: "Recurso", "Gratuito", "Básico", "Pro", "Ultra"
3. Verificar se os valores estão corretos (20 produtos no Free, etc.)

### 4. Testar AdminMasterDashboard

1. Login como Master Admin
2. Acesse `/AdminMasterDashboard`
3. Deve mostrar:
   - MRR atualizado
   - Plano Free na distribuição
   - Active Trials (se houver)

---

## 🐛 Solução de Problemas

### ❌ Plano FREE não aparece

- Limpar cache do navegador (Ctrl+Shift+R)
- Verificar se o deploy da Vercel finalizou
- Abrir Console do navegador (F12) e verificar erros

### ❌ Trials não estão sendo aplicados

- Verificar logs no Render:
  1. Dashboard → Seu serviço → **Logs**
  2. Procurar por: `✨ Trial de X dias aplicado`
- Se não aparecer, verificar se `TRIAL_DAYS` está exportado em `backend/utils/plans.js`

### ❌ Backend não atualizou

- Forçar redeploy manual no Render
- Verificar se o build não falhou (aba **Events**)
- Verificar se o Node.js é >= 18

### ❌ Frontend mostra erro 404 no backend

- Verificar se `VITE_API_BASE_URL` no Vercel está correto
- Verificar se o backend está "Live" no Render
- Testar endpoint diretamente: `https://seu-backend.onrender.com/health` (deve retornar 200)

---

## 📊 Próximos Passos

### Curto Prazo (1-2 dias)
- [ ] Configurar serviço de email real (SendGrid)
- [ ] Testar criação de contas FREE
- [ ] Monitorar conversão de trials

### Médio Prazo (1-2 semanas)
- [ ] Adicionar onboarding para novos assinantes FREE
- [ ] Implementar upsell de Free → Básico dentro do painel
- [ ] Dashboard de conversão (quantos Free viraram Básico?)

### Longo Prazo (1 mês)
- [ ] A/B testing nos preços
- [ ] Análise de churn por plano
- [ ] Implementar chat de suporte

---

## 🎉 Tudo Pronto!

Agora você tem:
- ✅ 4 planos (Free, Básico, Pro, Ultra)
- ✅ Trials automáticos
- ✅ Emails estruturados (pronto para SendGrid)
- ✅ Sistema de conversão otimizado

**Foco agora:** Capturar leads no plano FREE e converter para planos pagos! 🚀
