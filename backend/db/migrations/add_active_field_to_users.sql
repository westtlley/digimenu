-- Migration: Adicionar campo active na tabela users para permitir desativar colaboradores
-- O campo active permite desativar um colaborador sem excluí-lo do sistema

-- Adicionar coluna active se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
        -- Todos os registros existentes ficam ativos por padrão
        UPDATE users SET active = TRUE WHERE active IS NULL;
    END IF;
END $$;

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active) WHERE active = false;

COMMENT ON COLUMN users.active IS 'Indica se o colaborador está ativo (true) ou desativado (false). Colaboradores desativados não podem fazer login.';
