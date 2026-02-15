# ✅ CORREÇÃO APLICADA: Pratos aparecem no cardápio mas não no painel

## 🎯 Problema Identificado

Baseado nos screenshots e logs fornecidos:

1. **Cardápio funciona** ✅ - Mostra 6 pratos (Tigela nordestina, Arroz de panela, Costela, Linguiça Toscana, etc.)
2. **Painel não funciona** ❌ - Mostra "Você ainda não cadastrou nenhum prato"
3. **Backend retorna 404** ❌ - Erro: `Cannot POST /api/functions/getFullSubscriberProfile`

### Causa Raiz

O backend no Render (`https://digimenu-backend-3m6t.onrender.com/api`) está:
- ✅ Servindo a rota pública: `/api/public/cardapio/{slug}` (funciona)
- ❌ NÃO servindo a rota admin: `/api/entities/Dish` (retorna 404)

Isso indica que:
- O código no Render está desatualizado
- Ou a rota admin foi removida/alterada
- Ou há problema de build/deploy no Render

## 🛠️ Solução Aplicada

Implementei um **sistema de fallback** no `adminMenuService.js`:

### Como funciona agora:

```javascript
1. Tenta buscar dados pela rota admin (/api/entities/Dish)
   ↓
2. Se falhar (404), tenta a rota pública (/api/public/cardapio/{slug})
   ↓
3. Se a rota pública funcionar, usa esses dados
   ↓
4. Se ambas falharem, retorna array vazio
```

### Arquivos Modificados

**`src/services/adminMenuService.js`:**
- `fetchAdminDishes()` - Fallback para rota pública
- `fetchAdminCategories()` - Fallback para rota pública
- `fetchAdminComplementGroups()` - Fallback para rota pública

**`src/components/admin/DishesTab.jsx`:**
- Logs de debug adicionados para diagnóstico

## 📋 Como Testar

### 1. Recarregue a Página
```
Ctrl + Shift + R (hard reload)
```

### 2. Acesse o Painel
```
http://localhost:5173/painel-assinante?tab=dishes
```
ou
```
https://digimenu-chi.vercel.app/temporodaneta/PainelAssinante?tab=dishes
```

### 3. Abra o Console (F12)

Você deverá ver estas mensagens:

```javascript
⚠️ [adminMenuService] Rota admin falhou, tentando fallback público
✅ [adminMenuService] Dados públicos como fallback: 6 pratos
🍽️ [DishesTab] Dados brutos: { total_dishes: 6, ... }
```

### 4. Resultado Esperado

✅ **Os 6 pratos do cardápio devem aparecer no painel:**
- Tigela nordestina
- Arroz de panela  
- Costela
- Linguiça Toscana
- Batata de porco
- Frango assado

## ⚠️ Limitações do Fallback

Como estamos usando a rota pública como fallback, algumas funcionalidades admin podem ter limitações:

### ✅ O que FUNCIONA:
- Visualizar pratos
- Visualizar categorias
- Visualizar complementos
- Ver detalhes dos pratos

### ⚠️ O que pode NÃO FUNCIONAR:
- Criar novos pratos (precisa da rota admin)
- Editar pratos (precisa da rota admin)
- Excluir pratos (precisa da rota admin)
- Reordenar pratos (precisa da rota admin)

## 🔧 Solução Definitiva (Recomendada)

Para resolver completamente, você precisa atualizar o backend no Render:

### Opção 1: Redeployar no Render
1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Encontre o serviço `digimenu-backend`
3. Clique em **"Manual Deploy" → "Deploy latest commit"**
4. Aguarde o deploy terminar (2-3 minutos)

### Opção 2: Rodar Backend Local com PostgreSQL
1. Instale PostgreSQL: https://www.postgresql.org/download/windows/
2. Crie o banco: `createdb digimenu`
3. Configure `backend/.env` com credenciais corretas
4. Rode: `cd backend && npm run dev`
5. Altere `.env` na raiz: `VITE_API_BASE_URL=http://localhost:3000/api`

### Opção 3: Usar Fallback (Solução Atual)
- Continuar usando o fallback
- Funciona para visualização
- Limitado para criação/edição

## 📊 Logs de Debug

O sistema agora mostra logs detalhados no console:

```javascript
// Quando tenta rota admin
📦 [adminMenuService] Buscando pratos admin...
📤 [adminMenuService] Chamando Dish.list com opts: {...}

// Quando admin falha e usa fallback
⚠️ [adminMenuService] Rota admin falhou, tentando rota pública como fallback
✅ [adminMenuService] Dados públicos como fallback: 6 pratos

// Estado final no DishesTab
🍽️ [DishesTab] Dados brutos: {
  total_dishes: 6,
  dishes_sample: [...]
}
🍽️ [DishesTab] Após filtro de pizza: {
  total_safe_dishes: 6,
  removed_pizzas: 0
}
```

## 🎯 Próximos Passos

1. **Teste agora**: Recarregue o painel e veja se os pratos aparecem
2. **Verifique o console**: Me envie os logs se ainda não funcionar
3. **Atualize o Render**: Para ter funcionalidade completa de edição

## 📞 Status da Correção

- ✅ Fallback implementado
- ✅ Código enviado para Git
- ✅ Logs de debug adicionados
- ⏳ Aguardando teste do usuário

---

**Commit:** `4372dc9`  
**Mensagem:** `fix: adicionar fallback de rota publica quando API admin falhar`

**Criado em:** 15/02/2026  
**Status:** Pronto para Teste
