import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Volume1, Play, Check, Upload, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { base44 } from '@/api/base44Client';

const SOUND_OPTIONS = [
  { 
    id: 'phone_classic', 
    name: 'Telefone Clássico',
    url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
  },
  { 
    id: 'phone_urgent', 
    name: 'Telefone Urgente',
    url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
  },
  { 
    id: 'phone_retro', 
    name: 'Telefone Retrô',
    url: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3'
  },
  { 
    id: 'beep_short', 
    name: 'Bip Curto',
    url: 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3'
  },
  { 
    id: 'beep_long', 
    name: 'Bip Longo',
    url: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'
  },
  { 
    id: 'electronic_ping', 
    name: 'Electronic Ping',
    url: 'https://assets.mixkit.co/active_storage/sfx/2363/2363-preview.mp3'
  },
  { 
    id: 'ifood_01', 
    name: 'iFood-like 01',
    url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3'
  },
  { 
    id: 'ifood_02', 
    name: 'iFood-like 02',
    url: 'https://assets.mixkit.co/active_storage/sfx/2872/2872-preview.mp3'
  }
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    volume: 80,
    repeatUntilViewed: true,
    selectedSound: 'phone_classic',
    customSoundUrl: null
  });
  const [testingSound, setTestingSound] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const playTestSound = (soundId) => {
    let soundUrl;
    
    if (soundId === 'custom' && settings.customSoundUrl) {
      soundUrl = settings.customSoundUrl;
    } else {
      const sound = SOUND_OPTIONS.find(s => s.id === soundId);
      if (!sound) return;
      soundUrl = sound.url;
    }
    
    setTestingSound(soundId);
    const audio = new Audio(soundUrl);
    audio.volume = settings.volume / 100;
    audio.play();
    audio.onended = () => setTestingSound(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      alert('Por favor, selecione um arquivo de áudio');
      return;
    }
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newSettings = { ...settings, customSoundUrl: file_url, selectedSound: 'custom' };
    saveSettings(newSettings);
    setUploading(false);
  };

  const removeCustomSound = () => {
    const newSettings = { ...settings, customSoundUrl: null, selectedSound: 'phone_classic' };
    saveSettings(newSettings);
  };

  return (
    <div className="space-y-6">
      {/* Volume Control */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-red-500" />
          Controle de Volume
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-medium">Som de Notificação</Label>
              <p className="text-xs text-gray-500">Ativar som quando receber pedido</p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => saveSettings({ ...settings, soundEnabled: checked })}
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium">Volume</Label>
              <span className="text-sm font-bold text-red-500">{settings.volume}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Volume1 className="w-4 h-4 text-gray-400" />
              <Slider
                value={[settings.volume]}
                onValueChange={([value]) => saveSettings({ ...settings, volume: value })}
                max={100}
                step={5}
                className="flex-1"
              />
              <Volume2 className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <Label className="font-medium text-red-900">Repetir até visualizar</Label>
              <p className="text-xs text-red-700">Som toca continuamente até aceitar pedido</p>
            </div>
            <Switch
              checked={settings.repeatUntilViewed}
              onCheckedChange={(checked) => saveSettings({ ...settings, repeatUntilViewed: checked })}
            />
          </div>
        </div>
      </div>

      {/* Sound Selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-bold text-lg mb-4">Selecionar Som</h3>
        
        <div className="grid gap-2">
          {SOUND_OPTIONS.map(sound => (
            <div
              key={sound.id}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                settings.selectedSound === sound.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => saveSettings({ ...settings, selectedSound: sound.id })}
            >
              <div className="flex items-center gap-3">
                {settings.selectedSound === sound.id ? (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                )}
                <span className="font-medium text-sm">{sound.name}</span>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  playTestSound(sound.id);
                }}
                disabled={testingSound === sound.id}
                className="h-8"
              >
                {testingSound === sound.id ? (
                  <>
                    <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                    Tocando
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Testar
                  </>
                )}
              </Button>
            </div>
          ))}

          {/* Custom Sound Upload */}
          <div className="mt-3 p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-sm">Som Personalizado</p>
                <p className="text-xs text-gray-600">Faça upload do seu próprio som</p>
              </div>
              {settings.customSoundUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={removeCustomSound}
                  className="text-red-500 h-8"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remover
                </Button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {settings.customSoundUrl ? (
              <div
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  settings.selectedSound === 'custom'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 bg-white'
                }`}
                onClick={() => saveSettings({ ...settings, selectedSound: 'custom' })}
              >
                <div className="flex items-center gap-3">
                  {settings.selectedSound === 'custom' ? (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className="font-medium text-sm">Meu Som</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTestSound('custom');
                  }}
                  disabled={testingSound === 'custom'}
                  className="h-8"
                >
                  {testingSound === 'custom' ? (
                    <>
                      <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                      Tocando
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Testar
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="w-full border-dashed border-2 h-12"
              >
                {uploading ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer Upload de Áudio
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Mantenha o volume alto e ative "Repetir até visualizar" para não perder nenhum pedido!
        </p>
      </div>
    </div>
  );
}