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
