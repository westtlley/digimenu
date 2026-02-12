/**
 * Menus Routes - Definição de rotas de menus
 */

import express from 'express';
import * as menusController from './menus.controller.js';

const router = express.Router();

// Rotas públicas
router.get('/public/cardapio/:slug', menusController.getPublicMenuBySlug);

export default router;
