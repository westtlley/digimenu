import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, Plus, Pencil, Trash2, Truck, ChefHat, CreditCard, Receipt, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_LABELS = { entregador: 'Entregador', cozinha: 'Cozinha', pdv: 'PDV', garcom: 'Garçom' };
const ROLE_ICONS = { entregador: Truck, cozinha: ChefHat, pdv: CreditCard, garcom: Receipt };

export default function ColaboradoresTab() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'pdv' });
  const [showPass, setShowPass] = useState(false);
  const queryClient = useQueryClient();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.get('/colaboradores').then(r => (Array.isArray(r) ? r : r.data || [])),
  });

  const createMu = useMutation({
    mutationFn: (body) => base44.post('/colaboradores', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'pdv' });
      setEditing(null);
      toast.success('Colaborador adicionado.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao criar'),
  });

  const updateMu = useMutation({
    mutationFn: ({ id, ...body }) => {
      const b = { name: body.name, role: body.role };
      if (body.newPassword) b.newPassword = body.newPassword;
      return base44.patch(`/colaboradores/${id}`, b);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'pdv' });
      setEditing(null);
      toast.success('Colaborador atualizado.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar'),
  });

  const deleteMu = useMutation({
    mutationFn: (id) => base44.delete(`/colaboradores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Colaborador removido.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao remover'),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'pdv' });
    setShowPass(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.full_name || '', email: row.email || '', password: '', role: (row.profile_role || 'pdv').toLowerCase() });
    setShowPass(false);
    setShowModal(true);
  };

  const handleCloseModal = (open) => {
    setShowModal(open);
    if (!open) {
      setEditing(null);
      setForm({ name: '', email: '', password: '', role: 'pdv' });
      setShowPass(false);
    }
  };

  const submit = () => {
    if (editing) {
      const up = { name: form.name, role: form.role };
      if (form.password) up.newPassword = form.password;
      updateMu.mutate({ id: editing.id, ...up });
    } else {
      if (!form.email?.trim()) { toast.error('Email é obrigatório'); return; }
      if (!form.password || form.password.length < 6) { toast.error('Senha com no mínimo 6 caracteres'); return; }
      createMu.mutate({ name: form.name, email: form.email.trim(), password: form.password, role: form.role });
    }
  };

  const remove = (id) => {
    if (!confirm('Remover este colaborador? Ele perderá o acesso.')) return;
    deleteMu.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-orange-500" />
            Colaboradores
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Perfis com acesso limitado: Entregador, Cozinha, PDV e Garçom. Apenas planos Pro e Ultra.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum colaborador cadastrado.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Adicione perfis para funcionários acessarem Entregador, Cozinha, PDV ou Garçom.</p>
          <Button onClick={openAdd} className="mt-4 bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar colaborador
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((row) => {
            const Icon = ROLE_ICONS[row.profile_role] || UserCog;
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{row.full_name || row.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{row.email}</p>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      {ROLE_LABELS[row.profile_role] || row.profile_role}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => remove(row.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar colaborador' : 'Adicionar colaborador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do colaborador"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entregador">Entregador</SelectItem>
                  <SelectItem value="cozinha">Cozinha</SelectItem>
                  <SelectItem value="pdv">PDV</SelectItem>
                  <SelectItem value="garcom">Garçom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{editing ? 'Nova senha (deixe em branco para não alterar)' : 'Senha (mín. 6)'}</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? '••••••••' : 'Senha de acesso'}
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowPass((s) => !s)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={createMu.isPending || updateMu.isPending} className="bg-orange-500 hover:bg-orange-600">
              {(createMu.isPending || updateMu.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
