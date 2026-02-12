# Governança do perfil Gerente

Este documento descreve as regras de acesso e limites do perfil **Gerente** (colaborador com perfil `gerente`), para manter o uso alinhado ao estabelecimento (assinante) e permitir a gestão de outros colaboradores de forma segura.

## Visão geral

- O **Gerente** é um colaborador com perfil especial: pode acessar um painel próprio (diferente do painel do assinante/dono) e gerenciar outros colaboradores do **mesmo estabelecimento**.
- O acesso do Gerente é **sempre limitado ao assinante** (estabelecimento) ao qual está vinculado (`subscriber_email`).
- Apenas o **dono do estabelecimento** (assinante) ou o **master** pode criar, editar ou remover outro perfil **Gerente**.

## O que o Gerente pode fazer

1. **Painel próprio (Painel do Gerente)**
   - Acessar um painel em `/PainelGerente` com **identidade visual própria** (header roxo, "Painel do Gerente").
   - **Mesmas ferramentas** que o assinante: dashboard, pedidos, cardápio, financeiro, caixa, comandas, mesas, tema, loja, impressora, WhatsApp, colaboradores, 2FA, LGPD, promoções, cupons, zonas de entrega, etc. (cargo de confiança).
   - Aba **Meu perfil** para preencher e editar seus dados (nome, foto, telefone, etc.); esses dados aparecem nos apps (Garçom, PDV, Cozinha, Entregador).

2. **Acesso aos aplicativos**
   - Acessar todos os apps do estabelecimento: Gestor de Pedidos, Garçom, PDV, Cozinha, Entregador (links pelo slug).

3. **Colaboradores**
   - **Criar** novos colaboradores apenas com os perfis: **Entregador, Cozinha, PDV e Garçom** (não pode criar outro Gerente).
   - **Adicionar perfis** a colaboradores existentes apenas entre: Entregador, Cozinha, PDV, Garçom.
   - **Editar** colaboradores que **não** tenham o perfil Gerente (nome, senha, etc.).
   - **Ver** a lista de todos os colaboradores do estabelecimento (incluindo outros Gerentes, mas sem poder editá-los/removê-los).
   - **Não pode** editar nem remover outro usuário que tenha o perfil Gerente.

## O que o Gerente não pode fazer

- Criar ou atribuir o perfil **Gerente** a ninguém (nem a si mesmo; isso é feito pelo assinante/master).
- Editar ou remover outro colaborador que tenha o perfil **Gerente**.
- Acessar o painel do **assinante** (dono) com as mesmas permissões do dono (configurações de loja, plano, assinatura, etc.). O gerente usa apenas o **Painel do Gerente**.
- Ver ou gerenciar colaboradores de **outro** estabelecimento (sempre filtrado por `subscriber_email`).

## Regras no backend

- **GET /api/colaboradores**  
  Se o usuário for Gerente, o `owner` é forçado a `req.user.subscriber_email` (só vê o próprio estabelecimento).

- **POST /api/colaboradores**  
  Se o usuário for Gerente:  
  - `roles` não podem incluir `gerente`; apenas entregador, cozinha, pdv, garcom.  
  - O assinante (`owner`) deve ser o mesmo que `req.user.subscriber_email`.

- **POST /api/colaboradores/:email/add-roles**  
  Se o usuário for Gerente, o perfil `gerente` não pode ser adicionado.

- **PATCH /api/colaboradores/:id**  
  Se o usuário for Gerente, não pode editar um colaborador cujo `profile_role` seja `gerente`.

- **DELETE /api/colaboradores/:id**  
  Se o usuário for Gerente, não pode remover um colaborador cujo `profile_role` seja `gerente`.

## Sugestões para evoluir a governança

1. **Auditoria**  
   Registrar em log quando um Gerente criar/editar/remover colaborador (quem, quando, qual estabelecimento).

2. **Limite de colaboradores por Gerente**  
   Opcional: definir um número máximo de colaboradores que um Gerente pode criar no estabelecimento (ex.: plano Pro até 10, Ultra até 50).

3. **Aprovação do dono**  
   Opcional: novos colaboradores criados pelo Gerente ficarem “pendentes” até o assinante aprovar.

4. **Permissões granulares**  
   No futuro, permitir ao assinante escolher o que o Gerente pode fazer (ex.: só criar Entregador e Garçom, sem PDV/Cozinha).

5. **Dois fatores (2FA)**  
   Exigir 2FA para perfil Gerente para reduzir risco de uso indevido da conta.

6. **Revogação de Gerente**  
   Garantir que apenas o assinante ou o master possa remover o perfil Gerente de um usuário (já implementado: Gerente não pode remover outro Gerente).

Implementações atuais cobrem os itens essenciais; as sugestões acima podem ser adotadas em versões futuras conforme a necessidade do produto.
