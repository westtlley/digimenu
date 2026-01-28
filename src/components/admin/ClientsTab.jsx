import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, Search, Phone, Mail, DollarSign, ShoppingCart, 
  Clock, Ban, CheckCircle, MoreVertical, TrendingUp, Filter,
  Eye, Package, Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import moment from 'moment';
import ClientsSkeleton from '../skeletons/ClientsSkeleton';

export default function ClientsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, spending, frequency
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['clientOrders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  // Agrupar pedidos por cliente
  const clientsData = useMemo(() => {
    const clientsMap = {};

    orders.forEach(order => {
      const email = order.customer_email || order.created_by || 'sem-email';
      const name = order.customer_name || 'Cliente';
      const phone = order.customer_phone || '';

      if (!clientsMap[email]) {
        clientsMap[email] = {
          email,
          name,
          phone,
          orders: [],
          totalSpent: 0,
          lastOrderDate: null,
        };
      }

      clientsMap[email].orders.push(order);
      clientsMap[email].totalSpent += order.total || 0;
      
      const orderDate = moment(order.created_date);
      if (!clientsMap[email].lastOrderDate || orderDate.isAfter(clientsMap[email].lastOrderDate)) {
        clientsMap[email].lastOrderDate = orderDate;
      }
    });

    return Object.values(clientsMap);
  }, [orders]);

  // Filtrar e ordenar
  const filteredClients = useMemo(() => {
    let result = clientsData.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
    );

    if (sortBy === 'spending') {
      result.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === 'frequency') {
      result.sort((a, b) => b.orders.length - a.orders.length);
    } else {
      result.sort((a, b) => {
        if (!a.lastOrderDate) return 1;
        if (!b.lastOrderDate) return -1;
        return b.lastOrderDate.diff(a.lastOrderDate);
      });
    }

    return result;
  }, [clientsData, searchTerm, sortBy]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const totalClients = clientsData.length;
  const totalRevenue = clientsData.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSpending = totalClients > 0 ? totalRevenue / totalClients : 0;

  if (isLoading) {
    return <ClientsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Clientes</h2>
        <p className="text-gray-600">Gerencie seus clientes e veja estatísticas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalClients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgSpending)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais Recentes</SelectItem>
            <SelectItem value="spending">Maior Gasto</SelectItem>
            <SelectItem value="frequency">Mais Pedidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum cliente encontrado</h3>
              <p className="text-gray-400">Os clientes aparecerão aqui após o primeiro pedido</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.email} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">{client.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.email !== 'sem-email' && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">{client.orders.length} pedidos</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-green-600">{formatCurrency(client.totalSpent)}</span>
                      </div>
                      {client.lastOrderDate && (
                        <div className="flex items-center gap-1 justify-end mt-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {client.lastOrderDate.fromNow()}
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedClient(client);
                          setShowDetailModal(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://wa.me/55${client.phone?.replace(/\D/g, '')}`, '_blank')}>
                          <Phone className="w-4 h-4 mr-2" />
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Ban className="w-4 h-4 mr-2" />
                          Bloquear Cliente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="sm:hidden mt-3 pt-3 border-t flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold">{client.orders.length} pedidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">{formatCurrency(client.totalSpent)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Detalhes do Cliente */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 py-4">
              {/* Informações do Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedClient.name}</h3>
                        {selectedClient.email !== 'sem-email' && (
                          <p className="text-sm text-gray-600">{selectedClient.email}</p>
                        )}
                      </div>
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{selectedClient.phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Gasto</span>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(selectedClient.totalSpent)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pedidos</span>
                        <span className="text-xl font-semibold">{selectedClient.orders.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ticket Médio</span>
                        <span className="text-lg font-semibold">
                          {formatCurrency(selectedClient.orders.length > 0 ? selectedClient.totalSpent / selectedClient.orders.length : 0)}
                        </span>
                      </div>
                      {selectedClient.lastOrderDate && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm text-gray-600">Último Pedido</span>
                          <span className="text-sm font-medium">{selectedClient.lastOrderDate.fromNow()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Histórico de Pedidos */}
              <div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Histórico de Pedidos ({selectedClient.orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedClient.orders.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Nenhum pedido registrado</p>
                    ) : (
                      selectedClient.orders
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map((order) => (
                          <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="font-mono">
                                    #{order.order_code || order.id?.slice(-6)}
                                  </Badge>
                                  <Badge className={order.status === 'delivered' ? 'bg-green-500' : order.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'}>
                                    {order.status === 'delivered' ? 'Entregue' : order.status === 'cancelled' ? 'Cancelado' : order.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {moment(order.created_date).format('DD/MM/YYYY HH:mm')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">{formatCurrency(order.total)}</p>
                                <p className="text-xs text-gray-500 capitalize">{order.payment_method?.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Itens:</span> {(order.items || []).length}
                              </p>
                              {order.delivery_method && (
                                <p>
                                  <span className="font-medium">Tipo:</span> {order.delivery_method === 'delivery' ? 'Entrega 🚴' : 'Retirada 🏪'}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Fechar
            </Button>
            {selectedClient?.phone && (
              <Button onClick={() => window.open(`https://wa.me/55${selectedClient.phone.replace(/\D/g, '')}`, '_blank')}>
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}