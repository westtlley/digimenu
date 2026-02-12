# ✅ Correção: Cardápio Público Sem Redirecionamento

## 🐛 Problemas Identificados e Corrigidos

### 1. ❌ Problema: Redirecionamento para Login em Rotas Públicas
**Causa**: O `apiClient.js` estava redirecionando para login em **qualquer** erro 401, mesmo em rotas públicas como `/api/public/cardapio/:slug`.

**Solução**: 
- Modificado `src/api/apiClient.js` para **não redirecionar** quando a rota contém `/public/`
- Rotas públicas agora podem retornar 401/404 sem causar redirecionamento

### 2. ❌ Problema: Tela `CardapioSemLink` Aparecendo
**Causa**: Quando acessava `/` ou `/cardapio` sem slug, mostrava a tela `CardapioSemLink` que o usuário não queria.

**Solução**:
- Rota `/` agora redireciona para `/Assinar` (tela de contratar)
- Rota `/cardapio` redireciona para `/Assinar`
- Função `CardapioSemLink` removida do fluxo principal
- Se não houver slug, redireciona automaticamente para `/Assinar`

### 3. ❌ Problema: Link do Cardápio Redirecionando para Login
**Causa**: Possível erro 401 na chamada `/api/public/cardapio/:slug` causando redirecionamento.

**Solução**:
- Rotas públicas não causam mais redirecionamento automático
- Cardápio público (`/s/:slug`) agora funciona sem autenticação

---

## 📝 Mudanças Realizadas

### `src/api/apiClient.js`
```javascript
// ANTES: Redirecionava para login em qualquer 401
if (response.status === 401) {
  window.location.href = '/login?returnUrl=...';
}

// DEPOIS: Não redireciona se for rota pública
if (response.status === 401) {
  const isPublicRoute = endpoint.includes('/public/') || endpoint.includes('/api/public/');
  if (!isPublicRoute && !this.isLoggingOut) {
    // Redirecionar apenas se NÃO for rota pública
    window.location.href = '/login?returnUrl=...';
  }
}
```

### `src/pages/index.jsx`
```javascript
// ANTES
<Route path="/" element={<Cardapio />} />
<Route path="/cardapio" element={<Navigate to="/" replace />} />

// DEPOIS
<Route path="/" element={<Navigate to="/Assinar" replace />} />
<Route path="/cardapio" element={<Navigate to="/Assinar" replace />} />
```

### `src/pages/Cardapio.jsx`
```javascript
// ANTES
if (!slug) return <CardapioSemLink />;

// DEPOIS
useEffect(() => {
  if (!slug) {
    navigate('/Assinar', { replace: true });
  }
}, [slug, navigate]);

if (!slug) {
  return null; // Retornar null enquanto redireciona
}
```

---

## ✅ Resultado Final

### Comportamento Correto:

1. **`/s/temperodaneta`** → ✅ Vai direto para o cardápio (sem login)
2. **`/`** → ✅ Redireciona para `/Assinar` (tela de contratar)
3. **`/cardapio`** → ✅ Redireciona para `/Assinar`
4. **Erro 401 em rota pública** → ✅ Não redireciona para login
5. **Tela `CardapioSemLink`** → ✅ Não aparece mais

---

## 🧪 Como Testar

1. Acesse `https://digimenu-chi.vercel.app/s/temperodaneta`
   - ✅ Deve mostrar o cardápio diretamente
   - ✅ Não deve redirecionar para login

2. Acesse `https://digimenu-chi.vercel.app/`
   - ✅ Deve redirecionar para `/Assinar`
   - ✅ Não deve mostrar tela de cardápio sem link

3. Acesse um cardápio inexistente: `/s/nao-existe`
   - ✅ Deve mostrar mensagem de erro
   - ✅ Link deve ir para `/Assinar`

---

**Status**: ✅ **Corrigido e Commitado**
