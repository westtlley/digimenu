import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Trash2, Shield, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * LGPDCompliance - Conformidade com LGPD
 * Funcionalidades:
 * - Cliente pode baixar seus dados
 * - Direito ao esquecimento (deletar conta)
 * - Exportar dados em JSON
 * - Consentimentos
 */
export default function LGPDCompliance() {
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  // Exportar dados do cliente
  const exportCustomerDataMutation = useMutation({
    mutationFn: async (customerId) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Cliente não encontrado');

      const customerOrders = orders.filter(o => 
        o.customer_email === customer.email || 
        o.customer_phone === customer.phone
      );

      const data = {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          created_at: customer.created_at,
        },
        orders: customerOrders.map(order => ({
          id: order.id,
          order_code: order.order_code,
          total: order.total,
          status: order.status,
          created_date: order.created_date,
          items: order.items || [],
        })),
        exported_at: new Date().toISOString(),
      };

      // Criar arquivo JSON para download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dados-cliente-${customer.email || customer.id}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      toast.success('Dados exportados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao exportar dados: ' + error.message);
    }
  });

  // Deletar conta (direito ao esquecimento)
  const deleteCustomerDataMutation = useMutation({
    mutationFn: async (customerId) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Cliente não encontrado');

      // Anonimizar dados ao invés de deletar (melhor prática LGPD)
      await base44.entities.Customer.update(customerId, {
        name: '[Dados Removidos]',
        email: `removed_${Date.now()}@deleted.local`,
        phone: null,
        address: null,
        lgpd_deleted: true,
        lgpd_deleted_at: new Date().toISOString(),
      });

      // Anonimizar pedidos relacionados
      const customerOrders = orders.filter(o => 
        o.customer_email === customer.email || 
        o.customer_phone === customer.phone
      );

      for (const order of customerOrders) {
        await base44.entities.Order.update(order.id, {
          customer_name: '[Dados Removidos]',
          customer_email: `removed_${Date.now()}@deleted.local`,
          customer_phone: null,
          customer_address: null,
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['orders']);
      toast.success('Dados removidos conforme LGPD');
    },
    onError: (error) => {
      toast.error('Erro ao remover dados: ' + error.message);
    }
  });

  const handleDeleteRequest = (customerId) => {
    if (window.confirm('Tem certeza? Esta ação irá anonimizar todos os dados do cliente conforme LGPD. Esta ação não pode ser desfeita.')) {
      deleteCustomerDataMutation.mutate(customerId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Conformidade LGPD
          </h2>
          <p className="text-gray-500">Gerencie direitos de dados dos clientes</p>
        </div>
      </div>

      {/* Informações LGPD */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Direitos do Cliente (LGPD)</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✅ <strong>Acesso:</strong> Cliente pode solicitar seus dados</li>
                <li>✅ <strong>Portabilidade:</strong> Exportar dados em formato JSON</li>
                <li>✅ <strong>Esquecimento:</strong> Solicitar remoção/anonymização de dados</li>
                <li>✅ <strong>Correção:</strong> Atualizar dados incorretos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes e Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Status LGPD</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const customerOrders = orders.filter(o => 
                  o.customer_email === customer.email || 
                  o.customer_phone === customer.phone
                );
                const isDeleted = customer.lgpd_deleted;

                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      {isDeleted ? (
                        <span className="text-gray-400 italic">[Dados Removidos]</span>
                      ) : (
                        customer.name
                      )}
                    </TableCell>
                    <TableCell>
                      {isDeleted ? (
                        <span className="text-gray-400 italic">[Removido]</span>
                      ) : (
                        customer.email
                      )}
                    </TableCell>
                    <TableCell>{customer.phone || '—'}</TableCell>
                    <TableCell>{customerOrders.length}</TableCell>
                    <TableCell>
                      {isDeleted ? (
                        <Badge variant="destructive">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Removido
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!isDeleted && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportCustomerDataMutation.mutate(customer.id)}
                              disabled={exportCustomerDataMutation.isLoading}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Exportar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteRequest(customer.id)}
                              disabled={deleteCustomerDataMutation.isLoading}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remover
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dados Removidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {customers.filter(c => c.lgpd_deleted).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Exportações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {customers.filter(c => c.lgpd_exported).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
