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
const colaboradoresRouter = express.Router();

// Rotas de usuários
router.patch('/:id', authenticate, usersController.updateUserProfile);

// Rotas de colaboradores (fonte única; pode ser montado em /api/users/colaboradores e /api/colaboradores)
colaboradoresRouter.get('/', authenticate, usersController.listColaboradores);
colaboradoresRouter.post('/', authenticate, validate(schemas.createColaborador), createLimiter, usersController.createColaborador);
colaboradoresRouter.post('/:email/add-roles', authenticate, usersController.addRolesToColaborador);
colaboradoresRouter.patch('/:id', authenticate, usersController.updateColaborador);
colaboradoresRouter.delete('/:id', authenticate, usersController.deleteColaborador);
colaboradoresRouter.patch('/:id/toggle-active', authenticate, usersController.toggleActiveColaborador);
router.use('/colaboradores', colaboradoresRouter);

// Rotas de funções customizadas
router.post('/functions/updateMasterSlug', authenticate, usersController.updateMasterSlug);
router.post('/functions/registerCustomer', usersController.registerCustomer); // Rota pública

export default router;
export { colaboradoresRouter };
