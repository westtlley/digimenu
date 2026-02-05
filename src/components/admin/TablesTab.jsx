import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Edit, Trash2, QrCode, Bell, Download, Receipt, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/components/theme/ThemeProvider';

const TABLE_STATUSES = {
  available: { label: 'Disponível', color: 'bg-green-500' },
  occupied: { label: 'Ocupada', color: 'bg-yellow-500' },
  reserved: { label: 'Reservada', color: 'bg-blue-500' },
  cleaning: { label: 'Limpeza', color: 'bg-gray-500' }
};

export default function TablesTab() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableFormData, setTableFormData] = useState({
    table_number: '',
    capacity: 4,
    status: 'available',
    qr_code: '',
    location: ''
  });
  const [qrCodeTable, setQrCodeTable] = useState(null);
  const [comandasModalOpen, setComandasModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [tableToReserve, setTableToReserve] = useState(null);
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_phone: '',
    reservation_date: '',
    reservation_time: '',
    guests: 1
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.Table.list(),
  });

  // Buscar comandas abertas
  const { data: comandas = [] } = useQuery({
    queryKey: ['Comanda'],
    queryFn: () => base44.entities.Comanda.list('-created_at', { status: 'open' }),
  });

  // Slug do estabelecimento (master: user.slug; em contexto /s/:slug: currentSlug)
  const { data: authUser } = useQuery({
    queryKey: ['authMe'],
    queryFn: () => base44.auth.me(),
  });
  const effectiveSlug = authUser?.slug || (typeof localStorage !== 'undefined' ? localStorage.getItem('currentSlug') : '') || '';

  const createTableMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.qr_code) {
        const baseUrl = window.location.origin;
        data.qr_code = `${baseUrl}/mesa/${data.table_number}${effectiveSlug ? `?slug=${effectiveSlug}` : ''}`;
      }
      return base44.entities.Table.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tables']);
      toast.success('Mesa criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar mesa: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Table.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tables']);
      toast.success('Mesa atualizada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar mesa: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.Table.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tables']);
      toast.success('Mesa deletada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao deletar mesa: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const resetForm = () => {
    setTableFormData({
      table_number: '',
      capacity: 4,
      status: 'available',
      qr_code: '',
      location: ''
    });
    setEditingTable(null);
  };

  const handleEdit = (table) => {
    setEditingTable(table);
    setTableFormData({
      table_number: table.table_number || '',
      capacity: table.capacity || 4,
      status: table.status || 'available',
      qr_code: table.qr_code || '',
      location: table.location || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTable) {
      updateTableMutation.mutate({ id: editingTable.id, data: tableFormData });
    } else {
      createTableMutation.mutate(tableFormData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta mesa?')) {
      deleteTableMutation.mutate(id);
    }
  };

  const generateQRCode = (table) => {
    setQrCodeTable(table);
  };

  const downloadQRCode = (table) => {
    const canvas = document.getElementById(`qr-${table.id}`);
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-mesa-${table.table_number}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleViewComandas = (table) => {
    setSelectedTable(table);
    setComandasModalOpen(true);
  };

  const getComandasByTable = (table) => {
    return comandas.filter(c => 
      (c.table_id && String(c.table_id) === String(table.id)) ||
      (c.table_number && String(c.table_number) === String(table.table_number)) ||
      (c.table_name && String(c.table_name) === String(table.table_number))
    );
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="space-y-6">
      {!effectiveSlug && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Dica:</strong> Para o QR Code abrir o cardápio correto, defina o <strong>slug do estabelecimento</strong> (ex.: link do cardápio /s/meu-restaurante) em Loja ou no seu perfil. Assim o link da mesa ficará: /mesa/N?slug=meu-restaurante
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Mesas</h2>
          <p className="text-gray-500">Gerencie mesas, QR Codes e status</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Mesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTable ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Número da Mesa *</Label>
                <Input
                  value={tableFormData.table_number}
                  onChange={(e) => setTableFormData(prev => ({ ...prev, table_number: e.target.value }))}
                  placeholder="Ex: 1, 2, 3..."
                  required
                />
              </div>
              <div>
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  value={tableFormData.capacity}
                  onChange={(e) => setTableFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 4 }))}
                  min="1"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={tableFormData.status}
                  onValueChange={(value) => setTableFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TABLE_STATUSES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localização (opcional)</Label>
                <Input
                  value={tableFormData.location}
                  onChange={(e) => setTableFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Salão principal, Varanda..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createTableMutation.isLoading || updateTableMutation.isLoading}>
                  {editingTable ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const statusInfo = TABLE_STATUSES[table.status] || TABLE_STATUSES.available;
          return (
            <Card key={table.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">Mesa {table.table_number}</CardTitle>
                  <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div><strong>Capacidade:</strong> {table.capacity} pessoas</div>
                  {table.location && <div><strong>Localização:</strong> {table.location}</div>}
                  {table.status === 'reserved' && table.reservation_date && (
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mt-2">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">Reservada</span>
                      </div>
                      {table.reservation_customer_name && (
                        <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">Cliente: {table.reservation_customer_name}</p>
                      )}
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {new Date(table.reservation_date).toLocaleDateString('pt-BR')} às {table.reservation_time || '--:--'}
                      </p>
                      {table.reservation_guests && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">Convidados: {table.reservation_guests}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(table)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateQRCode(table)}
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    QR Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewComandas(table)}
                  >
                    <Receipt className="w-4 h-4 mr-1" />
                    Comandas
                  </Button>
                  {table.status !== 'reserved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReserve(table)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Reservar
                    </Button>
                  )}
                  {table.status === 'reserved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('Cancelar reserva desta mesa?')) {
                          cancelReservationMutation.mutate(table);
                        }
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(table.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {qrCodeTable && (
        <Dialog open={!!qrCodeTable} onOpenChange={() => setQrCodeTable(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code - Mesa {qrCodeTable.table_number}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={qrCodeTable.qr_code || `${window.location.origin}/mesa/${qrCodeTable.table_number}${effectiveSlug ? `?slug=${effectiveSlug}` : ''}`}
                  size={200}
                  level="H"
                />
              </div>
              <Button onClick={() => downloadQRCode(qrCodeTable)}>
                <Download className="w-4 h-4 mr-2" />
                Baixar QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Comandas por Mesa */}
      <Dialog open={comandasModalOpen} onOpenChange={setComandasModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comandas - Mesa {selectedTable?.table_number}</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Status:</strong> {TABLE_STATUSES[selectedTable.status]?.label || selectedTable.status}
                  </div>
                  <div>
                    <strong>Capacidade:</strong> {selectedTable.capacity} pessoas
                  </div>
                  {selectedTable.location && (
                    <div className="col-span-2">
                      <strong>Localização:</strong> {selectedTable.location}
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const tableComandas = getComandasByTable(selectedTable);
                const totalValue = tableComandas.reduce((sum, c) => sum + (c.total || 0), 0);
                const totalItems = tableComandas.reduce((sum, c) => 
                  sum + (Array.isArray(c.items) ? c.items.length : 0), 0
                );

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Comandas Abertas</p>
                        <p className="text-lg font-bold">{tableComandas.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total de Itens</p>
                        <p className="text-lg font-bold">{totalItems}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Valor Total</p>
                        <p className="text-lg font-bold">{formatCurrency(totalValue)}</p>
                      </div>
                    </div>

                    {tableComandas.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma comanda aberta nesta mesa</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tableComandas.map((comanda) => (
                          <Card key={comanda.id} className="border">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Receipt className="w-4 h-4" />
                                  {comanda.code || `#${comanda.id}`}
                                </CardTitle>
                                <Badge className="bg-green-600">Aberta</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {comanda.customer_name && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Cliente: {comanda.customer_name}
                                </p>
                              )}
                              <div className="text-sm">
                                <p className="font-medium">Itens ({Array.isArray(comanda.items) ? comanda.items.length : 0}):</p>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-1">
                                  {Array.isArray(comanda.items) && comanda.items.slice(0, 3).map((item, idx) => (
                                    <li key={idx} className="text-xs">
                                      {item.quantity}x {item.dish_name || 'Item'} - {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                                    </li>
                                  ))}
                                  {comanda.items.length > 3 && (
                                    <li className="text-xs text-gray-500">... e mais {comanda.items.length - 3} item(ns)</li>
                                  )}
                                </ul>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total:</span>
                                <span className="text-lg font-bold">{formatCurrency(comanda.total || 0)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Reserva */}
      <Dialog open={reservationModalOpen} onOpenChange={setReservationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reservar Mesa {tableToReserve?.table_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!reservationData.customer_name || !reservationData.reservation_date || !reservationData.reservation_time) {
              toast.error('Preencha todos os campos obrigatórios');
              return;
            }
            createReservationMutation.mutate(reservationData);
          }} className="space-y-4">
            <div>
              <Label>Nome do Cliente *</Label>
              <Input
                value={reservationData.customer_name}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={reservationData.customer_phone}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>Data da Reserva *</Label>
              <Input
                type="date"
                value={reservationData.reservation_date}
                onChange={(e) => setReservationData(prev => ({ ...prev, reservation_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <Label>Horário *</Label>
              <Input
                type="time"
                value={reservationData.reservation_time}
                onChange={(e) => setReservationData(prev => ({ ...prev, reservation_time: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Número de Convidados</Label>
              <Input
                type="number"
                min="1"
                max={tableToReserve?.capacity || 10}
                value={reservationData.guests}
                onChange={(e) => setReservationData(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setReservationModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createReservationMutation.isPending}>
                {createReservationMutation.isPending ? 'Salvando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
