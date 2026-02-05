// Gerenciamento de armazenamento offline com IndexedDB
const DB_NAME = 'DigiMenuGarcom';
const DB_VERSION = 1;
const STORES = {
  COMANDAS: 'comandas',
  WAITER_CALLS: 'waiter_calls',
  SYNC_QUEUE: 'sync_queue'
};

let db = null;

// Abrir conexão com IndexedDB
export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[Offline] Erro ao abrir IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[Offline] IndexedDB aberto com sucesso');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store de comandas
      if (!database.objectStoreNames.contains(STORES.COMANDAS)) {
        const comandaStore = database.createObjectStore(STORES.COMANDAS, {
          keyPath: 'id',
          autoIncrement: false
        });
        comandaStore.createIndex('status', 'status', { unique: false });
        comandaStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Store de chamadas de garçom
      if (!database.objectStoreNames.contains(STORES.WAITER_CALLS)) {
        const callStore = database.createObjectStore(STORES.WAITER_CALLS, {
          keyPath: 'id',
          autoIncrement: false
        });
        callStore.createIndex('status', 'status', { unique: false });
        callStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Store de fila de sincronização
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Salvar comanda offline
export async function saveComandaOffline(comanda) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORES.COMANDAS], 'readwrite');
    const store = transaction.objectStore(STORES.COMANDAS);
    
    await store.put({
      ...comanda,
      _offline: true,
      _synced: false,
      _timestamp: new Date().toISOString()
    });

    // Adicionar à fila de sincronização
    await addToSyncQueue('comanda', comanda, 'create');

    console.log('[Offline] Comanda salva offline:', comanda.id);
    return comanda;
  } catch (error) {
    console.error('[Offline] Erro ao salvar comanda offline:', error);
    throw error;
  }
}

// Atualizar comanda offline
export async function updateComandaOffline(comanda) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORES.COMANDAS], 'readwrite');
    const store = transaction.objectStore(STORES.COMANDAS);
    
    await store.put({
      ...comanda,
      _offline: true,
      _synced: false,
      _timestamp: new Date().toISOString()
    });

    // Adicionar à fila de sincronização
    await addToSyncQueue('comanda', comanda, 'update');

    console.log('[Offline] Comanda atualizada offline:', comanda.id);
    return comanda;
  } catch (error) {
    console.error('[Offline] Erro ao atualizar comanda offline:', error);
    throw error;
  }
}

// Buscar comandas offline
export async function getComandasOffline() {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORES.COMANDAS], 'readonly');
    const store = transaction.objectStore(STORES.COMANDAS);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const comandas = request.result || [];
        console.log('[Offline] Comandas carregadas:', comandas.length);
        resolve(comandas);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Offline] Erro ao buscar comandas offline:', error);
    return [];
  }
}

// Salvar chamada de garçom offline
export async function saveWaiterCallOffline(call) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORES.WAITER_CALLS], 'readwrite');
    const store = transaction.objectStore(STORES.WAITER_CALLS);
    
    await store.put({
      ...call,
      _offline: true,
      _synced: false,
      _timestamp: new Date().toISOString()
    });

    // Adicionar à fila de sincronização
    await addToSyncQueue('waiter_call', call, 'create');

    console.log('[Offline] Chamada salva offline:', call.id);
    return call;
  } catch (error) {
    console.error('[Offline] Erro ao salvar chamada offline:', error);
    throw error;
  }
}

// Adicionar à fila de sincronização
async function addToSyncQueue(type, data, action) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    
    await store.add({
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
      retries: 0
    });

    console.log('[Offline] Adicionado à fila de sincronização:', type, action);
  } catch (error) {
    console.error('[Offline] Erro ao adicionar à fila:', error);
  }
}

// Sincronizar fila quando voltar online
export async function syncQueue(base44) {
  if (!navigator.onLine) {
    console.log('[Offline] Ainda offline, aguardando...');
    return;
  }

  try {
    const database = await openDB();
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    
    const queue = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (queue.length === 0) {
      console.log('[Offline] Nada para sincronizar');
      return;
    }

    console.log('[Offline] Sincronizando', queue.length, 'itens...');

    for (const item of queue) {
      try {
        if (item.type === 'comanda') {
          if (item.action === 'create') {
            await base44.entities.Comanda.create(item.data);
          } else if (item.action === 'update') {
            await base44.entities.Comanda.update(item.data.id, item.data);
          }
        } else if (item.type === 'waiter_call') {
          if (item.action === 'create') {
            await base44.entities.WaiterCall.create(item.data);
          }
        }

        // Remover da fila após sincronização bem-sucedida
        await new Promise((resolve, reject) => {
          const deleteRequest = store.delete(item.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });

        console.log('[Offline] Item sincronizado:', item.id);
      } catch (error) {
        console.error('[Offline] Erro ao sincronizar item:', item.id, error);
        // Incrementar tentativas
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 3) {
          await store.put(item);
        } else {
          // Remover após 3 tentativas falhadas
          await store.delete(item.id);
        }
      }
    }

    console.log('[Offline] Sincronização concluída');
  } catch (error) {
    console.error('[Offline] Erro na sincronização:', error);
  }
}

// Verificar se está online
export function isOnline() {
  return navigator.onLine;
}

// Listener de mudança de status online/offline
export function onOnlineStatusChange(callback) {
  window.addEventListener('online', () => {
    console.log('[Offline] Conexão restaurada');
    callback(true);
  });
  
  window.addEventListener('offline', () => {
    console.log('[Offline] Conexão perdida');
    callback(false);
  });
}
