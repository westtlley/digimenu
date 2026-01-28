/**
 * Utilitários para cálculo de distância e taxas de entrega
 */

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do ponto 1
 * @param {number} lon1 - Longitude do ponto 1
 * @param {number} lat2 - Latitude do ponto 2
 * @param {number} lon2 - Longitude do ponto 2
 * @returns {number} Distância em quilômetros
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Converte graus para radianos
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Formata a distância para exibição
 * @param {number} distanceKm - Distância em quilômetros
 * @param {string} unit - 'km' ou 'm'
 * @returns {string} Distância formatada
 */
export function formatDistance(distanceKm, unit = 'km') {
  if (unit === 'm') {
    const distanceM = Math.round(distanceKm * 1000);
    return `${distanceM}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Calcula taxa de entrega baseada em distância
 * @param {number} distanceKm - Distância em quilômetros
 * @param {Object} config - Configuração da taxa
 * @param {number} config.baseFee - Taxa base (R$)
 * @param {number} config.pricePerKm - Preço por km (R$)
 * @param {number} config.minFee - Taxa mínima (R$)
 * @param {number} config.maxFee - Taxa máxima (R$), opcional
 * @param {number} config.freeDeliveryDistance - Distância para entrega grátis (km), opcional
 * @returns {number} Taxa calculada (R$)
 */
export function calculateDeliveryFeeByDistance(distanceKm, config) {
  const {
    baseFee = 0,
    pricePerKm = 0,
    minFee = 0,
    maxFee = null,
    freeDeliveryDistance = null
  } = config;

  // Entrega grátis dentro da distância especificada
  if (freeDeliveryDistance && distanceKm <= freeDeliveryDistance) {
    return 0;
  }

  // Calcular taxa: taxa base + (distância * preço por km)
  let fee = baseFee + (distanceKm * pricePerKm);

  // Aplicar taxa mínima
  if (fee < minFee) {
    fee = minFee;
  }

  // Aplicar taxa máxima (se definida)
  if (maxFee !== null && fee > maxFee) {
    fee = maxFee;
  }

  return Math.round(fee * 100) / 100; // Arredondar para 2 casas decimais
}
