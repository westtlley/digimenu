import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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

  const renderPizzaSlices = () => {
    if (totalSlices === 0) {
      return null;
    }

    const slices = [];
    const anglePerSlice = 360 / totalSlices;
    
    for (let i = 0; i < totalSlices; i++) {
      const flavor = selectedFlavors[i];
      const startAngle = (anglePerSlice * i - 90) * (Math.PI / 180);
      const endAngle = (anglePerSlice * (i + 1) - 90) * (Math.PI / 180);
      
      const x1 = 50 + pizzaRadius * Math.cos(startAngle);
      const y1 = 50 + pizzaRadius * Math.sin(startAngle);
      const x2 = 50 + pizzaRadius * Math.cos(endAngle);
      const y2 = 50 + pizzaRadius * Math.sin(endAngle);
      
      const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
      
      const pathData = [
        `M 50 50`,
        `L ${x1} ${y1}`,
        `A ${pizzaRadius} ${pizzaRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `Z`
      ].join(' ');
      
      const patternId = `flavor-pattern-${i}`;
      
      slices.push(
        <g key={i}>
          {flavor.image && (
            <defs>
              <pattern id={patternId} x="0" y="0" width="1" height="1" patternContentUnits="objectBoundingBox">
                <image 
                  href={flavor.image} 
                  x="-0.2" 
                  y="-0.2" 
                  width="1.4" 
                  height="1.4" 
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            </defs>
          )}
          <motion.path
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.15, type: 'spring', duration: 0.6 }}
            d={pathData}
            fill={flavor.image ? `url(#${patternId})` : '#FFB74D'}
            stroke="none"
            style={{ transformOrigin: '50% 50%' }}
          />
        </g>
      );
    }
    
    return slices;
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative px-4">
      {/* Background com animação */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div 
          className="absolute inset-0 bg-black"
          style={{ 
            filter: `blur(${backgroundBlur}px)`,
            opacity: backgroundOpacity / 100,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
      </motion.div>

      {/* Container global com offset */}
      <div 
        className="relative z-10 w-full h-full flex items-center justify-center"
        style={{
          transform: `translate(${globalOffsetX}px, ${globalOffsetY}px)`
        }}
      >
        {/* Tábua com animação */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${boardOffsetX}px, ${boardOffsetY}px) scale(${boardScale / 100})`
          }}
        >
          <img 
            src={boardUrl} 
            alt="Tábua" 
            className="object-contain w-full h-full"
            style={{ 
              opacity: boardOpacity / 100,
              filter: `drop-shadow(0 8px 16px rgba(0,0,0,${shadowIntensity / 100}))`
            }}
          />
        </motion.div>

        {/* Pizza SVG com animação */}
        <div 
          className="relative z-10 w-full max-w-[450px] aspect-square flex items-center justify-center"
          style={{
            transform: `translate(${pizzaOffsetX}px, ${pizzaOffsetY}px) scale(${pizzaScale / 100}) rotate(${pizzaRotation}deg)`
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {totalSlices > 0 && (
              <>
                <defs>
                  <radialGradient id="cheeseGradient">
                    <stop offset="0%" stopColor="#FFE4B5" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#FFD700" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
                  </radialGradient>

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

                {/* Sabores - apenas as fatias com imagem */}
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
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15 + i * 0.05, type: 'spring', duration: 0.25 }}
                        d={pathData}
                        fill={flavor.image ? `url(#${patternId})` : '#FFB74D'}
                        stroke="none"
                        style={{ transformOrigin: '50% 50%' }}
                        filter={`drop-shadow(0 4px 12px rgba(0,0,0,${shadowIntensity / 100}))`}
                      />
                    );
                  })}
                </g>

                {/* Queijo overlay suave */}
                <motion.circle
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 + totalSlices * 0.05 + 0.1, duration: 0.2 }}
                  cx="50"
                  cy="50"
                  r={pizzaRadius}
                  fill="url(#cheeseGradient)"
                  style={{ mixBlendMode: 'overlay' }}
                />

                {/* Borda */}
                {selectedEdge && (
                  <motion.circle
                    initial={{ scale: 0.9, opacity: 0, strokeWidth: 0 }}
                    animate={{ scale: 1, opacity: 1, strokeWidth: edgeStrokeWidth }}
                    transition={{ delay: 0.15 + totalSlices * 0.05 + 0.15, duration: 0.3, type: 'spring' }}
                    cx="50"
                    cy="50"
                    r={edgeRadius}
                    fill="none"
                    stroke="url(#edgePattern)"
                    filter={`drop-shadow(0 2px 6px rgba(0,0,0,${shadowIntensity / 100}))`}
                  />
                )}
              </>
            )}
          </svg>

          {/* Info */}
          {selectedSize && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-20 left-0 right-0 text-center space-y-1 px-2"
            >
              <p className="font-bold text-base md:text-lg text-white drop-shadow-lg">{selectedSize.name}</p>
              {totalSlices > 0 ? (
                <div className="text-xs md:text-sm text-gray-300 space-y-0.5">
                  {Object.entries(
                    selectedFlavors.reduce((acc, f) => {
                      acc[f.name] = (acc[f.name] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([name, count]) => (
                    <p key={name} className="drop-shadow">
                      {count}/{totalSlices} {name}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Selecione os sabores</p>
              )}
              {selectedEdge && (
                <p className="text-xs text-yellow-400 drop-shadow">🧀 Borda: {selectedEdge.name}</p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}