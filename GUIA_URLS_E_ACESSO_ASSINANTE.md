# URLs e Acesso por Assinante (multi-tenant SaaS)

## Regras de URL

| URL | Uso | Quem acessa |
|-----|-----|-------------|
| **/** | Landing: "Acesse pelo link do estabelecimento" | Público |
| **/cardapio** e **/Cardapio** | Redirecionam para **/** | Evita cardápio "genérico" |
| **/s/raiz-maranhense** | Cardápio **público** do assinante | Clientes (sem login) |
| **/s/raiz-maranhense/GestorPedidos** | Gestor de pedidos do assinante | Assinante ou master atuando como assinante |
| **/s/raiz-maranhense/PainelAssinante** | Painel do assinante | Assinante |
| **/s/raiz-maranhense/Cozinha**, **/PDV**, **/Entregador**, **/EntregadorPanel** | Ferramentas do assinante | Conforme permissão |

- **Não existe** cardápio em `/` ou `/cardapio` que mostre pratos de um estabelecimento. O cardápio de um assinante **só** é acessado por **/s/:slug**.
- Links para "Cardápio" **com** slug usam `createPageUrl('Cardapio', slug)` → `/s/raiz-maranhense`.
- Links para "Cardápio" **sem** slug usam `createPageUrl('Cardapio')` → **/** (não `/cardapio`).

---

## Contexto do assinante (slug e email)

Todas as páginas em **/s/:slug** e **/s/:slug/...** usam:

1. **`useParams().slug`** → ex.: `raiz-maranhense`
2. **`/public/cardapio/:slug`** → retorna `subscriber_email` (e dados públicos: store, dishes, etc.)
3. **`useSlugContext()`** → `{ slug, subscriberEmail, inSlugContext, publicData }`

### Gestor, Painel, Cozinha, PDV, Entregador em /s/:slug

- O **email do assinante** (`subscriber_email`) vem da API pública e **não** do login.
- Chamadas à API usam `as_subscriber: subscriberEmail` quando:
  - o usuário é **master** em contexto `/s/:slug` (age em nome do assinante), ou
  - o backend já filtra por `subscriber_id` do usuário (assinante/colaborador).
- Pedidos feitos no cardápio **/s/:slug** recebem `owner_email: publicData.subscriber_email` para caírem no Gestor correto.

### Resumo "email personalizado"

O "email" que amarra o **link** (/s/raiz-maranhense) ao **assinante** é o `subscriber_email` resolvido pelo slug:

- **Cardápio /s/:slug**: dados de `/public/cardapio/:slug`; pedidos com `owner_email = subscriber_email`.
- **Gestor e demais /s/:slug/...**: `useSlugContext` → `subscriberEmail` → `as_subscriber` nas chamadas.
- Assim, gestor, painel, cozinha, PDV e entregador em **/s/raiz-maranhense** ficam todos no contexto do **mesmo** assinante (Raiz Maranhense), sem misturar com outros ou com o master.

---

## createPageUrl (utils)

- `createPageUrl('Cardapio', slug)` → `/s/{slug}`
- `createPageUrl('Cardapio')` (sem slug) → **/** (não `/cardapio`)
- `createPageUrl('GestorPedidos', slug)` → `/s/{slug}/GestorPedidos`
- `createPageUrl('Admin')` → `/Admin` (sempre, sem slug)

Use sempre `createPageUrl` com o **slug** quando estiver em páginas /s/:slug para manter links coerentes com o assinante.
