-- Adicionar campo slug para usuários master criarem seu próprio cardápio
ALTER TABLE users
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
