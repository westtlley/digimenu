/**
 * Auth Routes - Definição de rotas de autenticação
 */

import express from 'express';
import { validate } from '../../middlewares/validation.js';
import { schemas } from '../../middlewares/validation.js';
import { authenticate } from '../../middlewares/auth.js';
import * as authController from './auth.controller.js';

const router = express.Router();

// Rotas públicas
router.post('/login', validate(schemas.login), authController.login);
router.post('/set-password', validate(schemas.setPassword), authController.setPassword);
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(schemas.resetPassword), authController.resetPassword);

// Rotas autenticadas
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, validate(schemas.changePassword), authController.changePassword);

export default router;

// Exportar também a rota de contexto do usuário (será registrada separadamente)
export { getUserContext } from './auth.controller.js';
