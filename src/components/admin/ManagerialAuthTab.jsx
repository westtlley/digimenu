/**
 * Aba de configuração da autorização gerencial (matrícula + senha).
 * Apenas o assinante (dono) pode criar/alterar a própria e a do gerente.
 * Senha pode ser expirável ou permanente; pode ser trocada a qualquer momento.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { usePermission } from '@/components/permissions/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Shield, Loader2, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManagerialAuthTab() {
  const queryClient = useQueryClient();
  const { user, menuContext } = usePermission();
  const asSub = menuContext?.type === 'subscriber' ? menuContext.value : (user?.subscriber_email || user?.email);
  const isOwner = !user?.is_master && (user?.email || '').toLowerCase() === (asSub || '').toLowerCase();
  const canConfigure = isOwner || (user?.is_master && !!asSub);
  const roles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
  const isGerente = roles.includes('gerente');

  const { data, isLoading } = useQuery({
    queryKey: ['managerial-auth', asSub],
    queryFn: () => base44.get('/managerial-auth', asSub ? { as_subscriber: asSub } : {}),
  });

  const [assinanteForm, setAssinanteForm] = useState({ matricula: '', password: '', expirable: false, expires_at: '' });
  const [gerenteForm, setGerenteForm] = useState({ matricula: '', password: '', expirable: false, expires_at: '' });

  const saveMutation = useMutation({
    mutationFn: ({ role, matricula, password, expirable, expires_at }) => {
      const body = {
        role,
        matricula,
        password,
        expirable: !!expirable,
        expires_at: expirable && expires_at ? expires_at : null,
      };
      if (user?.is_master && asSub) body.as_subscriber = asSub;
      return base44.post('/managerial-auth', body);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['managerial-auth'] });
      toast.success(vars.role === 'gerente' ? 'Autorização do Gerente salva.' : 'Sua autorização foi salva.');
      if (vars.role === 'assinante') setAssinanteForm({ matricula: '', password: '', expirable: false, expires_at: '' });
      else setGerenteForm({ matricula: '', password: '', expirable: false, expires_at: '' });
    },
    onError: (e) => toast.error(e?.message || 'Erro ao salvar'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isOwner && isGerente) {
    return (
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Autorização gerencial
            </CardTitle>
            <CardDescription>
              A matrícula e a senha de autorização são definidas pelo dono do estabelecimento. Quando você realizar ações sensíveis (abrir caixa, excluir, exportar, etc.), será solicitada sua matrícula e senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data?.gerente?.configured
                ? 'Sua autorização está configurada. Use sua matrícula e senha quando o sistema solicitar.'
                : 'O dono do estabelecimento ainda não configurou sua autorização. Peça que ele acesse esta aba e defina sua matrícula e senha.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canConfigure) {
    return (
      <div className="max-w-2xl">
        <p className="text-gray-600 dark:text-gray-400">Apenas o dono do estabelecimento pode configurar as autorizações gerenciais. Selecione um estabelecimento no menu para configurar em nome dele.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {user?.is_master && asSub && (
        <p className="text-sm text-gray-600 dark:text-gray-400 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
          Configurando autorização para o estabelecimento: <strong>{asSub}</strong>
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Autorização gerencial
          </CardTitle>
          <CardDescription>
            Defina matrícula e senha para validar ações sensíveis: editar, excluir, duplicar, importar, exportar, abrir caixa e funções financeiras. Você pode tornar a senha expirável ou permanente e alterá-la a qualquer momento.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minha autorização (Assinante)</CardTitle>
          <CardDescription>Usada quando você realizar ações que exigem confirmação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.assinante?.configured && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Matrícula configurada. Expira em: {data.assinante.expires_at ? new Date(data.assinante.expires_at).toLocaleDateString('pt-BR') : 'Permanente'}.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Código de matrícula</Label>
              <Input
                value={assinanteForm.matricula}
                onChange={(e) => setAssinanteForm((f) => ({ ...f, matricula: e.target.value }))}
                placeholder="Ex.: 001"
              />
            </div>
            <div>
              <Label>Senha {data?.assinante?.configured ? '(nova, para alterar)' : ''}</Label>
              <Input
                type="password"
                value={assinanteForm.password}
                onChange={(e) => setAssinanteForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={assinanteForm.expirable}
                onCheckedChange={(c) => setAssinanteForm((f) => ({ ...f, expirable: c }))}
              />
              <Label>Senha expirável</Label>
            </div>
            {assinanteForm.expirable && (
              <div>
                <Label className="mr-2">Válida até</Label>
                <Input
                  type="date"
                  value={assinanteForm.expires_at}
                  onChange={(e) => setAssinanteForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            )}
          </div>
          <Button
            disabled={!assinanteForm.matricula.trim() || assinanteForm.password.length < 6 || saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate({
                role: 'assinante',
                matricula: assinanteForm.matricula.trim(),
                password: assinanteForm.password,
                expirable: assinanteForm.expirable,
                expires_at: assinanteForm.expires_at || null,
              })
            }
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {data?.assinante?.configured ? 'Alterar senha' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autorização do Gerente</CardTitle>
          <CardDescription>Matrícula e senha que o gerente usará para validar ações sensíveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.gerente?.configured && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Matrícula configurada. Expira em: {data.gerente.expires_at ? new Date(data.gerente.expires_at).toLocaleDateString('pt-BR') : 'Permanente'}.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Código de matrícula</Label>
              <Input
                value={gerenteForm.matricula}
                onChange={(e) => setGerenteForm((f) => ({ ...f, matricula: e.target.value }))}
                placeholder="Ex.: 002"
              />
            </div>
            <div>
              <Label>Senha {data?.gerente?.configured ? '(nova, para alterar)' : ''}</Label>
              <Input
                type="password"
                value={gerenteForm.password}
                onChange={(e) => setGerenteForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={gerenteForm.expirable}
                onCheckedChange={(c) => setGerenteForm((f) => ({ ...f, expirable: c }))}
              />
              <Label>Senha expirável</Label>
            </div>
            {gerenteForm.expirable && (
              <div>
                <Label className="mr-2">Válida até</Label>
                <Input
                  type="date"
                  value={gerenteForm.expires_at}
                  onChange={(e) => setGerenteForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            )}
          </div>
          <Button
            disabled={!gerenteForm.matricula.trim() || gerenteForm.password.length < 6 || saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate({
                role: 'gerente',
                matricula: gerenteForm.matricula.trim(),
                password: gerenteForm.password,
                expirable: gerenteForm.expirable,
                expires_at: gerenteForm.expires_at || null,
              })
            }
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {data?.gerente?.configured ? 'Alterar senha' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Quando a autorização estiver configurada, ao abrir caixa, exportar, excluir itens ou realizar outras ações sensíveis, o sistema solicitará a matrícula e a senha para validar.
        </p>
      </div>
    </div>
  );
}
