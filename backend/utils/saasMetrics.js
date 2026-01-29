/**
 * 📊 SaaS Metrics Calculator - DigiMenu
 * 
 * Calcula métricas essenciais para gestão do SaaS:
 * - MRR (Monthly Recurring Revenue)
 * - ARR (Annual Recurring Revenue)
 * - Churn Rate
 * - LTV (Lifetime Value)
 * - Trial Conversion Rate
 * - CAC (Customer Acquisition Cost) - placeholder
 */

import { PLAN_PRICES } from './plans.js';

/**
 * Calcula MRR (Monthly Recurring Revenue)
 * Soma de todas as receitas mensais de assinantes ativos
 */
export function calculateMRR(subscribers) {
  if (!Array.isArray(subscribers)) return 0;
  
  return subscribers
    .filter(sub => sub.status === 'active' && sub.plan !== 'free' && sub.plan !== 'admin')
    .reduce((total, sub) => {
      const planPrice = PLAN_PRICES[sub.plan];
      if (!planPrice) return total;
      
      // Se for anual, converter para mensal
      const monthlyRevenue = sub.interval === 'yearly' 
        ? planPrice.yearly / 12 
        : planPrice.monthly;
      
      return total + monthlyRevenue;
    }, 0);
}

/**
 * Calcula ARR (Annual Recurring Revenue)
 */
export function calculateARR(subscribers) {
  return calculateMRR(subscribers) * 12;
}

/**
 * Calcula Churn Rate (Taxa de Cancelamento)
 * % de assinantes que cancelaram no período
 * 
 * @param {Array} currentSubscribers - Assinantes atuais
 * @param {Array} previousSubscribers - Assinantes do período anterior
 * @param {String} period - 'monthly' ou 'weekly'
 */
export function calculateChurnRate(currentSubscribers, previousSubscribers, period = 'monthly') {
  if (!Array.isArray(currentSubscribers) || !Array.isArray(previousSubscribers)) return 0;
  
  const previousActive = previousSubscribers.filter(s => s.status === 'active').length;
  if (previousActive === 0) return 0;
  
  const currentActive = currentSubscribers.filter(s => s.status === 'active').length;
  const churn = previousActive - currentActive;
  
  return (churn / previousActive) * 100;
}

/**
 * Calcula LTV (Lifetime Value)
 * Valor médio que um cliente traz durante toda sua vida como assinante
 * 
 * LTV = Ticket Médio / Churn Rate Mensal
 */
export function calculateLTV(subscribers, churnRate) {
  if (churnRate === 0) return 0;
  
  const mrr = calculateMRR(subscribers);
  const activeCount = subscribers.filter(s => s.status === 'active' && s.plan !== 'free' && s.plan !== 'admin').length;
  
  if (activeCount === 0) return 0;
  
  const avgTicket = mrr / activeCount;
  const monthlyChurn = churnRate / 100;
  
  // Prevenir divisão por zero
  if (monthlyChurn === 0) return avgTicket * 36; // Assumir 3 anos se não houver churn
  
  return avgTicket / monthlyChurn;
}

/**
 * Calcula Trial Conversion Rate
 * % de trials que se tornaram assinantes pagantes
 */
export function calculateTrialConversionRate(subscribers) {
  if (!Array.isArray(subscribers)) return 0;
  
  const now = new Date();
  
  // Assinantes que já passaram do trial
  const pastTrial = subscribers.filter(sub => {
    if (!sub.trial_ends_at) return false;
    return new Date(sub.trial_ends_at) < now;
  });
  
  if (pastTrial.length === 0) return 0;
  
  // Quantos viraram pagantes (ativos após o trial)
  const converted = pastTrial.filter(sub => sub.status === 'active').length;
  
  return (converted / pastTrial.length) * 100;
}

/**
 * Conta assinantes ativos atualmente em trial
 */
export function getActiveTrials(subscribers) {
  if (!Array.isArray(subscribers)) return [];
  
  const now = new Date();
  
  return subscribers.filter(sub => {
    if (!sub.trial_ends_at || sub.status !== 'active') return false;
    return new Date(sub.trial_ends_at) > now;
  });
}

/**
 * Conta assinantes que estão prestes a expirar (próximos 7 dias)
 */
export function getExpiringSubscribers(subscribers) {
  if (!Array.isArray(subscribers)) return [];
  
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return subscribers.filter(sub => {
    if (!sub.expires_at || sub.status !== 'active') return false;
    const expiresAt = new Date(sub.expires_at);
    return expiresAt > now && expiresAt <= sevenDaysFromNow;
  });
}

/**
 * Conta assinantes inativos por mais de 30 dias
 */
export function getInactiveSubscribers(subscribers) {
  if (!Array.isArray(subscribers)) return [];
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return subscribers.filter(sub => {
    if (sub.status !== 'inactive') return false;
    if (!sub.updated_at) return false;
    return new Date(sub.updated_at) < thirtyDaysAgo;
  });
}

/**
 * Distribuição de assinantes por plano
 */
export function getSubscribersByPlan(subscribers) {
  if (!Array.isArray(subscribers)) return {};
  
  const distribution = {
    free: 0,
    basic: 0,
    pro: 0,
    ultra: 0,
    admin: 0,
    custom: 0
  };
  
  subscribers
    .filter(sub => sub.status === 'active')
    .forEach(sub => {
      const plan = sub.plan || 'basic';
      if (distribution[plan] !== undefined) {
        distribution[plan]++;
      } else {
        distribution.custom++;
      }
    });
  
  return distribution;
}

/**
 * Calcula crescimento mês a mês (MRR, Assinantes)
 * 
 * @param {Array} historicalData - Array com { month: 'Jan 2026', mrr: 1000, subscribers: 20 }
 * @returns {Object} { growth: 15.5, trend: 'up' }
 */
export function calculateGrowth(historicalData) {
  if (!Array.isArray(historicalData) || historicalData.length < 2) {
    return { growth: 0, trend: 'stable' };
  }
  
  const latest = historicalData[historicalData.length - 1];
  const previous = historicalData[historicalData.length - 2];
  
  if (!previous.mrr || previous.mrr === 0) return { growth: 0, trend: 'stable' };
  
  const growth = ((latest.mrr - previous.mrr) / previous.mrr) * 100;
  
  return {
    growth: Math.round(growth * 10) / 10, // 1 casa decimal
    trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'stable'
  };
}

/**
 * CAC (Customer Acquisition Cost)
 * Placeholder - precisa de dados de marketing/vendas
 * 
 * CAC = Total Investido em Marketing / Novos Clientes Adquiridos
 */
export function calculateCAC(marketingSpend, newCustomers) {
  if (!newCustomers || newCustomers === 0) return 0;
  return marketingSpend / newCustomers;
}

/**
 * Calcula todas as métricas de uma vez
 * Para uso no dashboard
 */
export function calculateAllMetrics(subscribers, historicalData = [], marketingSpend = 0) {
  const mrr = calculateMRR(subscribers);
  const arr = calculateARR(subscribers);
  
  // Para churn, precisamos de dados históricos
  // Temporariamente, vamos calcular baseado em assumir estabilidade
  const churnRate = 0; // TODO: Implementar com dados históricos reais
  
  const ltv = calculateLTV(subscribers, churnRate || 5); // Assumir 5% se não tiver dados
  const trialConversion = calculateTrialConversionRate(subscribers);
  const activeTrials = getActiveTrials(subscribers);
  const expiringSubscribers = getExpiringSubscribers(subscribers);
  const inactiveSubscribers = getInactiveSubscribers(subscribers);
  const planDistribution = getSubscribersByPlan(subscribers);
  const growth = calculateGrowth(historicalData);
  
  // Novos clientes no último mês
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const newCustomersThisMonth = subscribers.filter(sub => {
    if (!sub.created_at) return false;
    return new Date(sub.created_at) >= oneMonthAgo;
  }).length;
  
  const cac = calculateCAC(marketingSpend, newCustomersThisMonth);
  
  // Total de assinantes
  const totalSubscribers = subscribers.length;
  const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
  const payingSubscribers = subscribers.filter(s => 
    s.status === 'active' && s.plan !== 'free' && s.plan !== 'admin'
  ).length;
  
  return {
    // Receita
    mrr,
    arr,
    
    // Retenção
    churnRate,
    ltv,
    
    // Conversão
    trialConversion,
    activeTrialsCount: activeTrials.length,
    activeTrials,
    
    // Alertas
    expiringCount: expiringSubscribers.length,
    expiringSubscribers,
    inactiveCount: inactiveSubscribers.length,
    inactiveSubscribers,
    
    // Distribuição
    planDistribution,
    
    // Crescimento
    growth,
    
    // Aquisição
    cac,
    newCustomersThisMonth,
    
    // Totais
    totalSubscribers,
    activeSubscribers,
    payingSubscribers,
    
    // Data de cálculo
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Formata valor monetário para BRL
 */
export function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata percentual
 */
export function formatPercentage(value, decimals = 1) {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export default {
  calculateMRR,
  calculateARR,
  calculateChurnRate,
  calculateLTV,
  calculateTrialConversionRate,
  getActiveTrials,
  getExpiringSubscribers,
  getInactiveSubscribers,
  getSubscribersByPlan,
  calculateGrowth,
  calculateCAC,
  calculateAllMetrics,
  formatCurrency,
  formatPercentage
};
