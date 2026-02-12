# 🧪 Lista Completa de Funcionalidades para Teste - Sistema de Garçom

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 📱 **1. APP DO GARÇOM** (`/Garcom`)

#### 1.1. Interface Principal
- [ ] Acesso restrito apenas para perfil "garcom" ou master
- [ ] Header com logo e botão de sair
- [ ] Estatísticas rápidas (Total, Abertas, Fechadas, Total Geral)
- [ ] Busca por código, mesa ou cliente
- [ ] Filtros por status (Abertas, Fechadas, Todas)
- [ ] Cards de comandas com informações principais
- [ ] Botão FAB (Floating Action Button) para nova comanda

#### 1.2. WebSocket - Tempo Real
- [ ] Comandas atualizam automaticamente sem refresh
- [ ] Notificações quando garçom adiciona itens
- [ ] Atualização instantânea ao criar/editar comanda

#### 1.3. Notificações de Chamadas
- [ ] Badge de chamadas pendentes aparece no topo
- [ ] Som de notificação quando cliente chama garçom
- [ ] Vibração (se disponível no dispositivo)
- [ ] Notificação do navegador
- [ ] Botão "Histórico" para ver todas as chamadas
- [ ] Botão "Limpar" para remover notificações

#### 1.4. Histórico de Chamadas
- [ ] Modal com todas as chamadas (pendentes e atendidas)
- [ ] Exibe mesa, data/hora da chamada
- [ ] Mostra tempo de resposta (se atendida)
- [ ] Mostra quem atendeu (se atendida)
- [ ] Badge de status (Pendente/Atendida)

#### 1.5. Relatórios e Analytics
- [ ] Card "Comandas Hoje" - quantidade de comandas criadas hoje
- [ ] Card "Valor Total Hoje" - soma de todas as comandas de hoje
- [ ] Card "Ticket Médio" - média de valor por comanda hoje
- [ ] Cards com gradientes e ícones visuais

---

### 📋 **2. GERENCIAMENTO DE COMANDAS** (`ComandasTab`)

#### 2.1. Lista de Comandas
- [ ] Visualização em cards (mobile-friendly)
- [ ] Filtros por status (Todas, Abertas, Fechadas, Canceladas)
- [ ] Busca por código, mesa ou cliente
- [ ] Estatísticas no topo (abertas, fechadas, total)

#### 2.2. Criar Comanda
- [ ] Modal de criação
- [ ] Campos: Mesa, Cliente, Telefone
- [ ] Adicionar itens do cardápio
- [ ] Editar quantidade e preço dos itens
- [ ] Remover itens
- [ ] Cálculo automático do total
- [ ] Geração automática de código (C-001, C-002...)

#### 2.3. Editar Comanda
- [ ] Modal de edição
- [ ] Alterar mesa, cliente, telefone
- [ ] Adicionar/remover/editar itens
- [ ] Atualização do total automaticamente
- [ ] Histórico de alterações registrado

#### 2.4. Fechar Comanda
- [ ] Modal de fechamento
- [ ] **Dividir Conta (Split):**
  - [ ] Checkbox para ativar divisão
  - [ ] Campo para número de pessoas
  - [ ] Cálculo automático do valor por pessoa
  - [ ] Exibição do valor por pessoa
- [ ] **Gorjeta:**
  - [ ] Seleção de tipo (Nenhuma, Percentual, Fixo)
  - [ ] Campo para valor/percentual
  - [ ] Cálculo automático da gorjeta
  - [ ] Total com gorjeta incluída
- [ ] **Múltiplas Formas de Pagamento:**
  - [ ] Adicionar múltiplas formas (PIX, Dinheiro, Cartão)
  - [ ] Valor por forma de pagamento
  - [ ] Cálculo de troco
  - [ ] Validação: total pago >= total comanda
- [ ] Confirmação antes de fechar
- [ ] Histórico de pagamentos registrado

#### 2.5. Transferir Itens Entre Comandas
- [ ] Botão "Transferir" no card da comanda
- [ ] Modal de transferência
- [ ] Seleção de múltiplos itens (checkboxes)
- [ ] Seleção de comanda destino
- [ ] Resumo do que será transferido
- [ ] Atualização automática dos totais
- [ ] Histórico de transferência registrado em ambas comandas

#### 2.6. Imprimir Comanda
- [ ] Botão "Imprimir" no card da comanda
- [ ] Abre janela de impressão
- [ ] Formato adequado para impressora térmica (80mm)
- [ ] Exibe: código, mesa, cliente, itens, total
- [ ] Data e hora da impressão

#### 2.7. Histórico da Comanda
- [ ] Modal com histórico completo
- [ ] Todas as ações registradas (criada, editada, fechada, transferida)
- [ ] Data/hora de cada ação
- [ ] Quem realizou cada ação
- [ ] Detalhes das alterações

#### 2.8. Cancelar Comanda
- [ ] Confirmação antes de cancelar
- [ ] Status muda para "cancelada"
- [ ] Histórico registra cancelamento

---

### 🪑 **3. GESTÃO DE MESAS** (`TablesTab`)

#### 3.1. Lista de Mesas
- [ ] Visualização em grid (cards)
- [ ] Status visual (Disponível, Ocupada, Reservada, Limpeza)
- [ ] Informações: número, capacidade, localização

#### 3.2. Criar/Editar Mesa
- [ ] Modal de criação/edição
- [ ] Campos: Número, Capacidade, Status, Localização
- [ ] Geração automática de QR Code

#### 3.3. QR Code
- [ ] Botão "QR Code" no card da mesa
- [ ] Modal com QR Code gerado
- [ ] Link correto com slug do estabelecimento
- [ ] Botão para baixar QR Code (PNG)

#### 3.4. Visualizar Comandas por Mesa
- [ ] Botão "Comandas" no card da mesa
- [ ] Modal com informações da mesa
- [ ] Lista de comandas abertas na mesa
- [ ] Estatísticas: quantidade de comandas, total de itens, valor total
- [ ] Detalhes de cada comanda (código, cliente, itens, total)

#### 3.5. Reservas de Mesa
- [ ] Botão "Reservar" no card da mesa (quando disponível)
- [ ] Modal de reserva
- [ ] Campos: Nome do cliente, Telefone, Data, Horário, Número de convidados
- [ ] Validação de data (não pode ser no passado)
- [ ] Status da mesa muda para "Reservada"
- [ ] Exibição da reserva no card da mesa:
  - [ ] Badge "Reservada"
  - [ ] Nome do cliente
  - [ ] Data e horário da reserva
  - [ ] Número de convidados
- [ ] Botão "Cancelar" para cancelar reserva
- [ ] Confirmação antes de cancelar
- [ ] Status volta para "Disponível" ao cancelar

#### 3.6. Status Automático
- [ ] Mesa muda para "Ocupada" automaticamente ao criar comanda
- [ ] Mesa muda para "Disponível" automaticamente ao fechar todas as comandas
- [ ] Atualização em tempo real via WebSocket

---

### 🔔 **4. CHAMADAS DE GARÇOM**

#### 4.1. Cliente Chama Garçom
- [ ] Botão "Chamar Garçom" na página do cardápio da mesa (`/mesa/:numero`)
- [ ] Chamada registrada no sistema
- [ ] Status: "pending"

#### 4.2. Notificação no App do Garçom
- [ ] Notificação aparece imediatamente
- [ ] Som de alerta
- [ ] Vibração (se disponível)
- [ ] Notificação do navegador
- [ ] Badge com número de chamadas pendentes

#### 4.3. Histórico de Chamadas
- [ ] Todas as chamadas listadas
- [ ] Filtro por status (pendente/atendida)
- [ ] Tempo de resposta calculado
- [ ] Informações de quem atendeu

---

### ⚡ **5. WEBSOCKET - TEMPO REAL**

#### 5.1. Comandas
- [ ] Atualização automática sem refresh
- [ ] Notificações quando itens são adicionados
- [ ] Sincronização entre múltiplos dispositivos

#### 5.2. Mesas
- [ ] Status atualizado em tempo real
- [ ] Mudanças de status propagadas instantaneamente

#### 5.3. Chamadas
- [ ] Chamadas aparecem instantaneamente
- [ ] Notificações em tempo real

---

## 📊 **ESTATÍSTICAS E RELATÓRIOS**

### 6.1. App do Garçom
- [ ] Comandas Hoje (quantidade)
- [ ] Valor Total Hoje
- [ ] Ticket Médio

### 6.2. ComandasTab
- [ ] Total de comandas
- [ ] Comandas abertas
- [ ] Comandas fechadas
- [ ] Valor total geral

---

## 🎯 **FLUXOS COMPLETOS PARA TESTAR**

### Fluxo 1: Criar e Fechar Comanda
1. [ ] Criar nova comanda
2. [ ] Adicionar itens
3. [ ] Editar itens (quantidade, preço)
4. [ ] Adicionar gorjeta (percentual)
5. [ ] Dividir conta (2 pessoas)
6. [ ] Adicionar múltiplas formas de pagamento
7. [ ] Fechar comanda
8. [ ] Verificar histórico
9. [ ] Imprimir comanda

### Fluxo 2: Transferir Itens
1. [ ] Criar comanda A (mesa 1)
2. [ ] Criar comanda B (mesa 2)
3. [ ] Adicionar itens na comanda A
4. [ ] Transferir alguns itens de A para B
5. [ ] Verificar totais atualizados
6. [ ] Verificar histórico em ambas comandas

### Fluxo 3: Reserva de Mesa
1. [ ] Criar mesa
2. [ ] Reservar mesa (nome, telefone, data, horário)
3. [ ] Verificar status "Reservada"
4. [ ] Verificar informações da reserva no card
5. [ ] Cancelar reserva
6. [ ] Verificar status volta para "Disponível"

### Fluxo 4: Chamadas de Garçom
1. [ ] Cliente acessa cardápio da mesa
2. [ ] Cliente clica em "Chamar Garçom"
3. [ ] Verificar notificação no App do Garçom
4. [ ] Verificar som e vibração
5. [ ] Abrir histórico de chamadas
6. [ ] Verificar tempo de resposta (quando atendida)

### Fluxo 5: WebSocket Tempo Real
1. [ ] Abrir App do Garçom em 2 dispositivos
2. [ ] Criar comanda no dispositivo 1
3. [ ] Verificar atualização automática no dispositivo 2
4. [ ] Adicionar item no dispositivo 1
5. [ ] Verificar atualização no dispositivo 2
6. [ ] Fechar comanda no dispositivo 1
7. [ ] Verificar atualização no dispositivo 2

---

## 🔍 **VALIDAÇÕES IMPORTANTES**

### Validações de Comanda
- [ ] Não pode fechar comanda sem pagamento completo
- [ ] Não pode fechar comanda sem itens
- [ ] Total calculado corretamente (itens + gorjeta)
- [ ] Troco calculado corretamente
- [ ] Código gerado automaticamente

### Validações de Mesa
- [ ] Não pode reservar mesa já ocupada
- [ ] Data de reserva não pode ser no passado
- [ ] Número de convidados não pode exceder capacidade
- [ ] Status atualiza automaticamente

### Validações de Transferência
- [ ] Não pode transferir para comanda fechada
- [ ] Totais atualizados corretamente
- [ ] Histórico registrado em ambas comandas

---

## 📱 **RESPONSIVIDADE**

- [ ] Layout funciona bem em mobile
- [ ] Botões com tamanho adequado para touch
- [ ] Modais fullscreen em mobile
- [ ] Cards responsivos
- [ ] Grid adaptativo

---

## ⚠️ **PONTOS DE ATENÇÃO**

1. **WebSocket**: Pode não funcionar em ambiente local sem configuração adequada
2. **Impressão**: Requer impressora configurada no sistema
3. **Notificações**: Requer permissão do navegador
4. **Vibração**: Funciona apenas em dispositivos móveis

---

## ✅ **CHECKLIST FINAL**

- [ ] Todas as funcionalidades de alta prioridade testadas
- [ ] Todas as funcionalidades de média prioridade testadas
- [ ] Reservas de mesa funcionando
- [ ] Relatórios exibindo dados corretos
- [ ] Impressão funcionando
- [ ] WebSocket funcionando (se configurado)
- [ ] Notificações funcionando
- [ ] Responsividade verificada

---

**Total de Funcionalidades: 50+**

**Status:** Sistema completo e pronto para testes! 🎉
