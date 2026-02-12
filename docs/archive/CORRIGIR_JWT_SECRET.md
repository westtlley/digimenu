# 🔐 Correção Definitiva: JWT_SECRET

## ⚠️ Problema Identificado

O log **"Token JWT inválido, tentando método alternativo"** aparece em todas as requisições porque:

1. ❌ O `JWT_SECRET` não está configurado no Render
2. ❌ Tokens foram gerados localmente com um secret diferente
3. ❌ Backend do Render usa `'dev-secret'` (padrão)
4. ❌ Nenhum token é válido → sempre entra em "modo alternativo"

## 🎯 Impacto

Isso causa:
- ❌ Falha silenciosa na autenticação
- ❌ Dados não persistem corretamente
- ❌ Estado da aplicação quebra
- ❌ Upload de imagens pode falhar
- ❌ Logs poluídos com avisos

## ✅ Solução (2 minutos)

### 1️⃣ Configurar JWT_SECRET no Render

1. Acesse https://dashboard.render.com
2. Vá para o serviço `digimenu-backend-3m6t`
3. Clique em **Environment** (Variáveis de Ambiente)
4. Adicione:

```
JWT_SECRET=digimenu_super_secret_2026
```

**💡 Dica:** Use uma string forte e única. Exemplos:
- `digimenu_super_secret_2026`
- `my_app_jwt_secret_xyz123`
- Qualquer string aleatória longa

5. Clique em **Save Changes**
6. O Render fará deploy automaticamente

### 2️⃣ Configurar JWT_SECRET no Backend Local

No arquivo `backend/.env`, adicione:

```env
JWT_SECRET=digimenu_super_secret_2026
```

**⚠️ IMPORTANTE:** Use o **mesmo valor** do Render!

### 3️⃣ Limpar Tokens Antigos no Navegador

1. Abra o site na Vercel: https://digimenu-chi.vercel.app
2. Pressione **F12** (abrir DevTools)
3. Vá em **Application** → **Local Storage**
4. Delete as chaves:
   - `auth_token` (ou `token`)
   - `user`
5. **Recarregue a página** (F5)
6. **Faça login novamente**

Agora o token será gerado com o mesmo secret do backend do Render.

## 🧪 Verificação

### Antes (❌ Problema)
```
Token JWT inválido, tentando método alternativo
Token JWT inválido, tentando método alternativo
Token JWT inválido, tentando método alternativo
```

### Depois (✅ Corrigido)
```
✅ Nenhum log de JWT inválido
✅ Autenticação funcionando
✅ Dados persistindo corretamente
✅ Upload funcionando
```

## 📋 Checklist

- [ ] `JWT_SECRET` configurado no Render
- [ ] `JWT_SECRET` configurado no `backend/.env` (mesmo valor)
- [ ] Backend local reiniciado após adicionar no `.env`
- [ ] Tokens antigos deletados do navegador
- [ ] Login feito novamente após limpar tokens
- [ ] Logs do Render não mostram mais "Token JWT inválido"

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Logs do Render

Após configurar, os logs devem mostrar:
```
🧪 ENV TEST: {
  ...
  JWT_SECRET: 'digimenu_super_secret_2026',
  ...
}
```

E **NÃO** deve mais aparecer:
```
Token JWT inválido, tentando método alternativo
```

### 2. Testar no Console do Navegador

Execute:
```javascript
// Verificar token
const token = localStorage.getItem('auth_token');
console.log('Token:', token ? 'Existe' : 'Não existe');

// Verificar se está autenticado
fetch('https://digimenu-backend-3m6t.onrender.com/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('✅ Autenticado:', data))
.catch(err => console.error('❌ Erro:', err));
```

### 3. Testar Upload

1. Tente fazer upload de uma imagem
2. Verifique se funciona sem erros
3. Verifique se a imagem aparece no formulário

## 🐛 Se Ainda Não Funcionar

### Problema: Ainda aparece "Token JWT inválido"

**Soluções:**
1. Verifique se o `JWT_SECRET` está configurado no Render
2. Verifique se o valor é **exatamente igual** no Render e no `.env` local
3. Verifique se você fez login **depois** de configurar
4. Limpe o cache do navegador (Ctrl+Shift+Delete)
5. Verifique os logs do Render para ver qual secret está sendo usado

### Problema: Token ainda não funciona

**Soluções:**
1. Delete todos os tokens do Local Storage
2. Feche todas as abas do site
3. Abra uma nova aba e faça login novamente
4. Verifique se o backend local está usando o mesmo secret

## 📝 Notas Importantes

- ⚠️ **Nunca** commite o `JWT_SECRET` no código
- ✅ Use sempre variáveis de ambiente
- ✅ Use o **mesmo valor** em todos os ambientes (local, Render, etc)
- ✅ Se mudar o secret, todos os usuários precisarão fazer login novamente
- ✅ O secret deve ser uma string forte e aleatória

## 🎯 Resultado Final

Após corrigir:
- ✅ Autenticação funcionando corretamente
- ✅ Tokens válidos em todas as requisições
- ✅ Dados persistindo corretamente
- ✅ Upload de imagens funcionando
- ✅ Logs limpos sem avisos
- ✅ Aplicação funcionando como esperado
