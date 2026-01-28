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
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-[#1a1a1a] rounded-2xl ${maxWidthClass} w-full max-h-[95vh] flex flex-col overflow-hidden`}
      >
        {/* Header Compacto */}
        <div className="px-4 md:px-6 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg md:text-xl font-bold text-white truncate">{title}</h2>
            {subtitle && <p className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {headerContent}
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-800 rounded-lg text-white transition-colors flex-shrink-0"
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
          <div className="px-4 md:px-6 py-3 border-t border-gray-800 bg-[#0a0a0a] flex-shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}