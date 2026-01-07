import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Package, ShoppingCart, Users, Receipt, 
  Loader2, Eye, Database
} from 'lucide-react';

const ENTITY_TYPES = [
  { key: 'Dish', label: 'Pratos', icon: Package },
  { key: 'Order', label: 'Pedidos', icon: ShoppingCart },
  { key: 'Customer', label: 'Clientes', icon: Users },
  { key: 'Caixa', label: 'Caixas', icon: Receipt },
];

export default function SubscriberDataFilter({ subscriber, onBack }) {
  const [selectedEntity, setSelectedEntity] = useState('Dish');

  // Buscar estatísticas do assinante
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['subscriberStats', subscriber.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSubscriberStats', {
        subscriber_id: subscriber.id
      });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    enabled: !!subscriber.id
  });

  // Buscar dados da entidade selecionada
  const { data: entityData, isLoading: entityLoading } = useQuery({
    queryKey: ['subscriberData', subscriber.id, selectedEntity],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSubscriberData', {
        subscriber_id: subscriber.id,
        entity: selectedEntity
      });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    enabled: !!subscriber.id && !!selectedEntity
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const stats = statsData?.stats || {};
  const items = entityData?.items || [];
  const subscriberInfo = statsData?.subscriber || subscriber;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{subscriberInfo.name || subscriberInfo.email}</h2>
          <p className="text-gray-500">{subscriberInfo.email}</p>
        </div>
        <Badge className={
          subscriberInfo.status === 'active' ? 'bg-green-500' : 
          subscriberInfo.status === 'expired' ? 'bg-red-500' : 
          'bg-yellow-500'
        }>
          {subscriberInfo.status}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pratos</CardTitle>
            <Package className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.Dish || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.Order || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.Customer || stats.customers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Database className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.total_items || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Entity Tabs */}
      <Tabs value={selectedEntity} onValueChange={setSelectedEntity}>
        <TabsList className="grid w-full grid-cols-4">
          {ENTITY_TYPES.map(entity => {
            const Icon = entity.icon;
            return (
              <TabsTrigger key={entity.key} value={entity.key} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {entity.label}
                {stats[entity.key] > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {stats[entity.key]}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ENTITY_TYPES.map(entity => (
          <TabsContent key={entity.key} value={entity.key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{entity.label} do Assinante</span>
                  <Badge variant="outline">{items.length} {items.length === 1 ? 'item' : 'itens'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <entity.icon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum {entity.label.toLowerCase()} encontrado para este assinante</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.slice(0, 10).map((item, index) => (
                      <div 
                        key={item.id || index} 
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.name || item.title || item.email || `Item ${index + 1}`}
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                            )}
                            {item.price && (
                              <p className="text-sm font-medium text-green-600 mt-1">
                                R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}
                              </p>
                            )}
                          </div>
                          {item.status && (
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        {item.created_date && (
                          <p className="text-xs text-gray-400 mt-2">
                            Criado em: {new Date(item.created_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    ))}
                    {items.length > 10 && (
                      <p className="text-sm text-gray-500 text-center mt-4">
                        Mostrando 10 de {items.length} itens
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
