-- Migration: Permitir múltiplos usuários com o mesmo email (diferentes roles)
-- Isso permite que um email seja cliente E colaborador/assinante ao mesmo tempo
-- 
-- IMPORTANTE: Esta migration remove a constraint UNIQUE do email e adiciona uma
-- constraint única composta de (email, role, subscriber_email) para evitar
-- duplicatas desnecessárias, mas permite que o mesmo email tenha diferentes roles

-- 1. Remover a constraint UNIQUE do email (se existir)
DO $$ 
BEGIN
    -- Tentar remover a constraint única do email
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_email_key' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
    END IF;
END $$;

-- 2. Adicionar constraint única composta: (email, role, subscriber_email)
-- Isso permite que o mesmo email tenha diferentes roles, mas evita duplicatas
-- exatamente iguais (mesmo email + mesmo role + mesmo subscriber_email)
DO $$ 
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_email_role_subscriber_unique' 
        AND conrelid = 'users'::regclass
    ) THEN
        -- Criar constraint única composta
        -- NULL values são tratados como diferentes, então NULL subscriber_email
        -- permite múltiplos registros com mesmo email e role
        ALTER TABLE users 
        ADD CONSTRAINT users_email_role_subscriber_unique 
        UNIQUE (email, role, COALESCE(subscriber_email, ''::varchar));
    END IF;
END $$;

-- 3. Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);
CREATE INDEX IF NOT EXISTS idx_users_subscriber_email ON users(subscriber_email) WHERE subscriber_email IS NOT NULL;

COMMENT ON CONSTRAINT users_email_role_subscriber_unique ON users IS 
'Permite que o mesmo email tenha diferentes roles (ex: cliente e colaborador), mas evita duplicatas exatas';
