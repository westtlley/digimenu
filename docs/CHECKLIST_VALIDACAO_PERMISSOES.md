# Checklist de validação – Matriz de planos (FREE / BASIC / PRO / ULTRA)

Use este checklist para validar que o frontend e o backend refletem a mesma matriz de permissões e que nada fica “mostrando” no frontend o que o backend bloqueia (ou o contrário).

---

## 1. FREE (trial)

- [ ] **Gestor de pedidos**
  - Acesso à página: sim (view).
  - Botões “Exportar CSV” e “Relatório PDF”: **não** visíveis (ou desabilitados).
  - Alteração de status (aceitar, cancelar, próximo status): backend retorna 403 se tentar; front pode esconder ou deixar backend bloquear.
- [ ] **Pedidos**
  - Apenas visualização; nenhuma ação de atualizar status.
- [ ] **WhatsApp**
  - Módulo desativado ou só “ver config”, sem enviar.
- [ ] **Pratos e Loja**
  - CRUD em pratos; view + update em loja.
- [ ] **Clientes, Histórico, Financeiro, Pagamentos, Gráficos**
  - Não acessíveis (menu/rotas ocultos ou 403).

---

## 2. BASIC

- [ ] **Gestor de pedidos**
  - View + update: pode alterar status dos pedidos.
  - Export (CSV/PDF): visível e permitido (com autorização gerencial se aplicável).
- [ ] **Pedidos**
  - View + update.
- [ ] **Pagamentos**
  - Aba/tela de pagamentos: view + update (configurar métodos).
- [ ] **Financeiro**
  - View: resumo simples; sem export avançado se a regra for essa.
- [ ] **2FA**
  - View + update: pode habilitar 2FA (admin/gerente).
- [ ] **Tema, Histórico, Clientes**
  - Conforme preset (view/update onde aplicável).
- [ ] **PDV, Caixa, Comandas, Mesas**
  - Não acessíveis (menu oculto ou 403).

---

## 3. PRO

- [ ] **Cupons, Promoções, Zonas de entrega**
  - CRUD disponível e backend aceita.
- [ ] **Estoque, Afiliados, Colaboradores**
  - CRUD disponível e backend aceita.
- [ ] **LGPD, 2FA, Gráficos**
  - View + update onde definido; gráficos view.
- [ ] **Gestor e Pedidos**
  - CRUD completo (create, update, delete).
- [ ] **PDV, Caixa, Comandas (close/history), Mesas**
  - Ainda não (apenas ULTRA).

---

## 4. ULTRA

- [ ] **PDV**
  - View + create + update; rotas e ações liberadas.
- [ ] **Caixa**
  - View + create + update.
- [ ] **Impressora**
  - View + update.
- [ ] **Comandas**
  - View, create, update, **close**, **history**.
- [ ] **Mesas**
  - CRUD completo.

---

## 5. Compatibilidade / migração

- [ ] Assinante com `plan: 'basic'` e `permissions` vazio ou antigo: backend retorna permissões equivalentes ao BASIC (ou front aplica fallback com `getPlanPermissions('basic')`).
- [ ] Idem para pro/ultra: não quebrar assinantes antigos; preencher a partir do plano quando permissões estiverem ausentes.

---

## 6. API (exemplos)

- [ ] `GET /user/context`: campo `permissions` com mesmo formato do frontend (objeto módulo → array de ações).
- [ ] `PATCH /orders/:id` (status): para plano FREE, retornar 403.
- [ ] Export gestor (se for endpoint próprio): para FREE, retornar 403.
- [ ] Comandas close/history: apenas para plano com essas ações (ex.: ULTRA).
- [ ] Mesas CRUD: apenas ULTRA (ou plano com `tables` no preset).

---

## 7. Frontend vs backend

- [ ] Nenhum recurso visível no front para um plano que o backend bloqueia (evitar 403 em ações óbvias).
- [ ] Nenhum recurso bloqueado no front para um plano que o backend permitiria (evitar esconder o que é permitido).
- [ ] Comparação de planos (PlanComparison) e presets (PlanPresets.jsx) alinhados com este documento e com o backend.
