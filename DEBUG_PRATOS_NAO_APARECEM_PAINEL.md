# 🐛 DEBUG: Pratos aparecem no cardápio mas não no painel

## ✅ Status Atual

- **Frontend**: Rodando em http://localhost:5173/
- **Backend**: Remoto em https://digimenu-backend-3m6t.onrender.com/api
- **Problema**: Pratos aparecem no cardápio público mas não no painel admin

## 🔍 Possíveis Causas

### 1. Backend Remoto em Cold Start
O backend no Render (plano gratuito) hiberna após 15 minutos de inatividade.
- ⏱️ Primeira requisição pode demorar 30-60 segundos
- 🔄 Durante esse tempo, o painel pode não carregar dados

### 2. Diferença entre APIs Pública vs Admin
- **Cardápio Público**: Usa `/api/public/cardapio/:slug` (não requer autenticação)
- **Painel Admin**: Usa `/api/entities/Dish` com autenticação e contexto

### 3. Problema de Contexto/Autenticação
- O usuário pode não estar autenticado corretamente
- O `menuContext` pode estar `null` ou incorreto
- O token JWT pode ter expirado

### 4. Cache do React Query
- Com as alterações recentes no cache, pode haver inconsistência
- O cache pode estar vazio no painel mas não no cardápio

## 🧪 Passos para Debugar

### Passo 1: Verificar no Console do Navegador (F12)

Abra o DevTools e procure por mensagens de log:

```javascript
// Procure por estas mensagens:
🔍 [DishesTab] Buscando pratos com menuContext: {...}
✅ [DishesTab] Pratos retornados: X pratos
🍽️ [DishesTab] Estado atual: {...}
📦 [adminMenuService] Buscando pratos admin...
```

### Passo 2: Verificar Network Tab

1. Abra Network (F12 → Network)
2. Filtre por "Fetch/XHR"
3. Acesse o painel de pratos
4. Veja se há requisição para `/api/entities/Dish`
5. Veja a resposta da requisição

**Possíveis respostas:**
- ✅ `200 OK` com array vazio `[]` → Backend está OK, mas não há pratos para esse contexto
- ❌ `401 Unauthorized` → Problema de autenticação
- ❌ `403 Forbidden` → Problema de permissões
- ⏱️ Request demorado (>30s) → Backend em cold start

### Passo 3: Verificar menuContext

No console do navegador, execute:

```javascript
// Verificar contexto atual
localStorage.getItem('auth')

// Ou no React DevTools, procure por usePermission e veja:
// - menuContext
// - user
// - isMaster
```

### Passo 4: Comparar URLs

**Cardápio (funcionando):**
- URL: `http://localhost:5173/s/seu-slug`
- API: `GET /api/public/cardapio/seu-slug`
- Não requer autenticação

**Painel (não funcionando):**
- URL: `http://localhost:5173/admin` ou `/painel-assinante`
- API: `GET /api/entities/Dish?order=...&as_subscriber=...`
- Requer autenticação

## 🛠️ Soluções Rápidas

### Solução 1: Aguardar Cold Start
Se for cold start do Render:
1. Aguarde 30-60 segundos
2. Recarregue a página (F5)
3. Verifique se os pratos aparecem

### Solução 2: Fazer Logout e Login Novamente
1. Faça logout do painel
2. Faça login novamente
3. Isso renovará o token e o contexto

### Solução 3: Limpar Cache
```javascript
// No console do navegador:
localStorage.clear()
// Depois recarregue a página
```

### Solução 4: Verificar se há pratos cadastrados para o usuário correto
1. Acesse o cardápio público: `http://localhost:5173/s/seu-slug`
2. Se os pratos aparecem lá, eles existem no banco
3. O problema é de contexto/autenticação no painel

## 📋 Checklist de Debug

Marque o que você já verificou:

- [ ] Frontend está rodando (http://localhost:5173/)
- [ ] Backend responde (acesse https://digimenu-backend-3m6t.onrender.com/api/health)
- [ ] Usuário está logado no painel
- [ ] Console mostra mensagens de [DishesTab]
- [ ] Network mostra requisição para `/api/entities/Dish`
- [ ] Requisição retorna 200 OK
- [ ] Response da requisição não está vazia
- [ ] menuContext não é null

## 🎯 Próximos Passos

Depois de verificar o console e network:

1. **Se o problema for cold start**: Aguardar ou configurar PostgreSQL local
2. **Se o problema for autenticação**: Fazer logout/login
3. **Se o problema for contexto**: Verificar código do usePermission
4. **Se a resposta estiver vazia**: Verificar filtro por subscriber_email no backend

## 📞 Informações Adicionais Necessárias

Para ajudar melhor, preciso saber:
1. O que aparece no console do navegador (F12)?
2. O que aparece na aba Network quando acessa o painel?
3. Qual é a URL que você está acessando?
4. Você está logado como admin master ou assinante?
5. O cardápio público mostra quantos pratos?

---

**Criado em:** 15/02/2026
**Status:** Aguardando informações do debug
