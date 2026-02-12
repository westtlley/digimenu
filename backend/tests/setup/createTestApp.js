/**
 * Cria uma instância do app Express para testes
 * Usa o app real do backend, mas com configurações de teste
 */

import express from 'express';
import { createApp } from '../../src/app.js';

let testApp = null;

/**
 * Cria ou retorna o app de teste
 * O app é criado uma vez e reutilizado entre testes
 */
export async function getTestApp() {
  if (testApp) {
    return testApp;
  }

  try {
    // Criar app real do backend
    testApp = await createApp();
    return testApp;
  } catch (error) {
    console.error('❌ Erro ao criar app de teste:', error);
    throw error;
  }
}

/**
 * Reseta o app de teste (útil entre suites de teste)
 */
export function resetTestApp() {
  testApp = null;
}
