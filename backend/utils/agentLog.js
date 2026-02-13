/**
 * Agent Log - Telemetria opcional (desativada em test, ativada via ENABLE_AGENT_LOG=1)
 * Evita timeouts em testes ao não fazer fetch externo por padrão.
 */
export function agentLog(payload) {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.ENABLE_AGENT_LOG !== '1') return;
  const url = process.env.AGENT_LOG_URL || 'http://127.0.0.1:7243/ingest';
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}
