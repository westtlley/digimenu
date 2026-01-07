import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, MessageSquare, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';

const QUICK_MESSAGES = [
  'Olá! Seu pedido está sendo preparado.',
  'Seu pedido ficará pronto em alguns minutos!',
  'Pedido pronto! Aguardando retirada.',
  'Entregador a caminho!',
  'Houve um pequeno atraso, pedimos desculpas.',
];

export default function OrderChat({ order, onBack }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['orderMessages', order.id],
    queryFn: () => base44.entities.OrderMessage.filter({ order_id: order.id }, 'created_date'),
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.OrderMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderMessages', order.id] });
      setMessage('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text = message) => {
    if (!text.trim()) return;
    sendMutation.mutate({
      order_id: order.id,
      sender: 'store',
      message: text,
      is_auto: false,
    });
    setMessage('');
  };

  const handleQuickMessage = (msg) => {
    handleSend(msg);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h3 className="font-semibold">Chat - Pedido #{order.order_code || order.id?.slice(-6).toUpperCase()}</h3>
          <p className="text-sm text-gray-500">{order.customer_name}</p>
        </div>
      </div>

      {/* Quick Messages */}
      <div className="flex gap-2 p-3 border-b overflow-x-auto">
        <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-1" />
        {QUICK_MESSAGES.map((msg, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickMessage(msg)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs whitespace-nowrap transition-colors"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie uma mensagem para o cliente</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'store' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.sender === 'store'
                    ? 'bg-orange-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'store' ? 'text-orange-200' : 'text-gray-400'}`}>
                  {msg.created_date && format(new Date(msg.created_date), 'HH:mm')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}