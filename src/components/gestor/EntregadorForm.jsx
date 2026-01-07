import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Phone, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function EntregadorForm() {
  const [showModal, setShowModal] = useState(false);
  const [editingEntregador, setEditingEntregador] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const queryClient = useQueryClient();

  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores'],
    queryFn: () => base44.entities.Entregador.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Entregador.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const entregador = entregadores.find(e => e.id === id);
      const updateData = { ...entregador, ...data };
      return await base44.entities.Entregador.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Entregador.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    },
  });

  const openModal = (entregador = null) => {
    if (entregador) {
      setEditingEntregador(entregador);
      setFormData({
        name: entregador.name || '',
        phone: entregador.phone || '',
        email: entregador.email || '',
      });
    } else {
      setEditingEntregador(null);
      setFormData({ name: '', phone: '', email: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEntregador(null);
    setFormData({ name: '', phone: '', email: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      status: editingEntregador?.status || 'offline',
      total_deliveries: editingEntregador?.total_deliveries || 0,
    };

    if (editingEntregador) {
      updateMutation.mutate({ id: editingEntregador.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gerenciar Entregadores</h2>
        <Button onClick={() => openModal()} className="bg-red-500 hover:bg-red-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Entregador
        </Button>
      </div>

      <div className="grid gap-4">
        {entregadores.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum entregador cadastrado</p>
            <Button onClick={() => openModal()} className="mt-4 bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Entregador
            </Button>
          </div>
        ) : (
          entregadores.map((entregador) => (
            <div key={entregador.id} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    entregador.status === 'available' ? 'bg-green-100' : 
                    entregador.status === 'busy' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <User className={`w-6 h-6 ${
                      entregador.status === 'available' ? 'text-green-600' : 
                      entregador.status === 'busy' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{entregador.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4" />
                      <span>{entregador.phone}</span>
                    </div>
                    {entregador.email && (
                      <div className="text-sm text-gray-400">{entregador.email}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={
                    entregador.status === 'available' ? 'bg-green-500' : 
                    entregador.status === 'busy' ? 'bg-blue-500' : 'bg-gray-500'
                  }>
                    {entregador.status === 'available' ? 'Disponível' : 
                     entregador.status === 'busy' ? 'Em entrega' : 'Offline'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openModal(entregador)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Excluir ${entregador.name}?`)) {
                        deleteMutation.mutate(entregador.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {entregador.total_deliveries > 0 && (
                <div className="mt-3 text-sm text-gray-500">
                  Total de entregas: {entregador.total_deliveries}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntregador ? 'Editar Entregador' : 'Novo Entregador'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-red-500 hover:bg-red-600">
                {editingEntregador ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}