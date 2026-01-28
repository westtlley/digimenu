/**
 * Script de uso único: definir um novo Admin Master.
 * Lê email e senha de MASTER_EMAIL e MASTER_PASSWORD (nunca grava senha em arquivo).
 *
 * Uso (a partir da pasta backend/):
 *   set MASTER_EMAIL=seu@email.com
 *   set MASTER_PASSWORD=sua_senha
 *   node -r dotenv/config scripts/setup-master.js
 *
 * Ou em uma linha (PowerShell):
 *   $env:MASTER_EMAIL="seu@email.com"; $env:MASTER_PASSWORD="sua_senha"; node -r dotenv/config scripts/setup-master.js
 *
 * Linux/macOS:
 *   MASTER_EMAIL=seu@email.com MASTER_PASSWORD=sua_senha node -r dotenv/config scripts/setup-master.js
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const email = (process.env.MASTER_EMAIL || '').trim().toLowerCase();
const password = process.env.MASTER_PASSWORD;

if (!email || !password) {
  console.error('Uso: defina MASTER_EMAIL e MASTER_PASSWORD no ambiente.');
  console.error('Exemplo (PowerShell): $env:MASTER_EMAIL="a@b.com"; $env:MASTER_PASSWORD="senha"; node -r dotenv/config scripts/setup-master.js');
  process.exit(1);
}

(async () => {
  const hashed = await bcrypt.hash(password, 10);

  // Só gerar hash (para rodar SQL manualmente): MASTER_ONLY_HASH=1
  if (process.env.MASTER_ONLY_HASH === '1') {
    console.log('Hash bcrypt:', hashed);
    console.log('\n--- SQL (PostgreSQL) ---');
    console.log(`-- 1) Remover master dos demais: UPDATE users SET is_master = FALSE;`);
    console.log(`-- 2a) Se o usuário JÁ existe: UPDATE users SET is_master = TRUE, password = '${hashed}', full_name = COALESCE(NULLIF(TRIM(full_name),''),'Admin Master') WHERE email = '${email}';`);
    console.log(`-- 2b) Se NÃO existe: INSERT INTO users (email, full_name, password, is_master, role) VALUES ('${email}', 'Admin Master', '${hashed}', TRUE, 'admin');`);
    return;
  }

  if (process.env.DATABASE_URL) {
    const { query } = await import('../db/postgres.js');
    const repo = await import('../db/repository.js');

    try {
      await query('UPDATE users SET is_master = FALSE');
      const existing = await repo.getUserByEmail(email);
      if (existing) {
        await query(
          'UPDATE users SET is_master = TRUE, password = $1, full_name = COALESCE(NULLIF(TRIM(full_name),\'\'), $2) WHERE email = $3',
          [hashed, 'Admin Master', email]
        );
        console.log('OK: usuário', email, 'atualizado como Admin Master.');
      } else {
        await repo.createUser({
          email,
          full_name: 'Admin Master',
          password: hashed,
          is_master: true,
          role: 'admin'
        });
        console.log('OK: novo usuário', email, 'criado como Admin Master.');
      }
    } catch (e) {
      console.error('Erro:', e.message);
      process.exit(1);
    }
    return;
  }

  console.log('DATABASE_URL não definido. Use o hash abaixo no backend/db/data/database.json:');
  console.log('Password (bcrypt):', hashed);
  console.log('\nEm users, adicione ou edite:');
  console.log(JSON.stringify({
    email,
    full_name: 'Admin Master',
    is_master: true,
    role: 'admin',
    password: hashed
  }, null, 2));
  console.log('\nE defina is_master = false nos demais usuários.');
})();
