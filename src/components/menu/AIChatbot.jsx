import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { API_BASE_URL } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  STEPS,
  buildMenuForChat,
  getCrossSellOffer,
  getDishComplementGroups,
  canAddDishWithComplements,
  createCartItem,
  formatCartSummary,
  parseChangeResponse,
  buildOrderPayload,
} from './ChatOrderFlow';
import { formatCurrency } from '@/utils/formatters';
import { orderService } from '@/components/services/orderService';
import { whatsappService } from '@/components/services/whatsappService';
import { buscarCEP } from '@/utils/cepService';

/**
 * AIChatbot - Chatbot inteligente com fluxo completo de pedido
 * - Cardápio no chat com complementos
 * - Cross-sell (bebida, sobremesa, combo)
 * - Entrega ou retirada, endereço, pagamento, troco
 * - Pedido finalizado aparece em Pedidos
 */
const getChatApiUrl = () => {
  return `${API_BASE_URL}/public/chat`;
};
const getPedidoCardapioUrl = () => {
  return `${API_BASE_URL}/public/pedido-cardapio`;
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

const DAYS_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function buildStoreInfo(store) {
  if (!store) return {};
  const days = Array.isArray(store.working_days) && store.working_days.length > 0
    ? store.working_days.sort((a, b) => a - b).map(d => DAYS_NAMES[d] || '?').join(', ')
    : '';
  const open = store.opening_time || '08:00';
  const close = store.closing_time || '18:00';
  const storeHours = days ? `${days}, das ${String(open).slice(0, 5)} às ${String(close).slice(0, 5)}` : '';
  return {
    storeAddress: store.address || '',
    storeWhatsapp: store.whatsapp || '',
    storeHours,
    storeSlogan: store.slogan || '',
    storeInstagram: store.instagram || '',
    storeFacebook: store.facebook || '',
  };
}

const INITIAL_CUSTOMER = { name: '', phone: '', email: '', deliveryMethod: 'pickup', address_street: '', address_number: '', address_complement: '', neighborhood: '', cep: '', payment_method: '', needs_change: false, change_amount: null, address: '', delivery_fee_confirmed: false };

/** Delay antes de mostrar resposta (simula digitação real) */
const BOT_RESPONSE_DELAY_MS = 1200;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Garante valor string (evita [object Object] quando recebe objeto) */
function ensureString(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    const v = val.value ?? val.phone ?? val.phoneNumber ?? val.text ?? val.number ?? val.formattedValue;
    return v != null ? String(v).trim() : '';
  }
  const s = String(val).trim();
  return s === '[object Object]' ? '' : s;
}

/** Detecta mensagem ofensiva */
function isOffensive(text) {
  const t = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const bad = ['idiota', 'imbecil', 'burro', 'estupido', 'retardado', 'porra', 'caralho', 'merda', 'viado', 'filho da puta', 'fdp', 'vai se fuder', 'vsf', 'cu', 'pqp', 'cacete', 'arrombado', 'bosta', 'pau no cu', 'corno', 'vacilao', 'noob', 'lixo', 'inutil'];
  return bad.some((w) => t.includes(w));
}

/** Renderiza texto com ** como negrito real */
function BoldText({ text }) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\*\*(.+)\*\*$/);
        return m ? <strong key={i}>{m[1]}</strong> : p;
      })}
    </>
  );
}

export default function AIChatbot({ dishes = [], categories: categoriesProp = [], complementGroups = [], deliveryZones = [], store = null, orders: ordersProp = [], onAddToCart, onOrderCreated, open: controlledOpen, onOpenChange, slug, storeName, primaryColor: primaryColorProp }) {
  const primaryColor = primaryColorProp || store?.theme_primary_color || store?.primary_color || '#f97316';
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Olá! 👋 Sou o assistente virtual. Posso ajudar com o cardápio, pedidos completos pelo chat, horários, endereço e mais. Em que posso te ajudar?',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatOrderStep, setChatOrderStep] = useState(STEPS.idle);
  const [chatCart, setChatCart] = useState([]);
  const [chatCustomer, setChatCustomer] = useState(INITIAL_CUSTOMER);
  const [addressFieldStep, setAddressFieldStep] = useState(0); // 0=nome, 1=phone, 2=cep, 3=confirm/correct, 4=number, 5=delivery_fee
  const [addressFromCep, setAddressFromCep] = useState(null); // { logradouro, bairro, cidade, uf }
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [pendingDishAdd, setPendingDishAdd] = useState(null); // { dish, quantity, step: 'beverages'|'complements', selections, complementGroupIndex }
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

    if (isOffensive(userMessage)) {
      return {
        text: 'Prefiro manter nossa conversa cordial. 😊 Em que posso te ajudar com o cardápio ou pedido?',
        suggestions: ['Ver cardápio', 'Fazer pedido', 'Ver horários'],
      };
    }

    // Saudações — responder de forma condizente (oi, boa noite, olá, etc.)
    const greetingWords = ['oi', 'olá', 'ola', 'e aí', 'eai', 'hey', 'fala', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'oii', 'tudo bem', 'td bem', 'tranquilo', 'tranquila', 'hello', 'hi'];
    const isOnlyGreeting = greetingWords.some(g => {
      const re = new RegExp(`^${g.replace(/\s/g, '\\s')}[\\s\\.,!?]*$`, 'i');
      return re.test(normalized);
    });
    const isShortGreeting = normalized.length <= 25 && greetingWords.some(g => normalized.includes(g));
    const isGreeting = isOnlyGreeting || (isShortGreeting && !/pedir|cardápio|quero|preço|pedido|entrega|endereço|horário/i.test(normalized));
    if (isGreeting) {
      const h = new Date().getHours();
      const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
      return {
        text: `${period}! 😊 Como posso te ajudar?`,
        suggestions: ['Ver cardápio', 'Fazer pedido', 'Ver horários', 'Ver endereço'],
      };
    }

    // Cardápio e pedido — menu com botões inline
    if (normalized.includes('ver cardápio') || normalized.includes('ver cardapio') || normalized.includes('fazer pedido')) {
      const menuData = buildMenuForChat(dishes, categories, complementGroups);
      return {
        text: 'Confira nossos pratos:',
        menuItems: menuData.menuItems || [],
        suggestions: menuData.suggestions || ['Finalizar pedido', 'Ver horários']
      };
    }
    // "Rastrear pedido" / "Ver meus pedidos" caem no bloco de rastreio abaixo

    // FAQ - Perguntas frequentes
    if (lowerMessage.includes('horário') || lowerMessage.includes('horários') || lowerMessage.includes('aberto') || lowerMessage.includes('funciona')) {
      const si = buildStoreInfo(store);
      const hoursText = si.storeHours || 'Seg a Dom, das 11h às 23h';
      return {
        text: `Estamos abertos: ${hoursText}. 🕐 O que vai querer hoje?`,
        suggestions: ['Ver cardápio', 'Fazer pedido'],
      };
    }

    if ((lowerMessage.includes('endereço') || lowerMessage.includes('endereco') || lowerMessage.includes('onde ficam') || lowerMessage.includes('local')) && store?.address) {
      return {
        text: `Ficamos em ${store.address}. 📍 Quer fazer um pedido?`,
        suggestions: ['Ver cardápio', 'Fazer pedido', 'Ver horários'],
      };
    }

    if ((lowerMessage.includes('contato') || lowerMessage.includes('telefone') || lowerMessage.includes('whatsapp') || lowerMessage.includes('falar')) && store?.whatsapp) {
      return {
        text: `Nosso WhatsApp: ${store.whatsapp} 💬 Posso ajudar com o pedido também!`,
        suggestions: ['Abrir WhatsApp', 'Ver cardápio', 'Fazer pedido'],
      };
    }

    if (lowerMessage.includes('entrega') || lowerMessage.includes('frete') || lowerMessage.includes('delivery')) {
      return {
        text: 'Temos entrega! Adicione os itens e informe o endereço no checkout para ver a taxa. 🚚',
        suggestions: ['Ver cardápio', 'Fazer pedido'],
      };
    }

    if (lowerMessage.includes('pagamento') || lowerMessage.includes('pagar') || lowerMessage.includes('dinheiro')) {
      return {
        text: 'Aceitamos PIX, dinheiro e cartão. Quer ver o cardápio?',
        suggestions: ['Ver cardápio', 'Fazer pedido'],
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
          text: `Pedido #${order.order_code || order.id}: ${statusMap[order.status] || order.status}.${order.status === 'out_for_delivery' ? ' O entregador está a caminho! 🚗' : ''}`,
          suggestions: ['Ver mais pedidos', 'Ver cardápio'],
        };
        }
      }
      return {
        text: 'Informe o número do pedido ou acesse "Meus Pedidos". Posso mostrar o cardápio?',
        suggestions: ['Ver meus pedidos', 'Ver cardápio'],
      };
    }

    // Recomendar pratos
    if (lowerMessage.includes('recomend') || lowerMessage.includes('sugest') || lowerMessage.includes('indic')) {
      const activeDishes = dishes.filter(d => d.is_active !== false);
      const popularDishes = activeDishes
        .sort((a, b) => (b.orders_count || 0) - (a.orders_count || 0))
        .slice(0, 3);
      
      if (popularDishes.length > 0) {
        return {
          text: `Recomendo: ${popularDishes.map((d) => d.name).join(', ')}. Qual vai querer?`,
          suggestions: popularDishes.map((d) => `Adicionar ${d.name}`),
          dishes: popularDishes,
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
          text: `Adicionei ${quantity}x ${selectedDish.name}. Mais alguma coisa?`,
          suggestions: ['Ver carrinho', 'Ver cardápio', 'Finalizar pedido'],
        };
      }

      return {
        text: 'Qual prato você quer? Posso mostrar o cardápio.',
        suggestions: ['Ver cardápio'],
      };
    }

    // Resposta padrão: sempre redireciona para o foco do restaurante
    return {
      text: 'Posso ajudar com o cardápio, pedidos ou horários. O que prefere?',
      suggestions: ['Ver cardápio', 'Fazer pedido', 'Rastrear pedido', 'Ver horários'],
    };
  };

  /** Monta mensagem de UM complemento por vez (pergunta sequencial) */
  const buildComplementMessage = (dish, selections = {}, groupIndex = 0) => {
    const groups = getDishComplementGroups(dish, complementGroups);
    if (!groups.length) return null;
    const optsByGroup = groups
      .map((g) => {
        const opts = (g.options || g.complements || []).filter((c) => c && c.is_active !== false);
        const linked = dish?.complement_groups?.find((cg) => cg.group_id === g.id);
        return { group: g, options: opts, required: !!linked?.is_required };
      })
      .filter((x) => x.options.length > 0);
    if (!optsByGroup.length) return null;

    // Todos os grupos já foram respondidos
    if (groupIndex >= optsByGroup.length) {
      return {
        text: 'Pronto! Deseja adicionar ao carrinho?',
        suggestions: ['Adicionar ao carrinho'],
      };
    }

    const current = optsByGroup[groupIndex];
    const groupName = (current.group.name || '').toLowerCase();
    const maxSel = current.group.max_selection || 1;
    const selCount = (() => {
      const s = selections[current.group.id];
      return Array.isArray(s) ? s.length : s ? 1 : 0;
    })();
    const isYesNo = groupName.includes('colher') || groupName.includes('talher') || groupName.includes('guardanapo') || current.options.every((o) => /sim|não|nao/i.test(o.name));

    const ordinais = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta'];
    let text;
    let suggestionBtns;
    if (isYesNo) {
      text = `Você vai querer ${current.group.name}?`;
      suggestionBtns = [...current.options.map((o) => o.name), ...(current.required ? [] : ['Pular'])];
    } else {
      if (maxSel > 1) {
        if (selCount === 0) {
          text = `${current.group.name}: você pode escolher até ${maxSel} opções. Escolha a ${ordinais[0]}:`;
        } else if (selCount < maxSel) {
          text = `Certo! Agora escolha a ${ordinais[selCount]} opção:`;
          suggestionBtns = [...current.options.map((o) => (o.price ? `${o.name} (+${formatCurrency(o.price)})` : o.name)), ...(current.required ? [] : ['Pular'])];
          suggestionBtns.push('Continuar');
        }
      }
      if (!text) {
        text = groupIndex === 0
          ? `${current.group.name}: qual opção?`
          : `Certo! Agora escolha o tipo de ${current.group.name}:`;
      }
      if (!suggestionBtns) {
        suggestionBtns = [...current.options.map((o) => (o.price ? `${o.name} (+${formatCurrency(o.price)})` : o.name)), ...(current.required ? [] : ['Pular'])];
        if (maxSel > 1 && selCount > 0 && selCount < maxSel) suggestionBtns.push('Continuar');
        else if (maxSel > 1 && selCount >= maxSel) suggestionBtns = ['Continuar'];
      }
    }

    return { text, suggestions: suggestionBtns || [], complementGroups: optsByGroup, currentGroupIndex: groupIndex };
  };

  /** Processa fluxo de pedido pelo chat */
  const processChatOrderFlow = async (textToSend) => {
    const t = textToSend.toLowerCase().trim();
    const normalized = t.replace(/\s+/g, ' ');

    if (isOffensive(textToSend)) {
      return {
        text: 'Vamos manter a cordialidade? 😊 Posso ajudar com o cardápio ou pedido.',
        suggestions: ['Ver cardápio', 'Fazer pedido'],
      };
    }

    // 1) Fluxo pendente: bebidas/upsell → complementos → adicionar
    if (pendingDishAdd) {
      const { dish, quantity, step, selections = {} } = pendingDishAdd;
      const simCart = [...chatCart, createCartItem(dish, quantity, null, selections)];
      const crossOffer = getCrossSellOffer(simCart, dishes, store);

      const isPular = normalized.includes('pular') || normalized.includes('não') || normalized.includes('nao') || normalized.includes('não obrigado') || normalized.includes('nao obrigado');
      if (step === 'beverages' && crossOffer) {
        const addPart = normalized.replace(/^(?:adicionar|quero|pedir)\s+/, '').trim();
        const dishMatch = crossOffer.dish?.name && (
          addPart.includes(crossOffer.dish.name.toLowerCase()) ||
          normalized === crossOffer.suggestion?.toLowerCase() ||
          (addPart && crossOffer.dish.name.toLowerCase().includes(addPart))
        );
        if (dishMatch) {
          const promoPrice = crossOffer.price;
          const bevItem = createCartItem(crossOffer.dish, 1, promoPrice);
          setChatCart(prev => [...prev, bevItem]);
          if (onAddToCart) onAddToCart({ ...crossOffer.dish, quantity: 1, totalPrice: promoPrice });
          setPendingDishAdd(prev => ({ ...prev, step: 'complements', complementGroupIndex: 0 }));
          const compMsg = buildComplementMessage(dish, selections, 0);
          if (compMsg) return { text: compMsg.text, suggestions: compMsg.suggestions, complementData: compMsg };
          const item = createCartItem(dish, quantity, null, selections);
          setChatCart(prev => [...prev, item]);
          if (onAddToCart) onAddToCart({ dish, quantity, totalPrice: item.totalPrice, selections });
          setPendingDishAdd(null);
          return { text: `✅ ${quantity}x ${dish.name} adicionado! Deseja mais alguma coisa?`, suggestions: ['Ver cardápio', 'Finalizar pedido'] };
        }
        if (!isPular) {
          return { text: `${crossOffer.title} ${crossOffer.message}`, suggestions: [crossOffer.suggestion, 'Pular'] };
        }
        setPendingDishAdd(prev => ({ ...prev, step: 'complements', complementGroupIndex: 0 }));
        const compMsg = buildComplementMessage(dish, selections, 0);
        if (compMsg) return { text: compMsg.text, suggestions: compMsg.suggestions, complementData: compMsg };
        const item = createCartItem(dish, quantity, null, selections);
        setChatCart(prev => [...prev, item]);
        if (onAddToCart) onAddToCart({ dish, quantity, totalPrice: item.totalPrice, selections });
        setPendingDishAdd(null);
        return { text: `✅ ${quantity}x ${dish.name} adicionado!`, suggestions: ['Ver cardápio', 'Finalizar pedido'] };
      }

      if (step === 'complements') {
        if (normalized.includes('adicionar ao carrinho') && canAddDishWithComplements(dish, complementGroups, selections)) {
          const item = createCartItem(dish, quantity, null, selections);
          setChatCart(prev => [...prev, item]);
          if (onAddToCart) {
            const totalPrice = item.totalPrice;
            onAddToCart({ dish, quantity, totalPrice, selections });
          }
          setPendingDishAdd(null);
          const offer = getCrossSellOffer([...chatCart, item], dishes, store);
          if (offer) {
            return { text: `✅ ${quantity}x ${dish.name} adicionado! ${offer.title}: ${offer.message}`, suggestions: [offer.suggestion, 'Ver cardápio', 'Finalizar pedido'] };
          }
          return { text: `✅ ${quantity}x ${dish.name} adicionado! Deseja mais alguma coisa?`, suggestions: ['Ver cardápio', 'Finalizar pedido'] };
        }
        const groups = getDishComplementGroups(dish, complementGroups);
        const currentIdx = pendingDishAdd.complementGroupIndex ?? 0;
        const currentGrp = groups[currentIdx];
        const isPularComp = normalized.includes('pular');
        const isContinuar = normalized.includes('continuar');
        const linkedReq = dish?.complement_groups?.find((cg) => cg.group_id === currentGrp?.id)?.is_required;
        if (currentGrp && ((isPularComp && !linkedReq) || isContinuar)) {
          const nextIdx = currentIdx + 1;
          setPendingDishAdd((prev) => ({ ...prev, complementGroupIndex: nextIdx }));
          const compMsg = buildComplementMessage(dish, selections, nextIdx);
          return { text: compMsg.text, suggestions: compMsg.suggestions };
        }
        if (currentIdx < groups.length && currentGrp) {
          const g = currentGrp;
          const opts = (g.options || g.complements || []).filter((c) => c && c.is_active !== false);
          const opt = opts.find((o) => o.name && (normalized.includes(o.name.toLowerCase()) || normalized.includes((o.name || '').split(' ')[0]?.toLowerCase())));
          if (opt) {
            const maxSel = g.max_selection || 1;
            const newSelections = { ...selections };
            let advanceToNext = true;
            if (maxSel === 1) {
              newSelections[g.id] = opt;
            } else {
              const curr = newSelections[g.id] || [];
              const arr = Array.isArray(curr) ? [...curr] : [curr].filter(Boolean);
              const idx = arr.findIndex((x) => x?.id === opt.id);
              if (idx >= 0) arr.splice(idx, 1);
              else if (arr.length < maxSel) arr.push(opt);
              newSelections[g.id] = arr;
              advanceToNext = arr.length >= maxSel;
            }
            const nextIdx = advanceToNext ? currentIdx + 1 : currentIdx;
            setPendingDishAdd((prev) => ({ ...prev, selections: newSelections, complementGroupIndex: nextIdx }));
            const compMsg = buildComplementMessage(dish, newSelections, nextIdx);
            return { text: compMsg.text, suggestions: compMsg.suggestions };
          }
        }
      }
    }

    // Remover prato do carrinho: "Remover X" ou "Tirar X"
    const removeMatch = normalized.match(/^(?:remover|tirar|retirar)\s+(.+)$/i);
    if (removeMatch && chatCart.length > 0) {
      const searchName = removeMatch[1].trim();
      const idx = chatCart.findIndex(i => {
        const name = (i.dish?.name || '').toLowerCase();
        return name && (name === searchName || name.includes(searchName) || searchName.split(/\s+/).every(w => name.includes(w)));
      });
      if (idx >= 0) {
        const item = chatCart[idx];
        const newCart = item.quantity <= 1
          ? chatCart.filter((_, i) => i !== idx)
          : chatCart.map((x, i) => i === idx ? { ...x, quantity: (x.quantity || 1) - 1 } : x);
        setChatCart(newCart);
        const removed = item.quantity <= 1 ? 'removido' : 'uma unidade removida';
        return { text: `✅ ${item.dish?.name || 'Item'} ${removed}.`, suggestions: newCart.length ? ['Ver cardápio', 'Finalizar pedido'] : ['Ver cardápio', 'Fazer pedido'] };
      }
    }

    // 2) Adicionar prato: "Adicionar X" — se tiver complementos, inicia fluxo; senão adiciona direto
    const addMatch = normalized.match(/^(?:adicionar|quero|pedir)\s+(?:(\d+)\s*x?\s*)?(.+)$/i);
    if (addMatch) {
      const qty = addMatch[1] ? parseInt(addMatch[1]) : 1;
      const searchName = addMatch[2].trim();
      const dish = dishes.find(d => {
        if (!d.name || d.is_active === false) return false;
        const dn = d.name.toLowerCase();
        return dn === searchName || dn.includes(searchName) || searchName.split(/\s+/).every(w => dn.includes(w));
      });
      if (dish) {
        const hasComplements = getDishComplementGroups(dish, complementGroups).length > 0;
        if (hasComplements) {
          const simCart = [...chatCart, createCartItem(dish, qty)];
          const crossOffer = getCrossSellOffer(simCart, dishes, store);
          setPendingDishAdd({ dish, quantity: qty, step: crossOffer ? 'beverages' : 'complements', selections: {}, complementGroupIndex: 0 });
          if (crossOffer) {
            return {
              text: `${qty}x ${dish.name}. ${crossOffer.title} ${crossOffer.message}`,
              suggestions: [crossOffer.suggestion, 'Pular'],
            };
          }
          const compMsg = buildComplementMessage(dish, {}, 0);
          if (compMsg) {
            return { text: compMsg.text, suggestions: compMsg.suggestions, complementData: compMsg };
          }
        }
        const crossOffer = getCrossSellOffer(chatCart, dishes, store);
        let promoPrice = null;
        if (crossOffer && crossOffer.dish?.id === dish.id) promoPrice = crossOffer.price;
        const item = createCartItem(dish, qty, promoPrice);
        setChatCart(prev => [...prev, item]);
        if (onAddToCart) onAddToCart({ ...dish, quantity: qty, totalPrice: promoPrice ?? dish.price });
        const offer = getCrossSellOffer([...chatCart, item], dishes, store);
        if (offer) {
          return { text: `✅ ${qty}x ${dish.name} adicionado! ${offer.title}: ${offer.message}`, suggestions: [offer.suggestion, 'Ver cardápio', 'Finalizar pedido'] };
        }
        return { text: `✅ ${qty}x ${dish.name} adicionado! Deseja mais alguma coisa?`, suggestions: ['Ver cardápio', 'Finalizar pedido'] };
      }
    }

    // Finalizar pedido — inicia fluxo
    if ((normalized.includes('finalizar') || normalized.includes('concluir') || normalized.includes('fechar pedido')) && chatCart.length > 0) {
      setChatOrderStep(STEPS.delivery_pickup);
      return {
        text: '📦 É para entrega ou retirada no local?',
        suggestions: ['Entrega', 'Retirada']
      };
    }

    if (chatOrderStep === STEPS.delivery_pickup) {
      if (normalized.includes('entrega')) {
        setChatCustomer(prev => ({ ...prev, deliveryMethod: 'delivery' }));
        setChatOrderStep(STEPS.address);
        setAddressFieldStep(0);
        return { text: 'Para entrega, preciso de alguns dados. Qual seu nome?', suggestions: [] };
      }
      if (normalized.includes('retirada')) {
        setChatCustomer(prev => ({ ...prev, deliveryMethod: 'pickup' }));
        setChatOrderStep(STEPS.address);
        setAddressFieldStep(0);
        return { text: 'Retirada! Qual seu nome?', suggestions: [] };
      }
    }

    if (chatOrderStep === STEPS.address) {
      const step = addressFieldStep;
      if (step === 0) {
        setChatCustomer(prev => ({ ...prev, name: textToSend.trim() }));
        setAddressFieldStep(1);
        return { text: 'Qual seu telefone?', suggestions: [] };
      }
      if (step === 1) {
        const phone = textToSend.replace(/\D/g, '');
        if (phone.length < 10) return { text: 'Informe um telefone válido (10 ou 11 dígitos).', suggestions: [] };
        setChatCustomer(prev => ({ ...prev, phone: textToSend.trim() }));
        if (chatCustomer.deliveryMethod === 'delivery') {
          setAddressFieldStep(2);
          return { text: 'Qual seu CEP? (8 dígitos)', suggestions: [] };
        }
        setChatOrderStep(STEPS.payment);
        return {
          text: 'Qual a forma de pagamento?',
          suggestions: ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito']
        };
      }
      if (step === 2) {
        const cepClean = textToSend.replace(/\D/g, '');
        if (cepClean.length !== 8) return { text: 'CEP deve ter 8 dígitos. Digite novamente:', suggestions: [] };
        try {
          const endereco = await buscarCEP(cepClean);
          setChatCustomer(prev => ({ ...prev, cep: cepClean }));
          setAddressFromCep({ logradouro: endereco.logradouro, bairro: endereco.bairro, cidade: endereco.cidade, estado: endereco.estado });
          setAddressFieldStep(3);
          const rua = endereco.logradouro || '(sem logradouro)';
          const bairro = endereco.bairro || '(sem bairro)';
          return {
            text: `Seu endereço é: Rua ${rua}, Bairro ${bairro}. Confirma ou quer corrigir?`,
            suggestions: ['Confirmar', 'Corrigir']
          };
        } catch (_) {
          setAddressFieldStep(4);
          setAddressFromCep(null);
          return { text: 'CEP não encontrado. Envie o endereço completo: rua, número e bairro.', suggestions: [] };
        }
      }
      if (step === 3) {
        if (normalized.includes('confirmar')) {
          const fromCep = addressFromCep || {};
          const street = fromCep.logradouro || '';
          const neigh = fromCep.bairro || '';
          setChatCustomer(prev => ({ ...prev, address_street: street, neighborhood: neigh }));
          setAddressFieldStep(4);
          return { text: 'Qual o número da casa ou apartamento?', suggestions: [] };
        }
        if (normalized.includes('corrigir') || normalized.includes('corrige')) {
          setAddressFromCep(null);
          setAddressFieldStep(4);
          return { text: 'Envie o endereço completo: rua, número e bairro.', suggestions: [] };
        }
        const parts = textToSend.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        const numMatch = textToSend.match(/\b(\d{1,6})\b/);
        const street = parts[0] || textToSend;
        const num = numMatch ? numMatch[1] : (parts[1] && /^\d+$/.test(parts[1]) ? parts[1] : '');
        const neigh = parts[2] || parts[1] || '';
        setChatCustomer(prev => ({
          ...prev,
          address_street: street,
          address_number: num,
          neighborhood: neigh,
          address: textToSend,
        }));
        setAddressFromCep(null);
        setAddressFieldStep(5);
        const fee = orderService.calculateDeliveryFee('delivery', neigh, deliveryZones, store);
        const zone = deliveryZones?.find(z => z.is_active !== false && (z.neighborhood || '').toLowerCase().trim() === (neigh || '').toLowerCase().trim());
        if (zone) {
          setChatCustomer(prev => ({ ...prev, delivery_fee_confirmed: true }));
          setChatOrderStep(STEPS.payment);
          return {
            text: `Taxa de entrega para ${neigh}: ${formatCurrency(fee)}. Qual a forma de pagamento?`,
            suggestions: ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito']
          };
        }
        setChatCustomer(prev => ({ ...prev, delivery_fee_confirmed: false }));
        setChatOrderStep(STEPS.payment);
        return {
          text: `O bairro ${neigh} não consta no nosso cadastro. A taxa de entrega será confirmada após o pedido. Qual a forma de pagamento?`,
          suggestions: ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito']
        };
      }
      if (step === 4) {
        let neigh = '';
        if (addressFromCep) {
          const num = textToSend.replace(/\D/g, '') || textToSend.trim();
          neigh = chatCustomer.neighborhood;
          setChatCustomer(prev => ({
            ...prev,
            address_number: num,
            address: `${prev.address_street}, ${num} - ${prev.neighborhood}`,
          }));
        } else {
          const parts = textToSend.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          const numMatch = textToSend.match(/\b(\d{1,6})\b/);
          neigh = parts[2] || parts[1] || '';
          setChatCustomer(prev => ({
            ...prev,
            address_street: parts[0] || prev.address_street,
            address_number: numMatch ? numMatch[1] : (parts[1] && /^\d+$/.test(parts[1]) ? parts[1] : ''),
            neighborhood: neigh,
            address: textToSend,
          }));
        }
        setAddressFieldStep(5);
        const fee = orderService.calculateDeliveryFee('delivery', neigh, deliveryZones, store);
        const zone = deliveryZones?.find(z => z.is_active !== false && (z.neighborhood || '').toLowerCase().trim() === (neigh || '').toLowerCase().trim());
        if (zone) {
          setChatCustomer(prev => ({ ...prev, delivery_fee_confirmed: true }));
          setChatOrderStep(STEPS.payment);
          return {
            text: `Taxa de entrega para ${neigh || 'seu bairro'}: ${formatCurrency(fee)}. Qual a forma de pagamento?`,
            suggestions: ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito']
          };
        }
        setChatCustomer(prev => ({ ...prev, delivery_fee_confirmed: false }));
        setChatOrderStep(STEPS.payment);
        return {
          text: 'O bairro não consta no nosso cadastro. A taxa será confirmada após o pedido. Qual a forma de pagamento?',
          suggestions: ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito']
        };
      }
    }

    if (chatOrderStep === STEPS.payment) {
      const pmMap = { 'pix': 'pix', 'dinheiro': 'dinheiro', 'cartão de crédito': 'cartao_credito', 'cartao de credito': 'cartao_credito', 'cartão de débito': 'cartao_debito', 'cartao de debito': 'cartao_debito', 'credito': 'cartao_credito', 'débito': 'cartao_debito', 'debito': 'cartao_debito' };
      const pm = pmMap[normalized] || (normalized.includes('crédito') || normalized.includes('credito') ? 'cartao_credito' : normalized.includes('débito') || normalized.includes('debito') ? 'cartao_debito' : normalized || 'pix');
      setChatCustomer(prev => ({ ...prev, payment_method: pm || 'pix' }));
      if (normalized.includes('dinheiro')) {
        setChatOrderStep(STEPS.change);
        const total = chatCart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0);
        const fee = chatCustomer.deliveryMethod === 'delivery' ? orderService.calculateDeliveryFee('delivery', chatCustomer.neighborhood, deliveryZones, store) : 0;
        const orderTotal = total + fee;
        return {
          text: `Total: ${formatCurrency(orderTotal)}. Precisa de troco? Se sim, para quanto?`,
          suggestions: ['Não preciso de troco']
        };
      }
      setChatOrderStep(STEPS.confirm);
      return buildConfirmMessage();
    }

    if (chatOrderStep === STEPS.change) {
      const total = chatCart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0);
      const fee = chatCustomer.deliveryMethod === 'delivery' ? orderService.calculateDeliveryFee('delivery', chatCustomer.neighborhood, deliveryZones, store) : 0;
      const orderTotal = total + fee;
      const parsed = parseChangeResponse(textToSend, orderTotal);
      if (!parsed.valid) return { text: parsed.error, suggestions: ['Não preciso de troco'] };
      setChatCustomer(prev => ({ ...prev, needs_change: parsed.needs_change, change_amount: parsed.change_amount }));
      setChatOrderStep(STEPS.confirm);
      return buildConfirmMessage();
    }

    if (chatOrderStep === STEPS.confirm) {
      if (normalized.includes('sim') || normalized.includes('confirmar') || normalized.includes('confirmo')) {
        return await submitChatOrder();
      }
      if (normalized.includes('não') || normalized.includes('nao')) {
        setChatOrderStep(STEPS.idle);
        setChatCart([]);
        setChatCustomer(INITIAL_CUSTOMER);
        setAddressFromCep(null);
        setAddressFieldStep(0);
        return { text: 'Pedido cancelado. Posso ajudar em mais alguma coisa?', suggestions: ['Ver cardápio', 'Fazer pedido'] };
      }
      if (normalized.includes('editar') || normalized.includes('adicionar mais') || normalized.includes('adicionar itens')) {
        setChatOrderStep(STEPS.menu);
        return { text: 'Pode adicionar mais (ex: "Adicionar 2x Pizza") ou remover (ex: "Remover Pizza"). Clique em "Ver cardápio" ou "Finalizar pedido" quando terminar.', suggestions: ['Ver cardápio', 'Finalizar pedido'] };
      }
    }

    // Se há prato pendente e não entendemos, reexibir opções
    if (pendingDishAdd) {
      const idx = pendingDishAdd.complementGroupIndex ?? 0;
      const compMsg = buildComplementMessage(pendingDishAdd.dish, pendingDishAdd.selections || {}, idx);
      if (compMsg) return { text: compMsg.text, suggestions: compMsg.suggestions };
    }

    return null;
  };

  const buildConfirmMessage = () => {
    const subtotal = chatCart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0);
    const fee = chatCustomer.deliveryMethod === 'delivery' ? orderService.calculateDeliveryFee('delivery', chatCustomer.neighborhood, deliveryZones, store) : 0;
    const orderTotal = subtotal + fee;
    const fullAddress = chatCustomer.deliveryMethod === 'delivery' && chatCustomer.address_street
      ? orderService.formatFullAddress(chatCustomer)
      : (chatCustomer.address || 'Retirada');
    let res = '📋 Resumo do pedido\n\n';
    res += formatCartSummary(chatCart, complementGroups) + '\n\n';
    res += `Subtotal: ${formatCurrency(subtotal)}\n`;
    if (chatCustomer.deliveryMethod === 'delivery') {
      res += fee > 0 ? `Taxa de entrega: ${formatCurrency(fee)}\n` : 'Taxa de entrega: a confirmar\n';
    }
    res += `Total: ${formatCurrency(orderTotal)}\n\n`;
    res += `Entregar em: ${fullAddress}\n`;
    res += `Pagamento: ${chatCustomer.payment_method || 'PIX'}\n`;
    if (chatCustomer.needs_change && chatCustomer.change_amount) res += `Troco para: ${formatCurrency(chatCustomer.change_amount)}\n`;
    res += '\nConfirma o pedido?';
    return { text: res, suggestions: ['Sim, confirmar', 'Editar pedido', 'Adicionar mais itens', 'Não, cancelar'] };
  };

  const submitChatOrder = async () => {
    // Usar email do usuário logado para o pedido aparecer em Meus Pedidos
    const customerToUse = { ...chatCustomer };
    if (authUser?.email) customerToUse.email = authUser.email;
    const payload = buildOrderPayload(chatCart, customerToUse, store, deliveryZones, slug);
    try {
      const res = await fetch(getPedidoCardapioUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = res.ok ? await res.json() : null;
      const order = data?.data || data;
      const orderCode = order?.order_code || order?.id;
      setLastCompletedOrder({ order, cart: [...chatCart] });
      setChatOrderStep(STEPS.done);
      setChatCart([]);
      setChatCustomer(INITIAL_CUSTOMER);
      if (onOrderCreated) onOrderCreated(order);
      return {
        text: `✅ Pedido confirmado!\n\nNúmero: ${orderCode}\n\nVocê pode acompanhar o status em "Meus Pedidos" ou pelo link do cardápio.`,
        suggestions: ['Enviar confirmação no WhatsApp', 'Ver cardápio', 'Fazer outro pedido']
      };
    } catch (err) {
      const msg = err?.message || 'Erro ao enviar pedido. Tente novamente.';
      return { text: `❌ ${msg}`, suggestions: ['Tentar novamente', 'Ver cardápio'] };
    }
  };

  /** Envia mensagem. Se textOverride for passado (ex.: clique em sugestão), usa esse texto. Evita evento/objeto. */
  const handleSendMessage = async (textOverride = null) => {
    // Garantir que textOverride não seja evento ou objeto (evita "[object Object]")
    const safeOverride = (textOverride != null && typeof textOverride === 'string') ? textOverride : null;
    const raw = safeOverride ?? (typeof inputText === 'string' ? inputText : '');
    const textToSend = ensureString(raw);
    if (!textToSend) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!safeOverride) setInputText('');
    setIsTyping(true);

    // 1) Tentar fluxo de pedido pelo chat
    const chatResult = await processChatOrderFlow(textToSend);
    if (chatResult) {
      await delay(BOT_RESPONSE_DELAY_MS);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: chatResult.text,
        suggestions: chatResult.suggestions || [],
        menuItems: chatResult.menuItems || [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
      return;
    }

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
    const storeInfo = buildStoreInfo(store);

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
          ...storeInfo,
        }),
      });

      const data = res.ok ? await res.json() : null;
      if (data && data.text) {
        await delay(BOT_RESPONSE_DELAY_MS);
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
    await delay(BOT_RESPONSE_DELAY_MS);
    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      text: response.text,
      suggestions: response.suggestions || [],
      menuItems: response.menuItems || [],
      dishes: response.dishes || [],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleSuggestion = (suggestion) => {
    if (suggestion === 'Abrir WhatsApp' && store?.whatsapp) {
      whatsappService.sendToWhatsApp(store.whatsapp, 'Olá! Vim pelo cardápio e gostaria de fazer um pedido.');
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        text: 'Abrindo o WhatsApp. Qualquer dúvida, estou por aqui! 💬',
        timestamp: new Date(),
      }]);
      return;
    }
    if (suggestion === 'Enviar confirmação no WhatsApp' && lastCompletedOrder?.order && lastCompletedOrder?.cart && store?.whatsapp) {
      const msg = whatsappService.formatOrderMessage(
        lastCompletedOrder.order,
        lastCompletedOrder.cart,
        complementGroups,
        formatCurrency,
        store?.name || storeName
      );
      whatsappService.sendToWhatsApp(store.whatsapp, msg);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        text: 'Abrindo o WhatsApp com a confirmação do pedido. Basta enviar a mensagem! 📱',
        timestamp: new Date(),
      }]);
      return;
    }
    handleSendMessage(suggestion);
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
          className="fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-2xl transition-shadow"
          style={{ backgroundColor: primaryColor }}
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
            className="fixed inset-0 z-50 w-full h-full min-h-[100dvh] md:inset-auto md:min-h-0 md:bottom-6 md:right-6 md:w-96 md:h-[600px] md:max-h-[calc(100vh-8rem)]"
          >
            <Card className="h-full min-h-[100dvh] md:min-h-0 flex flex-col shadow-2xl rounded-none md:rounded-lg overflow-hidden">
              {/* Header */}
              <div className="text-white p-4 rounded-t-none md:rounded-t-lg flex items-center justify-between flex-shrink-0" style={{ backgroundColor: primaryColor }}>
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
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                      style={message.type === 'user' ? { backgroundColor: primaryColor } : {}}
                    >
                      <p className="text-sm whitespace-pre-line">
                        <BoldText text={message.text} />
                      </p>

                      {/* Cardápio com botões inline */}
                      {message.menuItems && message.menuItems.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {(() => {
                            let lastCat = '';
                            return message.menuItems.map((mi) => {
                              const showCat = mi.categoryName !== lastCat;
                              if (showCat) lastCat = mi.categoryName;
                              return (
                                <div key={mi.dish?.id || mi.dish?.name}>
                                  {showCat && (
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1.5 pt-2 first:pt-0 border-t border-gray-200 dark:border-gray-600 first:border-t-0 first:pt-0">
                                      {mi.categoryName}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 transition-colors">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium block truncate">{mi.dish?.name}</span>
                                      <span className="text-xs font-semibold opacity-90">{formatCurrency(mi.dish?.price ?? 0)}</span>
                                    </div>
                                    <button
                                      onClick={() => handleSuggestion(`Adicionar ${mi.dish?.name}`)}
                                      className="text-xs font-medium px-3 py-1.5 rounded-md flex-shrink-0 transition-colors text-white"
                                      style={{ backgroundColor: primaryColor }}
                                    >
                                      Adicionar
                                    </button>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {/* Sugestões */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSuggestion(suggestion)}
                              className="text-xs px-2 py-1 rounded transition-colors border"
                              style={{ backgroundColor: `${primaryColor}25`, borderColor: `${primaryColor}50`, color: primaryColor }}
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
                    <div className="rounded-lg p-3" style={{ backgroundColor: `${primaryColor}20` }}>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: primaryColor }} />
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendMessage(); }}
                    disabled={!inputText.trim() || isTyping}
                    className="text-white"
                    style={{ backgroundColor: primaryColor }}
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
