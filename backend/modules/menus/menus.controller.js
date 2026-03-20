/**
 * Menus Controller - handlers for public menu routes.
 */

import * as menusService from './menus.service.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * Public branding data for slug login pages.
 */
export const getPublicLoginInfo = asyncHandler(async (req, res) => {
  const slug = (req.params.slug || '').trim();
  const data = await menusService.getPublicLoginInfo(slug);
  res.json(data);
});

/**
 * Public menu by slug.
 */
export const getPublicMenuBySlug = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;
    const menuData = await menusService.getPublicMenuBySlug(slug);
    res.json(menuData);
  } catch (error) {
    logger.error('Public menu lookup failed:', error);
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
