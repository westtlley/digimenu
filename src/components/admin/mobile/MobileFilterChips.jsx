import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileFilterChips({
  filters,
  onRemoveFilter,
  onClearAll
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
      {filters.map((filter, index) => (
        <motion.div
          key={filter.key}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
        >
          <span>{filter.label}</span>
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      ))}
      
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 px-3 py-1.5 hover:text-gray-700 whitespace-nowrap flex-shrink-0"
        >
          Limpar tudo
        </button>
      )}
    </div>
  );
}