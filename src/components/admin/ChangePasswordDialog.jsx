import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { apiClient as base44 } from '@/api/apiClient';
import toast from 'react-hot-toast';

export default function ChangePasswordDialog({ open, onOpenChange }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrent('');
    setNewPass('');
    setConfirm('');
    setLoading(false);
  };

  const handleOpenChange = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPass !== confirm) {
      toast.error('A confirmação da nova senha não confere.');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.changePassword(current, newPass);
      toast.success('Senha alterada. Use a nova senha no próximo login.');
      handleOpenChange(false);
    } catch (err) {
      const msg = err?.message || err?.error || 'Erro ao alterar senha.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <KeyRound className="w-5 h-5 text-amber-500" />
            Alterar senha
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--text-secondary)' }}>
            Altere a senha do seu acesso master. Use uma senha forte e não a compartilhe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label style={{ color: 'var(--text-primary)' }}>Senha atual</Label>
            <div className="relative mt-1">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Sua senha atual"
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label style={{ color: 'var(--text-primary)' }}>Nova senha (mín. 6)</Label>
            <div className="relative mt-1">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Nova senha"
                required
                minLength={6}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label style={{ color: 'var(--text-primary)' }}>Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Alterar senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
