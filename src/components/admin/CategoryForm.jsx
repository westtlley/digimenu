import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from 'lucide-react';
import { MobileInput, MobileTextarea } from "@/components/ui/MobileFormField";

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
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'categories');
        setFormData(prev => ({ ...prev, image: url }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert('Erro ao fazer upload da imagem');
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
            <Label className="text-sm font-medium mb-2 block">Imagem da Categoria (opcional)</Label>
            <div className="mt-2">
              {formData.image ? (
                <div className="relative inline-block">
                  <img src={formData.image} alt="Categoria" className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="absolute -top-2 -right-2 w-7 h-7 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 min-h-touch min-w-touch"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-orange-500 hover:bg-orange-50 transition-colors min-h-touch">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-orange-500" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Upload</span>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
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