/**
 * Compressão de Respostas
 * Reduz tamanho das respostas HTTP usando gzip
 */

import compression from 'compression';

/**
 * Middleware de compressão configurado
 */
export const compressionMiddleware = compression({
  // Comprimir apenas respostas maiores que 1KB
  threshold: 1024,
  // Nível de compressão (0-9, 6 é um bom equilíbrio)
  level: 6,
  // Filtrar tipos de conteúdo a comprimir
  filter: (req, res) => {
    // Não comprimir se o cliente não suporta
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Usar compressão padrão do express
    return compression.filter(req, res);
  }
});
