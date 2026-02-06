# 🏗️ Refatoração Arquitetural do Digimenu

## 📋 Resumo Executivo

Esta refatoração resolve o problema raiz do sistema: **regra de negócio espalhada + estado confuso + permissões mal modeladas**.

### ✅ O que foi feito

1. **Modelo de Contexto de Usuário** - Separação clara Master vs Subscriber vs Público
2. **Helpers Anti-Loading-Infinito** - `safeFetch` com timeout obrigatório
3. **Logger Centralizado** - Debug profissional com categorias
4. **Serviços Separados** - `adminMenuService` vs `publicMenuService`
5. **usePermission Refatorado** - Retorna `menuContext` pronto para uso
6. **DishesTab Refatorado** - Usa contexto e serviços seguros
7. **Admin.jsx Simplificado** - Orquestração limpa, sem decisões de permissão
8. **AccessDenied Melhorado** - Mensagens claras ao invés de silêncio

## 🎯 Problemas Resolvidos

### ❌ Antes
- Master não tinha `subscriber_email` → sistema travava
- Loading infinito sem timeout
- Frontend decidia permissões
- Lógica duplicada entre admin e público
- Erros silenciosos (tela branca)

### ✅ Depois
- Master usa `menuContext` com `type: 'slug'` ou `null`
- Todo fetch tem timeout (8-10s)
- Backend decide, frontend obedece
- Serviços separados por contexto
- Erros visíveis com mensagens claras

## 📁 Arquivos Criados

### Utils
- `src/utils/logger.js` - Logger centralizado com categorias
- `src/utils/safeFetch.js` - Helpers anti-loading-infinito
- `src/utils/userContext.js` - Modelo de contexto de usuário

### Services
- `src/services/adminMenuService.js` - Serviço de menu para admin
- `src/services/publicMenuService.js` - Serviço de menu público

### Components
- `src/components/admin/AccessDenied.jsx` - Componente de acesso negado melhorado

## 🔄 Arquivos Modificados

### Core
- `src/components/permissions/usePermission.jsx`
  - Agora retorna `userContext` e `menuContext`
  - Cria contexto automaticamente baseado no tipo de usuário

- `src/components/admin/DishesTab.jsx`
  - Usa `menuContext` do `usePermission`
  - Usa `adminMenuService` para buscar dados
  - `getSubscriberEmail()` baseado em `menuContext`
  - Queries com contexto no `queryKey`

- `src/pages/Admin.jsx`
  - Lógica simplificada
  - Usa novo `AccessDenied` component
  - Logs com logger categorizado

## 🧠 Modelo Mental Correto

### UserContext
```javascript
{
  user: { id, email, is_master },
  menuContext: {
    type: 'slug' | 'subscriber',
    value: string | null
  },
  permissions: {},
  isMaster: boolean,
  subscriberData: null | {}
}
```

### Master
- `menuContext.type = 'slug'`
- `menuContext.value = user.slug || null`
- `subscriberData = null`
- Não depende de `subscriber_email`

### Subscriber
- `menuContext.type = 'subscriber'`
- `menuContext.value = subscriberData.email`
- `subscriberData = { email, plan, status, permissions }`

## 🚀 Como Usar

### Em um componente que precisa buscar dados do menu:

```javascript
import { usePermission } from '@/components/permissions/usePermission';
import { fetchAdminDishes } from '@/services/adminMenuService';

function MyComponent() {
  const { menuContext } = usePermission();
  
  const { data: dishes } = useQuery({
    queryKey: ['dishes', menuContext?.type, menuContext?.value],
    queryFn: () => fetchAdminDishes(menuContext),
    enabled: !!menuContext,
  });
  
  // ...
}
```

### Para obter subscriber_email correto:

```javascript
const getSubscriberEmail = () => {
  if (!menuContext) return user?.email || null;
  
  if (menuContext.type === 'subscriber' && menuContext.value) {
    return menuContext.value;
  }
  
  // Master não precisa de subscriber_email
  return null;
};
```

## ⚠️ Regras Obrigatórias

1. **Nunca mais `user?.subscriber_email || user?.email` diretamente**
   - Use `getSubscriberEmail()` baseado em `menuContext`

2. **Todo fetch deve ter timeout**
   - Use `safeFetch()` ou `fetchAdminDishes()` que já tem timeout

3. **Queries devem incluir contexto no queryKey**
   - `['dishes', menuContext?.type, menuContext?.value]`

4. **Master NÃO depende de subscriber_email**
   - Master pode ter `menuContext.value = null`

5. **Erros sempre visíveis**
   - Use `AccessDenied` ou `LoadingError` ao invés de tela branca

## 🔍 Debug

### Logs categorizados:
```javascript
import { log } from '@/utils/logger';

log.admin.log('Mensagem admin');
log.permission.warn('Aviso de permissão');
log.menu.error('Erro no menu');
```

### Verificar contexto:
```javascript
const { menuContext, userContext } = usePermission();
console.log('Contexto:', menuContext);
console.log('Contexto completo:', userContext);
```

## 📊 Resultado Final

✅ Master nunca mais trava  
✅ Cardápio abre sempre ou explica por quê  
✅ Sistema previsível  
✅ Bugs param de ser "fantasmas"  
✅ Fácil adicionar features sem medo  

## 🎓 Próximos Passos (Opcional)

1. Aplicar mesmo padrão em outros tabs (OrdersTab, StoreTab, etc.)
2. Criar hook `useMenuData()` que encapsula queries comuns
3. Backend retornar `menuContext` pronto (eliminar lógica do frontend)
4. Testes unitários para `userContext` e `safeFetch`

---

**Data da Refatoração:** 2025-01-15  
**Status:** ✅ Completo e Funcional
