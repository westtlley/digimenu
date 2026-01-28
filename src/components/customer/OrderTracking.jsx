import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  ChefHat, 
  Package, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Receipt,
  Phone,
  MapPin,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Aguardando confirmação'
  },
  confirmed: {
    label: 'Confirmado',
    icon: CheckCircle2,
    color: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Pedido confirmado'
  },
  preparing: {
    label: 'Em Preparo',
    icon: ChefHat,
    color: 'bg-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Sendo preparado'
  },
  ready: {
    label: 'Pronto',
    icon: Package,
    color: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Pronto para retirada/entrega'
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle2,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Pedido concluído'
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Pedido cancelado'
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function OrderTracking({ userEmail, showInput = true }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchEmail, setSearchEmail] = useState(userEmail || '');
  const [activeSearch, setActiveSearch] = useState(!!userEmail);

  // Atualizar searchEmail quando userEmail mudar
  React.useEffect(() => {
    if (userEmail && userEmail !== searchEmail) {
      setSearchEmail(userEmail);
      setActiveSearch(true);
    }
  }, [userEmail]);

  // Buscar pedidos por email ou telefone
  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['customerOrders', searchEmail, searchPhone],
    queryFn: async () => {
      if (!searchEmail && !searchPhone) return [];
      
      try {
        console.log('🔍 Buscando pedidos:', { searchEmail, searchPhone });
        
        // Buscar todos os pedidos e filtrar
        const allOrdersPromise = base44.entities.Order.list('-created_date').catch(err => {
          console.error('Erro ao buscar Orders:', err);
          return [];
        });
        
        const allComandasPromise = base44.entities.Comanda.list('-created_at').catch(err => {
          console.error('Erro ao buscar Comandas:', err);
          return [];
        });

        const [allOrders, allComandas] = await Promise.all([allOrdersPromise, allComandasPromise]);
        
        console.log('📦 Orders encontrados:', allOrders?.length || 0);
        console.log('📋 Comandas encontrados:', allComandas?.length || 0);

        // Filtrar por email ou telefone
        const filteredOrders = (Array.isArray(allOrders) ? allOrders : [])
          .filter(o => 
            (searchEmail && (o.customer_email === searchEmail || o.created_by === searchEmail)) ||
            (searchPhone && o.customer_phone && o.customer_phone.replace(/\D/g, '') === searchPhone.replace(/\D/g, ''))
          )
          .map(o => ({ ...o, type: 'order' }));

        const filteredComandas = (Array.isArray(allComandas) ? allComandas : [])
          .filter(c => 
            (searchEmail && c.customer_email === searchEmail) ||
            (searchPhone && c.customer_phone && c.customer_phone.replace(/\D/g, '') === searchPhone.replace(/\D/g, ''))
          )
          .map(c => ({ ...c, type: 'comanda' }));

        // Combinar e ordenar por data
        const allResults = [...filteredOrders, ...filteredComandas]
          .sort((a, b) => {
            const dateA = new Date(a.created_at || a.created_date || 0);
            const dateB = new Date(b.created_at || b.created_date || 0);
            return dateB - dateA;
          });

        console.log('✅ Total de pedidos encontrados:', allResults.length);
        return allResults;
      } catch (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        return [];
      }
    },
    enabled: activeSearch && (!!searchEmail || !!searchPhone),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const handleSearch = () => {
    if (!searchEmail && !searchPhone) {
      return;
    }
    setActiveSearch(true);
  };

  const StatusIcon = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    );
  };

  const StatusTimeline = ({ status }) => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
    const currentIndex = statusOrder.indexOf(status);
    const isCancelled = status === 'cancelled';

    if (isCancelled) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${STATUS_CONFIG.cancelled.bgColor} ${STATUS_CONFIG.cancelled.borderColor} border-2`}>
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-600 dark:text-red-400">Pedido Cancelado</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between px-4 py-6">
        {statusOrder.map((s, index) => {
          const config = STATUS_CONFIG[s];
          const Icon = config.icon;
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: isCurrent ? 1.1 : 1, opacity: isActive ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  className={`w-10 h-10 rounded-full ${isActive ? config.color : 'bg-gray-300 dark:bg-gray-700'} flex items-center justify-center shadow-md`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                </motion.div>
                <span className={`text-xs font-medium ${isActive ? config.textColor : 'text-gray-400 dark:text-gray-600'} text-center max-w-[60px]`}>
                  {config.label}
                </span>
              </div>
              {index < statusOrder.length - 1 && (
                <div className="flex-1 h-1 mx-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: index < currentIndex ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                    className={`h-full ${config.color}`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {showInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              Acompanhar Pedido
            </CardTitle>
            <CardDescription>
              Digite seu email ou telefone para acompanhar seus pedidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  maxLength={11}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSearch} 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={!searchEmail && !searchPhone}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Buscar Pedidos
              </Button>
              {activeSearch && (
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Buscando pedidos...</p>
          </div>
        </div>
      )}

      {/* No Orders */}
      {!isLoading && activeSearch && orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Não encontramos pedidos com os dados fornecidos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <AnimatePresence>
        {orders.map((order, index) => {
          const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const isComanda = order.type === 'comanda';

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`border-2 ${config.borderColor}`}>
                <CardHeader className={`${config.bgColor} border-b ${config.borderColor}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={order.status} />
                      <div>
                        <CardTitle className="text-lg">
                          {isComanda ? `Comanda #${order.number || order.id}` : `Pedido #${order.id}`}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.created_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${config.textColor} ${config.borderColor} border-2`}>
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Timeline de Status */}
                  <StatusTimeline status={order.status} />

                  <Separator />

                  {/* Informações do Pedido */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {order.customer_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{order.customer_name}</span>
                      </div>
                    )}
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{order.customer_phone}</span>
                      </div>
                    )}
                    {order.delivery_address && (
                      <div className="flex items-start gap-2 text-sm sm:col-span-2">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{order.delivery_address}</span>
                      </div>
                    )}
                    {order.payment_method && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300 capitalize">
                          {order.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total:</span>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Observações */}
                  {order.notes && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{order.notes}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Items do Pedido */}
                  {order.items && order.items.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Itens do Pedido:</h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {item.quantity}x {item.name || item.dish?.name}
                                </p>
                                {item.notes && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.notes}</p>
                                )}
                              </div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300 ml-4">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Informação sobre atualização */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      O status é atualizado em tempo real pelo estabelecimento. 
                      {!isComanda && ' Você pode acompanhar seu pedido aqui.'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
