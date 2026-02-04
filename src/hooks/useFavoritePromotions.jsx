import { useEffect, useRef } from 'react';
import { useFavorites } from './useFavorites';
import toast from 'react-hot-toast';

/**
 * Hook para detectar quando pratos favoritos entram em promoção
 */
export function useFavoritePromotions(dishes = [], customerEmail, customerPhone, slug) {
  const { favorites, isFavorite } = useFavorites(slug);
  const previousPricesRef = useRef({});

  useEffect(() => {
    if (!dishes.length || !favorites.length) return;

    // Verificar cada prato favorito
    favorites.forEach(fav => {
      const dish = dishes.find(d => d.id === fav.id);
      if (!dish) return;

      const previousPrice = previousPricesRef.current[dish.id];
      const currentPrice = dish.price;
      const originalPrice = dish.original_price || dish.price;

      // Detectar promoção (preço atual menor que original)
      const isOnSale = originalPrice > currentPrice;
      const wasOnSale = previousPrice && previousPrice.originalPrice > previousPrice.currentPrice;

      // Se entrou em promoção agora (não estava antes)
      if (isOnSale && !wasOnSale && isFavorite(dish.id)) {
        // Emitir notificação via WebSocket (se disponível)
        if (customerEmail || customerPhone) {
          try {
            // Tentar emitir via WebSocket
            const socket = window.socket; // Será definido pelo useWebSocket
            if (socket && socket.connected) {
              socket.emit('favorite:promotion', dish);
            }
          } catch (e) {
            console.log('WebSocket não disponível para notificação de promoção');
          }

          // Notificação local
          toast.custom((t) => (
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-lg shadow-xl flex items-center gap-3">
              <span className="text-2xl">💝</span>
              <div>
                <p className="font-bold">Seu Favorito Está em Promoção!</p>
                <p className="text-sm opacity-90">{dish.name}</p>
                <p className="text-xs opacity-75">
                  De {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)} 
                  {' '}por {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPrice)}
                </p>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="ml-auto text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          ), { duration: 8000 });
        }
      }

      // Atualizar preço anterior
      previousPricesRef.current[dish.id] = {
        currentPrice,
        originalPrice
      };
    });
  }, [dishes, favorites, customerEmail, customerPhone, isFavorite]);
}
