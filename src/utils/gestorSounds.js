/**
 * Opções de som e helpers para o Gestor de Pedidos.
 * Usado em GestorPedidos (playNotificationSound) e na seção Alertas de som (GestorSettings).
 */

export const SOUND_OPTIONS = [
  { id: 'phone_classic', name: 'Som 1 - Telefone', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'phone_urgent', name: 'Som 2 - Urgente', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
  { id: 'phone_retro', name: 'Som 3 - Retrô', url: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3' },
  { id: 'beep_short', name: 'Som 4 - Bip curto', url: 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3' },
  { id: 'beep_long', name: 'Som 5 - Bip longo', url: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3' },
  { id: 'electronic_ping', name: 'Som 6 - Ping', url: 'https://assets.mixkit.co/active_storage/sfx/2363/2363-preview.mp3' },
  { id: 'ifood_01', name: 'Som 7', url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
  { id: 'ifood_02', name: 'Som 8', url: 'https://assets.mixkit.co/active_storage/sfx/2872/2872-preview.mp3' },
];

const STORAGE_KEY = 'gestor_notification_config';

/**
 * Retorna a URL do áudio para o id (ou customSoundUrl quando id === 'custom').
 */
export function getSoundUrl(id, customSoundUrl = null) {
  if (id === 'custom' && customSoundUrl) return customSoundUrl;
  return SOUND_OPTIONS.find(s => s.id === id)?.url || SOUND_OPTIONS[0].url;
}

/**
 * Lê a config de notificação e retorna a URL e o volume a usar para "novo pedido".
 * Respeita soundEnabled: se false, volume 0 (silencia sem alterar a URL).
 */
export function getNotificationSoundConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { url: SOUND_OPTIONS[0].url, volume: 0.8 };
    const c = JSON.parse(raw);
    if (c.soundEnabled === false) return { url: SOUND_OPTIONS[0].url, volume: 0 };
    const id = c.soundNewOrder || c.selectedSound || 'phone_classic';
    const vol = (c.soundVolume ?? c.volume ?? 80) / 100;
    const url = getSoundUrl(id, c.customSoundUrl);
    return { url, volume: vol };
  } catch {
    return { url: SOUND_OPTIONS[0].url, volume: 0.8 };
  }
}
