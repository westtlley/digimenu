import React from 'react';
import DishCardWow from '../DishCardWow';
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3 lg:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <DishSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3 lg:gap-4">
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        const isLowStock = stockUtils?.isLowStock?.(dish.stock);
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
