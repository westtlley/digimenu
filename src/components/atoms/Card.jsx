import React from 'react';

/**
 * Card - Componente atômico para container de conteúdo
 * @param {Object} props
 * @param {React.ReactNode} props.children - Conteúdo do card
 * @param {string} props.className - Classes CSS adicionais
 * @param {Function} props.onClick - Callback de clique
 * @param {boolean} props.hover - Se deve ter efeito hover
 */
export function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border ${
        hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`p-4 border-b ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`p-4 border-t ${className}`}>{children}</div>;
}