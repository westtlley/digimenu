# Melhorias para o Gestor de Pedidos e Ferramentas Úteis

## O que já existe

| Recurso | Onde | Status |
|---------|------|--------|
| Kanban com drag & drop | `EnhancedKanbanBoard` | ✅ |
| Dashboard de métricas | `GestorStatsPanel` | ✅ (trends fixos) |
| Filtros e busca | `AdvancedOrderFilters` | ✅ |
| Mapa de entregadores | `DeliveryPanel` + `MultiDeliveryTrackingMap` | ✅ |
| Aceitar / status no modal | `OrderDetailModal` | ✅ |
| Aceite automático | `GestorSettings` (auto_accept) | ✅ |
| Notificações (som, browser) | `NotificationSettings` / `NotificationConfig` | ✅ |
| Chat com entregador | `OrderChatModal` | ✅ |
| Solicitação de alteração do cliente | `OrderDetailModal` | ✅ |
| Otimizador de rota | `RouteOptimizer` | ✅ |
| Config. impressora | `PrinterConfig` | ✅ |
| Resumo financeiro do dia | `FinancialDashboard` | ⚠️ (não integrado na tela principal) |

---

## Melhorias para aplicar (priorizadas)

### Alta prioridade

1. **Dashboard de métricas – dados reais**
   - **Problema:** Em `GestorStatsPanel`, "Pedidos Hoje" usa `change: '+15%'` e "Receita Hoje" `change: '+22%'` fixos.
   - **Ação:** Calcular variação em relação a ontem (ou semana passada) e exibir % real. Se não houver dados, esconder ou mostrar "—".

2. **Ticket médio no StatsPanel**
   - **Problema:** Só há Receita e Pedidos Hoje; falta ticket médio.
   - **Ação:** Incluir card "Ticket Médio" (Receita Hoje / Pedidos Entregues) no grid do `GestorStatsPanel`.

3. **Gráfico de pedidos por hora**
   - **Problema:** Apenas números; não há visão por hora.
   - **Ação:** Adicionar gráfico (recharts) no `GestorStatsPanel`: eixo X = hora (0–23), eixo Y = quantidade de pedidos criados no dia.

4. **Atalhos de teclado no Kanban**
   - **Ação:** No `EnhancedKanbanBoard` / `GestorPedidos`:
     - `1–4`: mudar status do pedido selecionado (1=aceitar, 2=pronto, 3=em rota, 4=entregue) ou focar primeira ação do modal.
     - `Ctrl+F`: focar busca.
     - `Esc`: fechar modal.
   - Manter indicação discreta (ex.: "1–4: status | Esc: fechar") no canto da tela ou no modal.

5. **Alertas de atraso visíveis no Kanban**
   - **Já existe:** `isLate` em `EnhancedKanbanBoard` (badge "Atrasado").
   - **Melhorar:** Aumentar contraste (borda/ fundo) e, se atraso > 15 min, um pequeno ícone de sino ou tooltip com "Há X min".

---

### Média prioridade

6. **Integrar FinancialDashboard na tela principal**
   - **Ação:** Aba ou seção "Resumo" no gestor com `FinancialDashboard` (faturamento, pedidos, ticket, por forma de pagamento).

7. **Exportar pedidos (CSV/PDF)**
   - **Ação:** Botão "Exportar" em `AdvancedOrderFilters` ou no header:
     - CSV: código, cliente, status, total, data (com `papaparse` ou `downloadCSV`).
     - PDF: resumo do dia (jspdf) com totais e, se fizer sentido, lista de pedidos.

8. **Filtro por entregador**
   - **Ação:** Em `AdvancedOrderFilters`, select "Entregador" (Todos / lista de entregadores) e filtrar `orders` por `entregador_id`.

9. **Tempo de preparo sugerido por histórico**
   - **Ideia:** Calcular média de `ready_at - accepted_at` dos últimos N pedidos e sugerir `prep_time` ao aceitar (com opção de editar).
   - **Onde:** No `OrderDetailModal` ou no fluxo de aceite.

10. **Permitir reordenação manual de pedidos na coluna**
    - **Ação:** Dentro de cada coluna do Kanban, permitir reordenar (ex.: priorizar um pedido no topo) apenas na UI; ou, se houver campo `priority`/`order` no backend, refletir ao reordenar.

---

### Baixa prioridade

11. **Modo compacto do Kanban**
    - Toggle "Compacto" que reduz padding, fontes e altura dos cards para ver mais pedidos.

12. **Cores por prioridade/urgência**
    - Campo `priority` (alta/média/baixa) ou `scheduled` e exibir borda/cor diferente no card.

13. **WebSockets / polling adaptativo**
    - Reduzir `refetchInterval` quando houver muitos pedidos "new" ou quando o usuário estiver ativo; aumentar quando estiver inativo.

14. **Histórico de alterações do pedido**
    - Log de mudanças de status (quem, quando) no `OrderDetailModal`; precisa de suporte no backend (ex.: `OrderLog` ou campo `status_history`).

---

## Ferramentas úteis (existentes e sugestões)

### Já no projeto

| Ferramenta | Componente | Uso |
|------------|------------|-----|
| Otimizador de rota | `RouteOptimizer` | Definir melhor sequência de entregas para um entregador. |
| Config. impressora | `PrinterConfig` | Impressora térmica, margens, tamanho de papel, teste. |
| Resumo financeiro | `FinancialDashboard` | Faturamento, pedidos, ticket, por forma de pagamento. |
| Chat com entregador | `OrderChatModal` | Mensagens por pedido. |
| Avaliação de entregador | `EntregadorRating` | Nota e comentário após entrega. |
| Atribuição automática | `AutoAssignModal` | Atribuir por proximidade/disponibilidade. |

### Sugestões de novas ferramentas

1. **Fila de impressão (comanda)**
   - Fila local (ex.: `localStorage` ou state) de pedidos a imprimir.
   - Botão "Imprimir comanda" em cada card/modal e "Imprimir todos pendentes" no header.
   - Evita imprimir duas vezes o mesmo pedido (marcar como "impresso").

2. **Timer por pedido no Kanban**
   - No card: "Há X min" desde `created_date` ou `accepted_at`.
   - Atualizar a cada 1 min (setInterval leve ou um único timer global).

3. **Agrupamento por horário de entrega**
   - Filtro ou subview: "Agendados para 12h", "Agendados para 13h", etc., usando `scheduled_time`.
   - Ajuda em picos de almoço/jantar.

4. **Relatório rápido do dia (PDF)**
   - Uma página: totais, pedidos por status, por forma de pagamento, lista dos pedidos.
   - Usar `jspdf` (já no projeto). Botão "Relatório do dia" no header ou em Configurações.

5. **Notas internas por pedido**
   - Campo `internal_notes` (ou `gestor_notes`) no pedido.
   - Exibir e editar no `OrderDetailModal`; não enviar para cliente/entregador.

6. **Duplicar pedido**
   - Botão "Clonar" no modal: cria rascunho/novo pedido com mesmos itens e endereço (cliente e dados de pagamento podem ser limpos ou reaproveitados, conforme regra).

7. **Integração com WhatsApp (estado do pedido)**
   - Botão "Enviar status ao cliente" no modal: gera mensagem com status atual e, se existir, previsão. Envia via `https://wa.me/55...` com `text=` encodado.
   - Não precisa de API; só de ter o telefone em `customer_phone`.

8. **Visão “Pizza de preparo”**
   - Gráfico de pizza: Em preparo / Prontos / Em rota / Entregues (só pedidos do dia).
   - Opcional: ao clicar na fatia, filtrar o Kanban por aquele status.

9. **Atalho para o Mapa (Delivery Panel)**
   - No `OrderDetailModal`, se o pedido tiver entrega e endereço/coords: botão "Ver no mapa" que abre o `DeliveryPanel` (ou um mapa inline) com o pedido/entregador em evidência.

10. **Modo “Só novos”**
    - Toggle "Só novos" no header: quando ativo, o Kanban e a lista mostram apenas `status === 'new'` e o contador de novos em destaque. Desliga ao aceitar/atender.

---

## Resumo de próximos passos

| # | Melhoria | Onde mexer | Esforço |
|---|----------|------------|---------|
| 1 | Métricas reais (trends) | `GestorStatsPanel` | Pequeno |
| 2 | Ticket médio no Stats | `GestorStatsPanel` | Pequeno |
| 3 | Gráfico pedidos por hora | `GestorStatsPanel` | Médio |
| 4 | Atalhos 1–4, Ctrl+F, Esc | `GestorPedidos`, `EnhancedKanbanBoard`, `OrderDetailModal` | Pequeno |
| 5 | Reforçar alerta de atraso | `EnhancedKanbanBoard` | Pequeno |
| 6 | Integrar FinancialDashboard | `GestorPedidos` (aba/seção) | Pequeno |
| 7 | Exportar CSV/PDF | Novo util + botão no header/filtros | Médio |
| 8 | Filtro por entregador | `AdvancedOrderFilters` | Pequeno |
| 9 | Timer "Há X min" no card | `EnhancedKanbanBoard` | Pequeno |
| 10 | Notas internas no pedido | Backend + `OrderDetailModal` | Médio |

---

## Dependências já disponíveis

- **recharts** – gráficos (pedidos por hora, pizza).
- **jspdf** – PDF (relatório do dia, exportar).
- **date-fns** – datas e "Há X min".
- **framer-motion** – animações (já em uso).
- **@hello-pangea/dnd** – drag & drop (já no Kanban).

Se quiser, posso detalhar a implementação de algum item (por exemplo: 1, 2, 4 e 9) em código passo a passo.
