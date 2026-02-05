# 🔍 Diagnóstico: Cardápio do Master não Funciona

## ✅ O que foi implementado

1. **Backend busca master por slug** - Funciona ✅
2. **Backend retorna dados do master** - Funciona ✅
3. **Frontend carrega dados via `/s/:slug`** - Funciona ✅
4. **Logs de debug adicionados** - Para identificar problemas ✅

## 🔍 Como Diagnosticar

### 1️⃣ Verificar se o slug está salvo

**No Admin:**
1. Acesse `/Admin`
2. Vá em **Loja** (aba Store)
3. Procure o card **"Meu Cardápio"**
4. Verifique se há um slug configurado
5. Se não houver, configure um slug (ex: `meu-restaurante`)

### 2️⃣ Verificar logs do backend

**No Render (Logs do Backend):**
Quando você acessa `/s/{seu-slug}`, você deve ver nos logs:

```
🔍 [public/cardapio] Buscando cardápio para slug: "seu-slug"
🔍 [public/cardapio] Buscando master com slug: "seu-slug"
✅ [public/cardapio] Encontrado master: seu-email@exemplo.com (ID: 123)
🔍 [public/cardapio] Buscando entidades do master (subscriber_email IS NULL)
📦 [public/cardapio] Store encontrados: 1
📦 [public/cardapio] Dishes encontrados: X
✅ [public/cardapio] Retornando dados: { is_master: true, store_name: "...", ... }
```

**Se não aparecer:**
- ❌ Slug não está salvo no banco
- ❌ Slug está diferente do que você digitou
- ❌ Usuário não é master

### 3️⃣ Verificar logs do frontend

**No Console do Navegador:**
Quando você acessa `/s/{seu-slug}`, você deve ver:

```
✅ [Cardapio] Dados recebidos: Object
📊 [Cardapio] Dados do cardápio público: {
  slug: "seu-slug",
  is_master: true,
  subscriber_email: "master",
  store: { name: "...", logo: "...", primary_color: "..." },
  dishes_count: X,
  categories_count: Y
}
```

**Se aparecer erro:**
- ❌ `❌ [Cardapio] Erro ao buscar cardápio público` → Backend não encontrou o slug
- ❌ `Link não encontrado` → Slug não existe no banco

### 4️⃣ Verificar se Store existe

**O master precisa ter um Store criado!**

**No Admin:**
1. Vá em **Loja** (aba Store)
2. Verifique se há uma loja configurada
3. Se não houver, preencha:
   - Nome da loja
   - Logo (opcional)
   - Cores do tema
   - Horários de funcionamento

**Se não tiver Store:**
- O cardápio não terá nome, logo, cores, etc.
- Aparecerá como "Loja" genérico

### 5️⃣ Verificar se há pratos e categorias

**O cardápio precisa ter:**
- ✅ Pelo menos 1 categoria
- ✅ Pelo menos 1 prato

**No Admin:**
1. Vá em **Pratos** (aba Dishes)
2. Verifique se há pratos criados
3. Vá em **Categorias** (aba Categories)
4. Verifique se há categorias criadas

## 🐛 Problemas Comuns

### ❌ Problema 1: "Link não encontrado"

**Causa:** Slug não está salvo no banco ou está diferente.

**Solução:**
1. No Admin → Loja → Meu Cardápio
2. Digite o slug novamente
3. Clique em **Salvar**
4. Aguarde alguns segundos
5. Tente acessar `/s/{seu-slug}` novamente

### ❌ Problema 2: Cardápio vazio (sem pratos)

**Causa:** Não há pratos ou categorias criadas.

**Solução:**
1. No Admin → **Categorias** → Criar categoria
2. No Admin → **Pratos** → Criar pratos
3. Certifique-se de que os pratos estão **Ativos**

### ❌ Problema 3: Sem logo/tema

**Causa:** Store não está configurada.

**Solução:**
1. No Admin → **Loja** → Configurações da Loja
2. Preencha:
   - Nome da loja
   - Logo (upload de imagem)
   - Cor primária (ex: `#f97316`)
   - Horários de funcionamento
3. Clique em **Salvar**

### ❌ Problema 4: Slug não salva

**Causa:** Pode haver erro no backend.

**Solução:**
1. Verifique os logs do backend no Render
2. Procure por erros ao salvar slug
3. Verifique se o usuário é master (`is_master = true`)

## 🧪 Teste Rápido

### Passo 1: Verificar Slug
```sql
-- No banco de dados (via Render ou local)
SELECT id, email, slug, is_master 
FROM users 
WHERE is_master = TRUE;
```

**Resultado esperado:**
- Deve ter pelo menos 1 linha
- `slug` não deve ser NULL
- `is_master` deve ser TRUE

### Passo 2: Verificar Store
```sql
SELECT id, entity_type, subscriber_email, data->>'name' as name
FROM entities 
WHERE entity_type = 'Store' 
AND subscriber_email IS NULL;
```

**Resultado esperado:**
- Deve ter pelo menos 1 linha
- `name` não deve ser NULL

### Passo 3: Testar API
```bash
# Substitua {seu-slug} pelo slug configurado
curl https://digimenu-backend-3m6t.onrender.com/api/public/cardapio/{seu-slug}
```

**Resultado esperado:**
- Status 200
- JSON com `is_master: true`
- `store` com nome, logo, etc.
- `dishes` e `categories` arrays

## 📋 Checklist de Verificação

- [ ] Slug está configurado no Admin → Loja → Meu Cardápio
- [ ] Slug está salvo no banco (verificar logs do backend)
- [ ] Store está criada e configurada
- [ ] Há pelo menos 1 categoria criada
- [ ] Há pelo menos 1 prato criado
- [ ] Pratos estão ativos
- [ ] API retorna dados corretos (teste com curl)
- [ ] Frontend recebe dados (verificar console do navegador)

## 🚀 Próximos Passos

1. **Verifique os logs** do backend quando acessar `/s/{seu-slug}`
2. **Verifique o console** do navegador para ver os dados recebidos
3. **Compartilhe os logs** se o problema persistir

Os logs agora mostram exatamente o que está acontecendo em cada etapa!
