import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// Garantir que o diretório existe
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Carregar dados do arquivo
export function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log('✅ Banco de dados carregado do arquivo');
      return parsed;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar banco de dados:', error);
  }
  
  // Retornar estrutura padrão se não conseguir carregar
  return {
    users: [
      {
        id: '1',
        email: 'admin@digimenu.com',
        full_name: 'Administrador',
        is_master: true,
        role: 'admin',
        password: 'admin123'
      }
    ],
    customers: [],
    entities: {},
    subscribers: [],
    passwordTokens: {}
  };
}

// Salvar dados no arquivo
export function saveDatabase(db) {
  try {
    // Criar cópia do banco sem dados sensíveis para backup
    const dataToSave = {
      users: db.users.map(u => ({
        ...u,
        password: undefined // Não salvar senhas em texto plano
      })),
      customers: db.customers,
      entities: db.entities,
      subscribers: db.subscribers,
      passwordTokens: {} // Não persistir tokens
    };
    
    fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log('💾 Banco de dados salvo');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar banco de dados:', error);
    return false;
  }
}

// Salvar com debounce para evitar muitas escritas
let saveTimeout = null;
export function saveDatabaseDebounced(db, delay = 1000) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveDatabase(db);
    saveTimeout = null;
  }, delay);
}
