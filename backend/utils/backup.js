/**
 * Sistema de backup automático do banco de dados
 */
import { query } from '../db/postgres.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 7; // Manter últimos 7 backups

/**
 * Criar backup do banco de dados
 */
export async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Criar diretório de backup se não existir
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    console.log('📦 Iniciando backup do banco de dados...');

    if (process.env.DATABASE_URL) {
      // Backup PostgreSQL usando pg_dump
      const dbUrl = new URL(process.env.DATABASE_URL);
      const { stdout, stderr } = await execAsync(
        `PGPASSWORD="${dbUrl.password}" pg_dump -h ${dbUrl.hostname} -p ${dbUrl.port || 5432} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} -F p -f "${filepath}"`
      );

      if (stderr) {
        console.warn('⚠️ Backup warnings:', stderr);
      }

      console.log('✅ Backup criado com sucesso:', filename);
    } else {
      // Backup do JSON (fallback)
      const { loadDatabase } = await import('../db/persistence.js');
      const db = loadDatabase();
      await fs.writeFile(filepath, JSON.stringify(db, null, 2));
      console.log('✅ Backup JSON criado:', filename);
    }

    // Limpar backups antigos
    await cleanupOldBackups();

    // Registrar backup
    await logBackup(filename, filepath);

    return { success: true, filename, filepath };
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    throw error;
  }
}

/**
 * Limpar backups antigos (manter apenas os últimos N)
 */
async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
      .sort()
      .reverse();

    if (backupFiles.length > MAX_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        await fs.unlink(path.join(BACKUP_DIR, file));
        console.log('🗑️ Backup antigo removido:', file);
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro ao limpar backups antigos:', error);
  }
}

/**
 * Registrar backup no banco
 */
async function logBackup(filename, filepath) {
  try {
    const stats = await fs.stat(filepath);
    const sql = `
      INSERT INTO backup_logs (filename, filepath, size_bytes, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;
    await query(sql, [filename, filepath, stats.size]);
  } catch (error) {
    // Tabela pode não existir, não é crítico
    console.debug('Log de backup não registrado (tabela pode não existir)');
  }
}

/**
 * Listar backups disponíveis
 */
export async function listBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = await Promise.all(
      files
        .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
        .map(async (f) => {
          const filepath = path.join(BACKUP_DIR, f);
          const stats = await fs.stat(filepath);
          return {
            filename: f,
            filepath,
            size: stats.size,
            created: stats.mtime
          };
        })
    );

    return backupFiles.sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error);
    return [];
  }
}

/**
 * Restaurar backup
 */
export async function restoreBackup(filename) {
  try {
    const filepath = path.join(BACKUP_DIR, filename);
    
    console.log('🔄 Restaurando backup:', filename);

    if (process.env.DATABASE_URL) {
      // Restaurar PostgreSQL
      const dbUrl = new URL(process.env.DATABASE_URL);
      const { stdout, stderr } = await execAsync(
        `PGPASSWORD="${dbUrl.password}" psql -h ${dbUrl.hostname} -p ${dbUrl.port || 5432} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} -f "${filepath}"`
      );

      if (stderr) {
        console.warn('⚠️ Restore warnings:', stderr);
      }

      console.log('✅ Backup restaurado com sucesso');
    } else {
      // Restaurar JSON
      const content = await fs.readFile(filepath, 'utf-8');
      const db = JSON.parse(content);
      const { saveDatabase } = await import('../db/persistence.js');
      saveDatabase(db);
      console.log('✅ Backup JSON restaurado');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
    throw error;
  }
}

/**
 * Agendar backups automáticos
 */
export function scheduleBackups() {
  const interval = process.env.BACKUP_INTERVAL || '86400000'; // 24h padrão
  
  setInterval(async () => {
    console.log('⏰ Executando backup agendado...');
    try {
      await createBackup();
    } catch (error) {
      console.error('❌ Erro no backup agendado:', error);
    }
  }, parseInt(interval));

  console.log('✅ Backups automáticos agendados (intervalo:', interval, 'ms)');
}

export default {
  createBackup,
  listBackups,
  restoreBackup,
  scheduleBackups
};
