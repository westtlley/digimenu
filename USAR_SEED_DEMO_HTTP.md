# 🚀 CRIAR DEMO SEM SHELL (VIA HTTP)

## ✅ **SOLUÇÃO PRONTA!**

Criei um endpoint especial que você pode acessar pelo **navegador** para criar o demo!

---

## 📋 **PASSO A PASSO RÁPIDO:**

### **1️⃣ AGUARDAR DEPLOY (2 minutos)**

O código já foi enviado. Aguarde o Render fazer o deploy automático.

### **2️⃣ ACESSAR ESTA URL:**

Abra seu navegador e acesse:

```
https://digimenu-backend-3m6t.onrender.com/api/seed-demo?key=demo-secret-2026
```

**🔐 Senha padrão:** `demo-secret-2026`

### **3️⃣ AGUARDAR A RESPOSTA:**

Você verá:

```json
{
  "success": true,
  "message": "🎉 Demo criado com sucesso!",
  "url": "https://digimenu-chi.vercel.app/s/demo-pizzaria",
  "email": "demo@pizzaria.com",
  "slug": "demo-pizzaria",
  "details": {
    "categories": 3,
    "pizzaSizes": 3,
    "flavors": 8,
    "edges": 2,
    "extras": 2,
    "dishes": 3,
    "deliveryZones": 1
  }
}
```

### **4️⃣ TESTAR O DEMO:**

Clique no link que apareceu na resposta:

```
https://digimenu-chi.vercel.app/s/demo-pizzaria
```

---

## 🔒 **MUDAR A SENHA (OPCIONAL):**

Para maior segurança, você pode configurar sua própria senha:

### **No Render:**
1. Dashboard → Backend → Environment
2. Adicionar variável:
   - **Key:** `SEED_SECRET_KEY`
   - **Value:** `sua-senha-super-secreta`
3. Save Changes

Depois, use:
```
https://digimenu-backend-3m6t.onrender.com/api/seed-demo?key=sua-senha-super-secreta
```

---

## 💡 **OUTRAS FORMAS DE USAR:**

### **Usando Postman/Insomnia:**

- **Método:** POST
- **URL:** `https://digimenu-backend-3m6t.onrender.com/api/seed-demo`
- **Header:** `x-seed-key: demo-secret-2026`

### **Usando cURL:**

```bash
curl -X POST "https://digimenu-backend-3m6t.onrender.com/api/seed-demo?key=demo-secret-2026"
```

### **Usando JavaScript (navegador):**

```javascript
fetch('https://digimenu-backend-3m6t.onrender.com/api/seed-demo?key=demo-secret-2026', {
  method: 'POST'
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## ✅ **SE JÁ EXISTIR:**

Se você tentar criar novamente, receberá:

```json
{
  "message": "Demo já existe! Use o link abaixo.",
  "url": "https://digimenu-chi.vercel.app/s/demo-pizzaria",
  "email": "demo@pizzaria.com",
  "slug": "demo-pizzaria",
  "alreadyExists": true
}
```

**É normal!** O demo já foi criado antes.

---

## ❌ **POSSÍVEIS ERROS:**

### **"Não autorizado"**
```json
{
  "error": "Não autorizado. Configure SEED_SECRET_KEY..."
}
```

**Solução:** Verifique se a senha está correta.

### **"Seed requer PostgreSQL"**
```json
{
  "error": "Seed requer PostgreSQL. Configure DATABASE_URL."
}
```

**Solução:** Configure a variável `DATABASE_URL` no Render.

### **500 Internal Server Error**

**Solução:** Veja os logs do Render (Dashboard → Backend → Logs) e me envie a mensagem de erro.

---

## 🎯 **RESUMO:**

1. ⏳ Aguarde 2 minutos (deploy)
2. 🌐 Acesse: `https://digimenu-backend-3m6t.onrender.com/api/seed-demo?key=demo-secret-2026`
3. 🎉 Veja a mensagem de sucesso
4. 🔗 Acesse o link do demo
5. ✅ **FUNCIONANDO!**

---

## 📊 **O QUE SERÁ CRIADO:**

| Item | Quantidade |
|------|------------|
| 📂 Categorias | 3 |
| 📏 Tamanhos | 3 |
| 🍕 Sabores | 8 |
| 🧀 Bordas | 2 |
| ✨ Extras | 2 |
| 🍽️ Pratos | 3 |
| 🚚 Zonas de entrega | 1 |

---

## ⏰ **TEMPO TOTAL: 2 MINUTOS!**

**🎉 Muito mais fácil que usar o Shell!**
