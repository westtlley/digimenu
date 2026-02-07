import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, DollarSign, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BulkEditOptions({ isOpen, onClose, group, onUpdate }) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [priceAdjustment, setPriceAdjustment] = useState({ type: 'add', value: 0 });

  const handleSelectAll = () => {
    if (selectedOptions.length === group.options.length) {
      setSelectedOptions([]);
    } else {
      setSelectedOptions(group.options.map(opt => opt.id));
    }
  };

  const handleBulkPriceChange = () => {
    const updatedOptions = group.options.map(opt => {
      if (selectedOptions.includes(opt.id)) {
        let newPrice = opt.price || 0;
        if (priceAdjustment.type === 'add') {
          newPrice += parseFloat(priceAdjustment.value) || 0;
        } else if (priceAdjustment.type === 'multiply') {
          newPrice *= parseFloat(priceAdjustment.value) || 1;
        } else if (priceAdjustment.type === 'set') {
          newPrice = parseFloat(priceAdjustment.value) || 0;
        }
        return { ...opt, price: Math.max(0, newPrice) };
      }
      return opt;
    });

    onUpdate({ ...group, options: updatedOptions });
    toast.success(`${selectedOptions.length} opções atualizadas`);
    onClose();
  };

  const handleBulkStatusChange = (isActive) => {
    const updatedOptions = group.options.map(opt => {
      if (selectedOptions.includes(opt.id)) {
        return { ...opt, is_active: isActive };
      }
      return opt;
    });

    onUpdate({ ...group, options: updatedOptions });
    toast.success(`${selectedOptions.length} opções ${isActive ? 'ativadas' : 'desativadas'}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-orange-500" />
            Edição em Massa - {group?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Opções */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Selecione as opções para editar:</Label>
              <Button size="sm" variant="outline" onClick={handleSelectAll}>
                {selectedOptions.length === group?.options?.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {group?.options?.map(opt => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(opt.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOptions(prev => [...prev, opt.id]);
                      } else {
                        setSelectedOptions(prev => prev.filter(id => id !== opt.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{opt.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      R$ {(opt.price || 0).toFixed(2)}
                    </span>
                  </div>
                  <Badge variant={opt.is_active !== false ? "default" : "outline"} className="text-xs">
                    {opt.is_active !== false ? 'Ativo' : 'Inativo'}
                  </Badge>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {selectedOptions.length} de {group?.options?.length || 0} opções selecionadas
            </p>
          </div>

          {selectedOptions.length > 0 && (
            <>
              {/* Ajuste de Preço */}
              <div className="border-t pt-4">
                <Label className="mb-3 block">Ajustar Preços</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={priceAdjustment.type}
                      onChange={(e) => setPriceAdjustment(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="add">Adicionar</option>
                      <option value="multiply">Multiplicar por</option>
                      <option value="set">Definir como</option>
                    </select>
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      value={priceAdjustment.value}
                      onChange={(e) => setPriceAdjustment(prev => ({ ...prev, value: e.target.value }))}
                      placeholder={priceAdjustment.type === 'multiply' ? '1.10 (aumentar 10%)' : '5.00'}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleBulkPriceChange}
                  className="w-full mt-3 bg-blue-500 hover:bg-blue-600"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Aplicar Ajuste de Preço
                </Button>
              </div>

              {/* Ações de Status */}
              <div className="border-t pt-4">
                <Label className="mb-3 block">Alterar Status</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleBulkStatusChange(true)}
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Ativar Selecionadas
                  </Button>
                  <Button
                    onClick={() => handleBulkStatusChange(false)}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Desativar Selecionadas
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}