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
  theme,
  loading,
  stockUtils,
  formatCurrency,
  slug = null,
  gridColsDesktop = null,
  autoplayIntervalMs = null,
  menuCardStyle = 'solid',
  beverageHintMap = {}
}) {
  const commonProps = {
    dishes,
    onDishClick,
    primaryColor,
    textPrimaryColor,
    textSecondaryColor,
    theme,
    loading,
    stockUtils,
    formatCurrency,
    slug,
    gridColsDesktop,
    autoplayIntervalMs,
    menuCardStyle,
    beverageHintMap
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
