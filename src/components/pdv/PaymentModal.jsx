import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PAYMENT_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { id: 'pix', label: 'PIX', icon: '📱' },
  { id: 'debito', label: 'Débito', icon: '💳' },
  { id: 'credito', label: 'Crédito', icon: '💳' },
  { id: 'outro', label: 'Outro', icon: '🧾' },
];

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  total, 
  formatCurrency,
  onConfirm 
}) {
  const [payments, setPayments] = useState([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setShowAddPayment(true);
      setSelectedMethod(null);
      setPaymentAmount('');
      setCustomerDocument('');
    }
  }, [isOpen, total]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;
  const isComplete = remaining <= 0;

  const addPayment = () => {
    if (!selectedMethod || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    const amount = Math.min(parseFloat(paymentAmount), remaining);
    
    setPayments([...payments, {
      id: Date.now(),
      method: selectedMethod.id,
      methodLabel: selectedMethod.label,
      amount
    }]);

    setSelectedMethod(null);
    setPaymentAmount('');
    setShowAddPayment(false);
  };

  const removePayment = (id) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const handleConfirm = () => {
    if (!isComplete) return;
    
    // Se for pagamento único em dinheiro, calcular troco
    if (payments.length === 1 && payments[0].method === 'dinheiro') {
      const cashPayment = payments[0];
      const change = cashPayment.amount - total;
      onConfirm({
        payments: [{
          ...cashPayment,
          amount: total // Ajustar para o valor exato
        }],
        change: Math.max(0, change),
        document: customerDocument
      });
    } else {
      // Pagamentos mistos sem troco
      onConfirm({
        payments,
        change: 0,
        document: customerDocument
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-6 h-6 text-green-600" />
            Formas de Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Restante</p>
                <p className={`text-2xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.max(0, remaining))}
                </p>
              </div>
            </div>
          </div>

          {/* Pagamentos Adicionados */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">Pagamentos Registrados</Label>
              <AnimatePresence>
                {payments.map((payment) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{payment.methodLabel}</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePayment(payment.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Adicionar Pagamento */}
          {!isComplete && (
            <>
              {!showAddPayment ? (
                <Button
                  onClick={() => setShowAddPayment(true)}
                  variant="outline"
                  className="w-full border-dashed border-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Forma de Pagamento
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                >
                  <Label className="font-semibold">Selecione a Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedMethod?.id === method.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{method.icon}</div>
                        <p className="font-medium text-xs">{method.label}</p>
                      </button>
                    ))}
                  </div>

                  {selectedMethod && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      <div>
                        <Label className="mb-2 block">
                          Valor em {selectedMethod.label} (R$)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          max={remaining}
                          value={paymentAmount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val <= remaining || !e.target.value) {
                              setPaymentAmount(e.target.value);
                            }
                          }}
                          placeholder={`Máx: ${formatCurrency(remaining)}`}
                          className="h-12 text-lg font-semibold"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setShowAddPayment(false);
                            setSelectedMethod(null);
                            setPaymentAmount('');
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={addPayment}
                          disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </>
          )}

          {/* Status */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3"
            >
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-green-800">Pagamento Completo!</p>
                <p className="text-sm text-green-600">
                  Total pago: {formatCurrency(totalPaid)}
                </p>
              </div>
            </motion.div>
          )}

          {remaining > 0 && payments.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Ainda falta {formatCurrency(remaining)} para completar o pagamento
              </p>
            </div>
          )}

          {/* Documento */}
          {payments.length > 0 && (
            <div>
              <Label className="mb-2 block text-xs text-gray-600">
                CPF/CNPJ (opcional)
              </Label>
              <Input
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="h-10"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="bg-green-600 hover:bg-green-700 h-12 font-semibold"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}