const mercadopago = require('mercadopago');
const logger = require('../utils/logger');

// Configurar Mercado Pago com Access Token
function configureMercadoPago() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    logger.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN não configurado. Pagamentos automáticos desabilitados.');
    logger.warn('📝 Configure no arquivo .env para habilitar pagamentos automáticos.');
    return null;
  }
  
  try {
    mercadopago.configure({
      access_token: accessToken
    });
    
    logger.log('✅ Mercado Pago configurado com sucesso');
    return mercadopago;
  } catch (error) {
    logger.error('❌ Erro ao configurar Mercado Pago:', error);
    return null;
  }
}

const mp = configureMercadoPago();

module.exports = mp;
