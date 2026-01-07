import React from 'react';

/**
 * PriceDisplay - Componente para exibição formatada de preços
 * @param {Object} props
 * @param {number} props.value - Valor do preço
 * @param {number} props.originalValue - Valor original (para exibir desconto)
 * @param {string} props.size - Tamanho (sm, md, lg)
 * @param {string} props.className - Classes CSS adicionais
 */
export function PriceDisplay({ 
  value, 
  originalValue, 
  size = 'md', 
  className = '' 
}) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(val || 0);
  };

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const hasDiscount = originalValue && originalValue > value;

  return (
    <div className={className}>
      {hasDiscount && (
        <span className="text-xs text-gray-400 line-through block">
          {formatCurrency(originalValue)}
        </span>
      )}
      <span className={`font-bold ${sizes[size]} ${hasDiscount ? 'text-green-600' : ''}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}