-- Índices funcionais para buscas case-insensitive (LOWER(TRIM(email)))
-- Melhora performance de getLoginUserByEmail, getSubscriberByEmail, etc.

CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON users(LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_subscribers_email_lower 
ON subscribers(LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_customers_email_lower 
ON customers(LOWER(TRIM(email)));

-- Índice composto para listagens por assinante e tipo
CREATE INDEX IF NOT EXISTS idx_entities_subscriber_type_created 
ON entities(subscriber_email, entity_type, created_at DESC);

-- Atualizar estatísticas para o planner
ANALYZE users;
ANALYZE subscribers;
ANALYZE customers;
ANALYZE entities;
