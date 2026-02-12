# 🧪 Teste Rápido - Verificar se Rota Existe

## Teste 1: Verificar se a Rota Existe no Backend

Abra o console do navegador (F12) e execute:

```javascript
fetch('https://digimenu-backend-3m6t.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@digimenu.com',
    password: 'admin123'
  })
})
.then(async r => {
  const text = await r.text();
  console.log('Status:', r.status);
  console.log('Response:', text);
  try {
    const json = JSON.parse(text);
    console.log('✅ JSON:', json);
  } catch {
    console.log('❌ Não é JSON:', text);
  }
})
.catch(err => console.error('❌ Erro:', err));
```

### Resultados Possíveis:

#### ✅ Se retornar 200 com token:
```
Status: 200
Response: {"token":"...","user":{...}}
```
**→ Rota existe e funciona!** O problema é no frontend.

#### ❌ Se retornar 404:
```
Status: 404
Response: Cannot POST /api/auth/login
```
**→ Rota não existe no backend!** Precisa fazer deploy.

#### ⚠️ Se retornar 400/401:
```
Status: 401
Response: {"error":"Credenciais inválidas"}
```
**→ Rota existe!** Mas credenciais estão erradas.

## Teste 2: Verificar URL da API

Execute no console:

```javascript
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
```

Deve mostrar:
```
VITE_API_BASE_URL: https://digimenu-backend-3m6t.onrender.com/api
```

Se mostrar `undefined` ou algo diferente, o problema é a configuração.

## 🚀 Solução Baseada no Resultado

### Se a rota NÃO existe (404):
1. Fazer commit e push:
```bash
git add backend/server.js
git commit -m "fix: adicionar rotas de autenticação"
git push
```
2. Aguardar deploy no Render
3. Testar novamente

### Se a rota existe mas retorna erro:
- Verifique as credenciais
- Verifique os logs do Render
- Me envie o erro específico

### Se a rota funciona no teste mas não no app:
- Problema no frontend
- Limpe o cache do navegador
- Verifique se o frontend foi atualizado na Vercel
