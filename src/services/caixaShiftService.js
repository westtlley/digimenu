import { apiClient } from '@/api/apiClient';

function withTenantPayload(payload = {}, opts = {}) {
  const result = {
    ...(payload && typeof payload === 'object' ? payload : {}),
  };

  if (opts?.as_subscriber_id != null) {
    result.as_subscriber_id = opts.as_subscriber_id;
  }
  if (opts?.as_subscriber) {
    result.as_subscriber = opts.as_subscriber;
  }

  return result;
}

export function openCaixaShift(payload = {}, opts = {}) {
  return apiClient.post('/caixa/open', withTenantPayload(payload, opts));
}

export function createCaixaShiftMovement(payload = {}, opts = {}) {
  return apiClient.post('/caixa/movement', withTenantPayload(payload, opts));
}

export function closeCaixaShift(caixaId, payload = {}, opts = {}) {
  return apiClient.post(`/caixa/${caixaId}/close`, withTenantPayload(payload, opts));
}
