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

export default function AIChatbot({ dishes = [], orders: ordersProp = [], onAddToCart, open: controlledOpen, onOpenChange, slug, storeName }) {
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

  // Buscar pratos e categorias para contexto
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order'),
  });

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

  // Processar mensagem do usuário
  const processMessage = async (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // FAQ - Perguntas frequentes
    if (lowerMessage.includes('horário') || lowerMessage.includes('aberto') || lowerMessage.includes('funciona')) {
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

    // Resposta padrão com sugestões
    return {
      text: 'Entendi! Como posso ajudar? Você pode:\n\n• Ver o cardápio 📋\n• Fazer um pedido 🛒\n• Rastrear seu pedido 📦\n• Ver horários e informações 🕐',
      suggestions: ['Ver cardápio', 'Fazer pedido', 'Rastrear pedido', 'Ver horários']
    };
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const textToSend = inputText.trim();
    setInputText('');
    setIsTyping(true);

    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }));
    const dishesSummary = dishes
      .filter((d) => d.is_active !== false && d.name)
      .slice(0, 40)
      .map((d) => `${d.name} (R$ ${(d.price || 0).toFixed(2)})`)
      .join('; ');

    try {
      const res = await fetch(getChatApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          slug: slug || '',
          storeName: storeName || '',
          dishesSummary,
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
      setInputText(suggestion);
      setTimeout(() => handleSendMessage(), 100);
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
