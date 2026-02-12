import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

/**
 * AIChatbot - Chatbot inteligente para atendimento automatizado
 * Funcionalidades:
 * - Responder FAQ
 * - Recomendar pratos
 * - Receber pedidos
 * - Rastrear pedidos
 * - Sugestões inteligentes
 */
const getChatApiUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  if (base.endsWith('/api')) return `${base}/public/chat`;
  return base ? `${base}/api/public/chat` : '/api/public/chat';
};

/** Monta texto do cardápio para a IA: categorias, pratos com preço, complementos e extras */
function buildMenuFull(dishes = [], categories = [], complementGroups = []) {
  const lines = [];
  const sortedCats = [...(categories || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  sortedCats.forEach(cat => {
    const items = (dishes || []).filter(d => d.category_id === cat.id && d.is_active !== false && d.name);
    if (items.length === 0) return;
    lines.push(`\n## ${cat.name}`);
    items.forEach(d => {
      let line = `- ${d.name}: R$ ${(d.price ?? 0).toFixed(2)}`;
      if (d.description) line += ` — ${(d.description || '').slice(0, 80)}`;
      const groupIds = (d.complement_groups || []).map(cg => cg.group_id);
      const groups = (complementGroups || []).filter(g => groupIds.includes(g.id));
      if (groups.length) {
        const opts = groups.flatMap(g => (g.complements || []).filter(c => c.is_active !== false).map(c => `${c.name} (R$ ${(c.price || 0).toFixed(2)})`));
        if (opts.length) line += ` [complementos: ${opts.join(', ')}]`;
      }
      if (d.extras && d.extras.length) {
        const ex = d.extras.filter(e => e.is_active !== false).map(e => `${e.name} (R$ ${(e.price || 0).toFixed(2)})`);
        if (ex.length) line += ` [extras: ${ex.join(', ')}]`;
      }
      lines.push(line);
    });
  });
  const semCat = (dishes || []).filter(d => !d.category_id && d.is_active !== false && d.name);
  if (semCat.length) {
    lines.push('\n## Outros');
    semCat.forEach(d => {
      lines.push(`- ${d.name}: R$ ${(d.price ?? 0).toFixed(2)}`);
    });
  }
  return lines.join('\n') || 'Cardápio não disponível.';
}

/** Regras de entrega e taxa para a IA */
function buildDeliveryInfo(deliveryZones = [], store = null) {
  const parts = [];
  if (store?.delivery_fee_mode === 'distance') {
    parts.push('Taxa por distância (km).');
    if (store.delivery_base_fee != null) parts.push(`Taxa base: R$ ${Number(store.delivery_base_fee).toFixed(2)}.`);
    if (store.delivery_free_distance) parts.push(`Entrega grátis até ${store.delivery_free_distance} km.`);
  } else {
    const defaultFee = store?.delivery_fee ?? 0;
    parts.push(`Taxa padrão: R$ ${Number(defaultFee).toFixed(2)}.`);
    const zones = (deliveryZones || []).filter(z => z.is_active !== false && z.neighborhood);
    if (zones.length) {
      parts.push('Por bairro: ' + zones.slice(0, 15).map(z => `${z.neighborhood} R$ ${Number(z.fee || 0).toFixed(2)}`).join('; '));
    }
  }
  if (store?.delivery_min_order) parts.push(`Pedido mínimo: R$ ${Number(store.delivery_min_order).toFixed(2)}.`);
  return parts.join(' ') || 'Entrega conforme combinar com o cliente.';
}

const PAYMENT_LABELS = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito' };
function buildPaymentOptions() {
  return Object.entries(PAYMENT_LABELS).map(([value, label]) => `${label}`).join(', ');
}

export default function AIChatbot({ dishes = [], categories: categoriesProp = [], complementGroups = [], deliveryZones = [], store = null, orders: ordersProp = [], onAddToCart, open: controlledOpen, onOpenChange, slug, storeName }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Olá! 👋 Sou o assistente virtual. Como posso ajudar você hoje?',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Buscar categorias só quando não vieram pela prop (evita 404 em página pública sem login)
  const hasCategoriesProp = categoriesProp && categoriesProp.length > 0;
  const { data: categoriesFromApi = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order'),
    enabled: !hasCategoriesProp,
  });
  const categories = hasCategoriesProp ? categoriesProp : categoriesFromApi;

  // Buscar usuário e pedidos do cliente quando o chatbot está aberto (para "Rastrear pedido")
  const { data: authUser } = useQuery({
    queryKey: ['authMe'],
    queryFn: () => base44.auth.me(),
    enabled: isOpen,
    retry: false,
  });
  const { data: customerOrdersFromApi = [] } = useQuery({
    queryKey: ['customerOrdersForChatbot', authUser?.email],
    queryFn: async () => {
      const all = await base44.entities.Order.list('-created_date');
      const email = (authUser?.email || '').toLowerCase();
      if (!email) return [];
      return all.filter(o => {
        const byEmail = (o.customer_email || '').toLowerCase() === email || (o.created_by || '').toLowerCase() === email;
        const active = o.status !== 'delivered' && o.status !== 'cancelled';
        return byEmail && active;
      });
    },
    enabled: isOpen && !!authUser?.email,
  });
  const orders = ordersProp.length > 0 ? ordersProp : customerOrdersFromApi;

  // Processar mensagem do usuário (fallback quando a IA não está disponível)
  const processMessage = async (userMessage) => {
    const lowerMessage = userMessage.toLowerCase().trim();
    const normalized = lowerMessage.replace(/\s+/g, ' ');

    // Intenções dos botões de sugestão (evitar loop genérico)
    if (normalized.includes('ver cardápio') || normalized.includes('ver cardapio')) {
      const total = (dishes || []).filter(d => d.is_active !== false && d.name).length;
      const text = total > 0
        ? `O cardápio está logo acima nesta página! 📋 Role para cima para ver as categorias e ${total} pratos. Quer que eu recomende algo popular?`
        : 'O cardápio está na página — role para cima para ver as opções. 📋';
      return {
        text,
        suggestions: ['Recomendar pratos', 'Fazer pedido', 'Ver horários']
      };
    }
    if (normalized.includes('fazer pedido')) {
      return {
        text: 'Para fazer seu pedido: use o cardápio acima para escolher os itens e adicionar ao carrinho. 🛒 Ou me diga o que deseja (ex.: "quero 1 pizza de calabresa").',
        suggestions: ['Ver cardápio', 'Recomendar pratos', 'Ver horários']
      };
    }
    // "Rastrear pedido" / "Ver meus pedidos" caem no bloco de rastreio abaixo

    // FAQ - Perguntas frequentes
    if (lowerMessage.includes('horário') || lowerMessage.includes('horários') || lowerMessage.includes('aberto') || lowerMessage.includes('funciona')) {
      return {
        text: 'Estamos abertos de segunda a domingo, das 11h às 23h. 🕐',
        suggestions: ['Ver cardápio', 'Fazer pedido']
      };
    }

    if (lowerMessage.includes('entrega') || lowerMessage.includes('frete') || lowerMessage.includes('delivery')) {
      return {
        text: 'Oferecemos entrega em toda a região! O frete varia conforme a distância. 🚚\n\nPara calcular o frete, adicione um item ao carrinho e informe seu endereço no checkout.',
        suggestions: ['Ver cardápio', 'Calcular frete']
      };
    }

    if (lowerMessage.includes('pagamento') || lowerMessage.includes('pagar') || lowerMessage.includes('dinheiro')) {
      return {
        text: 'Aceitamos:\n💳 Cartão de crédito/débito\n💰 Dinheiro\n📱 PIX\n\nO pagamento é feito na entrega ou online!',
        suggestions: ['Fazer pedido']
      };
    }

    // Rastrear pedido
    if (lowerMessage.includes('pedido') || lowerMessage.includes('rastrear') || lowerMessage.includes('onde está')) {
      const orderNumbers = userMessage.match(/\d+/);
      if (orderNumbers && orders.length > 0) {
        const orderId = orderNumbers[0];
        const order = orders.find(o => o.order_code?.includes(orderId) || o.id?.toString().includes(orderId));
        if (order) {
          const statusMap = {
            new: '🆕 Novo',
            accepted: '✅ Aceito',
            preparing: '👨‍🍳 Em preparo',
            ready: '✅ Pronto',
            out_for_delivery: '🚚 Saiu para entrega',
            delivered: '✅ Entregue',
            cancelled: '❌ Cancelado'
          };
          return {
            text: `Seu pedido #${order.order_code || order.id} está: ${statusMap[order.status] || order.status}\n\n${order.status === 'out_for_delivery' ? 'O entregador está a caminho! 🚗' : ''}`,
            suggestions: ['Ver mais pedidos']
          };
        }
      }
      return {
        text: 'Para rastrear seu pedido, informe o número do pedido ou acesse "Meus Pedidos" no menu. 📦',
        suggestions: ['Ver meus pedidos']
      };
    }

    // Recomendar pratos
    if (lowerMessage.includes('recomend') || lowerMessage.includes('sugest') || lowerMessage.includes('indic')) {
      const activeDishes = dishes.filter(d => d.is_active !== false);
      const popularDishes = activeDishes
        .sort((a, b) => (b.orders_count || 0) - (a.orders_count || 0))
        .slice(0, 3);
      
      if (popularDishes.length > 0) {
        const dishList = popularDishes.map(d => `• ${d.name} - R$ ${d.price?.toFixed(2) || '0,00'}`).join('\n');
        return {
          text: `Recomendo estes pratos populares: 🍽️\n\n${dishList}\n\nQuer adicionar algum ao carrinho?`,
          suggestions: popularDishes.map(d => `Adicionar ${d.name}`),
          dishes: popularDishes
        };
      }
      return {
        text: 'Confira nosso cardápio completo! Temos opções deliciosas para todos os gostos. 😋',
        suggestions: ['Ver cardápio']
      };
    }

    // Receber pedido por texto
    if (lowerMessage.includes('quero') || lowerMessage.includes('pedir') || lowerMessage.includes('adicionar')) {
      const dishMatches = dishes.filter(dish => {
        const dishName = dish.name?.toLowerCase() || '';
        return lowerMessage.includes(dishName) || 
               dishName.split(' ').some(word => lowerMessage.includes(word));
      });

      if (dishMatches.length > 0) {
        const quantities = userMessage.match(/(\d+)\s*x/);
        const quantity = quantities ? parseInt(quantities[1]) : 1;
        const selectedDish = dishMatches[0];

        if (onAddToCart) {
          onAddToCart({ ...selectedDish, quantity });
        }

        return {
          text: `Perfeito! Adicionei ${quantity}x ${selectedDish.name} ao seu carrinho. 🛒\n\nQuer adicionar mais alguma coisa?`,
          suggestions: ['Ver carrinho', 'Ver cardápio', 'Finalizar pedido']
        };
      }

      return {
        text: 'Não consegui identificar o prato. Pode me dizer o nome completo? Ou prefere ver o cardápio? 📋',
        suggestions: ['Ver cardápio']
      };
    }

    // Resposta padrão: texto curto e sugestões (evitar duplicar lista em texto e botões)
    return {
      text: 'Como posso ajudar? Escolha uma opção abaixo.',
      suggestions: ['Ver cardápio', 'Fazer pedido', 'Rastrear pedido', 'Ver horários']
    };
  };

  /** Envia mensagem. Se textOverride for passado (ex.: clique em sugestão), usa esse texto. */
  const handleSendMessage = async (textOverride = null) => {
    const textToSend = (textOverride != null && String(textOverride).trim()) ? String(textOverride).trim() : inputText.trim();
    if (!textToSend) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textOverride) setInputText('');
    setIsTyping(true);

    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }));
    const dishesSummary = dishes
      .filter((d) => d.is_active !== false && d.name)
      .slice(0, 40)
      .map((d) => `${d.name} (R$ ${(d.price || 0).toFixed(2)})`)
      .join('; ');
    const menuFull = buildMenuFull(dishes, categories, complementGroups);
    const deliveryInfo = buildDeliveryInfo(deliveryZones, store);
    const paymentOptions = buildPaymentOptions();

    try {
      const res = await fetch(getChatApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          slug: slug || '',
          storeName: storeName || '',
          dishesSummary,
          menuFull,
          deliveryInfo,
          paymentOptions,
          history,
        }),
      });

      const data = res.ok ? await res.json() : null;
      if (data && data.text) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.text,
          suggestions: data.suggestions || [],
          step: data.step || null,
          dishes: [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
        return;
      }
    } catch (_) {
      // Fallback para regras locais
    }

    // Fallback: regras locais (FAQ, pedido, rastreio, etc.)
    const response = await processMessage(textToSend);
    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      text: response.text,
      suggestions: response.suggestions || [],
      dishes: response.dishes || [],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleSuggestion = (suggestion) => {
    if (suggestion.startsWith('Adicionar ')) {
      const dishName = suggestion.replace('Adicionar ', '');
      const dish = dishes.find(d => d.name === dishName);
      if (dish && onAddToCart) {
        onAddToCart(dish);
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          text: `✅ ${dish.name} adicionado ao carrinho!`,
          timestamp: new Date(),
        }]);
      }
    } else {
      handleSendMessage(suggestion);
    }
  };

  return (
    <>
      {/* Botão flutuante (só quando não controlado externamente, ex.: FAB único no Cardapio) */}
      {!isControlled && !isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-500/50 transition-shadow"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)]"
          >
            <Card className="h-full flex flex-col shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <div>
                    <h3 className="font-semibold">Assistente Virtual</h3>
                    <p className="text-xs opacity-90">Online agora</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.text}</p>
                      
                      {/* Sugestões */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestion(suggestion)}
                              className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Pratos recomendados */}
                      {message.dishes && message.dishes.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.dishes.map((dish) => (
                            <button
                              key={dish.id}
                              onClick={() => {
                                if (onAddToCart) {
                                  onAddToCart(dish);
                                  setMessages(prev => [...prev, {
                                    id: Date.now(),
                                    type: 'bot',
                                    text: `✅ ${dish.name} adicionado!`,
                                    timestamp: new Date(),
                                  }]);
                                }
                              }}
                              className="w-full text-left p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                            >
                              <p className="font-medium text-sm">{dish.name}</p>
                              <p className="text-xs opacity-90">R$ {dish.price?.toFixed(2) || '0,00'}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
