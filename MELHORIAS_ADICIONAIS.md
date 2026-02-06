# 🚀 Melhorias Adicionais Propostas

## 📋 Análise do Sistema

Após a refatoração arquitetural, identifiquei oportunidades de melhoria seguindo o mesmo padrão:

### 🔍 Problemas Identificados

1. **Queries Duplicadas**
   - `base44.entities.Order.list()` usado em 10+ lugares
   - `base44.entities.Client.list()` usado em vários lugares
   - Sem contexto no queryKey (cache compartilhado incorretamente)

2. **Tratamento de Erro Inconsistente**
   - Alguns componentes têm try-catch
   - Outros apenas mostram toast
   - Sem padrão unificado

3. **Mutations Repetidas**
   - CRUD operations duplicadas
   - Invalidação de cache manual em cada mutation
   - Sem tratamento de erro padronizado

4. **QueryKeys Inconsistentes**
   - `['orders']` vs `['clientOrders']` vs `['dashboardOrders']`
   - Sem contexto (menuContext) nos keys
   - Cache não compartilhado quando deveria

5. **Loading States Inconsistentes**
   - Alguns usam Skeleton
   - Outros usam spinner genérico
   - Alguns não têm loading state

## ✅ Melhorias Propostas

### 1. Hooks para Entidades Comuns

**Criar:**
- `useOrders()` - Hook para buscar pedidos com contexto
- `useClients()` - Hook para buscar clientes
- `useStore()` - Hook para buscar loja

**Benefícios:**
- Reutilização de código
- Cache compartilhado
- Contexto automático

### 2. Hook de Mutation Padrão

**Criar:**
- `useEntityMutation()` - Hook genérico para CRUD
- Tratamento de erro unificado
- Invalidação de cache automática
- Toast notifications padronizadas

**Benefícios:**
- Menos código duplicado
- Comportamento consistente
- Fácil manutenção

### 3. QueryKeys Padronizados

**Criar:**
- `createQueryKey()` - Helper para criar queryKeys com contexto
- Sempre incluir `menuContext` quando relevante
- Evitar duplicação

**Benefícios:**
- Cache correto por contexto
- Fácil invalidação
- Debug mais fácil

### 4. Error Handling Global

**Criar:**
- `QueryErrorBoundary` - Error boundary específico para queries
- `useQueryWithError` - Hook que sempre trata erros
- Componente `QueryError` padronizado

**Benefícios:**
- Erros sempre visíveis
- UX consistente
- Debug mais fácil

### 5. Performance

**Otimizações:**
- Lazy loading de tabs pesados
- Code splitting por rota
- Memoização de componentes pesados

**Benefícios:**
- Carregamento inicial mais rápido
- Melhor experiência do usuário

## 🎯 Prioridade

### Alta Prioridade (Impacto Alto, Esforço Médio)
1. ✅ Hooks para entidades comuns
2. ✅ Hook de mutation padrão
3. ✅ QueryKeys padronizados

### Média Prioridade (Impacto Médio, Esforço Baixo)
4. ✅ Error handling global
5. ✅ Aplicar hooks em componentes existentes

### Baixa Prioridade (Impacto Baixo, Esforço Alto)
6. ⏳ Performance (lazy loading, code splitting)

## 📊 Impacto Esperado

- **-50% código duplicado** em queries e mutations
- **+100% consistência** no tratamento de erros
- **+80% facilidade** de manutenção
- **-30% bugs** relacionados a cache
