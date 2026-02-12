/**
 * Establishments Utils - Funções auxiliares para módulo de estabelecimentos
 */

/**
 * Valida se um plano é válido
 */
export function isValidPlan(plan) {
  const validPlans = ['free', 'basic', 'pro', 'ultra', 'admin', 'custom'];
  return validPlans.includes(plan?.toLowerCase());
}

/**
 * Normaliza slug do estabelecimento
 */
export function normalizeSlug(slug) {
  if (!slug) return null;
  return String(slug).trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || null;
}

/**
 * Verifica se o usuário pode editar o estabelecimento
 */
export function canEditEstablishment(user, subscriberEmail) {
  if (user?.is_master) return true;
  const userEmail = (user?.subscriber_email || user?.email || '').toLowerCase().trim();
  const subEmail = (subscriberEmail || '').toLowerCase().trim();
  return userEmail === subEmail;
}
