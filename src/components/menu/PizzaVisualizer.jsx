import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function PizzaVisualizer({ 
  size, 
  selectedFlavors = [], 
  animationsEnabled = true 
}) {
  const slices = size?.slices || 8;
  const hasPremium = selectedFlavors.some(f => f.category === 'premium');
  
  // Calcular ângulo por sabor
  const anglePerFlavor = 360 / selectedFlavors.length;
  
  // Tamanho do SVG baseado no tamanho selecionado
  const sizeMap = {
    4: 200,  // Pequena
    6: 250,  // Média
    8: 300,  // Grande
    12: 350  // Gigante
  };
  
  const svgSize = sizeMap[slices] || 250;
  const radius = svgSize / 2 - 20;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  // Gerar path para cada fatia
  const generateSlicePath = (startAngle, endAngle) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="relative flex items-center justify-center py-6">
      <motion.div
        initial={animationsEnabled ? { scale: 0, rotate: -180 } : {}}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          damping: 15,
          stiffness: 100
        }}
        className="relative"
        style={{ width: svgSize, height: svgSize }}
      >
        <svg width={svgSize} height={svgSize} className="filter drop-shadow-2xl">
          {/* Círculo de fundo da pizza */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="#f4e4c1"
            stroke="#d4a574"
            strokeWidth="3"
            initial={animationsEnabled ? { scale: 0 } : {}}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Fatias com sabores */}
          <AnimatePresence>
            {selectedFlavors.map((flavor, index) => {
              const startAngle = index * anglePerFlavor;
              const endAngle = (index + 1) * anglePerFlavor;
              
              return (
                <motion.path
                  key={flavor.id}
                  d={generateSlicePath(startAngle, endAngle)}
                  fill={flavor.color || '#e67e22'}
                  stroke="#fff"
                  strokeWidth="2"
                  initial={animationsEnabled ? { 
                    opacity: 0,
                    scale: 0.5,
                    rotate: -90
                  } : {}}
                  animate={{ 
                    opacity: 0.85,
                    scale: 1,
                    rotate: 0
                  }}
                  exit={animationsEnabled ? { 
                    opacity: 0,
                    scale: 0.5
                  } : {}}
                  transition={{ 
                    duration: 0.6,
                    delay: animationsEnabled ? index * 0.1 : 0,
                    type: "spring"
                  }}
                  style={{ 
                    transformOrigin: `${centerX}px ${centerY}px`
                  }}
                />
              );
            })}
          </AnimatePresence>
          
          {/* Linhas divisórias */}
          {selectedFlavors.length > 1 && (
            <>
              {selectedFlavors.map((_, index) => {
                const angle = index * anglePerFlavor;
                const rad = (angle - 90) * Math.PI / 180;
                const x = centerX + radius * Math.cos(rad);
                const y = centerY + radius * Math.sin(rad);
                
                return (
                  <motion.line
                    key={`divider-${index}`}
                    x1={centerX}
                    y1={centerY}
                    x2={x}
                    y2={y}
                    stroke="#fff"
                    strokeWidth="3"
                    initial={animationsEnabled ? { pathLength: 0 } : {}}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />
                );
              })}
            </>
          )}
          
          {/* Círculo central */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r="15"
            fill="#f4e4c1"
            stroke="#d4a574"
            strokeWidth="2"
            initial={animationsEnabled ? { scale: 0 } : {}}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
          />
        </svg>
        
        {/* Indicador Premium */}
        {hasPremium && (
          <motion.div
            initial={animationsEnabled ? { scale: 0, rotate: -180 } : {}}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold">Premium</span>
          </motion.div>
        )}
      </motion.div>
      
      {/* Labels dos sabores */}
      {selectedFlavors.length > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 justify-center max-w-md">
          {selectedFlavors.map((flavor, index) => (
            <motion.div
              key={flavor.id}
              initial={animationsEnabled ? { opacity: 0, y: -10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animationsEnabled ? index * 0.1 + 0.3 : 0 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white shadow-sm border"
              style={{ borderColor: flavor.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: flavor.color }}></span>
              {flavor.name}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}