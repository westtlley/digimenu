import React from 'react';
import DishCardWow from '../DishCardWow';
import BeverageCard from '../BeverageCard';
import DishSkeleton from '../DishSkeleton';

export default function GridLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  loading = false,
  stockUtils,
  slug = null
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-3 lg:gap-3 xl:gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <DishSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-3 lg:gap-3 xl:gap-3">
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        const isLowStock = stockUtils?.isLowStock?.(dish.stock);
        
        // Se for bebida, usar BeverageCard
        if (dish.product_type === 'beverage') {
          return (
            <BeverageCard
              key={dish.id}
              beverage={dish}
              onClick={onDishClick}
              index={index}
              isOutOfStock={isOutOfStock}
              primaryColor="#06b6d4"
              textPrimaryColor="#06b6d4"
            />
          );
        }
        
        // Caso contrário, usar DishCardWow normal
        return (
          <DishCardWow
            key={dish.id}
            dish={dish}
            onClick={onDishClick}
            index={index}
            isOutOfStock={isOutOfStock}
            isLowStock={isLowStock}
            primaryColor={primaryColor}
            textPrimaryColor={textPrimaryColor}
            slug={slug}
          />
        );
      })}
    </div>
  );
}
