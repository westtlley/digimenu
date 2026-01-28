-- Adicionar colunas para assinaturas recorrentes
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'manual', -- 'card', 'pix', 'boleto', 'manual'
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50), -- 'active', 'paused', 'cancelled'
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT FALSE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscribers_subscription_id ON subscribers(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_auto_renewal ON subscribers(auto_renewal);

-- Comentários
COMMENT ON COLUMN subscribers.subscription_id IS 'ID da assinatura recorrente no Mercado Pago';
COMMENT ON COLUMN subscribers.payment_method IS 'Método de pagamento: card (recorrente), pix, boleto (manual)';
COMMENT ON COLUMN subscribers.subscription_status IS 'Status da assinatura recorrente';
COMMENT ON COLUMN subscribers.auto_renewal IS 'Se true, renovação automática ativa';
