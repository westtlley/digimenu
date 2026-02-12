# ⚡ Teste Rápido - 2 Minutos

## Passo a Passo Rápido

### 1. Verificar Instalações (30 segundos)

```bash
# Terminal 1 - Backend
cd backend
npm list socket.io

# Terminal 2 - Frontend  
npm list socket.io-client
```

**Resultado esperado:** Ambas devem mostrar as versões instaladas.

---

### 2. Iniciar Servidor (30 segundos)

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# ou
node server.js
```

**Verificar no console:**
```
🔌 WebSocket ativo
✅ Servidor rodando na porta 3000
```

---

### 3. Teste Básico de Pontos (30 segundos)

1. Abra o cardápio: `http://localhost:5173/s/seu-slug`
2. Faça login ou cadastre-se
3. Adicione um item ao carrinho (R$ 20,00)
4. Finalize o pedido
5. **Verificar:** Toast deve aparecer: "✨ Você ganhou 20 pontos!"

---

### 4. Teste de Notificação (30 segundos)

1. Permita notificações quando solicitado
2. Faça um pedido
3. Abra o Gestor de Pedidos (admin)
4. Altere o status do pedido para "Aceito"
5. **Verificar:** Notificação deve aparecer: "Pedido Aceito! 🎉"

---

## ✅ Se tudo funcionou:

- ✅ Pontos sendo adicionados
- ✅ Notificações aparecendo
- ✅ WebSocket conectado

## ❌ Se algo não funcionou:

1. **WebSocket não conecta:**
   - Verifique se backend está rodando
   - Verifique console do navegador (F12)
   - Verifique URL no `.env`

2. **Notificações não aparecem:**
   - Verifique se permitiu notificações
   - Verifique se está em HTTPS ou localhost
   - Verifique console do navegador

3. **Pontos não são salvos:**
   - Verifique console do navegador
   - Verifique localStorage (F12 → Application → Local Storage)

---

## 🔍 Verificação Rápida no Console

Abra o console do navegador (F12) e execute:

```javascript
// Verificar permissão de notificação
Notification.permission
// Deve retornar: "granted"

// Verificar WebSocket (se conectado)
// Deve aparecer no console: "✅ WebSocket conectado"

// Verificar pontos salvos
localStorage.getItem('loyalty_points_default_')
// Deve retornar JSON com pontos
```

---

## 📞 Comandos Úteis

```bash
# Verificar se porta 3000 está em uso
netstat -ano | findstr :3000

# Verificar processos Node
tasklist | findstr node

# Limpar cache do navegador
# Chrome: Ctrl+Shift+Delete
# Ou: F12 → Application → Clear storage
```
