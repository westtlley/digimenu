-- Script SQL para remover subscribers que conflitam com usuários master
-- Mantém apenas o usuário master e remove o subscriber duplicado

-- 1. Mostrar conflitos
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.is_master,
  s.id as subscriber_id,
  s.email as subscriber_email,
  s.plan,
  s.status
FROM users u
LEFT JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
WHERE u.is_master = TRUE AND s.id IS NOT NULL;

-- 2. Deletar entidades dos subscribers que conflitam com master
DELETE FROM entities
WHERE subscriber_email IN (
  SELECT s.email
  FROM users u
  INNER JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
  WHERE u.is_master = TRUE
);

-- 3. Deletar os subscribers que conflitam com master
DELETE FROM subscribers
WHERE email IN (
  SELECT s.email
  FROM users u
  INNER JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
  WHERE u.is_master = TRUE
);

-- 4. Verificar resultado (não deve retornar nada)
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.is_master,
  s.id as subscriber_id,
  s.email as subscriber_email,
  s.plan,
  s.status
FROM users u
LEFT JOIN subscribers s ON LOWER(TRIM(u.email)) = LOWER(TRIM(s.email))
WHERE u.is_master = TRUE AND s.id IS NOT NULL;
