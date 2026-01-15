import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Star } from 'lucide-react';

export default function PizzaVisualization({ selectedSize, selectedFlavors, selectedEdge, selectedExtras }) {
  const totalSlices = selectedFlavors.length;

  const { data: savedConfigs = [] } = useQuery({
    queryKey: ['pizzaVisualizationConfig'],
    queryFn: () => base44.entities.PizzaVisualizationConfig.list(),
  });

  const config = savedConfigs[0] || {};

  const pizzaRadius = config.pizzaRadius ?? 35;
  const edgeRadius = config.edgeRadius ?? 42.5;
  const edgeStrokeWidth = config.edgeStrokeWidth ?? 9;
  const boardScale = config.boardScale ?? 90;
  const boardOpacity = config.boardOpacity ?? 100;
  const pizzaScale = config.pizzaScale ?? 100;
  const globalOffsetX = config.globalOffsetX ?? 0;
  const globalOffsetY = config.globalOffsetY ?? 0;
  const pizzaOffsetX = config.pizzaOffsetX ?? 0;
  const pizzaOffsetY = config.pizzaOffsetY ?? 0;
  const boardOffsetX = config.boardOffsetX ?? 0;
  const boardOffsetY = config.boardOffsetY ?? 0;
  const pizzaRotation = config.pizzaRotation ?? 0;
  const shadowIntensity = config.shadowIntensity ?? 50;
  const backgroundImage = config.backgroundImage ?? 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80';
  const backgroundOpacity = config.backgroundOpacity ?? 5;
  const backgroundBlur = config.backgroundBlur ?? 1;
  const edgeImageUrl = config.edgeImageUrl ?? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/625e680ac_Designsemnome.png';
  const boardUrl = config.boardImageUrl ?? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/d32b3df38_tabua-p-pizza-34x28cm.png';

  const hasPremiumFlavor = selectedFlavors.some(f => f.category === 'premium');

  // Calcular tamanho responsivo baseado na tela
  const getResponsiveSize = () => {
    if (typeof window === 'undefined') return { container: 'min-h-[400px]', svg: 'max-w-[280px]' };
    
    const width = window.innerWidth;
    if (width < 640) {
      return { container: 'min-h-[300px]', svg: 'max-w-[220px]', info: 'mt-4' };
    } else if (width < 1024) {
      return { container: 'min-h-[400px]', svg: 'max-w-[320px]', info: 'mt-6' };
    }
    return { container: 'min-h-[450px]', svg: 'max-w-[380px]', info: 'mt-8' };
  };

  const responsive = getResponsiveSize();

  return (
    <div className={`w-full ${responsive.container} flex flex-col items-center justify-center relative px-2 sm:px-4 py-4`}>
      {/* Background com animação melhorada */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div 
          className="absolute inset-0 bg-black rounded-2xl"
          style={{ 
            filter: `blur(${backgroundBlur}px)`,
            opacity: backgroundOpacity / 100,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-yellow-900/20"></div>
      </motion.div>

      {/* Container principal - melhorado para responsividade */}
      <div 
        className="relative z-10 w-full flex-1 flex flex-col items-center justify-center"
        style={{
          transform: `translate(${globalOffsetX}px, ${globalOffsetY}px)`
        }}
      >
        {/* Container da pizza e tábua - centralizado */}
        <div className="relative flex items-center justify-center" style={{ width: '100%', maxWidth: '450px', aspectRatio: '1' }}>
          {/* Tábua - posicionada atrás da pizza */}
          <motion.div 
            initial={{ scale: 0.7, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${boardOffsetX}px, ${boardOffsetY}px) scale(${boardScale / 100})`,
              zIndex: 1
            }}
          >
            <img 
              src={boardUrl} 
              alt="Tábua" 
              className="object-contain w-full h-full"
              style={{ 
                opacity: boardOpacity / 100,
                filter: `drop-shadow(0 12px 24px rgba(0,0,0,${shadowIntensity / 100}))`,
                transform: 'preserve-3d'
              }}
              draggable={false}
            />
          </motion.div>

          {/* Pizza SVG - posicionada sobre a tábua */}
          <div 
            className="relative z-10 flex items-center justify-center"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: responsive.svg,
              maxHeight: responsive.svg,
              transform: `translate(${pizzaOffsetX}px, ${pizzaOffsetY}px) scale(${pizzaScale / 100}) rotate(${pizzaRotation}deg)`
            }}
          >
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full drop-shadow-2xl"
              preserveAspectRatio="xMidYMid meet"
              style={{ filter: `drop-shadow(0 8px 16px rgba(0,0,0,${shadowIntensity / 100}))` }}
            >
              {totalSlices > 0 && (
                <>
                  <defs>
                    <radialGradient id="cheeseGradient">
                      <stop offset="0%" stopColor="#FFE4B5" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#FFD700" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="glowGradient">
                      <stop offset="0%" stopColor="#FFA500" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="doughGradient">
                      <stop offset="0%" stopColor="#F5DEB3" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#DEB887" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#CD853F" stopOpacity="0.7" />
                    </radialGradient>

                    <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FCD34D" />
                      <stop offset="100%" stopColor="#F59E0B" />
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
                      const patternId = `flavor-pattern-${i}`;
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

                  {/* Glow effect */}
                  <motion.circle
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    cx="50"
                    cy="50"
                    r={pizzaRadius + 2}
                    fill="url(#glowGradient)"
                    style={{ mixBlendMode: 'screen' }}
                  />

                  {/* Massa simulada quando não tem borda */}
                  {!selectedEdge && (
                    <motion.circle
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      cx="50"
                      cy="50"
                      r={pizzaRadius + 3}
                      fill="url(#doughGradient)"
                      stroke="#D2B48C"
                      strokeWidth="1.5"
                      style={{ 
                        filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.2))`,
                        opacity: 0.85
                      }}
                    />
                  )}

                  {/* Sabores com animação melhorada */}
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
                      const patternId = `flavor-pattern-${i}`;
                      
                      return (
                        <motion.path
                          key={i}
                          initial={{ scale: 0, opacity: 0, rotate: -180 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          transition={{ 
                            delay: 0.2 + i * 0.06, 
                            type: 'spring', 
                            stiffness: 200,
                            damping: 15,
                            duration: 0.5 
                          }}
                          d={pathData}
                          fill={flavor.image ? `url(#${patternId})` : (flavor.color || '#FFB74D')}
                          stroke="rgba(255, 255, 255, 0.2)"
                          strokeWidth="1"
                          style={{ transformOrigin: '50% 50%' }}
                          filter={`drop-shadow(0 4px 12px rgba(0,0,0,${shadowIntensity / 100}))`}
                        />
                      );
                    })}
                  </g>

                  {/* Queijo overlay suave melhorado */}
                  <motion.circle
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + totalSlices * 0.06 + 0.1, duration: 0.3 }}
                    cx="50"
                    cy="50"
                    r={pizzaRadius}
                    fill="url(#cheeseGradient)"
                    style={{ mixBlendMode: 'overlay' }}
                  />

                  {/* Borda com animação melhorada - só aparece se selecionada */}
                  {selectedEdge && (
                    <motion.circle
                      initial={{ scale: 0.8, opacity: 0, strokeWidth: 0 }}
                      animate={{ scale: 1, opacity: 1, strokeWidth: edgeStrokeWidth }}
                      transition={{ 
                        delay: 0.2 + totalSlices * 0.06 + 0.2, 
                        duration: 0.4, 
                        type: 'spring',
                        stiffness: 150 
                      }}
                      cx="50"
                      cy="50"
                      r={edgeRadius}
                      fill="none"
                      stroke="url(#edgePattern)"
                      strokeWidth={edgeStrokeWidth}
                      strokeLinecap="round"
                      filter={`drop-shadow(0 4px 12px rgba(0,0,0,${shadowIntensity / 100}))`}
                    />
                  )}

                  {/* Premium badge */}
                  {hasPremiumFlavor && (
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    >
                      <circle cx="75" cy="25" r="8" fill="url(#premiumGradient)" opacity="0.9" />
                      <text x="75" y="28" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">⭐</text>
                    </motion.g>
                  )}
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Info melhorada - posicionada abaixo da pizza, não sobrepondo */}
        {selectedSize && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`relative z-20 w-full max-w-md ${responsive.info} text-center space-y-2 px-2`}
          >
            <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-gray-700/50 shadow-xl">
              <p className="font-bold text-base sm:text-lg md:text-xl text-white drop-shadow-lg mb-2">
                {selectedSize.name}
              </p>
              {totalSlices > 0 ? (
                <div className="text-xs sm:text-sm text-gray-300 space-y-1">
                  {Object.entries(
                    selectedFlavors.reduce((acc, f) => {
                      acc[f.name] = (acc[f.name] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">
                        {count}/{totalSlices}
                      </span>
                      <span className="text-gray-300">{name}</span>
                      {selectedFlavors.find(f => f.name === name)?.category === 'premium' && (
                        <Sparkles className="w-3 h-3 text-yellow-400 fill-current flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Selecione os sabores</p>
              )}
              {selectedEdge && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-xs sm:text-sm text-yellow-400 drop-shadow flex items-center justify-center gap-1">
                    <span>🧀</span>
                    Borda: {selectedEdge.name}
                  </p>
                </div>
              )}
              {selectedExtras && selectedExtras.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-xs sm:text-sm text-orange-400 drop-shadow flex items-center justify-center gap-1">
                    <span>✨</span>
                    {selectedExtras.length} extra{selectedExtras.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
