import React from 'react';
import { FileText, Send, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';

export default function OrderSummary({ 
  cart, 
  customer, 
  config, 
  onGenerateOrder 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = customer.deliveryMethod === 'delivery' ? (config?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  const paymentLabels = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
  };

  const generateOrderText = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let text = `==========================\n`;
    text += `        COMANDA\n`;
    text += `==========================\n\n`;
    text += `Cliente: ${customer.name || 'Não informado'}\n`;
    text += `Contato: ${customer.phone || 'Não informado'}\n`;
    text += `Tipo: ${customer.deliveryMethod === 'delivery' ? 'Entrega 🛵' : 'Retirada 🏪'}\n`;
    
    if (customer.deliveryMethod === 'delivery' && customer.address) {
      text += `Endereço: ${customer.address}\n`;
    }
    
    text += `Pagamento: ${paymentLabels[customer.paymentMethod] || 'Não informado'}\n\n`;
    text += `--- Pedido ---\n\n`;

    cart.forEach((item, index) => {
      text += `#${index + 1} - ${item.dish?.name || 'Marmita'}\n`;
      if (item.rice) text += `Arroz: ${item.rice.name}\n`;
      if (item.bean) text += `Feijão: ${item.bean.name}\n`;
      if (item.garnish?.length > 0) {
        text += `Guarnições: ${item.garnish.map(g => g.name).join(', ')}\n`;
      }
      if (item.salad) text += `Salada: ${item.salad.name}\n`;
      if (item.drink) text += `Bebida: ${item.drink.name}\n`;
      text += `Valor: ${formatCurrency(item.totalPrice)}\n\n`;
    });

    text += `----------------------------\n`;
    text += `Subtotal itens: ${formatCurrency(subtotal)}\n`;
    if (deliveryFee > 0) {
      text += `Taxa de entrega: ${formatCurrency(deliveryFee)}\n`;
    }
    text += `TOTAL: ${formatCurrency(total)}\n\n`;
    text += `Enviado em ${dateStr} às ${timeStr}`;

    return text;
  };

  const handleGeneratePDF = () => {
    const text = generateOrderText();
    const pdf = new jsPDF();
    
    // Split text into lines and add to PDF
    const lines = text.split('\n');
    let y = 20;
    
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    
    lines.forEach(line => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 15, y);
      y += 6;
    });
    
    pdf.save(`comanda-${Date.now()}.pdf`);
  };

  const handleSendWhatsApp = () => {
    const text = generateOrderText();
    const phone = config?.whatsapp_number?.replace(/\D/g, '') || '';
    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/55${phone}?text=${encodedText}`;
    window.open(url, '_blank');
    onGenerateOrder?.();
  };

  const isValid = customer.name && customer.phone && customer.paymentMethod && 
    (customer.deliveryMethod !== 'delivery' || customer.address);

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Taxa de entrega</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total</span>
          <span className="text-green-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Botões */}
      <div className="space-y-3">
        <Button
          onClick={handleSendWhatsApp}
          disabled={!isValid || cart.length === 0}
          className="w-full h-14 text-base bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
        >
          <Send className="w-5 h-5 mr-2" />
          Enviar Pedido via WhatsApp
        </Button>
        
        <Button
          onClick={handleGeneratePDF}
          disabled={cart.length === 0}
          variant="outline"
          className="w-full h-12"
        >
          <Download className="w-5 h-5 mr-2" />
          Baixar Comanda em PDF
        </Button>
      </div>

      {!isValid && cart.length > 0 && (
        <p className="text-sm text-red-500 text-center">
          Preencha todos os campos obrigatórios para continuar
        </p>
      )}
    </div>
  );
}