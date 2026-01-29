-- Migration: Adicionar campo enable_premium_pizza_visualization à tabela stores
-- Data: 2026-01-29
-- Descrição: Permite que assinantes ativem/desativem o modo premium de visualização de pizza

-- Adicionar coluna se não existir
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS enable_premium_pizza_visualization BOOLEAN DEFAULT true;

-- Comentário na coluna
COMMENT ON COLUMN stores.enable_premium_pizza_visualization IS 
'Habilita animações premium e efeitos especiais na montagem de pizza (ingredientes caindo, fumaça, confete, etc.)';

-- Atualizar registros existentes para true (ativar por padrão)
UPDATE stores 
SET enable_premium_pizza_visualization = true 
WHERE enable_premium_pizza_visualization IS NULL;
