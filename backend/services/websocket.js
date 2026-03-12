import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import * as repo from '../db/repository.js';

let io = null;

const TENANT_ROOM_ACCESS = {
  orders: new Set(['master', 'owner', 'gerente', 'cozinha', 'entregador', 'pdv', 'garcom']),
  comandas: new Set(['master', 'owner', 'gerente', 'garcom']),
  waiter: new Set(['master', 'owner', 'gerente', 'garcom']),
  kitchen: new Set(['master', 'owner', 'gerente', 'cozinha']),
  delivery: new Set(['master', 'owner', 'gerente', 'entregador']),
  tables: new Set(['master', 'owner', 'gerente', 'garcom']),
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase() || null;
}

function normalizePhone(value) {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase() || null;
}

function extractSocketToken(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return String(authToken).replace(/^Bearer\s+/i, '').trim();

  const authorizationHeader = socket.handshake?.headers?.authorization;
  if (authorizationHeader) {
    return String(authorizationHeader).replace(/^Bearer\s+/i, '').trim();
  }

  return null;
}

async function resolveSocketRoles(user) {
  const roles = new Set();

  if (user?.is_master) {
    roles.add('master');
  }

  const rawRole = normalizeRole(user?.role);
  if (rawRole) {
    roles.add(rawRole);
  }

  const profileRole = normalizeRole(user?.profile_role);
  if (profileRole) {
    roles.add(profileRole);
  }

  if (!user?.is_master && !profileRole) {
    roles.add('owner');
  }

  if (user?.subscriber_email) {
    try {
      const collaborators = await repo.listColaboradores(user.subscriber_email);
      collaborators
        .filter((item) => normalizeEmail(item?.email) === normalizeEmail(user?.email))
        .forEach((item) => {
          const itemRole = normalizeRole(item?.profile_role);
          if (itemRole) {
            roles.add(itemRole);
          }
        });
    } catch (error) {
      console.warn('Socket auth: unable to expand collaborator roles:', error.message);
    }
  }

  return Array.from(roles);
}

async function resolveSocketAuth(socket) {
  const token = extractSocketToken(socket);
  if (!token) {
    return {
      isAuthenticated: false,
      isMaster: false,
      userId: null,
      email: null,
      tenantId: null,
      roles: ['public'],
      profileRole: null,
    };
  }

  const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  const decoded = jwt.verify(token, secret);
  const email = normalizeEmail(decoded?.email);
  if (!email) {
    throw new Error('SOCKET_TOKEN_WITHOUT_EMAIL');
  }

  const user = await repo.getUserByEmail(email);
  if (!user) {
    throw new Error('SOCKET_USER_NOT_FOUND');
  }

  const requestedSupportTenant = normalizeEmail(
    socket.handshake?.auth?.asSubscriber ||
      socket.handshake?.query?.as_subscriber ||
      socket.handshake?.query?.asSubscriber
  );

  const isMaster = Boolean(user.is_master);
  const tenantId = isMaster
    ? requestedSupportTenant
    : normalizeEmail(user.subscriber_email || user.email);
  const roles = await resolveSocketRoles(user);

  return {
    isAuthenticated: true,
    isMaster,
    userId: user.id ?? null,
    email,
    tenantId,
    roles,
    profileRole: normalizeRole(user.profile_role),
  };
}

function getSocketTenant(socket) {
  return normalizeEmail(socket.data?.auth?.tenantId);
}

function socketHasRole(socket, allowedRoles = []) {
  const roles = socket.data?.auth?.roles || [];
  return allowedRoles.some((role) => roles.includes(role));
}

function canJoinTenantRoom(socket, roomType) {
  const allowedRoles = TENANT_ROOM_ACCESS[roomType];
  if (!allowedRoles) return false;
  if (!socket.data?.auth?.isAuthenticated) return false;
  const tenantId = getSocketTenant(socket);
  if (!tenantId) return false;
  return socketHasRole(socket, Array.from(allowedRoles));
}

function joinTenantRoom(socket, roomType) {
  if (!canJoinTenantRoom(socket, roomType)) {
    return null;
  }

  const tenantId = getSocketTenant(socket);
  const roomName = `${roomType}:${tenantId}`;
  socket.join(roomName);
  console.log(`Socket ${socket.id} joined ${roomName}`, {
    userId: socket.data?.auth?.userId || null,
    roles: socket.data?.auth?.roles || [],
  });
  return roomName;
}

function leaveTenantRoom(socket, roomType) {
  const tenantId = getSocketTenant(socket);
  if (!tenantId) return;
  socket.leave(`${roomType}:${tenantId}`);
}

function registerTenantSubscription(ioServer, eventName, roomType) {
  ioServer.on('connection', (socket) => {
    socket.on(eventName, () => {
      if (!joinTenantRoom(socket, roomType)) {
        socket.emit('socket:error', {
          code: socket.data?.auth?.isAuthenticated ? 'SOCKET_ROOM_FORBIDDEN' : 'SOCKET_AUTH_REQUIRED',
          roomType,
        });
      }
    });

    socket.on(eventName.replace('subscribe', 'unsubscribe'), () => {
      leaveTenantRoom(socket, roomType);
    });
  });
}

function joinCustomerRooms(socket, data = {}) {
  const customerEmail = normalizeEmail(data.customerEmail);
  const customerPhone = normalizePhone(data.customerPhone);

  if (customerEmail) {
    socket.join(`customer:${customerEmail}`);
    socket.join(`comanda:customer:${customerEmail}`);
  }

  if (customerPhone) {
    socket.join(`customer:phone:${customerPhone}`);
    socket.join(`comanda:customer:phone:${customerPhone}`);
  }
}

function leaveCustomerRooms(socket, data = {}) {
  const customerEmail = normalizeEmail(data.customerEmail);
  const customerPhone = normalizePhone(data.customerPhone);

  if (customerEmail) {
    socket.leave(`customer:${customerEmail}`);
    socket.leave(`comanda:customer:${customerEmail}`);
  }

  if (customerPhone) {
    socket.leave(`customer:phone:${customerPhone}`);
    socket.leave(`comanda:customer:phone:${customerPhone}`);
  }
}

function joinTableRooms(socket, data = {}) {
  const tableId = String(data.tableId || '').trim();
  const tableNumber = String(data.tableNumber || '').trim();

  if (tableId) {
    socket.join(`table:${tableId}`);
  }

  if (tableNumber) {
    socket.join(`table:number:${tableNumber}`);
  }
}

function leaveTableRooms(socket, data = {}) {
  const tableId = String(data.tableId || '').trim();
  const tableNumber = String(data.tableNumber || '').trim();

  if (tableId) {
    socket.leave(`table:${tableId}`);
  }

  if (tableNumber) {
    socket.leave(`table:number:${tableNumber}`);
  }
}

function emitTenantScoped(eventName, tenantId, payload, roomTypes = []) {
  if (!io || !tenantId) return;

  const uniqueRoomTypes = new Set(roomTypes);
  uniqueRoomTypes.forEach((roomType) => {
    io.to(`${roomType}:${tenantId}`).emit(eventName, payload);
  });
}

/**
 * Configura WebSocket para atualizacoes em tempo real
 */
export function setupWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      socket.data.auth = await resolveSocketAuth(socket);
      next();
    } catch (error) {
      console.warn('Socket auth failed:', error.message);
      next(new Error('SOCKET_AUTH_FAILED'));
    }
  });

  io.on('connection', (socket) => {
    const auth = socket.data?.auth || {};
    console.log('WebSocket client connected:', socket.id, {
      authenticated: auth.isAuthenticated === true,
      tenantId: auth.tenantId || null,
      roles: auth.roles || [],
    });

    socket.on('subscribe:orders', (data = {}) => {
      if (!joinTenantRoom(socket, 'orders') && data?.subscriberEmail) {
        socket.emit('socket:error', {
          code: socket.data?.auth?.isAuthenticated ? 'SOCKET_ROOM_FORBIDDEN' : 'SOCKET_AUTH_REQUIRED',
          roomType: 'orders',
        });
      }

      joinCustomerRooms(socket, data);
    });

    socket.on('unsubscribe:orders', (data = {}) => {
      leaveTenantRoom(socket, 'orders');
      leaveCustomerRooms(socket, data);
    });

    socket.on('subscribe:comandas', (data = {}) => {
      if (!joinTenantRoom(socket, 'comandas') && data?.subscriberEmail) {
        socket.emit('socket:error', {
          code: socket.data?.auth?.isAuthenticated ? 'SOCKET_ROOM_FORBIDDEN' : 'SOCKET_AUTH_REQUIRED',
          roomType: 'comandas',
        });
      }

      joinTableRooms(socket, data);
      joinCustomerRooms(socket, data);
    });

    socket.on('unsubscribe:comandas', (data = {}) => {
      leaveTenantRoom(socket, 'comandas');
      leaveTableRooms(socket, data);
      leaveCustomerRooms(socket, data);
    });

    socket.on('subscribe:waiter', () => {
      const joined = joinTenantRoom(socket, 'waiter');
      if (!joined) {
        socket.emit('socket:error', {
          code: socket.data?.auth?.isAuthenticated ? 'SOCKET_ROOM_FORBIDDEN' : 'SOCKET_AUTH_REQUIRED',
          roomType: 'waiter',
        });
        return;
      }

      const waiterEmail = normalizeEmail(socket.data?.auth?.email);
      if (waiterEmail) {
        socket.join(`waiter:email:${waiterEmail}`);
      }
    });

    socket.on('unsubscribe:waiter', () => {
      leaveTenantRoom(socket, 'waiter');
      const waiterEmail = normalizeEmail(socket.data?.auth?.email);
      if (waiterEmail) {
        socket.leave(`waiter:email:${waiterEmail}`);
      }
    });

    socket.on('subscribe:tables', () => {
      if (!joinTenantRoom(socket, 'tables')) {
        socket.emit('socket:error', {
          code: socket.data?.auth?.isAuthenticated ? 'SOCKET_ROOM_FORBIDDEN' : 'SOCKET_AUTH_REQUIRED',
          roomType: 'tables',
        });
      }
    });

    socket.on('unsubscribe:tables', () => {
      leaveTenantRoom(socket, 'tables');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket client disconnected:', socket.id);
    });
  });

  registerTenantSubscription(io, 'subscribe:kitchen', 'kitchen');
  registerTenantSubscription(io, 'subscribe:delivery', 'delivery');

  return io;
}

/**
 * Emitir atualizacao de pedido
 */
export function emitOrderUpdate(order) {
  if (!io) return;

  const subscriberEmail = normalizeEmail(order.owner_email || order.subscriber_email);
  const customerEmail = normalizeEmail(order.customer_email);
  const customerPhone = normalizePhone(order.customer_phone);

  emitTenantScoped('order:updated', subscriberEmail, order, ['orders', 'kitchen', 'delivery']);

  if (customerEmail) {
    io.to(`customer:${customerEmail}`).emit('order:updated', order);
  }

  if (customerPhone) {
    io.to(`customer:phone:${customerPhone}`).emit('order:updated', order);
  }
}

/**
 * Emitir novo pedido criado
 */
export function emitOrderCreated(order) {
  if (!io) return;

  const subscriberEmail = normalizeEmail(order.owner_email || order.subscriber_email);
  emitTenantScoped('order:created', subscriberEmail, order, ['orders', 'kitchen', 'delivery']);
}

/**
 * Emitir promocao de prato favorito
 */
export function emitFavoritePromotion(customerEmail, customerPhone, dish) {
  if (!io) return;

  const normalizedEmail = normalizeEmail(customerEmail);
  const normalizedPhone = normalizePhone(customerPhone);

  if (normalizedEmail) {
    io.to(`customer:${normalizedEmail}`).emit('favorite:promotion', dish);
  }

  if (normalizedPhone) {
    io.to(`customer:phone:${normalizedPhone}`).emit('favorite:promotion', dish);
  }
}

/**
 * Emitir atualizacao de comanda
 */
export function emitComandaUpdate(comanda) {
  if (!io) return;

  const subscriberEmail = normalizeEmail(comanda.owner_email || comanda.subscriber_email);
  const customerEmail = normalizeEmail(comanda.customer_email);
  const customerPhone = normalizePhone(comanda.customer_phone);
  const tableId = String(comanda.table_id || '').trim();
  const tableNumber = String(comanda.table_number || comanda.table_name || '').trim();

  emitTenantScoped('comanda:updated', subscriberEmail, comanda, ['comandas']);

  if (tableId) {
    io.to(`table:${tableId}`).emit('comanda:updated', comanda);
  }

  if (tableNumber) {
    io.to(`table:number:${tableNumber}`).emit('comanda:updated', comanda);
  }

  if (customerEmail) {
    io.to(`comanda:customer:${customerEmail}`).emit('comanda:updated', comanda);
  }

  if (customerPhone) {
    io.to(`comanda:customer:phone:${customerPhone}`).emit('comanda:updated', comanda);
  }
}

/**
 * Emitir nova comanda criada
 */
export function emitComandaCreated(comanda) {
  if (!io) return;

  const subscriberEmail = normalizeEmail(comanda.owner_email || comanda.subscriber_email);
  const tableId = String(comanda.table_id || '').trim();
  const tableNumber = String(comanda.table_number || comanda.table_name || '').trim();

  emitTenantScoped('comanda:created', subscriberEmail, comanda, ['comandas']);

  if (tableId) {
    io.to(`table:${tableId}`).emit('comanda:created', comanda);
  }

  if (tableNumber) {
    io.to(`table:number:${tableNumber}`).emit('comanda:created', comanda);
  }
}

/**
 * Emitir chamada de garcom
 */
export function emitWaiterCall(call) {
  if (!io) return;

  const subscriberEmail = normalizeEmail(call.subscriber_email || call.owner_email);
  const tableId = String(call.table_id || '').trim();
  const tableNumber = String(call.table_number || '').trim();

  emitTenantScoped('waiter:call', subscriberEmail, call, ['waiter']);

  if (tableId) {
    io.to(`table:${tableId}`).emit('waiter:called', call);
  }

  if (tableNumber) {
    io.to(`table:number:${tableNumber}`).emit('waiter:called', call);
  }
}

/**
 * Emitir atualizacao de status de mesa
 */
export function emitTableUpdate(table) {
  if (!io) return;

  const subscriberEmail = normalizeEmail(table.owner_email || table.subscriber_email);

  emitTenantScoped('table:updated', subscriberEmail, table, ['tables']);

  if (table.id) {
    io.to(`table:${table.id}`).emit('table:status:updated', table);
  }
}

/**
 * Obter instancia do io (para uso em outros modulos)
 */
export function getIO() {
  return io;
}
