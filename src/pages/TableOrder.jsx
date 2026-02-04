import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShoppingCart, Users, Split } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCart } from '@/components/hooks/useCart';
import DishCardWow from '@/components/menu/DishCardWow';
import CartModal from '@/components/menu/CartModal';
import CheckoutView from '@/components/menu/CheckoutView';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function TableOrder() {
  const { tableNumber } = useParams();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug') || '';
  const queryClient = useQueryClient();
  const { cart, addItem, removeItem, updateQuantity, clearCart } = useCart(slug);
  const [currentView, setCurrentView] = useState('menu');
  const [table, setTable] = useState(null);
  const [waiterCallActive, setWaiterCallActive] = useState(false);

  // Buscar mesa
  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.Table.list(),
  });

  useEffect(() => {
    const foundTable = tables.find(t => t.table_number === tableNumber);
    setTable(foundTable);
  }, [tables, tableNumber]);

  // Buscar pratos
  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes', slug],
    queryFn: () => base44.entities.Dish.list(),
  });

  // Buscar categorias
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', slug],
    queryFn: () => base44.entities.Category.list('order'),
  });

  // Chamar garçom
  const callWaiterMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.WaiterCall.create({
        table_id: table?.id,
        table_number: tableNumber,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Garçom chamado! Ele chegará em breve.');
      setWaiterCallActive(true);
      setTimeout(() => setWaiterCallActive(false), 30000); // Reset após 30s
    },
    onError: () => {
      toast.error('Erro ao chamar garçom');
    }
  });

  // Criar pedido
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      return base44.entities.Order.create({
        ...orderData,
        table_id: table?.id,
        table_number: tableNumber,
        delivery_type: 'table',
        status: 'new'
      });
    },
    onSuccess: () => {
      toast.success('Pedido realizado com sucesso!');
      clearCart();
      setCurrentView('menu');
    },
    onError: (error) => {
      toast.error('Erro ao realizar pedido: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const handleCheckout = (checkoutData) => {
    const orderData = {
      ...checkoutData,
      items: cart.map(item => ({
        dish_id: item.id,
        dish: item,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      })),
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      table_id: table?.id,
      table_number: tableNumber
    };
    createOrderMutation.mutate(orderData);
  };

  const handleCallWaiter = () => {
    callWaiterMutation.mutate();
  };

  const dishesByCategory = categories.map(cat => ({
    ...cat,
    dishes: dishes.filter(d => d.category_id === cat.id && d.is_active !== false)
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Mesa {tableNumber}</h1>
              {table && (
                <p className="text-sm text-gray-500">
                  Capacidade: {table.capacity} pessoas
                  {table.location && ` • ${table.location}`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={waiterCallActive ? "default" : "outline"}
                onClick={handleCallWaiter}
                disabled={callWaiterMutation.isLoading || waiterCallActive}
              >
                <Bell className="w-4 h-4 mr-2" />
                {waiterCallActive ? 'Garçom Chamado' : 'Chamar Garçom'}
              </Button>
              {cart.length > 0 && (
                <Button onClick={() => setCurrentView('cart')}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Carrinho ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'menu' && (
          <div className="space-y-8">
            {dishesByCategory.map(category => (
              category.dishes.length > 0 && (
                <div key={category.id}>
                  <h2 className="text-xl font-bold mb-4">{category.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.dishes.map(dish => (
                      <DishCardWow
                        key={dish.id}
                        dish={dish}
                        onAddToCart={addItem}
                      />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {currentView === 'cart' && (
          <div className="max-w-2xl mx-auto">
            <CartModal
              isOpen={true}
              onClose={() => setCurrentView('menu')}
              cart={cart}
              onRemoveItem={removeItem}
              onUpdateQuantity={updateQuantity}
              onCheckout={() => setCurrentView('checkout')}
            />
          </div>
        )}

        {currentView === 'checkout' && (
          <div className="max-w-2xl mx-auto">
            <CheckoutView
              cart={cart}
              onBack={() => setCurrentView('cart')}
              onSubmit={handleCheckout}
              store={null}
              primaryColor="#22c55e"
            />
          </div>
        )}
      </div>
    </div>
  );
}
