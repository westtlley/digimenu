import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * RippleEffect - Efeito de ripple ao clicar
 * Adiciona feedback visual quando o usuário clica em um elemento
 */
export function RippleEffect({ 
  children, 
  className = '',
  color = 'rgba(255, 255, 255, 0.5)',
  duration = 0.6
}) {
  const [ripples, setRipples] = useState([]);
  const containerRef = useRef(null);

  const handleClick = (e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height);

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size
    };

    setRipples(prev => [...prev, newRipple]);

    // Remover ripple após animação
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, duration * 1000);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration }}
        />
      ))}
    </div>
  );
}

/**
 * RippleButton - Botão com efeito ripple
 */
export function RippleButton({ 
  children, 
  className = '',
  onClick,
  rippleColor = 'rgba(255, 255, 255, 0.5)',
  ...props
}) {
  return (
    <RippleEffect 
      className={`inline-block ${className}`}
      color={rippleColor}
    >
      <button
        onClick={onClick}
        className="relative w-full h-full"
        {...props}
      >
        {children}
      </button>
    </RippleEffect>
  );
}
