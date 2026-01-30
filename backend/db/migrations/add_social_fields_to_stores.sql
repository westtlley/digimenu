-- Migration: Adicionar campos de redes sociais à tabela stores
-- Data: 2026-01-30
-- Descrição: Adiciona campos para WhatsApp, Instagram, Facebook e TikTok

-- Adicionar colunas se não existirem
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
ADD COLUMN IF NOT EXISTS facebook VARCHAR(255),
ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255);

-- Comentários nas colunas
COMMENT ON COLUMN stores.instagram IS 'Handle do Instagram (ex: @temperodaneta)';
COMMENT ON COLUMN stores.facebook IS 'URL do Facebook ou handle (ex: facebook.com/temperodaneta)';
COMMENT ON COLUMN stores.tiktok IS 'Handle do TikTok (ex: @temperodaneta)';

-- O campo whatsapp já existe, não precisa adicionar
