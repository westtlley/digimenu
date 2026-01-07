import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Bell } from 'lucide-react';
import { toast } from "sonner";

export default function EntregadorMessaging({ isOpen, onClose, entregador }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const quickMessages = [
    'Pedido urgente disponível',
    'Por favor, confirme sua localização',
    'Cliente aguardando contato',
    'Retorne à loja para nova entrega',
  ];

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    
    // Simulação de envio (em produção usar push notification ou WhatsApp API)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`Mensagem enviada para ${entregador.name}`);
    setMessage('');
    setSending(false);
  };

  const handleSendNotification = async () => {
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success(`Notificação push enviada para ${entregador.name}`);
    setSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Mensagem para {entregador?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Messages */}
          <div>
            <p className="text-sm font-medium mb-2">Mensagens rápidas:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickMessages.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessage(msg)}
                  className="p-2 text-xs text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <p className="text-sm font-medium mb-2">Mensagem personalizada:</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSendNotification}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificação Push
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Mensagem
            </Button>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-3 border text-xs">
            <p className="font-medium mb-1">Contato:</p>
            <p className="text-gray-600">📱 {entregador?.phone || 'Não informado'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}