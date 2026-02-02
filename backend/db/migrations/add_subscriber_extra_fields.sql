-- Novos campos para assinantes: phone, cnpj_cpf, notes, origem, tags
ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS cnpj_cpf VARCHAR(30),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS origem VARCHAR(100),
ADD COLUMN IF NOT EXISTS tags TEXT[];

COMMENT ON COLUMN subscribers.phone IS 'Telefone do assinante';
COMMENT ON COLUMN subscribers.cnpj_cpf IS 'CNPJ ou CPF para faturamento';
COMMENT ON COLUMN subscribers.notes IS 'Observações internas';
COMMENT ON COLUMN subscribers.origem IS 'Origem do cadastro: manual, import, landing, etc';
COMMENT ON COLUMN subscribers.tags IS 'Etiquetas para segmentação (ex: beta, parceiro)';
