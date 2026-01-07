import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Printer, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SaleSuccessModal({ 
  isOpen, 
  onClose, 
  orderCode,
  total,
  payments,
  change,
  formatCurrency,
  onPrint 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Venda Concluída!
          </h2>
          <p className="text-gray-600 mb-6">
            Pedido <span className="font-mono font-bold">#{orderCode}</span> registrado com sucesso
          </p>

          {/* Detalhes do Pagamento */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left mb-6">
            {payments && payments.length > 0 && (
              <>
                {payments.length > 1 && (
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Pagamento Misto:
                  </div>
                )}
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{payment.methodLabel}:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold text-green-600">{formatCurrency(total)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">Troco:</span>
                <span className="font-bold text-orange-600">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2">
            <Button
              onClick={onPrint}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold"
            >
              <Printer className="w-5 h-5 mr-2" />
              Imprimir Cupom
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-12 font-semibold"
            >
              <X className="w-5 h-5 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}