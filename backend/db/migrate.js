import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from './postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureIntegerSubscriberIdColumn({
  tableName,
  matchConditionSql,
  fillSubscriberEmailSql = null,
  addForeignKey = false,
  addIndexes = [],
}) {
  const columnTypeResult = await query(
    `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = $1
        AND column_name = 'subscriber_id'
      LIMIT 1
    `,
    [tableName]
  );

  if (columnTypeResult.rows.length === 0) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN subscriber_id INTEGER;`);
    console.log(`✅ ${tableName}.subscriber_id criado como INTEGER.`);
    return;
  }

  const dataType = String(columnTypeResult.rows[0]?.data_type || '').toLowerCase();
  if (dataType === 'integer') {
    return;
  }

  console.warn(`⚠️ ${tableName}.subscriber_id está como ${dataType}. Corrigindo para INTEGER...`);

  await query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS subscriber_id_tmp INTEGER;`);
  await query(`UPDATE ${tableName} SET subscriber_id_tmp = NULL;`);

  await query(`
    UPDATE ${tableName} target
    SET subscriber_id_tmp = s.id
    FROM subscribers s
    WHERE target.subscriber_id_tmp IS NULL
      AND (${matchConditionSql});
  `);

  if (fillSubscriberEmailSql) {
    await query(`
      UPDATE ${tableName} target
      SET subscriber_email = COALESCE(target.subscriber_email, ${fillSubscriberEmailSql})
      FROM subscribers s
      WHERE target.subscriber_id_tmp IS NOT NULL
        AND s.id = target.subscriber_id_tmp;
    `);
  }

  const fkResult = await query(
    `
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'subscriber_id'
    `,
    [tableName]
  );

  for (const row of fkResult.rows) {
    await query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${row.constraint_name};`);
  }

  for (const indexName of addIndexes) {
    await query(`DROP INDEX IF EXISTS ${indexName};`);
  }

  await query(`ALTER TABLE ${tableName} DROP COLUMN subscriber_id;`);
  await query(`ALTER TABLE ${tableName} RENAME COLUMN subscriber_id_tmp TO subscriber_id;`);

  if (addForeignKey) {
    await query(`
      ALTER TABLE ${tableName}
      ADD CONSTRAINT ${tableName}_subscriber_id_fkey
      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id);
    `);
  }

  console.log(`✅ ${tableName}.subscriber_id corrigido para INTEGER.`);
}

// Executar migração do schema
export async function migrate() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');
    
    // Testar conexão
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Não foi possível conectar ao PostgreSQL');
    }

    // Pré-migração: garantir coluna password_hash em users (evita erro em banco antigo no Render)
    try {
      await query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
            ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
            RAISE NOTICE 'Coluna password_hash adicionada em users';
          END IF;
        END $$;
      `);
      console.log('✅ Pré-migração (password_hash em users) concluída.');
    } catch (e) {
      console.warn('⚠️ Pré-migração password_hash (pode ser banco novo):', e?.message || e);
    }

    // Ler arquivo SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Executar schema
    await query(schemaSQL);

    // Tenant canônico por subscriber_id (incremental, mantendo subscriber_email compatível)
    try {
      await ensureIntegerSubscriberIdColumn({
        tableName: 'users',
        matchConditionSql: `
          (target.subscriber_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.email)))
          OR (target.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
          OR (target.subscriber_email IS NULL AND LOWER(TRIM(target.email)) = LOWER(TRIM(s.email)))
          OR (target.subscriber_email IS NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(target.email)) = LOWER(TRIM(s.linked_user_email)))
        `,
        fillSubscriberEmailSql: 's.email',
        addForeignKey: true,
        addIndexes: ['idx_users_subscriber_id'],
      });

      await ensureIntegerSubscriberIdColumn({
        tableName: 'customers',
        matchConditionSql: `
          (target.subscriber_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.email)))
          OR (target.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
        `,
        fillSubscriberEmailSql: 's.email',
        addForeignKey: true,
        addIndexes: ['idx_customers_subscriber_id'],
      });

      await ensureIntegerSubscriberIdColumn({
        tableName: 'entities',
        matchConditionSql: `
          (target.subscriber_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.email)))
          OR (target.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
          OR (target.subscriber_email IS NULL AND (target.data->>'owner_email') IS NOT NULL AND LOWER(TRIM(target.data->>'owner_email')) = LOWER(TRIM(s.email)))
          OR (target.subscriber_email IS NULL AND (target.data->>'owner_email') IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(target.data->>'owner_email')) = LOWER(TRIM(s.linked_user_email)))
        `,
        fillSubscriberEmailSql: 's.email',
        addForeignKey: true,
        addIndexes: ['idx_entities_subscriber_id', 'idx_entities_type_subscriber_id'],
      });

      await ensureIntegerSubscriberIdColumn({
        tableName: 'analytics_events',
        matchConditionSql: `
          (target.subscriber_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.email)))
          OR (target.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(target.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
          OR (target.slug IS NOT NULL AND LOWER(TRIM(target.slug)) = LOWER(TRIM(s.slug)))
        `,
        fillSubscriberEmailSql: 's.email',
        addForeignKey: false,
        addIndexes: ['idx_analytics_events_subscriber_id_created'],
      });

      await query(`
        UPDATE users u
        SET
          subscriber_id = s.id,
          subscriber_email = COALESCE(u.subscriber_email, s.email)
        FROM subscribers s
        WHERE u.subscriber_id IS NULL
          AND (
            (u.subscriber_email IS NOT NULL AND LOWER(TRIM(u.subscriber_email)) = LOWER(TRIM(s.email)))
            OR (u.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(u.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
            OR (u.subscriber_email IS NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(s.email)))
            OR (u.subscriber_email IS NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(s.linked_user_email)))
          );
      `);

      await query(`
        UPDATE customers c
        SET
          subscriber_id = s.id,
          subscriber_email = COALESCE(c.subscriber_email, s.email)
        FROM subscribers s
        WHERE c.subscriber_id IS NULL
          AND (
            (c.subscriber_email IS NOT NULL AND LOWER(TRIM(c.subscriber_email)) = LOWER(TRIM(s.email)))
            OR (c.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(c.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
          );
      `);

      await query(`
        UPDATE entities e
        SET
          subscriber_id = s.id,
          subscriber_email = COALESCE(e.subscriber_email, s.email)
        FROM subscribers s
        WHERE e.subscriber_id IS NULL
          AND (
            (e.subscriber_email IS NOT NULL AND LOWER(TRIM(e.subscriber_email)) = LOWER(TRIM(s.email)))
            OR (e.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(e.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
            OR (e.subscriber_email IS NULL AND (e.data->>'owner_email') IS NOT NULL AND LOWER(TRIM(e.data->>'owner_email')) = LOWER(TRIM(s.email)))
            OR (e.subscriber_email IS NULL AND (e.data->>'owner_email') IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(e.data->>'owner_email')) = LOWER(TRIM(s.linked_user_email)))
          );
      `);

      await query(`
        UPDATE analytics_events a
        SET
          subscriber_id = s.id,
          subscriber_email = COALESCE(a.subscriber_email, s.email)
        FROM subscribers s
        WHERE a.subscriber_id IS NULL
          AND (
            (a.subscriber_email IS NOT NULL AND LOWER(TRIM(a.subscriber_email)) = LOWER(TRIM(s.email)))
            OR (a.subscriber_email IS NOT NULL AND s.linked_user_email IS NOT NULL AND LOWER(TRIM(a.subscriber_email)) = LOWER(TRIM(s.linked_user_email)))
            OR (a.slug IS NOT NULL AND LOWER(TRIM(a.slug)) = LOWER(TRIM(s.slug)))
          );
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_users_subscriber_id ON users(subscriber_id);
        CREATE INDEX IF NOT EXISTS idx_customers_subscriber_id ON customers(subscriber_id);
        CREATE INDEX IF NOT EXISTS idx_entities_subscriber_id ON entities(subscriber_id);
        CREATE INDEX IF NOT EXISTS idx_entities_type_subscriber_id ON entities(entity_type, subscriber_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_subscriber_id_created ON analytics_events(subscriber_id, created_at DESC);
      `);

      console.log('✅ Migração de tenant canônico por subscriber_id concluída.');
    } catch (error) {
      console.warn('⚠️ Aviso ao aplicar migração subscriber_id (compatibilidade será mantida por email):', error.message);
    }
    
        // Adicionar colunas do Google OAuth se não existirem
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='google_id') THEN
                ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
                RAISE NOTICE 'Coluna google_id adicionada';
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='google_photo') THEN
                ALTER TABLE users ADD COLUMN google_photo TEXT;
                RAISE NOTICE 'Coluna google_photo adicionada';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de colunas Google OAuth concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar colunas Google OAuth (pode já existir):', error.message);
        }
        
        // Adicionar coluna whatsapp_auto_enabled em subscribers se não existir
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='whatsapp_auto_enabled') THEN
                ALTER TABLE subscribers ADD COLUMN whatsapp_auto_enabled BOOLEAN DEFAULT true;
                RAISE NOTICE 'Coluna whatsapp_auto_enabled adicionada';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de coluna whatsapp_auto_enabled concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar coluna whatsapp_auto_enabled (pode já existir):', error.message);
        }

        // profile_role em users (entregador, cozinha, pdv) para colaboradores Premium/Pro
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='profile_role') THEN
                ALTER TABLE users ADD COLUMN profile_role VARCHAR(50);
                RAISE NOTICE 'Coluna profile_role adicionada em users';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de coluna profile_role concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar profile_role (pode já existir):', error.message);
        }

        // slug em subscribers — link único do cardápio por assinante (ex: /s/meu-restaurante)
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='slug') THEN
                ALTER TABLE subscribers ADD COLUMN slug VARCHAR(100) UNIQUE;
                RAISE NOTICE 'Coluna slug adicionada em subscribers';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de coluna slug (link do cardápio) concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar slug (pode já existir):', error.message);
        }

        // password_token, token_expires_at, has_password, linked_user_email em subscribers
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='password_token') THEN
                ALTER TABLE subscribers ADD COLUMN password_token VARCHAR(255);
                RAISE NOTICE 'Coluna password_token adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='token_expires_at') THEN
                ALTER TABLE subscribers ADD COLUMN token_expires_at TIMESTAMP;
                RAISE NOTICE 'Coluna token_expires_at adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='has_password') THEN
                ALTER TABLE subscribers ADD COLUMN has_password BOOLEAN DEFAULT false;
                RAISE NOTICE 'Coluna has_password adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='linked_user_email') THEN
                ALTER TABLE subscribers ADD COLUMN linked_user_email VARCHAR(255);
                RAISE NOTICE 'Coluna linked_user_email adicionada em subscribers';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de colunas password_token/token_expires_at/has_password/linked_user_email em subscribers concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar colunas em subscribers (pode já existir):', error.message);
        }

        // phone, cnpj_cpf, notes, origem, tags em subscribers
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='phone') THEN
                ALTER TABLE subscribers ADD COLUMN phone VARCHAR(50);
                RAISE NOTICE 'Coluna phone adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='cnpj_cpf') THEN
                ALTER TABLE subscribers ADD COLUMN cnpj_cpf VARCHAR(30);
                RAISE NOTICE 'Coluna cnpj_cpf adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='notes') THEN
                ALTER TABLE subscribers ADD COLUMN notes TEXT;
                RAISE NOTICE 'Coluna notes adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='origem') THEN
                ALTER TABLE subscribers ADD COLUMN origem VARCHAR(100);
                RAISE NOTICE 'Coluna origem adicionada em subscribers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='tags') THEN
                ALTER TABLE subscribers ADD COLUMN tags TEXT[];
                RAISE NOTICE 'Coluna tags adicionada em subscribers';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de colunas phone/cnpj_cpf/notes/origem/tags em subscribers concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar colunas extras em subscribers (pode já existir):', error.message);
        }

        // Add-ons de volume (Monetização Agressiva 2.0)
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='subscribers' AND column_name='addons') THEN
                ALTER TABLE subscribers ADD COLUMN addons JSONB DEFAULT '{}';
                RAISE NOTICE 'Coluna addons adicionada em subscribers';
              END IF;
            END $$;
          `);
          console.log('✅ Migração addons em subscribers concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar coluna addons em subscribers (pode já existir):', error.message);
        }

        // Tabela password_reset_tokens (esqueci minha senha — usuários e assinantes)
        await query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('✅ Migração de tabela password_reset_tokens concluída.');

        // Tabela de analytics comercial
        await query(`
          CREATE TABLE IF NOT EXISTS analytics_events (
            id SERIAL PRIMARY KEY,
            event_name VARCHAR(100) NOT NULL,
            event_category VARCHAR(60),
            subscriber_email VARCHAR(255),
            slug VARCHAR(120),
            session_id VARCHAR(120),
            path TEXT,
            user_id VARCHAR(255),
            properties JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Bancos antigos podem ter analytics_events sem colunas novas (ex: slug).
        // Garantimos compatibilidade antes de criar índices nessas colunas.
        await query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='analytics_events') THEN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='event_category') THEN
                ALTER TABLE analytics_events ADD COLUMN event_category VARCHAR(60);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='subscriber_email') THEN
                ALTER TABLE analytics_events ADD COLUMN subscriber_email VARCHAR(255);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='slug') THEN
                ALTER TABLE analytics_events ADD COLUMN slug VARCHAR(120);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='session_id') THEN
                ALTER TABLE analytics_events ADD COLUMN session_id VARCHAR(120);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='path') THEN
                ALTER TABLE analytics_events ADD COLUMN path TEXT;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='user_id') THEN
                ALTER TABLE analytics_events ADD COLUMN user_id VARCHAR(255);
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='properties') THEN
                ALTER TABLE analytics_events ADD COLUMN properties JSONB DEFAULT '{}'::jsonb;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analytics_events' AND column_name='created_at') THEN
                ALTER TABLE analytics_events ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
              END IF;
            END IF;
          END $$;
        `);

        await query(`
          CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
          ON analytics_events(event_name, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_analytics_events_subscriber_created
          ON analytics_events(subscriber_email, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_analytics_events_slug_created
          ON analytics_events(slug, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_analytics_events_session
          ON analytics_events(session_id);
        `);
        console.log('✅ Migração de tabela analytics_events concluída.');

        // Índice para Comanda (entity_type + subscriber já cobertos por idx_entities_type_subscriber)
        try {
          await query(`
            CREATE INDEX IF NOT EXISTS idx_entities_comanda
            ON entities ((data->>'status'))
            WHERE entity_type = 'Comanda';
          `);
          console.log('✅ Índice idx_entities_comanda criado.');
        } catch (e) {
          console.warn('⚠️ Aviso ao criar idx_entities_comanda (pode já existir):', e.message);
        }

        // Migração: Sistema de Mesas e Gestão de Estoque Inteligente
        try {
          const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add_tables_and_inventory.sql'), 'utf8');
          await query(migrationSQL);
          console.log('✅ Migração de Mesas e Estoque concluída.');
        } catch (e) {
          console.warn('⚠️ Aviso ao executar migração de Mesas e Estoque (pode já existir):', e.message);
        }

        // Migração: Funcionalidades Avançadas (Chatbot, Afiliados, LGPD, 2FA)
        try {
          const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add_advanced_features.sql'), 'utf8');
          await query(migrationSQL);
          console.log('✅ Migração de Funcionalidades Avançadas concluída.');
        } catch (e) {
          console.warn('⚠️ Aviso ao executar migração de Funcionalidades Avançadas (pode já existir):', e.message);
        }

        // Migração: Autorização gerencial (matrícula + senha para assinante e gerente)
        try {
          const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add_managerial_authorizations.sql'), 'utf8');
          await query(migrationSQL);
          console.log('✅ Migração de Autorização gerencial concluída.');
        } catch (e) {
          console.warn('⚠️ Aviso ao executar migração de Autorização gerencial (pode já existir):', e.message);
        }

        // Migração: Campos adicionais para customers (cadastro de clientes com senha)
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='customers' AND column_name='birth_date') THEN
                ALTER TABLE customers ADD COLUMN birth_date DATE;
                RAISE NOTICE 'Coluna birth_date adicionada em customers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='customers' AND column_name='cpf') THEN
                ALTER TABLE customers ADD COLUMN cpf VARCHAR(14);
                RAISE NOTICE 'Coluna cpf adicionada em customers';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='customers' AND column_name='password_hash') THEN
                ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255);
                RAISE NOTICE 'Coluna password_hash adicionada em customers';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de colunas birth_date/cpf/password_hash em customers concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar colunas em customers (pode já existir):', error.message);
        }

        // Migração: Campos de perfil para colaboradores (users)
        try {
          await query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='photo') THEN
                ALTER TABLE users ADD COLUMN photo TEXT;
                RAISE NOTICE 'Coluna photo adicionada em users';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='phone') THEN
                ALTER TABLE users ADD COLUMN phone VARCHAR(50);
                RAISE NOTICE 'Coluna phone adicionada em users';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='address') THEN
                ALTER TABLE users ADD COLUMN address TEXT;
                RAISE NOTICE 'Coluna address adicionada em users';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='city') THEN
                ALTER TABLE users ADD COLUMN city VARCHAR(255);
                RAISE NOTICE 'Coluna city adicionada em users';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='state') THEN
                ALTER TABLE users ADD COLUMN state VARCHAR(50);
                RAISE NOTICE 'Coluna state adicionada em users';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='birth_date') THEN
                ALTER TABLE users ADD COLUMN birth_date DATE;
                RAISE NOTICE 'Coluna birth_date adicionada em users';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='users' AND column_name='document') THEN
                ALTER TABLE users ADD COLUMN document VARCHAR(30);
                RAISE NOTICE 'Coluna document adicionada em users';
              END IF;
            END $$;
          `);
          console.log('✅ Migração de colunas de perfil (photo/phone/address/city/state/birth_date/document) em users concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao adicionar colunas de perfil em users (pode já existir):', error.message);
        }

        // Migração: Tabelas para ganhos de entregadores, gorjetas de garçons e feedbacks
        try {
          // Tabela de configuração de ganhos dos entregadores
          await query(`
            CREATE TABLE IF NOT EXISTS delivery_earnings_config (
              id SERIAL PRIMARY KEY,
              subscriber_email VARCHAR(255) NOT NULL,
              remuneration_type VARCHAR(50) NOT NULL CHECK (remuneration_type IN ('fixed', 'per_delivery', 'per_distance', 'percentage')),
              fixed_amount DECIMAL(10,2),
              per_delivery_amount DECIMAL(10,2),
              per_km_amount DECIMAL(10,2),
              percentage DECIMAL(5,2),
              min_amount DECIMAL(10,2),
              max_amount DECIMAL(10,2),
              active BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(subscriber_email)
            );
          `);
          
          // Tabela de ganhos registrados dos entregadores
          await query(`
            CREATE TABLE IF NOT EXISTS delivery_earnings (
              id SERIAL PRIMARY KEY,
              entregador_id INTEGER NOT NULL,
              order_id VARCHAR(255),
              amount DECIMAL(10,2) NOT NULL,
              calculation_type VARCHAR(50) NOT NULL,
              distance_km DECIMAL(10,2),
              delivered_at TIMESTAMP NOT NULL,
              paid BOOLEAN DEFAULT false,
              paid_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (entregador_id) REFERENCES users(id) ON DELETE CASCADE
            );
          `);
          
          // Tabela de gorjetas dos garçons
          await query(`
            CREATE TABLE IF NOT EXISTS waiter_tips (
              id SERIAL PRIMARY KEY,
              garcom_id INTEGER NOT NULL,
              comanda_id VARCHAR(255),
              order_id VARCHAR(255),
              table_id VARCHAR(255),
              amount DECIMAL(10,2) NOT NULL,
              tip_type VARCHAR(20) NOT NULL CHECK (tip_type IN ('percent', 'fixed')),
              tip_percentage DECIMAL(5,2),
              customer_name VARCHAR(255),
              paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (garcom_id) REFERENCES users(id) ON DELETE CASCADE
            );
          `);
          
          // Tabela de feedbacks dos clientes
          await query(`
            CREATE TABLE IF NOT EXISTS customer_feedback (
              id SERIAL PRIMARY KEY,
              customer_email VARCHAR(255) NOT NULL,
              subscriber_email VARCHAR(255) NOT NULL,
              feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('suggestion', 'complaint', 'praise', 'general')),
              rating INTEGER CHECK (rating >= 1 AND rating <= 5),
              message TEXT NOT NULL,
              order_id VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // Índices para performance
          await query(`
            CREATE INDEX IF NOT EXISTS idx_delivery_earnings_entregador ON delivery_earnings(entregador_id);
            CREATE INDEX IF NOT EXISTS idx_delivery_earnings_delivered_at ON delivery_earnings(delivered_at);
            CREATE INDEX IF NOT EXISTS idx_waiter_tips_garcom ON waiter_tips(garcom_id);
            CREATE INDEX IF NOT EXISTS idx_waiter_tips_paid_at ON waiter_tips(paid_at);
            CREATE INDEX IF NOT EXISTS idx_customer_feedback_subscriber ON customer_feedback(subscriber_email);
            CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);
          `);
          
          console.log('✅ Migração de tabelas de ganhos, gorjetas e feedbacks concluída.');
        } catch (error) {
          console.warn('⚠️ Aviso ao criar tabelas de ganhos/gorjetas/feedbacks (pode já existir):', error.message);
        }

        // Migração: Campo active em users (para desativar colaboradores)
        try {
          const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add_active_field_to_users.sql'), 'utf8');
          await query(migrationSQL);
          console.log('✅ Migração de coluna active em users concluída.');
        } catch (e) {
          // Se o arquivo não existir, tentar adicionar diretamente
          try {
            await query(`
              DO $$ 
              BEGIN
                IF NOT EXISTS (
                  SELECT 1 
                  FROM information_schema.columns 
                  WHERE table_name = 'users' 
                  AND column_name = 'active'
                ) THEN
                  ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
                  UPDATE users SET active = TRUE WHERE active IS NULL;
                  RAISE NOTICE 'Coluna active adicionada em users';
                END IF;
              END $$;
              CREATE INDEX IF NOT EXISTS idx_users_active ON users(active) WHERE active = false;
            `);
            console.log('✅ Migração de coluna active em users concluída.');
          } catch (error) {
            console.warn('⚠️ Aviso ao adicionar coluna active em users (pode já existir):', error.message);
          }
        }
    
    console.log('✅ Migração concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log('✅ Migração finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na migração:', error);
      process.exit(1);
    });
}
