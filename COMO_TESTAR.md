# 🧪 Como Testar o Sistema

## 🚀 Início Rápido (3 Passos)

### 1. Iniciar o Backend
```bash
cd backend
npm install  # Se ainda não instalou as dependências
npm run dev
# ou
node server.js
```

**✅ Verificar se apareceu:**
```
🔌 WebSocket ativo
🚀 Servidor rodando na porta 3000
```

### 2. Iniciar o Frontend
```bash
# Em outro terminal
npm run dev
```

**✅ Verificar se apareceu:**
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

### 3. Abrir a Página de Teste
Abra no navegador:
- `testar-sistema.html` (página de teste que criamos)
- Ou acesse o cardápio: `http://localhost:5173/s/seu-slug`

---

## 📋 Testes Manuais

### ✅ Teste 1: Sistema de Pontos (2 minutos)

1. **Acesse o cardápio:**
   ```
   http://localhost:5173/s/seu-slug
   ```

2. **Faça login ou cadastre-se**

3. **Adicione um item ao carrinho** (ex: R$ 30,00)

4. **Finalize o pedido**

5. **Verifique:**
   - Toast deve aparecer: "✨ Você ganhou 30 pontos!"
   - Abra o perfil (ícone de usuário)
   - Vá na aba "Fidelidade"
   - Deve mostrar 30 pontos

**✅ Se funcionou:** Pontos estão sendo adicionados corretamente!

---

### ✅ Teste 2: Notificações Push (1 minuto)

1. **Permita notificações** quando o navegador solicitar

2. **Faça um pedido**

3. **Abra o Gestor de Pedidos** (admin):
   ```
   http://localhost:5173/gestor-pedidos
   ```

4. **Altere o status do pedido** para "Aceito"

5. **Verifique:**
   - Notificação deve aparecer: "Pedido Aceito! 🎉"
   - Toast também deve aparecer na tela

**✅ Se funcionou:** Notificações push estão funcionando!

---

### ✅ Teste 3: WebSocket (1 minuto)

1. **Abra o console do navegador** (F12)

2. **Acesse o cardápio**

3. **Verifique no console:**
   ```
   ✅ WebSocket conectado: [algum-id]
   ```

4. **Faça um pedido**

5. **No admin, altere o status**

6. **Verifique no console:**
   ```
   📦 Pedido atualizado via WebSocket: {order}
   ```

**✅ Se funcionou:** WebSocket está conectado e funcionando!

---

### ✅ Teste 4: Favoritos (1 minuto)

1. **No cardápio, clique no coração** em um prato

2. **Verifique:**
   - Coração deve ficar vermelho (preenchido)
   - Toast: "Adicionado aos favoritos"

3. **Coloque o prato em promoção** (admin):
   - Admin → Pratos → Editar
   - Adicione `original_price` maior que `price`
   - Salve

4. **Verifique:**
   - Cliente deve receber notificação: "Seu Favorito Está em Promoção! 💝"

**✅ Se funcionou:** Sistema de favoritos está funcionando!

---

### ✅ Teste 5: Código de Referência (2 minutos)

1. **Abra o perfil do cliente**

2. **Vá na aba "Fidelidade"**

3. **Verifique:**
   - Deve aparecer seu código de referência
   - Exemplo: "USER1234"

4. **Clique no botão "Indicar"** no header (se autenticado)

5. **Copie o código**

6. **Em outra conta, aplique o código:**
   - Abra o modal de código de referência
   - Cole o código
   - Clique em "Aplicar"

7. **Verifique:**
   - Você deve ganhar 100 pontos
   - Quem indicou também deve ganhar 100 pontos

**✅ Se funcionou:** Sistema de referência está funcionando!

---

## 🔍 Verificações Técnicas

### Verificar no Console do Navegador (F12)

```javascript
// 1. Verificar permissão de notificação
Notification.permission
// Deve retornar: "granted"

// 2. Verificar WebSocket (se conectado)
// Deve aparecer: "✅ WebSocket conectado"

// 3. Verificar pontos salvos
localStorage.getItem('loyalty_points_default_')
// Deve retornar JSON com pontos

// 4. Verificar se socket.io está disponível
typeof io
// Deve retornar: "function"
```

### Verificar no Console do Servidor

```bash
# Deve aparecer quando cliente conecta:
✅ Cliente WebSocket conectado: [socket-id]

# Deve aparecer quando pedido é atualizado:
📤 Emitido order:updated para cliente [email]
```

---

## ❌ Problemas Comuns e Soluções

### Problema: WebSocket não conecta

**Sintomas:**
- Console mostra: "❌ Erro de conexão WebSocket"
- Notificações não aparecem

**Soluções:**
1. Verifique se o backend está rodando
2. Verifique a URL no `.env`:
   ```
   VITE_WS_URL=http://localhost:3000
   ```
3. Verifique CORS no backend
4. Verifique se a porta 3000 está livre

---

### Problema: Notificações não aparecem

**Sintomas:**
- Permissão foi concedida mas notificações não aparecem

**Soluções:**
1. Verifique permissão:
   ```javascript
   Notification.permission
   // Deve ser "granted"
   ```
2. Verifique se está em HTTPS ou localhost
3. Verifique se o navegador suporta (Chrome, Firefox, Edge)
4. Limpe o cache do navegador

---

### Problema: Pontos não são salvos

**Sintomas:**
- Faz pedido mas pontos não aparecem

**Soluções:**
1. Verifique console do navegador para erros
2. Verifique localStorage:
   ```javascript
   localStorage.getItem('loyalty_points_default_')
   ```
3. Verifique se está autenticado
4. Verifique se há entidade "Loyalty" no backend

---

### Problema: Bônus não são aplicados

**Sintomas:**
- Faz primeira compra mas não ganha bônus

**Soluções:**
1. Verifique se `loyaltyData.lastOrderDate` está null
2. Verifique console para erros
3. Verifique se as funções estão sendo chamadas

---

## 📊 Checklist Completo

Marque conforme testa:

- [ ] Backend inicia sem erros
- [ ] Frontend inicia sem erros
- [ ] WebSocket conecta
- [ ] Notificações são solicitadas
- [ ] Permissão de notificação é concedida
- [ ] Pontos são adicionados após compra
- [ ] Bônus de primeira compra funciona
- [ ] Níveis/tiers são calculados
- [ ] Desconto é aplicado no checkout
- [ ] Favoritos podem ser adicionados
- [ ] Notificação de promoção em favoritos funciona
- [ ] Código de referência é gerado
- [ ] Código de referência pode ser aplicado
- [ ] Notificações de status aparecem
- [ ] WebSocket atualiza em tempo real
- [ ] Bônus de avaliação funciona
- [ ] Bônus de aniversário funciona (se data configurada)
- [ ] Bônus de compras consecutivas funciona

---

## 🎯 Teste Rápido (5 minutos)

Execute estes 3 testes básicos:

1. **Teste de Pontos:**
   - Faça um pedido de R$ 20
   - Verifique se ganhou 20 pontos

2. **Teste de Notificação:**
   - Permita notificações
   - Faça um pedido
   - Altere status no admin
   - Verifique se notificação aparece

3. **Teste de WebSocket:**
   - Abra console (F12)
   - Verifique se aparece: "✅ WebSocket conectado"

**Se os 3 funcionarem:** Sistema está OK! ✅

---

## 📞 Precisa de Ajuda?

1. **Verifique os logs:**
   - Console do navegador (F12)
   - Console do servidor

2. **Verifique as dependências:**
   ```bash
   npm list socket.io-client
   cd backend && npm list socket.io
   ```

3. **Verifique as variáveis de ambiente:**
   - `.env` ou `.env.local`
   - `VITE_WS_URL` ou `VITE_API_URL`

4. **Limpe o cache:**
   - Navegador: Ctrl+Shift+Delete
   - Ou: F12 → Application → Clear storage

---

## ✅ Tudo Funcionando?

Se todos os testes passaram, seu sistema está pronto para uso! 🎉

Próximos passos:
- Configure variáveis de ambiente para produção
- Teste em dispositivos móveis
- Configure HTTPS para notificações push em produção
- Personalize as mensagens e valores de bônus
