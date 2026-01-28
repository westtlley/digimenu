export const whatsappService = {
  formatOrderMessage(order, cart, complementGroups, formatCurrency) {
    const paymentMethods = {
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito'
    };

    let comandaText = `🍽️ *NOVO PEDIDO - CARDÁPIO*\n`;
    comandaText += `============================\n`;
    comandaText += `📋 Pedido #${order.order_code}\n`;
    comandaText += `⏰ ${new Date().toLocaleString('pt-BR')}\n`;
    comandaText += `============================\n\n`;
    
    comandaText += `👤 *Cliente:* ${order.customer_name}\n`;
    comandaText += `📱 *Contato:* ${order.customer_phone}\n`;
    comandaText += `🚀 *Tipo:* ${order.delivery_method === 'delivery' ? 'Entrega 🚴' : 'Retirada 🏪'}\n`;
    
    if (order.delivery_method === 'delivery') {
      comandaText += `📍 *Endereço:* ${order.address}\n`;
    }
    
    comandaText += `💳 *Pagamento:* ${paymentMethods[order.payment_method] || order.payment_method}\n`;
    
    if (order.payment_method === 'dinheiro' && order.needs_change && order.change_amount) {
      const changeValue = parseFloat(order.change_amount) - order.total;
      comandaText += `💵 *Troco para:* ${formatCurrency(parseFloat(order.change_amount))} _(Troco: ${formatCurrency(changeValue)})_\n`;
    }
    
    if (order.scheduled_date && order.scheduled_time) {
      const schedDate = new Date(order.scheduled_date).toLocaleDateString('pt-BR');
      comandaText += `\n⏰ *AGENDADO PARA:* ${schedDate} às ${order.scheduled_time}\n`;
    }
    
    comandaText += `\n--- *ITENS DO PEDIDO* ---\n\n`;

    cart.forEach((item, index) => {
      const isPizza = item.dish?.product_type === 'pizza';
      
      comandaText += `${index + 1}. *${item.dish.name}* x${item.quantity || 1}\n`;

      // Pizza detalhada
      if (isPizza && item.size) {
        comandaText += `   🍕 *${item.size.name}* (${item.size.slices} fatias • ${item.flavors?.length || 0} sabores)\n`;
        
        if (item.flavors && item.flavors.length > 0) {
          comandaText += `   _Sabores:_\n`;
          const flavorCounts = item.flavors.reduce((acc, f) => {
            acc[f.name] = (acc[f.name] || 0) + 1;
            return acc;
          }, {});
          Object.entries(flavorCounts).forEach(([name, count]) => {
            comandaText += `     • ${count}/${item.size.slices} ${name}\n`;
          });
        }
        
        if (item.edge) {
          comandaText += `   🧀 _Borda:_ ${item.edge.name}\n`;
        }
        
        if (item.extras && item.extras.length > 0) {
          comandaText += `   _Extras:_\n`;
          item.extras.forEach(extra => {
            comandaText += `     • ${extra.name}\n`;
          });
        }
        
        if (item.specifications) {
          comandaText += `   📝 _Obs:_ ${item.specifications}\n`;
        }
      } 
      // Prato normal
      else if (item.selections && Object.keys(item.selections).length > 0) {
        const dishGroups = complementGroups.filter(group => 
          item.dish.complement_groups?.some(cg => cg.group_id === group.id)
        );

        Object.entries(item.selections).forEach(([groupId, sel]) => {
          const group = dishGroups.find(g => g.id === groupId);
          if (group) {
            if (Array.isArray(sel)) {
              comandaText += `   _${group.name}: ${sel.map(opt => opt.name).join(', ')}_\n`;
            } else if (sel) {
              comandaText += `   _${group.name}: ${sel.name}_\n`;
            }
          }
        });
      }
      
      if (item.observations) {
        comandaText += `   📝 _Obs:_ ${item.observations}\n`;
      }

      comandaText += `   💰 ${formatCurrency(item.totalPrice * (item.quantity || 1))}\n\n`;
    });
    
    comandaText += `============================\n`;
    comandaText += `📦 *Subtotal:* ${formatCurrency(order.subtotal)}\n`;
    
    if (order.delivery_fee > 0) {
      comandaText += `🚚 *Taxa entrega:* ${formatCurrency(order.delivery_fee)}\n`;
    }
    
    if (order.discount > 0) {
      comandaText += `🎟️ *Desconto:* -${formatCurrency(order.discount)}\n`;
    }
    
    comandaText += `\n💵 *TOTAL:* ${formatCurrency(order.total)}\n`;
    comandaText += `============================`;

    return comandaText;
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