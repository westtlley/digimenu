import React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * Enhanced Button Component
 * Botão melhorado com animações e efeitos visuais
 */
export default function EnhancedButton({
  children,
  variant = 'default',
  size = 'default',
  className,
  onClick,
  disabled,
  loading,
  icon: Icon,
  iconPosition = 'left',
  ripple = true,
  ...props
}) {
  const handleClick = (e) => {
    if (ripple && !disabled && !loading) {
      const button = e.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add('absolute', 'rounded-full', 'bg-white/30', 'animate-ping', 'pointer-events-none');
      ripple.style.transform = 'scale(0)';
      ripple.style.transition = 'transform 0.6s ease-out';
      
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.style.transform = 'scale(4)';
        ripple.style.opacity = '0';
      }, 10);
      
      setTimeout(() => ripple.remove(), 600);
    }
    
    if (onClick) onClick(e);
  };

  const baseClasses = cn(
    'relative overflow-hidden font-semibold transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    variant === 'primary' && 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl focus:ring-orange-500',
    variant === 'default' && 'bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg focus:ring-gray-500',
    variant === 'outline' && 'border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 focus:ring-gray-500',
    variant === 'ghost' && 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
    size === 'sm' && 'h-8 px-3 text-sm',
    size === 'default' && 'h-10 px-4 text-base',
    size === 'lg' && 'h-12 px-6 text-lg',
    (disabled || loading) && 'opacity-50 cursor-not-allowed',
    className
  );

  return (
    <motion.div
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
    >
      <Button
        className={baseClasses}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 mr-2" />}
            {children}
            {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 ml-2" />}
          </>
        )}
      </Button>
    </motion.div>
  );
}
