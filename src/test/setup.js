/**
 * Configuração de testes
 */
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Limpar após cada teste
afterEach(() => {
  cleanup();
});

// Mock de APIs globais
global.fetch = global.fetch || (() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
}));
