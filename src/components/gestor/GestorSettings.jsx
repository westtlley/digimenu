import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Clock as ClockIcon, MessageSquare, Truck, Printer, Store, User, LogOut, Plus, Trash2, Save,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';
import AlertasDeSom from './AlertasDeSom';

const SECTIONS = [
  { id: 'alertas', label: 'Alertas de som', icon: Bell, group: 'gestor' },
  { id: 'logistica', label: 'Gestão Logística', icon: Truck, group: 'gestor' },
  { id: 'impressao', label: 'Impressão', icon: Printer, group: 'gestor' },
  { id: 'templates', label: 'Templates de Mensagem', icon: MessageSquare, group: 'gestor' },
  { id: 'horarios', label: 'Horários', icon: ClockIcon, group: 'gestor' },
  { id: 'lojas', label: 'Gestão de lojas', icon: Store, group: 'conta' },
  { id: 'conta', label: 'Minha conta', icon: User, group: 'conta' },
];

export default function GestorSettings() {
  const [activeSection, setActiveSection] = useState('alertas');
  const [settings, setSettings] = useState({
    default_prep_time: 30,
    can_alter_prep_per_order: true,
    auto_print: false,
    sound_notifications: true,
    auto_accept: false,
    are_you_there_enabled: false,
    are_you_there_minutes: 15,
    prep_time_manual_enabled: true,
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
    try {
      const saved = localStorage.getItem('gestorSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (_) {}
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

  const handleLogout = () => {
    if (typeof base44?.auth?.logout === 'function') {
      base44.auth.logout();
    } else {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      } catch (_) {
        window.location.href = '/';
      }
    }
  };

  const gestorItems = SECTIONS.filter(s => s.group === 'gestor');
  const contaItems = SECTIONS.filter(s => s.group === 'conta');

  const navItemClass = (id) =>
    `w-full flex items-center gap-2 px-3 py-2 rounded-r-md border-l-4 transition-all duration-200 text-left text-sm ${
      activeSection === id
        ? 'border-orange-500 bg-orange-50 text-orange-600 font-medium'
        : 'border-transparent text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Ajustes */}
      <aside className="lg:w-56 flex-shrink-0">
        <nav className="space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Gestor de pedidos
          </p>
          {gestorItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)} className={navItemClass(id)}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
          <p className="px-3 py-1.5 mt-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Conta
          </p>
          {contaItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)} className={navItemClass(id)}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-5">
        {activeSection === 'alertas' && <AlertasDeSom />}

        {activeSection === 'logistica' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gestão Logística</h2>
              <p className="text-sm text-gray-500 mt-0.5">Tempo de preparo e alertas de inatividade.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-900">Tempo de preparo manual</Label>
                <p className="text-xs text-gray-500">Tempo estimado para preparar pedidos (minutos)</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={settings.default_prep_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, default_prep_time: parseInt(e.target.value) || 30 }))}
                  className="w-20 h-9 text-center"
                />
                <span className="text-sm text-gray-500">min</span>
                <Switch
                  checked={settings.prep_time_manual_enabled !== false}
                  onCheckedChange={(v) => setSettings(prev => ({ ...prev, prep_time_manual_enabled: v }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-900">Permitir alterar por pedido</Label>
                <p className="text-xs text-gray-500">Ao aceitar, poder alterar o tempo daquele pedido</p>
              </div>
              <Switch
                checked={settings.can_alter_prep_per_order !== false}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, can_alter_prep_per_order: v }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-900">Está aí? (alerta de inatividade)</Label>
                <p className="text-xs text-gray-500">Após N minutos sem interação, avisar</p>
              </div>
              <Switch
                checked={settings.are_you_there_enabled === true}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, are_you_there_enabled: v }))}
              />
            </div>
            {settings.are_you_there_enabled && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">Após quantos minutos?</Label>
                <select
                  value={settings.are_you_there_minutes || 15}
                  onChange={(e) => setSettings(prev => ({ ...prev, are_you_there_minutes: parseInt(e.target.value) }))}
                  className="border rounded-md px-2.5 py-1.5 text-sm w-28"
                >
                  {[5, 10, 15, 20, 30, 45, 60].map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            )}

            <Button onClick={saveSettings} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        )}

        {activeSection === 'impressao' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Impressão</h2>
              <p className="text-sm text-gray-500 mt-0.5">Impressora e extensão para imprimir pedidos.</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-900">Impressão automática</Label>
                <p className="text-xs text-gray-500">Imprimir ao aceitar pedido</p>
              </div>
              <Switch
                checked={settings.auto_print}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, auto_print: v }))}
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-sm font-medium text-gray-900">Extensão da impressora</Label>
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                  Extensão fechada
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                A extensão permite enviar pedidos direto para a impressora. Informação atualizada a cada 30 segundos.
              </p>
              <a href="#baixar-extensao" className="text-sm font-medium text-orange-600 hover:underline">
                Baixar extensão
              </a>
            </div>

            <Button onClick={saveSettings} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        )}

        {activeSection === 'templates' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Templates de Mensagem</h2>
              <p className="text-sm text-gray-500 mt-0.5">Respostas rápidas para clientes.</p>
            </div>
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.message}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteTemplateMutation.mutate(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <Input placeholder="Título" value={newTemplate.title} onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))} />
              <Textarea placeholder="Mensagem" value={newTemplate.message} onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))} className="min-h-[80px]" />
              <Button onClick={handleAddTemplate} variant="outline"><Plus className="w-4 h-4 mr-2" /> Adicionar</Button>
            </div>
          </div>
        )}

        {activeSection === 'horarios' && store && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Horário de Funcionamento</h2>
              <p className="text-sm text-gray-500 mt-0.5">Exibido no cardápio e no gestor.</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Abertura:</span><span className="font-medium">{store.opening_time || '08:00'}</span></div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Fechamento:</span><span className="font-medium">{store.closing_time || '18:00'}</span></div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Dias:</span><span className="font-medium">{(store.working_days || [1,2,3,4,5]).map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}</span></div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Status:</span><span className={store.is_open ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{store.is_open ? 'Aberto' : 'Fechado'}</span></div>
            </div>
            <p className="text-xs text-gray-500">Para alterar, acesse as configurações da loja no painel administrativo.</p>
          </div>
        )}

        {activeSection === 'lojas' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gestão de lojas</h2>
              <p className="text-sm text-gray-500 mt-0.5">Recebimento e aceite de pedidos.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-900">Aceite automático de pedidos</Label>
                <p className="text-xs text-gray-500">Aceitar e imprimir automaticamente. Configure a impressora em Ajustes &gt; Impressão.</p>
              </div>
              <Switch
                checked={settings.auto_accept}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, auto_accept: v }))}
              />
            </div>
            <Button onClick={saveSettings} className="bg-orange-500 hover:bg-orange-600"><Save className="w-4 h-4 mr-2" /> Salvar</Button>
          </div>
        )}

        {activeSection === 'conta' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Minha conta</h2>
              <p className="text-sm text-gray-500 mt-0.5">Trocar de conta ou encerrar sessão.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium text-gray-900">Trocar de conta</Label>
              <p className="text-xs text-gray-500 mt-1">Encerre a sessão para acessar com outra conta.</p>
              <button type="button" onClick={handleLogout} className="mt-2 flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700">
                <LogOut className="w-4 h-4" /> Sair da conta
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium text-gray-900">Sistema</Label>
              <p className="text-xs text-gray-500 mt-1">Use se a versão antiga continuar em cache.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
                    for (const r of regs) await r.unregister();
                    if ('caches' in window) {
                      const names = await caches.keys();
                      await Promise.all(names.filter(n => n !== 'meta-json').map(n => caches.delete(n)));
                    }
                    toast.success('Cache limpo. Recarregando...');
                    window.location.reload();
                  } catch (e) {
                    toast.error('Erro ao limpar cache');
                  }
                }}
                className="mt-2 text-sm text-orange-600 hover:underline"
              >
                Limpar cache e recarregar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
