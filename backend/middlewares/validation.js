/**
 * Validação de Entrada com Zod
 * Middleware para validar dados de entrada nas rotas
 */

import { z } from 'zod';

/**
 * Middleware de validação
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      // Validar body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Schemas de validação comuns
 */
export const schemas = {
  login: z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
  }),
  
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres')
  }),
  
  setPassword: z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres')
  }),
  
  createSubscriber: z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    plan: z.enum(['basic', 'premium', 'pro', 'admin', 'custom'], {
      errorMap: () => ({ message: 'Plano inválido. Use: basic, premium, pro, admin ou custom' })
    }),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    permissions: z.record(z.any()).optional(),
    whatsapp_auto_enabled: z.boolean().optional()
  }),
  
  updateSubscriber: z.object({
    email: z.string().email().toLowerCase().trim().optional(),
    name: z.string().min(3).optional(),
    plan: z.enum(['basic', 'premium', 'pro', 'admin', 'custom']).optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    permissions: z.record(z.any()).optional(),
    whatsapp_auto_enabled: z.boolean().optional()
  }),
  
  createColaborador: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    role: z.enum(['entregador', 'cozinha', 'pdv'], {
      errorMap: () => ({ message: 'Perfil inválido. Use: entregador, cozinha ou pdv' })
    })
  }),
  
  updateColaborador: z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['entregador', 'cozinha', 'pdv']).optional(),
    newPassword: z.string().min(6).optional()
  })
};
