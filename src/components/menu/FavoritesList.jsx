import React from 'react';
import { Heart, X, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/useFavorites';
import { formatCurrency } from '@/components/utils/formatters';

export default function FavoritesList({ 
  dishes = [], 
  onDishClick, 
  onRemoveFavorite,
  slug = null,
  primaryColor = '#f97316' 
}) {
  const { favorites, removeFavorite, isFavorite } = useFavorites(slug);

  const favoriteDishes = dishes.filter(dish => 
    favorites.some(f => f.id === dish.id)
  );

  if (favoriteDishes.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhum prato favorito ainda</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Clique no coração nos pratos para adicionar aos favoritos
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {favoriteDishes.map((dish) => (
        <motion.div
          key={dish.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
            {dish.image && (
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={dish.image} 
                  alt={dish.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-white/90 hover:bg-white rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(dish.id);
                      if (onRemoveFavorite) onRemoveFavorite(dish.id);
                    }}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                {dish.is_new && (
                  <Badge className="absolute top-2 left-2 bg-green-500 text-white">
                    Novo
                  </Badge>
                )}
                {dish.is_popular && (
                  <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                    Popular
                  </Badge>
                )}
              </div>
            )}
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">{dish.name}</h3>
              {dish.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {dish.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(dish.price || 0)}
                </span>
                <Button
                  size="sm"
                  onClick={() => onDishClick(dish)}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
