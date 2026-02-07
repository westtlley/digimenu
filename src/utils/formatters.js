/**
 * Funções de formatação compartilhadas
 */

/**
 * Formata valor monetário em BRL
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(0);
  }
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

/**
 * Formata data e hora
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
    ...options
  };
  
  try {
    return new Date(date).toLocaleString('pt-BR', defaultOptions);
  } catch (e) {
    return '';
  }
};

/**
 * Formata apenas data
 */
export const formatDateOnly = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch (e) {
    return '';
  }
};

/**
 * Formata apenas hora
 */
export const formatTime = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (e) {
    return '';
  }
};

/**
 * Formata tempo relativo (ex: "há 5 minutos")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  try {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays} dias`;
    
    return formatDate(date);
  } catch (e) {
    return '';
  }
};

/**
 * Formata tempo de duração (ex: "1h 30min")
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0min';
  
  if (minutes < 60) return `${minutes}min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

/**
 * Formata telefone brasileiro
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};
