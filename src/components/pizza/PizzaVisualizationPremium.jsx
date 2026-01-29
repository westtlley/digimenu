import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Star, Flame } from 'lucide-react';

/**
 * PIZZA VISUALIZATION PREMIUM
 * 
 * Experiência cinematográfica de montagem de pizza com:
 * - Animações épicas de ingredientes caindo
 * - Efeito de forno (pizza entra crua, sai dourada)
 * - Fumaça e vapor
 * - Confete ao finalizar
 * - Sequência de montagem realista
 * - Feedback visual impressionante
 */

// Componente de partícula de fumaça/vapor
const SmokeParticle = ({ delay = 0, duration = 2 }) => (
  <motion.div
    initial={{ 
      opacity: 0, 
      y: 20, 
      x: Math.random() * 40 - 20,
      scale: 0.5 
    }}
    animate={{ 
      opacity: [0, 0.6, 0],
      y: -80,
      x: Math.random() * 60 - 30,
      scale: [0.5, 1.5, 2]
    }}
    transition={{
      delay,
      duration,
      ease: 'easeOut',
      repeat: Infinity,
      repeatDelay: Math.random() * 2
    }}
    className="absolute bottom-0 w-8 h-8 rounded-full bg-gradient-to-t from-gray-400/40 to-transparent blur-md pointer-events-none"
  />
);

// Componente de confete
const Confetti = ({ color, delay = 0 }) => (
  <motion.div
    initial={{ 
      opacity: 1, 
      y: -20,
      x: Math.random() * 200 - 100,
      rotate: 0,
      scale: 1
    }}
    animate={{ 
      opacity: [1, 1, 0],
      y: 150,
      rotate: 360 * 3,
      scale: [1, 0.8, 0.6]
    }}
    transition={{
      delay,
      duration: 2,
      ease: 'easeIn'
    }}
    className={`absolute w-2 h-2 rounded-sm ${color}`}
    style={{
      left: '50%',
      top: '20%'
    }}
  />
);

// Componente de ingrediente caindo
const FallingIngredient = ({ emoji, delay = 0, position = 'center' }) => {
  const xOffset = position === 'left' ? -30 : position === 'right' ? 30 : 0;
  
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: -50,
        x: xOffset,
        rotate: -180,
        scale: 0.3
      }}
      animate={{ 
        opacity: [0, 1, 1, 1],
        y: [- 50, 0, 5, 0],
        rotate: [180, 0, -10, 0],
        scale: [0.3, 1.2, 0.9, 1]
      }}
      transition={{
        delay,
        duration: 0.8,
        times: [0, 0.6, 0.8, 1],
        type: 'spring',
        stiffness: 200,
        damping: 10
      }}
      className="absolute text-2xl pointer-events-none z-30"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      {emoji}
    </motion.div>
  );
};

export default function PizzaVisualizationPremium({ 
  selectedSize, 
  selectedFlavors, 
  selectedEdge, 
  selectedExtras, 
  showBackground = false,
  showConfetti = false,
  onAnimationComplete = null 
}) {
  const totalSlices = selectedFlavors.length;
  const [showSmoke, setShowSmoke] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  
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

  // Mostrar fumaça quando adiciona borda
  useEffect(() => {
    if (selectedEdge) {
      setShowSmoke(true);
      const timer = setTimeout(() => setShowSmoke(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [selectedEdge]);

  // Mostrar ingredientes caindo quando adiciona sabores
  useEffect(() => {
    if (totalSlices > 0) {
      setShowIngredients(true);
      const timer = setTimeout(() => setShowIngredients(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [totalSlices]);

  const { data: savedConfigs = [] } = useQuery({
    queryKey: ['pizzaVisualizationConfig'],
    queryFn: () => base44.entities.PizzaVisualizationConfig.list(),
  });

  const config = savedConfigs[0] || {};

  const pizzaRadius = config.pizzaRadius ?? 35;
  const edgeRadius = config.edgeRadius ?? 42.5;
  const edgeStrokeWidth = config.edgeStrokeWidth ?? 9;
  const pizzaScale = config.pizzaScale ?? 100;
  const globalOffsetX = config.globalOffsetX ?? 0;
  const globalOffsetY = config.globalOffsetY ?? 0;
  const pizzaOffsetX = config.pizzaOffsetX ?? 0;
  const pizzaOffsetY = config.pizzaOffsetY ?? 0;
  const pizzaRotation = config.pizzaRotation ?? 0;
  const shadowIntensity = config.shadowIntensity ?? 50;
  const edgeImageUrl = config.edgeImageUrl ?? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/625e680ac_Designsemnome.png';

  const hasPremiumFlavor = selectedFlavors.some(f => f.category === 'premium');

  // Calcular tamanho responsivo baseado na tela
  const responsive = useMemo(() => {
    const width = windowSize.width;
    const height = windowSize.height;
    const minDimension = Math.min(width, height);
    
    if (width < 640) {
      const svgSize = Math.min(minDimension * 0.55, 240);
      return { 
        container: 'min-h-[280px]', 
        svgSize,
        info: 'mt-3',
        padding: 'p-2'
      };
    } else if (width < 1024) {
      const svgSize = Math.min(minDimension * 0.5, 320);
      return { 
        container: 'min-h-[350px]', 
        svgSize,
        info: 'mt-4',
        padding: 'p-3'
      };
    }
    const svgSize = Math.min(minDimension * 0.45, 400);
    return { 
      container: 'min-h-[400px]', 
      svgSize,
      info: 'mt-6',
      padding: 'p-4'
    };
  }, [windowSize]);

  // Emojis de ingredientes baseados nos sabores
  const getIngredientEmojis = () => {
    const emojis = [];
    selectedFlavors.slice(-3).forEach((flavor, i) => {
      if (flavor.name.toLowerCase().includes('calabresa')) emojis.push({ emoji: '🥓', pos: ['left', 'center', 'right'][i % 3] });
      else if (flavor.name.toLowerCase().includes('frango')) emojis.push({ emoji: '🍗', pos: ['right', 'left', 'center'][i % 3] });
      else if (flavor.name.toLowerCase().includes('portuguesa')) emojis.push({ emoji: '🥚', pos: ['center', 'right', 'left'][i % 3] });
      else if (flavor.name.toLowerCase().includes('marguer')) emojis.push({ emoji: '🍃', pos: ['left', 'center', 'right'][i % 3] });
      else emojis.push({ emoji: '🧀', pos: ['center', 'left', 'right'][i % 3] });
    });
    return emojis;
  };

  return (
    <div className={`w-full ${showBackground ? responsive.container : 'h-full'} flex flex-col items-center justify-center relative overflow-hidden ${showBackground ? responsive.padding : ''}`}>
      {/* Ingredientes caindo */}
      <AnimatePresence>
        {showIngredients && (
          <>
            {getIngredientEmojis().map((item, i) => (
              <FallingIngredient 
                key={`ingredient-${i}-${totalSlices}`}
                emoji={item.emoji}
                delay={i * 0.15}
                position={item.pos}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Fumaça/Vapor (quando adiciona borda) */}
      <AnimatePresence>
        {showSmoke && selectedEdge && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-20">
            {[...Array(6)].map((_, i) => (
              <SmokeParticle 
                key={`smoke-${i}`}
                delay={i * 0.3}
                duration={2 + Math.random()}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Confete (pode ser ativado externamente) */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-40">
            {[...Array(30)].map((_, i) => (
              <Confetti 
                key={`confetti-${i}`}
                color={['bg-yellow-400', 'bg-orange-400', 'bg-red-400', 'bg-green-400', 'bg-blue-400'][i % 5]}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div 
        className="relative w-full flex flex-col items-center justify-center"
        style={{
          transform: `translate(${globalOffsetX}px, ${globalOffsetY}px)`
        }}
      >
        {/* Container da pizza - centralizado e responsivo */}
        <div 
          className="relative flex items-center justify-center w-full"
          style={{ 
            maxWidth: `${responsive.svgSize}px`,
            aspectRatio: '1',
            height: 'auto'
          }}
        >
          {/* Pizza SVG */}
          <motion.div 
            className="relative z-10 flex items-center justify-center w-full h-full"
            style={{
              transform: `translate(${pizzaOffsetX}px, ${pizzaOffsetY}px) scale(${pizzaScale / 100}) rotate(${pizzaRotation}deg)`,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
            animate={{
              rotate: selectedSize ? [pizzaRotation, pizzaRotation + 5, pizzaRotation - 5, pizzaRotation] : pizzaRotation
            }}
            transition={{
              duration: 0.6,
              ease: 'easeInOut'
            }}
          >
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full drop-shadow-2xl"
              preserveAspectRatio="xMidYMid meet"
              style={{ 
                filter: `drop-shadow(0 12px 24px rgba(0,0,0,${shadowIntensity / 100})) drop-shadow(0 0 20px rgba(255, 152, 0, 0.3))`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {totalSlices > 0 && (
                <>
                  <defs>
                    {/* Gradientes melhorados */}
                    <radialGradient id="cheeseGradientPremium">
                      <stop offset="0%" stopColor="#FFE4B5" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#FFD700" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FFA500" stopOpacity="0.1" />
                    </radialGradient>

                    <radialGradient id="glowGradientPremium">
                      <stop offset="0%" stopColor="#FFA500" stopOpacity="0.5" />
                      <stop offset="50%" stopColor="#FF8C00" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FF6347" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="doughGradientPremium">
                      <stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
                      <stop offset="40%" stopColor="#F5DEB3" stopOpacity="0.95" />
                      <stop offset="70%" stopColor="#DEB887" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#D2691E" stopOpacity="0.85" />
                    </radialGradient>

                    <radialGradient id="heatGradient">
                      <stop offset="0%" stopColor="#FFD700" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFD700" />
                      <stop offset="50%" stopColor="#FFA500" />
                      <stop offset="100%" stopColor="#FF8C00" />
                    </linearGradient>

                    <pattern id="edgePattern" patternUnits="userSpaceOnUse" width="100" height="100">
                      <image 
                        href={edgeImageUrl}
                        x="0" 
                        y="0" 
                        width="100" 
                        height="100" 
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </pattern>
                    
                    {selectedFlavors.map((flavor, i) => {
                      const patternId = `flavor-pattern-premium-${i}`;
                      return flavor.image && (
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

                  {/* Glow effect pulsante */}
                  <motion.circle
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0.6, 0.8, 0.6],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      delay: 0.2, 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse'
                    }}
                    cx="50"
                    cy="50"
                    r={pizzaRadius + 4}
                    fill="url(#glowGradientPremium)"
                    style={{ mixBlendMode: 'screen' }}
                  />

                  {/* Calor radiante (efeito de forno) */}
                  <motion.circle
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: [0, 0.3, 0],
                      scale: [0.9, 1.2, 0.9]
                    }}
                    transition={{ 
                      delay: 0.3, 
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 0.5
                    }}
                    cx="50"
                    cy="50"
                    r={pizzaRadius + 6}
                    fill="url(#heatGradient)"
                    style={{ mixBlendMode: 'screen' }}
                  />

                  {/* Massa simulada com textura melhorada */}
                  {!selectedEdge && (
                    <motion.circle
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        delay: 0.1, 
                        duration: 0.5,
                        type: 'spring',
                        stiffness: 100
                      }}
                      cx="50"
                      cy="50"
                      r={pizzaRadius + 3.5}
                      fill="url(#doughGradientPremium)"
                      stroke="#CD853F"
                      strokeWidth="2"
                      style={{ 
                        filter: `drop-shadow(0 3px 8px rgba(0,0,0,0.3)) drop-shadow(0 0 10px rgba(255, 140, 0, 0.2))`,
                        opacity: 0.95
                      }}
                    />
                  )}

                  {/* Sabores com animação ÉPICA de rotação e queda */}
                  <g>
                    {selectedFlavors.map((flavor, i) => {
                      const anglePerSlice = 360 / totalSlices;
                      const startAngle = (anglePerSlice * i - 90) * (Math.PI / 180);
                      const endAngle = (anglePerSlice * (i + 1) - 90) * (Math.PI / 180);
                      
                      const x1 = 50 + pizzaRadius * Math.cos(startAngle);
                      const y1 = 50 + pizzaRadius * Math.sin(startAngle);
                      const x2 = 50 + pizzaRadius * Math.cos(endAngle);
                      const y2 = 50 + pizzaRadius * Math.sin(endAngle);
                      
                      const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
                      const pathData = `M 50 50 L ${x1} ${y1} A ${pizzaRadius} ${pizzaRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                      const patternId = `flavor-pattern-premium-${i}`;
                      
                      return (
                        <motion.path
                          key={`slice-${i}-${flavor.id}`}
                          initial={{ 
                            scale: 0, 
                            opacity: 0, 
                            rotate: -360,
                            y: -100
                          }}
                          animate={{ 
                            scale: 1, 
                            opacity: 1, 
                            rotate: 0,
                            y: 0
                          }}
                          transition={{ 
                            delay: 0.3 + i * 0.12, 
                            type: 'spring', 
                            stiffness: 150,
                            damping: 12,
                            duration: 0.8,
                            opacity: { duration: 0.4 }
                          }}
                          d={pathData}
                          fill={flavor.image ? `url(#${patternId})` : (flavor.color || '#FFB74D')}
                          stroke="rgba(255, 255, 255, 0.3)"
                          strokeWidth="1.5"
                          style={{ transformOrigin: '50% 50%' }}
                          filter={`drop-shadow(0 6px 16px rgba(0,0,0,${shadowIntensity / 100})) drop-shadow(0 0 8px rgba(255, 152, 0, 0.4))`}
                        />
                      );
                    })}
                  </g>

                  {/* Queijo overlay com bolhas */}
                  <motion.circle
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1 
                    }}
                    transition={{ 
                      delay: 0.3 + totalSlices * 0.12 + 0.15, 
                      duration: 0.5 
                    }}
                    cx="50"
                    cy="50"
                    r={pizzaRadius}
                    fill="url(#cheeseGradientPremium)"
                    style={{ mixBlendMode: 'overlay' }}
                  />

                  {/* Borda com animação EXPLOSIVA */}
                  {selectedEdge && (
                    <>
                      {/* Anel de impacto da borda */}
                      <motion.circle
                        initial={{ scale: 0.8, opacity: 1 }}
                        animate={{ 
                          scale: [0.8, 1.2, 1],
                          opacity: [1, 0, 0]
                        }}
                        transition={{ 
                          delay: 0.3 + totalSlices * 0.12 + 0.25, 
                          duration: 0.6 
                        }}
                        cx="50"
                        cy="50"
                        r={edgeRadius + 2}
                        fill="none"
                        stroke="#FFD700"
                        strokeWidth="3"
                        strokeOpacity="0.8"
                      />
                      
                      {/* Borda propriamente dita */}
                      <motion.circle
                        initial={{ scale: 0.7, opacity: 0, strokeWidth: 0 }}
                        animate={{ 
                          scale: 1, 
                          opacity: 1, 
                          strokeWidth: edgeStrokeWidth 
                        }}
                        transition={{ 
                          delay: 0.3 + totalSlices * 0.12 + 0.3, 
                          duration: 0.6, 
                          type: 'spring',
                          stiffness: 120,
                          damping: 10
                        }}
                        cx="50"
                        cy="50"
                        r={edgeRadius}
                        fill="none"
                        stroke="url(#edgePattern)"
                        strokeWidth={edgeStrokeWidth}
                        strokeLinecap="round"
                        filter={`drop-shadow(0 6px 20px rgba(0,0,0,${shadowIntensity / 100})) drop-shadow(0 0 15px rgba(255, 215, 0, 0.5))`}
                      />
                    </>
                  )}

                  {/* Sparkles ao redor da pizza */}
                  {totalSlices > 0 && (
                    <>
                      {[...Array(8)].map((_, i) => {
                        const angle = (360 / 8) * i;
                        const rad = (angle - 90) * (Math.PI / 180);
                        const distance = pizzaRadius + 10;
                        const x = 50 + distance * Math.cos(rad);
                        const y = 50 + distance * Math.sin(rad);
                        
                        return (
                          <motion.g
                            key={`sparkle-${i}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ 
                              scale: [0, 1, 0],
                              opacity: [0, 1, 0]
                            }}
                            transition={{ 
                              delay: 0.5 + i * 0.1, 
                              duration: 1,
                              repeat: Infinity,
                              repeatDelay: 2
                            }}
                          >
                            <circle 
                              cx={x} 
                              cy={y} 
                              r="1.5" 
                              fill="#FFD700" 
                              filter="blur(0.5px)"
                            />
                          </motion.g>
                        );
                      })}
                    </>
                  )}

                  {/* Premium badge com animação */}
                  {hasPremiumFlavor && (
                    <motion.g
                      initial={{ scale: 0, opacity: 0, rotate: -180 }}
                      animate={{ 
                        scale: [0, 1.3, 1],
                        opacity: 1,
                        rotate: 0
                      }}
                      transition={{ 
                        delay: 0.7, 
                        type: 'spring',
                        stiffness: 200,
                        damping: 10
                      }}
                    >
                      <motion.circle 
                        cx="75" 
                        cy="25" 
                        r="9" 
                        fill="url(#premiumGradient)" 
                        opacity="0.95"
                        animate={{
                          scale: [1, 1.1, 1]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatType: 'reverse'
                        }}
                        filter="drop-shadow(0 2px 6px rgba(255, 215, 0, 0.6))"
                      />
                      <text 
                        x="75" 
                        y="29" 
                        textAnchor="middle" 
                        fontSize="7" 
                        fill="white" 
                        fontWeight="bold"
                      >
                        ⭐
                      </text>
                    </motion.g>
                  )}
                </>
              )}
            </svg>
          </motion.div>
        </div>

        {/* Info melhorada com animação de entrada */}
        {selectedSize && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: 0.8,
              type: 'spring',
              stiffness: 150
            }}
            className={`relative z-20 w-full max-w-md ${responsive.info} text-center space-y-1.5 sm:space-y-2 px-2`}
          >
            <div className="bg-gradient-to-br from-gray-900/98 via-gray-800/98 to-gray-900/98 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 md:p-4 border-2 border-orange-500/30 shadow-2xl relative overflow-hidden">
              {/* Brilho animado no fundo */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              />
              
              <div className="relative z-10">
                <p className="font-bold text-sm sm:text-base md:text-lg text-white drop-shadow-lg mb-1.5 sm:mb-2 flex items-center justify-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {selectedSize.name}
                  <Flame className="w-4 h-4 text-orange-500" />
                </p>
                {totalSlices > 0 ? (
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-300 space-y-0.5 sm:space-y-1">
                    {Object.entries(
                      selectedFlavors.reduce((acc, f) => {
                        acc[f.name] = (acc[f.name] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([name, count], i) => (
                      <motion.div 
                        key={name} 
                        className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + i * 0.1 }}
                      >
                        <span className="font-semibold text-white text-[10px] sm:text-xs bg-orange-500/20 px-2 py-0.5 rounded-full">
                          {count}/{totalSlices}
                        </span>
                        <span className="text-gray-300 text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">{name}</span>
                        {selectedFlavors.find(f => f.name === name)?.category === 'premium' && (
                          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-current flex-shrink-0 animate-pulse" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] sm:text-xs text-gray-400">Selecione os sabores</p>
                )}
                {selectedEdge && (
                  <motion.div 
                    className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-orange-500/30"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <p className="text-[10px] sm:text-xs text-yellow-400 drop-shadow flex items-center justify-center gap-1 font-semibold">
                      <span>🧀</span>
                      <span className="truncate">Borda: {selectedEdge.name}</span>
                    </p>
                  </motion.div>
                )}
                {selectedExtras && selectedExtras.length > 0 && (
                  <motion.div 
                    className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-orange-500/30"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1 }}
                  >
                    <p className="text-[10px] sm:text-xs text-orange-400 drop-shadow flex items-center justify-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3" />
                      {selectedExtras.length} extra{selectedExtras.length > 1 ? 's' : ''}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Exportar função para mostrar confete externamente
export const triggerConfetti = (setShowConfetti) => {
  setShowConfetti(true);
  setTimeout(() => setShowConfetti(false), 3000);
};
