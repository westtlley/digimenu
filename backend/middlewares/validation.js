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
  
  forgotPassword: z.object({
    email: z.string().email('Email inválido').toLowerCase().trim()
  }),
  
  resetPassword: z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres')
  }),
  
  createSubscriber: z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    plan: z.enum(['free', 'basic', 'pro', 'ultra', 'admin', 'custom'], {
      errorMap: () => ({ message: 'Plano inválido. Use: free, basic, pro, ultra, admin ou custom' })
    }),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    permissions: z.record(z.any()).optional(),
    whatsapp_auto_enabled: z.boolean().optional()
  }),
  
  updateSubscriber: z.object({
    email: z.string().email().toLowerCase().trim().optional(),
    name: z.string().min(3).optional(),
    plan: z.enum(['free', 'basic', 'pro', 'ultra', 'admin', 'custom']).optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    permissions: z.record(z.any()).optional(),
    whatsapp_auto_enabled: z.boolean().optional()
  }),
  
  createColaborador: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    roles: z.array(z.enum(['entregador', 'cozinha', 'pdv', 'garcom', 'gerente'])).min(1, 'Selecione pelo menos um perfil'),
    // Manter role para compatibilidade com versões antigas
    role: z.enum(['entregador', 'cozinha', 'pdv', 'garcom', 'gerente']).optional()
  }),
  
  updateColaborador: z.object({
    name: z.string().min(1).optional(),
    roles: z.array(z.enum(['entregador', 'cozinha', 'pdv', 'garcom', 'gerente'])).optional(),
    // Manter role para compatibilidade
    role: z.enum(['entregador', 'cozinha', 'pdv', 'garcom', 'gerente']).optional(),
    newPassword: z.string().min(6).optional()
  }),
  
  // Configuração de ganhos dos entregadores
  createDeliveryEarningsConfig: z.object({
    remuneration_type: z.enum(['fixed', 'per_delivery', 'per_distance', 'percentage']),
    fixed_amount: z.number().min(0).optional(),
    per_delivery_amount: z.number().min(0).optional(),
    per_km_amount: z.number().min(0).optional(),
    percentage: z.number().min(0).max(100).optional(),
    min_amount: z.number().min(0).optional(),
    max_amount: z.number().min(0).optional(),
    active: z.boolean().default(true)
  }),
  
  // Gorjeta do garçom
  createWaiterTip: z.object({
    garcom_id: z.string().min(1, 'ID do garçom é obrigatório'),
    comanda_id: z.string().optional(),
    order_id: z.string().optional(),
    table_id: z.string().optional(),
    amount: z.number().min(0, 'Valor da gorjeta deve ser positivo'),
    tip_type: z.enum(['percent', 'fixed']),
    tip_percentage: z.number().min(0).max(100).optional(),
    customer_name: z.string().optional()
  }),
  
  // Feedback do cliente
  createCustomerFeedback: z.object({
    feedback_type: z.enum(['suggestion', 'complaint', 'praise', 'general']),
    rating: z.number().min(1).max(5).optional(),
    message: z.string().min(1, 'Mensagem é obrigatória'),
    order_id: z.string().optional()
  })
};
