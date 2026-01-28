# 🚀 Deploy Urgente - Corrigir Login

## ⚠️ Situação Atual

O código local está **correto** com a rota de login implementada, mas o **backend no Render não tem** porque o deploy não foi feito.

## ✅ Solução: Fazer Deploy Agora

### Passo 1: Verificar Mudanças

```bash
git status
```

Você deve ver `backend/server.js` como modificado.

### Passo 2: Adicionar ao Git

```bash
git add backend/server.js
```

### Passo 3: Fazer Commit

```bash
git commit -m "fix: adicionar rotas de autenticação /api/auth/login e /api/auth/me"
```

### Passo 4: Fazer Push

```bash
git push
```

### Passo 5: Aguardar Deploy

1. Acesse https://dashboard.render.com
2. Vá para `digimenu-backend-3m6t`
3. Clique em **Events** ou **Logs**
4. Aguarde ver: `Build successful 🎉` e `Your service is live 🎉`

**Tempo estimado:** 2-5 minutos

### Passo 6: Testar

Após o deploy terminar:

1. Abra o console do navegador (F12)
2. Execute:
```javascript
fetch('https://digimenu-backend-3m6t.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@digimenu.com', password: 'admin123' })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Login funciona!', data);
  alert('Login funciona! Token: ' + data.token.substring(0, 20) + '...');
})
.catch(err => console.error('❌ Erro:', err));
```

3. Se retornar token → ✅ Funciona!
4. Tente fazer login no app

## 🔍 Verificação Rápida

### No Render Dashboard

Após o push, você deve ver:
- Novo build iniciado
- Build successful
- Service live

### Nos Logs do Render

Após o deploy, ao fazer login, você deve ver:
```
POST /api/auth/login
```

E **NÃO** deve aparecer:
```
Cannot POST /auth/login
```

## ⚡ Solução Alternativa (Se não puder fazer deploy agora)

Se precisar testar localmente primeiro:

1. Inicie o backend local:
```bash
cd backend
npm run dev
```

2. Configure o `.env` na raiz do projeto:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

3. Teste o login localmente

4. Depois faça o deploy para o Render

## 📝 Checklist

- [ ] Código commitado (`git commit`)
- [ ] Código enviado (`git push`)
- [ ] Deploy no Render iniciado
- [ ] Deploy concluído (verificar Events)
- [ ] Teste direto funcionou (console)
- [ ] Login no app funcionou

## 🎯 Resultado Esperado

Após o deploy:
- ✅ Login funciona com `admin@digimenu.com` / `admin123`
- ✅ Token JWT é gerado
- ✅ Não aparece mais "Cannot POST /auth/login"
- ✅ Usuário é autenticado e redirecionado

---

**Faça o deploy agora e me diga o resultado!** 🚀
