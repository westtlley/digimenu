-- Add-ons de volume (ex.: pedidos/mês) por assinante - Monetização Agressiva 2.0
-- addons.orders = número total de pedidos/mês adicionais (0, 1000, 3000, 5000)

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '{}';

COMMENT ON COLUMN subscribers.addons IS 'Add-ons ativos: { "orders": 0 | 1000 | 3000 | 5000 } (pedidos/mês adicionais ao plano base)';
