export const whatsappService = {
  formatOrderMessage(order, cart, complementGroups, formatCurrency) {
    const paymentMethods = {
      'pix': '💳 PIX',
      'dinheiro': '💵 Dinheiro',
      'cartao_credito': '💳 Crédito',
      'cartao_debito': '💳 Débito'
    };

    // Header compacto e elegante
    let comandaText = `🔔 *NOVO PEDIDO #${order.order_code}*\n`;
    comandaText += `━━━━━━━━━━━━━━━━━━━━\n`;
    comandaText += `📅 ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}\n\n`;
    
    // Informações do cliente (condensadas)
    comandaText += `👤 ${order.customer_name} • 📱 ${order.customer_phone}\n`;
    comandaText += `${order.delivery_method === 'delivery' ? '🚴 Entrega' : '🏪 Retirada'}`;
    
    if (order.delivery_method === 'delivery' && order.address) {
      comandaText += ` • 📍 ${order.address}`;
    }
    
    comandaText += `\n${paymentMethods[order.payment_method] || order.payment_method}`;
    
    if (order.payment_method === 'dinheiro' && order.needs_change && order.change_amount) {
      const changeValue = parseFloat(order.change_amount) - order.total;
      comandaText += ` (Troco: ${formatCurrency(changeValue)})`;
    }
    
    if (order.scheduled_date && order.scheduled_time) {
      const schedDate = new Date(order.scheduled_date).toLocaleDateString('pt-BR');
      comandaText += `\n⏰ *Agendado:* ${schedDate} às ${order.scheduled_time}`;
    }
    
    comandaText += `\n\n━━━━━━━━━━━━━━━━━━━━\n*ITENS*\n`;

    cart.forEach((item, index) => {
      const isPizza = item.dish?.product_type === 'pizza';
      const itemPrice = formatCurrency(item.totalPrice * (item.quantity || 1));
      
      // Nome do item + quantidade + preço (tudo em uma linha)
      comandaText += `\n${index + 1}. *${item.dish.name}* (x${item.quantity || 1}) • ${itemPrice}\n`;

      const details = [];

      // Pizza detalhada (condensada)
      if (isPizza && item.size) {
        details.push(`🍕 ${item.size.name}`);
        
        if (item.flavors && item.flavors.length > 0) {
          const flavorNames = item.flavors.map(f => f.name).join(' + ');
          details.push(flavorNames);
        }
        
        if (item.edge) {
          details.push(`🧀 ${item.edge.name}`);
        }
        
        if (item.extras && item.extras.length > 0) {
          const extrasNames = item.extras.map(e => e.name).join(', ');
          details.push(`+${extrasNames}`);
        }
      } 
      // Prato normal (condensado)
      else if (item.selections && Object.keys(item.selections).length > 0) {
        const dishGroups = complementGroups.filter(group => 
          item.dish.complement_groups?.some(cg => cg.group_id === group.id)
        );

        Object.entries(item.selections).forEach(([groupId, sel]) => {
          const group = dishGroups.find(g => g.id === groupId);
          if (group) {
            if (Array.isArray(sel)) {
              const opts = sel.map(opt => opt.name).join(', ');
              if (opts) details.push(opts);
            } else if (sel && sel.name) {
              details.push(sel.name);
            }
          }
        });
      }

      // Observações
      if (item.specifications || item.observations) {
        details.push(`📝 ${item.specifications || item.observations}`);
      }

      // Imprimir detalhes em uma linha limpa
      if (details.length > 0) {
        comandaText += `   _${details.join(' • ')}_\n`;
      }
    });
    
    // Totais (compactos)
    comandaText += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    
    const totalsLine = [`Subtotal: ${formatCurrency(order.subtotal)}`];
    if (order.delivery_fee > 0) totalsLine.push(`Taxa: ${formatCurrency(order.delivery_fee)}`);
    if (order.discount > 0) totalsLine.push(`Desconto: -${formatCurrency(order.discount)}`);
    
    comandaText += totalsLine.join(' • ') + `\n`;
    comandaText += `\n💵 *TOTAL: ${formatCurrency(order.total)}*\n`;
    comandaText += `━━━━━━━━━━━━━━━━━━━━`;

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