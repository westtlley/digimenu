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
