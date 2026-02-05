import { logger } from './logger.js';
import sgMail from '@sendgrid/mail';

// Configurar SendGrid
let sendGridConfigured = false;
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Para envio na UE (Europa), descomente a linha abaixo:
    // sgMail.setDataResidency('eu');
    
    sendGridConfigured = true;
    logger.log('✅ SendGrid configurado');
  } catch (error) {
    logger.warn('⚠️ Erro ao configurar SendGrid:', error.message);
    sendGridConfigured = false;
  }
} else {
  logger.warn('⚠️ SENDGRID_API_KEY não configurado. Emails não serão enviados.');
}

/**
 * Função genérica para enviar email
 */
async function sendEmail({ to, from, subject, text, html }) {
  // Se não tiver SendGrid configurado, apenas logar
  if (!sendGridConfigured || !process.env.SENDGRID_API_KEY) {
    logger.log(`
📧 ===============================================
   EMAIL (MODO DESENVOLVIMENTO - NÃO ENVIADO)
================================================
Para: ${to}
De: ${from || process.env.EMAIL_FROM || 'noreply@digimenu.com'}
Assunto: ${subject}

${text || html?.replace(/<[^>]*>/g, '') || ''}
================================================
    `);
    return { success: true, messageId: 'dev-mode' };
  }
  
  const msg = {
    to,
    from: from || process.env.EMAIL_FROM || 'noreply@digimenu.com',
    subject,
    text: text || html?.replace(/<[^>]*>/g, '') || '',
    html: html || text
  };
  
  try {
    await sgMail.send(msg);
    logger.log(`✅ Email enviado via SendGrid para: ${to}`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Erro ao enviar email via SendGrid:', error);
    if (error.response) {
      logger.error('Detalhes do erro:', error.response.body);
    }
    throw error;
  }
}

/**
 * Enviar email de recuperação de senha
 */
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Recuperação de Senha</h1>
        </div>
        <div class="content">
          <p>Olá,</p>
          <p>Você solicitou a recuperação de senha para sua conta no DigiMenu.</p>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
          </p>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>Este link expira em 1 hora.</strong></p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
        </div>
        <div class="footer">
          <p>DigiMenu - Sistema de Cardápio Digital</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Recuperação de Senha - DigiMenu',
    html
  });
}

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
  
  // Enviar email via SendGrid
  try {
    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });
  } catch (error) {
    logger.error('Erro ao enviar email de boas-vindas:', error);
    // Continuar mesmo se falhar (não crítico)
  }
  
  // Log adicional para desenvolvimento
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
  
  // Enviar email via SendGrid
  try {
    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });
  } catch (error) {
    logger.error('Erro ao enviar email de renovação:', error);
  }
  
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
  
  // Enviar email via SendGrid
  try {
    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });
  } catch (error) {
    logger.error('Erro ao enviar email de expiração:', error);
  }
  
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
  
  // Enviar email via SendGrid
  try {
    await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });
  } catch (error) {
    logger.error('Erro ao enviar email de assinatura expirada:', error);
  }
  
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
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendRenewalEmail,
  sendExpirationWarningEmail,
  sendExpiredEmail
};
