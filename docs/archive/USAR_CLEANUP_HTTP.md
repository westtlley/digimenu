# 🧹 Limpar Conflito Master via HTTP (Sem Shell)

## 📝 Para quem não tem acesso ao Shell do Render

Este guia explica como **limpar conflitos** entre usuário master e subscriber usando apenas o **navegador**.

---

## 🔐 Passo 1: Configurar a Chave de Segurança

### **No Render Dashboard:**

1. Acesse: https://dashboard.render.com
2. Vá no seu serviço **backend**
3. Clique em **"Environment"** (menu lateral)
4. Adicione uma nova variável:
   - **Key:** `CLEANUP_SECRET_KEY`
   - **Value:** `sua-senha-secreta-123` (escolha uma senha forte!)
5. Clique em **"Save Changes"**
6. Aguarde o redeploy automático (~2 minutos)

---

## 🚀 Passo 2: Executar a Limpeza

### **Opção A: Via Navegador (Mais Fácil)**

Abra o navegador e acesse:

```
https://digimenu-backend-3m6t.onrender.com/api/cleanup-master?key=sua-senha-secreta-123
```

**⚠️ IMPORTANTE:** Substitua `sua-senha-secreta-123` pela senha que você configurou!

### **Opção B: Via PowerShell (Se preferir)**

```powershell
Invoke-WebRequest -Uri "https://digimenu-backend-3m6t.onrender.com/api/cleanup-master?key=sua-senha-secreta-123" -Method GET
```

---

## ✅ Resultado Esperado

### **Se houver conflito:**

```json
{
  "success": true,
  "message": "1 conflito(s) resolvido(s) com sucesso!",
  "conflicts_resolved": [
    {
      "master_email": "seu-email@gmail.com",
      "master_id": 1,
      "subscriber_email": "seu-email@gmail.com",
      "subscriber_id": 17,
      "subscriber_plan": "basic",
      "subscriber_status": "active"
    }
  ],
  "masters_count": 1
}
```

### **Se NÃO houver conflito:**

```json
{
  "success": true,
  "message": "Nenhum conflito encontrado. Sistema OK!",
  "masters": 1
}
```

---

## 🔍 Verificar se Funcionou

### **1. No Console do Backend (Render Logs):**

```
🧹 Iniciando limpeza de conflitos master-subscriber...
⚠️ Conflito encontrado: seu-email@gmail.com
  → Deletando entidades do subscriber...
  ✓ 15 entidades deletadas
  → Deletando subscriber...
  ✓ Subscriber deletado
✅ Limpeza concluída!
```

### **2. No Sistema:**

1. Faça **logout**
2. Faça **login** novamente
3. Acesse **Admin** → **Loja**
4. Configure seu **slug** (ex: `meu-restaurante`)
5. O botão **"Cardápio"** deve aparecer no header ✅

---

## 🚨 Erros Comuns

### **Erro 403: "Não autorizado"**

```json
{
  "error": "Não autorizado. Configure CLEANUP_SECRET_KEY."
}
```

**Solução:**
- Verifique se `CLEANUP_SECRET_KEY` está configurado no Render
- Verifique se a senha na URL está correta
- Aguarde o redeploy após adicionar a variável

### **Erro 503: "Limpeza requer PostgreSQL"**

```json
{
  "error": "Limpeza requer PostgreSQL"
}
```

**Solução:**
- Verifique se `DATABASE_URL` está configurado no Render
- Certifique-se de estar usando PostgreSQL, não JSON

---

## 🔒 Segurança

### **Proteções Implementadas:**

1. ✅ **Chave secreta obrigatória** (`CLEANUP_SECRET_KEY`)
2. ✅ **Apenas PostgreSQL** (não funciona com JSON)
3. ✅ **Log detalhado** de todas as operações
4. ✅ **Validação de master** antes de deletar
5. ✅ **Resposta JSON** com detalhes da operação

### **Boas Práticas:**

- ⚠️ **Use senha forte** para `CLEANUP_SECRET_KEY`
- ⚠️ **Não compartilhe** a senha publicamente
- ⚠️ **Delete a variável** após usar (opcional)
- ⚠️ **Execute apenas uma vez**

---

## 📋 Checklist Pós-Limpeza

Após executar a limpeza com sucesso:

- [ ] Fazer logout
- [ ] Fazer login novamente
- [ ] Acessar **Admin** → **Loja**
- [ ] Configurar **slug** do cardápio
- [ ] Verificar se botão **"Cardápio"** aparece
- [ ] Adicionar informações da loja
- [ ] Criar categorias e pratos
- [ ] Testar cardápio público

---

## 🎯 Passo a Passo Completo

### **1. Configurar no Render:**
```
Environment → Add Environment Variable
Key: CLEANUP_SECRET_KEY
Value: minha-senha-super-secreta-123
Save Changes → Aguardar redeploy
```

### **2. Abrir no Navegador:**
```
https://digimenu-backend-3m6t.onrender.com/api/cleanup-master?key=minha-senha-super-secreta-123
```

### **3. Ver resposta:**
```json
{
  "success": true,
  "message": "1 conflito(s) resolvido(s)!"
}
```

### **4. Fazer logout e login:**
```
Logout → Login → Admin → Loja → Configurar slug
```

### **5. Testar:**
```
Botão "Cardápio" → Abrir em nova aba → Ver seu cardápio
```

---

## 🎉 Pronto!

Agora você pode:
- ✅ Limpar conflitos sem acesso ao shell
- ✅ Usar apenas o navegador
- ✅ Configurar seu cardápio como master
- ✅ Compartilhar com clientes

**Sem necessidade de SQL ou terminal!** 🚀

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do Render
2. Certifique-se da senha estar correta
3. Tente acessar a URL novamente
4. Verifique se o redeploy finalizou

---

## 🔗 Arquivos Relacionados

- `backend/server.js` - Endpoint `/api/cleanup-master`
- `COMO_LIMPAR_CONFLITO_MASTER.md` - Guia completo com SQL
- `backend/scripts/cleanup-master-subscriber-conflict.js` - Script Node.js
