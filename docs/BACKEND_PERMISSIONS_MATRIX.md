# Matriz de permissões – Backend (fonte de verdade)

O frontend usa os presets em `src/components/permissions/PlanPresets.jsx` apenas para **referência/UI e fallback** quando o assinante não tem permissões explícitas. A **autorização real** deve ser feita no **backend**.

## Regras por plano

### FREE (trial 10 dias)

| Módulo            | Ações permitidas | Observação |
|-------------------|------------------|------------|
| dashboard         | view             | |
| gestor_pedidos    | **view**         | Sem update: não pode alterar status, exportar, auto-aceitar, cancelar. |
| orders            | **view**         | Sem update. |
| whatsapp          | **nenhuma**      | Desativado (ou no máximo view config, sem enviar). |
| dishes            | view, create, update, delete | |
| store             | view, update     | |
| Demais            | []               | Sem clientes, histórico, financeiro, pagamentos, gráficos. |

**Endpoints a proteger:**

- `PATCH/PUT Order` (mudança de status): exige `gestor_pedidos.update` ou `orders.update`.
- Export de pedidos (CSV/PDF): exige `gestor_pedidos.update` (ou ação dedicada).
- Auto-accept / cancelamento: exige `gestor_pedidos.update`.
- Envio WhatsApp: exige `whatsapp` com ação além de view (FREE não deve ter).

---

### BASIC

| Módulo            | Ações permitidas     | Observação |
|-------------------|----------------------|------------|
| gestor_pedidos    | view, **update**     | Pode alterar status; export pode exigir autorização gerencial. |
| orders            | view, **update**    | |
| theme             | view, update         | |
| history           | view                 | |
| clients           | view                 | |
| payments          | **view, update**    | Só configurar métodos (nada avançado). |
| financial         | **view**            | Resumo simples, sem export avançado. |
| 2fa               | **view, update**    | Habilitar 2FA para admin/gerente. |
| whatsapp          | view                 | |
| Demais            | Como no preset       | Sem PDV, caixa, comandas, mesas. |

---

### PRO

Inclui tudo do BASIC, mais:

- Marketing: cupons, promoções (CRUD).
- Entregas: zonas de entrega (CRUD).
- Estoque, afiliados, colaboradores (CRUD).
- LGPD, 2FA: view + update.
- Gráficos: view.
- Gestor de pedidos e Pedidos: CRUD completo (create, update, delete).
- inventory, affiliates, colaboradores: CRUD.

---

### ULTRA

Inclui tudo do PRO, mais:

- PDV: view, create, update.
- Caixa: view, create, update.
- Impressora: view, update.
- Comandas: view, create, update, **close**, **history**.
- Mesas (tables): CRUD.

---

## Implementação no backend

1. **Endpoint `/user/context` (ou equivalente)**  
   Retornar `permissions` como objeto chave-módulo → array de ações, alinhado aos presets do frontend.  
   Se o assinante não tiver `permissions` explícitas, preencher a partir do `plan` (free/basic/pro/ultra) com a mesma matriz deste documento.

2. **Middleware/guards por rota**  
   - Antes de qualquer mutação (Order.update, export, etc.), verificar o módulo e a ação (ex.: `gestor_pedidos.update`, `orders.update`).  
   - Não confiar em dados enviados pelo frontend; usar sempre o plano/permissões do assinante na sessão.

3. **Ações especiais**  
   - Comandas: ações `close` e `history` apenas para planos que as tenham (ex.: ULTRA).  
   - Exportação no gestor: tratar como exigindo `gestor_pedidos.update` (ou ação específica `export` se implementada).

4. **Compatibilidade**  
   - Assinantes antigos com `subscriber.plan` mas sem `subscriber.permissions`: ao montar o contexto, preencher permissões a partir do plano (mesma matriz acima) para não quebrar acesso.

---

## Chaves de módulos (padronizadas)

Usar as mesmas chaves do frontend para evitar discrepância:

- dashboard, pdv, gestor_pedidos, caixa, whatsapp, dishes, pizza_config, delivery_zones, coupons, promotions, theme, store, payments, graficos, orders, history, clients, financial, printer, mais, comandas, inventory, affiliates, lgpd, 2fa, cozinha, garcom, colaboradores, tables.

Ações: view, create, update, delete; para comandas também: close, history.
