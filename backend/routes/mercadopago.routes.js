import express from 'express';
import crypto from 'crypto';
import { addMonths, addDays } from 'date-fns';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Importar Mercado Pago (se configurado)
let mercadopago = null;
try {
  const mpModule = await import('mercadopago');
  mercadopago = mpModule.default;
  
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    mercadopago.configure({
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
    });
    logger.log('✅ Mercado Pago configurado');
  } else {
    logger.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN não configurado');
  }
} catch (error) {
  logger.warn('⚠️ Mercado Pago não disponível (módulo não instalado)');
}

/**
 * Criar preferência de pagamento no Mercado Pago
 * POST /api/mercadopago/create-payment
 */
router.post('/create-payment', async (req, res) => {
  try {
    if (!mercadopago || !process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(503).json({
        success: false,
        error: 'Mercado Pago não configurado. Configure MERCADOPAGO_ACCESS_TOKEN no .env'
      });
    }
    
    const { email, name, plan, interval } = req.body;
    
    // Validar dados
    if (!email || !name || !plan || !interval) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos: email, name, plan e interval são obrigatórios'
      });
    }
    
    // Definir preços (você pode buscar do PaymentConfig depois)
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
    
    const amount = prices[interval]?.[plan];
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Plano ou intervalo inválido'
      });
    }
    
    // Criar preferência
    const preference = {
      items: [{
        title: `DigiMenu - Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${interval === 'monthly' ? 'Mensal' : 'Anual'})`,
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
    
    logger.log('🔄 Criando preferência de pagamento...', {
      email,
      plan,
      interval,
      amount
    });
    
    const response = await mercadopago.preferences.create(preference);
    
    logger.log('✅ Preferência criada:', {
      id: response.body.id,
      init_point: response.body.init_point
    });
    
    res.json({
      success: true,
      init_point: response.body.init_point, // URL de pagamento
      preference_id: response.body.id
    });
    
  } catch (error) {
    logger.error('❌ Erro ao criar pagamento Mercado Pago:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar pagamento',
      details: error.message
    });
  }
});

/**
 * Webhook do Mercado Pago
 * POST /api/mercadopago/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    logger.log('🔔 Webhook recebido do Mercado Pago:', req.body);
    
    // Responder imediatamente (requisito do Mercado Pago)
    res.status(200).send('OK');
    
    // Processar notificação de forma assíncrona
    const { type, data } = req.body;
    
    if (type === 'payment') {
      // Processar pagamento
      setTimeout(async () => {
        try {
          await processPayment(data.id);
        } catch (error) {
          logger.error('❌ Erro ao processar pagamento:', error);
        }
      }, 100);
    }
    
  } catch (error) {
    logger.error('❌ Erro no webhook:', error);
    // Mesmo com erro, responder 200 para o Mercado Pago não reenviar
    res.status(200).send('OK');
  }
});

/**
 * Processar pagamento aprovado
 */
async function processPayment(paymentId) {
  try {
    if (!mercadopago) {
      logger.error('❌ Mercado Pago não disponível');
      return;
    }
    
    // Buscar detalhes do pagamento
    const payment = await mercadopago.payment.get(paymentId);
    const paymentData = payment.body;
    
    logger.log('💳 Processando pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      email: paymentData.metadata?.subscriber_email
    });
    
    // Apenas processar pagamentos aprovados
    if (paymentData.status !== 'approved') {
      logger.log('⏳ Pagamento não aprovado ainda, status:', paymentData.status);
      return;
    }
    
    const { subscriber_email, plan, interval } = paymentData.metadata || {};
    
    if (!subscriber_email || !plan || !interval) {
      logger.error('❌ Metadata incompleta no pagamento');
      return;
    }
    
    // Importar funções do repository dinâmicamente
    const repoModule = await import('../db/repository.js');
    
    // Verificar se assinante já existe
    let subscriber = await repoModule.getSubscriberByEmail(subscriber_email);
    
    if (!subscriber) {
      // Criar novo assinante
      logger.log('📝 Criando novo assinante:', subscriber_email);
      
      const expiresAt = interval === 'monthly' 
        ? addMonths(new Date(), 1)
        : addMonths(new Date(), 12);
      
      // Gerar slug único
      const slug = generateSlug(subscriber_email);
      
      // Importar getPlanPermissions
      const plansModule = await import('../utils/plans.js');
      
      subscriber = await repoModule.createSubscriber({
        email: subscriber_email,
        name: paymentData.payer?.first_name || subscriber_email.split('@')[0],
        plan: plan,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        permissions: plansModule.getPlanPermissions(plan),
        whatsapp_auto_enabled: true
      });
      
      // Criar usuário se não existir
      let user = await repoModule.getUserByEmail(subscriber_email);
      
      if (!user) {
        user = await repoModule.createUser({
          email: subscriber_email,
          full_name: paymentData.payer?.first_name || subscriber_email.split('@')[0],
          password: null, // Será definida depois
          is_master: false,
          role: 'subscriber',
          subscriber_email: subscriber_email
        });
      }
      
      // Criar Store padrão
      await repoModule.createEntity('Store', {
        name: `Restaurante ${paymentData.payer?.first_name || 'Novo'}`,
        slug: slug,
        description: 'Bem-vindo ao nosso restaurante!',
        phone: paymentData.payer?.phone?.number || '',
        address: '',
        logo: '',
        banner: '',
        primary_color: '#f97316',
        is_open: true,
        opening_hours: {},
        subscriber_email: subscriber_email
      }, subscriber_email);
      
      // Gerar token de senha
      const passwordToken = generatePasswordToken(subscriber_email);
      
      // Enviar email de boas-vindas
      await sendWelcomeEmail({
        email: subscriber_email,
        name: paymentData.payer?.first_name || subscriber_email.split('@')[0],
        passwordToken: passwordToken,
        slug: slug,
        plan: plan
      });
      
      logger.log('✅ Assinante criado e ativado automaticamente:', subscriber_email);
      
    } else {
      // Renovar assinante existente
      logger.log('🔄 Renovando assinatura existente:', subscriber_email);
      
      const expiresAt = interval === 'monthly' 
        ? addMonths(new Date(), 1)
        : addMonths(new Date(), 12);
      
      await repoModule.updateSubscriber(subscriber.id, {
        status: 'active',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Enviar email de renovação
      await sendRenewalEmail({
        email: subscriber_email,
        name: subscriber.name,
        expires_at: expiresAt.toISOString(),
        amount: paymentData.transaction_amount
      });
      
      logger.log('✅ Assinatura renovada automaticamente:', subscriber_email);
    }
    
    // Salvar pagamento no histórico
    await repoModule.savePayment({
      subscriber_email: subscriber_email,
      amount: paymentData.transaction_amount,
      plan: plan,
      interval: interval,
      status: 'approved',
      payment_method: paymentData.payment_type_id,
      gateway_payment_id: paymentData.id.toString(),
      gateway_response: paymentData,
      paid_at: paymentData.date_approved
    });
    
    logger.log('✅ Pagamento salvo no histórico');
    
  } catch (error) {
    logger.error('❌ Erro ao processar pagamento:', error);
  }
}

/**
 * Gerar slug único para loja
 */
function generateSlug(email) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return `${base}-${random}`;
}

/**
 * Gerar token de senha temporário
 */
function generatePasswordToken(email) {
  const token = `pwd_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const expiresAt = addDays(new Date(), 7); // Expira em 7 dias
  
  // TODO: Salvar token no banco de dados
  // Por enquanto, apenas retornar (você precisará adicionar tabela de tokens)
  
  logger.log(`🔐 Token de senha gerado para ${email}: ${token}`);
  logger.log(`   Expira em: ${expiresAt.toISOString()}`);
  
  return token;
}

/**
 * Enviar email de boas-vindas (mock - você implementará depois)
 */
async function sendWelcomeEmail({ email, name, passwordToken, slug, plan }) {
  const passwordUrl = `${process.env.FRONTEND_URL}/definir-senha?token=${passwordToken}`;
  const menuUrl = `${process.env.FRONTEND_URL}/s/${slug}`;
  const panelUrl = `${process.env.FRONTEND_URL}/painelassinante`;
  
  logger.log(`
📧 ===============================================
   EMAIL DE BOAS-VINDAS
================================================
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
================================================
  `);
}

/**
 * Enviar email de renovação (mock)
 */
async function sendRenewalEmail({ email, name, expires_at, amount }) {
  logger.log(`
📧 ===============================================
   EMAIL DE RENOVAÇÃO
================================================
Para: ${email}
Assunto: ✅ Assinatura DigiMenu renovada!

Olá ${name}!

Sua assinatura foi renovada com sucesso! 🎉

Válida até: ${new Date(expires_at).toLocaleDateString('pt-BR')}
Valor: R$ ${amount.toFixed(2)}

Continue aproveitando todos os recursos do DigiMenu!

Equipe DigiMenu
================================================
  `);
}

export default router;
