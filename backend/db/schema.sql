-- Schema do banco de dados DigiMenu
-- Suporta multi-tenancy com isolamento por assinante

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  password VARCHAR(255),
  is_master BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) DEFAULT 'user',
  subscriber_email VARCHAR(255),
  google_id VARCHAR(255),
  google_photo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de assinantes
CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'premium', 'pro', 'admin'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'expired'
  expires_at TIMESTAMP,
  permissions JSONB DEFAULT '{}', -- Permissões customizadas (opcional, sobrescreve padrão do plano)
  whatsapp_auto_enabled BOOLEAN DEFAULT true, -- Comanda automática WhatsApp (pode desativar)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  complement VARCHAR(255),
  neighborhood VARCHAR(255),
  city VARCHAR(255),
  zipcode VARCHAR(50),
  subscriber_email VARCHAR(255), -- Multi-tenancy
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela genérica de entidades (para pratos, categorias, etc.)
-- Usa JSONB para flexibilidade
CREATE TABLE IF NOT EXISTS entities (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL, -- 'Dish', 'Category', 'Store', etc.
  data JSONB NOT NULL,
  subscriber_email VARCHAR(255), -- Multi-tenancy: isolamento por assinante
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_subscriber ON entities(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_entities_type_subscriber ON entities(entity_type, subscriber_email);
CREATE INDEX IF NOT EXISTS idx_customers_subscriber ON customers(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_entities_data_gin ON entities USING GIN (data);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- USERS
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- SUBSCRIBERS
DROP TRIGGER IF EXISTS update_subscribers_updated_at ON subscribers;
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CUSTOMERS
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ENTITIES
DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário admin padrão
INSERT INTO users (email, full_name, is_master, role, password)
VALUES ('admin@digimenu.com', 'Administrador', TRUE, 'admin', 'admin123')
ON CONFLICT (email) DO NOTHING;
