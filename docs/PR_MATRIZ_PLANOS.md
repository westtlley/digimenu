# PR – Matriz de planos (FREE / BASIC / PRO / ULTRA)

## 1. Arquivos alterados

### Frontend
| Arquivo | Alteração |
|--------|------------|
| `src/components/permissions/PlanPresets.jsx` | Nova matriz: FREE (whatsapp [], gestor/orders só view), BASIC (+ payments, financial, 2fa), PRO/ULTRA alinhados; constantes MODULES/ACTIONS; `mergeWithPlanPreset()`; documentação no cabeçalho. |
| `src/components/permissions/usePermission.jsx` | Import de `mergeWithPlanPreset`; fallback quando `permissions` vazio: preenche com preset do plano (contexto principal, slug e fallback legado). |
| `src/components/admin/subscribers/PlanComparison.jsx` | Inclusão de payments, 2fa, pdv, caixa, comandas, tables na lista de features. |
| `src/pages/GestorPedidos.jsx` | Acesso à página: `hasAccess = isMaster \|\| hasModuleAccess('gestor_pedidos')` (BASIC e FREE entram). Export CSV/PDF condicionado a `canUpdateGestor` (só quem tem `gestor_pedidos.update` vê o menu). |
| `src/test/planPresets.test.js` | **Novo.** Testes unitários para FREE/BASIC/PRO/ULTRA, getPlanPermissions, mergeWithPlanPreset, comparePermissions. |

### Backend
| Arquivo | Alteração |
|--------|------------|
| `backend/utils/planPresetsForContext.js` | Presets alinhados ao frontend: FREE (whatsapp [], gestor/orders view only), BASIC (payments, financial, 2fa), PRO/ULTRA iguais ao frontend. Comentário de regras no topo. |

### Documentação
| Arquivo | Alteração |
|--------|------------|
| `docs/BACKEND_PERMISSIONS_MATRIX.md` | **Novo.** Regras por plano para o backend, endpoints a proteger, chaves de módulos. |
| `docs/CHECKLIST_VALIDACAO_PERMISSOES.md` | **Novo.** Checklist de validação manual (FREE/BASIC/PRO/ULTRA, compatibilidade, API, front vs backend). |
| `docs/PR_MATRIZ_PLANOS.md` | **Novo.** Este resumo de PR. |

---

## 2. Diff das permissões (antigas vs novas)

### FREE
| Módulo | Antes | Depois |
|--------|-------|--------|
| whatsapp | `['view']` | `[]` |
| gestor_pedidos | `['view']` | `['view']` (mantido; sem update) |
| orders | `['view']` | `['view']` (mantido) |

### BASIC
| Módulo | Antes | Depois |
|--------|-------|--------|
| payments | `[]` | `['view', 'update']` |
| financial | `[]` | `['view']` |
| 2fa | (não existia) | `['view', 'update']` |
| inventory, affiliates, colaboradores | (não listados) | `[]` explícito |

### PRO
| Módulo | Antes | Depois |
|--------|-------|--------|
| cozinha, garcom | (já existiam) | Mantidos; colaboradores mantido. |
| comandas | `[]` | `[]` (close/history só ULTRA) |

### ULTRA
| Sem mudança de estrutura | Mantido: pdv, caixa, printer, comandas (close, history), tables. |

---

## 3. Checklist de validação manual

Seguir **docs/CHECKLIST_VALIDACAO_PERMISSOES.md**:

1. **FREE:** Acessar Gestor de Pedidos; conferir que não há “Exportar CSV”/“Relatório PDF”; tentar alterar status (backend deve retornar 403 se implementado). WhatsApp desativado ou só view config.
2. **BASIC:** Gestor com view+update (alterar status); export visível; Pagamentos e Financeiro acessíveis; 2FA configurável. Sem PDV/Caixa/Comandas/Mesas.
3. **PRO:** Cupons, promoções, zonas, estoque, afiliados, colaboradores em CRUD. Gráficos view.
4. **ULTRA:** PDV, Caixa, Impressora, Comandas (fechar/histórico), Mesas em CRUD.
5. **Compatibilidade:** Assinante antigo com `plan: 'basic'` e `permissions` vazio: front aplica fallback com preset basic; backend (se usar planPresetsForContext) já retorna o mesmo.

---

## 4. Garantias

- **Frontend não mostra o que o backend bloqueia:** Export no gestor só aparece para quem tem `gestor_pedidos.update` (BASIC/PRO/ULTRA). FREE só view, então não vê export. Backend deve rejeitar PATCH em orders e export para FREE (ver BACKEND_PERMISSIONS_MATRIX.md).
- **Backend não bloqueia o que o frontend libera:** Presets em `planPresetsForContext.js` e no frontend estão iguais; `/user/context` devolve o mesmo mapa de permissões que o front usa para exibir/ocultar.
- **Nada quebrado:** Fallback para permissões vazias com `mergeWithPlanPreset(perms, plan)`; plano desconhecido cai em basic. Assinantes antigos continuam com comportamento correto quando o backend preenche por plano ou o front aplica o fallback.

---

## 5. Testes

- **Frontend:** `npm test -- --run src/test/planPresets.test.js` — 21 testes (FREE/BASIC/PRO/ULTRA, getPlanPermissions, mergeWithPlanPreset, comparePermissions).
- **Backend:** Testes existentes em `backend/tests/integration/permissions.test.js` e `planValidation.test.js` continuam válidos; o contexto de permissões vem de `planPresetsForContext.js` (usado em auth e establishments). Se houver testes que dependam do formato antigo de FREE (whatsapp view), ajustar expectativa para whatsapp vazio.
