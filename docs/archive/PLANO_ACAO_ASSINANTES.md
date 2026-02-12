# 🚀 Plano de Ação: Automatizar Gestão de Assinantes

> **Roadmap prático para implementar as melhorias críticas**

---

## 🎯 SPRINT 1: Automação Básica (Semana 1-2)

### 1️⃣ Integração Mercado Pago (5 dias)

#### Dia 1-2: Configuração Básica

**Backend: Adicionar SDK do Mercado Pago**

```bash
cd backend
npm install mercadopago
```

**backend/config/mercadopago.js**
```javascript
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

module.exports = mercadopago;
```

**.env**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-access-token-aqui
MERCADOPAGO_PUBLIC_KEY=APP_USR-seu-public-key-aqui
```

---

#### Dia 3: Endpoint de Criar Pagamento

**backend/server.js**
```javascript
const mercadopago = require('./config/mercadopago');

// Criar preferência de pagamento
app.post('/api/mercadopago/create-payment', requireAuth, async (req, res) => {
  try {
    const { email, name, plan, interval } = req.body; // interval: 'monthly' | 'yearly'
    
    // Preços (você pode buscar do PaymentConfig)
    const prices = {
      monthly: {
        basic: 29.90,
        pro: 49.90,
        premium: 99.90
      },
      yearly: {
        basic: 299.90,
        pro: 499.90,
        premium: 999.90
      }
    };
    
    const amount = prices[interval][plan];
    
    // Criar preferência
    const preference = {
      items: [{
        title: `DigiMenu - Plano ${plan} (${interval === 'monthly' ? 'Mensal' : 'Anual'})`,
        unit_price: amount,
        quantity: 1,
        description: `Assinatura DigiMenu - Plano ${plan}`
      }],
      payer: {
        email: email,
        name: name
      },
      metadata: {
        subscriber_email: email,
        plan: plan,
        interval: interval,
        system: 'digimenu'
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pagamento/sucesso`,
        failure: `${process.env.FRONTEND_URL}/pagamento/falha`,
        pending: `${process.env.FRONTEND_URL}/pagamento/pendente`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/mercadopago/webhook`,
      statement_descriptor: 'DIGIMENU',
      external_reference: `${email}_${Date.now()}`
    };
    
    const response = await mercadopago.preferences.create(preference);
    
    res.json({
      success: true,
      init_point: response.body.init_point, // URL de pagamento
      preference_id: response.body.id
    });
    
  } catch (error) {
    logger.error('❌ Erro ao criar pagamento Mercado Pago:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar pagamento'
    });
  }
});
```

---

#### Dia 4-5: Webhook de Pagamento Aprovado

**backend/server.js**
```javascript
const crypto = require('crypto');

// Webhook do Mercado Pago
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Responder imediatamente (requisito do Mercado Pago)
    res.status(200).send('OK');
    
    // Processar notificação de forma assíncrona
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Buscar detalhes do pagamento
      const payment = await mercadopago.payment.get(paymentId);
      const paymentData = payment.body;
      
      logger.log('💳 Webhook recebido:', {
        status: paymentData.status,
        email: paymentData.metadata.subscriber_email,
        plan: paymentData.metadata.plan
      });
      
      // Pagamento aprovado
      if (paymentData.status === 'approved') {
        const { subscriber_email, plan, interval } = paymentData.metadata;
        
        // Verificar se assinante já existe
        let subscriber = db.subscribers.find(s => 
          s.email.toLowerCase() === subscriber_email.toLowerCase()
        );
        
        if (!subscriber) {
          // Criar novo assinante
          const newSubscriber = {
            id: String(db.subscribers.length + 1),
            email: subscriber_email,
            name: paymentData.payer.first_name || subscriber_email,
            plan: plan,
            status: 'active',
            expires_at: interval === 'monthly' 
              ? addMonths(new Date(), 1).toISOString()
              : addYears(new Date(), 1).toISOString(),
            permissions: getPlanPermissions(plan),
            whatsapp_auto_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          db.subscribers.push(newSubscriber);
          subscriber = newSubscriber;
          
          // Criar usuário se não existir
          let user = db.users.find(u => 
            u.email.toLowerCase() === subscriber_email.toLowerCase()
          );
          
          if (!user) {
            const newUser = {
              id: String(db.users.length + 1),
              email: subscriber_email,
              full_name: paymentData.payer.first_name || subscriber_email,
              password: null, // Será definida depois
              is_master: false,
              role: 'subscriber',
              subscriber_email: subscriber_email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            db.users.push(newUser);
            user = newUser;
          }
          
          // Criar Store padrão
          const slug = generateSlug(subscriber_email);
          const defaultStore = {
            name: `Restaurante ${paymentData.payer.first_name || 'Novo'}`,
            slug: slug,
            description: 'Bem-vindo ao nosso restaurante!',
            phone: paymentData.payer.phone?.number || '',
            address: '',
            logo: '',
            banner: '',
            primary_color: '#f97316',
            is_open: true,
            opening_hours: {},
            subscriber_email: subscriber_email
          };
          
          await saveEntity('Store', defaultStore, subscriber_email);
          
          // Gerar token de senha
          const passwordToken = generatePasswordToken(subscriber_email);
          
          // Salvar pagamento no histórico
          if (!db.payments) db.payments = [];
          db.payments.push({
            id: String(db.payments.length + 1),
            subscriber_email: subscriber_email,
            amount: paymentData.transaction_amount,
            plan: plan,
            interval: interval,
            status: 'approved',
            payment_method: paymentData.payment_type_id,
            gateway_payment_id: paymentData.id,
            gateway_response: paymentData,
            paid_at: paymentData.date_approved,
            created_at: new Date().toISOString()
          });
          
          // Enviar email de boas-vindas
          await sendWelcomeEmail({
            email: subscriber_email,
            name: paymentData.payer.first_name || subscriber_email,
            passwordToken: passwordToken,
            slug: slug,
            plan: plan
          });
          
          logger.log('✅ Assinante criado e ativado automaticamente:', subscriber_email);
          
        } else {
          // Renovar assinante existente
          subscriber.status = 'active';
          subscriber.expires_at = interval === 'monthly' 
            ? addMonths(new Date(), 1).toISOString()
            : addYears(new Date(), 1).toISOString();
          subscriber.updated_at = new Date().toISOString();
          
          // Salvar pagamento
          if (!db.payments) db.payments = [];
          db.payments.push({
            id: String(db.payments.length + 1),
            subscriber_email: subscriber_email,
            amount: paymentData.transaction_amount,
            plan: plan,
            interval: interval,
            status: 'approved',
            payment_method: paymentData.payment_type_id,
            gateway_payment_id: paymentData.id,
            gateway_response: paymentData,
            paid_at: paymentData.date_approved,
            created_at: new Date().toISOString()
          });
          
          // Enviar email de renovação
          await sendRenewalEmail({
            email: subscriber_email,
            name: subscriber.name,
            expires_at: subscriber.expires_at
          });
          
          logger.log('✅ Assinatura renovada automaticamente:', subscriber_email);
        }
        
        await saveDatabaseChanges();
      }
    }
    
  } catch (error) {
    logger.error('❌ Erro ao processar webhook:', error);
  }
});

// Funções auxiliares
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function generateSlug(email) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return `${base}-${random}`;
}

function generatePasswordToken(email) {
  const token = `pwd_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
  
  if (!db.passwordTokens) db.passwordTokens = {};
  db.passwordTokens[token] = {
    email: email.toLowerCase(),
    expiresAt: expiresAt.toISOString(),
    used: false
  };
  
  saveDatabaseChanges();
  return token;
}

async function sendWelcomeEmail({ email, name, passwordToken, slug, plan }) {
  // TODO: Implementar envio real de email
  // Por enquanto, apenas log
  const passwordUrl = `${process.env.FRONTEND_URL}/definir-senha?token=${passwordToken}`;
  const menuUrl = `${process.env.FRONTEND_URL}/s/${slug}`;
  const panelUrl = `${process.env.FRONTEND_URL}/painelassinante`;
  
  logger.log(`
📧 EMAIL DE BOAS-VINDAS:
Para: ${email}
Assunto: 🎉 Bem-vindo ao DigiMenu!

Olá ${name}!

Sua assinatura DigiMenu foi ativada com sucesso! 🚀

📋 Informações da sua conta:
- Plano: ${plan}
- Email: ${email}

🔐 Primeiro passo: Defina sua senha
${passwordUrl}

📱 Acesse seu painel de controle:
${panelUrl}

🍽️ Seu cardápio digital:
${menuUrl}

Qualquer dúvida, estamos à disposição!

Equipe DigiMenu
  `);
  
  // Aqui você integraria com SendGrid, Mailgun, AWS SES, etc.
}

async function sendRenewalEmail({ email, name, expires_at }) {
  logger.log(`
📧 EMAIL DE RENOVAÇÃO:
Para: ${email}
Assunto: ✅ Assinatura DigiMenu renovada!

Olá ${name}!

Sua assinatura foi renovada com sucesso! 🎉

Válida até: ${new Date(expires_at).toLocaleDateString('pt-BR')}

Continue aproveitando todos os recursos do DigiMenu.

Equipe DigiMenu
  `);
}
```

---

#### Frontend: Integrar botão de pagamento

**src/pages/Assinar.jsx**

Adicionar após o botão de PIX:

```jsx
import { useMutation } from '@tanstack/react-query';

export default function Assinar() {
  // ... código existente ...
  
  const createPaymentMutation = useMutation({
    mutationFn: async ({ plan, interval }) => {
      const response = await base44.functions.invoke('createMercadoPagoPayment', {
        email: user?.email || '',
        name: user?.full_name || '',
        plan: plan,
        interval: interval
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.init_point) {
        // Redirecionar para página de pagamento do Mercado Pago
        window.location.href = data.init_point;
      }
    },
    onError: (error) => {
      toast.error('Erro ao criar pagamento. Tente novamente.');
    }
  });
  
  const handlePayWithCard = () => {
    if (!user) {
      toast.error('Faça login antes de assinar');
      return;
    }
    
    createPaymentMutation.mutate({
      plan: 'pro', // ou detectar do selectedPlan
      interval: selectedPlan // 'monthly' | 'yearly'
    });
  };
  
  return (
    <div className="min-h-screen">
      {/* ... código existente ... */}
      
      {/* Adicionar botão de cartão */}
      <Button
        onClick={handlePayWithCard}
        disabled={createPaymentMutation.isLoading}
        className="w-full"
      >
        {createPaymentMutation.isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        Pagar com Cartão
      </Button>
    </div>
  );
}
```

**Registrar function no backend:**

```javascript
// backend/server.js - dentro de invokeFunction
case 'createMercadoPagoPayment':
  return await createMercadoPagoPayment(body, user);
  
// ...

async function createMercadoPagoPayment(data, user) {
  // Mesma lógica do endpoint /api/mercadopago/create-payment
  // ...
}
```

---

### 2️⃣ Notificações de Expiração (2 dias)

**backend/utils/cron.js** (novo arquivo)

```javascript
const cron = require('node-cron');
const { db, saveDatabaseChanges } = require('./db/persistence');
const { differenceInDays } = require('date-fns');
const logger = require('./utils/logger');

// Executar todos os dias às 9h da manhã
cron.schedule('0 9 * * *', async () => {
  logger.log('🔔 Verificando expirações de assinaturas...');
  
  const now = new Date();
  
  for (const subscriber of db.subscribers) {
    if (!subscriber.expires_at || subscriber.status !== 'active') continue;
    
    const expiresAt = new Date(subscriber.expires_at);
    const daysUntilExpiration = differenceInDays(expiresAt, now);
    
    // 7 dias antes
    if (daysUntilExpiration === 7) {
      await sendExpirationEmail(subscriber, 7);
      logger.log(`📧 Notificação 7 dias enviada para: ${subscriber.email}`);
    }
    
    // 3 dias antes
    if (daysUntilExpiration === 3) {
      await sendExpirationEmail(subscriber, 3);
      await sendExpirationWhatsApp(subscriber, 3);
      logger.log(`📧 Notificação 3 dias enviada para: ${subscriber.email}`);
    }
    
    // 1 dia antes
    if (daysUntilExpiration === 1) {
      await sendExpirationEmail(subscriber, 1);
      await sendExpirationWhatsApp(subscriber, 1);
      logger.log(`🚨 Notificação 1 dia enviada para: ${subscriber.email}`);
    }
    
    // Expirado hoje
    if (daysUntilExpiration === 0) {
      subscriber.status = 'expired';
      subscriber.updated_at = new Date().toISOString();
      await sendExpiredEmail(subscriber);
      logger.log(`❌ Assinatura expirada: ${subscriber.email}`);
    }
  }
  
  await saveDatabaseChanges();
  logger.log('✅ Verificação de expirações concluída');
});

async function sendExpirationEmail(subscriber, daysRemaining) {
  const renewUrl = `${process.env.FRONTEND_URL}/assinar?email=${subscriber.email}`;
  
  logger.log(`
📧 EMAIL DE EXPIRAÇÃO:
Para: ${subscriber.email}
Assunto: ⚠️ Sua assinatura DigiMenu expira em ${daysRemaining} dia(s)

Olá ${subscriber.name}!

Sua assinatura DigiMenu expira em ${daysRemaining} dia(s).

📅 Data de expiração: ${new Date(subscriber.expires_at).toLocaleDateString('pt-BR')}

Para continuar usando todos os recursos, renove sua assinatura:
${renewUrl}

Não perca o acesso ao seu cardápio digital e sistema de pedidos!

Equipe DigiMenu
  `);
  
  // TODO: Integrar com serviço de email real
}

async function sendExpirationWhatsApp(subscriber, daysRemaining) {
  // TODO: Integrar com API do WhatsApp (Twilio, Zenvia, etc.)
  logger.log(`📱 WhatsApp enviado para ${subscriber.email}: Expira em ${daysRemaining} dias`);
}

async function sendExpiredEmail(subscriber) {
  const renewUrl = `${process.env.FRONTEND_URL}/assinar?email=${subscriber.email}`;
  
  logger.log(`
📧 EMAIL DE EXPIRAÇÃO:
Para: ${subscriber.email}
Assunto: 🚨 Sua assinatura DigiMenu expirou

Olá ${subscriber.name}!

Sua assinatura DigiMenu expirou hoje.

Seus clientes não conseguem mais acessar seu cardápio digital.

Renove agora para reativar:
${renewUrl}

Equipe DigiMenu
  `);
}

module.exports = {};
```

**backend/server.js** - importar no início:

```javascript
require('./utils/cron');
```

**Instalar dependência:**

```bash
npm install node-cron date-fns
```

---

## 📊 SPRINT 2: Dashboard de Métricas (Semana 3)

### Adicionar tabela de pagamentos

**backend/db/schema.sql** - adicionar:

```sql
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  subscriber_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  plan VARCHAR(50),
  interval VARCHAR(50), -- 'monthly', 'yearly'
  status VARCHAR(50), -- 'pending', 'approved', 'rejected', 'refunded'
  payment_method VARCHAR(50), -- 'pix', 'credit_card', 'boleto'
  gateway_payment_id VARCHAR(255),
  gateway_response JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_subscriber ON payments(subscriber_email);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
```

---

### Endpoint de métricas

**backend/server.js**

```javascript
// Obter métricas de assinantes
app.get('/api/subscribers/metrics', requireAuth, requireMaster, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const subscribers = db.subscribers;
    const payments = db.payments || [];
    
    // MRR (Monthly Recurring Revenue)
    const activeSubscribers = subscribers.filter(s => s.status === 'active');
    const planPrices = { basic: 29.90, pro: 49.90, premium: 99.90 };
    const mrr = activeSubscribers.reduce((sum, s) => {
      return sum + (planPrices[s.plan] || 0);
    }, 0);
    
    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;
    
    // Churn Rate (últimos 30 dias)
    const churnedSubscribers = subscribers.filter(s => {
      const updatedAt = new Date(s.updated_at);
      return s.status === 'inactive' && updatedAt > thirtyDaysAgo;
    });
    const churnRate = subscribers.length > 0 
      ? ((churnedSubscribers.length / subscribers.length) * 100).toFixed(1)
      : 0;
    
    // Novos assinantes (últimos 30 dias)
    const newSubscribers = subscribers.filter(s => {
      const createdAt = new Date(s.created_at || s.updated_at);
      return createdAt > thirtyDaysAgo;
    });
    
    // Expirando em breve
    const expiringSoon = subscribers.filter(s => {
      if (!s.expires_at || s.status !== 'active') return false;
      const daysUntil = differenceInDays(new Date(s.expires_at), now);
      return daysUntil > 0 && daysUntil <= 30;
    });
    
    // Distribuição por plano
    const byPlan = {
      basic: {
        count: subscribers.filter(s => s.plan === 'basic' && s.status === 'active').length,
        mrr: subscribers.filter(s => s.plan === 'basic' && s.status === 'active').length * planPrices.basic
      },
      pro: {
        count: subscribers.filter(s => s.plan === 'pro' && s.status === 'active').length,
        mrr: subscribers.filter(s => s.plan === 'pro' && s.status === 'active').length * planPrices.pro
      },
      premium: {
        count: subscribers.filter(s => s.plan === 'premium' && s.status === 'active').length,
        mrr: subscribers.filter(s => s.plan === 'premium' && s.status === 'active').length * planPrices.premium
      }
    };
    
    // Pagamentos recentes
    const recentPayments = payments
      .filter(p => p.status === 'approved')
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
      .slice(0, 10);
    
    res.json({
      success: true,
      metrics: {
        mrr: mrr.toFixed(2),
        arr: arr.toFixed(2),
        churnRate: churnRate,
        activeSubscribers: activeSubscribers.length,
        totalSubscribers: subscribers.length,
        newSubscribersLast30Days: newSubscribers.length,
        expiringSoon: expiringSoon.length,
        byPlan: byPlan
      },
      recentPayments: recentPayments
    });
    
  } catch (error) {
    logger.error('Erro ao buscar métricas:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar métricas' });
  }
});
```

---

### Frontend: Dashboard de Métricas

**src/components/admin/subscribers/MetricsDashboard.jsx** (novo)

```jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertCircle,
  Calendar 
} from 'lucide-react';

export default function MetricsDashboard() {
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['subscriberMetrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSubscriberMetrics');
      return response;
    },
    refetchInterval: 60000 // Atualizar a cada 1 minuto
  });
  
  if (isLoading) {
    return <div className="text-center py-8">Carregando métricas...</div>;
  }
  
  const metrics = metricsData?.metrics || {};
  const recentPayments = metricsData?.recentPayments || [];
  
  return (
    <div className="space-y-6">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <Badge variant="secondary" className="bg-green-200 text-green-800">
              MRR
            </Badge>
          </div>
          <div className="text-3xl font-bold text-green-900">
            R$ {metrics.mrr}
          </div>
          <div className="text-sm text-green-700 mt-1">
            Receita Recorrente Mensal
          </div>
        </Card>
        
        {/* ARR */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <Badge variant="secondary" className="bg-blue-200 text-blue-800">
              ARR
            </Badge>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            R$ {metrics.arr}
          </div>
          <div className="text-sm text-blue-700 mt-1">
            Projeção Anual
          </div>
        </Card>
        
        {/* Churn Rate */}
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 text-yellow-600" />
            <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
              Churn
            </Badge>
          </div>
          <div className="text-3xl font-bold text-yellow-900">
            {metrics.churnRate}%
          </div>
          <div className="text-sm text-yellow-700 mt-1">
            Taxa de Cancelamento
          </div>
        </Card>
        
        {/* Assinantes Ativos */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-purple-600" />
            <Badge variant="secondary" className="bg-purple-200 text-purple-800">
              Ativos
            </Badge>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {metrics.activeSubscribers}
          </div>
          <div className="text-sm text-purple-700 mt-1">
            de {metrics.totalSubscribers} assinantes
          </div>
        </Card>
      </div>
      
      {/* Alertas */}
      {metrics.expiringSoon > 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <div>
              <h4 className="font-semibold text-orange-900">
                {metrics.expiringSoon} assinatura(s) expirando em breve
              </h4>
              <p className="text-sm text-orange-700">
                Entre em contato para renovação
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Distribuição por plano */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Distribuição por Plano</h3>
        <div className="space-y-3">
          {Object.entries(metrics.byPlan || {}).map(([plan, data]) => (
            <div key={plan} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium capitalize">{plan}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({data.count} assinante{data.count !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">
                  R$ {data.mrr?.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">MRR</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Pagamentos recentes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Pagamentos Recentes</h3>
        <div className="space-y-2">
          {recentPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum pagamento registrado</p>
          ) : (
            recentPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{payment.subscriber_email}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(payment.paid_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    R$ {payment.amount.toFixed(2)}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {payment.plan}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
```

**src/pages/Assinantes.jsx** - adicionar no topo:

```jsx
import MetricsDashboard from '../components/admin/subscribers/MetricsDashboard';

// ...dentro do render, antes da lista de assinantes:

<div className="mb-8">
  <MetricsDashboard />
</div>
```

---

## 🎁 SPRINT 3: Trial de 7 Dias (Semana 4)

### Backend: Adicionar suporte a trial

**backend/db/schema.sql** - adicionar coluna:

```sql
ALTER TABLE subscribers ADD COLUMN trial_ends_at TIMESTAMP;
```

**backend/server.js** - modificar webhook:

```javascript
// No webhook, ao criar novo assinante, adicionar trial:
const newSubscriber = {
  // ... campos existentes ...
  status: 'trialing', // Novo status
  trial_ends_at: addDays(new Date(), 7).toISOString(), // 7 dias
  expires_at: addDays(new Date(), 37).toISOString() // 7 trial + 30 dias
};
```

**Cron job para converter trials:**

```javascript
// backend/utils/cron.js - adicionar:

// Verificar trials expirando
const trialsEnding = subscribers.filter(s => {
  if (!s.trial_ends_at || s.status !== 'trialing') return false;
  const trialEnds = new Date(s.trial_ends_at);
  const daysUntilEnd = differenceInDays(trialEnds, now);
  return daysUntilEnd <= 3 && daysUntilEnd >= 0;
});

for (const subscriber of trialsEnding) {
  const daysRemaining = differenceInDays(new Date(subscriber.trial_ends_at), now);
  await sendTrialEndingEmail(subscriber, daysRemaining);
}

// Converter trials expirados
const expiredTrials = subscribers.filter(s => {
  if (!s.trial_ends_at || s.status !== 'trialing') return false;
  return new Date(s.trial_ends_at) < now;
});

for (const subscriber of expiredTrials) {
  subscriber.status = 'inactive';
  subscriber.updated_at = new Date().toISOString();
  await sendTrialExpiredEmail(subscriber);
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Semana 1-2: Automação Básica
- [ ] Instalar SDK Mercado Pago
- [ ] Configurar variáveis de ambiente
- [ ] Criar endpoint de pagamento
- [ ] Implementar webhook de aprovação
- [ ] Criar função de ativação automática
- [ ] Adicionar botão no frontend
- [ ] Testar fluxo completo em sandbox
- [ ] Configurar cron de notificações
- [ ] Implementar emails de expiração
- [ ] Testar notificações

### Semana 3: Dashboard de Métricas
- [ ] Criar tabela payments
- [ ] Implementar endpoint de métricas
- [ ] Criar componente MetricsDashboard
- [ ] Adicionar gráficos de receita
- [ ] Implementar histórico de pagamentos
- [ ] Testar métricas

### Semana 4: Trial
- [ ] Adicionar coluna trial_ends_at
- [ ] Modificar webhook para criar trials
- [ ] Atualizar verificação de acesso
- [ ] Implementar notificações de trial
- [ ] Ajustar página Assinar
- [ ] Testar fluxo de trial completo

---

## 📊 MÉTRICAS DE SUCESSO

Após implementação, você deve observar:

✅ **Redução de trabalho manual:**
- De 5-10h/semana para 0h/semana

✅ **Aumento de taxa de renovação:**
- De 50% para 75-90%

✅ **Aumento de conversão:**
- De 3% para 10-15% (com trial)

✅ **Visibilidade financeira:**
- MRR, ARR, Churn em tempo real

✅ **Satisfação do assinante:**
- Ativação instantânea
- Notificações proativas
- Zero fricção

---

## 🔗 PRÓXIMOS PASSOS

Após completar este plano:

1. **Integrar email transacional** (SendGrid, Mailgun)
2. **Adicionar dashboard do assinante** (/minha-assinatura)
3. **Implementar upgrade/downgrade self-service**
4. **Adicionar renovação recorrente automática**
5. **Implementar cupons de desconto**
6. **Criar programa de afiliados**

---

**🚀 Comece HOJE pela integração do Mercado Pago!**

É o maior impacto com menor esforço.
