# Logins por estabelecimento (slug)

Cada estabelecimento pode ter **telas de login próprias**, identificadas pela URL com seu **slug**, com **tema e logo** do estabelecimento. Isso evita conflito entre logins de estabelecimentos diferentes e deixa claro em qual lugar o usuário está entrando.

## URLs

| Tipo            | URL global (genérica)   | URL por estabelecimento (recomendada)   |
|-----------------|------------------------|----------------------------------------|
| **Assinante**   | `/login/assinante`     | `/s/:slug/login`                       |
| **Cliente**     | `/login/cliente`       | `/s/:slug/login/cliente`               |
| **Colaborador** | `/login/colaborador`   | `/s/:slug/login/colaborador`           |

Exemplos:
- `https://app.digimenu.com/s/pizzaria-xyz/login` → login do dono/assinante da Pizzaria XYZ  
- `https://app.digimenu.com/s/pizzaria-xyz/login/cliente` → login de cliente nessa pizzaria  
- `https://app.digimenu.com/s/pizzaria-xyz/login/colaborador` → login de colaborador (garçom, PDV, etc.) dessa pizzaria  

## Comportamento

- **Tema e logo:** A página busca `GET /api/public/login-info/:slug` (nome, logo, cores do tema) e aplica no header e no botão de entrar.
- **Slug inválido:** Se o slug não existir, é exibida a mensagem “Estabelecimento não encontrado” e link para o início.
- **Redirect pós-login:**
  - **Cliente:** volta ao cardápio do slug (`/s/:slug`) ou ao `returnUrl` quando informado.
  - **Colaborador:** vai para `/colaborador` (home do colaborador).
  - **Assinante:** vai para `/s/:slug/PainelAssinante` ou `/PainelAssinante`; se for master, vai para `/Admin`.
- **Autenticação:** O mesmo backend de login é usado; apenas a **tela** e a **URL** mudam. Não há lógica de auth duplicada.

## Onde usar

- **Cardápio (`/s/:slug`):** O botão “Entrar” do cliente já aponta para `/s/:slug/login/cliente` quando há slug, mantendo o contexto do estabelecimento.
- **Compartilhar com a equipe:** O assinante pode enviar para colaboradores o link `/s/meu-restaurante/login/colaborador`.
- **Painel / Admin:** Links para “Login do estabelecimento” podem usar `/s/:slug/login` quando houver slug.

## Redirecionamentos (login e logout)

- **Logout e redirectToLogin** (apiClient): quando a URL atual ou o `returnUrl` contêm slug (`/s/:slug/...`), o redirecionamento vai para `/s/:slug/login`, `/s/:slug/login/cliente` ou `/s/:slug/login/colaborador`. Sem slug (ex.: `/colaborador`, `/PainelGerente`), o usuário é enviado para `/`.
- **URLs genéricas desativadas:** `/login/assinante`, `/login/cliente`, `/login/colaborador` e `/assinante` redirecionam para `/`. Não são mais usadas como destino de login ou logout; o acesso é feito pelos endereços por estabelecimento.

## Estabilidade

- **Favorável e estável:** A solução reutiliza o mesmo fluxo de autenticação; só mudam a rota, o layout e o redirect. O endpoint de login-info é público, leve e somente leitura.

## Arquivos principais

- **Backend:** `GET /api/public/login-info/:slug` em `backend/server.js` (lista de rotas públicas inclui `/api/public/login-info`).
- **Frontend:** `src/hooks/useLoginInfo.js`, `src/pages/auth/LoginBySlug.jsx`, rotas em `src/pages/index.jsx`, links no `Cardapio.jsx`.
