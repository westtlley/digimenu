import React, { useState } from 'react';
import { X, Bell, Volume2, Vibrate, Moon, Sun, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function SettingsModal({ entregador, onClose, onDarkModeChange }) {
  const [settings, setSettings] = useState({
    notifications_enabled: entregador.notifications_enabled ?? true,
    sound_enabled: entregador.sound_enabled ?? true,
    vibration_enabled: entregador.vibration_enabled ?? true,
    dark_mode: entregador.dark_mode ?? false
  });
  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (entregador._isMaster) {
        return Promise.resolve(data);
      }
      return base44.entities.Entregador.update(entregador.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregador'] });
      onClose();
    }
  });

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    if (key === 'dark_mode') {
      onDarkModeChange(newSettings.dark_mode);
    }
  };

  const handleSave = () => {
    // Se ativou notificações, solicitar permissão
    if (settings.notifications_enabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            toast.success('Permissão de notificações concedida!');
          } else {
            toast.error('Permissão negada. Ative nas configurações do navegador.');
          }
        });
      }
    }
    
    updateSettingsMutation.mutate({
      ...entregador,
      ...settings
    });
  };

  const testSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.8;
    audio.play().catch(() => toast.error('Erro ao reproduzir som'));
    
    if (settings.vibration_enabled && navigator.vibrate) {
      navigator.vibrate([300, 100, 300]);
    }
    
    toast.success('Som de teste reproduzido!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${settings.dark_mode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${settings.dark_mode ? 'text-white' : 'text-gray-900'}`}>
            Configurações
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Notificações */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-500" />
              <div>
                <Label>Notificações Push</Label>
                <p className="text-xs text-gray-500">Receba alertas de novos pedidos</p>
              </div>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={() => handleToggle('notifications_enabled')}
            />
          </div>

          {/* Som */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-green-500" />
                <div>
                  <Label>Som</Label>
                  <p className="text-xs text-gray-500">Alertas sonoros</p>
                </div>
              </div>
              <Switch
                checked={settings.sound_enabled}
                onCheckedChange={() => handleToggle('sound_enabled')}
              />
            </div>
            {settings.sound_enabled && (
              <button
                onClick={testSound}
                className="mt-2 ml-8 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                Testar Som
              </button>
            )}
          </div>

          {/* Vibração */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-purple-500" />
              <div>
                <Label>Vibração</Label>
                <p className="text-xs text-gray-500">Vibrar ao receber pedidos</p>
              </div>
            </div>
            <Switch
              checked={settings.vibration_enabled}
              onCheckedChange={() => handleToggle('vibration_enabled')}
            />
          </div>

          {/* Modo Escuro */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.dark_mode ? (
                <Moon className="w-5 h-5 text-indigo-500" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <Label>Modo Escuro</Label>
                <p className="text-xs text-gray-500">Tema escuro para a noite</p>
              </div>
            </div>
            <Switch
              checked={settings.dark_mode}
              onCheckedChange={() => handleToggle('dark_mode')}
            />
          </div>

          {/* Botão Salvar */}
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}