-- Tabela para analytics e eventos
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  properties JSONB,
  user_id VARCHAR(100),
  subscriber_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_subscriber ON analytics_events(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_analytics_name_date ON analytics_events(event_name, created_at DESC);
