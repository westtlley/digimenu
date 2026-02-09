/**
 * Modal para validar matrícula e senha antes de ações sensíveis
 * (abrir caixa, excluir, exportar, etc.)
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Loader2, AlertCircle } from 'lucide-react';

export default function ManagerialAuthModal({
  open,
  onOpenChange,
  title = 'Confirmação necessária',
  description = 'Informe sua matrícula e senha para autorizar esta ação.',
  onValidate,
  actionLabel = 'Validar',
}) {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = (openState) => {
    if (!openState) {
      setMatricula('');
      setPassword('');
      setError('');
    }
    onOpenChange(openState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!matricula.trim() || !password) {
      setError('Preencha matrícula e senha.');
      return;
    }
    setLoading(true);
    try {
      const valid = await onValidate({ matricula: matricula.trim(), password });
      if (valid) {
        handleClose(false);
      } else {
        setError('Matrícula ou senha incorretos. Tente novamente.');
      }
    } catch (err) {
      setError(err?.message || 'Erro ao validar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ma-matricula">Código de matrícula</Label>
            <Input
              id="ma-matricula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex.: 001"
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="ma-password">Senha</Label>
            <Input
              id="ma-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
