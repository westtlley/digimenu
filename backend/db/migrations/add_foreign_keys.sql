-- =============================================================================
-- Migration: Foreign Keys para Integridade Referencial
-- =============================================================================
--
-- IMPORTANTE: Execute BACKUP do banco antes de rodar esta migration.
--   pg_dump -U postgres -d digimenu > backup_antes_fk_$(date +%Y%m%d).sql
--
-- Esta migration adiciona FKs para garantir integridade entre tabelas.
-- Execute manualmente após validar que não há dados órfãos.
--
-- =============================================================================

-- 1. VERIFICAR DADOS ÓRFÃOS (rodar antes de adicionar FKs)
--    Se retornar linhas, há entities com subscriber_email que não existe em subscribers:
/*
SELECT e.id, e.entity_type, e.subscriber_email, e.created_at
FROM entities e
WHERE e.subscriber_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscribers s
    WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(e.subscriber_email))
  )
ORDER BY e.created_at DESC;
*/

--    Órfãos em customers:
/*
SELECT c.id, c.subscriber_email, c.email, c.name
FROM customers c
WHERE c.subscriber_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscribers s
    WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(c.subscriber_email))
  );
*/

--    Órfãos em users:
/*
SELECT u.id, u.email, u.subscriber_email
FROM users u
WHERE u.subscriber_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscribers s
    WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(u.subscriber_email))
  );
*/

-- 2. NORMALIZAR subscriber_email (execute antes das FKs para alinhar case/trim)
--    entities:
UPDATE entities e
SET subscriber_email = s.email
FROM subscribers s
WHERE e.subscriber_email IS NOT NULL
  AND LOWER(TRIM(e.subscriber_email)) = LOWER(TRIM(s.email))
  AND e.subscriber_email IS DISTINCT FROM s.email;

--    customers:
UPDATE customers c
SET subscriber_email = s.email
FROM subscribers s
WHERE c.subscriber_email IS NOT NULL
  AND LOWER(TRIM(c.subscriber_email)) = LOWER(TRIM(s.email))
  AND c.subscriber_email IS DISTINCT FROM s.email;

--    users:
UPDATE users u
SET subscriber_email = s.email
FROM subscribers s
WHERE u.subscriber_email IS NOT NULL
  AND LOWER(TRIM(u.subscriber_email)) = LOWER(TRIM(s.email))
  AND u.subscriber_email IS DISTINCT FROM s.email;

-- 4. ADICIONAR FOREIGN KEYS (execute só após backup, checagem de órfãos e normalização)
--    Se houver órfãos, corrija antes (ex.: SET subscriber_email = NULL para órfãos irreconciliáveis).
--
-- entities.subscriber_email -> subscribers.email
-- ALTER TABLE entities ADD CONSTRAINT fk_entities_subscriber
--   FOREIGN KEY (subscriber_email) REFERENCES subscribers(email)
--   ON DELETE SET NULL ON UPDATE CASCADE;
--
-- customers.subscriber_email -> subscribers.email
-- ALTER TABLE customers ADD CONSTRAINT fk_customers_subscriber
--   FOREIGN KEY (subscriber_email) REFERENCES subscribers(email)
--   ON DELETE SET NULL ON UPDATE CASCADE;
--
-- users.subscriber_email -> subscribers.email
-- ALTER TABLE users ADD CONSTRAINT fk_users_subscriber
--   FOREIGN KEY (subscriber_email) REFERENCES subscribers(email)
--   ON DELETE SET NULL ON UPDATE CASCADE;
