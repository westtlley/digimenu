# 🧪 Guia de Testes - Sistema de Fidelidade e Notificações

## 📋 Checklist de Testes

### 1. ✅ Testar Sistema de Fidelidade

#### Teste 1.1: Pontos por Compra
1. Faça um pedido de R$ 50,00
2. Verifique se ganhou 50 pontos (1 ponto por real)
3. Confira no perfil do cliente (aba "Fidelidade")

**Como verificar:**
- Abra o cardápio público (`/s/:slug`)
- Faça login ou cadastre-se
- Faça um pedido
- Após o pedido, verifique os pontos no perfil

#### Teste 1.2: Bônus de Primeira Compra
1. Faça seu primeiro pedido
2. Deve ganhar +50 pontos de bônus
3. Toast deve aparecer: "🎉 Bônus de primeira compra: +50 pontos!"

#### Teste 1.3: Níveis/Tiers
1. Acumule pontos:
   - 0-99 pontos = Bronze (0% desconto)
   - 100-499 pontos = Prata (5% desconto)
   - 500-999 pontos = Ouro (10% desconto)
   - 1000+ pontos = Platina (15% desconto)
2. Verifique se o desconto é aplicado no checkout

#### Teste 1.4: Bônus de Aniversário
1. Configure data de aniversário no perfil
2. Faça um pedido no dia do aniversário
3. Deve ganhar +100 pontos
4. Toast: "🎉 Parabéns! Você ganhou 100 pontos de bônus de aniversário!"

**Como configurar aniversário:**
- Abra o perfil do cliente
- Edite a data de nascimento
- Salve

#### Teste 1.5: Bônus de Compras Consecutivas
1. Faça pedidos em dias consecutivos:
   - Dia 1: Faça um pedido
   - Dia 2: Faça outro pedido
   - Dia 3: Faça outro pedido → Deve ganhar 30 pontos
   - Continue até 7 dias → Deve ganhar 100 pontos
   - Continue até 30 dias → Deve ganhar 500 pontos

**Nota:** Para testar rapidamente, você pode modificar a data do sistema ou aguardar os dias reais.

---

### 2. ✅ Testar Código de Referência

#### Teste 2.1: Gerar Código
1. Abra o perfil do cliente
2. Vá para a aba "Fidelidade"
3. Deve aparecer seu código de referência único
4. Clique no botão "Indicar" no header (se autenticado)

#### Teste 2.2: Aplicar Código
1. Use um código de referência de outro cliente
2. No modal de código de referência, digite o código
3. Clique em "Aplicar Código"
4. Você deve ganhar 100 pontos
5. Quem indicou também deve ganhar 100 pontos

---

### 3. ✅ Testar Favoritos

#### Teste 3.1: Adicionar aos Favoritos
1. No cardápio, clique no ícone de coração no card do prato
2. O coração deve ficar vermelho (preenchido)
3. O prato deve aparecer na lista de favoritos

#### Teste 3.2: Notificação de Promoção
1. Adicione um prato aos favoritos
2. No painel admin, coloque esse prato em promoção (adicione `original_price`)
3. O cliente deve receber notificação: "Seu Favorito Está em Promoção! 💝"

**Como colocar em promoção:**
- Admin → Pratos → Editar prato
- Adicione um `original_price` maior que o `price`
- Salve

---

### 4. ✅ Testar Notificações Push Web

#### Teste 4.1: Solicitar Permissão
1. Ao abrir o cardápio pela primeira vez
2. O navegador deve solicitar permissão de notificações
3. Clique em "Permitir"

**Verificar no console:**
```javascript
// Abra o console do navegador (F12)
// Deve aparecer: "✅ Permissão de notificação concedida"
```

#### Teste 4.2: Notificações de Status do Pedido
1. Faça um pedido
2. No painel admin (Gestor de Pedidos), altere o status:
   - **Aceito** → Deve aparecer: "Pedido Aceito! 🎉"
   - **Preparando** → Deve aparecer: "Pedido em Preparo 👨‍🍳"
   - **Pronto** → Deve aparecer: "Pedido Pronto! ✅"
   - **Saiu para Entrega** → Deve aparecer: "Pedido Saiu para Entrega 🚚"
   - **Entregue** → Deve aparecer: "Pedido Entregue! 🎊"

**Importante:** As notificações só aparecem se:
- A permissão foi concedida
- O WebSocket estiver conectado
- O cliente estiver na mesma página ou com a aba aberta

---

### 5. ✅ Testar WebSocket (Tempo Real)

#### Teste 5.1: Verificar Conexão
1. Abra o console do navegador (F12)
2. Abra o cardápio
3. Deve aparecer: "✅ WebSocket conectado: [socket-id]"

#### Teste 5.2: Testar Atualização em Tempo Real
1. Abra o cardápio em duas abas diferentes (ou dois navegadores)
2. Em uma aba, faça um pedido
3. Na outra aba (admin), altere o status do pedido
4. Na primeira aba (cliente), o status deve atualizar automaticamente
5. Deve aparecer notificação push

**Verificar no console:**
```javascript
// Deve aparecer:
// "📦 Pedido atualizado via WebSocket: {order}"
```

---

### 6. ✅ Testar Bônus de Avaliação

#### Teste 6.1: Primeira Avaliação
1. Faça um pedido e aguarde ser entregue
2. Avalie o pedido (modal deve aparecer automaticamente)
3. Deve ganhar 50 pontos
4. Toast: "🎉 Primeira avaliação! Você ganhou 50 pontos!"

#### Teste 6.2: Avaliações Seguintes
1. Faça outro pedido e avalie
2. Deve ganhar 20 pontos
3. Toast: "Obrigado pela avaliação! Você ganhou 20 pontos!"

---

## 🔍 Verificações Técnicas

### Verificar Backend

1. **Verificar se socket.io está instalado:**
```bash
cd backend
npm list socket.io
```

2. **Verificar se o servidor está rodando com WebSocket:**
```bash
# Ao iniciar o servidor, deve aparecer:
# "🔌 WebSocket ativo"
```

3. **Verificar logs do servidor:**
```bash
# Deve aparecer quando cliente conecta:
# "✅ Cliente WebSocket conectado: [socket-id]"
```

### Verificar Frontend

1. **Verificar se socket.io-client está instalado:**
```bash
npm list socket.io-client
```

2. **Verificar variáveis de ambiente:**
```bash
# No arquivo .env ou .env.local
VITE_WS_URL=http://localhost:3000
# ou
VITE_API_URL=http://localhost:3000
```

3. **Verificar console do navegador:**
- Abra F12 → Console
- Não deve haver erros relacionados a WebSocket
- Deve aparecer mensagens de conexão

---

## 🐛 Troubleshooting

### Problema: WebSocket não conecta

**Solução:**
1. Verifique se o backend está rodando
2. Verifique a URL no `.env`: `VITE_WS_URL=http://localhost:3000`
3. Verifique CORS no backend (`backend/server.js`)
4. Verifique se a porta está correta

### Problema: Notificações não aparecem

**Solução:**
1. Verifique se a permissão foi concedida:
   ```javascript
   // No console do navegador:
   Notification.permission
   // Deve retornar: "granted"
   ```
2. Verifique se o navegador suporta notificações (Chrome, Firefox, Edge)
3. Verifique se está em HTTPS ou localhost (notificações não funcionam em HTTP)

### Problema: Pontos não são salvos

**Solução:**
1. Verifique o console do navegador para erros
2. Verifique se há entidade "Loyalty" no backend
3. Verifique o localStorage:
   ```javascript
   // No console:
   localStorage.getItem('loyalty_points_[slug]_[phone]')
   ```

### Problema: Bônus não são aplicados

**Solução:**
1. Verifique se os dados estão sendo carregados corretamente
2. Verifique o console para erros
3. Verifique se as funções estão sendo chamadas (adicionar `console.log`)

---

## 📊 Testes Automatizados (Opcional)

Para testar programaticamente, você pode usar este código no console:

```javascript
// Testar notificação
import { sendLocalNotification } from '@/utils/pushService';
sendLocalNotification('Teste', { body: 'Isso é um teste' });

// Testar pontos
// (Precisa estar autenticado e ter acesso ao hook)
```

---

## ✅ Checklist Final

- [ ] Pontos são adicionados após compra
- [ ] Bônus de primeira compra funciona
- [ ] Níveis/tiers são calculados corretamente
- [ ] Desconto é aplicado no checkout
- [ ] Código de referência é gerado
- [ ] Código de referência pode ser aplicado
- [ ] Favoritos podem ser adicionados
- [ ] Notificação de promoção em favoritos funciona
- [ ] Permissão de notificação é solicitada
- [ ] Notificações de status aparecem
- [ ] WebSocket conecta corretamente
- [ ] Atualizações em tempo real funcionam
- [ ] Bônus de avaliação funciona
- [ ] Bônus de aniversário funciona
- [ ] Bônus de compras consecutivas funciona

---

## 🎯 Testes Rápidos (5 minutos)

1. **Teste Básico de Pontos:**
   - Faça um pedido de R$ 30
   - Verifique se ganhou 30 pontos

2. **Teste de Notificação:**
   - Permita notificações
   - Faça um pedido
   - Altere o status no admin
   - Verifique se notificação aparece

3. **Teste de Favoritos:**
   - Adicione um prato aos favoritos
   - Verifique se o coração fica vermelho

---

## 📝 Notas Importantes

1. **WebSocket requer servidor rodando** - Não funciona apenas com frontend
2. **Notificações requerem HTTPS** - Exceto em localhost
3. **Dados são salvos em localStorage** - Se não houver backend, funciona offline
4. **Bônus de aniversário** - Só funciona se data de nascimento estiver configurada
5. **Compras consecutivas** - Requer pedidos em dias diferentes (ou modificar data do sistema)

---

## 🆘 Precisa de Ajuda?

Se algo não estiver funcionando:
1. Verifique o console do navegador (F12)
2. Verifique os logs do servidor
3. Verifique se todas as dependências estão instaladas
4. Verifique se as variáveis de ambiente estão configuradas
