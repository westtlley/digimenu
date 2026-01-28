import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, MapPinOff, PhoneOff, Clock, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function QuickReportModal({ isOpen, onClose, order, entregador, darkMode }) {
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [sending, setSending] = useState(false);

  const problems = [
    { key: 'no_answer', label: 'Cliente não atende', icon: PhoneOff, color: 'text-orange-600' },
    { key: 'wrong_address', label: 'Endereço incorreto', icon: MapPinOff, color: 'text-red-600' },
    { key: 'restaurant_delay', label: 'Restaurante atrasado', icon: Clock, color: 'text-yellow-600' },
    { key: 'order_issue', label: 'Problema com pedido', icon: Package, color: 'text-purple-600' },
  ];

  const handleSubmit = async () => {
    if (!selectedProblem) return;

    setSending(true);
    try {
      const problem = problems.find(p => p.key === selectedProblem);
      
      await base44.entities.DeliveryMessage.create({
        entregador_id: entregador.id,
        order_id: order?.id,
        title: `⚠️ Problema Reportado`,
        message: `${problem.label}\n\nDetalhes: ${additionalNotes || 'Nenhum detalhe adicional'}`,
        priority: 'urgent',
        type: 'alert'
      });

      alert('Problema reportado com sucesso! O gestor foi notificado.');
      onClose();
    } catch (e) {
      alert('Erro ao reportar problema');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${darkMode ? 'bg-gray-800 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Reportar Problema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Problema */}
          <div>
            <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Qual é o problema?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {problems.map((problem) => {
                const Icon = problem.icon;
                return (
                  <motion.button
                    key={problem.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedProblem(problem.key)}
                    className={`p-3 rounded-xl transition-all border-2 ${
                      selectedProblem === problem.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : darkMode 
                          ? 'bg-gray-700 text-gray-300 border-gray-600' 
                          : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${
                      selectedProblem === problem.key ? 'text-white' : problem.color
                    }`} />
                    <p className="text-xs font-medium">{problem.label}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Notas Adicionais */}
          {selectedProblem && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Detalhes adicionais (opcional):
              </p>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Descreva o problema com mais detalhes..."
                className={`h-24 ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
              />
            </motion.div>
          )}

          {/* Info do Pedido */}
          {order && (
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-3`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Pedido Relacionado:
              </p>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                #{order.order_code} - {order.customer_name}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
              className="h-12"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedProblem || sending}
              className="bg-orange-600 hover:bg-orange-700 h-12 font-bold"
            >
              {sending ? 'Enviando...' : 'Reportar'}
            </Button>
          </div>

          <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            O gestor será notificado imediatamente sobre o problema
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}