import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Receipt, ArrowRight } from 'lucide-react';

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function TransferItemsModal({ open, onOpenChange, sourceComanda, allComandas, onTransfer }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [targetComandaId, setTargetComandaId] = useState('');

  useEffect(() => {
    if (open && sourceComanda) {
      setSelectedItems([]);
      setTargetComandaId('');
    }
  }, [open, sourceComanda]);

  if (!sourceComanda) return null;

  const items = Array.isArray(sourceComanda.items) ? sourceComanda.items : [];
  const availableComandas = allComandas.filter(
    c => c.id !== sourceComanda.id && c.status === 'open'
  );

  const toggleItem = (index) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const selectedItemsData = items.filter((_, idx) => selectedItems.includes(idx));
  const transferTotal = selectedItemsData.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  );

  const handleTransfer = () => {
    if (selectedItems.length === 0) {
      return;
    }
    if (!targetComandaId) {
      return;
    }
    onTransfer(selectedItems, targetComandaId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir Itens - {sourceComanda.code || `#${sourceComanda.id}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selecionar itens */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Selecione os itens para transferir:</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum item na comanda</p>
              ) : (
                items.map((item, idx) => {
                  const itemTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                  const isSelected = selectedItems.includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => toggleItem(idx)}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(idx)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.dish_name || 'Item'}</p>
                        <p className="text-xs text-gray-500">
                          Qtd: {item.quantity || 0} × {formatCurrency(item.unit_price || 0)} = {formatCurrency(itemTotal)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selecionar comanda destino */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Transferir para:</Label>
            <Select value={targetComandaId} onValueChange={setTargetComandaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a comanda destino" />
              </SelectTrigger>
              <SelectContent>
                {availableComandas.length === 0 ? (
                  <SelectItem value="" disabled>Nenhuma comanda aberta disponível</SelectItem>
                ) : (
                  availableComandas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code || `#${c.id}`} {c.table_name ? `- Mesa ${c.table_name}` : ''} {c.customer_name ? `(${c.customer_name})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          {selectedItems.length > 0 && (
            <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Itens selecionados: {selectedItems.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Total a transferir: {formatCurrency(transferTotal)}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={selectedItems.length === 0 || !targetComandaId}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Transferir {selectedItems.length > 0 && `(${selectedItems.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
