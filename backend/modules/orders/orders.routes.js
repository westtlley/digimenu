/**
 * Orders Routes - Definição de rotas de pedidos
 */

import express from 'express';
import * as ordersController from './orders.controller.js';

const router = express.Router();

// Rotas públicas
router.post('/public/pedido-mesa', ordersController.createTableOrder);
router.post('/public/pedido-cardapio', ordersController.createCardapioOrder);

export default router;
