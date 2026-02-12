# ✅ VERIFICAÇÃO DE PERMISSÕES - GUIA DE TESTE

## 🚨 PROBLEMA RESOLVIDO

**Antes:** Plano ULTRA tinha vários módulos BLOQUEADOS (vermelho) 
**Depois:** Plano ULTRA tem TUDO LIBERADO (verde) ✅

---

## 🔧 O QUE FOI CORRIGIDO

### 1. **Arquivo `PlanPresets.jsx`**
```diff
ANTES:
- premium: { ... } // Poucas permissões
- Faltava plano 'free'
- Faltava plano 'ultra'

DEPOIS:
+ free: { ... } // Trial 10 dias
+ basic: { ... } // Entry-level
+ pro: { ... } // Intermediário
+ ultra: { ... } // TUDO LIBERADO ✅
+ premium: { ... } // Compatibilidade (aponta para ultra)
```

### 2. **Permissões do ULTRA (agora corretas)**
```javascript
ultra: {
  dashboard: ['view'],
  pdv: ['view', 'create', 'update'], ✅
  gestor_pedidos: ['view', 'create', 'update', 'delete'], ✅
  caixa: ['view', 'create', 'update'], ✅
  whatsapp: ['view'], ✅
  dishes: ['view', 'create', 'update', 'delete'], ✅
  pizza_config: ['view', 'create', 'update', 'delete'], ✅
  delivery_zones: ['view', 'create', 'update', 'delete'], ✅
  coupons: ['view', 'create', 'update', 'delete'], ✅
  promotions: ['view', 'create', 'update', 'delete'], ✅
  theme: ['view', 'update'], ✅
  store: ['view', 'update'], ✅
  payments: ['view', 'update'], ✅
  graficos: ['view'], ✅
  orders: ['view', 'create', 'update', 'delete'], ✅
  history: ['view'], ✅
  clients: ['view', 'create', 'update', 'delete'], ✅
  financial: ['view'], ✅
  printer: ['view', 'update'], ✅
  mais: ['view'], ✅
  comandas: ['view', 'create', 'update', 'close', 'history'] ✅
}
```

---

## 🧪 COMO TESTAR

### **Passo 1: Migrar Assinantes Antigos (se existirem)**

Se você tem assinantes com plano "premium" (antigo), execute a migração:

```bash
# Opção 1: Script JavaScript
cd C:\Users\POSITIVO\Downloads\digimenu
node digimenu-main/backend/scripts/migrateSubscribers.js

# Opção 2: SQL Direto (se usar PostgreSQL)
# Execute o arquivo: backend/db/migrations/update_premium_to_ultra.sql
```

**O que isso faz:**
- Renomeia plano 'premium' → 'ultra'
- Mantém todas as permissões atuais
- Não afeta assinantes ativos

---

### **Passo 2: Criar Assinante de Teste (ULTRA)**

1. **Ir para `/Assinantes`**
2. **Clicar em "+ Adicionar Assinante"**
3. **Preencher:**
   - Email: `teste-ultra@digimenu.com`
   - Nome: `Teste Ultra`
   - Plano: **Ultra**
   - Status: **Ativo**
   - Data de Expiração: (deixar vazio ou +30 dias)
4. **Salvar**

---

### **Passo 3: Verificar Permissões Visuais**

1. **Ir para `/Assinantes`**
2. **Clicar em "Editar" no assinante de teste**
3. **Verificar seção "Módulos Acessíveis":**

**ESPERADO (ULTRA):**
```
✅ Dashboard (verde)
✅ PDV (verde)
✅ Gestor de Pedidos (verde)
✅ Caixa (verde)
✅ WhatsApp (verde)
✅ Pratos (verde)
✅ Zonas de Entrega (verde)
✅ Cupons (verde)
✅ Promoções (verde)
✅ Temas (verde)
✅ Loja (verde)
✅ Zona de Entrega (verde)
✅ Pedidos (verde)
✅ Mais Funções (verde)
✅ Comandas (verde)
```

**SE AINDA TIVER VERMELHO:** 
- ❌ Cache do navegador! Limpe com `Ctrl + Shift + Del`
- ❌ Frontend não atualizou! Rode `npm run build` no frontend

---

### **Passo 4: Comparar com Outros Planos**

#### **FREE (Trial 10 dias):**
```
✅ Dashboard
✅ Pratos (limitado: 20 produtos)
✅ Loja
❌ PDV
❌ Caixa
❌ Cupons
❌ Comandas
```

#### **BASIC:**
```
✅ Dashboard
✅ Pratos (100 produtos)
✅ Gestor de Pedidos (básico)
✅ Loja (com personalização)
✅ Temas
❌ PDV
❌ Caixa
❌ Cupons
❌ Comandas
```

#### **PRO:**
```
✅ TUDO do Basic +
✅ Pratos (500 produtos)
✅ Cupons
✅ Promoções
✅ Zonas de Entrega
✅ Clientes
❌ PDV
❌ Caixa
❌ Comandas
```

#### **ULTRA:**
```
✅ TUDO (sem bloqueios!)
```

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### **Problema 1: ULTRA ainda mostra módulos bloqueados**

**Causa:** Cache do navegador ou frontend não atualizado

**Solução:**
```bash
# 1. Limpar cache do navegador (Ctrl + Shift + Del)

# 2. Rebuild do frontend
cd C:\Users\POSITIVO\Downloads\digimenu\digimenu-main
npm run build

# 3. Restart do backend
# Parar processo (Ctrl + C) e rodar novamente:
node backend/server.js
```

---

### **Problema 2: Assinantes antigos ainda com plano "premium"**

**Causa:** Migração não executada

**Solução:**
```bash
# Executar script de migração
cd C:\Users\POSITIVO\Downloads\digimenu
node digimenu-main/backend/scripts/migrateSubscribers.js
```

---

### **Problema 3: Dropdown de planos não mostra FREE/ULTRA**

**Causa:** `PermissionsEditor.jsx` desatualizado

**STATUS:** ✅ JÁ CORRIGIDO (commit anterior)

**Se ainda tiver problema:**
1. Verificar se `PermissionsEditor.jsx` está atualizado
2. Limpar cache do navegador
3. Rebuild frontend

---

## 📊 VALIDAÇÃO FINAL

### **Checklist de Sucesso:**

- [ ] Script de migração executado sem erros
- [ ] Nenhum assinante com plano "premium" no banco
- [ ] Dropdown mostra: Free, Basic, Pro, Ultra, Personalizado
- [ ] Assinante ULTRA tem TODOS os módulos verdes
- [ ] Assinante PRO tem PDV/Caixa/Comandas bloqueados
- [ ] Assinante BASIC tem Cupons/PDV/Comandas bloqueados
- [ ] Assinante FREE tem maioria bloqueada (apenas teste básico)

---

## 🎯 PRÓXIMOS PASSOS

### **1. Deploy Imediato:**
```bash
# Backend (Render)
git push origin main
# Render detecta automaticamente e redeploy

# Frontend (Vercel)
cd digimenu-main
npm run build
# Fazer deploy no Vercel
```

### **2. Comunicar Clientes (se necessário):**
Se algum cliente tinha plano "Premium":
```
Assunto: Atualização: Seu plano Premium agora é Ultra!

Olá [Nome],

Ótimas notícias! Seu plano "Premium" foi atualizado para "Ultra" 
com o mesmo preço e MAIS funcionalidades.

Nada muda para você - continue usando normalmente.

Se tiver dúvidas, estamos à disposição!

Att,
Equipe DigiMenu
```

### **3. Monitorar Métricas:**
- Acessar `/AdminMasterDashboard`
- Verificar distribuição de planos
- Confirmar que não há planos "premium" listados

---

## 📞 SUPORTE

Se algo não funcionar:

1. ✅ Verificar logs do backend: `backend/server.js`
2. ✅ Verificar console do navegador (F12)
3. ✅ Limpar cache e tentar novamente
4. ✅ Executar migração novamente (é idempotente)
5. ✅ Verificar documento `GOVERNANCA_ASSINANTES.md` para regras de negócio

---

## ✅ RESUMO EXECUTIVO

### **O que foi feito:**
1. ✅ Corrigido `PlanPresets.jsx` (ULTRA agora tem tudo)
2. ✅ Adicionado plano FREE (trial 10 dias)
3. ✅ Criado compatibilidade premium → ultra
4. ✅ Criado script de migração de banco
5. ✅ Criado documento de GOVERNANÇA completo

### **Impacto:**
- ✅ Plano ULTRA finalmente tem TODAS as permissões
- ✅ Hierarquia de planos agora faz sentido (Free < Basic < Pro < Ultra)
- ✅ Admin tem guia claro de quando/como modificar assinantes
- ✅ Sistema preparado para escalar

### **Tempo de implementação:**
- Correção: ✅ Imediata (já commitada)
- Migração: ~1 minuto (executar script)
- Deploy: 5-10 minutos (Render + Vercel)
- **TOTAL: ~15 minutos para estar 100% funcional**

---

📅 **Corrigido em:** 29 Janeiro 2026  
👤 **Responsável:** Admin Master  
🔄 **Status:** ✅ PRONTO PARA PRODUÇÃO
