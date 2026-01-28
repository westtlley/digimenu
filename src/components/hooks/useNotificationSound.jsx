import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook para controlar sons de notificação
 * Garante que apenas um som toque por vez
 */
export function useNotificationSound() {
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Criar elemento de áudio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 1.0;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && !isPlayingRef.current) {
      audioRef.current.play().catch(() => {});
      isPlayingRef.current = true;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      isPlayingRef.current = false;
    }
  }, []);

  const isPlaying = useCallback(() => {
    return isPlayingRef.current;
  }, []);

  return { play, stop, isPlaying };
}