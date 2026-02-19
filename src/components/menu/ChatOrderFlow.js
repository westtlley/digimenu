/**
 * ChatOrderFlow - Lógica do fluxo de pedido pelo chat
 * Estados: idle | menu | selecting | delivery_pickup | address | payment | change | confirm
 */
import { formatCurrency } from '@/utils/formatters';
import { orderService } from '@/components/services/orderService';

export const STEPS = {
  idle: 'idle',
  menu: 'menu',
  selecting: 'selecting',
  delivery_pickup: 'delivery_pickup',
  address: 'address',
  payment: 'payment',
  change: 'change',
  confirm: 'confirm',
  done: 'done',
};

/** Opções do grupo (API pode usar options ou complements) */
function getGroupOptions(group) {
  const opts = group.options || group.complements || [];
  return opts.filter(c => c && c.is_active !== false);
}

/** Retorna grupos de complementos vinculados ao prato */
export function getDishComplementGroups(dish, complementGroups = []) {
  if (!dish?.complement_groups?.length || !complementGroups?.length) return [];
  const groupIds = dish.complement_groups.map(cg => cg.group_id);
  return (complementGroups || [])
    .filter(g => groupIds.includes(g.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Formata o cardápio para exibição no chat: itens com botão inline (sem repetir abaixo) */
export function buildMenuForChat(dishes = [], categories = [], complementGroups = []) {
  const menuItems = [];
  const sortedCats = [...(categories || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  sortedCats.forEach(cat => {
    const items = (dishes || []).filter(d => d.category_id === cat.id && d.is_active !== false && d.name);
    if (items.length === 0) return;
    items.forEach(d => {
      const groups = getDishComplementGroups(d, complementGroups);
      const opts = groups.flatMap(g => getGroupOptions(g).map(c => `${c.name}${c.price ? ` (+${formatCurrency(c.price)})` : ''}`));
      menuItems.push({
        dish: d,
        categoryName: cat.name,
        complementHint: opts.length ? opts.join(', ') : null,
      });
    });
  });
  const semCat = (dishes || []).filter(d => !d.category_id && d.is_active !== false && d.name);
  semCat.forEach(d => {
    menuItems.push({ dish: d, categoryName: 'Outros', complementHint: null });
  });
  return {
    text: menuItems.length ? 'Cardápio do dia!' : 'Cardápio indisponível.',
    menuItems,
    suggestions: ['Finalizar pedido', 'Ver horários'],
  };
}

/** Verifica oferta de cross-sell (bebida, sobremesa, combo) */
export function getCrossSellOffer(cart = [], dishes = [], store = null) {
  if (!store?.cross_sell_config?.enabled || !Array.isArray(cart) || cart.length === 0) return null;
  const config = store.cross_sell_config;
  const cartTotal = cart.reduce((sum, i) => sum + (i.totalPrice || 0) * (i.quantity || 1), 0);

  if (config.beverage_offer?.enabled && config.beverage_offer.dish_id) {
    const hasBeverage = cart.some(i => i.dish?.product_type === 'beverage' || i.dish?.id === config.beverage_offer.dish_id);
    const hasPizza = cart.some(i => (config.beverage_offer.trigger_product_types || ['pizza']).includes(i.dish?.product_type));
    if (hasPizza && !hasBeverage) {
      const dish = dishes.find(d => d.id === config.beverage_offer.dish_id);
      if (dish && dish.is_active !== false) {
        const disc = config.beverage_offer.discount_percent || 0;
        const price = dish.price * (1 - disc / 100);
        const msg = (config.beverage_offer.message || 'Adicione {product_name} por {product_price}')
          .replace('{product_name}', dish.name).replace('{product_price}', formatCurrency(price));
        return { type: 'beverage', dish, price, title: config.beverage_offer.title || '🥤 Bebida?', message: msg, suggestion: `Adicionar ${dish.name}` };
      }
    }
  }

  if (config.dessert_offer?.enabled && config.dessert_offer.dish_id) {
    const minVal = config.dessert_offer.min_cart_value || 40;
    const hasDessert = cart.some(i => i.dish?.id === config.dessert_offer.dish_id);
    if (cartTotal >= minVal && !hasDessert) {
      const dish = dishes.find(d => d.id === config.dessert_offer.dish_id);
      if (dish && dish.is_active !== false) {
        const disc = config.dessert_offer.discount_percent || 0;
        const price = dish.price * (1 - disc / 100);
        const msg = (config.dessert_offer.message || 'Complete com {product_name} por {product_price}')
          .replace('{product_name}', dish.name).replace('{product_price}', formatCurrency(price));
        return { type: 'dessert', dish, price, title: config.dessert_offer.title || '🍰 Sobremesa?', message: msg, suggestion: `Adicionar ${dish.name}` };
      }
    }
  }

  if (config.combo_offer?.enabled && config.combo_offer.dish_id) {
    const minPizzas = config.combo_offer.min_pizzas || 2;
    const pizzaCount = cart.filter(i => i.dish?.product_type === 'pizza').length;
    const hasCombo = cart.some(i => i.dish?.id === config.combo_offer.dish_id);
    if (pizzaCount >= minPizzas && !hasCombo) {
      const dish = dishes.find(d => d.id === config.combo_offer.dish_id);
      if (dish && dish.is_active !== false) {
        const disc = config.combo_offer.discount_percent ?? 100;
        const price = dish.price * (1 - disc / 100);
        const msg = (config.combo_offer.message || 'Ganhe {product_name} grátis!')
          .replace('{product_name}', dish.name).replace('{min_pizzas}', minPizzas);
        return { type: 'combo', dish, price, title: config.combo_offer.title || '🔥 Combo!', message: msg, suggestion: `Adicionar ${dish.name}` };
      }
    }
  }
  return null;
}

/** Verifica se complementos obrigatórios foram selecionados */
export function canAddDishWithComplements(dish, complementGroups, selections) {
  const groups = getDishComplementGroups(dish, complementGroups);
  return groups.every(g => {
    const linked = dish?.complement_groups?.find(cg => cg.group_id === g.id);
    if (!linked?.is_required) return true;
    const sel = selections?.[g.id];
    if (g.max_selection > 1) return Array.isArray(sel) && sel.length > 0;
    return !!sel;
  });
}

/** Cria item do carrinho a partir de prato (com ou sem complementos) */
export function createCartItem(dish, quantity = 1, promoPrice = null, selections = {}) {
  let totalPrice = promoPrice != null ? promoPrice : (dish.price ?? 0);
  Object.values(selections || {}).forEach(sel => {
    if (Array.isArray(sel)) sel.forEach(o => { totalPrice += o?.price || 0; });
    else if (sel?.price) totalPrice += sel.price;
  });
  return {
    id: `chat_${dish.id}_${Date.now()}`,
    dish,
    quantity,
    totalPrice,
    selections: selections || {},
  };
}

/** Resumo do carrinho para exibição */
export function formatCartSummary(cart) {
  if (!cart || cart.length === 0) return '';
  return cart.map(i => {
    const qty = i.quantity || 1;
    const name = i.dish?.name || 'Item';
    const total = (i.totalPrice || 0) * qty;
    return `${qty}x ${name} - ${formatCurrency(total)}`;
  }).join('\n');
}

/** Valida troco: retorna { valid, needs_change, change_amount, error? } */
export function parseChangeResponse(userText, orderTotal) {
  const t = String(userText || '').toLowerCase().trim();
  if (/n[ãa]o\s*(preciso|precisar)|n[ãa]o\s*precisa|dispens|sem\s*troco|n[ãa]o\s*quero\s*troco/i.test(t)) {
    return { valid: true, needs_change: false, change_amount: null };
  }
  const match = t.match(/(\d+)[.,]?(\d*)/);
  if (match) {
    const val = parseFloat(`${match[1]}.${match[2] || '0'}`);
    if (val < orderTotal) {
      return { valid: false, error: `O total é ${formatCurrency(orderTotal)}. Você precisa pagar pelo menos esse valor. Para quanto precisa de troco?` };
    }
    return { valid: true, needs_change: true, change_amount: val };
  }
  return { valid: false, error: 'Não entendi. Precisa de troco? Se sim, para quanto? (ex: 50 ou 100)' };
}

/** Monta payload do pedido para a API */
export function buildOrderPayload(cart, customer, store, deliveryZones, slug) {
  const cartTotal = cart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0);
  const deliveryFee = customer.deliveryMethod === 'delivery'
    ? orderService.calculateDeliveryFee(customer.deliveryMethod, customer.neighborhood, deliveryZones || [], store)
    : 0;
  const { total } = orderService.calculateTotals(cartTotal, 0, deliveryFee);
  const fullAddress = customer.deliveryMethod === 'delivery' && customer.address_street
    ? orderService.formatFullAddress(customer)
    : (customer.address || '');

  return {
    slug,
    order_code: orderService.generateOrderCode(),
    customer_name: customer.name,
    customer_phone: String(customer.phone || '').replace(/\D/g, ''),
    customer_email: customer.email || null,
    delivery_method: customer.deliveryMethod || 'pickup',
    address: fullAddress,
    address_street: customer.address_street || null,
    address_number: customer.address_number || null,
    address_complement: customer.address_complement || null,
    neighborhood: customer.neighborhood || null,
    payment_method: customer.payment_method || 'pix',
    needs_change: !!customer.needs_change,
    change_amount: customer.needs_change ? parseFloat(customer.change_amount) : null,
    items: cart,
    subtotal: cartTotal,
    delivery_fee: deliveryFee,
    discount: 0,
    total,
    status: 'new',
  };
}
