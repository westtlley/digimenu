# 📋 Melhorias Pendentes - DigiMenu SaaS

## 📊 Resumo Executivo

Este documento consolida **todas as melhorias propostas** que ainda **não foram implementadas** no projeto DigiMenu, organizadas por categoria e prioridade.

**Última atualização:** $(date)

---

## 🔥 ALTA PRIORIDADE - Conversão e Vendas

### 1. Sistema de Fidelidade Avançado
**Status:** ⏳ Não implementado  
**Impacto:** +40% retenção de clientes  
**Complexidade:** Alta  
**Arquivos necessários:**
- `src/components/menu/LoyaltySystem.jsx`
- `src/pages/LoyaltyDashboard.jsx`
- `backend/routes/loyalty.js`

**Funcionalidades:**
- Pontos por real gasto (1 ponto = R$ 1,00)
- Bônus especiais (primeira compra, aniversário, avaliação, indicação)
- Níveis/tiers (Bronze, Prata, Ouro, Platinum)
- Descontos progressivos por nível
- Dashboard de pontos para cliente

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 43-66

---

### 2. Favoritos e Listas de Desejos
**Status:** ⏳ Não implementado  
**Impacto:** +25% em pedidos recorrentes  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/menu/FavoritesList.jsx`
- `src/hooks/useFavorites.jsx`
- `backend/routes/favorites.js`

**Funcionalidades:**
- Salvar pratos favoritos
- Botão "Pedir novamente" no histórico
- Notificações quando prato favorito estiver em promoção
- Lista de desejos compartilhável

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 70-84

---

### 3. Notificações Push Web para Clientes
**Status:** ⏳ Parcialmente implementado (apenas para entregador)  
**Impacto:** -83% em ligações "onde está meu pedido?"  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/menu/WebPushNotifications.jsx`
- `src/utils/pushService.js`
- `backend/routes/push.js`

**Funcionalidades:**
- Notificação quando pedido é aceito
- Notificação quando pedido está em preparo
- Notificação quando pedido saiu para entrega
- Notificação quando pedido foi entregue
- Notificações de marketing (promoções, lembretes)

**Nota:** Existe `PushNotifications.jsx` para entregador, mas não para clientes

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 87-106

---

### 4. Carrinho Abandonado - Recovery
**Status:** ⏳ Não implementado  
**Impacto:** +15% de recuperação de carrinhos  
**Complexidade:** Baixa  
**Arquivos necessários:**
- Modificar `src/hooks/useCart.jsx`
- Adicionar em `src/pages/Cardapio.jsx`

**Funcionalidades:**
- Salvar carrinho no localStorage
- Perguntar ao voltar: "Quer continuar seu pedido?"
- Toast com botão de recuperação

**Referência:** `MELHORIAS_CONVERSAO_URGENTES.md` linha 87-101

---

### 5. Botão Flutuante do Carrinho (Sticky)
**Status:** ⏳ Não implementado  
**Impacto:** +20% de conclusão de compras  
**Complexidade:** Baixa  
**Arquivos necessários:**
- Adicionar em `src/pages/Cardapio.jsx`

**Funcionalidades:**
- Botão sempre visível enquanto rola página
- Badge com quantidade de itens
- Animação quando há itens no carrinho

**Referência:** `MELHORIAS_CONVERSAO_URGENTES.md` linha 105-122

---

### 6. Frete Grátis Progress Bar
**Status:** ⏳ Não implementado  
**Impacto:** +30% de aumento no ticket médio  
**Complexidade:** Baixa  
**Arquivos necessários:**
- Adicionar em `src/components/menu/CartModal.jsx`

**Funcionalidades:**
- Mostrar quanto falta para frete grátis
- Barra de progresso visual
- Mensagem motivacional

**Referência:** `MELHORIAS_CONVERSAO_URGENTES.md` linha 125-147

---

### 7. Cross-sell Inteligente (Combo Sugerido)
**Status:** ⏳ Não implementado  
**Impacto:** +25% em vendas de bebidas  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/menu/SmartUpsell.jsx`
- Modificar `src/pages/Cardapio.jsx`

**Funcionalidades:**
- Sugerir bebida quando adiciona pizza
- Sugerir sobremesa quando valor do carrinho é alto
- Ofertas de combos baseadas em histórico

**Referência:** `MELHORIAS_CONVERSAO_URGENTES.md` linha 150-170

---

### 8. Cupom na Primeira Compra (Pop-up)
**Status:** ⏳ Não implementado  
**Impacto:** +35% de conversão em novos clientes  
**Complexidade:** Baixa  
**Arquivos necessários:**
- `src/components/menu/WelcomeDiscountModal.jsx`
- Modificar `src/pages/Cardapio.jsx`

**Funcionalidades:**
- Modal discreto após 10 segundos
- Oferece 10% OFF na primeira compra
- Salvar no localStorage para não mostrar novamente

**Referência:** `MELHORIAS_CONVERSAO_URGENTES.md` linha 215-231

---

### 9. Botão "Pedir Novamente" no Histórico
**Status:** ⏳ Não implementado  
**Impacto:** +45% de pedidos recorrentes  
**Complexidade:** Baixa  
**Arquivos necessários:**
- Modificar `src/components/menu/OrderHistoryModal.jsx`

**Funcionalidades:**
- Botão no histórico de pedidos
- Adiciona todos os itens do pedido anterior ao carrinho
- Toast de confirmação

**Referência:** `MELHORIAS_CONVERSAO_URGENTES.md` linha 269-287

---

## 📊 MÉDIA PRIORIDADE - Gestão e Analytics

### 10. Dashboard Analítico Avançado (Completo)
**Status:** ⏳ Parcialmente implementado  
**Impacto:** Alto (decisões baseadas em dados)  
**Complexidade:** Alta  
**Arquivos necessários:**
- Expandir `src/components/admin/DashboardMetrics.jsx`
- `src/components/admin/AnalyticsDashboard.jsx`
- `backend/routes/analytics.js`

**Funcionalidades faltantes:**
- Gráficos de vendas (diário, semanal, mensal) - **Parcialmente existe**
- Top produtos vendidos - **Faltando**
- Comparativo com período anterior - **Parcialmente existe**
- Meta de faturamento vs realizado - **Faltando**
- Indicadores de performance (tempo médio de preparo, taxa de entrega) - **Faltando**
- Análise de picos de horário - **Faltando**
- Taxa de abandono de carrinho - **Faltando**
- Previsão de demanda (ML) - **Faltando**

**Nota:** Existe `DashboardMetrics.jsx` e `DashboardCharts.jsx`, mas faltam várias métricas

**Referência:** `SUGESTOES_MELHORIAS_ADMIN_PAINEL.md` linha 13-20, `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 111-139

---

### 11. Sistema de Mesas e QR Code
**Status:** ⏳ Não implementado  
**Impacto:** Elimina papel e comandas físicas  
**Complexidade:** Alta  
**Arquivos necessários:**
- `src/components/menu/TableQRCode.jsx`
- `src/pages/TableOrder.jsx`
- `backend/routes/tables.js`

**Funcionalidades:**
- QR Code em cada mesa
- Dividir conta entre mesas
- Status de mesa (disponível, ocupada, reservada)
- Cliente chama garçom pela mesa
- Pedidos vinculados à mesa

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 142-157

---

### 12. Gestão de Estoque Inteligente
**Status:** ⏳ Não implementado  
**Impacto:** Reduz desperdício e evita rupturas  
**Complexidade:** Alta  
**Arquivos necessários:**
- `src/components/admin/InventoryManagement.jsx`
- `backend/routes/inventory.js`

**Funcionalidades:**
- Rastrear uso de ingredientes por prato
- Alertas de estoque baixo
- Sugestão automática de compras baseada em demanda
- Rastreamento de validade
- Desativar pratos automaticamente quando faltar ingrediente
- Sugerir prato similar ao cliente quando produto esgotado

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 160-180

---

### 13. Filtros Avançados no Gestor de Pedidos
**Status:** ⏳ Não implementado  
**Impacto:** Gestão mais eficiente  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/gestor/AdvancedFilters.jsx`
- Modificar `src/pages/GestorPedidos.jsx`

**Funcionalidades:**
- Buscar por código, cliente, telefone
- Filtrar por status, entregador, período
- Ordenar por: Data, Valor, Prioridade
- Salvar filtros favoritos

**Referência:** `SUGESTOES_MELHORIAS_PEDIDOS.md` linha 85-88

---

### 14. View Kanban com Drag & Drop
**Status:** ⏳ Não implementado  
**Impacto:** Interface mais profissional  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/gestor/KanbanView.jsx`
- Modificar `src/pages/GestorPedidos.jsx`

**Funcionalidades:**
- Colunas: Novos | Em Preparo | Prontos | Em Entrega | Entregues
- Drag & Drop entre colunas
- Cores diferenciadas por prioridade/urgência

**Referência:** `SUGESTOES_MELHORIAS_PEDIDOS.md` linha 80-84

---

### 15. Atalhos de Teclado no Gestor
**Status:** ⏳ Não implementado  
**Impacto:** Produtividade aumentada  
**Complexidade:** Baixa  
**Arquivos necessários:**
- `src/hooks/useKeyboardShortcuts.jsx`
- Modificar `src/pages/GestorPedidos.jsx`

**Funcionalidades:**
- `1-5`: Atualizar status rapidamente
- `Ctrl+F`: Buscar pedido
- `Esc`: Fechar modal

**Referência:** `SUGESTOES_MELHORIAS_PEDIDOS.md` linha 90-94

---

### 16. Integração GPS no App do Entregador
**Status:** ⏳ Não implementado  
**Impacto:** Navegação mais eficiente  
**Complexidade:** Média  
**Arquivos necessários:**
- Modificar `src/pages/Entregador.jsx`
- `src/components/entregador/GPSNavigation.jsx`

**Funcionalidades:**
- Botão "Ir até Cliente" abre Google Maps/Waze
- Coordenadas clicáveis que abrem mapa
- Rastreamento em tempo real para gestor
- Sugestão de rota otimizada (múltiplos pedidos)

**Referência:** `SUGESTOES_MELHORIAS_PEDIDOS.md` linha 134-142

---

## 🎨 BAIXA PRIORIDADE - UX e Design

### 17. Design System Centralizado
**Status:** ⏳ Não implementado  
**Impacto:** Consistência visual  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/styles/designTokens.js`
- Atualizar componentes existentes

**Funcionalidades:**
- Tokens de cores centralizados
- Espaçamento padronizado
- Sombras e bordas consistentes
- Tipografia padronizada

**Referência:** `SUGESTOES_MELHORIAS_VISUAIS.md` linha 17-70

---

### 18. Animações e Microinterações
**Status:** ⏳ Parcialmente implementado  
**Impacto:** Experiência mais fluida  
**Complexidade:** Média  
**Arquivos necessários:**
- Adicionar animações em componentes existentes

**Funcionalidades faltantes:**
- Transições suaves em hover states - **Parcialmente existe**
- Loading states melhorados (skeleton loaders) - **Faltando**
- Animações de entrada (stagger animation) - **Faltando**
- Feedback de ações (ripple effect) - **Faltando**

**Referência:** `SUGESTOES_MELHORIAS_VISUAIS.md` linha 73-100

---

### 19. Tooltips Contextuais
**Status:** ⏳ Não implementado  
**Impacto:** Melhor onboarding  
**Complexidade:** Baixa  
**Arquivos necessários:**
- `src/components/ui/Tooltip.jsx` (pode já existir)
- Adicionar tooltips em campos complexos

**Funcionalidades:**
- Tooltips em campos do formulário
- Botão "?" ao lado de campos que precisam explicação
- Link para documentação/manual

**Referência:** `SUGESTOES_MELHORIAS_ADMIN_PAINEL.md` linha 28-31, `STATUS_MELHORIAS_IMPLEMENTACAO.md` linha 20-23

---

### 20. Empty States Informativos
**Status:** ⏳ Parcialmente implementado  
**Impacto:** Melhor UX  
**Complexidade:** Baixa  
**Arquivos necessários:**
- `src/components/ui/EmptyState.jsx` (pode já existir)
- Adicionar em listas vazias

**Funcionalidades:**
- Ilustrações SVG personalizadas
- Mensagens mais amigáveis
- CTAs claros

**Referência:** `SUGESTOES_MELHORIAS_VISUAIS.md` linha 125-129

---

## 🔧 FUNCIONALIDADES AVANÇADAS

### 21. Templates de Planos Pré-configurados
**Status:** ⏳ Não implementado  
**Impacto:** Configuração rápida  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/admin/subscribers/PlanTemplates.jsx`
- `src/utils/planTemplates.js`

**Funcionalidades:**
- Templates para casos comuns (Restaurante Básico, Delivery Pro, etc.)
- Botão "Criar a partir de template"
- Padronização de permissões

**Referência:** `SUGESTOES_MELHORIAS_ASSINANTES.md` linha 265-305

---

### 22. Exportação/Importação CSV de Assinantes
**Status:** ⏳ Não implementado  
**Impacto:** Escalabilidade  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/admin/subscribers/ImportCSV.jsx`
- `src/components/admin/subscribers/ExportCSV.jsx`
- `src/utils/csvUtils.js`

**Funcionalidades:**
- Importar múltiplos assinantes via CSV
- Validação em lote
- Preview antes de importar
- Exportar assinantes para backup

**Referência:** `SUGESTOES_MELHORIAS_ASSINANTES.md` linha 308-336

---

### 23. Bulk Actions (Ações em Lote)
**Status:** ⏳ Não implementado  
**Impacto:** Eficiência operacional  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/admin/subscribers/BulkActions.jsx`
- Modificar `src/pages/Assinantes.jsx`

**Funcionalidades:**
- Seleção múltipla de assinantes
- Ativar/Desativar em lote
- Alterar plano em lote
- Exportar selecionados
- Excluir em lote

**Referência:** `SUGESTOES_MELHORIAS_ASSINANTES.md` linha 430-457

---

### 24. Preview de Permissões em Tempo Real
**Status:** ⏳ Não implementado  
**Impacto:** Redução de erros  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/admin/subscribers/PermissionPreview.jsx`
- Modificar `src/components/permissions/PermissionsEditor.jsx`

**Funcionalidades:**
- Sidebar com preview
- Mostrar o que o assinante verá
- Feedback imediato das mudanças

**Referência:** `SUGESTOES_MELHORIAS_ASSINANTES.md` linha 39-61

---

### 25. Cards Visuais de Planos
**Status:** ⏳ Não implementado  
**Impacto:** Melhor conversão  
**Complexidade:** Média  
**Arquivos necessários:**
- `src/components/admin/subscribers/PlanCard.jsx`
- `src/components/admin/subscribers/PlanSelector.jsx`

**Funcionalidades:**
- Cards visuais com comparação lado a lado
- Destaque de funcionalidades principais
- Visualização clara das diferenças

**Nota:** Componentes podem já existir mas não estar sendo usados

**Referência:** `SUGESTOES_MELHORIAS_ASSINANTES.md` linha 12-36, `STATUS_MELHORIAS_IMPLEMENTACAO.md` linha 30-33

---

### 26. Chatbot com IA
**Status:** ⏳ Não implementado  
**Impacto:** Atendimento 24/7  
**Complexidade:** Alta  
**Arquivos necessários:**
- `src/components/menu/AIChatbot.jsx`
- `backend/routes/chatbot.js`
- Integração com API de IA (OpenAI, etc.)

**Funcionalidades:**
- Responder FAQ
- Recomendar pratos baseado em gosto
- Receber pedidos por voz/texto
- Rastrear pedidos
- Lidar com reclamações
- Transferir para humano se necessário

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 258-278

---

### 27. App Mobile Nativo
**Status:** ⏳ Não implementado  
**Impacto:** +60% engajamento  
**Complexidade:** Muito Alta  
**Arquivos necessários:**
- Projeto React Native ou Flutter
- API mobile

**Funcionalidades:**
- Cardápio offline
- Push notifications nativas
- Reordenar com um clique
- GPS tracking do entregador
- Carteira digital com créditos
- Integração social (compartilhar pratos)

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 281-301

---

### 28. Integração com iFood, Rappi, Uber Eats
**Status:** ⏳ Não implementado  
**Impacto:** +100% visibilidade  
**Complexidade:** Muito Alta  
**Arquivos necessários:**
- `backend/integrations/ifood.js`
- `backend/integrations/rappi.js`
- `backend/integrations/ubereats.js`

**Funcionalidades:**
- Sincronizar cardápio automaticamente
- Receber pedidos das plataformas no gestor
- Atualizar estoque em tempo real
- Interface única para gerenciar tudo
- Relatório consolidado

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 304-324

---

### 29. Programa de Afiliados
**Status:** ⏳ Não implementado  
**Impacto:** Marketing boca a boca automatizado  
**Complexidade:** Alta  
**Arquivos necessários:**
- `src/components/admin/AffiliateProgram.jsx`
- `backend/routes/affiliates.js`

**Funcionalidades:**
- Cliente indica e ganha bônus
- Influencer com link único
- Comissão por venda
- Dashboard para influencer ver vendas

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 185-204

---

### 30. LGPD Compliance Completo
**Status:** ⏳ Parcialmente implementado  
**Impacto:** Conformidade legal  
**Complexidade:** Alta  
**Arquivos necessários:**
- `src/components/admin/LGPDCompliance.jsx`
- `backend/routes/lgpd.js`

**Funcionalidades faltantes:**
- Opt-in para marketing - **Faltando**
- Cliente pode baixar seus dados - **Faltando**
- Direito ao esquecimento (deletar conta) - **Faltando**
- Exportar dados em JSON - **Faltando**
- 2FA para assinantes - **Faltando**
- Audit log - **Faltando**

**Referência:** `PROPOSTAS_MELHORIAS_ESSENCIAIS.md` linha 329-355

---

## 📊 RESUMO POR PRIORIDADE

### 🔥 Alta Prioridade (9 melhorias)
1. Sistema de Fidelidade Avançado
2. Favoritos e Listas de Desejos
3. Notificações Push Web para Clientes
4. Carrinho Abandonado - Recovery
5. Botão Flutuante do Carrinho
6. Frete Grátis Progress Bar
7. Cross-sell Inteligente
8. Cupom na Primeira Compra
9. Botão "Pedir Novamente"

### ⚡ Média Prioridade (7 melhorias)
10. Dashboard Analítico Avançado (completo)
11. Sistema de Mesas e QR Code
12. Gestão de Estoque Inteligente
13. Filtros Avançados no Gestor
14. View Kanban com Drag & Drop
15. Atalhos de Teclado
16. Integração GPS no Entregador

### 💡 Baixa Prioridade (4 melhorias)
17. Design System Centralizado
18. Animações e Microinterações
19. Tooltips Contextuais
20. Empty States Informativos

### 🚀 Funcionalidades Avançadas (10 melhorias)
21. Templates de Planos
22. Exportação/Importação CSV
23. Bulk Actions
24. Preview de Permissões
25. Cards Visuais de Planos
26. Chatbot com IA
27. App Mobile Nativo
28. Integração com Agregadores
29. Programa de Afiliados
30. LGPD Compliance Completo

---

## 🎯 RECOMENDAÇÃO DE IMPLEMENTAÇÃO

### Fase 1 - Conversão (1-2 semanas)
Implementar melhorias de alta prioridade relacionadas a conversão:
- Carrinho Abandonado
- Botão Flutuante
- Frete Grátis Progress
- Cross-sell
- Cupom Primeira Compra
- Pedir Novamente

**ROI esperado:** +40-60% aumento nas vendas

### Fase 2 - Retenção (2-3 semanas)
- Sistema de Fidelidade
- Favoritos
- Notificações Push

**ROI esperado:** +40% retenção

### Fase 3 - Gestão (3-4 semanas)
- Dashboard Completo
- Filtros Avançados
- Kanban View
- GPS Entregador

**ROI esperado:** +50% eficiência operacional

### Fase 4 - Escalabilidade (1-2 meses)
- Templates de Planos
- Exportação/Importação
- Bulk Actions
- Gestão de Estoque

**ROI esperado:** Suporte a 10x mais assinantes

---

## 📝 NOTAS

- Algumas melhorias podem estar parcialmente implementadas
- Verificar código antes de implementar para evitar duplicação
- Priorizar melhorias com maior ROI primeiro
- Testar cada melhoria individualmente antes de integrar

---

**Total de melhorias pendentes:** 30  
**Alta prioridade:** 9  
**Média prioridade:** 7  
**Baixa prioridade:** 4  
**Avançadas:** 10
