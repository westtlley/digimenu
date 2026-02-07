/**
 * Constantes compartilhadas entre apps
 */

// Coordenadas padrão (Brasília)
export const DEFAULT_COORDINATES = {
  lat: -15.7942,
  lng: -47.8822
};

// Status de pedidos
export const ORDER_STATUS = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  GOING_TO_STORE: 'going_to_store',
  ARRIVED_AT_STORE: 'arrived_at_store',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  ARRIVED_AT_CUSTOMER: 'arrived_at_customer',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Status de entregador
export const DELIVERY_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  PAUSED: 'paused',
  OFFLINE: 'offline'
};

// Status de comanda
export const COMANDA_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
};

// Métodos de pagamento
export const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
];

// Ícones de veículos
export const VEHICLE_ICONS = {
  bike: '🚴',
  motorcycle: '🏍️',
  car: '🚗'
};

// Intervalos de refetch (ms)
export const REFETCH_INTERVALS = {
  ORDERS: 5000,
  COMANDAS: 5000,
  LOCATION: 10000
};

// Debounce delays (ms)
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500
};
