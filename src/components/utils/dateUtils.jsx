/**
 * Utilitário centralizado para formatação de datas e horários
 * no timezone de São Paulo (America/Sao_Paulo)
 */

/**
 * Formata data/hora UTC para São Paulo usando Intl
 */
const formatToSaoPaulo = (utcDate, options) => {
  if (!utcDate) return '';
  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    if (isNaN(date.getTime())) return '';
    
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      ...options
    }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
};

/**
 * Formata uma data UTC no formato brasileiro completo (dd/MM/yyyy às HH:mm)
 */
export const formatBrazilianDateTime = (utcDate) => {
  const formatted = formatToSaoPaulo(utcDate, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatted.replace(',', ' às');
};

/**
 * Formata apenas a data UTC no formato brasileiro (dd/MM/yyyy)
 */
export const formatBrazilianDate = (utcDate) => {
  return formatToSaoPaulo(utcDate, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata apenas a hora UTC no formato brasileiro (HH:mm)
 */
export const formatBrazilianTime = (utcDate) => {
  return formatToSaoPaulo(utcDate, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Formata data UTC para input type="date" (yyyy-MM-dd) no timezone de SP
 */
export const formatInputDate = (utcDate) => {
  if (!utcDate) return '';
  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    if (isNaN(date.getTime())) return '';
    
    const year = new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'America/Sao_Paulo', 
      year: 'numeric' 
    }).format(date);
    
    const month = new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'America/Sao_Paulo', 
      month: '2-digit' 
    }).format(date);
    
    const day = new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'America/Sao_Paulo', 
      day: '2-digit' 
    }).format(date);
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

/**
 * Verifica se uma data UTC já expirou (comparando com hoje em SP)
 */
export const isExpired = (utcExpirationDate) => {
  if (!utcExpirationDate) return false;
  try {
    const expDate = new Date(utcExpirationDate);
    const now = new Date();
    
    const expDateSP = formatBrazilianDate(expDate);
    const nowDateSP = formatBrazilianDate(now);
    
    return expDateSP < nowDateSP;
  } catch (e) {
    return false;
  }
};

/**
 * Formata data de agendamento (string local, não UTC!)
 * Campos scheduled_date e scheduled_time são strings locais do usuário
 * NÃO devem ser convertidos de UTC
 */
export const formatScheduledDateTime = (dateString, timeString) => {
  if (!dateString) return '';
  
  try {
    // dateString vem como "yyyy-MM-dd" (string local)
    const [year, month, day] = dateString.split('-');
    
    if (timeString) {
      return `${day}/${month}/${year} às ${timeString}`;
    }
    
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error('Error formatting scheduled date:', e);
    return '';
  }
};