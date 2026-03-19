/**
 * App Config - Centralized access to server-level runtime state.
 * Modules should prefer dependency injection or these getters.
 */

// Values read directly from process.env
export const usePostgreSQL = !!process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Values initialized by server.js during bootstrap
let db = null;
let saveDatabaseDebounced = null;
let activeTokens = {};

export function initializeAppConfig(config) {
  db = config.db;
  saveDatabaseDebounced = config.saveDatabaseDebounced;
  activeTokens = config.activeTokens || {};
}

export function getDb() {
  return db;
}

export function getSaveDatabaseDebounced() {
  return saveDatabaseDebounced;
}

export function getActiveTokens() {
  return activeTokens;
}

export { db, saveDatabaseDebounced, activeTokens };
