import React from 'react';
import { ChevronDown, Plus, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MobileCategoryAccordion({
  category,
  dishCount,
  isExpanded,
  onToggle,
  onAddDish,
  onEdit,
  onDuplicate,
  onDelete,
  children
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div className="w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">📁</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-bold text-base text-gray-900 truncate">
              {category.name}
            </h3>
            <p className="text-xs text-gray-500">
              {dishCount} {dishCount === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onAddDish}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar prato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar categoria
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar categoria
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir categoria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={onToggle} className="flex items-center justify-center">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}