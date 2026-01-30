# 🔧 Como Limpar Conflito Master-Subscriber

## 📝 O Problema

Quando você tem um **usuário master** e um **subscriber** com o mesmo email, ocorre um conflito. O sistema fica confuso sobre qual identidade usar.

**Exemplo:**
```
Master: admin@digimenu.com (is_master = true)
Subscriber: admin@digimenu.com (plano = basic, status = active)
```

Isso causa problemas de:
- ❌ Redirecionamento incorreto
- ❌ Permissões duplicadas
- ❌ Cardápio não aparece
- ❌ Acesso às funcionalidades incorreto

---

## ✅ Solução

Remover o **subscriber duplicado** e manter apenas o **usuário master**.

---

## 🚀 Método 1: Via Render Shell (Recomendado)

### **Passo 1: Acessar o Shell**
1. Acesse: https://dashboard.render.com
2. Vá no seu serviço backend
3. Clique em **"Shell"** (terminal)

### **Passo 2: Executar o Script**
```bash
npm run cleanup:master
```

### **O que o script faz:**
1. ✅ Identifica usuários master
2. ✅ Procura subscribers com o mesmo email
3. ✅ Remove todas as entidades do subscriber (pratos, categorias, etc)
4. ✅ Remove o registro do subscriber
5. ✅ Mantém o usuário master intacto

### **Resultado Esperado:**
```
🔍 Procurando conflitos entre master e subscriber...

📋 Encontrados 1 usuário(s) master:

  ✓ admin@digimenu.com (ID: 1) - Admin Master

  ⚠️ CONFLITO ENCONTRADO!
     Master: admin@digimenu.com
     Subscriber: admin@digimenu.com (ID: 17)
     Plano: basic
     Status: active

  🗑️ Removendo subscriber duplicado...
     → Deletando entidades do subscriber...
     → Deletando registro do subscriber...
  ✅ Conflito resolvido! Subscriber removido, master mantido.

✅ Limpeza concluída!
```

---

## 🚀 Método 2: Via SQL Direto

Se preferir executar SQL diretamente no PostgreSQL:

### **Passo 1: Conectar ao Banco**
Use o `DATABASE_URL` do Render para conectar via pgAdmin, DBeaver, ou CLI.

### **Passo 2: Executar o SQL**
```sql
-- 1. Verificar conflitos
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.is_master,
  s.id as subscriber_id,
  s.email as subscriber_email,
  s.plan,
  s.status
FROM users u
LEFT JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
WHERE u.is_master = TRUE AND s.id IS NOT NULL;

-- 2. Deletar entidades do subscriber
DELETE FROM entities
WHERE subscriber_email IN (
  SELECT s.email
  FROM users u
  INNER JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
  WHERE u.is_master = TRUE
);

-- 3. Deletar o subscriber
DELETE FROM subscribers
WHERE email IN (
  SELECT s.email
  FROM users u
  INNER JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
  WHERE u.is_master = TRUE
);

-- 4. Verificar (deve retornar vazio)
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.is_master,
  s.id as subscriber_id,
  s.email as subscriber_email
FROM users u
LEFT JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
WHERE u.is_master = TRUE AND s.id IS NOT NULL;
```

---

## 🔍 Como Verificar se o Conflito Foi Resolvido

### **1. Verificar no Banco de Dados:**
```sql
SELECT email, is_master FROM users WHERE is_master = TRUE;
SELECT email, plan, status FROM subscribers;
```

Certifique-se de que:
- ✅ O email do master **NÃO** aparece na tabela `subscribers`
- ✅ Apenas usuários com `is_master = false` devem ter subscriber

### **2. Testar no Sistema:**
1. Faça login como master
2. Vá em **Admin** → **Loja**
3. Configure seu slug (ex: `meu-restaurante`)
4. O botão **"Cardápio"** deve aparecer no header
5. Clique no botão e verifique se abre seu cardápio

---

## 📋 Checklist Pós-Limpeza

Após executar a limpeza, configure o cardápio do master:

- [ ] Acessar **Admin** → **Loja**
- [ ] Configurar slug do cardápio
- [ ] Adicionar informações da loja (nome, whatsapp, etc)
- [ ] Criar categorias
- [ ] Adicionar pratos
- [ ] Configurar zonas de entrega
- [ ] Testar o cardápio público

---

## 🚨 Importante

### **Antes de Executar:**
- ⚠️ **Faça backup** do banco de dados (se tiver dados importantes)
- ⚠️ Este script é **irreversível**
- ⚠️ Todas as entidades do subscriber serão deletadas
- ⚠️ O usuário master será mantido intacto

### **Quando Executar:**
- ✅ Quando o master não consegue acessar o cardápio
- ✅ Quando há redirecionamento incorreto
- ✅ Quando aparece erro de permissões
- ✅ Quando o botão "Cardápio" não funciona

### **Quando NÃO Executar:**
- ❌ Se você quer manter o subscriber ativo
- ❌ Se o subscriber tem dados importantes
- ❌ Se não tem certeza do que está fazendo

---

## 🆘 Ajuda

Se encontrar problemas:

1. **Erro ao executar script:**
   ```bash
   npm run cleanup:master
   ```
   - Verifique se `DATABASE_URL` está configurado
   - Verifique se está no diretório `backend`

2. **SQL não executa:**
   - Verifique a conexão com o banco
   - Verifique permissões do usuário do banco

3. **Conflito persiste:**
   - Execute o script novamente
   - Verifique o log do terminal
   - Entre em contato com suporte

---

## 📂 Arquivos Criados

1. `backend/scripts/cleanup-master-subscriber-conflict.js` - Script Node.js
2. `backend/db/migrations/cleanup_master_subscriber_conflict.sql` - SQL puro
3. `backend/package.json` - Adicionado comando `npm run cleanup:master`

---

## 🎯 Resultado Final

Após a limpeza:
- ✅ **Apenas 1 identidade**: usuário master
- ✅ **Sem conflitos**: subscriber removido
- ✅ **Cardápio funciona**: slug configurável
- ✅ **Redirecionamentos corretos**: sem confusão
- ✅ **Permissões claras**: acesso master completo

---

## 🎉 Pronto!

Agora você pode:
- Configurar seu slug no Admin
- Criar seu cardápio
- Compartilhar com clientes
- Gerenciar tudo normalmente

Sem conflitos! 🚀
