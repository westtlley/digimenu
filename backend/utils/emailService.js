import { logger } from './logger.js';

/**
 * Serviço de envio de emails
 * 
 * TODO: Integrar com serviço real de email (SendGrid, Mailgun, AWS SES, etc.)
 * Por enquanto, apenas loga no console para desenvolvimento
 */

/**
 * Enviar email de boas-vindas para novo assinante
 */
async function sendWelcomeEmail({ email, name, passwordToken, slug, plan }) {
  const passwordUrl = `${process.env.FRONTEND_URL}/definir-senha?token=${passwordToken}`;
  const menuUrl = `${process.env.FRONTEND_URL}/s/${slug}`;
  const panelUrl = `${process.env.FRONTEND_URL}/painelassinante`;
  
  const emailData = {
    to: email,
    subject: '🎉 Bem-vindo ao DigiMenu!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">🎉 Bem-vindo ao DigiMenu!</h1>
        
        <p>Olá <strong>${name}</strong>!</p>
        
        <p>Sua assinatura DigiMenu foi ativada com sucesso! 🚀</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📋 Informações da sua conta:</h3>
          <p><strong>Plano:</strong> ${plan}</p>
          <p><strong>Email:</strong> ${email}</p>
        </div>
        
        <h3>🔐 Primeiro passo: Defina sua senha</h3>
        <p>
          <a href="${passwordUrl}" 
             style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Definir Senha
          </a>
        </p>
        
        <h3>📱 Acesse seu painel de controle:</h3>
        <p><a href="${panelUrl}" style="color: #f97316;">${panelUrl}</a></p>
        
        <h3>🍽️ Seu cardápio digital:</h3>
        <p><a href="${menuUrl}" style="color: #f97316;">${menuUrl}</a></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 14px;">
          Qualquer dúvida, estamos à disposição!<br>
          <strong>Equipe DigiMenu</strong>
        </p>
      </div>
    `
  };
  
  // TODO: Implementar envio real
  // await sendGridClient.send(emailData);
  // await mailgunClient.send(emailData);
  
  // Por enquanto, apenas log
  logger.log(`
📧 ===============================================
   EMAIL DE BOAS-VINDAS
================================================
Para: ${email}
Assunto: ${emailData.subject}

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
  
  return { success: true };
}

/**
 * Enviar email de renovação de assinatura
 */
async function sendRenewalEmail({ email, name, expires_at, amount }) {
  const emailData = {
    to: email,
    subject: '✅ Assinatura DigiMenu renovada!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">✅ Assinatura renovada!</h1>
        
        <p>Olá <strong>${name}</strong>!</p>
        
        <p>Sua assinatura foi renovada com sucesso! 🎉</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0;"><strong>Válida até:</strong> ${new Date(expires_at).toLocaleDateString('pt-BR')}</p>
          ${amount ? `<p style="margin: 10px 0 0 0;"><strong>Valor:</strong> R$ ${amount.toFixed(2)}</p>` : ''}
        </div>
        
        <p>Continue aproveitando todos os recursos do DigiMenu!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Equipe DigiMenu</strong>
        </p>
      </div>
    `
  };
  
  logger.log(`
📧 ===============================================
   EMAIL DE RENOVAÇÃO
================================================
Para: ${email}
Assunto: ${emailData.subject}

Olá ${name}!

Sua assinatura foi renovada com sucesso! 🎉

Válida até: ${new Date(expires_at).toLocaleDateString('pt-BR')}
${amount ? `Valor: R$ ${amount.toFixed(2)}` : ''}

Continue aproveitando todos os recursos do DigiMenu!

Equipe DigiMenu
================================================
  `);
  
  return { success: true };
}

/**
 * Enviar email de notificação de expiração (7, 3, 1 dia antes)
 */
async function sendExpirationWarningEmail({ email, name, expires_at, daysRemaining, renewUrl }) {
  const urgencyLevel = daysRemaining <= 1 ? 'URGENTE' : daysRemaining <= 3 ? 'ATENÇÃO' : 'AVISO';
  const emoji = daysRemaining <= 1 ? '🚨' : daysRemaining <= 3 ? '⚠️' : '📅';
  
  const emailData = {
    to: email,
    subject: `${emoji} ${urgencyLevel}: Sua assinatura DigiMenu expira em ${daysRemaining} dia(s)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">${emoji} Atenção: Assinatura expirando</h1>
        
        <p>Olá <strong>${name}</strong>!</p>
        
        <p>Sua assinatura DigiMenu expira em <strong>${daysRemaining} dia(s)</strong>.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>📅 Data de expiração:</strong> ${new Date(expires_at).toLocaleDateString('pt-BR')}</p>
        </div>
        
        <p>Para continuar usando todos os recursos do DigiMenu, renove sua assinatura:</p>
        
        <p>
          <a href="${renewUrl}" 
             style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Renovar Agora
          </a>
        </p>
        
        <p style="color: #dc2626; font-weight: bold;">
          ⚠️ Não perca o acesso ao seu cardápio digital e sistema de pedidos!
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Equipe DigiMenu</strong>
        </p>
      </div>
    `
  };
  
  logger.log(`
📧 ===============================================
   EMAIL DE EXPIRAÇÃO (${daysRemaining} dias restantes)
================================================
Para: ${email}
Assunto: ${emailData.subject}

Olá ${name}!

Sua assinatura DigiMenu expira em ${daysRemaining} dia(s).

📅 Data de expiração: ${new Date(expires_at).toLocaleDateString('pt-BR')}

Para continuar usando todos os recursos, renove sua assinatura:
${renewUrl}

⚠️ Não perca o acesso ao seu cardápio digital e sistema de pedidos!

Equipe DigiMenu
================================================
  `);
  
  return { success: true };
}

/**
 * Enviar email de assinatura expirada
 */
async function sendExpiredEmail({ email, name, renewUrl }) {
  const emailData = {
    to: email,
    subject: '🚨 Sua assinatura DigiMenu expirou',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">🚨 Assinatura Expirada</h1>
        
        <p>Olá <strong>${name}</strong>!</p>
        
        <p>Sua assinatura DigiMenu <strong>expirou</strong>.</p>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b;">
            ⚠️ Seus clientes não conseguem mais acessar seu cardápio digital.
          </p>
        </div>
        
        <p>Renove agora para reativar seu acesso:</p>
        
        <p>
          <a href="${renewUrl}" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Renovar Agora
          </a>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Equipe DigiMenu</strong>
        </p>
      </div>
    `
  };
  
  logger.log(`
📧 ===============================================
   EMAIL DE ASSINATURA EXPIRADA
================================================
Para: ${email}
Assunto: ${emailData.subject}

Olá ${name}!

Sua assinatura DigiMenu EXPIROU.

⚠️ Seus clientes não conseguem mais acessar seu cardápio digital.

Renove agora para reativar:
${renewUrl}

Equipe DigiMenu
================================================
  `);
  
  return { success: true };
}

export {
  sendWelcomeEmail,
  sendRenewalEmail,
  sendExpirationWarningEmail,
  sendExpiredEmail
};
