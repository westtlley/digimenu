# Correção: Pratos Aparecendo e Desaparecendo

## 🔍 Problema Identificado

Os pratos cadastrados pelos assinantes e pelo admin ficavam aparecendo e desaparecendo na interface, causando uma experiência ruim para o usuário.

## 🎯 Causa Raiz

O problema estava relacionado à configuração incorreta das queries do React Query em múltiplos arquivos:

### 1. **DishesTab.jsx** (Principal problema)
- **Linha 679**: A query incluía `Date.now()` na `queryKey`
  ```javascript
  queryKey: ['dishes', menuContext?.type, menuContext?.value, Date.now()]
  ```
- Isso forçava a query a **sempre** buscar novos dados, pois a key nunca era a mesma
- Combinado com `staleTime: 0` e `gcTime: 0`, causava refetches constantes
- O componente alternava entre:
  - Mostrando dados antigos do cache
  - Fazendo refetch
  - Mostrando dados novos
  - Repetindo o ciclo

### 2. **useMenuData.js** (Problema secundário)
- Todos os hooks tinham `refetchOnMount: 'always'`
- Isso causava refetches desnecessários toda vez que o componente remontava
- Contribuía para o comportamento de "flicker"

## ✅ Correções Aplicadas

### 1. DishesTab.jsx

**Antes:**
```javascript
const { data: dishes = [], isLoading: dishesLoading, error: dishesError } = useQuery({
  queryKey: ['dishes', menuContext?.type, menuContext?.value, Date.now()], // ❌ PROBLEMA
  queryFn: async () => { ... },
  enabled: !!menuContext,
  initialData: [],
  retry: 1,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  staleTime: 0,      // ❌ Sempre considera dados velhos
  gcTime: 0,         // ❌ Não cacheia nada
});
```

**Depois:**
```javascript
const { data: dishes = [], isLoading: dishesLoading, error: dishesError } = useQuery({
  queryKey: ['dishes', menuContext?.type, menuContext?.value], // ✅ Key estável
  queryFn: async () => { ... },
  enabled: !!menuContext,
  initialData: [],
  placeholderData: keepPreviousData, // ✅ Mantém dados anteriores durante refetch
  retry: 1,
  refetchOnMount: 'always',          // ✅ Refetch ao montar para dados frescos
  refetchOnWindowFocus: false,       // ✅ Não refetch ao focar (evita flicker)
  staleTime: 30000,                  // ✅ 30s - dados considerados frescos
  gcTime: 60000,                     // ✅ 60s - cache mantido por 1 minuto
});
```

### 2. useMenuData.js

Ajustadas as configurações de todos os hooks:

**useMenuDishes:**
```javascript
refetchOnMount: true,           // ✅ true (não 'always')
refetchOnWindowFocus: false,    // ✅ Desabilitado
staleTime: 30000,               // ✅ 30s
gcTime: 60000,                  // ✅ 60s
```

**useMenuCategories e useMenuComplementGroups:**
```javascript
refetchOnMount: false,          // ✅ Usa cache
refetchOnWindowFocus: false,    // ✅ Desabilitado
staleTime: 30000,               // ✅ 30s
gcTime: 60000,                  // ✅ 60s
```

## 🎯 Benefícios das Correções

1. **Eliminação do "Flicker"**: Dados não aparecem e desaparecem mais
2. **Melhor Performance**: Menos requisições desnecessárias ao backend
3. **Cache Eficiente**: Dados são reutilizados quando apropriado
4. **Experiência do Usuário**: Interface mais estável e responsiva
5. **Redução de Carga**: Menor uso de banda e recursos do servidor

## 📝 Comportamento Esperado Agora

### Para Assinantes:
- ✅ Pratos carregam uma vez e permanecem visíveis
- ✅ Mudanças são refletidas apenas quando invalidadas explicitamente (create, update, delete)
- ✅ Cache de 30 segundos evita refetches desnecessários
- ✅ Dados anteriores são mantidos durante recarregamento (sem tela branca)

### Para Admin Master:
- ✅ Pode navegar entre contextos de assinantes sem problemas
- ✅ Dados de cada assinante são cacheados separadamente
- ✅ Transição suave entre diferentes contextos

## 🔧 Arquivos Modificados

1. `src/components/admin/DishesTab.jsx`
   - Removido `Date.now()` da queryKey
   - Ajustadas configurações de cache e refetch
   - Adicionado `placeholderData: keepPreviousData`

2. `src/hooks/useMenuData.js`
   - Mudado `refetchOnMount` de `'always'` para `true` (dishes) ou `false` (outros)
   - Adicionado `refetchOnWindowFocus: false` em todos os hooks
   - Mantidas configurações de staleTime e gcTime consistentes

## ⚠️ Notas Importantes

- O `menuContext` já estava estabilizado com `useMemo` no `usePermission` hook
- O backend estava funcionando corretamente - o problema era apenas no frontend
- A função `getSubscriberEmail` no backend estava corretamente implementada
- O multitenancy estava funcionando - apenas o cache que estava causando problemas

## 🧪 Como Testar

1. **Login como Assinante:**
   - Acesse o painel do assinante
   - Navegue até "Pratos"
   - Verifique se os pratos carregam e permanecem visíveis
   - Adicione/edite/exclua um prato
   - Confirme que as mudanças são refletidas imediatamente

2. **Login como Admin Master:**
   - Acesse o painel master
   - Entre no contexto de um assinante (através do slug ou seleção)
   - Navegue até "Pratos"
   - Verifique se os pratos do assinante correto são exibidos
   - Troque de contexto para outro assinante
   - Confirme que os pratos corretos são mostrados

3. **Teste de Performance:**
   - Observe o console do navegador
   - Verifique que não há múltiplos requests repetidos
   - Confirme que o cache está funcionando (30s staleTime)

## 📚 Referências

- [React Query - Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [React Query - Important Defaults](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [React Query - Placeholder Data](https://tanstack.com/query/latest/docs/react/guides/placeholder-query-data)

---

**Data da Correção:** 15/02/2026
**Status:** ✅ Concluído e Testado
