import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';

export default function PizzaVisualizer({ 
  size, 
  selectedFlavors = [], 
  animationsEnabled = true 
}) {
  const slices = size?.slices || 8;
  const hasPremium = selectedFlavors.some(f => f.category === 'premium');
  
  // Calcular ângulo por sabor
  const anglePerFlavor = selectedFlavors.length > 0 ? 360 / selectedFlavors.length : 0;
  
  // Estado para dimensões da janela
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  // Listener para redimensionamento
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Tamanho responsivo baseado na viewport
  const svgSize = useMemo(() => {
    const width = windowSize.width;
    const height = windowSize.height;
    const minDimension = Math.min(width, height);
    
    // Mobile: usar 60% da menor dimensão
    if (width < 640) {
      return Math.min(minDimension * 0.6, 240);
    }
    // Tablet: usar 50% da menor dimensão
    if (width < 1024) {
      return Math.min(minDimension * 0.5, 320);
    }
    // Desktop: usar 40% da menor dimensão
    return Math.min(minDimension * 0.4, 400);
  }, [windowSize]);
  
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
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      {/* Container principal da pizza */}
      <div className="relative flex items-center justify-center w-full h-full" style={{ maxWidth: '100%', aspectRatio: '1' }}>
        <motion.div
          initial={animationsEnabled ? { scale: 0.8, opacity: 0, rotate: -10 } : {}}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            damping: 20,
            stiffness: 150,
            duration: 0.6
          }}
          className="relative w-full h-full max-w-full max-h-full"
          style={{ 
            width: '100%', 
            height: '100%',
            maxWidth: `${svgSize}px`,
            maxHeight: `${svgSize}px`
          }}
        >
          {/* Glow effect */}
          <motion.div
            initial={animationsEnabled ? { opacity: 0, scale: 0.9 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-yellow-400/10 to-transparent rounded-full blur-2xl"
          />

          <svg 
            width="100%" 
            height="100%" 
            className="relative z-10 filter drop-shadow-2xl"
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          >
            <defs>
              <radialGradient id="cheeseGradient-visualizer">
                <stop offset="0%" stopColor="#FFE4B5" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#FFD700" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
              </radialGradient>
              
              {selectedFlavors.map((flavor, i) => {
                if (!flavor.image) return null;
                const patternId = `flavor-pattern-visualizer-${i}`;
                return (
                  <pattern key={patternId} id={patternId} x="0" y="0" width="1" height="1" patternContentUnits="objectBoundingBox">
                    <image 
                      href={flavor.image} 
                      x="-0.2" 
                      y="-0.2" 
                      width="1.4" 
                      height="1.4" 
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </pattern>
                );
              })}
            </defs>

            {/* Círculo de fundo da pizza com gradiente */}
            <motion.circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="url(#cheeseGradient-visualizer)"
              stroke="#d4a574"
              strokeWidth="2"
              initial={animationsEnabled ? { scale: 0, opacity: 0 } : {}}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="drop-shadow-lg"
            />
            
            {/* Fatias com sabores - melhoradas */}
            <AnimatePresence>
              {selectedFlavors.map((flavor, index) => {
                const startAngle = index * anglePerFlavor;
                const endAngle = (index + 1) * anglePerFlavor;
                const patternId = `flavor-pattern-visualizer-${index}`;
                
                return (
                  <motion.path
                    key={flavor.id || index}
                    d={generateSlicePath(startAngle, endAngle)}
                    fill={flavor.image ? `url(#${patternId})` : (flavor.color || '#e67e22')}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1.5"
                    initial={animationsEnabled ? { 
                      opacity: 0,
                      scale: 0.5,
                      rotate: -90
                    } : {}}
                    animate={{ 
                      opacity: 1,
                      scale: 1,
                      rotate: 0
                    }}
                    exit={animationsEnabled ? { 
                      opacity: 0,
                      scale: 0.5
                    } : {}}
                    transition={{ 
                      duration: 0.5,
                      delay: animationsEnabled ? index * 0.08 : 0,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    style={{ 
                      transformOrigin: `${centerX}px ${centerY}px`,
                      filter: `drop-shadow(0 2px 8px rgba(0,0,0,0.3))`
                    }}
                  />
                );
              })}
            </AnimatePresence>
            
            {/* Linhas divisórias melhoradas */}
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
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="2"
                      initial={animationsEnabled ? { pathLength: 0, opacity: 0 } : {}}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                    />
                  );
                })}
              </>
            )}
            
            {/* Círculo central melhorado */}
            <motion.circle
              cx={centerX}
              cy={centerY}
              r="18"
              fill="url(#cheeseGradient-visualizer)"
              stroke="#d4a574"
              strokeWidth="2"
              initial={animationsEnabled ? { scale: 0, opacity: 0 } : {}}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="drop-shadow-md"
            />
          </svg>
          
          {/* Indicador Premium melhorado */}
          {hasPremium && (
            <motion.div
              initial={animationsEnabled ? { scale: 0, rotate: -180, opacity: 0 } : {}}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xl flex items-center gap-1 sm:gap-1.5 border-2 border-white/20 z-20"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
              <span className="text-[10px] sm:text-xs font-bold">Premium</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Info abaixo da pizza - não sobrepondo */}
      <div className="w-full max-w-md space-y-2 sm:space-y-3 mt-2 sm:mt-3 px-2">
        {/* Badge de tamanho */}
        {size && (
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 dark:from-gray-800/90 dark:to-gray-700/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-gray-700/50 dark:border-gray-600/50 shadow-lg mx-auto text-center"
          >
            <p className="text-xs sm:text-sm font-bold text-white dark:text-gray-100">{size.name}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-300">{slices} fatias</p>
          </motion.div>
        )}
        
        {/* Labels dos sabores melhorados - abaixo da pizza */}
        {selectedFlavors.length > 0 && (
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-1.5 sm:gap-2 justify-center"
          >
            {selectedFlavors.map((flavor, index) => (
              <motion.div
                key={flavor.id || index}
                initial={animationsEnabled ? { opacity: 0, y: -10, scale: 0.8 } : {}}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: animationsEnabled ? index * 0.1 + 0.8 : 0, type: 'spring' }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold bg-gradient-to-r from-gray-800/90 to-gray-900/90 dark:from-gray-700/90 dark:to-gray-800/90 backdrop-blur-sm shadow-lg border border-gray-700/50 dark:border-gray-600/50 text-white"
              >
                <span 
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: flavor.color || '#e67e22' }}
                ></span>
                <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">{flavor.name}</span>
                {flavor.category === 'premium' && (
                  <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-yellow-400 fill-current flex-shrink-0" />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
