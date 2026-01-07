/**
 * Wrapper compatível com Base44 SDK usando o apiClient
 * Este arquivo mantém a compatibilidade com o código existente
 * enquanto usa a nova API própria
 */
import { apiClient } from './apiClient';

// Cria um objeto compatível com a interface do Base44 SDK
export const base44 = {
  // Módulo de autenticação (exportado como User em entities.js)
  auth: apiClient.auth,

  // Módulo de entidades (CRUD genérico)
  entities: apiClient.entities,

  // Módulo de funções
  functions: apiClient.functions,

  // Módulo de integrações
  integrations: apiClient.integrations,
};
