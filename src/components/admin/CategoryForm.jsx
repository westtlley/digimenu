import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MobileInput, MobileTextarea } from "@/components/ui/MobileFormField";
import AdminMediaField from './media/AdminMediaField';

export default function CategoryForm({ isOpen, onClose, onSubmit, category = null, categoriesCount = 0 }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image: category?.image || '',
    order: category?.order ?? categoriesCount
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Nome da Categoria *</Label>
            <MobileInput
              value={formData.name} 
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="Ex: Churrasco, Bebidas, Sobremesas" 
              required 
              autoFocus
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Descrição (opcional)</Label>
            <MobileTextarea
              value={formData.description} 
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Breve descrição da categoria..."
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Será exibida abaixo do nome da categoria no cardápio</p>
          </div>

          <div>
            <AdminMediaField
              label="Imagem da Categoria (opcional)"
              value={formData.image}
              onChange={(url) => setFormData(prev => ({ ...prev, image: url || '' }))}
              imageType="category"
              folder="categories"
              title="Adicionar imagem da categoria"
              description="Use uma imagem simples e clara para reforcar a leitura da categoria."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 min-h-touch">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 min-h-touch bg-orange-500 hover:bg-orange-600">
              {category ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
