# 🔐 Trocar e manter seguro o acesso Admin Master

## Como trocar sua senha

1. **Faça login** como Admin Master (email com `is_master: true`).
2. No **Admin**, no topo, clique no botão **"Senha"** (ícone de chave).
3. Preencha:
   - **Senha atual**
   - **Nova senha** (mínimo 6 caracteres)
   - **Confirmar nova senha**
4. Clique em **Alterar senha**.

A partir do próximo login, use a nova senha.

---

## Boas práticas de segurança

- **Senha forte:** use letras, números e símbolos; evite datas e palavras óbvias.
- **Não compartilhe** a senha; se outra pessoa precisar de acesso master, faça a transferência (veja abaixo).
- **JWT_SECRET em produção:** no backend, defina `JWT_SECRET` no `.env` com um valor longo e aleatório. Não use o padrão em produção.
- **HTTPS:** use sempre HTTPS em produção.
- **Troque a senha padrão:** se ainda usa `admin123`, altere imediatamente pelo botão **Senha** no Admin.

---

## O que foi alterado no sistema

- **Bypass removido:** o login **não** aceita mais o par fixo `admin@digimenu.com` + `admin123` sem conferir a senha do banco. A senha é sempre verificada (bcrypt ou legado em texto, para migração).
- **Legado:** se a senha no banco estiver em texto (ex. `admin123`), o login ainda funciona. Ao alterar pelo Admin, ela passa a ser armazenada em hash (bcrypt).
- **Persistência (JSON):** só são gravadas no arquivo senhas em hash bcrypt. Senhas em texto não são mais salvas.
- **Recuperação:** se o admin padrão ficar sem senha no banco (ex. após migração), o login aceita `admin123` uma vez para que você entre e altere a senha.

---

## Como transferir o acesso Master para outro email

Hoje isso é feito **direto no banco de dados**. Não há tela no Admin para isso.

### PostgreSQL

1. Conceder master ao novo usuário (criar usuário se não existir e marcar `is_master`):

```sql
-- Exemplo: tornar outro@email.com master (e o atual deixa de ser)
UPDATE users SET is_master = FALSE WHERE email = 'admin@digimenu.com';
UPDATE users SET is_master = TRUE  WHERE email = 'outro@email.com';
-- Se outro@email.com não existir, crie antes com INSERT.
```

2. O novo master precisa ter **senha definida** (bcrypt). Se for um usuário que já usava “Definir senha” (token), a senha já estará em hash. Caso contrário, use a API ou um script para fazer `bcrypt.hash(novaSenha, 10)` e gravar em `users.password`.

### JSON (arquivo `backend/db/data/database.json`)

1. Em `users`, localize o usuário com `is_master: true` e mude para `false`.
2. No usuário que será o novo master, defina `is_master: true`.
3. Se esse usuário ainda não existir em `users`, crie o objeto com `email`, `full_name`, `password` (só hash bcrypt ou use “Definir senha” / fluxo de convite para ele definir).  
4. **Importante:** no JSON, o sistema só persiste `password` quando for hash bcrypt (`$2...`). Não coloque senha em texto.

---

## Endpoints usados

| Método | Rota | Uso |
|--------|------|-----|
| `POST` | `/api/auth/change-password` | Alterar a própria senha (requer JWT). Body: `{ currentPassword, newPassword }`. |

---

## Resumo

- **Trocar senha:** Admin → botão **Senha** (ícone de chave) no topo.
- **Manter seguro:** senha forte, não compartilhar, `JWT_SECRET` em produção, HTTPS, trocar `admin123` assim que possível.
- **Transferir master:** ajuste `is_master` (e `password` se necessário) direto no banco (PostgreSQL ou JSON).
