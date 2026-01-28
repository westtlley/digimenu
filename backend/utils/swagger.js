/**
 * Configuração do Swagger para documentação da API
 */

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DigiMenu API',
      version: '1.0.0',
      description: 'API do sistema DigiMenu - Cardápio Digital e Gestão de Pedidos',
      contact: {
        name: 'DigiMenu Support',
        email: 'suporte@digimenu.com'
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3000',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://digimenu-backend-3m6t.onrender.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            },
            code: {
              type: 'string',
              description: 'Código do erro'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            full_name: { type: 'string' },
            is_master: { type: 'boolean' },
            role: { type: 'string' },
            subscriber_email: { type: 'string', nullable: true }
          }
        },
        Store: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            logo: { type: 'string', nullable: true },
            whatsapp: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            is_open: { type: 'boolean', nullable: true },
            accepting_orders: { type: 'boolean' },
            opening_time: { type: 'string', format: 'time' },
            closing_time: { type: 'string', format: 'time' },
            working_days: { type: 'array', items: { type: 'integer' } }
          }
        },
        Dish: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            price: { type: 'number' },
            image: { type: 'string', nullable: true },
            category_id: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            is_highlight: { type: 'boolean' },
            stock: { type: 'integer', nullable: true }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            order_code: { type: 'string' },
            customer_name: { type: 'string' },
            customer_phone: { type: 'string' },
            items: { type: 'array' },
            total: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'] },
            payment_method: { type: 'string' },
            delivery_method: { type: 'string', enum: ['delivery', 'pickup', 'balcao'] }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./server.js', './routes/*.js']
};

/**
 * Documentação de endpoints principais
 */
export const apiDocumentation = {
  // Autenticação
  '/api/auth/login': {
    post: {
      tags: ['Autenticação'],
      summary: 'Login de usuário',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login bem-sucedido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        401: {
          description: 'Credenciais inválidas',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  
  '/api/auth/me': {
    get: {
      tags: ['Autenticação'],
      summary: 'Obter usuário atual',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Dados do usuário',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' }
            }
          }
        },
        401: {
          description: 'Não autenticado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Entidades genéricas
  '/api/entities/{entity}': {
    get: {
      tags: ['Entidades'],
      summary: 'Listar entidades',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'entity',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Tipo da entidade (Store, Dish, Order, etc.)'
        },
        {
          name: 'order',
          in: 'query',
          schema: { type: 'string' },
          description: 'Campo de ordenação (prefixar com - para DESC)'
        }
      ],
      responses: {
        200: {
          description: 'Lista de entidades',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { type: 'object' }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Entidades'],
      summary: 'Criar entidade',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'entity',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      responses: {
        201: {
          description: 'Entidade criada',
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        }
      }
    }
  }
};

export default {
  swaggerOptions,
  apiDocumentation
};
