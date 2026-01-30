# 🍕 Seed do Demo Interativo

## 📝 O que é?

Script para criar o **demo-pizzaria** - uma pizzaria de demonstração totalmente funcional com dados de exemplo.

## 🎯 O que é criado?

### **Subscriber:**
- Email: `demo@pizzaria.com`
- Slug: `demo-pizzaria`
- Plano: `ultra` (todos os recursos)
- Status: `active` (sem expiração)

### **Loja:**
- Nome: Pizzaria Demo
- Slogan: "A melhor pizza da cidade!"
- WhatsApp: (11) 99988-7766
- Horário: 18:00 - 23:00 (todos os dias)
- Cor primária: #e63946 (vermelho)

### **Categorias:**
- 🍕 Pizzas
- 🥤 Bebidas
- 🍰 Sobremesas

### **Pizzas:**
- **Tamanhos:** Pequena (4 fatias), Média (6 fatias), Grande (8 fatias)
- **Sabores:** 
  - Tradicionais: Margherita, Calabresa, Frango c/ Catupiry, Portuguesa
  - Premium: Quatro Queijos, Pepperoni, Lombinho, Camarão
- **Bordas:** Catupiry (R$ 8), Cheddar (R$ 10)
- **Extras:** Bacon Extra (R$ 5), Azeitonas (R$ 3)

### **Bebidas:**
- Coca-Cola 2L (R$ 12)
- Guaraná Antarctica 2L (R$ 10)

### **Entrega:**
- Zona: Centro
- Taxa: R$ 5,00
- Pedido mínimo: R$ 30,00
- Tempo: 40-50 min

---

## 🚀 Como Usar

### **1. Localmente (Desenvolvimento)**

```bash
cd backend
npm run seed:demo
```

### **2. No Render (Produção)**

#### **Opção A: Via Shell do Render**
1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Vá no seu serviço backend
3. Clique em **"Shell"** (terminal)
4. Execute:
```bash
npm run seed:demo
```

#### **Opção B: Via Deploy Manual**
1. Commit e push do script:
```bash
git add backend/scripts/seed-demo-pizzaria.js
git add backend/package.json
git commit -m "feat: adicionar seed para demo-pizzaria"
git push origin main
```

2. Após o deploy, abra o Shell do Render e execute:
```bash
npm run seed:demo
```

---

## 🔗 Acessar o Demo

Após executar o script, acesse:

```
https://digimenu-chi.vercel.app/s/demo-pizzaria
```

Ou:

```
https://seu-dominio.com/s/demo-pizzaria
```

---

## ✅ Verificar se Funcionou

### **Console:**
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

### **No Navegador:**
1. Abra: `https://digimenu-chi.vercel.app/s/demo-pizzaria`
2. Você deve ver:
   - ✅ Banner da pizzaria
   - ✅ Categoria "Pizzas" com o prato "Monte Sua Pizza"
   - ✅ Categoria "Bebidas" com Coca-Cola e Guaraná
   - ✅ Ao clicar em "Monte Sua Pizza", abre o construtor de pizza

---

## 🔧 Resolver Problemas

### **Erro: "DATABASE_URL não configurado"**
```
❌ DATABASE_URL não configurado. O demo requer PostgreSQL.
```

**Solução:** Configure a variável `DATABASE_URL` no `.env` (local) ou nas variáveis de ambiente do Render.

### **Erro: "Subscriber já existe"**
```
✅ Subscriber já existe: demo@pizzaria.com
```

**Solução:** É normal! O script detecta e não duplica. Se quiser recriar do zero:

1. Entre no banco PostgreSQL
2. Delete o subscriber:
```sql
DELETE FROM entities WHERE subscriber_email = 'demo@pizzaria.com';
DELETE FROM subscribers WHERE email = 'demo@pizzaria.com';
```
3. Execute o seed novamente

---

## 🎨 Personalizar o Demo

Edite o arquivo `backend/scripts/seed-demo-pizzaria.js` para:
- Mudar o nome da pizzaria
- Adicionar mais sabores
- Alterar preços
- Incluir imagens (use Cloudinary)
- Adicionar mais categorias

---

## 📊 Estatísticas do Demo

| Recurso | Quantidade |
|---------|------------|
| Categorias | 3 |
| Tamanhos de Pizza | 3 |
| Sabores | 8 |
| Bordas | 2 |
| Extras | 2 |
| Pratos | 3 |
| Zonas de Entrega | 1 |

---

## 🚨 IMPORTANTE

- ⚠️ **NÃO use para dados reais de produção**
- ⚠️ **É apenas demonstração**
- ⚠️ **Pode ser deletado a qualquer momento**
- ⚠️ **Não tem login (somente visualização pública)**

---

## 🎉 Pronto!

Agora você tem um demo funcional para mostrar o DigiMenu em ação! 🍕✨
