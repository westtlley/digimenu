/**
 * Menus Controller - Handlers de rotas de menus
 * Orquestra as requisições e chama o service apropriado
 */

import * as menusService from './menus.service.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { usePostgreSQL } from '../../config/appConfig.js';

/**
 * Dados públicos para a página de login por estabelecimento (logo, tema, nome).
 */
export const getPublicLoginInfo = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ found: false, error: 'Requer PostgreSQL' });
  }
  const slug = (req.params.slug || '').trim();
  const data = await menusService.getPublicLoginInfo(slug);
  res.json(data);
});

/**
 * Obtém cardápio público por slug
 */
export const getPublicMenuBySlug = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Cardápio por link requer PostgreSQL. Configure DATABASE_URL.' });
  }

  try {
    const { slug } = req.params;
    const menuData = await menusService.getPublicMenuBySlug(slug);
    res.json(menuData);
  } catch (error) {
    logger.error('❌ Erro ao buscar cardápio público:', error);
    if (error.message === 'Slug inválido') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Link não encontrado') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('requer PostgreSQL')) {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao buscar cardápio' });
  }
});
