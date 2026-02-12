/**
 * Users Routes - Definição de rotas de usuários e colaboradores
 */

import express from 'express';
import { validate } from '../../middlewares/validation.js';
import { schemas } from '../../middlewares/validation.js';
import { authenticate } from '../../middlewares/auth.js';
import { createLimiter } from '../../middlewares/rateLimit.js';
import * as usersController from './users.controller.js';

const router = express.Router();

// Rotas de usuários
router.patch('/:id', authenticate, usersController.updateUserProfile);

// Rotas de colaboradores
router.get('/colaboradores', authenticate, usersController.listColaboradores);
router.post('/colaboradores', authenticate, validate(schemas.createColaborador), createLimiter, usersController.createColaborador);
router.post('/colaboradores/:email/add-roles', authenticate, usersController.addRolesToColaborador);
router.patch('/colaboradores/:id', authenticate, usersController.updateColaborador);
router.delete('/colaboradores/:id', authenticate, usersController.deleteColaborador);
router.patch('/colaboradores/:id/toggle-active', authenticate, usersController.toggleActiveColaborador);

// Rotas de funções customizadas
router.post('/functions/updateMasterSlug', authenticate, usersController.updateMasterSlug);
router.post('/functions/registerCustomer', usersController.registerCustomer); // Rota pública

export default router;
