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
import { Plus, Edit, Trash2, QrCode, Bell, Download } from 'lucide-react';
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

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.Table.list(),
  });

  const createTableMutation = useMutation({
    mutationFn: async (data) => {
      // Gerar QR Code único se não fornecido
      if (!data.qr_code) {
        const baseUrl = window.location.origin;
        const slug = localStorage.getItem('currentSlug') || '';
        data.qr_code = `${baseUrl}/mesa/${data.table_number}${slug ? `?slug=${slug}` : ''}`;
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

  return (
    <div className="space-y-6">
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
                  value={qrCodeTable.qr_code || `${window.location.origin}/mesa/${qrCodeTable.table_number}`}
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
    </div>
  );
}
