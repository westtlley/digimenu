import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { apiClient as base44 } from '@/api/apiClient';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function MasterSlugSettings({ user }) {
  const [slug, setSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.slug) {
      setSlug(user.slug);
    }
  }, [user]);

  const updateSlugMutation = useMutation({
    mutationFn: async (newSlug) => {
      const cleanSlug = String(newSlug || '').trim().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      return await base44.functions.invoke('updateMasterSlug', { 
        slug: cleanSlug || null 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      toast.success('✅ Link do cardápio atualizado!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao atualizar link');
    }
  });

  const handleSave = () => {
    if (!slug.trim()) {
      toast.error('Digite um link válido');
      return;
    }
    updateSlugMutation.mutate(slug);
  };

  const handleCopy = () => {
    if (!slug) {
      toast.error('Configure um link primeiro');
      return;
    }
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const cardapioUrl = slug ? `${window.location.origin}/s/${slug}` : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-orange-500" />
          Meu Cardápio
        </CardTitle>
        <CardDescription>
          Configure o link do seu cardápio para compartilhar com seus clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="master-slug">Link do Cardápio</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {window.location.origin}/s/
              </span>
              <Input
                id="master-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="meu-restaurante"
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
              />
            </div>
            <Button 
              onClick={handleSave}
              disabled={updateSlugMutation.isPending}
            >
              {updateSlugMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use apenas letras minúsculas, números e hífens. Ex: meu-restaurante
          </p>
        </div>

        {cardapioUrl && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Link do seu cardápio:
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 truncate font-mono">
                  {cardapioUrl}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(cardapioUrl, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
