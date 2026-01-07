import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import toast from 'react-hot-toast';

export default function PizzaVisualizationSettings() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };
    loadUser();
  }, []);

  const { data: savedConfigs = [] } = useQuery({
    queryKey: ['pizzaVisualizationConfig'],
    queryFn: () => base44.entities.PizzaVisualizationConfig.list(),
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.PizzaVisualizationConfig.create({
      ...data,
      subscriber_email: user?.subscriber_email || user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaVisualizationConfig'] });
      toast.success('✅ Configurações salvas com sucesso!');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PizzaVisualizationConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaVisualizationConfig'] });
      toast.success('✅ Configurações atualizadas!');
    },
  });

  const [settings, setSettings] = useState({
    // Escala geral da pizza com borda
    pizzaScale: 100,
    // Posicionamento conjunto (pizza + borda + tábua)
    globalOffsetX: 0,
    globalOffsetY: 0,
    // Ajustes individuais da pizza
    pizzaOffsetX: 0,
    pizzaOffsetY: 0,
    pizzaRadius: 35,
    // Ajustes da borda
    edgeRadius: 42.5,
    edgeStrokeWidth: 9,
    // Tábua
    boardOffsetX: 0,
    boardOffsetY: 0,
    boardScale: 90,
    boardOpacity: 100,
    // Rotação
    pizzaRotation: 0,
    // Sombras
    shadowIntensity: 50,
    // Background
    backgroundImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    backgroundOpacity: 5,
    backgroundBlur: 1,
    edgeImageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/625e680ac_Designsemnome.png',
    boardImageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/d32b3df38_tabua-p-pizza-34x28cm.png'
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ boardScale: 90 });

  useEffect(() => {
    if (savedConfigs.length > 0) {
      const config = savedConfigs[0];
      setSettings({
        pizzaScale: config.pizzaScale ?? 100,
        globalOffsetX: config.globalOffsetX ?? 0,
        globalOffsetY: config.globalOffsetY ?? 0,
        pizzaOffsetX: config.pizzaOffsetX ?? 0,
        pizzaOffsetY: config.pizzaOffsetY ?? 0,
        pizzaRadius: config.pizzaRadius ?? 35,
        edgeRadius: config.edgeRadius ?? 42.5,
        edgeStrokeWidth: config.edgeStrokeWidth ?? 9,
        boardOffsetX: config.boardOffsetX ?? 0,
        boardOffsetY: config.boardOffsetY ?? 0,
        boardScale: config.boardScale ?? 90,
        boardOpacity: config.boardOpacity ?? 100,
        pizzaRotation: config.pizzaRotation ?? 0,
        shadowIntensity: config.shadowIntensity ?? 50,
        backgroundImage: config.backgroundImage ?? 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
        backgroundOpacity: config.backgroundOpacity ?? 5,
        backgroundBlur: config.backgroundBlur ?? 1,
        edgeImageUrl: config.edgeImageUrl ?? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/625e680ac_Designsemnome.png',
        boardImageUrl: config.boardImageUrl ?? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693428740b45fa735818cde5/d32b3df38_tabua-p-pizza-34x28cm.png'
      });
    }
  }, [savedConfigs]);

  // Mock data para preview
  const mockSize = { name: 'Grande', slices: 4, diameter_cm: 35 };
  const mockFlavors = [
    { id: '1', name: 'Calabresa', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
    { id: '2', name: 'Mussarela', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400' },
    { id: '3', name: 'Calabresa', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
    { id: '4', name: 'Mussarela', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400' },
  ];
  const mockEdge = { id: '1', name: 'Catupiry', price: 5 };

  const handleMouseDown = (e, target) => {
    setIsDragging(true);
    setDragTarget(target);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragTarget) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (dragTarget === 'pizza') {
      setSettings(prev => ({
        ...prev,
        pizzaOffsetX: prev.pizzaOffsetX + deltaX / 3,
        pizzaOffsetY: prev.pizzaOffsetY + deltaY / 3
      }));
    } else if (dragTarget === 'board') {
      setSettings(prev => ({
        ...prev,
        boardOffsetX: prev.boardOffsetX + deltaX / 3,
        boardOffsetY: prev.boardOffsetY + deltaY / 3
      }));
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
    setIsResizing(false);
  };

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ boardScale: settings.boardScale });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMouseMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const delta = (deltaX + deltaY) / 4;
    
    const newScale = Math.max(60, Math.min(150, resizeStart.boardScale + delta));
    setSettings(prev => ({ ...prev, boardScale: newScale }));
  };

  const handleSaveSettings = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (savedConfigs.length > 0) {
      updateConfigMutation.mutate({
        id: savedConfigs[0].id,
        data: settings
      });
    } else {
      createConfigMutation.mutate(settings);
    }
  };

  const exportSettings = () => {
    const code = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(code);
    toast.success('✅ Configurações copiadas!');
  };

  const renderPizzaSlices = () => {
    const slices = [];
    const anglePerSlice = 360 / mockFlavors.length;
    
    for (let i = 0; i < mockFlavors.length; i++) {
      const flavor = mockFlavors[i];
      const startAngle = (anglePerSlice * i - 90) * (Math.PI / 180);
      const endAngle = (anglePerSlice * (i + 1) - 90) * (Math.PI / 180);
      
      const x1 = 50 + settings.pizzaRadius * Math.cos(startAngle);
      const y1 = 50 + settings.pizzaRadius * Math.sin(startAngle);
      const x2 = 50 + settings.pizzaRadius * Math.cos(endAngle);
      const y2 = 50 + settings.pizzaRadius * Math.sin(endAngle);
      
      const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
      
      const pathData = [
        `M 50 50`,
        `L ${x1} ${y1}`,
        `A ${settings.pizzaRadius} ${settings.pizzaRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `Z`
      ].join(' ');
      
      const patternId = `flavor-pattern-${i}`;
      
      slices.push(
        <g key={i}>
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
          <path
            d={pathData}
            fill={`url(#${patternId})`}
            stroke="none"
          />
        </g>
      );
    }
    
    return slices;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Configurações de Visualização da Pizza</h2>
        <p className="text-sm md:text-base text-gray-600">Ajuste a aparência da animação de montagem da pizza</p>
      </div>

      <div className="grid lg:grid-cols-[350px_1fr] xl:grid-cols-[400px_1fr] gap-4 md:gap-6">
        {/* Preview */}
        <Card className="p-3 md:p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 sticky top-4 h-fit">
          <h3 className="text-white font-semibold mb-2 text-sm">Preview</h3>
          <p className="text-xs text-gray-400 mb-2">💡 Clique e arraste a pizza ou tábua para reposicionar</p>
          <div 
            className="relative rounded-xl overflow-hidden aspect-square select-none"
            style={{
              backgroundImage: `url(${settings.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onMouseMove={(e) => {
              handleMouseMove(e);
              handleResizeMouseMove(e);
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="absolute inset-0 bg-black"
              style={{ 
                filter: `blur(${settings.backgroundBlur}px)`,
                opacity: settings.backgroundOpacity / 100,
                backgroundImage: `url(${settings.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            ></div>
            
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <div 
                style={{
                  transform: `translate(${settings.globalOffsetX}px, ${settings.globalOffsetY}px)`,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Tábua */}
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-move"
                  onMouseDown={(e) => handleMouseDown(e, 'board')}
                  style={{
                    transform: `translate(${settings.boardOffsetX}px, ${settings.boardOffsetY}px)`
                  }}
                >
                  <img 
                    src={settings.boardImageUrl}
                    alt="Tábua" 
                    className="object-contain max-w-full max-h-full"
                    style={{ 
                      width: `${settings.boardScale}%`,
                      opacity: settings.boardOpacity / 100,
                      filter: `drop-shadow(0 8px 16px rgba(0,0,0,${settings.shadowIntensity / 100}))`
                    }}
                  />
                </div>

                {/* Pizza SVG */}
                <div 
                  className="relative z-10 w-full max-w-[280px] aspect-square cursor-move"
                  onMouseDown={(e) => handleMouseDown(e, 'pizza')}
                  style={{
                    transform: `translate(${settings.pizzaOffsetX}px, ${settings.pizzaOffsetY}px) scale(${settings.pizzaScale / 100}) rotate(${settings.pizzaRotation}deg)`,
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <radialGradient id="doughGradient">
                      <stop offset="0%" stopColor="#F5E6D3" />
                      <stop offset="85%" stopColor="#E8D4B8" />
                      <stop offset="100%" stopColor="#C8A882" />
                    </radialGradient>
                    
                    <radialGradient id="sauceGradient">
                      <stop offset="0%" stopColor="#E63946" />
                      <stop offset="100%" stopColor="#C92A2A" />
                    </radialGradient>
                    
                    <radialGradient id="cheeseGradient">
                      <stop offset="0%" stopColor="#FFE4B5" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#FFD700" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
                    </radialGradient>

                    <pattern id="edgePattern" patternUnits="userSpaceOnUse" width="100" height="100">
                      <image 
                        href={settings.edgeImageUrl}
                        x="0" 
                        y="0" 
                        width="100" 
                        height="100" 
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </pattern>
                  </defs>

                  {/* Pizza base */}
                  <circle
                    cx="50"
                    cy="50"
                    r={settings.pizzaRadius + 3}
                    fill="url(#doughGradient)"
                    filter={`drop-shadow(0 4px 12px rgba(0,0,0,${settings.shadowIntensity / 100}))`}
                  />

                  {/* Molho */}
                  <circle
                    cx="50"
                    cy="50"
                    r={settings.pizzaRadius}
                    fill="url(#sauceGradient)"
                  />

                  {/* Sabores */}
                  <g>
                    {renderPizzaSlices()}
                  </g>

                  {/* Queijo */}
                  <circle
                    cx="50"
                    cy="50"
                    r={settings.pizzaRadius}
                    fill="url(#cheeseGradient)"
                    style={{ mixBlendMode: 'overlay' }}
                  />

                  {/* Borda recheada */}
                  {mockEdge && (
                    <circle
                      cx="50"
                      cy="50"
                      r={settings.edgeRadius}
                      fill="none"
                      stroke="url(#edgePattern)"
                      strokeWidth={settings.edgeStrokeWidth}
                      filter={`drop-shadow(0 2px 6px rgba(0,0,0,${settings.shadowIntensity / 100}))`}
                    />
                  )}
                </svg>
                
                {/* Info */}
                <div className="absolute -bottom-14 left-0 right-0 text-center pointer-events-none">
                  <p className="font-bold text-white text-xs drop-shadow-lg">{mockSize.name}</p>
                  <p className="text-xs text-gray-300 drop-shadow">2/4 Calabresa</p>
                  <p className="text-xs text-gray-300 drop-shadow">2/4 Mussarela</p>
                  <p className="text-xs text-yellow-400 drop-shadow">🧀 Borda: {mockEdge.name}</p>
                </div>
              </div>
              </div>

              {/* Controle de Redimensionamento da Tábua */}
              <div 
              className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-lg cursor-nwse-resize flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors z-20"
              onMouseDown={handleResizeMouseDown}
              title="Arraste para redimensionar a tábua"
              >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              </div>
              </div>
              </div>
              </Card>

        {/* Controls */}
        <Card className="p-3 md:p-4">
          <h3 className="font-semibold mb-3 text-sm md:text-base">Controles</h3>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            <Accordion type="multiple" defaultValue={["general", "pizza"]} className="space-y-2">
              {/* Posicionamento Geral */}
              <AccordionItem value="general" className="border rounded-lg px-3 py-2 bg-orange-50/50 dark:bg-orange-950/20">
                <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                  📐 Posicionamento Geral
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs md:text-sm font-semibold">Tamanho Geral (Pizza + Borda): {settings.pizzaScale}%</Label>
                  <Slider
                    value={[settings.pizzaScale]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, pizzaScale: v }))}
                    min={50}
                    max={150}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs md:text-sm font-semibold">Posição Horizontal: {settings.globalOffsetX}px</Label>
                    <Slider
                      value={[settings.globalOffsetX]}
                      onValueChange={([v]) => setSettings(prev => ({ ...prev, globalOffsetX: v }))}
                      min={-100}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm font-semibold">Posição Vertical: {settings.globalOffsetY}px</Label>
                    <Slider
                      value={[settings.globalOffsetY]}
                      onValueChange={([v]) => setSettings(prev => ({ ...prev, globalOffsetY: v }))}
                      min={-100}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Rotação da Pizza: {settings.pizzaRotation}°</Label>
                  <Slider
                    value={[settings.pizzaRotation]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, pizzaRotation: v }))}
                    min={0}
                    max={360}
                    step={15}
                    className="mt-2"
                  />
                </div>
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Pizza */}
              <AccordionItem value="pizza" className="border rounded-lg px-3 py-2">
                <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                  🍕 Pizza (ajustes finos)
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs md:text-sm">Raio da Pizza: {settings.pizzaRadius}</Label>
                  <Slider
                    value={[settings.pizzaRadius]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, pizzaRadius: v }))}
                    min={25}
                    max={45}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs md:text-sm">Ajuste X: {settings.pizzaOffsetX.toFixed(1)}px</Label>
                    <Slider
                      value={[settings.pizzaOffsetX]}
                      onValueChange={([v]) => setSettings(prev => ({ ...prev, pizzaOffsetX: v }))}
                      min={-50}
                      max={50}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Ajuste Y: {settings.pizzaOffsetY.toFixed(1)}px</Label>
                    <Slider
                      value={[settings.pizzaOffsetY]}
                      onValueChange={([v]) => setSettings(prev => ({ ...prev, pizzaOffsetY: v }))}
                      min={-50}
                      max={50}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Borda */}
              <AccordionItem value="edge" className="border rounded-lg px-3 py-2">
                <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                  🧀 Borda (ajustes finos)
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs md:text-sm">Raio da Borda: {settings.edgeRadius}</Label>
                  <Slider
                    value={[settings.edgeRadius]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, edgeRadius: v }))}
                    min={38}
                    max={48}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Espessura da Borda: {settings.edgeStrokeWidth}</Label>
                  <Slider
                    value={[settings.edgeStrokeWidth]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, edgeStrokeWidth: v }))}
                    min={5}
                    max={15}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">URL da Imagem da Borda</Label>
                  <Input
                    value={settings.edgeImageUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, edgeImageUrl: e.target.value }))}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Efeitos */}
              <AccordionItem value="effects" className="border rounded-lg px-3 py-2">
                <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                  ✨ Efeitos
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs md:text-sm">Intensidade das Sombras: {settings.shadowIntensity}%</Label>
                  <Slider
                    value={[settings.shadowIntensity]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, shadowIntensity: v }))}
                    min={0}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tábua */}
              <AccordionItem value="board" className="border rounded-lg px-3 py-2">
                <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                  🪵 Tábua
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs md:text-sm">Tamanho: {settings.boardScale}%</Label>
                  <Slider
                    value={[settings.boardScale]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, boardScale: v }))}
                    min={60}
                    max={150}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Opacidade: {settings.boardOpacity}%</Label>
                  <Slider
                    value={[settings.boardOpacity]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, boardOpacity: v }))}
                    min={0}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs md:text-sm">Ajuste X: {settings.boardOffsetX.toFixed(1)}px</Label>
                    <Slider
                      value={[settings.boardOffsetX]}
                      onValueChange={([v]) => setSettings(prev => ({ ...prev, boardOffsetX: v }))}
                      min={-50}
                      max={50}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Ajuste Y: {settings.boardOffsetY.toFixed(1)}px</Label>
                    <Slider
                      value={[settings.boardOffsetY]}
                      onValueChange={([v]) => setSettings(prev => ({ ...prev, boardOffsetY: v }))}
                      min={-50}
                      max={50}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">URL da Imagem da Tábua</Label>
                  <Input
                    value={settings.boardImageUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, boardImageUrl: e.target.value }))}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
                </AccordionContent>
              </AccordionItem>

              {/* Background */}
              <AccordionItem value="background" className="border rounded-lg px-3 py-2">
                <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                  🖼️ Fundo
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs md:text-sm">URL da Imagem de Fundo</Label>
                  <Input
                    value={settings.backgroundImage}
                    onChange={(e) => setSettings(prev => ({ ...prev, backgroundImage: e.target.value }))}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Opacidade: {settings.backgroundOpacity}%</Label>
                  <Slider
                    value={[settings.backgroundOpacity]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, backgroundOpacity: v }))}
                    min={0}
                    max={40}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Desfoque: {settings.backgroundBlur}px</Label>
                  <Slider
                    value={[settings.backgroundBlur]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, backgroundBlur: v }))}
                    min={0}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-2 mt-4 pt-4 border-t">
              <Button 
                onClick={handleSaveSettings} 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                💾 Salvar Configurações
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setSettings({
                    pizzaScale: 100,
                    globalOffsetX: 0,
                    globalOffsetY: 0,
                    pizzaOffsetX: 0,
                    pizzaOffsetY: 0,
                    pizzaRadius: 35,
                    edgeRadius: 42.5,
                    edgeStrokeWidth: 9,
                    boardOffsetX: 0,
                    boardOffsetY: 0,
                    boardScale: 90,
                    boardOpacity: 100,
                    pizzaRotation: 0,
                    shadowIntensity: 50,
                    backgroundImage: settings.backgroundImage,
                    backgroundOpacity: 5,
                    backgroundBlur: 1,
                    edgeImageUrl: settings.edgeImageUrl,
                    boardImageUrl: settings.boardImageUrl
                  })}
                  variant="outline" 
                  className="flex-1"
                >
                  🔄 Resetar
                </Button>
                <Button onClick={exportSettings} variant="outline" className="flex-1">
                  📋 Copiar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}