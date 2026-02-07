# 📋 Plano de Implementação - Funcionalidades Solicitadas

## 🎯 Funcionalidades a Implementar

### 1. **Gerenciamento de Ganhos dos Entregadores**
- **Assinante:**
  - Configurar forma de remuneração (fixa, por entrega, por distância, percentual)
  - Definir métricas e valores
  - Visualizar relatórios de ganhos por entregador
- **Entregador:**
  - Visualizar ganhos no app
  - Histórico de ganhos por período
  - Estatísticas de ganhos

### 2. **Gorjetas dos Garçons**
- **Assinante:**
  - Gerenciar configurações de gorjetas
  - Visualizar relatórios de gorjetas
- **Cardápio de Mesas:**
  - Campo opcional para cliente pagar gorjetas
- **App Garçom:**
  - Visualizar valores ganhos por período
  - Histórico de gorjetas

### 3. **Avaliações de Clientes**
- **Perfil do Cliente:**
  - Campo para sugestões e feedbacks
- **Final dos Pedidos:**
  - Sistema de estrelas (1-5)
  - Campo para descrição do feedback
- **Painel do Assinante:**
  - Acompanhar todas as avaliações
  - Filtros e relatórios

### 4. **Perfil Gerente**
- **Novo perfil de colaborador:**
  - Acesso ao painel com limitações
  - Gerenciar configurações do estabelecimento
  - Acesso às ferramentas para auxiliar outros perfis
  - **Limitações sugeridas:**
    - ❌ Não pode alterar plano ou assinatura
    - ❌ Não pode deletar dados críticos
    - ❌ Não pode acessar configurações financeiras avançadas
    - ✅ Pode gerenciar cardápio, pedidos, colaboradores
    - ✅ Pode acessar relatórios e analytics
    - ✅ Pode configurar loja, tema, impressora
    - ✅ Pode gerenciar mesas, comandas, PDV

---

## 📊 Estrutura de Dados

### Novas Entidades Necessárias:

1. **DeliveryEarningsConfig** (Configuração de Remuneração)
   - `subscriber_email`
   - `remuneration_type` (fixed, per_delivery, per_distance, percentage)
   - `fixed_amount` (valor fixo)
   - `per_delivery_amount` (valor por entrega)
   - `per_km_amount` (valor por km)
   - `percentage` (percentual do pedido)
   - `min_amount` (valor mínimo)
   - `max_amount` (valor máximo)
   - `active` (boolean)

2. **DeliveryEarning** (Ganhos Registrados)
   - `entregador_id`
   - `order_id`
   - `amount` (valor ganho)
   - `calculation_type` (tipo de cálculo usado)
   - `distance_km` (distância percorrida)
   - `delivered_at` (data/hora da entrega)
   - `paid` (boolean - se foi pago)
   - `paid_at` (data/hora do pagamento)

3. **WaiterTip** (Gorjetas dos Garçons)
   - `garcom_id` (user_id do garçom)
   - `comanda_id` (ID da comanda)
   - `order_id` (ID do pedido, se houver)
   - `table_id` (ID da mesa)
   - `amount` (valor da gorjeta)
   - `tip_type` (percentual ou fixo)
   - `tip_percentage` (se percentual)
   - `paid_at` (data/hora do pagamento)
   - `customer_name` (nome do cliente, se disponível)

4. **CustomerFeedback** (Feedback do Cliente)
   - `customer_email`
   - `subscriber_email`
   - `feedback_type` (suggestion, complaint, praise, general)
   - `rating` (1-5 estrelas, opcional)
   - `message` (texto do feedback)
   - `order_id` (ID do pedido, se relacionado)
   - `created_at`

---

## 🔧 Implementação

### Fase 1: Estrutura de Dados
- [ ] Adicionar 'gerente' ao COLAB_ROLES
- [ ] Criar migrações para novas entidades
- [ ] Atualizar schema.sql

### Fase 2: Backend
- [ ] Endpoints para DeliveryEarningsConfig
- [ ] Endpoints para DeliveryEarning
- [ ] Endpoints para WaiterTip
- [ ] Endpoints para CustomerFeedback
- [ ] Lógica de cálculo de ganhos
- [ ] Permissões para perfil Gerente

### Fase 3: Frontend - Assinante
- [ ] Tab de Configuração de Ganhos dos Entregadores
- [ ] Tab de Gerenciamento de Gorjetas
- [ ] Tab de Avaliações de Clientes
- [ ] Ajustar permissões do perfil Gerente

### Fase 4: Frontend - Apps
- [ ] Visualização de ganhos no App Entregador
- [ ] Visualização de gorjetas no App Garçom
- [ ] Campo de gorjeta no checkout de mesas
- [ ] Campo de feedback no perfil do cliente
- [ ] Melhorar sistema de avaliação no final dos pedidos

---

## 🎨 Interface Sugerida

### Perfil Gerente - Limitações:
- ✅ **Pode:**
  - Gerenciar cardápio (criar, editar, ativar/desativar)
  - Gerenciar pedidos (visualizar, atualizar status, cancelar)
  - Gerenciar colaboradores (criar, editar, visualizar)
  - Acessar relatórios e analytics
  - Configurar loja, tema, impressora
  - Gerenciar mesas, comandas, PDV
  - Configurar zonas de entrega
  - Gerenciar cupons e promoções
  - Visualizar clientes

- ❌ **Não pode:**
  - Alterar plano ou assinatura
  - Deletar assinante
  - Acessar configurações financeiras avançadas (assinatura, pagamentos)
  - Acessar dados de outros assinantes
  - Alterar configurações de sistema
  - Acessar área de Admin Master
