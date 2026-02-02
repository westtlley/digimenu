import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/apiClient';
import { Bell, Pizza, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ServiceRequestsTab() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['serviceRequests'],
    queryFn: async () => {
      const res = await apiClient.get('/service-requests');
      return res?.items || [];
    },
  });

  const pending = requests.filter(r => (r.status || 'pending') === 'pending');

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-500">Carregando solicitações...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Solicitações de Serviço</h2>
        <p className="text-sm text-gray-500">
          Assinantes que solicitaram a inclusão de serviços ao plano (ex: Pizza)
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              {pending.length} solicitação(ões) pendente(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/50"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Pizza className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {r.type === 'add_pizza_service' ? 'Adicionar serviço Pizza' : r.type || 'Solicitação'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    {r.subscriber_email || '—'}
                  </p>
                  {r.subscriber_name && (
                    <p className="text-xs text-gray-500 mt-0.5">{r.subscriber_name}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {r.requested_at
                      ? new Date(r.requested_at).toLocaleString('pt-BR')
                      : r.created_at
                      ? new Date(r.created_at).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Pendente
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma solicitação de serviço no momento.</p>
            <p className="text-sm text-gray-400 mt-1">
              Quando um assinante solicitar um serviço fora do plano, aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-500">Todas as solicitações foram atendidas.</p>
      ) : null}

      {requests.filter(r => r.status !== 'pending').length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Histórico</h3>
          <div className="space-y-2">
            {requests.filter(r => r.status !== 'pending').map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded border bg-gray-50 dark:bg-gray-800/50 text-sm"
              >
                <span>
                  {r.subscriber_email} — {r.type === 'add_pizza_service' ? 'Pizza' : r.type}
                </span>
                <Badge variant="secondary">{r.status || '—'}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
