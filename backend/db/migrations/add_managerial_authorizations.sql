-- Autorização gerencial: matrícula + senha para validar ações sensíveis (assinante e gerente)
-- Apenas o assinante (dono) pode criar/alterar; senha pode ser expirável ou permanente
CREATE TABLE IF NOT EXISTS managerial_authorizations (
  id SERIAL PRIMARY KEY,
  subscriber_email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('assinante', 'gerente')),
  matricula VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subscriber_email, role)
);

CREATE INDEX IF NOT EXISTS idx_managerial_auth_subscriber ON managerial_authorizations(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_managerial_auth_sub_role ON managerial_authorizations(subscriber_email, role);

COMMENT ON TABLE managerial_authorizations IS 'Código de matrícula e senha para validar edição, exclusão, abrir caixa e funções financeiras';
