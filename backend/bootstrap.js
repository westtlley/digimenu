/**
 * Bootstrap - Entry Point Seguro para ESM
 * 
 * Este arquivo garante que as variáveis de ambiente sejam carregadas
 * ANTES de qualquer módulo ser importado.
 * 
 * Em ESM, os imports são avaliados antes do código do arquivo.
 * Por isso, precisamos de um bootstrap que:
 * 1. Carrega env primeiro (side-effect)
 * 2. Depois importa o server.js dinamicamente
 */

// PASSO 1: Carregar variáveis de ambiente ANTES de qualquer import
import './config/loadEnv.js';

// PASSO 2: Importar e executar o server dinamicamente
// Isso garante que todos os módulos importados pelo server.js
// já terão acesso às variáveis de ambiente carregadas
const { default: startServer } = await import('./server.js');

// Se o server.js exporta uma função, executá-la
if (typeof startServer === 'function') {
  startServer();
}
