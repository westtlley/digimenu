# 🔐 Configuração do Mercado Pago

## 📋 Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis no arquivo **`.env`** do backend:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-access-token-aqui
MERCADOPAGO_PUBLIC_KEY=APP_USR-seu-public-key-aqui

# URLs (já existentes, mas confirme)
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## 🔑 Como Obter as Credenciais do Mercado Pago

### 1. Criar Conta no Mercado Pago

Se ainda não tem conta:
1. Acesse [mercadopago.com.br](https://www.mercadopago.com.br)
2. Clique em **"Crie sua conta"**
3. Complete o cadastro

---

### 2. Acessar o Painel de Desenvolvedores

1. Acesse [developers.mercadopago.com](https://www.mercadopago.com.br/developers)
2. Faça login com sua conta
3. Vá em **"Suas integrações"** ou **"Your integrations"**

---

### 3. Criar uma Aplicação

1. Clique em **"Criar aplicação"** ou **"Create application"**
2. Preencha:
   - **Nome:** `DigiMenu`
   - **Produto:** Selecione **"Pagamentos online"** ou **"Online payments"**
   - **Descrição:** Sistema de cardápio digital com assinaturas
3. Clique em **"Criar aplicação"**

---

### 4. Obter as Credenciais

Após criar a aplicação, você verá duas seções:

#### 🧪 **Credenciais de TESTE** (para desenvolvimento):

```
Public Key (TEST): TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token (TEST): TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Use estas credenciais enquanto estiver desenvolvendo/testando.

#### 🚀 **Credenciais de PRODUÇÃO** (para uso real):

```
Public Key (PROD): APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token (PROD): APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Use estas credenciais quando for para produção.

---

### 5. Configurar no Backend

Copie o **Access Token** e adicione no `.env`:

**Para TESTE (desenvolvimento):**
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-012345-abcdef123456789-12345678
```

**Para PRODUÇÃO:**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890-012345-abcdef123456789-12345678
```

---

## 🔔 Configurar Webhook (Notificações Automáticas)

### 1. No Painel do Mercado Pago

1. Acesse [developers.mercadopago.com](https://www.mercadopago.com.br/developers)
2. Vá em **"Webhooks"**
3. Clique em **"Adicionar notificação"**

### 2. Configurar URL do Webhook

**URL de produção:**
```
https://seu-backend.onrender.com/api/mercadopago/webhook
```

**Exemplo:**
```
https://digimenu-backend-abc123.onrender.com/api/mercadopago/webhook
```

### 3. Selecionar Eventos

Marque os eventos:
- ✅ **payment** (pagamento)
- ✅ **merchant_order** (pedido)

### 4. Salvar

Clique em **"Salvar"** e pronto!

---

## 🧪 Testar Integração

### 1. Cartões de Teste

O Mercado Pago fornece cartões de teste para você simular pagamentos:

#### ✅ **APROVADO:**
```
Número: 5031 4332 1540 6351
Vencimento: 11/25
CVV: 123
Nome: APRO
CPF: 12345678909
```

#### ❌ **RECUSADO:**
```
Número: 5031 4332 1540 6351
Vencimento: 11/25
CVV: 123
Nome: OTHE
CPF: 12345678909
```

### 2. Fluxo de Teste

1. Acesse a página **Assinar** no frontend
2. Clique em **"Pagar com Cartão"**
3. Será redirecionado para o checkout do Mercado Pago
4. Use um dos cartões de teste acima
5. Após pagamento aprovado, o sistema deve:
   - ✅ Criar assinante automaticamente
   - ✅ Enviar email de boas-vindas (log no console)
   - ✅ Gerar token de senha
   - ✅ Redirecionar para página de sucesso

---

## 📊 Monitorar Pagamentos

### No Painel do Mercado Pago

1. Acesse [mercadopago.com.br](https://www.mercadopago.com.br)
2. Vá em **"Atividade"** ou **"Activity"**
3. Visualize todos os pagamentos recebidos

### No Seu Sistema

Os pagamentos ficam salvos em `db.payments` e podem ser visualizados:
- Na página **Assinantes** (histórico por assinante)
- No dashboard de métricas (MRR, ARR)

---

## 🔒 Segurança

### ⚠️ NUNCA commite credenciais no Git!

O arquivo `.env` já está no `.gitignore`, mas sempre confira:

```bash
# Verificar se .env está ignorado
cat .gitignore | grep .env
```

### ✅ Usar variáveis de ambiente em produção

No **Render** (ou outra plataforma):
1. Vá em **Environment**
2. Adicione as variáveis:
   - `MERCADOPAGO_ACCESS_TOKEN`
   - `MERCADOPAGO_PUBLIC_KEY`

---

## 🆘 Suporte

Se tiver problemas:
1. Verifique os logs do backend (console)
2. Acesse o painel do Mercado Pago → Webhooks → Ver logs
3. Documentação oficial: [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers/pt/docs)

---

## 📚 Próximos Passos

Após configurar:
1. ✅ Testar pagamento em ambiente de teste
2. ✅ Verificar se webhook está funcionando
3. ✅ Conferir se assinante foi criado automaticamente
4. ✅ Validar email de boas-vindas (log)
5. 🚀 Migrar para credenciais de produção
