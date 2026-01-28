/**
 * Script para criar backup manual do banco de dados
 */
import { config } from 'dotenv';
config({ path: new URL('../.env', import.meta.url) });

import { createBackup } from '../utils/backup.js';

async function main() {
  try {
    console.log('🚀 Iniciando backup manual...');
    const result = await createBackup();
    console.log('✅ Backup criado com sucesso!');
    console.log('📁 Arquivo:', result.filename);
    console.log('📂 Localização:', result.filepath);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    process.exit(1);
  }
}

main();
