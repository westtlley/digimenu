import React from 'react';
import GridLayout from './layouts/GridLayout';
import ListLayout from './layouts/ListLayout';
import CarouselLayout from './layouts/CarouselLayout';
import MagazineLayout from './layouts/MagazineLayout';
import MasonryLayout from './layouts/MasonryLayout';

export default function MenuLayoutWrapper({ 
  layout = 'grid',
  dishes,
  onDishClick,
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  loading,
  stockUtils,
  formatCurrency,
  slug = null
}) {
  const commonProps = {
    dishes,
    onDishClick,
    primaryColor,
    textPrimaryColor,
    textSecondaryColor,
    loading,
    stockUtils,
    formatCurrency,
    slug
  };

  switch (layout) {
    case 'list':
      return <ListLayout {...commonProps} />;
    case 'carousel':
      return <CarouselLayout {...commonProps} />;
    case 'magazine':
      return <MagazineLayout {...commonProps} />;
    case 'masonry':
      return <MasonryLayout {...commonProps} />;
    case 'grid':
    default:
      return <GridLayout {...commonProps} />;
  }
}
