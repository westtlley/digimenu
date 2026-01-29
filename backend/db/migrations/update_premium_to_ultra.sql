-- Migração: Renomear plano 'premium' para 'ultra'
-- Data: Janeiro 2026
-- Motivo: Padronização dos nomes de planos (Free, Basic, Pro, Ultra)

-- 1. Atualizar todos os assinantes com plano 'premium' para 'ultra'
UPDATE subscribers 
SET plan = 'ultra' 
WHERE plan = 'premium';

-- 2. Verificar resultado
SELECT plan, COUNT(*) as total 
FROM subscribers 
GROUP BY plan 
ORDER BY total DESC;

-- Resultado esperado: 0 assinantes com plano 'premium'
