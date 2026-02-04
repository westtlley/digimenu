/**
 * Serviço de Notificações Push Web
 * Usa a API de Notificações do navegador
 */

let serviceWorkerRegistration = null;
let pushSubscription = null;

// Registrar Service Worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      serviceWorkerRegistration = registration;
      return registration;
    } catch (error) {
      console.error('Erro ao registrar service worker:', error);
      return null;
    }
  }
  return null;
}

// Solicitar permissão de notificação
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Enviar notificação local
export function sendLocalNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
}

// Notificações de status do pedido
export const orderNotifications = {
  accepted: (orderCode) => {
    return sendLocalNotification('Pedido Aceito! 🎉', {
      body: `Seu pedido #${orderCode} foi aceito e está sendo preparado.`,
      tag: `order-${orderCode}`,
      requireInteraction: false
    });
  },

  preparing: (orderCode) => {
    return sendLocalNotification('Pedido em Preparo 👨‍🍳', {
      body: `Seu pedido #${orderCode} está sendo preparado com carinho!`,
      tag: `order-${orderCode}`,
      requireInteraction: false
    });
  },

  ready: (orderCode) => {
    return sendLocalNotification('Pedido Pronto! ✅', {
      body: `Seu pedido #${orderCode} está pronto para retirada ou entrega.`,
      tag: `order-${orderCode}`,
      requireInteraction: true
    });
  },

  outForDelivery: (orderCode) => {
    return sendLocalNotification('Pedido Saiu para Entrega 🚚', {
      body: `Seu pedido #${orderCode} está a caminho!`,
      tag: `order-${orderCode}`,
      requireInteraction: false
    });
  },

  delivered: (orderCode) => {
    return sendLocalNotification('Pedido Entregue! 🎊', {
      body: `Seu pedido #${orderCode} foi entregue. Obrigado pela preferência!`,
      tag: `order-${orderCode}`,
      requireInteraction: true
    });
  }
};

// Notificações de marketing
export const marketingNotifications = {
  promotion: (title, message) => {
    return sendLocalNotification(title, {
      body: message,
      tag: 'promotion',
      requireInteraction: false
    });
  },

  favoriteOnSale: (dishName) => {
    return sendLocalNotification('Seu Favorito Está em Promoção! 💝', {
      body: `${dishName} está com desconto especial!`,
      tag: 'favorite-sale',
      requireInteraction: true
    });
  }
};

// Monitorar mudanças de status do pedido
export function watchOrderStatus(orderId, orderCode, onStatusChange) {
  // Esta função será chamada quando o status do pedido mudar
  // Pode ser integrada com WebSocket ou polling
  return {
    stop: () => {
      // Parar de monitorar
    }
  };
}

// Notificações de bônus e conquistas
export const bonusNotifications = {
  firstOrder: () => {
    return sendLocalNotification('🎉 Primeira Compra!', {
      body: 'Você ganhou 50 pontos de bônus!',
      tag: 'bonus-first-order',
      requireInteraction: false
    });
  },

  birthday: () => {
    return sendLocalNotification('🎂 Feliz Aniversário!', {
      body: 'Você ganhou 100 pontos de bônus de aniversário!',
      tag: 'bonus-birthday',
      requireInteraction: true
    });
  },

  consecutiveDays: (days, points) => {
    return sendLocalNotification(`🔥 ${days} Dias Consecutivos!`, {
      body: `Parabéns! Você ganhou ${points} pontos de bônus!`,
      tag: `bonus-consecutive-${days}`,
      requireInteraction: false
    });
  },

  review: (isFirst = false) => {
    return sendLocalNotification(isFirst ? '⭐ Primeira Avaliação!' : '⭐ Avaliação Enviada!', {
      body: isFirst 
        ? 'Você ganhou 50 pontos pela primeira avaliação!'
        : 'Você ganhou 20 pontos pela avaliação!',
      tag: 'bonus-review',
      requireInteraction: false
    });
  },

  referral: () => {
    return sendLocalNotification('🎁 Indicação Bem-Sucedida!', {
      body: 'Você e seu amigo ganharam 100 pontos cada!',
      tag: 'bonus-referral',
      requireInteraction: true
    });
  },

  tierUpgrade: (newTier) => {
    return sendLocalNotification(`🏆 Novo Nível: ${newTier}!`, {
      body: `Parabéns! Você alcançou o nível ${newTier}!`,
      tag: `tier-${newTier}`,
      requireInteraction: true
    });
  }
};

// Melhorar notificações com ícones e imagens
export function sendEnhancedNotification(title, options = {}) {
  const defaultOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    image: options.image || null,
    vibrate: [200, 100, 200], // Padrão de vibração
    timestamp: Date.now(),
    ...options
  };

  return sendLocalNotification(title, defaultOptions);
}
