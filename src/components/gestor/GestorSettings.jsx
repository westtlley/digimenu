import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Clock as ClockIcon, Bell, MessageSquare,
  Plus, Trash2, Save, Settings
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';
import NotificationSettings from './NotificationSettings';
import NotificationConfig from './NotificationConfig';

export default function GestorSettings() {
  const [settings, setSettings] = useState({
    default_prep_time: 30,
    auto_print: false,
    sound_notifications: true,
    auto_accept: false,
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });

  const store = stores[0];

  useEffect(() => {
    const savedSettings = localStorage.getItem('gestorSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('gestorSettings', JSON.stringify(settings));
    toast.success('Configurações salvas!');
    window.dispatchEvent(new CustomEvent('gestorSettingsUpdated', { detail: settings }));
  };

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }),
  });

  const [newTemplate, setNewTemplate] = useState({ title: '', message: '' });

  const handleAddTemplate = () => {
    if (!newTemplate.title || !newTemplate.message) return;
    createTemplateMutation.mutate(newTemplate);
    setNewTemplate({ title: '', message: '' });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Configurações</h2>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 - Geral */}
        <button 
          onClick={() => document.getElementById('general-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white border rounded-lg p-4 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Configurações Gerais</h3>
          <p className="text-xs text-gray-500">Tempo de preparo, impressão e aceite automático</p>
        </button>

        {/* Card 2 - Notificações */}
        <button 
          onClick={() => document.getElementById('notifications-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white border rounded-lg p-4 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Notificações</h3>
          <p className="text-xs text-gray-500">Som, alertas e preferências de notificação</p>
        </button>

        {/* Card 3 - Templates */}
        <button 
          onClick={() => document.getElementById('templates-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white border rounded-lg p-4 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Templates de Mensagem</h3>
          <p className="text-xs text-gray-500">Respostas rápidas para clientes</p>
        </button>

        {/* Card 4 - Horários */}
        <button 
          onClick={() => document.getElementById('hours-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white border rounded-lg p-4 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <ClockIcon className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Horários</h3>
          <p className="text-xs text-gray-500">Funcionamento e disponibilidade</p>
        </button>
      </div>

      <div className="space-y-4 mt-6">
        {/* Section: General */}
        <div id="general-section" className="scroll-mt-4">
          <div className="bg-white rounded-lg p-5 border">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2 text-gray-900">
              <Settings className="w-4 h-4" /> Configurações Gerais
            </h3>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-md">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Tempo padrão de preparo</Label>
                  <p className="text-[10px] text-gray-500">Tempo estimado para preparar pedidos</p>
                </div>
                <select
                  value={settings.default_prep_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, default_prep_time: parseInt(e.target.value) }))}
                  className="border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                  <option value={90}>90 minutos</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Impressão automática</Label>
                  <p className="text-[10px] text-gray-500">Imprimir ao aceitar pedido</p>
                </div>
                <Switch
                  checked={settings.auto_print}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_print: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Som de notificação</Label>
                  <p className="text-[10px] text-gray-500">Tocar som ao receber pedido</p>
                </div>
                <Switch
                  checked={settings.sound_notifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sound_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Aceitar automaticamente</Label>
                  <p className="text-[10px] text-gray-500">Aceitar pedidos automaticamente</p>
                </div>
                <Switch
                  checked={settings.auto_accept}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_accept: checked }))}
                />
              </div>

              <Button onClick={saveSettings} className="w-full bg-red-500 hover:bg-red-600 text-sm py-2">
                <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar Configurações
              </Button>
            </div>
          </div>
        </div>

        {/* Section: Notifications */}
        <div id="notifications-section" className="scroll-mt-4">
          <div className="bg-white rounded-lg p-5 border">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2 text-gray-900">
              <Bell className="w-4 h-4" /> Notificações
            </h3>
            <NotificationConfig darkMode={false} />
          </div>
          <div className="mt-4">
            <NotificationSettings />
          </div>
        </div>

        {/* Section: Templates */}
        <div id="templates-section" className="scroll-mt-4">
          <div className="bg-white rounded-lg p-5 border">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2 text-gray-900">
              <MessageSquare className="w-4 h-4" /> Templates de Mensagem
            </h3>

            <div className="space-y-2 mb-4">
              {templates.map(template => (
                <div key={template.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-gray-900 truncate">{template.title}</p>
                    <p className="text-[10px] text-gray-500 line-clamp-2">{template.message}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 flex-shrink-0"
                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-2.5">
              <Input
                placeholder="Título do template"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                className="text-xs"
              />
              <Textarea
                placeholder="Mensagem"
                value={newTemplate.message}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                className="min-h-[70px] text-xs"
              />
              <Button onClick={handleAddTemplate} variant="outline" className="w-full text-xs py-2">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Template
              </Button>
            </div>
          </div>
        </div>

        {/* Section: Store Hours */}
        <div id="hours-section" className="scroll-mt-4">
          {store && (
            <div className="bg-white rounded-lg p-5 border">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2 text-gray-900">
                <ClockIcon className="w-4 h-4" /> Horário de Funcionamento
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-gray-600">Abertura:</span>
                  <span className="font-medium text-gray-900">{store.opening_time || '08:00'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-gray-600">Fechamento:</span>
                  <span className="font-medium text-gray-900">{store.closing_time || '18:00'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-gray-600">Dias:</span>
                  <span className="font-medium text-gray-900">
                    {(store.working_days || [1,2,3,4,5]).map(d => 
                      ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]
                    ).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${store.is_open ? 'text-green-600' : 'text-red-600'}`}>
                    {store.is_open ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
              </div>
              
              <p className="text-[10px] text-gray-500 mt-2.5">
                Para alterar o horário, acesse as configurações da loja no painel administrativo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}