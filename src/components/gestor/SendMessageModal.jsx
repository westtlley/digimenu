import React, { useState } from 'react';
import { MessageCircle, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const QUICK_MESSAGES = [
  'Pedido pronto para retirada',
  'Cliente solicitou urgência',
  'Atenção ao endereço de entrega',
  'Contatar cliente antes de entregar',
  'Pedido com troco necessário'
];

/**
 * Modal para enviar mensagem do gestor para entregador
 * Com opção de mensagens rápidas e prioridade
 */
export default function SendMessageModal({ order, entregador, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);

  const handleQuickMessage = (msg) => {
    setMessage(msg);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    setSending(true);
    try {
      await base44.entities.DeliveryMessage.create({
        entregador_id: entregador.id,
        order_id: order.id,
        title: title || 'Mensagem do Gestor',
        message: message.trim(),
        priority: priority,
        status: 'pending',
        type: 'order_update'
      });

      toast.success('Mensagem enviada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Enviar Mensagem para Entregador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entregador Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Entregador:</p>
            <p className="font-semibold text-gray-900">{entregador.name}</p>
            <p className="text-xs text-gray-600">Pedido #{order.order_code}</p>
          </div>

          {/* Quick Messages */}
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">Mensagens Rápidas</Label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  onClick={() => handleQuickMessage(msg)}
                  className="text-left px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Título (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atenção Urgente"
              className="text-sm"
            />
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">Mensagem *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[120px] text-sm"
            />
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <div>
                <Label className="text-xs font-medium text-amber-900">Mensagem Urgente</Label>
                <p className="text-[10px] text-amber-700">Requer confirmação de leitura imediata</p>
              </div>
            </div>
            <Switch
              checked={priority === 'urgent'}
              onCheckedChange={(checked) => setPriority(checked ? 'urgent' : 'normal')}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              ℹ️ O entregador receberá uma notificação push e precisará confirmar a leitura antes de continuar
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Mensagem'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}