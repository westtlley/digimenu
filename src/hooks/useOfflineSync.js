import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { syncQueue, isOnline, onOnlineStatusChange } from '@/utils/offlineStorage';

export function useOfflineSync() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Listener de mudança de status
    const handleStatusChange = (isOnline) => {
      setOnline(isOnline);
      if (isOnline) {
        // Sincronizar quando voltar online
        syncData();
      }
    };

    onOnlineStatusChange(handleStatusChange);

    // Sincronizar imediatamente se estiver online
    if (online) {
      syncData();
    }

    // Sincronizar periodicamente (a cada 30 segundos)
    const interval = setInterval(() => {
      if (online && !syncing) {
        syncData();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [online, syncing]);

  const syncData = async () => {
    if (syncing || !online) return;
    
    setSyncing(true);
    try {
      await syncQueue(base44);
    } catch (error) {
      console.error('[Offline] Erro na sincronização:', error);
    } finally {
      setSyncing(false);
    }
  };

  return {
    online,
    syncing,
    syncData
  };
}
