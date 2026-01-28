import React, { useState, useEffect, useCallback } from 'react';
import { Play, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SOUND_OPTIONS, getSoundUrl } from '@/utils/gestorSounds';

const STORAGE_KEY = 'gestor_notification_config';

const DEFAULT_CONFIG = {
  soundEnabled: true,
  soundNewOrder: 'phone_classic',
  soundVolume: 80,
  soundAutoAccept: true,
  soundProblemsInactivity: true,
  soundNewMessages: true,
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const c = JSON.parse(raw);
    return {
      soundEnabled: c.soundEnabled !== false,
      soundNewOrder: c.soundNewOrder || c.selectedSound || 'phone_classic',
      soundVolume: c.soundVolume ?? c.volume ?? 80,
      soundAutoAccept: c.soundAutoAccept !== false,
      soundProblemsInactivity: c.soundProblemsInactivity !== false,
      soundNewMessages: c.soundNewMessages !== false,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(partial) {
  try {
    const prev = loadConfig();
    const next = { ...prev, ...partial };
    const raw = localStorage.getItem(STORAGE_KEY);
    const merged = raw ? { ...JSON.parse(raw), ...next } : next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('gestorNotificationConfigUpdated', { detail: merged }));
  } catch (_) {}
}

function PlayButton({ url, volume = 0.8, disabled, className }) {
  const [playing, setPlaying] = useState(false);
  const play = useCallback(() => {
    if (!url) return;
    setPlaying(true);
    const a = new Audio(url);
    a.volume = volume;
    a.play().catch(() => {}).finally(() => setPlaying(false));
    a.onended = () => setPlaying(false);
  }, [url, volume]);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-8 gap-1 ${className || ''}`}
      onClick={play}
      disabled={disabled || playing}
    >
      <Play className="w-3.5 h-3.5" />
      {playing ? '...' : 'Ouvir'}
    </Button>
  );
}

export default function AlertasDeSom() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const update = (partial) => {
    setConfig((c) => ({ ...c, ...partial }));
    saveConfig(partial);
  };

  const vol = config.soundVolume / 100;
  const url = getSoundUrl(config.soundNewOrder);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Alertas de som</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure os sons para cada tipo de evento.</p>
      </div>

      {/* RECEBIMENTO DE PEDIDOS */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Recebimento de pedidos
        </h3>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-gray-900">Pedido recebido</Label>
              <p className="text-xs text-gray-500">Som ao chegar um novo pedido</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select
                value={config.soundNewOrder}
                onValueChange={(v) => update({ soundNewOrder: v })}
              >
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_OPTIONS.slice(0, 8).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PlayButton url={url} volume={vol} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-gray-900">Pedidos com aceite automático</Label>
              <p className="text-xs text-gray-500">Tocar som quando o pedido for aceito automaticamente</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PlayButton url={config.soundAutoAccept ? url : null} volume={vol} disabled={!config.soundAutoAccept} />
              <Switch
                checked={config.soundAutoAccept}
                onCheckedChange={(v) => update({ soundAutoAccept: v })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="min-w-0 flex-1">
              <Label className="text-sm font-medium text-gray-900">Volume</Label>
              <p className="text-xs text-gray-500">Volume geral dos alertas de pedidos</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 min-w-[200px]">
              <Slider
                value={[config.soundVolume]}
                onValueChange={([v]) => update({ soundVolume: v })}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-600 w-10">{config.soundVolume}%</span>
              <PlayButton url={url} volume={vol} />
            </div>
          </div>
        </div>
      </div>

      {/* SITUAÇÕES COM A LOJA */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Situações com a loja
        </h3>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-gray-900">Problemas com pedidos ou inatividade</Label>
              <p className="text-xs text-gray-500">Alerta quando houver pendências ou inatividade (ex.: Está aí?)</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PlayButton
                url={config.soundProblemsInactivity ? url : null}
                volume={vol}
                disabled={!config.soundProblemsInactivity}
              />
              <Switch
                checked={config.soundProblemsInactivity}
                onCheckedChange={(v) => update({ soundProblemsInactivity: v })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-gray-900">Novas mensagens</Label>
              <p className="text-xs text-gray-500">Som ao chegar nova mensagem do cliente</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PlayButton url={config.soundNewMessages ? url : null} volume={vol} disabled={!config.soundNewMessages} />
              <Switch
                checked={config.soundNewMessages}
                onCheckedChange={(v) => update({ soundNewMessages: v })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle mestre - Som ligado/desligado */}
      <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-orange-600" />
          <div>
            <Label className="text-sm font-medium text-gray-900">Sons ativados</Label>
            <p className="text-xs text-gray-500">Desative para silenciar todos os alertas</p>
          </div>
        </div>
        <Switch
          checked={config.soundEnabled}
          onCheckedChange={(v) => update({ soundEnabled: v })}
        />
      </div>
    </div>
  );
}
