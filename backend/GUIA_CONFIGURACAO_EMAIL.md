# 📧 Guia de Configuração de Emails Automáticos

## Status Atual

✅ **Sistema de emails implementado e funcional**

Por enquanto, os emails estão sendo **logados no console** (desenvolvimento). Para produção, é necessário integrar com um serviço de email real.

## Emails Implementados

1. **📧 Boas-vindas** (`sendWelcomeEmail`)
   - Enviado quando um novo assinante é criado
   - Inclui: link para definir senha, URL do painel, URL do cardápio

2. **🔄 Renovação** (`sendRenewalEmail`)
   - Enviado quando a assinatura é renovada automaticamente
   - Inclui: nova data de expiração, valor cobrado

3. **⚠️ Aviso de Expiração** (`sendExpirationWarningEmail`)
   - Enviado 7, 3 e 1 dia antes da expiração
   - Inclui: data de expiração, link para renovar

4. **🚨 Assinatura Expirada** (`sendExpiredEmail`)
   - Enviado quando a assinatura expira
   - Inclui: alerta urgente, link para renovar

## Como Ativar Emails Reais (Produção)

### Opção 1: SendGrid (Recomendado)

**Vantagens:** 100 emails/dia grátis, fácil integração, confiável

```bash
npm install @sendgrid/mail
```

**Configuração no `.env`:**
```env
SENDGRID_API_KEY=SG.xxx...
SENDGRID_FROM_EMAIL=noreply@seudominio.com
SENDGRID_FROM_NAME=DigiMenu
```

**Atualizar `emailService.js`:**
```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendWelcomeEmail({ email, name, passwordToken, slug, plan }) {
  // ... preparar emailData ...
  
  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    subject: emailData.subject,
    html: emailData.html
  };
  
  await sgMail.send(msg);
  logger.log(`✅ Email de boas-vindas enviado para ${email}`);
}
```

### Opção 2: Mailgun

**Vantagens:** 5.000 emails/mês grátis (3 meses), API robusta

```bash
npm install mailgun.js form-data
```

**Configuração no `.env`:**
```env
MAILGUN_API_KEY=xxx...
MAILGUN_DOMAIN=mg.seudominio.com
MAILGUN_FROM=noreply@seudominio.com
```

**Código:**
```javascript
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

async function sendWelcomeEmail({ email, name, passwordToken, slug, plan }) {
  // ... preparar emailData ...
  
  await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: process.env.MAILGUN_FROM,
    to: email,
    subject: emailData.subject,
    html: emailData.html
  });
}
```

### Opção 3: AWS SES

**Vantagens:** 62.000 emails/mês grátis, escalável

```bash
npm install @aws-sdk/client-ses
```

**Configuração no `.env`:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx...
AWS_SECRET_ACCESS_KEY=xxx...
AWS_SES_FROM_EMAIL=noreply@seudominio.com
```

**Código:**
```javascript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION });

async function sendWelcomeEmail({ email, name, passwordToken, slug, plan }) {
  // ... preparar emailData ...
  
  const command = new SendEmailCommand({
    Destination: { ToAddresses: [email] },
    Message: {
      Body: { Html: { Data: emailData.html } },
      Subject: { Data: emailData.subject }
    },
    Source: process.env.AWS_SES_FROM_EMAIL
  });
  
  await sesClient.send(command);
}
```

## Emails Disparados Automaticamente

1. **No webhook do Mercado Pago:**
   - Quando pagamento é aprovado → Email de boas-vindas
   - Quando assinatura é renovada → Email de renovação

2. **No Cron Job diário (`cronJobs.js`):**
   - Verifica assinaturas próximas de expirar
   - Envia avisos 7, 3 e 1 dia antes
   - Envia email quando expira

## Próximos Passos

1. **Escolher um serviço de email** (recomendado: SendGrid para começar)
2. **Criar conta e obter API Key**
3. **Adicionar variáveis no `.env` (local) e Render (produção)**
4. **Atualizar `emailService.js` com código do serviço escolhido**
5. **Testar localmente**
6. **Deploy no Render**

## Verificar se está funcionando

Após deploy, monitore os logs no Render:
```bash
# Você deve ver logs como:
✅ Email de boas-vindas enviado para usuario@exemplo.com
✅ Email de aviso de expiração enviado (7 dias) para usuario@exemplo.com
```

## Importante

⚠️ **Para produção, é ESSENCIAL configurar um serviço de email real.**  
Sem isso, os assinantes não receberão:
- Instruções de primeira senha
- Avisos de expiração
- Confirmações de renovação

💡 **Recomendação:** Comece com SendGrid (100 emails/dia grátis é suficiente para começar).
