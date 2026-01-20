# 🟡 Como vincular o DigiMenu ao Mercado Pago

Você pode receber pagamentos das assinaturas pelo Mercado Pago de duas formas: **link fixo** (rápido) ou **integração via API** (valor dinâmico do plano).

---

## ✅ Opção 1 — Link de pagamento (mais simples)

O DigiMenu já tem o campo **Link de pagamento**. Basta criar um link no Mercado Pago e colá-lo ali.

### 1. Criar o link no Mercado Pago

1. Acesse [vendedores.mercadopago.com.br](https://vendedores.mercadopago.com.br) e faça login.
2. Vá em **Suas vendas** → **Links de pagamento** (ou **Ferramentas de vendas** → **Links de pagamento**).
3. Clique em **Criar link de pagamento**.
4. Preencha:
   - **Título:** ex. `Assinatura DigiMenu - Mensal` ou `Assinatura DigiMenu - Anual`
   - **Preço:** o valor do plano (ex. R$ 49,90 para mensal ou R$ 399,90 para anual).
   - **Descrição:** ex. `Plano profissional com cardápio digital, gestão de pedidos e suporte.`
   - **Quantidade:** permitir 1 por compra ou “à disposição”, conforme a forma que você vende.
5. Salve e **copie o link** gerado (ex. `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...`).

### 2. Colar no DigiMenu

1. **Admin** (master) → **Sistema** → **Página Assinar**.
2. Na seção **Formas de pagamento**, no campo **Link de pagamento (cartão/boleto)**, cole o link do Mercado Pago.
3. Clique em **Salvar**.

Na página **Assinar**, o botão **Pagar Agora** abrirá o checkout do Mercado Pago.

### Se você tem plano mensal e anual

- Crie **dois links** no Mercado Pago (um para cada valor).
- No DigiMenu, por enquanto há **um único** campo de link. Você pode:
  - Usar o link do plano que você mais vende (ex. anual), **ou**
  - Criar uma **página única no Mercado Pago** com os dois produtos (Mensal e Anual) e usar o link dessa página.

---

## 🔧 Opção 2 — Integração via API (checkout com valor dinâmico)

Com a API do Mercado Pago, o valor exibido na Página Assinar (mensal ou anual) é enviado automaticamente para o checkout.

### O que é necessário

| Onde       | O quê |
|-----------|--------|
| Backend   | Rota (ex. `POST /api/mercado-pago/create-preference`) que cria uma **Preferência** com o valor do plano (mensal ou anual) e retorna a URL de pagamento ou o `preference_id` para o front. |
| Backend   | Variável de ambiente `MERCADOPAGO_ACCESS_TOKEN` (Access Token *produção* da sua conta MP). **Nunca** expor no front-end. |
| PaymentConfig | Persistir se o fluxo for “só Mercado Pago” ou “Mercado Pago + PIX” (o backend lê `monthly_price` / `yearly_price` da `PaymentConfig` ou de outra fonte). |

### Passos gerais (backend Node)

1. **Conta Mercado Pago**
   - [developers.mercadopago.com](https://www.mercadopago.com.br/developers) → Sua integração → Credenciais.
   - Use o **Access Token** de **produção** (não o de teste).

2. **Instalar SDK (exemplo Node)**  
   `npm install mercadopago`

3. **Exemplo de rota no backend** (apenas referência; adapte ao seu `server.js` e banco):

   ```js
   const mercadopago = require('mercadopago');
   mercadopago.configure({ access_token: process.env.MERCADOPAGO_ACCESS_TOKEN });

   app.post('/api/mercado-pago/create-preference', async (req, res) => {
     const { plan, amount, title, description } = req.body; // plan: 'monthly' | 'yearly'
     const preference = {
       items: [{
         title: title || 'Assinatura DigiMenu',
         unit_price: amount,
         quantity: 1,
         description: description || 'Plano profissional',
       }],
       back_urls: {
         success: `${process.env.FRONTEND_URL}/assinar?status=success`,
         failure: `${process.env.FRONTEND_URL}/assinar?status=failure`,
         pending: `${process.env.FRONTEND_URL}/assinar?status=pending`,
       },
       auto_return: 'approved',
     };
     const { body } = await mercadopago.preferences.create(preference);
     res.json({ init_point: body.init_point, preference_id: body.id });
   });
   ```

4. **Front-end (Página Assinar)**
   - No botão **Pagar Agora** (ou equivalente), em vez de abrir `payment_link`:
     - Chamar `POST /api/mercado-pago/create-preference` com `{ plan: 'monthly'|'yearly', amount: monthlyPrice|yearlyPrice, title, description }`.
     - Redirecionar o usuário para `init_point` retornado.

5. **Webhooks (opcional)**  
   Para ativar o assinante assim que o pagamento for aprovado:
   - Em [developers.mercadopago.com](https://www.mercadopago.com.br/developers) → Webhooks, cadastre a URL do seu backend (ex. `https://seu-backend.com/api/mercado-pago/webhook`).
   - No backend, receba `POST` do MP, identifique o pagamento aprovado e atualize o assinante (ex. liberar acesso, alterar `status`).

### Variáveis de ambiente (backend)

- `MERCADOPAGO_ACCESS_TOKEN` — Access Token de **produção**.
- `FRONTEND_URL` — URL do front (ex. `https://menu-chi.vercel.app`) para `back_urls`.

---

## 📌 Resumo

| Objetivo                    | O que fazer |
|----------------------------|-------------|
| Receber por cartão/boleto/PIX com pouco esforço | Use a **Opção 1**: crie o link no Mercado Pago e cole em **Página Assinar** → **Link de pagamento**. |
| Valor do checkout sempre igual ao plano (mensal/anual) e mais automação | Use a **Opção 2**: backend com `MERCADOPAGO_ACCESS_TOKEN`, rota de preferência e ajuste do botão na Página Assinar. |

---

## 🔗 Links úteis

- [Links de pagamento – Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-link/introduction)
- [Preferências (API) – Criar preferência](https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post)
- [Webhooks – Notificações](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
