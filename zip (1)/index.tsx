import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Menu, 
  Search, 
  ChevronDown, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Star,
  ChevronLeft,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Dados do Cardápio ---
const FLAVORS = [
  { id: 1, name: 'PORTUGUESA', price: 25.00, desc: 'Azeitona, Calabresa, Cebola, Molho de Tomate, Mussarela, Orégano, Ovo, Pimentão, Presunto', category: 'Tradicional', img: 'https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&q=80&w=200' },
  { id: 2, name: 'PRESUNTO', price: 25.00, desc: 'Cebola, Molho de Tomate, Mussarela, Orégano, Presunto, Tomate', category: 'Tradicional', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=200' },
  { id: 3, name: 'CALABRESA ESPECIAL', price: 30.00, desc: 'Azeitona, Calabresa, Catupiry, Cebola, Molho de Tomate, Mussarela, Orégano, Tomate', category: 'Especiais', img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=200' },
  { id: 4, name: 'FRANGO ESPECIAL', price: 30.00, desc: 'Azeitona, Milho Verde, Filé de Frango, Molho de Tomate, Mussarela, Orégano, Tomate', category: 'Especiais', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=200' },
  { id: 5, name: 'NAPOLITANA', price: 30.00, desc: 'Bacon, Ervilha, Milho Verde, Molho de Tomate, Mussarela, Orégano, Presunto', category: 'Especiais', img: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&q=80&w=200' },
  { id: 6, name: 'CAMARÃO', price: 35.00, desc: 'Azeitona, Camarão, Cebola, Molho de Tomate, Mussarela, Orégano', category: 'Premium', img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&q=80&w=200' },
  { id: 7, name: 'PEPPERONI', price: 35.00, desc: 'Pepperoni, Mussarela, Molho Especial', category: 'Premium', img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&q=80&w=200' },
];

const SIZES = [
  { id: 'broto', name: 'PIZZA BROTO - 4 FATIAS 25CM', price: 20 },
  { id: 'media', name: 'PIZZA MÉDIA - 6 FATIAS 30CM', price: 30 },
  { id: 'grande', name: 'PIZZA GRANDE - 8 FATIAS 35CM', price: 40 },
];

const BORDERS = [
  { id: 'none', name: 'Sem Borda', price: 0 },
  { id: 'catupiry', name: 'Borda de Catupiry', price: 8 },
  { id: 'cheddar', name: 'Borda de Cheddar', price: 8 },
  { id: 'chocolate', name: 'Borda de Chocolate', price: 10 },
];

const MASSAS = [
  { id: 'tradicional', name: 'Tradicional' },
  { id: 'integral', name: 'Massa Integral' },
  { id: 'fina', name: 'Massa Fina' },
];

const App = () => {
  const [step, setStep] = useState<'welcome' | 'custom' | 'flavors' | 'borders' | 'massa'>('welcome');
  const [flavorCount, setFlavorCount] = useState(1);
  const [selectedSize, setSelectedSize] = useState(SIZES[2]);
  const [selectedFlavors, setSelectedFlavors] = useState<any[]>([]);
  const [selectedBorder, setSelectedBorder] = useState(BORDERS[0]);
  const [selectedMassa, setSelectedMassa] = useState(MASSAS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFlavors = useMemo(() => {
    return FLAVORS.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const toggleFlavor = (flavor: any) => {
    if (selectedFlavors.find(f => f.id === flavor.id)) {
      setSelectedFlavors(selectedFlavors.filter(f => f.id !== flavor.id));
    } else if (selectedFlavors.length < flavorCount) {
      setSelectedFlavors([...selectedFlavors, flavor]);
    }
  };

  const totalPrice = useMemo(() => {
    const baseSizePrice = selectedSize.price;
    const flavorsPrice = selectedFlavors.length > 0 
      ? Math.max(...selectedFlavors.map(f => f.price)) 
      : 0;
    const borderPrice = selectedBorder.price;
    return baseSizePrice + flavorsPrice + borderPrice;
  }, [selectedFlavors, selectedSize, selectedBorder]);

  // --- Views ---

  const WelcomeView = () => (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&q=80&w=1000" 
          className="w-full h-full object-cover opacity-60 scale-105"
          alt="Pizza Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <header className="relative z-10 w-full bg-pizza-red py-4 px-6 flex items-center gap-4 shadow-lg">
        <Menu className="text-white" />
        <h1 className="text-white font-black tracking-wider text-xl uppercase">Bem-Vindo</h1>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center mt-[-60px]">
        <h2 className="text-6xl font-black text-white leading-tight mb-2 italic drop-shadow-lg">PIZZA<br/>DELIVERY</h2>
        <div className="bg-pizza-red p-1 rounded-sm rotate-[-2deg] mb-8 shadow-xl">
            <span className="text-white font-bold px-4 py-1 text-sm uppercase">Faça seu pedido online</span>
        </div>

        <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center justify-center gap-2 text-white">
                <MapPin size={22} className="text-pizza-red" />
                <span className="font-black text-xl">Matão</span>
            </div>
            <div className="space-y-3 text-sm text-gray-200 bg-black/40 p-6 rounded-2xl backdrop-blur-md border border-white/5">
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="flex items-center gap-2"><Clock size={16} /> Tempo de entrega</span>
                    <span className="text-white font-black">50 Min</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="flex items-center gap-2"><ShoppingBag size={16} /> Tempo p/ retirada</span>
                    <span className="text-white font-black">20 Min</span>
                </div>
                <div className="flex justify-between">
                    <span className="flex items-center gap-2"><Star size={16} /> Pedido mínimo</span>
                    <span className="text-white font-black">R$ 15,00</span>
                </div>
            </div>
        </div>

        <button 
          onClick={() => setStep('custom')}
          className="mt-12 bg-pizza-red hover:bg-red-700 text-white font-black py-5 px-14 rounded-full text-xl shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] transition-all active:scale-95"
        >
          INICIAR PEDIDO
        </button>
      </main>
    </div>
  );

  const CustomView = () => (
    <div className="min-h-screen w-full flex flex-col bg-[#0f0f0f]">
      <header className="bg-pizza-red py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <Menu className="text-white" />
          <h1 className="text-white font-black text-xl uppercase tracking-tighter">Minha Pizza</h1>
        </div>
        <div className="relative">
            <ShoppingBag className="text-white" />
            <span className="absolute -top-2 -right-2 bg-white text-pizza-red text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">0</span>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full">
        {/* Tamanho Selector */}
        <div className="space-y-2">
          <label className="text-white text-xs font-black uppercase tracking-widest opacity-80">Tamanho:</label>
          <div className="relative">
            <select 
              className="w-full bg-pizza-red text-white py-4 px-4 rounded-xl font-bold appearance-none text-sm shadow-lg border-b-4 border-red-800 focus:outline-none"
              value={selectedSize.id}
              onChange={(e) => setSelectedSize(SIZES.find(s => s.id === e.target.value) || SIZES[2])}
            >
              {SIZES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={20} />
          </div>
        </div>

        {/* Sabores Count com botões - e + conforme imagem */}
        <div className="flex items-center justify-between bg-pizza-red rounded-xl p-1 shadow-lg border-b-4 border-red-800">
            <button 
                onClick={() => setFlavorCount(prev => Math.max(1, prev - 1))}
                className="w-12 h-12 flex items-center justify-center text-white"
            >
                <Minus size={24} strokeWidth={3} />
            </button>
            <span className="text-white font-black text-lg tracking-tighter uppercase">
                {flavorCount} {flavorCount === 1 ? 'SABOR' : 'SABORES'}
            </span>
            <button 
                onClick={() => setFlavorCount(prev => Math.min(4, prev + 1))}
                className="w-12 h-12 flex items-center justify-center text-white"
            >
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>

        {/* Visualizer da Pizza */}
        <div className="flex flex-col items-center py-4 relative">
            <div className="relative w-72 h-72 pizza-container group">
                {/* Board / Base Wood Effect */}
                <div className="absolute inset-[-15px] bg-[#3a2214] rounded-full border-[12px] border-[#2a1a0f] shadow-2xl" />
                
                <div className="absolute inset-0 bg-[#333] rounded-full border-8 border-pizza-red shadow-inner overflow-hidden flex transition-transform duration-500 hover:rotate-6">
                    {flavorCount === 1 ? (
                        <div className="w-full h-full flex items-center justify-center text-white/20 bg-[#444]">
                            {selectedFlavors[0] ? (
                                <img src={selectedFlavors[0].img} className="w-full h-full object-cover animate-fade-in" />
                            ) : <Plus size={64} className="opacity-10" />}
                        </div>
                    ) : (
                        <div className="w-full h-full flex relative">
                            {Array.from({ length: flavorCount }).map((_, i) => (
                                <div 
                                  key={i} 
                                  style={{ width: `${100 / flavorCount}%` }}
                                  className={`h-full border-r border-pizza-red/20 flex items-center justify-center overflow-hidden bg-[#${4 + i}${4 + i}${4 + i}]`}
                                >
                                    {selectedFlavors[i] ? (
                                        <img src={selectedFlavors[i].img} className="w-full h-full object-cover animate-fade-in" />
                                    ) : <Plus className="text-white/20" size={32} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Linhas divisórias overlay para > 1 sabor */}
                {flavorCount > 1 && Array.from({ length: flavorCount - 1 }).map((_, i) => (
                    <div 
                      key={i}
                      style={{ left: `${(100 / flavorCount) * (i + 1)}%` }}
                      className="absolute top-0 w-1 h-full bg-pizza-red/40 z-10" 
                    />
                ))}
            </div>
            
            <div className="mt-8 text-center bg-black/40 px-8 py-3 rounded-full border border-white/5">
                <span className="text-[10px] text-gray-500 font-black uppercase block tracking-tighter">Preço da pizza:</span>
                <span className="text-3xl font-black text-white italic">R$ {totalPrice.toFixed(2)}</span>
            </div>
        </div>

        {/* Sabores Selection Button */}
        <button 
            onClick={() => setStep('flavors')}
            className="w-full bg-white text-gray-500 py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl border border-gray-300 active:bg-gray-100 transition-colors uppercase text-sm"
        >
            <Star size={18} className="text-pizza-red fill-pizza-red" /> Escolher Sabores
        </button>

        {/* Opções Extras - Estilo Botões da Imagem */}
        <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setStep('borders')}
              className="w-full bg-pizza-red text-white py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
                <Star size={18} className="fill-white" /> {selectedBorder.id === 'none' ? 'Escolher Borda' : selectedBorder.name}
            </button>
            <button 
              onClick={() => setStep('massa')}
              className="w-full bg-white text-blue-600 py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg border border-blue-100"
            >
                <div className="bg-blue-600 text-white rounded-full p-1"><X size={12} /></div> Massa: {selectedMassa.name}
            </button>
        </div>

        {/* Adicionar Button - Verde conforme imagem */}
        <button 
          className="w-full bg-[#4caf50] hover:bg-[#43a047] text-white py-5 rounded-xl font-black text-xl shadow-[0_10px_40px_-10px_rgba(76,175,80,0.5)] flex items-center justify-center gap-3 active:scale-95 transition-all mt-8"
        >
            <ShoppingBag size={24} /> ADICIONAR AO PEDIDO
        </button>
      </div>
    </div>
  );

  const SelectionOverlay = ({ title, items, current, onSelect, onClose }: any) => (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col p-6 animate-fade-in backdrop-blur-md">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-white font-black text-2xl uppercase italic tracking-tighter">{title}</h2>
            <button onClick={onClose} className="text-white bg-pizza-red p-2 rounded-full"><X size={24} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto pr-2">
            {items.map((item: any) => (
                <button
                    key={item.id}
                    onClick={() => { onSelect(item); onClose(); }}
                    className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${current.id === item.id ? 'border-pizza-red bg-pizza-red/20 text-white' : 'border-white/10 bg-white/5 text-gray-400'}`}
                >
                    <span className="font-black uppercase">{item.name}</span>
                    {item.price > 0 && <span className="text-sm font-bold text-gray-400">+ R$ {item.price.toFixed(2)}</span>}
                    {current.id === item.id && <Check className="text-pizza-red" />}
                </button>
            ))}
        </div>
    </div>
  );

  const FlavorsView = () => (
    <div className="min-h-screen w-full flex flex-col bg-white">
        <header className="bg-pizza-red py-4 px-6 sticky top-0 z-50 shadow-md">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep('custom')} className="text-white"><ChevronLeft size={28} strokeWidth={3} /></button>
                <h1 className="text-white font-black text-xl uppercase tracking-tighter">Selecione um Sabor</h1>
                <div className="w-8" />
            </div>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Pesquisar sabor..."
                    className="w-full bg-white rounded-xl py-4 pl-12 pr-4 text-gray-900 font-medium text-sm focus:outline-none shadow-inner border border-gray-100"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>
        </header>

        <main className="flex-1 p-4 space-y-10 bg-gray-50 overflow-y-auto pb-32">
            {['Tradicional', 'Especiais', 'Premium'].map(category => (
                <div key={category} className="space-y-6">
                    <h3 className="text-pizza-red font-black italic text-2xl border-l-4 border-pizza-red pl-4 uppercase tracking-tighter drop-shadow-sm">{category}</h3>
                    <div className="grid grid-cols-1 gap-6">
                        {filteredFlavors.filter(f => f.category === category).map(flavor => {
                            const isSelected = selectedFlavors.find(f => f.id === flavor.id);
                            return (
                                <motion.div 
                                    key={flavor.id}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => toggleFlavor(flavor)}
                                    className={`flex gap-5 bg-white p-4 rounded-2xl shadow-md border-2 transition-all relative overflow-hidden ${isSelected ? 'border-pizza-red ring-4 ring-red-100' : 'border-transparent'}`}
                                >
                                    <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-4 border-gray-50 shadow-lg group-hover:rotate-12 transition-transform">
                                        <img src={flavor.img} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-gray-900 font-black text-base uppercase tracking-tight">{flavor.name}</h4>
                                            <span className="text-pizza-red font-black text-base italic">R$ {flavor.price.toFixed(2)}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-medium leading-tight mt-2 line-clamp-2 pr-4">
                                            {flavor.desc}
                                        </p>
                                        {flavor.category === 'Premium' && (
                                            <div className="mt-3 flex gap-2">
                                                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-3 py-1 rounded-full uppercase italic border border-amber-200">
                                                    Do Chef
                                                </span>
                                                <span className="bg-red-100 text-red-700 text-[9px] font-black px-3 py-1 rounded-full uppercase italic border border-red-200">
                                                    Premium
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 bg-pizza-red text-white p-1 rounded-full shadow-lg">
                                            <Check size={14} strokeWidth={4} />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-6 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Progresso</span>
                <span className="text-sm font-black text-gray-900 uppercase">
                    {selectedFlavors.length} de {flavorCount} sabores
                </span>
            </div>
            <button 
                onClick={() => setStep('custom')}
                className={`px-12 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedFlavors.length === flavorCount ? 'bg-pizza-red text-white shadow-xl shadow-red-900/20' : 'bg-gray-100 text-gray-400'}`}
                disabled={selectedFlavors.length !== flavorCount}
            >
                Confirmar
            </button>
        </footer>
    </div>
  );

  return (
    <div className="antialiased">
      {step === 'welcome' && <WelcomeView />}
      {step === 'custom' && <CustomView />}
      {step === 'flavors' && <FlavorsView />}
      {step === 'borders' && (
          <SelectionOverlay 
            title="Escolha a Borda" 
            items={BORDERS} 
            current={selectedBorder} 
            onSelect={setSelectedBorder} 
            onClose={() => setStep('custom')} 
          />
      )}
      {step === 'massa' && (
          <SelectionOverlay 
            title="Escolha a Massa" 
            items={MASSAS} 
            current={selectedMassa} 
            onSelect={setSelectedMassa} 
            onClose={() => setStep('custom')} 
          />
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}