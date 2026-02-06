/**
 * Modelo de Contexto de Usuário
 * Separa claramente Master vs Subscriber vs Público
 * 
 * ✅ REGRA DE OURO: Frontend recebe contexto pronto, não decide permissões
 */

/**
 * @typedef {Object} MenuContext
 * @property {'slug'|'subscriber'} type - Tipo de contexto
 * @property {string} value - Valor do contexto (slug ou subscriber_email)
 */

/**
 * @typedef {Object} UserContext
 * @property {Object} user - Dados do usuário
 * @property {MenuContext} menuContext - Contexto do menu (slug ou subscriber)
 * @property {Object} permissions - Permissões do usuário
 * @property {boolean} isMaster - Se é master
 * @property {Object|null} subscriberData - Dados do assinante (null se master)
 */

/**
 * Cria contexto de menu baseado no tipo de usuário
 * 
 * @param {Object} user - Usuário atual
 * @param {Object|null} subscriberData - Dados do assinante
 * @returns {MenuContext}
 */
export function createMenuContext(user, subscriberData) {
  // Master usa slug (se disponível) ou null (próprios dados)
  if (user?.is_master === true) {
    return {
      type: 'slug',
      value: user?.slug || null, // Master pode ter slug próprio
    };
  }

  // Subscriber usa subscriber_email
  if (subscriberData?.email) {
    return {
      type: 'subscriber',
      value: subscriberData.email,
    };
  }

  // Fallback: usar email do usuário
  return {
    type: 'subscriber',
    value: user?.email || null,
  };
}

/**
 * Cria contexto completo do usuário
 * 
 * @param {Object} user - Usuário atual
 * @param {Object|null} subscriberData - Dados do assinante
 * @param {Object} permissions - Permissões
 * @returns {UserContext}
 */
export function createUserContext(user, subscriberData, permissions = {}) {
  const isMaster = user?.is_master === true;
  const menuContext = createMenuContext(user, subscriberData);

  return {
    user,
    menuContext,
    permissions,
    isMaster,
    subscriberData: isMaster ? null : subscriberData, // Master não tem subscriberData
  };
}

/**
 * Verifica se o contexto é válido
 * 
 * @param {UserContext} context - Contexto a verificar
 * @returns {boolean}
 */
export function isValidContext(context) {
  if (!context) return false;
  if (!context.user) return false;
  if (!context.menuContext) return false;
  
  // Master pode ter menuContext.value null (próprios dados)
  if (context.isMaster) return true;
  
  // Subscriber precisa ter value
  return !!context.menuContext.value;
}
