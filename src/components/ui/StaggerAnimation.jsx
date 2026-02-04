import React from 'react';
import { motion } from 'framer-motion';

/**
 * StaggerAnimation - Animações de entrada escalonadas
 * Usado para listas e grids onde os itens aparecem sequencialmente
 */
export function StaggerAnimation({ 
  children, 
  className = '',
  staggerDelay = 0.05,
  initialDelay = 0,
  duration = 0.3
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay
          }
        }
      }}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  transition: { duration }
                }
              }}
            >
              {child}
            </motion.div>
          );
        }
        return child;
      })}
    </motion.div>
  );
}

/**
 * StaggerItem - Item individual para animação escalonada
 */
export function StaggerItem({ 
  children, 
  className = '',
  delay = 0,
  duration = 0.3
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration }}
    >
      {children}
    </motion.div>
  );
}
