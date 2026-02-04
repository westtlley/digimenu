import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

export default function ReferralCodeModal({ 
  isOpen, 
  onClose, 
  referralCode, 
  onApplyReferralCode,
  primaryColor = '#f97316' 
}) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Digite um código de referência');
      return;
    }
    
    const result = await onApplyReferralCode(code.trim().toUpperCase());
    if (result.success) {
      toast.success(result.message);
      setCode('');
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={onClose} 
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="text-center mb-6">
              <Gift className="w-16 h-16 mx-auto mb-4" style={{ color: primaryColor }} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Programa de Indicação
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Indique amigos e ganhe pontos!
              </p>
            </div>

            {/* Meu Código */}
            {referralCode && (
              <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Seu Código de Indicação
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={referralCode}
                    readOnly
                    className="flex-1 font-mono text-lg font-bold text-center"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Compartilhe este código e ganhe 100 pontos quando seu amigo fizer a primeira compra!
                </p>
              </div>
            )}

            {/* Aplicar Código */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="referral-code" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Tem um código de indicação?
                </Label>
                <Input
                  id="referral-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código"
                  className="text-center font-mono text-lg"
                  maxLength={10}
                />
              </div>

              <Button
                onClick={handleApply}
                className="w-full py-3 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: primaryColor }}
                disabled={!code.trim()}
              >
                Aplicar Código
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
