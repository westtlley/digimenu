# 🛠️ Guia Prático de Implementação - Melhorias DigiMenu

Este documento contém exemplos práticos de código para implementar as melhorias críticas identificadas na análise.

---

## 🔴 1. Correção de Segurança - Senhas Sempre com Hash

### Problema
Comparação direta de senhas no fallback JSON permite vazamento de credenciais.

### Solução

**Arquivo**: `backend/server.js`

```javascript
// ❌ REMOVER ESTE CÓDIGO (linhas ~554-581)
if (user.password === password) {
  console.log('⚠️ [login] Senha sem hash detectada, usando comparação direta');
  // ... código de login
}

// ✅ SUBSTITUIR POR:
// Sempre usar bcrypt, mesmo se senha não estiver hasheada
if (user.password) {
  try {
    // Tentar comparar com bcrypt primeiro
    const isValid = await bcrypt.compare(password, user.password);
    
    if (isValid) {
      // Login bem-sucedido
      const token = jwt.sign({ ... }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { ... } });
    }
    
    // Se não passou, senha está incorreta
    console.log('❌ [login] Senha incorreta para:', user.email);
  } catch (bcryptError) {
    // Se bcrypt falhar, pode ser senha antiga sem hash
    // Neste caso, hash a senha antiga e atualize no banco
    console.warn('⚠️ [login] Senha sem hash detectada, atualizando...');
    
    const hashed = await bcrypt.hash(user.password, 10);
    
    // Atualizar senha no banco
    if (usePostgreSQL) {
      await repo.updateUser(user.id, { password: hashed });
    } else if (db && db.users) {
      const u = db.users.find(x => x.id === user.id);
      if (u) {
        u.password = hashed;
        u.updated_at = new Date().toISOString();
        if (saveDatabaseDebounced) saveDatabaseDebounced(db);
      }
    }
    
    // Agora tentar comparar novamente
    const isValid = await bcrypt.compare(password, hashed);
    if (isValid) {
      const token = jwt.sign({ ... }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { ... } });
    }
  }
}
```

---

## 🔴 2. Validação de JWT_SECRET Obrigatório

### Problema
JWT_SECRET padrão 'dev-secret' permite forjar tokens.

### Solução

**Arquivo**: `backend/server.js` (no início, após imports)

```javascript
// ✅ ADICIONAR VALIDAÇÃO
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERRO CRÍTICO: JWT_SECRET não configurado!');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // Encerrar em produção
  }
  console.warn('⚠️ Usando JWT_SECRET padrão (APENAS DESENVOLVIMENTO)');
}

if (JWT_SECRET === 'dev-secret' && process.env.NODE_ENV === 'production') {
  console.error('❌ ERRO CRÍTICO: JWT_SECRET padrão em produção!');
  process.exit(1);
}

const FINAL_JWT_SECRET = JWT_SECRET || 'dev-secret'; // Só para dev
```

**Arquivo**: `.env.example`

```env
# ✅ OBRIGATÓRIO EM PRODUÇÃO
JWT_SECRET=seu_secret_super_seguro_aqui_minimo_32_caracteres
```

---

## 🔴 3. Rate Limiting para Login

### Problema
Sem proteção contra brute force.

### Solução

**Instalar dependência**:
```bash
cd backend
npm install express-rate-limit
```

**Arquivo**: `backend/middlewares/rateLimit.js` (NOVO)

```javascript
import rateLimit from 'express-rate-limit';

// Rate limit para login (5 tentativas por 15 minutos)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false,
  // Usar IP do cliente
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

// Rate limit geral para API (100 requisições por 15 minutos)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições. Tente novamente mais tarde.'
});
```

**Arquivo**: `backend/server.js`

```javascript
import { loginLimiter, apiLimiter } from './middlewares/rateLimit.js';

// ✅ APLICAR RATE LIMIT
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // ... código existente de login
});

// Rate limit geral (aplicar após rotas públicas)
app.use('/api', apiLimiter);
```

---

## 🔴 4. Validação de Entrada com Zod

### Problema
Sem validação de dados de entrada.

### Solução

**Instalar dependência**:
```bash
cd backend
npm install zod
```

**Arquivo**: `backend/middlewares/validation.js` (NOVO)

```javascript
import { z } from 'zod';

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
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

// Schemas comuns
export const schemas = {
  login: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
  }),
  
  createSubscriber: z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    plan: z.enum(['basic', 'premium', 'pro', 'admin', 'custom'], {
      errorMap: () => ({ message: 'Plano inválido' })
    }),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    permissions: z.record(z.any()).optional()
  }),
  
  updateSubscriber: z.object({
    email: z.string().email().optional(),
    name: z.string().min(3).optional(),
    plan: z.enum(['basic', 'premium', 'pro', 'admin', 'custom']).optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'expired']).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    permissions: z.record(z.any()).optional()
  })
};
```

**Arquivo**: `backend/server.js`

```javascript
import { validate, schemas } from './middlewares/validation.js';

// ✅ APLICAR VALIDAÇÃO
app.post('/api/auth/login', loginLimiter, validate(schemas.login), async (req, res) => {
  // req.body já está validado aqui
  const { email, password } = req.body;
  // ... resto do código
});

// Na função createSubscriber
if (name === 'createSubscriber') {
  // Validar antes de processar
  const validated = schemas.createSubscriber.parse(data);
  // ... usar validated em vez de data
}
```

---

## 🟡 5. Paginação em Listagens

### Problema
Queries retornam todos os registros, causando lentidão.

### Solução

**Arquivo**: `backend/db/repository.js`

```javascript
export async function listEntities(
  entityType, 
  filters = {}, 
  orderBy = null, 
  user = null,
  pagination = {}
) {
  try {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;
    const subscriberEmail = getSubscriberEmail(user);
    
    // Query principal com paginação
    let sql = `
      SELECT id, data, created_at, updated_at
      FROM entities
      WHERE entity_type = $1
    `;
    const params = [entityType];
    
    // Filtro por assinante
    if (subscriberEmail) {
      sql += ` AND subscriber_email = $${params.length + 1}`;
      params.push(subscriberEmail);
    } else if (user?.is_master) {
      sql += ` AND subscriber_email IS NULL`;
    }
    
    // Aplicar filtros
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === 'null' || value === null) {
          sql += ` AND (data->>$${params.length + 1} IS NULL)`;
          params.push(key);
        } else {
          sql += ` AND data->>$${params.length + 1} = $${params.length + 2}`;
          params.push(key, String(value));
        }
      });
    }
    
    // Ordenação
    if (orderBy) {
      const direction = orderBy.startsWith('-') ? 'DESC' : 'ASC';
      const field = orderBy.replace(/^-/, '');
      sql += ` ORDER BY data->>$${params.length + 1} ${direction}`;
      params.push(field);
    } else {
      sql += ` ORDER BY created_at DESC`;
    }
    
    // ✅ PAGINAÇÃO
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    // Query de contagem (para total)
    let countSql = `
      SELECT COUNT(*) as total
      FROM entities
      WHERE entity_type = $1
    `;
    const countParams = [entityType];
    
    if (subscriberEmail) {
      countSql += ` AND subscriber_email = $${countParams.length + 1}`;
      countParams.push(subscriberEmail);
    } else if (user?.is_master) {
      countSql += ` AND subscriber_email IS NULL`;
    }
    
    // Aplicar mesmos filtros na contagem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === 'null' || value === null) {
          countSql += ` AND (data->>$${countParams.length + 1} IS NULL)`;
          countParams.push(key);
        } else {
          countSql += ` AND data->>$${countParams.length + 1} = $${countParams.length + 2}`;
          countParams.push(key, String(value));
        }
      });
    }
    
    // Executar queries
    const [result, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    return {
      items: result.rows.map(row => ({
        id: row.id.toString(),
        ...row.data,
        created_at: row.created_at,
        updated_at: row.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error(`Erro ao listar ${entityType}:`, error);
    throw error;
  }
}
```

**Arquivo**: `backend/server.js` (rota GET entities)

```javascript
app.get('/api/entities/:entity', authenticate, async (req, res) => {
  try {
    const { entity } = req.params;
    const { order_by, as_subscriber, page, limit, ...filters } = req.query;
    
    // ✅ PAGINAÇÃO
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    };
    
    let result;
    if (usePostgreSQL) {
      result = await repo.listEntities(entity, filters, order_by, req.user, pagination);
    } else {
      // Fallback JSON também precisa de paginação
      // ... implementar similar
    }
    
    // Retornar com paginação
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar entidades:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});
```

---

## 🟡 6. WebSockets para Atualizações em Tempo Real

### Problema
Polling a cada 3 segundos sobrecarrega o servidor.

### Solução

**Instalar dependência**:
```bash
cd backend
npm install socket.io
```

**Arquivo**: `backend/services/websocket.js` (NOVO)

```javascript
import { Server } from 'socket.io';

let io = null;

export function setupWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);
    
    // Cliente se inscreve para receber atualizações de pedidos
    socket.on('subscribe:orders', (subscriberEmail) => {
      socket.join(`orders:${subscriberEmail}`);
      console.log(`📦 Cliente ${socket.id} inscrito em orders:${subscriberEmail}`);
    });
    
    // Cliente se desinscreve
    socket.on('unsubscribe:orders', (subscriberEmail) => {
      socket.leave(`orders:${subscriberEmail}`);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Cliente desconectado:', socket.id);
    });
  });
  
  return io;
}

export function emitOrderUpdate(order) {
  if (!io) return;
  
  const subscriberEmail = order.owner_email || order.subscriber_email;
  if (subscriberEmail) {
    io.to(`orders:${subscriberEmail}`).emit('order:updated', order);
    console.log(`📤 Emitido order:updated para ${subscriberEmail}`);
  }
}

export function emitOrderCreated(order) {
  if (!io) return;
  
  const subscriberEmail = order.owner_email || order.subscriber_email;
  if (subscriberEmail) {
    io.to(`orders:${subscriberEmail}`).emit('order:created', order);
    console.log(`📤 Emitido order:created para ${subscriberEmail}`);
  }
}
```

**Arquivo**: `backend/server.js`

```javascript
import http from 'http';
import { setupWebSocket, emitOrderUpdate, emitOrderCreated } from './services/websocket.js';

// Criar servidor HTTP
const server = http.createServer(app);

// ✅ CONFIGURAR WEBSOCKETS
const io = setupWebSocket(server);

// Quando um pedido é atualizado
app.put('/api/entities/Order/:id', authenticate, async (req, res) => {
  // ... código existente de atualização
  
  // ✅ EMITIR ATUALIZAÇÃO VIA WEBSOCKET
  emitOrderUpdate(updatedItem);
  
  res.json(updatedItem);
});

// Quando um pedido é criado
app.post('/api/entities/Order', authenticate, async (req, res) => {
  // ... código existente de criação
  
  // ✅ EMITIR CRIAÇÃO VIA WEBSOCKET
  emitOrderCreated(newItem);
  
  res.status(201).json(newItem);
});

// ✅ USAR SERVER HTTP EM VEZ DE APP.LISTEN
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 http://localhost:${PORT}/api`);
});
```

**Frontend**: `src/hooks/useWebSocket.js` (NOVO)

```javascript
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function useWebSocket(subscriberEmail, onOrderUpdate) {
  const socketRef = useRef(null);
  
  useEffect(() => {
    if (!subscriberEmail) return;
    
    // Conectar
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true
    });
    
    const socket = socketRef.current;
    
    // Inscrever em atualizações
    socket.emit('subscribe:orders', subscriberEmail);
    
    // Ouvir atualizações
    socket.on('order:updated', (order) => {
      console.log('📦 Pedido atualizado via WebSocket:', order);
      onOrderUpdate?.(order);
    });
    
    socket.on('order:created', (order) => {
      console.log('📦 Novo pedido via WebSocket:', order);
      onOrderUpdate?.(order);
    });
    
    // Cleanup
    return () => {
      socket.emit('unsubscribe:orders', subscriberEmail);
      socket.disconnect();
    };
  }, [subscriberEmail, onOrderUpdate]);
  
  return socketRef.current;
}
```

**Uso no componente**: `src/pages/GestorPedidos.jsx`

```javascript
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';

export default function GestorPedidos() {
  const queryClient = useQueryClient();
  const { user } = usePermission();
  
  // ✅ USAR WEBSOCKET EM VEZ DE POLLING
  useWebSocket(user?.subscriber_email || user?.email, (order) => {
    // Invalidar cache para forçar refetch
    queryClient.invalidateQueries(['gestorOrders']);
  });
  
  // ✅ REMOVER refetchInterval
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['gestorOrders'],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list('-created_date');
      return allOrders.filter(order => {
        const isPDV = order.order_code?.startsWith('PDV-');
        const isBalcao = order.delivery_method === 'balcao';
        return !isPDV && !isBalcao;
      });
    },
    // ❌ REMOVER: refetchInterval: 3000,
  });
  
  // ... resto do código
}
```

---

## 🟡 7. Tratamento de Erros Centralizado

### Problema
Erros tratados de forma inconsistente.

### Solução

**Arquivo**: `backend/middlewares/errorHandler.js` (NOVO)

```javascript
export function errorHandler(err, req, res, next) {
  console.error('❌ Erro:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Erro de validação
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors
    });
  }
  
  // Erro de autenticação
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }
  
  // Erro de banco de dados
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Registro já existe'
    });
  }
  
  // Erro genérico
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor'
    : err.message;
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
}

// Wrapper para async handlers
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Arquivo**: `backend/server.js`

```javascript
import { errorHandler, asyncHandler } from './middlewares/errorHandler.js';

// ✅ APLICAR EM TODAS AS ROTAS
app.post('/api/auth/login', 
  loginLimiter, 
  validate(schemas.login), 
  asyncHandler(async (req, res) => {
    // ... código de login
  })
);

// ✅ ADICIONAR NO FINAL (antes de server.listen)
app.use(errorHandler);
```

---

## 📝 Checklist de Implementação

Use este checklist para acompanhar o progresso:

### Segurança
- [ ] Remover comparação direta de senhas
- [ ] Validar JWT_SECRET obrigatório
- [ ] Implementar rate limiting
- [ ] Adicionar validação com Zod
- [ ] Sanitizar logs

### Performance
- [ ] Implementar paginação
- [ ] Configurar WebSockets
- [ ] Otimizar React Query cache
- [ ] Adicionar índices no banco

### Qualidade
- [ ] Tratamento de erros centralizado
- [ ] Refatorar server.js
- [ ] Adicionar testes básicos

---

## 🚀 Ordem Recomendada de Implementação

1. **Dia 1-2**: Segurança crítica (senhas, JWT_SECRET)
2. **Dia 3-4**: Rate limiting e validação
3. **Semana 2**: Paginação
4. **Semana 3**: WebSockets
5. **Semana 4**: Refatoração e testes

---

*Guia criado em: ${new Date().toLocaleDateString('pt-BR')}*
