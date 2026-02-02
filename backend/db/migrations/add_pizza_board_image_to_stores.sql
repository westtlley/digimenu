-- Adicionar campo para imagem da tábua de pizza na tabela stores
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS pizza_board_image TEXT;
