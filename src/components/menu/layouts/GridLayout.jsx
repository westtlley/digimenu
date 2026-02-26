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
  slug = null,
  gridColsDesktop = null
}) {
  const itemsCount = Array.isArray(dishes) ? dishes.length : 0;

  const gridDesktopColsClass =
    itemsCount === 1
      ? 'lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-1'
      : itemsCount === 2
        ? 'lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2'
        : itemsCount === 3
          ? 'lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3'
          : Number(gridColsDesktop) === 2
            ? 'lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2'
            : Number(gridColsDesktop) === 3
              ? 'lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3'
              : Number(gridColsDesktop) === 4
                ? 'lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4'
                : Number(gridColsDesktop) === 5
                  ? 'lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5'
                  : 'lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  const gridClassName = `grid grid-cols-2 md:grid-cols-3 ${gridDesktopColsClass} gap-4 md:gap-3 lg:gap-3 xl:gap-3`;

  const gridWrapperClassName =
    itemsCount > 0 && itemsCount <= 3
      ? 'lg:max-w-5xl lg:mx-auto'
      : undefined;

  if (loading) {
    return (
      <div className={gridWrapperClassName}>
        <div className={gridClassName}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <DishSkeleton key={i} />
        ))}
        </div>
      </div>
    );
  }

  return (
    <div className={gridWrapperClassName}>
      <div className={gridClassName}>
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
    </div>
  );
}
