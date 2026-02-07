import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Edit, Trash2, Package, TrendingDown, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermission } from '../permissions/usePermission';
import { useMenuDishes } from '@/hooks/useMenuData';

export default function InventoryManagement() {
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [isDishIngredientDialogOpen, setIsDishIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [ingredientFormData, setIngredientFormData] = useState({
    name: '',
    unit: 'unidade',
    current_stock: 0,
    min_stock: 5,
    cost_per_unit: 0,
    expiration_date: null
  });
  const [dishIngredientFormData, setDishIngredientFormData] = useState({
    ingredient_id: '',
    quantity: 1
  });

  // ✅ CORREÇÃO: Buscar ingredientes com contexto do slug
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Ingredient.list(null, opts);
    },
    enabled: !!menuContext,
  });

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { data: dishes = [] } = useMenuDishes();

  // ✅ CORREÇÃO: Buscar dishIngredients com contexto do slug
  const { data: dishIngredients = [] } = useQuery({
    queryKey: ['dishIngredients', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.DishIngredient.list(null, opts);
    },
    enabled: !!menuContext,
  });

  // Calcular estoque disponível considerando uso em pratos
  const ingredientStock = useMemo(() => {
    const stock = {};
    ingredients.forEach(ing => {
      stock[ing.id] = {
        ...ing,
        available: ing.current_stock || 0,
        reserved: 0,
        lowStock: (ing.current_stock || 0) <= (ing.min_stock || 5)
      };
    });

    // Calcular estoque reservado (pedidos em andamento)
    // TODO: Implementar cálculo baseado em pedidos ativos

    return stock;
  }, [ingredients]);

  // Alertas de estoque baixo
  const lowStockAlerts = useMemo(() => {
    return ingredients.filter(ing => 
      (ing.current_stock || 0) <= (ing.min_stock || 5)
    );
  }, [ingredients]);

  // Pratos que precisam de ingredientes com estoque baixo
  const affectedDishes = useMemo(() => {
    const affected = [];
    lowStockAlerts.forEach(ing => {
      const relatedDishes = dishIngredients
        .filter(di => di.ingredient_id === ing.id)
        .map(di => {
          const dish = dishes.find(d => d.id === di.dish_id);
          return dish ? { ...dish, requiredQuantity: di.quantity } : null;
        })
        .filter(Boolean);
      affected.push(...relatedDishes);
    });
    return affected;
  }, [lowStockAlerts, dishIngredients, dishes]);

  const createIngredientMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Ingredient.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ingredients']);
      toast.success('Ingrediente criado com sucesso!');
      setIsIngredientDialogOpen(false);
      resetIngredientForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar ingrediente: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const updateIngredientMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Ingredient.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ingredients']);
      toast.success('Ingrediente atualizado com sucesso!');
      setIsIngredientDialogOpen(false);
      resetIngredientForm();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar ingrediente: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.Ingredient.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ingredients']);
      toast.error('Ingrediente deletado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao deletar ingrediente: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const addDishIngredientMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.DishIngredient.create({
        ...data,
        dish_id: selectedDish.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dishIngredients']);
      toast.success('Ingrediente adicionado ao prato!');
      setIsDishIngredientDialogOpen(false);
      resetDishIngredientForm();
    },
    onError: (error) => {
      toast.error('Erro ao adicionar ingrediente: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const resetIngredientForm = () => {
    setIngredientFormData({
      name: '',
      unit: 'unidade',
      current_stock: 0,
      min_stock: 5,
      cost_per_unit: 0,
      expiration_date: null
    });
    setEditingIngredient(null);
  };

  const resetDishIngredientForm = () => {
    setDishIngredientFormData({
      ingredient_id: '',
      quantity: 1
    });
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setIngredientFormData({
      name: ingredient.name || '',
      unit: ingredient.unit || 'unidade',
      current_stock: ingredient.current_stock || 0,
      min_stock: ingredient.min_stock || 5,
      cost_per_unit: ingredient.cost_per_unit || 0,
      expiration_date: ingredient.expiration_date || null
    });
    setIsIngredientDialogOpen(true);
  };

  const handleSubmitIngredient = (e) => {
    e.preventDefault();
    if (editingIngredient) {
      updateIngredientMutation.mutate({ id: editingIngredient.id, data: ingredientFormData });
    } else {
      createIngredientMutation.mutate(ingredientFormData);
    }
  };

  const handleAddStockMovement = (ingredientId, type, quantity) => {
    // Criar movimentação de estoque
    base44.entities.StockMovement.create({
      ingredient_id: ingredientId,
      type, // 'entry', 'exit', 'adjustment'
      quantity,
      created_at: new Date().toISOString()
    }).then(() => {
      // Atualizar estoque do ingrediente
      const ingredient = ingredients.find(i => i.id === ingredientId);
      const newStock = type === 'entry' 
        ? (ingredient.current_stock || 0) + quantity
        : type === 'exit'
        ? (ingredient.current_stock || 0) - quantity
        : quantity;
      
      base44.entities.Ingredient.update(ingredientId, { current_stock: newStock })
        .then(() => {
          queryClient.invalidateQueries(['ingredients']);
          toast.success('Estoque atualizado!');
        });
    });
  };

  // Sugestão automática de compras
  const purchaseSuggestions = useMemo(() => {
    return lowStockAlerts.map(ing => ({
      ...ing,
      suggestedQuantity: (ing.min_stock || 5) * 3, // Sugerir 3x o mínimo
      estimatedCost: ((ing.min_stock || 5) * 3) * (ing.cost_per_unit || 0)
    }));
  }, [lowStockAlerts]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Estoque</h2>
          <p className="text-gray-500">Rastreie ingredientes e gerencie estoque</p>
        </div>
        <Dialog open={isIngredientDialogOpen} onOpenChange={setIsIngredientDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetIngredientForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Ingrediente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitIngredient} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={ingredientFormData.name}
                  onChange={(e) => setIngredientFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unidade</Label>
                  <Select
                    value={ingredientFormData.unit}
                    onValueChange={(value) => setIngredientFormData(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="g">Grama</SelectItem>
                      <SelectItem value="l">Litro</SelectItem>
                      <SelectItem value="ml">Mililitro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estoque Atual</Label>
                  <Input
                    type="number"
                    value={ingredientFormData.current_stock}
                    onChange={(e) => setIngredientFormData(prev => ({ ...prev, current_stock: parseFloat(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={ingredientFormData.min_stock}
                    onChange={(e) => setIngredientFormData(prev => ({ ...prev, min_stock: parseFloat(e.target.value) || 5 }))}
                    min="0"
                  />
                </div>
                <div>
                  <Label>Custo por Unidade (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ingredientFormData.cost_per_unit}
                    onChange={(e) => setIngredientFormData(prev => ({ ...prev, cost_per_unit: parseFloat(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsIngredientDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingIngredient ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de Estoque Baixo */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockAlerts.map(ing => (
                <div key={ing.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <strong>{ing.name}</strong>
                    <span className="text-sm text-gray-500 ml-2">
                      Estoque: {ing.current_stock} {ing.unit} (Mínimo: {ing.min_stock})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddStockMovement(ing.id, 'entry', ing.min_stock * 3)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Comprar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sugestões de Compra */}
      {purchaseSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Sugestões de Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Quantidade Sugerida</TableHead>
                  <TableHead>Custo Estimado</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseSuggestions.map(suggestion => (
                  <TableRow key={suggestion.id}>
                    <TableCell>{suggestion.name}</TableCell>
                    <TableCell>{suggestion.suggestedQuantity} {suggestion.unit}</TableCell>
                    <TableCell>R$ {suggestion.estimatedCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleAddStockMovement(suggestion.id, 'entry', suggestion.suggestedQuantity)}
                      >
                        Adicionar ao Estoque
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Lista de Ingredientes */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map(ing => {
                const stock = ingredientStock[ing.id];
                return (
                  <TableRow key={ing.id}>
                    <TableCell>{ing.name}</TableCell>
                    <TableCell>{ing.current_stock || 0} {ing.unit}</TableCell>
                    <TableCell>{ing.min_stock || 5} {ing.unit}</TableCell>
                    <TableCell>
                      {stock?.lowStock ? (
                        <Badge variant="destructive">Estoque Baixo</Badge>
                      ) : (
                        <Badge variant="default">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditIngredient(ing)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddStockMovement(ing.id, 'entry', 10)}
                        >
                          +10
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Relação Prato-Ingrediente */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredientes por Prato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dishes.map(dish => {
              const dishIngs = dishIngredients.filter(di => di.dish_id === dish.id);
              return (
                <div key={dish.id} className="border rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <strong>{dish.name}</strong>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDish(dish);
                        setIsDishIngredientDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Ingrediente
                    </Button>
                  </div>
                  {dishIngs.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {dishIngs.map(di => {
                        const ing = ingredients.find(i => i.id === di.ingredient_id);
                        return ing ? (
                          <li key={di.id}>
                            {ing.name} - {di.quantity} {ing.unit}
                            {ingredientStock[ing.id]?.lowStock && (
                              <Badge variant="destructive" className="ml-2">Estoque Baixo</Badge>
                            )}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum ingrediente cadastrado</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar ingrediente ao prato */}
      <Dialog open={isDishIngredientDialogOpen} onOpenChange={setIsDishIngredientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Ingrediente - {selectedDish?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            addDishIngredientMutation.mutate(dishIngredientFormData);
          }} className="space-y-4">
            <div>
              <Label>Ingrediente</Label>
              <Select
                value={dishIngredientFormData.ingredient_id}
                onValueChange={(value) => setDishIngredientFormData(prev => ({ ...prev, ingredient_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ingrediente" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map(ing => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={dishIngredientFormData.quantity}
                onChange={(e) => setDishIngredientFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDishIngredientDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
