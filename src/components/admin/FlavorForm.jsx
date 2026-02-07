import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function FlavorForm({ isOpen, onClose, onSubmit, flavor = null, categories = [] }) {
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  
  const getInitialFormData = () => ({
    name: flavor?.name || '',
    description: flavor?.description || '',
    image: flavor?.image || '',
    category: flavor?.category || 'tradicional',
    cost: flavor?.cost || 0,
    color: flavor?.color || '#3b82f6',
    ingredients: flavor?.ingredients || [],
    tags: flavor?.tags || [],
    is_active: flavor?.is_active !== false,
    is_popular: flavor?.is_popular || false
  });
  
  const [formData, setFormData] = useState(getInitialFormData());
  
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setActiveStep(0);
    }
  }, [isOpen, flavor]);

  const steps = [
    { id: 'info', label: 'Informações Básicas' },
    { id: 'ingredients', label: 'Ingredientes' },
    { id: 'category', label: 'Categoria' }
  ];

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!formData.name?.trim()) {
        newErrors.name = 'Nome é obrigatório';
      }
      if (!formData.description?.trim()) {
        newErrors.description = 'Descrição é obrigatória';
      }
    }
    
    if (step === 2) {
      if (!formData.category) {
        newErrors.category = 'Selecione uma categoria';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      toast.error('Preencha todos os campos obrigatórios');
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'flavors');
        setFormData(prev => ({ ...prev, image: url }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        toast.error('Erro ao fazer upload da imagem');
      }
    }
  };

  const addIngredient = () => {
    const name = prompt('Nome do ingrediente:');
    if (!name) return;
    
    const removable = confirm('Pode ser removido pelo cliente?');
    const extraPriceStr = prompt('Preço por porção extra (R$):', '0');
    const extra_price = parseFloat(extraPriceStr) || 0;
    
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name, removable, extra_price }]
    }));
  };

  const removeIngredient = (idx) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const availableTags = ['mais_pedido', 'picante', 'extra_queijo', 'vegano', 'vegetariano', 'sem_lactose'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {flavor ? 'Editar Sabor' : 'Criar Novo Sabor'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center w-full">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  idx === activeStep 
                    ? 'bg-orange-500 text-white' 
                    : idx < activeStep 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {idx < activeStep ? '✓' : idx + 1}
                </div>
                <p className={`text-xs mt-2 text-center ${
                  idx === activeStep ? 'text-orange-600 font-semibold' : 'text-gray-500'
                }`}>
                  {step.label}
                </p>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 ${
                  idx < activeStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Step 1: Informações Básicas */}
          {activeStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Nome do Sabor *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                  }}
                  placeholder="Ex: Calabresa com Cheddar"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <Label>Descrição / Ingredientes *</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    if (errors.description) setErrors(prev => ({ ...prev, description: null }));
                  }}
                  rows={4}
                  placeholder="Descreva os principais ingredientes do sabor..."
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <Label>Foto do Sabor</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {formData.image && (
                  <img src={formData.image} alt="" className="mt-2 w-32 h-32 object-cover rounded" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custo de Produção (R$)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.cost} 
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Para análise de margem</p>
                </div>
                <div>
                  <Label>Cor para Visualização</Label>
                  <Input 
                    type="color"
                    value={formData.color} 
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Ingredientes */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Ingredientes Detalhados</Label>
                <Button type="button" onClick={addIngredient} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {formData.ingredients.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <p>Nenhum ingrediente adicionado</p>
                  <p className="text-sm mt-2">Clique em "Adicionar" para começar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ing.name}</span>
                        {!ing.removable && <Badge variant="outline">🔒 Fixo</Badge>}
                        {ing.extra_price > 0 && (
                          <Badge variant="outline">+R$ {ing.extra_price.toFixed(2)}</Badge>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeIngredient(idx)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={formData.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <label className="flex items-center gap-2">
                  <Switch 
                    checked={formData.is_active} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} 
                  />
                  <span className="text-sm">Sabor Ativo</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch 
                    checked={formData.is_popular} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))} 
                  />
                  <span className="text-sm">⭐ Popular</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Categoria */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Categoria do Sabor *</Label>
                <p className="text-sm text-gray-500 mb-3">
                  A categoria define o tipo de preço aplicado quando o cliente escolher este sabor
                </p>
                
                {errors.category && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-red-700 text-sm mb-3">
                    <AlertCircle className="w-4 h-4" />
                    {errors.category}
                  </div>
                )}

                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      <p>Nenhuma categoria cadastrada</p>
                      <p className="text-sm mt-2">Crie categorias primeiro</p>
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, category: cat.slug }));
                          if (errors.category) setErrors(prev => ({ ...prev, category: null }));
                        }}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          formData.category === cat.slug
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold flex items-center gap-2">
                              {cat.slug === 'premium' && <Sparkles className="w-4 h-4 text-orange-500 fill-current" />}
                              {cat.name}
                            </p>
                            {cat.description && (
                              <p className="text-sm text-gray-600 mt-1">{cat.description}</p>
                            )}
                          </div>
                          {formData.category === cat.slug && (
                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <h4 className="font-semibold mb-3">Resumo do Sabor</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Nome:</strong> {formData.name || '-'}</p>
                  <p><strong>Categoria:</strong> {categories.find(c => c.slug === formData.category)?.name || formData.category}</p>
                  <p><strong>Ingredientes:</strong> {formData.ingredients.length} cadastrados</p>
                  <p><strong>Custo:</strong> R$ {formData.cost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-6 border-t">
          {activeStep > 0 && (
            <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
              Voltar
            </Button>
          )}
          {activeStep === 0 && (
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button type="button" onClick={handleNext} className="flex-1 bg-orange-500 hover:bg-orange-600">
            {activeStep === steps.length - 1 ? (flavor ? 'Salvar' : 'Criar Sabor') : 'Próximo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}