-- Índices Adicionais para Performance
-- Execute este script após o schema.sql para melhorar performance de queries frequentes

-- Índice composto para buscar pedidos por status e data (muito usado no gestor)
CREATE INDEX IF NOT EXISTS idx_orders_status_date 
ON entities(entity_type, (data->>'status'), created_at DESC) 
WHERE entity_type = 'Order';

-- Índice para buscar pedidos por código
CREATE INDEX IF NOT EXISTS idx_orders_code 
ON entities((data->>'order_code')) 
WHERE entity_type = 'Order';

-- Índice para buscar pedidos por email do cliente
CREATE INDEX IF NOT EXISTS idx_orders_customer_email 
ON entities((data->>'customer_email')) 
WHERE entity_type = 'Order';

-- Índice para buscar pratos por categoria
CREATE INDEX IF NOT EXISTS idx_dishes_category 
ON entities((data->>'category_id')) 
WHERE entity_type = 'Dish';

-- Índice para buscar pratos ativos
CREATE INDEX IF NOT EXISTS idx_dishes_active 
ON entities((data->>'active')) 
WHERE entity_type = 'Dish' AND (data->>'active') = 'true';

-- Índice para buscar entidades por owner_email (multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_entities_owner_email 
ON entities((data->>'owner_email'));

-- Índice para buscar entregadores ativos
CREATE INDEX IF NOT EXISTS idx_entregadores_active 
ON entities((data->>'active'), (data->>'status')) 
WHERE entity_type = 'Entregador';

-- Índice para busca de texto em nomes de pratos (usando GIN para busca full-text)
CREATE INDEX IF NOT EXISTS idx_dishes_name_gin 
ON entities USING GIN (to_tsvector('portuguese', data->>'name')) 
WHERE entity_type = 'Dish';

-- Índice para ordenação por ordem (muito usado)
CREATE INDEX IF NOT EXISTS idx_entities_order 
ON entities((data->>'order')) 
WHERE (data->>'order') IS NOT NULL;

-- Índice para ordenação de subscribers por data de criação
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at 
ON subscribers(created_at DESC);

-- Índice composto para queries de pedidos por assinante e status
CREATE INDEX IF NOT EXISTS idx_orders_subscriber_status 
ON entities(subscriber_email, (data->>'status'), created_at DESC) 
WHERE entity_type = 'Order' AND subscriber_email IS NOT NULL;

-- Estatísticas atualizadas (ajuda o planner do PostgreSQL)
ANALYZE entities;
ANALYZE users;
ANALYZE subscribers;
ANALYZE customers;
