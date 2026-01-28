import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const NOTIFICATION_STATUSES = [
  { value: 'new', label: 'Novos Pedidos', description: 'Quando receber um pedido novo' },
  { value: 'accepted', label: 'Pedidos Aceitos', description: 'Quando um pedido for aceito' },
  { value: 'preparing', label: 'Em Preparo', description: 'Quando iniciar o preparo' },
  { value: 'ready', label: 'Prontos para Entrega', description: 'Quando o pedido estiver pronto' },
  { value: 'delivered', label: 'Pedidos Entregues', description: 'Quando um pedido for entregue' },
  { value: 'cancelled', label: 'Pedidos Cancelados', description: 'Quando um pedido for cancelado' },
];

const STORAGE_KEY = 'gestor_notification_config';

export default function NotificationConfig({ onSettingsChange, darkMode = false }) {
  const [config, setConfig] = useState({
    soundEnabled: true,
    browserNotificationEnabled: true,
    notifyOnStatus: {
      new: true,
      accepted: false,
      preparing: false,
      ready: true,
      delivered: false,
      cancelled: true,
    },
    soundVolume: 80,
  });

  // Carregar configurações salvas
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        onSettingsChange?.(parsed);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    }
  }, []);

  // Salvar configurações
  const saveConfig = (newConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      onSettingsChange?.(newConfig);
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
    }
  };

  const toggleSound = () => {
    const newConfig = { ...config, soundEnabled: !config.soundEnabled };
    saveConfig(newConfig);
  };

  const toggleBrowserNotification = () => {
    const newConfig = { ...config, browserNotificationEnabled: !config.browserNotificationEnabled };
    saveConfig(newConfig);

    // Solicitar permissão se necessário
    if (newConfig.browserNotificationEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const toggleStatusNotification = (status) => {
    const newConfig = {
      ...config,
      notifyOnStatus: {
        ...config.notifyOnStatus,
        [status]: !config.notifyOnStatus[status],
      },
    };
    saveConfig(newConfig);
  };

  const setVolume = (volume) => {
    const newConfig = { ...config, soundVolume: volume };
    saveConfig(newConfig);
  };

  return (
    <Card className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-700'}`} />
        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Configurações de Notificação
        </h3>
      </div>

      <div className="space-y-4">
        {/* Som de Notificação */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`flex items-center justify-between p-3 rounded-lg ${
            darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            {config.soundEnabled ? (
              <Volume2 className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            ) : (
              <VolumeX className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            )}
            <div>
              <Label className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Som de Notificação
              </Label>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Tocar som ao receber notificações
              </p>
            </div>
          </div>
          <Switch
            checked={config.soundEnabled}
            onCheckedChange={toggleSound}
          />
        </motion.div>

        {/* Notificação do Navegador */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`flex items-center justify-between p-3 rounded-lg ${
            darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell className={`w-5 h-5 ${config.browserNotificationEnabled ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
            <div>
              <Label className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Notificação do Navegador
              </Label>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Exibir notificações do sistema
              </p>
              {!('Notification' in window) && (
                <Badge className="mt-1 text-xs bg-yellow-500 text-white">
                  Não disponível no navegador
                </Badge>
              )}
            </div>
          </div>
          <Switch
            checked={config.browserNotificationEnabled}
            onCheckedChange={toggleBrowserNotification}
            disabled={!('Notification' in window)}
          />
        </motion.div>

        {/* Status para Notificar */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Label className={`font-medium mb-3 block ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notificar quando status mudar para:
          </Label>
          <div className="space-y-2">
            {NOTIFICATION_STATUSES.map((status) => (
              <motion.div
                key={status.value}
                whileHover={{ x: 4 }}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100'
                } transition-colors`}
              >
                <div className="flex-1">
                  <Label className={`text-sm font-medium cursor-pointer ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {status.label}
                  </Label>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {status.description}
                  </p>
                </div>
                <Switch
                  checked={config.notifyOnStatus[status.value] || false}
                  onCheckedChange={() => toggleStatusNotification(status.value)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
