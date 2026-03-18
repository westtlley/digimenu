import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Send, Megaphone, Package, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from '../permissions/usePermission';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';

export default function NotificationsTab() {
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'announcement',
    target_users: []
  });

  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const scopedEntityOpts = getMenuContextEntityOpts(menuContext);

  // ✅ CORREÇÃO: Buscar notificações com contexto do slug
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Notification.list('-created_date', 50, scopedEntityOpts);
    },
    enabled: !!menuContext,
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create({ ...data, ...scopedEntityOpts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', ...menuContextQueryKey] });
      toast.success('Notificação enviada!');
      setNotificationForm({
        title: '',
        message: '',
        type: 'announcement',
        target_users: []
      });
    }
  });

  const handleSend = () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error('Preencha título e mensagem');
      return;
    }
    sendNotificationMutation.mutate({
      ...notificationForm,
      is_sent: true,
      sent_at: new Date().toISOString()
    });
  };

  const typeIcons = {
    promotion: Megaphone,
    order_status: Package,
    announcement: AlertCircle
  };

  const typeLabels = {
    promotion: 'Promoção',
    order_status: 'Status do Pedido',
    announcement: 'Anúncio'
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Notificações Push</h1>
        <p className="text-muted-foreground">Envie notificações para seus clientes</p>
      </div>

      {/* Formulário de Envio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-500" />
            Nova Notificação
          </CardTitle>
          <CardDescription>Envie notificações personalizadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de Notificação</Label>
            <Select
              value={notificationForm.type}
              onValueChange={(value) => setNotificationForm(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promotion">🎉 Promoção Especial</SelectItem>
                <SelectItem value="order_status">📦 Status do Pedido</SelectItem>
                <SelectItem value="announcement">📢 Anúncio Importante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input
              value={notificationForm.title}
              onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Promoção Especial!"
            />
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={notificationForm.message}
              onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Digite a mensagem..."
              rows={4}
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-xl">
            <Label className="text-sm mb-2 block">Prévia da Notificação</Label>
            <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border border-border">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{notificationForm.title || 'Título da notificação'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{notificationForm.message || 'Mensagem aparecerá aqui...'}</p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSend}
            className="w-full bg-orange-500 hover:bg-orange-600"
            disabled={sendNotificationMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar para Todos os Clientes
          </Button>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            Histórico de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p>Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notif => {
                const Icon = typeIcons[notif.type] || Bell;
                return (
                  <div key={notif.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{notif.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {typeLabels[notif.type]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em {new Date(notif.sent_at || notif.created_date).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
