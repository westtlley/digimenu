-- Criar tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  subscriber_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  plan VARCHAR(50),
  interval VARCHAR(50), -- 'monthly', 'yearly'
  status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected', 'refunded'
  payment_method VARCHAR(50), -- 'pix', 'credit_card', 'boleto'
  gateway_payment_id VARCHAR(255),
  gateway_response JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_subscriber ON payments(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments(gateway_payment_id);

-- Comentário
COMMENT ON TABLE payments IS 'Histórico de pagamentos de assinaturas';
