/**
 * App Config - Centralização de configurações globais
 * Fornece acesso às variáveis globais do servidor para os módulos
 */

// Variáveis que podem ser lidas diretamente do process.env
export const usePostgreSQL = !!process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Variáveis que são inicializadas no server.js (serão injetadas)
let db = null;
let saveDatabaseDebounced = null;
let activeTokens = {};
let passwordTokens = {};

/**
 * Inicializa as variáveis globais (chamado do server.js)
 */
export function initializeAppConfig(config) {
  db = config.db;
  saveDatabaseDebounced = config.saveDatabaseDebounced;
  activeTokens = config.activeTokens || {};
  passwordTokens = config.passwordTokens || {};
}

/**
 * Getters para as variáveis injetadas
 */
export function getDb() {
  return db;
}

export function getSaveDatabaseDebounced() {
  return saveDatabaseDebounced;
}

export function getActiveTokens() {
  return activeTokens;
}

export function getPasswordTokens() {
  return passwordTokens;
}

// Exportar diretamente para compatibilidade (mas serão undefined até inicialização)
// Os módulos devem usar os getters ou receber via injeção
export { db, saveDatabaseDebounced, activeTokens, passwordTokens };
