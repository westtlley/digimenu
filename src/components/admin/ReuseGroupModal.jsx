import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ReuseGroupModal({ isOpen, onClose, onSelect, availableGroups, allDishes, currentDish }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);

  // ✅ Obter grupos já adicionados ao prato atual
  const getAlreadyAddedGroups = () => {
    if (!currentDish?.complement_groups) return [];
    return currentDish.complement_groups.map(cg => cg.group_id);
  };

  const alreadyAddedGroupIds = getAlreadyAddedGroups();

  const getDishesUsingGroup = (groupId) => {
    return allDishes.filter(d => 
      d.complement_groups?.some(cg => cg.group_id === groupId)
    );
  };

  const filteredGroups = availableGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copiar grupo</DialogTitle>
          <p className="text-sm text-gray-500">Selecione um ou mais grupos para reutilizar</p>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar grupos de complementos"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum grupo encontrado
            </div>
          ) : (
            filteredGroups.map(group => {
              const dishesUsing = getDishesUsingGroup(group.id);
              const isSelected = selectedGroups.includes(group.id);
              const isAlreadyAdded = alreadyAddedGroupIds.includes(group.id);
              
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    // ✅ Não permitir selecionar se já está adicionado
                    if (isAlreadyAdded) return;
                    
                    if (isSelected) {
                      setSelectedGroups(prev => prev.filter(id => id !== group.id));
                    } else {
                      setSelectedGroups(prev => [...prev, group.id]);
                    }
                  }}
                  disabled={isAlreadyAdded}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    isAlreadyAdded 
                      ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' 
                      : isSelected 
                        ? 'bg-orange-50 border-orange-300' 
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 mt-0.5 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                      isAlreadyAdded
                        ? 'bg-gray-400 border-gray-400'
                        : isSelected 
                          ? 'bg-orange-500 border-orange-500' 
                          : 'border-gray-300'
                    }`}>
                      {isAlreadyAdded ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : isSelected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base">{group.name}</h3>
                        {isAlreadyAdded && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            Já adicionado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {isAlreadyAdded
                          ? 'Este grupo já está adicionado a este prato'
                          : dishesUsing.length > 0 
                            ? `Disponível em: ${dishesUsing.map(d => d.name).join(', ')}` 
                            : 'Grupo disponível para uso'}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 flex-shrink-0">
                      {(group.options || []).length} opções
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            {selectedGroups.length > 0 ? `${selectedGroups.length} grupo(s) selecionado(s)` : 'Nenhum grupo selecionado'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button 
              onClick={() => {
                // ✅ Adicionar múltiplos grupos de uma vez
                selectedGroups.forEach(groupId => onSelect(groupId));
                setSelectedGroups([]);
                onClose();
              }}
              disabled={selectedGroups.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Confirmar {selectedGroups.length > 0 && `(${selectedGroups.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}