import { Server } from 'socket.io';

let io = null;

/**
 * Configura WebSocket para atualizações em tempo real
 */
export function setupWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });
  
  io.on('connection', (socket) => {
    console.log('✅ Cliente WebSocket conectado:', socket.id);
    
    // Cliente se inscreve para receber atualizações de pedidos
    socket.on('subscribe:orders', (data) => {
      const { subscriberEmail, customerEmail, customerPhone } = data || {};
      
      if (subscriberEmail) {
        socket.join(`orders:${subscriberEmail}`);
        console.log(`📦 Cliente ${socket.id} inscrito em orders:${subscriberEmail}`);
      }
      
      // Cliente também pode se inscrever para receber atualizações dos seus próprios pedidos
      if (customerEmail) {
        socket.join(`customer:${customerEmail}`);
        console.log(`👤 Cliente ${socket.id} inscrito em customer:${customerEmail}`);
      }
      
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        socket.join(`customer:phone:${cleanPhone}`);
        console.log(`📱 Cliente ${socket.id} inscrito em customer:phone:${cleanPhone}`);
      }
    });
    
    // Cliente se inscreve para receber atualizações de comandas
    socket.on('subscribe:comandas', (data) => {
      const { subscriberEmail, customerEmail, customerPhone, tableId, tableNumber } = data || {};
      
      if (subscriberEmail) {
        socket.join(`comandas:${subscriberEmail}`);
        console.log(`📋 Cliente ${socket.id} inscrito em comandas:${subscriberEmail}`);
      }
      
      // Inscrição por mesa (para clientes na mesa)
      if (tableId) {
        socket.join(`table:${tableId}`);
        console.log(`🪑 Cliente ${socket.id} inscrito em table:${tableId}`);
      }
      
      if (tableNumber) {
        socket.join(`table:number:${tableNumber}`);
        console.log(`🪑 Cliente ${socket.id} inscrito em table:number:${tableNumber}`);
      }
      
      // Inscrição por cliente
      if (customerEmail) {
        socket.join(`comanda:customer:${customerEmail}`);
        console.log(`👤 Cliente ${socket.id} inscrito em comanda:customer:${customerEmail}`);
      }
      
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        socket.join(`comanda:customer:phone:${cleanPhone}`);
        console.log(`📱 Cliente ${socket.id} inscrito em comanda:customer:phone:${cleanPhone}`);
      }
    });
    
    // Garçom se inscreve para receber chamadas
    socket.on('subscribe:waiter', (data) => {
      const { subscriberEmail, waiterEmail } = data || {};
      
      if (subscriberEmail) {
        socket.join(`waiter:${subscriberEmail}`);
        console.log(`🧑‍🍳 Garçom ${socket.id} inscrito em waiter:${subscriberEmail}`);
      }
      
      if (waiterEmail) {
        socket.join(`waiter:email:${waiterEmail}`);
        console.log(`🧑‍🍳 Garçom ${socket.id} inscrito em waiter:email:${waiterEmail}`);
      }
    });
    
    // Cliente se desinscreve
    socket.on('unsubscribe:orders', (data) => {
      const { subscriberEmail, customerEmail, customerPhone } = data || {};
      
      if (subscriberEmail) {
        socket.leave(`orders:${subscriberEmail}`);
      }
      if (customerEmail) {
        socket.leave(`customer:${customerEmail}`);
      }
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        socket.leave(`customer:phone:${cleanPhone}`);
      }
    });
    
    // Desinscrever de comandas
    socket.on('unsubscribe:comandas', (data) => {
      const { subscriberEmail, tableId, tableNumber, customerEmail, customerPhone } = data || {};
      
      if (subscriberEmail) {
        socket.leave(`comandas:${subscriberEmail}`);
      }
      if (tableId) {
        socket.leave(`table:${tableId}`);
      }
      if (tableNumber) {
        socket.leave(`table:number:${tableNumber}`);
      }
      if (customerEmail) {
        socket.leave(`comanda:customer:${customerEmail}`);
      }
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        socket.leave(`comanda:customer:phone:${cleanPhone}`);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Cliente WebSocket desconectado:', socket.id);
    });
  });
  
  return io;
}

/**
 * Emitir atualização de pedido
 */
export function emitOrderUpdate(order) {
  if (!io) return;
  
  const subscriberEmail = order.owner_email || order.subscriber_email;
  const customerEmail = order.customer_email;
  const customerPhone = order.customer_phone;
  
  // Notificar o restaurante (gestor)
  if (subscriberEmail) {
    io.to(`orders:${subscriberEmail}`).emit('order:updated', order);
    console.log(`📤 Emitido order:updated para restaurante ${subscriberEmail}`);
  }
  
  // Notificar o cliente
  if (customerEmail) {
    io.to(`customer:${customerEmail}`).emit('order:updated', order);
    console.log(`📤 Emitido order:updated para cliente ${customerEmail}`);
  }
  
  if (customerPhone) {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    io.to(`customer:phone:${cleanPhone}`).emit('order:updated', order);
    console.log(`📤 Emitido order:updated para cliente telefone ${cleanPhone}`);
  }
}

/**
 * Emitir novo pedido criado
 */
export function emitOrderCreated(order) {
  if (!io) return;
  
  const subscriberEmail = order.owner_email || order.subscriber_email;
  
  if (subscriberEmail) {
    io.to(`orders:${subscriberEmail}`).emit('order:created', order);
    console.log(`📤 Emitido order:created para ${subscriberEmail}`);
  }
}

/**
 * Emitir promoção de prato favorito
 */
export function emitFavoritePromotion(customerEmail, customerPhone, dish) {
  if (!io) return;
  
  if (customerEmail) {
    io.to(`customer:${customerEmail}`).emit('favorite:promotion', dish);
    console.log(`📤 Emitido favorite:promotion para ${customerEmail}`);
  }
  
  if (customerPhone) {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    io.to(`customer:phone:${cleanPhone}`).emit('favorite:promotion', dish);
    console.log(`📤 Emitido favorite:promotion para telefone ${cleanPhone}`);
  }
}

/**
 * Emitir atualização de comanda
 */
export function emitComandaUpdate(comanda) {
  if (!io) return;
  
  const subscriberEmail = comanda.owner_email || comanda.subscriber_email;
  const customerEmail = comanda.customer_email;
  const customerPhone = comanda.customer_phone;
  const tableId = comanda.table_id;
  const tableNumber = comanda.table_number || comanda.table_name;
  
  // Notificar o restaurante (garçom/admin)
  if (subscriberEmail) {
    io.to(`comandas:${subscriberEmail}`).emit('comanda:updated', comanda);
    console.log(`📤 Emitido comanda:updated para restaurante ${subscriberEmail}`);
  }
  
  // Notificar clientes na mesa
  if (tableId) {
    io.to(`table:${tableId}`).emit('comanda:updated', comanda);
    console.log(`📤 Emitido comanda:updated para mesa ${tableId}`);
  }
  
  if (tableNumber) {
    io.to(`table:number:${tableNumber}`).emit('comanda:updated', comanda);
    console.log(`📤 Emitido comanda:updated para mesa número ${tableNumber}`);
  }
  
  // Notificar o cliente específico
  if (customerEmail) {
    io.to(`comanda:customer:${customerEmail}`).emit('comanda:updated', comanda);
    console.log(`📤 Emitido comanda:updated para cliente ${customerEmail}`);
  }
  
  if (customerPhone) {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    io.to(`comanda:customer:phone:${cleanPhone}`).emit('comanda:updated', comanda);
    console.log(`📤 Emitido comanda:updated para cliente telefone ${cleanPhone}`);
  }
}

/**
 * Emitir nova comanda criada
 */
export function emitComandaCreated(comanda) {
  if (!io) return;
  
  const subscriberEmail = comanda.owner_email || comanda.subscriber_email;
  
  if (subscriberEmail) {
    io.to(`comandas:${subscriberEmail}`).emit('comanda:created', comanda);
    console.log(`📤 Emitido comanda:created para ${subscriberEmail}`);
  }
  
  // Notificar mesa se houver
  if (comanda.table_id) {
    io.to(`table:${comanda.table_id}`).emit('comanda:created', comanda);
  }
  
  if (comanda.table_number || comanda.table_name) {
    io.to(`table:number:${comanda.table_number || comanda.table_name}`).emit('comanda:created', comanda);
  }
}

/**
 * Emitir chamada de garçom
 */
export function emitWaiterCall(call) {
  if (!io) return;
  
  const subscriberEmail = call.subscriber_email || call.owner_email;
  const tableId = call.table_id;
  const tableNumber = call.table_number;
  
  // Notificar todos os garçons do restaurante
  if (subscriberEmail) {
    io.to(`waiter:${subscriberEmail}`).emit('waiter:call', call);
    console.log(`📤 Emitido waiter:call para restaurante ${subscriberEmail}`);
  }
  
  // Notificar mesa que o garçom foi chamado
  if (tableId) {
    io.to(`table:${tableId}`).emit('waiter:called', call);
  }
  
  if (tableNumber) {
    io.to(`table:number:${tableNumber}`).emit('waiter:called', call);
  }
}

/**
 * Emitir atualização de status de mesa
 */
export function emitTableUpdate(table) {
  if (!io) return;
  
  const subscriberEmail = table.owner_email || table.subscriber_email;
  
  if (subscriberEmail) {
    io.to(`tables:${subscriberEmail}`).emit('table:updated', table);
    console.log(`📤 Emitido table:updated para ${subscriberEmail}`);
  }
  
  // Notificar mesa específica
  if (table.id) {
    io.to(`table:${table.id}`).emit('table:status:updated', table);
  }
}

/**
 * Obter instância do io (para uso em outros módulos)
 */
export function getIO() {
  return io;
}
