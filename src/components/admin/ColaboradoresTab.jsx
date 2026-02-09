import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { usePermission } from '@/components/permissions/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCog, Plus, Pencil, Trash2, Truck, ChefHat, CreditCard, Receipt, Loader2, Eye, EyeOff, UserPlus, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';
import ColaboradorProfileView from '../colaboradores/ColaboradorProfileView';
import ColaboradorProfile from '../colaboradores/ColaboradorProfile';

const ROLE_LABELS = { entregador: 'Entregador', cozinha: 'Cozinha', pdv: 'PDV', garcom: 'Garçom', gerente: 'Gerente' };
const ROLE_ICONS = { entregador: Truck, cozinha: ChefHat, pdv: CreditCard, garcom: Receipt, gerente: LayoutDashboard };
const ALL_ROLES = ['entregador', 'cozinha', 'pdv', 'garcom', 'gerente'];

/** Quando true (painel do gerente), o gerente não pode criar/atribuir perfil Gerente — apenas Entregador, Cozinha, PDV, Garçom */
const ROLES_FOR_GERENTE_PANEL = ALL_ROLES.filter((r) => r !== 'gerente');

export default function ColaboradoresTab({ isGerentePanel = false }) {
  const [showModal, setShowModal] = useState(false);
  const [showAddRolesModal, setShowAddRolesModal] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addingRolesTo, setAddingRolesTo] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', roles: ['pdv'] });
  const [addRolesForm, setAddRolesForm] = useState({ roles: [] });
  const [showPass, setShowPass] = useState(false);
  const queryClient = useQueryClient();
  const { menuContext, isMaster } = usePermission();
  const asSub = isGerentePanel ? null : (menuContext?.type === 'subscriber' ? menuContext?.value : null);
  const selectableRoles = isGerentePanel ? ROLES_FOR_GERENTE_PANEL : ALL_ROLES;

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['colaboradores', asSub],
    queryFn: () => base44.get('/colaboradores', asSub ? { as_subscriber: asSub } : {}).then(r => (Array.isArray(r) ? r : r.data || [])),
  });
  
  // Agrupar por email para mostrar múltiplos perfis
  const groupedList = React.useMemo(() => {
    const grouped = {};
    list.forEach(item => {
      const email = (item.email || '').toLowerCase().trim();
      if (!grouped[email]) {
        grouped[email] = {
          email: item.email,
          full_name: item.full_name,
          roles: item.profile_roles || [item.profile_role].filter(Boolean),
          ids: item.ids || [item.id].filter(Boolean),
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      } else {
        // Adicionar roles únicos
        const existingRoles = grouped[email].roles;
        const newRoles = item.profile_roles || [item.profile_role].filter(Boolean);
        newRoles.forEach(role => {
          if (!existingRoles.includes(role)) {
            existingRoles.push(role);
          }
        });
      }
    });
    return Object.values(grouped);
  }, [list]);

  const createMu = useMutation({
    mutationFn: (body) => {
      const url = asSub ? `/colaboradores?as_subscriber=${encodeURIComponent(asSub)}` : '/colaboradores';
      return base44.post(url, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowModal(false);
      setForm({ name: '', email: '', password: '', roles: ['pdv'] });
      setEditing(null);
      toast.success('Colaborador adicionado.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao criar'),
  });
  
  const addRolesMu = useMutation({
    mutationFn: ({ email, roles }) => {
      const q = asSub ? `?as_subscriber=${encodeURIComponent(asSub)}` : '';
      return base44.post(`/colaboradores/${encodeURIComponent(email)}/add-roles${q}`, { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowAddRolesModal(false);
      setAddingRolesTo(null);
      setAddRolesForm({ roles: [] });
      toast.success('Perfis adicionados com sucesso.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao adicionar perfis'),
  });

  const updateMu = useMutation({
    mutationFn: ({ id, ...body }) => {
      const b = { name: body.name };
      if (body.role) b.role = body.role; // Para compatibilidade
      if (body.newPassword) b.newPassword = body.newPassword;
      return base44.patch(`/colaboradores/${id}`, b);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowModal(false);
      setForm({ name: '', email: '', password: '', roles: ['pdv'] });
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
    setForm({ name: '', email: '', password: '', roles: ['pdv'] });
    setShowPass(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ 
      name: row.full_name || '', 
      email: row.email || '', 
      password: '', 
      roles: row.roles || [row.profile_role].filter(Boolean) 
    });
    setShowPass(false);
    setShowModal(true);
  };
  
  const openAddRoles = (row) => {
    setAddingRolesTo(row);
    const existingRoles = row.roles || [];
    const availableRoles = ALL_ROLES.filter(r => !existingRoles.includes(r));
    setAddRolesForm({ roles: [] });
    setShowAddRolesModal(true);
  };

  const handleCloseModal = (open) => {
    setShowModal(open);
    if (!open) {
      setEditing(null);
      setForm({ name: '', email: '', password: '', roles: ['pdv'] });
      setShowPass(false);
    }
  };
  
  const handleCloseAddRolesModal = (open) => {
    setShowAddRolesModal(open);
    if (!open) {
      setAddingRolesTo(null);
      setAddRolesForm({ roles: [] });
    }
  };

  const submit = () => {
    if (editing) {
      const up = { name: form.name };
      if (form.password) up.newPassword = form.password;
      // Para edição, manter compatibilidade com role único
      if (form.roles && form.roles.length > 0) {
        up.role = form.roles[0]; // Primeiro perfil para compatibilidade
      }
      updateMu.mutate({ id: editing.ids?.[0] || editing.id, ...up });
    } else {
      if (!form.email?.trim()) { toast.error('Email é obrigatório'); return; }
      if (!form.password || form.password.length < 6) { toast.error('Senha com no mínimo 6 caracteres'); return; }
      if (!form.roles || form.roles.length === 0) { toast.error('Selecione pelo menos um perfil'); return; }
      createMu.mutate({ name: form.name, email: form.email.trim(), password: form.password, roles: form.roles });
    }
  };
  
  const submitAddRoles = () => {
    if (!addingRolesTo) return;
    if (!addRolesForm.roles || addRolesForm.roles.length === 0) {
      toast.error('Selecione pelo menos um perfil para adicionar');
      return;
    }
    addRolesMu.mutate({ email: addingRolesTo.email, roles: addRolesForm.roles });
  };

  const remove = (id) => {
    if (!confirm('Remover este perfil? O colaborador perderá acesso a este perfil específico.')) return;
    deleteMu.mutate(id);
  };
  
  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) 
        ? f.roles.filter(r => r !== role)
        : [...f.roles, role]
    }));
  };
  
  const toggleAddRole = (role) => {
    setAddRolesForm(f => ({
      ...f,
      roles: f.roles.includes(role) 
        ? f.roles.filter(r => r !== role)
        : [...f.roles, role]
    }));
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
            Perfis com acesso limitado: Entregador, Cozinha, PDV, Garçom e Gerente. Apenas planos Pro e Ultra. Os colaboradores são sempre do estabelecimento (assinante) com seu slug — liberados pelo assinante.
          </p>
          {isMaster && !asSub && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Como master: selecione um estabelecimento em Assinantes (Ver dados completos ou editar) para listar e adicionar colaboradores desse estabelecimento.
            </p>
          )}
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
          <p className="text-gray-500 dark:text-gray-400">
            {isMaster && !asSub ? 'Selecione um estabelecimento em Assinantes para ver os colaboradores.' : 'Nenhum colaborador cadastrado.'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {isMaster && !asSub ? 'O acesso de colaboradores é liberado pelo assinante (estabelecimento) com seu slug.' : 'Adicione perfis para funcionários acessarem Entregador, Cozinha, PDV, Garçom ou Gerente.'}
          </p>
          {asSub && (
            <Button onClick={openAdd} className="mt-4 bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar colaborador
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {groupedList.map((row) => {
            return (
              <div
                key={row.email}
                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <UserCog className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{row.full_name || row.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{row.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {row.roles.map(role => {
                        const Icon = ROLE_ICONS[role] || UserCog;
                        return (
                          <span 
                            key={role}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          >
                            <Icon className="w-3 h-3" />
                            {ROLE_LABELS[role] || role}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      // Buscar dados completos do colaborador
                      try {
                        const colaboradores = await base44.get('/colaboradores');
                        const colaborador = Array.isArray(colaboradores) 
                          ? colaboradores.find(c => (c.email || '').toLowerCase().trim() === (row.email || '').toLowerCase().trim())
                          : colaboradores.data?.find(c => (c.email || '').toLowerCase().trim() === (row.email || '').toLowerCase().trim());
                        setSelectedColaborador(colaborador || row);
                        setShowProfileView(true);
                      } catch (e) {
                        setSelectedColaborador(row);
                        setShowProfileView(true);
                      }
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Perfil
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAddRoles(row)} disabled={row.roles.length >= selectableRoles.length}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Adicionar Perfis
                  </Button>
                  {!(isGerentePanel && row.roles.includes('gerente')) && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  )}
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
              <Label>Perfis (selecione um ou mais)</Label>
              <div className="space-y-2 mt-2">
                {selectableRoles.map(role => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={form.roles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <Label 
                        htmlFor={`role-${role}`}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <Icon className="w-4 h-4" />
                        {ROLE_LABELS[role]}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {form.roles.length === 0 && (
                <p className="text-sm text-red-500 mt-1">Selecione pelo menos um perfil</p>
              )}
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
      
      {/* Modal para adicionar perfis */}
      <Dialog open={showAddRolesModal} onOpenChange={handleCloseAddRolesModal}>
        <DialogContent className="sm:max-w-lg max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar perfis a {addingRolesTo?.full_name || addingRolesTo?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Perfis atuais: {addingRolesTo?.roles?.map(r => ROLE_LABELS[r] || r).join(', ') || 'Nenhum'}
            </p>
            <div>
              <Label>Selecione os perfis para adicionar</Label>
              <div className="space-y-2 mt-2">
                {selectableRoles.filter(role => !addingRolesTo?.roles?.includes(role)).map(role => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`add-role-${role}`}
                        checked={addRolesForm.roles.includes(role)}
                        onCheckedChange={() => toggleAddRole(role)}
                      />
                      <Label 
                        htmlFor={`add-role-${role}`}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <Icon className="w-4 h-4" />
                        {ROLE_LABELS[role]}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {selectableRoles.filter(role => !addingRolesTo?.roles?.includes(role)).length === 0 && (
                <p className="text-sm text-gray-500 mt-2">Este colaborador já possui todos os perfis disponíveis.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRolesModal(false)}>Cancelar</Button>
            <Button 
              onClick={submitAddRoles} 
              disabled={addRolesMu.isPending || addRolesForm.roles.length === 0} 
              className="bg-orange-500 hover:bg-orange-600"
            >
              {addRolesMu.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar Perfis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de perfil */}
      {showProfileView && selectedColaborador && (
        <Dialog open={showProfileView} onOpenChange={setShowProfileView}>
          <DialogContent className="sm:max-w-4xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Perfil do Colaborador</DialogTitle>
            </DialogHeader>
            <ColaboradorProfileView
              colaboradorEmail={selectedColaborador.email}
              onClose={() => {
                setShowProfileView(false);
                setSelectedColaborador(null);
              }}
              onEdit={async () => {
                // Buscar dados completos do usuário
                try {
                  const colaboradores = await base44.get('/colaboradores');
                  const colaborador = Array.isArray(colaboradores) 
                    ? colaboradores.find(c => (c.email || '').toLowerCase().trim() === (selectedColaborador.email || '').toLowerCase().trim())
                    : colaboradores.data?.find(c => (c.email || '').toLowerCase().trim() === (selectedColaborador.email || '').toLowerCase().trim());
                  
                  // Buscar dados completos do usuário pelo ID
                  if (colaborador?.id || colaborador?.ids?.[0]) {
                    const userId = colaborador.id || colaborador.ids[0];
                    const userData = await base44.get(`/colaboradores`).then(r => {
                      const list = Array.isArray(r) ? r : r.data || [];
                      return list.find(u => String(u.id) === String(userId));
                    });
                    setSelectedColaborador(userData || colaborador);
                  } else {
                    setSelectedColaborador(colaborador || selectedColaborador);
                  }
                  
                  setShowProfileView(false);
                  setShowProfileEdit(true);
                } catch (e) {
                  setShowProfileView(false);
                  setShowProfileEdit(true);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de edição de perfil */}
      {showProfileEdit && selectedColaborador && (
        <ColaboradorProfile
          user={selectedColaborador}
          profileRole={selectedColaborador.profile_role || selectedColaborador.roles?.[0]}
          onClose={() => {
            setShowProfileEdit(false);
            setSelectedColaborador(null);
            queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
          }}
          onUpdate={(updatedUser) => {
            setSelectedColaborador(updatedUser);
            queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
          }}
        />
      )}
    </div>
  );
}
