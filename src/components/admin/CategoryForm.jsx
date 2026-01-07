import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from 'lucide-react';

export default function CategoryForm({ isOpen, onClose, onSubmit, category = null, categoriesCount = 0 }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image: category?.image || '',
    order: category?.order ?? categoriesCount
  });
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({ ...prev, image: file_url }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da Categoria *</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="Ex: Churrasco, Bebidas, Sobremesas" 
              required 
              autoFocus
            />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Breve descrição da categoria..."
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">Será exibida abaixo do nome da categoria no cardápio</p>
          </div>

          <div>
            <Label>Imagem da Categoria (opcional)</Label>
            <div className="mt-2">
              {formData.image ? (
                <div className="relative inline-block">
                  <img src={formData.image} alt="Categoria" className="w-32 h-32 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Upload</span>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
              {category ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}