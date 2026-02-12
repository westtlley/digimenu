# 🍽️ Guia: Cardápio do Master Admin

## 📝 O que foi implementado?

Agora o **Admin Master** pode criar e gerenciar seu próprio cardápio, assim como os assinantes!

---

## 🎯 Funcionalidades

### 1. **Slug Personalizado**
- O master pode criar um link único para seu cardápio
- Exemplo: `/s/meu-restaurante`
- Configurável na aba **Loja** do painel admin

### 2. **Botão Cardápio no Header**
- Aparece automaticamente quando o slug está configurado
- Redireciona para o cardápio público do master
- Funciona tanto para master quanto para assinantes

### 3. **Gerenciamento Completo**
- Master pode:
  - Criar pratos, categorias e complementos
  - Configurar pizzas (tamanhos, sabores, bordas, extras)
  - Definir zonas de entrega
  - Personalizar tema e cores
  - Gerenciar horários de funcionamento

---

## 🚀 Como Usar

### **Passo 1: Configurar o Slug**

1. Acesse o **Painel Admin** (`/Admin`)
2. Vá na aba **Loja** (ícone de loja na sidebar)
3. No topo da página, você verá o card **"Meu Cardápio"**
4. Digite o slug desejado (ex: `meu-restaurante`)
5. Clique em **Salvar**

### **Passo 2: Visualizar o Cardápio**

Após salvar o slug, você verá:
- ✅ Link completo do cardápio
- ✅ Botão **"Copiar Link"** para compartilhar
- ✅ Botão **"Visualizar"** para abrir em nova aba
- ✅ Botão **"Cardápio"** no header do admin

### **Passo 3: Configurar a Loja**

1. Preencha as informações da loja:
   - Nome, slogan, logo
   - WhatsApp, endereço
   - Horários de funcionamento
   - Redes sociais (Instagram, Facebook, TikTok)

2. Configure o cardápio:
   - Adicione categorias (Pizzas, Bebidas, etc.)
   - Crie pratos
   - Configure pizzas (se aplicável)
   - Defina zonas de entrega

3. Personalize o tema:
   - Cores primárias
   - Logo e banner
   - Modo escuro/claro

---

## 🔧 Detalhes Técnicos

### **Banco de Dados**

Nova coluna na tabela `users`:
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
```

### **Backend**

Nova função `updateMasterSlug`:
```javascript
POST /api/functions/updateMasterSlug
Body: { slug: "meu-restaurante" }
```

### **Frontend**

Novo componente `MasterSlugSettings`:
- Localizado em: `src/components/admin/MasterSlugSettings.jsx`
- Integrado na aba **Loja** (`StoreTab.jsx`)
- Aparece apenas para usuários master

---

## 📊 Exemplo de Uso

### **Antes:**
- ❌ Master não tinha cardápio público
- ❌ Botão "Cardápio" não funcionava
- ❌ Não podia compartilhar link com clientes

### **Depois:**
- ✅ Master cria slug: `pizzaria-master`
- ✅ Cardápio público: `https://digimenu-chi.vercel.app/s/pizzaria-master`
- ✅ Botão "Cardápio" funciona perfeitamente
- ✅ Pode copiar e compartilhar o link

---

## 🎨 Interface

### **Card de Configuração:**
```
┌─────────────────────────────────────────┐
│ 🔗 Meu Cardápio                         │
├─────────────────────────────────────────┤
│ Link do Cardápio:                       │
│ ┌─────────────────────────┬──────────┐  │
│ │ .../s/meu-restaurante   │ [Salvar] │  │
│ └─────────────────────────┴──────────┘  │
│                                         │
│ ✅ Link do seu cardápio:                │
│ https://digimenu.../s/meu-restaurante  │
│                                         │
│ [📋 Copiar Link] [🔗 Visualizar]        │
└─────────────────────────────────────────┘
```

---

## 🚨 Importante

1. **Slug Único**: Cada slug deve ser único no sistema
2. **Formato**: Apenas letras minúsculas, números e hífens
3. **Conversão Automática**: Espaços são convertidos em hífens
4. **Caracteres Especiais**: São removidos automaticamente

---

## 🐛 Resolução de Problemas

### **Erro: "Slug já existe"**
- Outro usuário já está usando esse slug
- Tente um slug diferente

### **Botão "Cardápio" não aparece**
- Certifique-se de que o slug foi salvo
- Recarregue a página

### **Cardápio vazio**
- Configure a loja primeiro
- Adicione categorias e pratos
- Verifique se os itens estão ativos

---

## 🎉 Pronto!

Agora o master pode:
- ✅ Criar seu próprio cardápio
- ✅ Compartilhar com clientes
- ✅ Gerenciar tudo pelo painel admin
- ✅ Visualizar em tempo real

---

## 📚 Arquivos Modificados

1. **Backend:**
   - `backend/db/migrations/add_slug_to_users.sql` (nova migração)
   - `backend/db/repository.js` (suporte a slug em updateUser)
   - `backend/server.js` (função updateMasterSlug)

2. **Frontend:**
   - `src/components/admin/MasterSlugSettings.jsx` (novo componente)
   - `src/components/admin/StoreTab.jsx` (integração)
   - `src/pages/Admin.jsx` (botão Cardápio condicional)

---

## 🔗 Links Úteis

- [Documentação do Cardápio](./MODO_PIZZARIA_PREMIUM_GUIA.md)
- [Governança de Assinantes](./GOVERNANCA_ASSINANTES.md)
- [Guia de Configuração](./backend/GUIA_CONFIGURACAO_EMAIL.md)
