-- Tabela para armazenar tokens (fallback quando Redis não disponível)
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_tokens_key ON tokens(key);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);

-- Limpar tokens expirados automaticamente (via job ou trigger)
-- CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at) WHERE expires_at IS NOT NULL;
