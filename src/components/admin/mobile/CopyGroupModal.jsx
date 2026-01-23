import React, { useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CopyGroupModal({ isOpen, onClose, availableGroups, onConfirm, currentDish = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);

  // ✅ Obter grupos já adicionados ao prato atual
  const getAlreadyAddedGroups = () => {
    if (!currentDish?.complement_groups) return [];
    return currentDish.complement_groups.map(cg => cg.group_id);
  };

  const alreadyAddedGroupIds = getAlreadyAddedGroups();

  const filteredGroups = availableGroups.filter(group => {
    const matchesSearch = group.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedGroups);
    setSelectedGroups([]);
    setSearchTerm('');
    onClose();
  };

  const handleClose = () => {
    setSelectedGroups([]);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Copiar grupo</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Selecione um ou mais grupos para reutilizar
            </p>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar grupos de complementos"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Groups List */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Nenhum grupo encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map(group => {
                  const isSelected = selectedGroups.includes(group.id);
                  const optionsCount = group.options?.length || 0;

                  return (
                    <button
                      key={group.id}
                      onClick={() => toggleGroupSelection(group.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 mb-1">
                            {group.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Grupo disponível para uso
                          </p>
                        </div>

                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {optionsCount} {optionsCount === 1 ? 'opção' : 'opções'}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600 mb-3">
              {selectedGroups.length === 0
                ? 'Nenhum grupo selecionado'
                : `${selectedGroups.length} ${selectedGroups.length === 1 ? 'grupo selecionado' : 'grupos selecionados'}`
              }
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedGroups.length === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}