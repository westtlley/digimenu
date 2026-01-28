# Análise SaaS – DigiMenu (Admin e Assinantes)

Análise crítica do app como um todo, com sugestões de melhoria em arquitetura, UX, segurança, produto e operação.

---

## 1. Visão geral

O DigiMenu é um SaaS de cardápio digital e gestão para restaurantes com:

- **Admin (master):** Assinantes, planos, suporte.
- **Assinantes:** Painel (Loja, Pratos, Pedidos, PDV, Caixa, Entregador, Cozinha, etc.).
- **Clientes:** Cardápio público, pedidos, rastreio.
- **Colaboradores:** perfis Entregador, Cozinha, PDV.

**Pontos fortes:** Multi-tenant, planos por permissão, Gestor de Pedidos rico, PDV, cardápio por slug (`/s/:slug`), rate limit e fluxo de “definir senha” para assinantes.

---

## 2. Críticas e problemas

### 2.1 Segurança e autenticação

| Problema | Onde | Risco |
|----------|------|-------|
| **Rotas sem `ProtectedRoute`** | Nenhuma rota em `index.jsx` usa `ProtectedRoute`. Cada página faz seu próprio `auth.me()` / `redirectToLogin`. | Inconsistência, risco de esquecer checagem em páginas novas. |
| **401 perde `returnUrl`** | Em `apiClient`, no 401: `window.location.href = '/login'` (sem `returnUrl`). | Usuário cai no login e, ao voltar, pode ir para `/` em vez da página que estava. |
| **`console.log` em produção** | Admin, Assinantes, usePermission, DefinirSenha, etc. | Vazamento de dados (emails, IDs, permissões) e poluição de console. |
| **Backend: `requirePermission`/`requireAccess` importados mas quase não usados** | `server.js` importa; rotas de entities usam só `authenticate`. | Controle de permissão por plano/recurso fica só no frontend; backend confia no `subscriber_email`/`is_master` mas não em “este plano pode acessar PDV”, etc. |
| **Fallback dev sem token** | Em `authenticate`, se `NODE_ENV !== 'production'` e não há token, usa `admin@digimenu.com`. | Em deploy com `NODE_ENV` errado, qualquer um acessa como admin. |
| **Token de senha em memória** | `passwordTokens` no `server.js`. | Em restart, tokens são perdidos; em múltiplas instâncias, não há shared store. |
| **Esqueci minha senha** | Login só sugere “Entre em contato” / WhatsApp. | Cliente/assinante sem fluxo de recuperação de senha. |

### 2.2 Permissões e planos

| Problema | Onde | Impacto |
|----------|------|---------|
| **Dois modelos de permissão** | Backend: `plans.js` (ex.: `orders_advanced`, `pdv`, `cash_control`). Frontend: `PlanPresets.jsx` (ex.: `gestor_pedidos`, `orders`, `dishes` com `['view','create','update','delete']`). | Dificulta evoluir planos e auditoria; risco de front e back divergirem. |
| **`hasModuleAccess` não reflete `plans.js`** | `usePermission` e `hasModuleAccess` usam `permissions[module]` (array) vindos de `checkSubscriptionStatus`/subscriber. Backend `plans.js` e `hasAccess` usam chaves diferentes. | Lógica de “quem pode o quê” está fragmentada. |
| **Plano Basic com `gestor_pedidos: []`** | Em `PlanPresets`, basic tem `gestor_pedidos: []`. | Assinante basic pode acabar sem Gestor ou com mensagem genérica de plano; UX confusa. |
| **Colaboradores: só Premium/Pro** | Em `usePermission`: `hasModuleAccess('colaboradores')` = `['premium','pro'].includes(plan)`. | Regra de negócio clara, mas espalhada (front + backend de colaboradores). |

### 2.3 UX e produto

| Problema | Onde | Impacto |
|----------|------|---------|
| **Admin com muitos `console.log`** | `Admin.jsx` (loading, isMaster, redirecionamento). | Poluição e possível exposição de dados em produção. |
| **Redirecionamento Assinante→Painel** | Se assinante acessa `/Admin`, é redirecionado para `/PainelAssinante` (replace). | Bom. Porém, se tiver `returnUrl=/Admin`, no Login o assinante é mandado para Painel; o `returnUrl` não é reaproveitado de forma consistente em 401. |
| **Assinar: PIX manual** | Página de assinatura com PIX/copia-e-cola, “envie comprovante”. | Operacionalmente pesado; ativação manual; sem integração com gateway. |
| **DefinirSenha: 5 min fixo no front** | O timer de 5 min é só no front; o backend também expira. | Se back tiver valor diferente, usuário pode ver “ainda vale” e o back recusar. |
| **Recuperação de senha** | Não existe. | Cliente e assinante dependem de WhatsApp/suporte. |
| **Login único para todos os perfis** | Um formulário para cliente, assinante, master, entregador, cozinha, PDV. | Simples, mas a tela não deixa claro “qual link para qual perfil” (ex. link para colaborador). |
| **`createPageUrl` e convenção de path** | `createPageUrl('GestorPedidos')` vira `/gestorpedidos` (lowercase), rotas usam `/GestorPedidos`. | Pode quebrar em ambientes case-sensitive; melhor padronizar (ex. só minúsculas nas rotas). |

### 2.4 Performance e técnica

| Problema | Onde | Impacto |
|----------|------|---------|
| **`usePermission` a cada 60s** | `loadPermissions` no `setInterval(..., 60000)`. | Em várias abas/páginas, mais chamadas `checkSubscriptionStatus` e `auth/me`. |
| **Queries sem `staleTime`/`gcTime` em vários fluxos** | Várias `useQuery` sem `staleTime` definido. | Refetch em foco e em mount com mais frequência que o necessário. |
| **`refetchOnMount: 'always'` em ComplementGroup (e afins)** | Cardápio, PDV, etc. | Refetch pesado em toda visita à tela. |
| **Gestor: refetch 3s** | `refetchInterval: 3000` em Orders. | Bom para tempo real; em muitos assinantes/entidades pode pressionar backend. |
| **apiClient: URL hardcoded de fallback** | `digimenu-backend-3m6t.onrender.com/api` quando `VITE_API_BASE_URL` vazio. | Em novo env, pode apontar para o backend errado. |
| **`console.log` da API base no boot** | `apiClient.js`: `console.log('🔗 API Base URL...')`. | Expõe URL de API; em produção é desnecessário. |

### 2.5 Multi-tenancy e rotas

| Aspecto | Situação |
|---------|----------|
| **`/s/:slug` e `/s/:slug/GestorPedidos` etc.** | Bem implementado: slug, `useSlugContext`, `as_subscriber` para master, checagem de dono/colaborador. |
| **Duplicação de lógica de slug** | Várias páginas repetem: `useSlugContext`, `asSub`, `canAccessSlug`, loading/erro. | Candidato a um layout ou HOC “com slug”. |
| **`createPageUrl` e Admin** | `createPageUrl('Admin', slug)` ignora `slug` e retorna `/Admin`. | Correto. |

### 2.6 Backend e dados

| Problema | Onde | Impacto |
|----------|------|---------|
| **`getSubscriberEmail` e master** | Se `user.is_master` e não `_contextForSubscriber`: `subscriber_email IS NULL`. | Master vê só entidades “sem dono”; assinantes com `subscriber_email` preenchido ficam isolados, o que faz sentido. Documentar melhor. |
| **`as_subscriber` via query/body** | Uso de `as_subscriber` e `_contextForSubscriber` está claro no fluxo de entities. | Ok. Vale padronizar sempre em `query` para GET e em `body`/`query` para POST/PUT de forma explícita. |
| **Paginação** | `listEntities` com `page`/`limit`; front em alguns listagens não usa. | Risco de listas muito grandes (ex. Assinantes, Pedidos). |
| **Fallback JSON (persistence)** | Quando não há `DATABASE_URL`. | Avisos de “não usar em produção” existem; em produção é essencial Postgres. |

### 2.7 UI e acessibilidade

| Problema | Onde | Impacto |
|----------|------|---------|
| **Cores e variáveis CSS** | `Layout.jsx` e ThemeProvider definem `--bg-*`, `--text-*`, etc. | Boa base. Alguns componentes ainda usam `gray-500`, `gray-800` fixos. Em dark mode pode desalinhar. |
| **Focus e teclado** | Existem `:focus-visible` em `Layout`. | Alguns modais e drawers podem não devolver o foco ou não ser fecháveis por teclado (Esc). |
| **Textos e i18n** | Tudo em pt-BR. | Ok para o público atual; se crescer, i18n vai fazer falta. |
| **Empty states** | Vários `EmptyState` e mensagens. | Em geral bons; algumas tabelas (ex. Assinantes) podem ter empty state mais orientado à ação. |

---

## 3. Sugestões de melhoria (priorizadas)

### 3.1 Alta prioridade (segurança e base)

1. **Remover ou condicionar `console.log` em produção**
   - Criar `logger.js` com `log`, `warn`, `error` que só emitem em `import.meta.env.DEV` (ou `NODE_ENV` no back).
   - Substituir em: Admin, Assinantes, usePermission, DefinirSenha, apiClient (incluindo `API Base URL`).

2. **Usar `ProtectedRoute` (ou equivalente) nas rotas autenticadas**
   - Envolver Admin, Assinantes, PainelAssinante, GestorPedidos, PDV, Cozinha, Entregador, etc. em `ProtectedRoute` com:
     - `requireMaster` para Admin e Assinantes.
     - `requireActiveSubscription` para Painel, Gestor, PDV, etc., quando for o caso.
   - Reduzir checagens duplicadas de auth dentro de cada página.

3. **Preservar `returnUrl` no 401**
   - No `apiClient`, em vez de `window.location.href = '/login'`:
     - `window.location.href = '/login?returnUrl=' + encodeURIComponent(location.pathname + location.search)`.
   - Ajustar Login para usar `returnUrl` quando existir (já existe em parte; garantir que 401 sempre o passe).

4. **Esqueci minha senha (cliente e assinante)**
   - Backend: `POST /api/auth/forgot-password` (email) → envia link com token (ex. 1h).
   - `POST /api/auth/reset-password` (token, newPassword).
   - Front: tela “Esqueci a senha” no Login com fluxo de email + nova senha. Reaproveitar ideia do “definir senha” de assinante.

5. **Tokens de definição/reset de senha em persistência**
   - Guardar `password_token` e `token_expires_at` no Postgres (ex. tabela `password_reset_tokens` ou no `subscribers`/`users`).
   - Evitar depender só de `passwordTokens` em memória; necessário para multi-instância e restart.

### 3.2 Média prioridade (permissões e consistência)

6. **Unificar modelo de permissões**
   - Escolher uma fonte de verdade (ex. backend): um único schema de “módulos” e “ações” (ex. `gestor_pedidos: ['view','update']`).
   - Backend: ao servir `checkSubscriptionStatus` ou um `GET /me` mais rico, devolver `permissions` nesse formato.
   - Frontend: `PlanPresets` e `usePermission` consomem só esse formato. Depreciar `plans.js` para regras de UI ou migrar para um mapeamento claro plano → permissões.

7. **Usar `requirePermission`/`requireAccess` nas rotas sensíveis do backend**
   - Ex.: `GET /api/entities/Order` (ou agrupamentos como “gestor”): `authenticate`, `requireAccess('orders')` ou `requirePermission('orders_simple_view')`.
   - PDV, Caixa, relatórios: exigir `pdv`, `cash_control`, etc. Assim, o back não confia só em “está logado e é assinante”.

8. **Revisar plano Basic e Gestor**
   - Decisão de produto: Basic tem ou não Gestor (mesmo que “simplificado”)?
   - Se tiver: ajustar `PlanPresets.basic` para `gestor_pedidos: ['view','update']` (ou o que for) e garantir que `hasModuleAccess('gestor_pedidos')` e backend batam.
   - Se não: manter `[]` e garantir que o link do Gestor não apareça e que o back também bloqueie.

9. **Padronizar rotas e `createPageUrl`**
   - Todas as rotas em minúsculas (ex. `/gestor-pedidos`, `/painel-assinante`) ou todas em PascalCase; um único padrão.
   - `createPageUrl` e as keys de `PAGES` alinhados a esse padrão para evitar 404 por case.

### 3.3 Média/baixa (UX e operação)

10. **Assinar: integração de pagamento**
    - Integrar gateway (Stripe, Mercado Pago, PagSeguro, etc.) para assinatura e ativação automática.
    - Manter PIX/manual como alternativa, mas com status “pendente” e webhook ou notificação para o admin ativar.

11. **DefinirSenha: alinhar tempo de expiração**
    - Backend e front usarem o mesmo valor (ex. 5 min) via config; no front, o timer reflete isso. Evita “ainda vale” no front e “expirado” no back.

12. **Login: atalhos por perfil**
    - Links “Sou colaborador (Entregador/Cozinha/PDV)” e “Sou cliente” que podem pré-preencher `returnUrl` ou apenas explicar para onde cada um vai. Reduz apoio.

13. **Reduzir polling de permissões**
    - `usePermission`: em vez de 60s fixo, considerar:
      - Recarregar só em eventos (ex. mudar aba, foco na janela) e/ou
      - Intervalo maior (ex. 5 min) e/ou
      - Servir permissões no `auth/me` e invalidar quando o token mudar.

14. **Queries: `staleTime` e `gcTime`**
    - Definir para listas estáveis (Lojas, Categorias, Planos): ex. `staleTime: 5 * 60 * 1000`, `gcTime: 30 * 60 * 1000`.
    - Manter refetch curto só onde é crítico (Gestor, Entregador).

### 3.4 Código e arquitetura

15. **Layout “ComSlug” ou HOC**
    - Componente ou HOC que encapsula: `useSlugContext`, `asSub`, `canAccessSlug`, loading/erro “link não encontrado”/“acesso negado”.
    - Páginas (Gestor, Painel, PDV, Cozinha, Entregador) só recebem `asSub` e `slug` via props/context.

16. **Extrair lógica de “voltar” (backUrl)**
    - `useBackUrl(isMaster, slug)` ou similar que devolve `backUrl` e `backPage` conforme regras atuais. Reduz repetição.

17. **apiClient: nunca logar URL em produção**
    - `console.log` da base URL só em dev; em produção, não expor endpoints.

18. **Fallback de `VITE_API_BASE_URL`**
    - Em produção, se vazio, falhar ou usar variável de build explícita em vez de URL fixa do Render. Reduz risco de apontar para backend alheio.

### 3.5 Produto e growth

19. **Onboarding de assinante**
    - Após definir senha (e, se existir, primeiro pagamento aprovado): wizard “Configure sua loja em 3 passos” (nome, logo, ao menos 1 categoria e 1 prato). Aumenta ativação.

20. **Dashboard do assinante**
    - Métricas claras: pedidos (hoje/semana), ticket médio, pratos mais vendidos, comparação com período anterior. Já existe base; dar destaque.

21. **Notificações in-app (opcional)**
    - Centro de notificações (novo pedido, assinatura perto de vencer, etc.) além de toasts e sons. Melhora retenção.

22. **Relatórios e exportação**
    - Relatórios em PDF/Excel já existem em parte (ex. gestor). Unificar e oferecer no Painel (ex. “Vendas”, “Pedidos”, “Produtos”) com filtro de período.

23. **Suporte e ajuda**
    - Links “Ajuda” ou ícone de ? em telas complexas (Gestor, PDV, Assinantes) para abrir doc ou FAQ. Reduz carga de suporte.

---

## 4. Resumo executivo

- **O que está bom:** Multi-tenancy, Gestor de Pedidos, PDV, Caixa, fluxo de assinante (criar, definir senha, token), cardápio por slug, rate limit, temas, e estrutura de abas no Admin e Painel.
- **O que é crítico:** `console.log` em produção, 401 sem `returnUrl`, ausência de “esqueci senha”, `ProtectedRoute` não usada, e backend que não valida permissão de plano em rotas sensíveis.
- **O que atrapalha evolução:** Dois modelos de permissão (back vs front), Basic vs Gestor mal definido, e alguma duplicação de lógica de slug e “voltar”.

Priorizar: (1) logs e 401, (2) `ProtectedRoute` e recuperação de senha, (3) unificação de permissões e uso de `requirePermission`/`requireAccess` no backend, (4) melhorias de UX (Assinar, Login, onboarding) e (5) refinamentos de performance e código (usePermission, `createPageUrl`, layout de slug).
