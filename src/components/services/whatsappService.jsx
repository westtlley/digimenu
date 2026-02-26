export const whatsappService = {
  formatOrderMessage(order, cart, complementGroups, formatCurrency, storeName = '') {
    const paymentMethods = {
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Crédito',
      'cartao_debito': 'Débito'
    };

    // Topo: "Novo pedido! (nome do restaurante)" — alinhado e profissional
    const restaurantName = (storeName || '').trim() || 'Restaurante';
    let msg = `*Novo pedido! (${restaurantName})*\n`;
    msg += `══════════════════════════\n\n`;
    
    // Informações do pedido
    msg += `📋 *Pedido:* #${order.order_code}\n`;
    msg += `📅 *Data:* ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}\n`;
    msg += `\n`;
    
    // Cliente
    msg += `👤 *Cliente:* ${order.customer_name}\n`;
    msg += `📱 *Telefone:* ${order.customer_phone}\n`;
    
    // Entrega/Retirada
    msg += `\n`;
    if (order.delivery_method === 'delivery') {
      msg += `🚴 *ENTREGA*\n`;
      if (order.address) {
        msg += `📍 ${order.address}\n`;
      }
    } else {
      msg += `🏪 *RETIRADA NO LOCAL*\n`;
    }
    
    // Agendamento (se houver)
    if (order.scheduled_date && order.scheduled_time) {
      const schedDate = new Date(order.scheduled_date).toLocaleDateString('pt-BR');
      msg += `⏰ *Agendado:* ${schedDate} às ${order.scheduled_time}\n`;
    }
    
    // Pagamento
    msg += `\n💰 *Pagamento:* ${paymentMethods[order.payment_method] || order.payment_method}\n`;
    if (order.payment_method === 'dinheiro' && order.needs_change && order.change_amount) {
      const changeValue = parseFloat(order.change_amount) - order.total;
      msg += `💵 *Troco para:* ${formatCurrency(order.change_amount)} (troco: ${formatCurrency(changeValue)})\n`;
    }
    
    // Itens do pedido
    msg += `\n══════════════════════════\n`;
    msg += `*📦 ITENS DO PEDIDO*\n`;
    msg += `══════════════════════════\n\n`;

    cart.forEach((item, index) => {
      const isPizza = item.dish?.product_type === 'pizza';
      const isCombo = item.dish?.product_type === 'combo' || Array.isArray(item?.selections?.combo_groups);
      const itemTotal = item.totalPrice * (item.quantity || 1);
      
      // Linha principal do item
      msg += `*${index + 1}. ${item.dish.name}*\n`;
      msg += `   Qtd: ${item.quantity || 1}x | Valor: ${formatCurrency(itemTotal)}\n`;

      // Combo (detalhado)
      if (isCombo) {
        const groups = item?.selections?.combo_groups;
        if (Array.isArray(groups)) {
          groups.forEach((g) => {
            if (!g) return;
            const title = g.title || 'Itens do combo';
            const isDrinkGroup = /bebid/i.test(title);
            const groupEmoji = isDrinkGroup ? '🥤' : '🍽️';
            const groupLabel = isDrinkGroup ? 'BEBIDAS' : 'PRATOS';
            msg += `   ${groupEmoji} ${groupLabel}: ${title}\n`;
            const items = Array.isArray(g.items) ? g.items : [];
            items.forEach((it) => {
              if (!it) return;
              const name = it?.dish_name || it?.dishName || it?.dish_id || 'Item';
              const instances = Array.isArray(it?.instances) && it.instances.length > 0
                ? it.instances
                : Array.from({ length: Math.max(1, it?.quantity || 1) }, () => null);
              instances.forEach((inst, instIdx) => {
                const showIndex = instances.length > 1;
                const itemLabel = isDrinkGroup ? 'Bebida' : 'Prato';
                msg += `      - ${showIndex ? `${itemLabel} ${instIdx + 1}: ` : ''}${name}\n`;
                const sel = inst?.selections;
                if (sel && typeof sel === 'object') {
                  Object.values(sel).forEach((groupSel) => {
                    if (Array.isArray(groupSel)) {
                      groupSel.forEach((opt) => {
                        if (opt?.name) msg += `         ↳ ${opt.name}\n`;
                      });
                    } else if (groupSel?.name) {
                      msg += `         ↳ ${groupSel.name}\n`;
                    }
                  });
                }
              });
            });
          });
        }
      }
      // Pizza detalhada
      else if (isPizza && item.size) {
        msg += `   🍕 Tamanho: ${item.size.name}\n`;
        
        if (item.flavors && item.flavors.length > 0) {
          const flavorNames = item.flavors.map(f => f.name).join(' + ');
          msg += `   Sabores: ${flavorNames}\n`;
        }
        
        if (item.edge) {
          msg += `   🧀 Borda: ${item.edge.name}\n`;
        }
        
        if (item.extras && item.extras.length > 0) {
          const extrasNames = item.extras.map(e => e.name).join(', ');
          msg += `   Adicionais: ${extrasNames}\n`;
        }
      } 
      // Prato normal com complementos
      else if (item.selections && Object.keys(item.selections).length > 0) {
        const dishGroups = complementGroups.filter(group => 
          item.dish.complement_groups?.some(cg => cg.group_id === group.id)
        );

        Object.entries(item.selections).forEach(([groupId, sel]) => {
          const group = dishGroups.find(g => g.id === groupId);
          if (group) {
            if (Array.isArray(sel)) {
              const opts = sel.map(opt => opt.name).join(', ');
              if (opts) msg += `   ${group.name}: ${opts}\n`;
            } else if (sel && sel.name) {
              msg += `   ${group.name}: ${sel.name}\n`;
            }
          }
        });
      }

      // Observações
      if (item.specifications || item.observations) {
        msg += `   📝 Obs: ${item.specifications || item.observations}\n`;
      }
      
      msg += `\n`;
    });
    
    // Totais
    msg += `══════════════════════════\n`;
    msg += `*💵 RESUMO DO PEDIDO*\n`;
    msg += `══════════════════════════\n\n`;
    
    msg += `Subtotal........: ${formatCurrency(order.subtotal)}\n`;
    
    if (order.discount > 0) {
      msg += `Desconto........: -${formatCurrency(order.discount)}\n`;
    }
    
    if (order.delivery_fee > 0) {
      msg += `Taxa de entrega.: ${formatCurrency(order.delivery_fee)}\n`;
    }
    
    msg += `\n*TOTAL..........: ${formatCurrency(order.total)}*\n`;
    msg += `══════════════════════════`;

    return msg;
  },

  async sendToWhatsApp(phone, message) {
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    if (cleanPhone) {
      const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  },

  /**
   * Se a loja (store) tem Comanda WhatsApp ativada: ao finalizar pedido,
   * além de registrar no gestor, também envia a comanda formatada para o WhatsApp.
   * @param {object} store - dados da loja (deve conter send_whatsapp_commands)
   * @returns {boolean} true = envia comanda no WhatsApp; false = não envia (só gestor)
   */
  shouldSendWhatsApp(store) {
    if (!store) return true;
    return store.send_whatsapp_commands !== false;
  },
};