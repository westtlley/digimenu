-- Migração: Sistema de Mesas e Gestão de Estoque Inteligente

-- Tabela de Mesas (usando entities com entity_type 'Table')
-- As mesas serão armazenadas como entities, mas adicionamos índices específicos

-- Índice para mesas por status
CREATE INDEX IF NOT EXISTS idx_entities_table_status
ON entities ((data->>'status'))
WHERE entity_type = 'Table';

-- Índice para mesas por número
CREATE INDEX IF NOT EXISTS idx_entities_table_number
ON entities ((data->>'table_number'))
WHERE entity_type = 'Table';

-- Tabela de Ingredientes (usando entities com entity_type 'Ingredient')
-- Índice para ingredientes por nome
CREATE INDEX IF NOT EXISTS idx_entities_ingredient_name
ON entities ((data->>'name'))
WHERE entity_type = 'Ingredient';

-- Tabela de Relação Prato-Ingrediente (usando entities com entity_type 'DishIngredient')
-- Armazena quais ingredientes e quantidades são usados em cada prato
CREATE INDEX IF NOT EXISTS idx_entities_dish_ingredient_dish
ON entities ((data->>'dish_id'))
WHERE entity_type = 'DishIngredient';

CREATE INDEX IF NOT EXISTS idx_entities_dish_ingredient_ingredient
ON entities ((data->>'ingredient_id'))
WHERE entity_type = 'DishIngredient';

-- Tabela de Movimentações de Estoque (usando entities com entity_type 'StockMovement')
-- Registra entradas, saídas e ajustes de estoque
CREATE INDEX IF NOT EXISTS idx_entities_stock_movement_ingredient
ON entities ((data->>'ingredient_id'))
WHERE entity_type = 'StockMovement';

CREATE INDEX IF NOT EXISTS idx_entities_stock_movement_date
ON entities (created_at)
WHERE entity_type = 'StockMovement';

-- Tabela de Chamadas de Garçom (usando entities com entity_type 'WaiterCall')
-- Registra quando um cliente chama o garçom pela mesa
CREATE INDEX IF NOT EXISTS idx_entities_waiter_call_table
ON entities ((data->>'table_id'))
WHERE entity_type = 'WaiterCall';

CREATE INDEX IF NOT EXISTS idx_entities_waiter_call_status
ON entities ((data->>'status'))
WHERE entity_type = 'WaiterCall';
