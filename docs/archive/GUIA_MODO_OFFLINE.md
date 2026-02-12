# 📱 Guia: Modo Offline - Sistema de Garçom

## ✅ Implementação Completa

O modo offline foi implementado com **Service Worker** e **IndexedDB** para permitir que o sistema funcione mesmo sem conexão com a internet.

---

## 🔧 Componentes Implementados

### 1. **Service Worker** (`public/sw.js`)
- Cache de recursos estáticos
- Interceptação de requisições
- Sincronização em background
- Página offline customizada

### 2. **IndexedDB** (`src/utils/offlineStorage.js`)
- Armazenamento local de comandas
- Armazenamento de chamadas de garçom
- Fila de sincronização
- Funções de CRUD offline

### 3. **Hook de Sincronização** (`src/hooks/useOfflineSync.js`)
- Detecção de status online/offline
- Sincronização automática quando voltar online
- Sincronização periódica (30 segundos)

### 4. **Integração no App do Garçom**
- Indicador visual de status offline
- Salvamento automático offline
- Sincronização transparente

---

## 🚀 Como Funciona

### Quando Online:
1. Todas as operações são feitas normalmente via API
2. Dados são salvos no servidor
3. WebSocket funciona normalmente

### Quando Offline:
1. **Comandas são salvas localmente** no IndexedDB
2. **Chamadas de garçom são armazenadas** localmente
3. **Indicador visual** mostra status offline
4. **Fila de sincronização** armazena todas as operações

### Quando Voltar Online:
1. **Sincronização automática** inicia imediatamente
2. **Todos os dados offline** são enviados para o servidor
3. **Indicador de sincronização** mostra progresso
4. **Dados são atualizados** em tempo real

---

## 📋 Funcionalidades Offline

### ✅ Funciona Offline:
- ✅ Criar comandas
- ✅ Editar comandas
- ✅ Visualizar comandas salvas
- ✅ Receber chamadas de garçom (armazenadas localmente)
- ✅ Navegação básica

### ❌ Não Funciona Offline:
- ❌ WebSocket (requer conexão)
- ❌ Notificações em tempo real
- ❌ Sincronização com outros dispositivos
- ❌ Buscar dados do servidor

---

## 🔍 Como Testar

### 1. Ativar Modo Offline no Navegador:
- **Chrome DevTools**: F12 → Network → Throttling → Offline
- **Firefox DevTools**: F12 → Network → Throttling → Offline
- **Safari**: Develop → Offline

### 2. Testar Funcionalidades:
1. ✅ Criar uma comanda (deve salvar offline)
2. ✅ Editar comanda (deve atualizar offline)
3. ✅ Verificar indicador de status offline
4. ✅ Voltar online (deve sincronizar automaticamente)

### 3. Verificar IndexedDB:
- **Chrome DevTools**: F12 → Application → IndexedDB → DigiMenuGarcom
- Verificar stores: `comandas`, `waiter_calls`, `sync_queue`

---

## 🛠️ Configuração

### Service Worker já está registrado automaticamente em `src/main.jsx`

### Não é necessário configurar nada adicional!

---

## 📊 Estrutura de Dados

### IndexedDB Stores:

1. **`comandas`**
   - Armazena comandas criadas/editadas offline
   - Campos: `id`, `code`, `items`, `total`, `status`, etc.
   - Campos especiais: `_offline`, `_synced`, `_timestamp`

2. **`waiter_calls`**
   - Armazena chamadas de garçom offline
   - Campos: `id`, `table_id`, `table_number`, `status`, etc.

3. **`sync_queue`**
   - Fila de sincronização
   - Campos: `type`, `action`, `data`, `timestamp`, `retries`

---

## 🔄 Fluxo de Sincronização

1. **Usuário cria/edita comanda offline**
   → Salva no IndexedDB
   → Adiciona à fila de sincronização

2. **Conexão restaurada**
   → Hook detecta mudança de status
   → Inicia sincronização automática

3. **Sincronização**
   → Processa fila de sincronização
   → Envia dados para API
   → Remove da fila após sucesso
   → Atualiza interface

4. **Falha na sincronização**
   → Incrementa contador de tentativas
   → Tenta novamente (máx. 3 tentativas)
   → Remove após 3 falhas

---

## ⚠️ Limitações

1. **IDs Temporários**: Comandas criadas offline recebem IDs temporários (`offline_${timestamp}`)
2. **Sem Validação de Servidor**: Validações do servidor não são executadas offline
3. **Conflitos**: Se duas comandas forem criadas offline com o mesmo código, pode haver conflito
4. **Tamanho do Cache**: IndexedDB tem limite de armazenamento (geralmente 50MB-1GB)

---

## 🎯 Melhorias Futuras

- [ ] Resolução de conflitos automática
- [ ] Sincronização incremental
- [ ] Compressão de dados
- [ ] Indicador de progresso de sincronização
- [ ] Sincronização manual (botão)
- [ ] Logs de sincronização

---

## 📝 Notas Técnicas

- **Service Worker** funciona apenas em HTTPS (ou localhost)
- **IndexedDB** é assíncrono e baseado em eventos
- **Sincronização** acontece automaticamente quando voltar online
- **Cache** é atualizado automaticamente quando há nova versão

---

## ✅ Status

**Modo Offline: IMPLEMENTADO E FUNCIONAL** 🎉

O sistema agora funciona completamente offline e sincroniza automaticamente quando a conexão for restaurada!
