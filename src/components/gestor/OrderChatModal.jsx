import React, { useState } from 'react';
import { X, Send, Clock, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function OrderChatModal({ order, entregador, onClose }) {
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  // Buscar mensagens deste pedido
  const { data: messages = [] } = useQuery({
    queryKey: ['orderMessages', order.id],
    queryFn: () => base44.entities.DeliveryMessage.filter(
      { order_id: order.id },
      '-created_date',
      50
    ),
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message) => base44.entities.DeliveryMessage.create(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderMessages', order.id] });
      setReplyText('');
      toast.success('Mensagem enviada!');
    },
  });

  const quickReplies = [
    'Pedido urgente - priorizar',
    'Cliente aguardando contato',
    'Confirme sua localização',
    'Retorne à loja'
  ];

  const handleQuickReply = (reply) => {
    sendMessageMutation.mutate({
      entregador_id: order.entregador_id,
      order_id: order.id,
      title: 'Mensagem do Gestor',
      message: reply,
      priority: 'urgent',
      type: 'order_update'
    });
  };

  const handleSendMessage = () => {
    if (!replyText.trim()) return;
    
    sendMessageMutation.mutate({
      entregador_id: order.entregador_id,
      order_id: order.id,
      title: 'Mensagem do Gestor',
      message: replyText,
      priority: 'normal',
      type: 'order_update'
    });
  };

  const getTimeSince = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">Chat com Entregador</h3>
              <p className="text-sm opacity-90">{entregador?.name || 'Entregador'}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <p className="text-xs font-semibold">Pedido #{order.order_code}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl ${
                  msg.status === 'pending'
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {msg.priority === 'urgent' && (
                      <Badge className="bg-red-500 text-white text-[10px]">🔥 Urgente</Badge>
                    )}
                    {msg.status === 'pending' && (
                      <Badge className="bg-green-500 text-white text-[10px]">✨ Nova</Badge>
                    )}
                    {msg.status === 'read' && (
                      <CheckCheck className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeSince(msg.created_date)}
                  </span>
                </div>
                {msg.title && (
                  <p className="font-bold text-sm mb-1">{msg.title}</p>
                )}
                <p className="text-sm text-gray-700">{msg.message}</p>
              </motion.div>
            ))
          )}
        </div>

        {/* Reply Section */}
        <div className="p-4 bg-white border-t">
          {/* Quick Replies */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">RESPOSTAS RÁPIDAS:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(reply)}
                  disabled={sendMessageMutation.isPending}
                  className="text-xs p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors text-left disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">MENSAGEM PERSONALIZADA:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                disabled={sendMessageMutation.isPending}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-gray-50 border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!replyText.trim() || sendMessageMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}