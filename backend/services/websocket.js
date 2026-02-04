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
 * Obter instância do io (para uso em outros módulos)
 */
export function getIO() {
  return io;
}
