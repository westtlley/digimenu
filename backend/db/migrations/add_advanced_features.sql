-- Migração: Funcionalidades Avançadas (Chatbot, Afiliados, LGPD, 2FA)

-- Índices para Afiliados
CREATE INDEX IF NOT EXISTS idx_entities_affiliate_code
ON entities ((data->>'affiliate_code'))
WHERE entity_type = 'Affiliate';

CREATE INDEX IF NOT EXISTS idx_entities_affiliate_status
ON entities ((data->>'status'))
WHERE entity_type = 'Affiliate';

-- Índices para Indicações
CREATE INDEX IF NOT EXISTS idx_entities_referral_affiliate
ON entities ((data->>'affiliate_id'))
WHERE entity_type = 'Referral';

CREATE INDEX IF NOT EXISTS idx_entities_referral_order
ON entities ((data->>'order_id'))
WHERE entity_type = 'Referral';

CREATE INDEX IF NOT EXISTS idx_entities_referral_status
ON entities ((data->>'status'))
WHERE entity_type = 'Referral';

-- Índices para 2FA
CREATE INDEX IF NOT EXISTS idx_entities_user2fa_email
ON entities ((data->>'user_email'))
WHERE entity_type = 'User2FA';

CREATE INDEX IF NOT EXISTS idx_entities_user2fa_enabled
ON entities ((data->>'enabled'))
WHERE entity_type = 'User2FA';

-- Índices para LGPD
CREATE INDEX IF NOT EXISTS idx_entities_lgpd_request_email
ON entities ((data->>'customer_email'))
WHERE entity_type = 'LGPDRequest';

CREATE INDEX IF NOT EXISTS idx_entities_lgpd_request_status
ON entities ((data->>'status'))
WHERE entity_type = 'LGPDRequest';

CREATE INDEX IF NOT EXISTS idx_entities_customer_lgpd_deleted
ON entities ((data->>'lgpd_deleted'))
WHERE entity_type = 'Customer';

CREATE INDEX IF NOT EXISTS idx_entities_customer_lgpd_exported
ON entities ((data->>'lgpd_exported'))
WHERE entity_type = 'Customer';
