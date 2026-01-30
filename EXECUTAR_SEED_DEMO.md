# 🚀 COMO EXECUTAR O SEED DO DEMO

## ⚠️ O ERRO QUE VOCÊ ESTÁ VENDO:

```
404 - Link não encontrado
```

Isso acontece porque o **demo-pizzaria ainda não foi criado no banco de dados**.

---

## 📋 PASSO A PASSO (COM IMAGENS)

### **1️⃣ ACESSAR O RENDER**

1. Abra: https://dashboard.render.com
2. Faça login
3. Você verá a lista dos seus serviços

### **2️⃣ ACESSAR O BACKEND**

1. Procure pelo serviço: **digimenu-backend-3m6t** (ou nome similar)
2. Clique nele para abrir

### **3️⃣ ABRIR O SHELL**

1. No menu lateral esquerdo, procure por **"Shell"**
2. Clique em **"Shell"**
3. Aguarde o terminal carregar (pode demorar 10-30 segundos)
4. Você verá algo como:

```
/opt/render/project/src $
```

### **4️⃣ EXECUTAR O COMANDO**

No terminal que abriu, digite **EXATAMENTE** isso:

```bash
npm run seed:demo
```

Pressione **ENTER** e aguarde.

### **5️⃣ AGUARDAR A CRIAÇÃO**

Você verá essa sequência de mensagens:

```
🍕 Criando demo-pizzaria...

📝 Criando subscriber...
✅ Subscriber criado: demo@pizzaria.com

🏪 Criando loja...
✅ Loja criada

📂 Criando categorias...
✅ Categorias criadas

📏 Criando tamanhos de pizza...
✅ Tamanhos criados

🍕 Criando sabores...
✅ Sabores criados

🧀 Criando bordas...
✅ Bordas criadas

✨ Criando extras...
✅ Extras criados

🍽️ Criando pratos...
✅ Pratos criados

🚚 Criando zona de entrega...
✅ Zona criada

🎉 Demo criado com sucesso!

🔗 Acesse: https://digimenu-chi.vercel.app/s/demo-pizzaria
📧 Email: demo@pizzaria.com
🔑 Slug: demo-pizzaria
```

### **6️⃣ TESTAR O DEMO**

1. Abra uma **nova aba** no navegador
2. Acesse: https://digimenu-chi.vercel.app/s/demo-pizzaria
3. **Recarregue a página** (Ctrl+F5 ou Cmd+Shift+R)
4. O cardápio deve aparecer! 🎉

---

## 🎯 O QUE VOCÊ VAI VER:

```
┌────────────────────────────────────┐
│  🍕 PIZZARIA DEMO                  │
│  "A melhor pizza da cidade!"       │
│  ⏰ 18:00 - 23:00                  │
│  📍 Rua das Pizzas, 123            │
└────────────────────────────────────┘

[🔍 Buscar...]

📂 Pizzas
┌──────────────────────┐
│ 🍕 Monte Sua Pizza   │
│ R$ 35,00             │
│ Escolha tamanho,     │
│ sabores, borda...    │
└──────────────────────┘

📂 Bebidas
┌──────────────────────┐
│ 🥤 Coca-Cola 2L      │
│ R$ 12,00             │
└──────────────────────┘
┌──────────────────────┐
│ 🥤 Guaraná 2L        │
│ R$ 10,00             │
└──────────────────────┘
```

---

## ❓ PROBLEMAS COMUNS

### **"Shell não abre"**
- Aguarde 30 segundos
- Atualize a página do Render
- Tente novamente

### **"npm: command not found"**
- Você está no shell ERRADO
- Certifique-se de estar no **digimenu-backend** (não no postgres)
- O terminal correto mostra: `/opt/render/project/src $`

### **"DATABASE_URL não configurado"**
- O banco PostgreSQL não está conectado
- Vá em: Dashboard → Backend → Environment
- Verifique se existe a variável `DATABASE_URL`

### **"Subscriber já existe"**
É normal! Significa que já foi criado antes.

---

## 🎬 VÍDEO TUTORIAL

Se preferir, aqui está o passo a passo resumido:

1. **Render Dashboard** → Clique no backend
2. **Menu lateral** → Shell
3. **Terminal** → `npm run seed:demo`
4. **Aguarde** → Mensagens de sucesso
5. **Teste** → Acesse `/s/demo-pizzaria`

---

## 📞 AINDA COM DÚVIDA?

Me envie uma captura de tela:
1. Do Shell do Render (antes de executar o comando)
2. Da mensagem de erro (se houver)
3. Do console do navegador (F12) ao acessar `/s/demo-pizzaria`

---

## ✅ CHECKLIST

- [ ] Acessei o Render Dashboard
- [ ] Entrei no serviço **digimenu-backend**
- [ ] Abri o **Shell** (menu lateral)
- [ ] Aguardei o terminal carregar
- [ ] Digitei `npm run seed:demo`
- [ ] Vi as mensagens de sucesso
- [ ] Acessei `/s/demo-pizzaria` no navegador
- [ ] Recarreguei a página (Ctrl+F5)
- [ ] O cardápio apareceu! 🎉

---

**🍕 Boa sorte! Em 2 minutos você terá o demo funcionando!**
