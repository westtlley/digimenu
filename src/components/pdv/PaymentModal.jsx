import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLanguage } from '@/i18n/LanguageContext';

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const parseMoneyInput = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return Number.NaN;

  let normalized = raw.replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export default function PaymentModal({
  isOpen,
  onClose,
  total,
  formatCurrency,
  onConfirm,
}) {
  const { t } = useLanguage();
  const paymentText = t('paymentModal');
  const paymentMethods = useMemo(() => ([
    { id: 'dinheiro', label: paymentText.methods.dinheiro, icon: 'R$' },
    { id: 'pix', label: paymentText.methods.pix, icon: 'PIX' },
    { id: 'debito', label: paymentText.methods.debito, icon: 'DB' },
    { id: 'credito', label: paymentText.methods.credito, icon: 'CR' },
    { id: 'outro', label: paymentText.methods.outro, icon: 'OUT' },
  ]), [paymentText]);

  const [payments, setPayments] = useState([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [operationMode, setOperationMode] = useState('financial');

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setShowAddPayment(true);
      setSelectedMethod(null);
      setPaymentAmount('');
      setCustomerDocument('');
      setOperationMode('financial');
    }
  }, [isOpen, total]);

  const normalizedTotal = roundMoney(total);
  const totalPaid = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
  const remaining = roundMoney(Math.max(0, normalizedTotal - totalPaid));
  const isComplete = remaining <= 0;
  const parsedPaymentAmount = parseMoneyInput(paymentAmount);
  const canAddPayment = Number.isFinite(parsedPaymentAmount) && parsedPaymentAmount > 0;

  const addPayment = () => {
    if (!selectedMethod || !canAddPayment) return;

    const enteredAmount = roundMoney(parsedPaymentAmount);
    if (enteredAmount <= 0) return;

    if (selectedMethod.id !== 'dinheiro' && enteredAmount > (remaining + 0.001)) {
      toast.error(paymentText.remainingExceeded(formatCurrency(remaining)));
      return;
    }

    const amount = selectedMethod.id === 'dinheiro'
      ? roundMoney(Math.min(enteredAmount, remaining))
      : roundMoney(enteredAmount);
    if (amount <= 0) return;

    const tenderedAmount = selectedMethod.id === 'dinheiro' ? enteredAmount : amount;

    setPayments([
      ...payments,
      {
        id: Date.now(),
        method: selectedMethod.id,
        methodLabel: selectedMethod.label,
        amount,
        tendered_amount: tenderedAmount,
      },
    ]);

    setSelectedMethod(null);
    setPaymentAmount('');
    setShowAddPayment(false);
  };

  const removePayment = (id) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handleConfirm = () => {
    if (!isComplete) return;

    const cashPayments = payments.filter((payment) => payment.method === 'dinheiro');
    const totalCashTendered = roundMoney(
      cashPayments.reduce((sum, payment) => sum + (payment.tendered_amount ?? payment.amount), 0)
    );
    const totalCashApplied = roundMoney(cashPayments.reduce((sum, payment) => sum + payment.amount, 0));
    const totalChange = roundMoney(Math.max(0, totalCashTendered - totalCashApplied));

    let lastCashIndex = -1;
    for (let i = payments.length - 1; i >= 0; i -= 1) {
      if (payments[i].method === 'dinheiro') {
        lastCashIndex = i;
        break;
      }
    }

    const normalizedPayments = payments.map((payment, index) => ({
      ...payment,
      amount: roundMoney(payment.amount),
      tendered_amount: roundMoney(payment.tendered_amount ?? payment.amount),
      change: index === lastCashIndex ? totalChange : 0,
    }));

    onConfirm({
      payments: normalizedPayments,
      change: totalChange,
      document: customerDocument,
      productionMode: operationMode,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-6 h-6 text-green-600" />
            {paymentText.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{paymentText.totalToPay}</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{paymentText.remaining}</p>
                <p className={`text-2xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.max(0, remaining))}
                </p>
              </div>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">{paymentText.registeredPayments}</Label>
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
                        <p className="font-medium text-sm">
                          {payment.method === 'dinheiro' && Number(payment.tendered_amount ?? payment.amount) > (Number(payment.amount) + 0.001)
                            ? `${payment.methodLabel} ${paymentText.receivedSuffix}`
                            : payment.methodLabel}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(
                            payment.method === 'dinheiro' && Number(payment.tendered_amount ?? payment.amount) > (Number(payment.amount) + 0.001)
                              ? (payment.tendered_amount ?? payment.amount)
                              : payment.amount
                          )}
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

          {!isComplete && (
            <>
              {!showAddPayment ? (
                <Button
                  onClick={() => setShowAddPayment(true)}
                  variant="outline"
                  className="w-full border-dashed border-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {paymentText.addPaymentMethod}
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                >
                  <Label className="font-semibold">{paymentText.selectPaymentMethod}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
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
                          {paymentText.amountInMethod(selectedMethod.label)}
                        </Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={paymentAmount}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            if (nextValue === '' || /^\d+([.,]\d{0,2})?$/.test(nextValue)) {
                              setPaymentAmount(nextValue);
                            }
                          }}
                          placeholder={
                            selectedMethod.id === 'dinheiro'
                              ? paymentText.receivedAmountPlaceholder
                              : paymentText.maxPlaceholder(formatCurrency(remaining))
                          }
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
                          {paymentText.cancel}
                        </Button>
                        <Button
                          onClick={addPayment}
                          disabled={!canAddPayment}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {paymentText.add}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3"
            >
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-green-800">{paymentText.completeTitle}</p>
                <p className="text-sm text-green-600">
                  {paymentText.totalPaid(formatCurrency(normalizedTotal))}
                </p>
              </div>
            </motion.div>
          )}

          {remaining > 0 && payments.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                {paymentText.stillMissing(formatCurrency(remaining))}
              </p>
            </div>
          )}

          {payments.length > 0 && (
            <div>
              <Label className="mb-2 block text-xs text-gray-600">
                {paymentText.documentOptionalLabel}
              </Label>
              <Input
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
                placeholder={paymentText.taxIdPlaceholder}
                className="h-10"
              />
            </div>
          )}

          {payments.length > 0 && (
            <div className="space-y-2">
              <Label className="mb-1 block text-xs text-gray-600">
                {paymentText.operationTypeLabel}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOperationMode('financial')}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    operationMode === 'financial'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold">{paymentText.financialSale}</p>
                  <p className="text-xs opacity-80">{paymentText.financialSaleDescription}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOperationMode('productive')}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    operationMode === 'productive'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold">{paymentText.productiveSale}</p>
                  <p className="text-xs opacity-80">{paymentText.productiveSaleDescription}</p>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12"
          >
            {paymentText.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="bg-green-600 hover:bg-green-700 h-12 font-semibold"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {paymentText.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
