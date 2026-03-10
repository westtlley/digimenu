import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Layout padrão para modais profissionais
 * Garante altura controlada, footer fixo e conteúdo rolável
 */
export default function ModalLayout({ 
  title, 
  subtitle,
  onClose, 
  children, 
  footer,
  maxWidth = '5xl',
  headerContent
}) {
  const maxWidthClass = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl'
  }[maxWidth] || 'max-w-5xl';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 safe-y safe-x">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-card text-card-foreground border border-border rounded-none sm:rounded-2xl ${maxWidthClass} w-full h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col overflow-hidden`}
      >
        {/* Header Compacto */}
        <div className="px-4 md:px-6 py-3 border-b border-border flex items-center justify-between flex-shrink-0 safe-top">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{title}</h2>
            {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          {headerContent}
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Rolável */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 md:p-6">
            {children}
          </div>
        </div>

        {/* Footer Fixo */}
        {footer && (
          <div className="px-4 md:px-6 py-3 border-t border-border bg-muted/40 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
