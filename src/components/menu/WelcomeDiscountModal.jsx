import { X, Gift, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function WelcomeDiscountModal({
  isOpen,
  onClose,
  onApplyCoupon,
  primaryColor = '#f97316',
  slug,
  coupon = null
}) {
  const couponCode = String(coupon?.code || '').trim();
  const discountValue = Number(coupon?.discount_value || 0);
  const discountText = coupon?.discount_type === 'percentage'
    ? `${discountValue}% OFF`
    : `R$ ${discountValue.toFixed(2)} OFF`;

  const markSeen = () => {
    if (slug) {
      localStorage.setItem(`welcome_discount_${slug}`, 'true');
    }
  };

  const handleApplyDiscount = () => {
    if (onApplyCoupon && couponCode) {
      onApplyCoupon(couponCode);
    }
    markSeen();
    onClose();
  };

  const handleClose = () => {
    markSeen();
    onClose();
  };

  if (!isOpen || !couponCode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-400/20 to-orange-400/20 rounded-full -ml-12 -mb-12 blur-xl" />

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="relative z-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                <Gift className="w-10 h-10 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Bem-vindo!
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Ganhe <span className="font-bold text-orange-500">{discountText}</span> na sua compra.
            </p>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 mb-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  Cupom: {couponCode}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use este cupom no checkout e ganhe desconto.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                Talvez depois
              </Button>
              <Button
                onClick={handleApplyDiscount}
                className="flex-1 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Aplicar cupom
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
