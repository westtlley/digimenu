# 🔐 Login e tipos de acesso

Uma única **página de login** (`/login`) serve todos os perfis. O formulário (email + senha) é o mesmo; após o login, o **redirecionamento** é feito conforme o perfil retornado pelo backend.

---

## Perfis e destino após o login

| Perfil | Onde vai | O que acessa |
|--------|----------|--------------|
| **Cliente** | `/Cardapio` | Cardápio, salvar dados, histórico de pedidos (`/MeusPedidos`). |
| **Assinante** | `/PainelAssinante` | Painel do restaurante: pedidos, cardápio, PDV, gestor, relatórios, loja, tema, etc. |
| **Admin / Master** | `/Admin` | Painel master: tudo do assinante + Assinantes, Editar Página de Vendas, configurações globais. |
| **Entregador** | Conforme `returnUrl` (ex. `/Entregador`) | App do entregador. O vínculo é por email; o acesso a `/Entregador` é verificado na própria página. |

---

## Regras de redirecionamento

1. **Cliente** (`role === 'customer'`): sempre → **Cardápio**.
2. **Assinante** (não master) com `returnUrl` = `/Admin` → **PainelAssinante** (não pode acessar Admin).
3. **Master** com `returnUrl` = `/PainelAssinante` → **Admin**.
4. **`returnUrl` vazio, `/` ou `/login`**:  
   - Cliente → Cardápio  
   - Master → Admin  
   - Demais → PainelAssinante  
5. **`returnUrl` específico** (ex. `/Entregador`, `/Cardapio`): é respeitado; a página de destino faz suas próprias checagens de permissão.

---

## Onde cada um se cadastra

| Perfil | Cadastro / Aquisição |
|--------|----------------------|
| **Cliente** | `/cadastro-cliente` |
| **Assinante** | Página de venda `/Assinar` (ou fluxo de contratação). O master cria/edita assinantes em **Admin → Assinantes**. |
| **Admin / Master** | Por convite; não há cadastro público. Solicitar via WhatsApp ou processo interno. |
| **Entregador** | Vinculado pelo master em **Admin** (ou no Gestor); o email do usuário deve bater com o do entregador. |

---

## URLs importantes

- **Login:** `/login` (canônico). `/Login` redireciona para `/login`.
- **Cardápio (público):** `/` ou `/Cardapio`
- **Painel Assinante:** `/PainelAssinante`
- **Admin:** `/Admin`
- **Assinantes (master):** `/Assinantes`
- **App Entregador:** `/Entregador`
- **Definir senha (token):** `/definir-senha` ou `/setup-password`

---

## Backend

O `POST /api/auth/login` deve retornar, no mínimo:

- `token`
- `user`: `{ id, email, full_name, is_master, role }`

Para o cliente ser redirecionado ao Cardápio, `user.role` deve ser `'customer'` (ajustar no backend conforme a origem do usuário, ex. cadastro em `/cadastro-cliente`).
