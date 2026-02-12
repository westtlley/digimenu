/**
 * Establishments Routes - Definição de rotas de estabelecimentos/assinantes
 */

import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { requireMaster } from '../../middlewares/permissions.js';
import * as establishmentsController from './establishments.controller.js';

const router = express.Router();

// Rotas de assinantes
router.get('/subscribers', authenticate, requireMaster, establishmentsController.listSubscribers);
router.post('/subscribers', authenticate, requireMaster, establishmentsController.createSubscriber);
router.put('/subscribers/:id', authenticate, establishmentsController.updateSubscriber);
// Rota para quando o router é montado em /api/subscribers (path fica /:id)
router.put('/:id', authenticate, establishmentsController.updateSubscriber);
router.get('/delete-subscriber-by-slug', authenticate, requireMaster, establishmentsController.deleteSubscriberBySlug);
router.post('/delete-subscriber-by-slug', authenticate, requireMaster, establishmentsController.deleteSubscriberBySlug);

// Rotas de funções customizadas relacionadas a planos
router.post('/functions/getPlanInfo', authenticate, establishmentsController.getPlanInfo);
router.post('/functions/getAvailablePlans', authenticate, establishmentsController.getAvailablePlans);
router.post('/functions/getSubscribers', authenticate, requireMaster, establishmentsController.listSubscribers);
router.post('/functions/createSubscriber', authenticate, requireMaster, establishmentsController.createSubscriber);

export default router;
