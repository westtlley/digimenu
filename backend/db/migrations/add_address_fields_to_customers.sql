-- Migração: Adicionar campos address_number e state na tabela customers
-- Execute este script se a tabela customers já existir sem esses campos

-- Adicionar coluna address_number se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'address_number'
    ) THEN
        ALTER TABLE customers ADD COLUMN address_number VARCHAR(50);
    END IF;
END $$;

-- Adicionar coluna state se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'state'
    ) THEN
        ALTER TABLE customers ADD COLUMN state VARCHAR(50);
    END IF;
END $$;

-- Adicionar colunas birth_date, cpf, password_hash se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'birth_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN birth_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE customers ADD COLUMN cpf VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255);
    END IF;
END $$;
