import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from './postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Executar migração do schema
export async function migrate() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');
    
    // Testar conexão
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Não foi possível conectar ao PostgreSQL');
    }
    
    // Ler arquivo SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Executar schema
    await query(schemaSQL);
    
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
