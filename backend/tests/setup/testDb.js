/**
 * Test Database Setup
 * Configuração de banco de dados isolado para testes
 * 
 * NOTA: loadTestEnv.js já foi executado pelo vitest.config.js
 * Então process.env.DATABASE_URL já está carregado do .env.test
 */

import pg from 'pg';
const { Pool } = pg;

let testPool = null;
let testDbName = null;

/**
 * Cria um banco de dados de teste isolado
 */
export async function setupTestDb() {
  // Validar DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não está definida. ' +
      'Configure no arquivo .env.test ou defina TEST_DATABASE_URL.'
    );
  }
  
  // Validar formato da URL
  let urlObj;
  try {
    urlObj = new URL(process.env.DATABASE_URL);
  } catch (error) {
    throw new Error(`DATABASE_URL inválida: ${error.message}`);
  }
  
  // Garantir que está usando localhost/127.0.0.1 (não 'base' ou outros hosts)
  const host = urlObj.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && !host.includes('.')) {
    console.warn(`⚠️ Host '${host}' pode não estar correto. Usando localhost.`);
    urlObj.hostname = 'localhost';
    process.env.DATABASE_URL = urlObj.toString();
  }
  
  const mainPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Criar nome único para o banco de teste
  testDbName = `digimenu_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    // Criar banco de teste
    await mainPool.query(`CREATE DATABASE ${testDbName}`);
    console.log(`✅ Banco de teste criado: ${testDbName}`);

    // Conectar ao banco de teste
    const testDbUrl = process.env.DATABASE_URL.replace(/\/[^/]+$/, `/${testDbName}`);
    testPool = new Pool({
      connectionString: testDbUrl,
    });

    // Executar migrations no banco de teste
    await runMigrations(testPool);

    // IMPORTANTE: Injetar pool de teste globalmente para que postgres.js use o pool de teste
    // Isso é necessário porque repository.js importa postgres.js que usa um pool global
    // A função getPool() em postgres.js verifica global.__testPool em modo de teste
    global.__testPool = testPool;

    return testPool;
  } catch (error) {
    console.error('❌ Erro ao criar banco de teste:', error);
    throw error;
  } finally {
    await mainPool.end();
  }
}

/**
 * Executa migrations no banco de teste
 * Executa o schema.sql completo usando psql ou executando statement por statement
 */
async function runMigrations(pool) {
  try {
    // Ler schema.sql e executar
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema.sql não encontrado em ' + schemaPath);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remover comentários de linha única (-- comentário)
    // Mas manter comentários inline (CREATE TABLE -- comentário)
    const lines = schema.split('\n');
    const cleanedLines = lines.map(line => {
      // Se a linha inteira é um comentário, remover
      const trimmed = line.trim();
      if (trimmed.startsWith('--') && !trimmed.includes('CREATE')) {
        return '';
      }
      return line;
    });
    
    const cleanedSchema = cleanedLines.join('\n');
    
    // Dividir em statements preservando blocos $$ (funções PL/pgSQL)
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    let i = 0;
    
    while (i < cleanedSchema.length) {
      const char = cleanedSchema[i];
      const nextChar = cleanedSchema[i + 1];
      
      // Detectar início de dollar quote ($$tag$)
      if (!inDollarQuote && char === '$' && nextChar === '$') {
        inDollarQuote = true;
        dollarTag = '';
        let j = i + 2;
        // Ler tag do dollar quote
        while (j < cleanedSchema.length && cleanedSchema[j] !== '$') {
          dollarTag += cleanedSchema[j];
          j++;
        }
        currentStatement += cleanedSchema.substring(i, j + 1);
        i = j + 1;
        continue;
      }
      
      // Detectar fim de dollar quote
      if (inDollarQuote && char === '$' && nextChar === '$') {
        const tagAfter = cleanedSchema.substring(i + 2, i + 2 + dollarTag.length);
        if (tagAfter === dollarTag && cleanedSchema[i + 2 + dollarTag.length] === '$') {
          inDollarQuote = false;
          currentStatement += cleanedSchema.substring(i, i + 2 + dollarTag.length + 1);
          i = i + 2 + dollarTag.length + 1;
          continue;
        }
      }
      
      currentStatement += char;
      
      // Se não está em dollar quote e encontrou ;, finalizar statement
      if (!inDollarQuote && char === ';') {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && !trimmed.match(/^--/)) {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
      
      i++;
    }
    
    // Adicionar statement final se houver
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // Executar cada statement
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed || trimmed.length < 10) continue; // Ignorar statements muito curtos
      
      try {
        await pool.query(trimmed);
        successCount++;
      } catch (error) {
        // Ignorar erros esperados
        const errorMsg = error.message.toLowerCase();
        const shouldIgnore = 
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('does not exist') ||
          (errorMsg.includes('relation') && errorMsg.includes('already exists')) ||
          (errorMsg.includes('function') && errorMsg.includes('already exists')) ||
          (errorMsg.includes('trigger') && errorMsg.includes('already exists')) ||
          (errorMsg.includes('index') && errorMsg.includes('already exists'));
        
        if (!shouldIgnore) {
          errorCount++;
          errors.push({
            statement: trimmed.substring(0, 200),
            error: error.message
          });
        }
      }
    }
    
    console.log(`✅ Schema aplicado: ${successCount} statements executados, ${errorCount} erros`);
    
    if (errors.length > 0) {
      console.warn('⚠️ Erros ao executar migrations:');
      errors.slice(0, 5).forEach(err => {
        console.warn(`   - ${err.error.substring(0, 100)}`);
        console.warn(`     Statement: ${err.statement}...`);
      });
    }
    
    // Verificar se as tabelas foram criadas
    try {
      const tablesCheck = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'subscribers', 'entities', 'customers')
      `);
      
      if (tablesCheck.rows.length < 4) {
        const missing = ['users', 'subscribers', 'entities', 'customers'].filter(
          t => !tablesCheck.rows.some(r => r.tablename === t)
        );
        throw new Error(`Tabelas não criadas: ${missing.join(', ')}. Apenas ${tablesCheck.rows.length} de 4 tabelas foram criadas.`);
      }
      
      console.log('✅ Todas as tabelas criadas:', tablesCheck.rows.map(r => r.tablename).join(', '));
    } catch (checkError) {
      console.error('❌ Erro ao verificar tabelas:', checkError.message);
      throw checkError;
    }
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error.message);
    throw error; // Re-throw para que o teste falhe claramente
  }
}

/**
 * Limpa e remove o banco de teste
 */
export async function teardownTestDb() {
  // Remover pool de teste global
  if (global.__testPool) {
    delete global.__testPool;
  }
  
  if (testPool) {
    await testPool.end();
    testPool = null;
  }

  if (testDbName) {
    // Validar DATABASE_URL antes de usar
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️ DATABASE_URL não definida, não é possível remover banco de teste');
      return;
    }
    
    const mainPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // Terminar todas as conexões ao banco de teste
      await mainPool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
      `, [testDbName]);

      // Dropar banco de teste
      await mainPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      console.log(`✅ Banco de teste removido: ${testDbName}`);
    } catch (error) {
      console.error('❌ Erro ao remover banco de teste:', error.message);
    } finally {
      await mainPool.end();
    }

    testDbName = null;
  }
}

/**
 * Obtém o pool de conexão do banco de teste
 */
export function getTestPool() {
  return testPool;
}

/**
 * Limpa todas as tabelas do banco de teste (mantém estrutura)
 */
export async function cleanTestDb() {
  if (!testPool) {
    throw new Error('Banco de teste não inicializado. Chame setupTestDb() primeiro.');
  }

  // Listar todas as tabelas
  const result = await testPool.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
  `);

  const tables = result.rows.map(row => row.tablename);

  // Limpar cada tabela
  for (const table of tables) {
    await testPool.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  console.log('✅ Banco de teste limpo');
}
