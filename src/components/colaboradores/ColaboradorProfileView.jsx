import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { 
  User, Phone, Mail, MapPin, Calendar, 
  Truck, Receipt, ChefHat, CreditCard,
  CheckCircle, XCircle, Clock, TrendingUp,
  Package, ShoppingBag, UtensilsCrossed,
  Loader2, Edit, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ROLE_LABELS = { entregador: 'Entregador', cozinha: 'Cozinha', pdv: 'PDV', garcom: 'Garçom' };
const ROLE_ICONS = { entregador: Truck, cozinha: ChefHat, pdv: CreditCard, garcom: Receipt };

/**
 * Componente para visualizar perfil de colaborador (assinante)
 * Mostra dados pessoais, foto e estatísticas
 */
export default function ColaboradorProfileView({ colaboradorEmail, onClose, onEdit }) {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Buscar dados do colaborador
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.get('/colaboradores').then(r => (Array.isArray(r) ? r : r.data || [])),
  });

  const colaborador = colaboradores.find(c => 
    (c.email || '').toLowerCase().trim() === (colaboradorEmail || '').toLowerCase().trim()
  );

  // Buscar estatísticas
  useEffect(() => {
    if (!colaboradorEmail) return;
    
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        // Buscar estatísticas do colaborador
        const [orders, comandas] = await Promise.all([
          base44.entities.Order.list('-created_date').catch(() => []),
          base44.entities.Comanda.list('-created_at').catch(() => [])
        ]);

        const userEmail = colaboradorEmail.toLowerCase().trim();
        
        // Estatísticas de entregador
        const entregadorOrders = Array.isArray(orders) ? orders.filter(o => 
          o.entregador_email?.toLowerCase().trim() === userEmail ||
          o.entregador_id
        ) : [];
        
        const entregasAceitas = entregadorOrders.filter(o => 
          o.status === 'delivered' || o.status === 'out_for_delivery'
        ).length;
        
        const entregasCanceladas = entregadorOrders.filter(o => 
          o.status === 'cancelled' && o.cancelled_by?.toLowerCase().trim() === userEmail
        ).length;
        
        const entregasHoje = entregadorOrders.filter(o => {
          const today = new Date().toDateString();
          const orderDate = o.created_date || o.created_at;
          return orderDate && new Date(orderDate).toDateString() === today;
        }).length;

        // Estatísticas de garçom
        const garcomComandas = Array.isArray(comandas) ? comandas.filter(c => 
          c.created_by?.toLowerCase().trim() === userEmail ||
          c.closed_by?.toLowerCase().trim() === userEmail
        ) : [];
        
        const comandasCriadas = garcomComandas.filter(c => 
          c.created_by?.toLowerCase().trim() === userEmail
        ).length;
        
        const comandasEditadas = garcomComandas.filter(c => {
          const history = Array.isArray(c.history) ? c.history : [];
          return history.some(h => 
            h.by?.toLowerCase().trim() === userEmail && 
            h.action === 'updated'
          );
        }).length;
        
        const comandasFinalizadas = garcomComandas.filter(c => 
          c.status === 'closed' && c.closed_by?.toLowerCase().trim() === userEmail
        ).length;

        // Mesas gerenciadas
        const mesasGerenciadas = new Set(
          garcomComandas
            .filter(c => c.table_id || c.table_name)
            .map(c => c.table_id || c.table_name)
        ).size;

        setStats({
          entregador: {
            totalEntregas: entregadorOrders.length,
            entregasAceitas,
            entregasCanceladas,
            entregasHoje,
            taxaSucesso: entregadorOrders.length > 0 
              ? Math.round((entregasAceitas / entregadorOrders.length) * 100) 
              : 0
          },
          garcom: {
            totalComandas: garcomComandas.length,
            comandasCriadas,
            comandasEditadas,
            comandasFinalizadas,
            mesasGerenciadas
          }
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [colaboradorEmail]);

  if (!colaborador) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const roles = colaborador.profile_roles || [colaborador.profile_role].filter(Boolean);
  const userPhoto = colaborador.photo || colaborador.google_photo;

  return (
    <div className="space-y-6">
      {/* Header com foto e dados básicos */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-32 h-32 border-4 border-orange-500">
              <AvatarImage src={userPhoto} alt={colaborador.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-4xl">
                {colaborador.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {colaborador.full_name || colaborador.email}
              </h2>
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-4">
                {roles.map(role => {
                  const Icon = ROLE_ICONS[role] || User;
                  return (
                    <Badge key={role} variant="secondary" className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  );
                })}
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Mail className="w-4 h-4" />
                  <span>{colaborador.email}</span>
                </div>
                {colaborador.phone && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Phone className="w-4 h-4" />
                    <span>{colaborador.phone}</span>
                  </div>
                )}
                {colaborador.address && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <MapPin className="w-4 h-4" />
                    <span>{colaborador.address}{colaborador.city ? `, ${colaborador.city}` : ''}</span>
                  </div>
                )}
                {colaborador.created_at && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Membro desde {format(new Date(colaborador.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {onEdit && (
              <Button onClick={onEdit} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {loadingStats ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 mt-2">Carregando estatísticas...</p>
          </CardContent>
        </Card>
      ) : stats && (
        <Tabs defaultValue={roles.includes('entregador') ? 'entregador' : roles[0] || 'geral'}>
          <TabsList className="grid w-full grid-cols-3">
            {roles.includes('entregador') && (
              <TabsTrigger value="entregador">Entregador</TabsTrigger>
            )}
            {roles.includes('garcom') && (
              <TabsTrigger value="garcom">Garçom</TabsTrigger>
            )}
            <TabsTrigger value="geral">Geral</TabsTrigger>
          </TabsList>

          {roles.includes('entregador') && (
            <TabsContent value="entregador" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.entregador.totalEntregas}</div>
                    <div className="text-xs text-gray-500">Total de Entregas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.entregador.entregasAceitas}</div>
                    <div className="text-xs text-gray-500">Aceitas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.entregador.entregasCanceladas}</div>
                    <div className="text-xs text-gray-500">Canceladas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.entregador.taxaSucesso}%</div>
                    <div className="text-xs text-gray-500">Taxa de Sucesso</div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entregas de Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {stats.entregador.entregasHoje}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {roles.includes('garcom') && (
            <TabsContent value="garcom" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Receipt className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.garcom.totalComandas}</div>
                    <div className="text-xs text-gray-500">Total de Comandas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <UtensilsCrossed className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.garcom.comandasCriadas}</div>
                    <div className="text-xs text-gray-500">Criadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Edit className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.garcom.comandasEditadas}</div>
                    <div className="text-xs text-gray-500">Editadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.garcom.comandasFinalizadas}</div>
                    <div className="text-xs text-gray-500">Finalizadas</div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mesas Gerenciadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-indigo-600">
                    {stats.garcom.mesasGerenciadas}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="geral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="font-medium">{colaborador.email}</span>
                </div>
                {colaborador.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Telefone:</span>
                    <span className="font-medium">{colaborador.phone}</span>
                  </div>
                )}
                {colaborador.document && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">CPF/CNPJ:</span>
                    <span className="font-medium">{colaborador.document}</span>
                  </div>
                )}
                {colaborador.birth_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Data de Nascimento:</span>
                    <span className="font-medium">
                      {format(new Date(colaborador.birth_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {colaborador.address && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-500">Endereço:</span>
                    <span className="font-medium text-right max-w-xs">
                      {colaborador.address}
                      {colaborador.city && `, ${colaborador.city}`}
                      {colaborador.state && ` - ${colaborador.state}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
