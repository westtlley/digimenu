# ✅ Schema Atualizado - Compatível com Testes

## 📋 Alterações Aplicadas

### ✅ Tabela `users`
- ✅ Adicionado `password_hash` (necessário para testes)
- ✅ Mantido `password` (legado, pode remover depois)
- ✅ Adicionados campos de autenticação: `has_password`, `password_token`, `token_expires_at`
- ✅ Adicionado `profile_role`
- ✅ Adicionados campos de perfil: `phone`, `address`, `city`, `state`, `birth_date`, `document`
- ✅ Adicionado `active` flag

### ✅ Tabela `subscribers`
- ✅ Adicionado `slug` (necessário para testes e sistema)
- ✅ Adicionados campos de password/setup: `linked_user_email`, `has_password`, `password_token`, `token_expires_at`
- ✅ Adicionados campos extras: `phone`, `cnpj_cpf`, `notes`, `origem`, `tags`

### ✅ Índices
- ✅ Adicionado `idx_users_subscriber_email` para performance
- ✅ Adicionado `idx_subscribers_slug` para busca por slug

### ✅ Correções em Testes
- ✅ `testHelpers.js` atualizado para usar `full_name` em vez de `name` na tabela `users`
- ✅ INSERT do admin atualizado para usar `password_hash`

## 🧪 Testes Agora Devem Passar

Os testes que estavam falhando por causa de:
- ❌ `coluna "password_hash" da relação "users" não existe` → ✅ **CORRIGIDO**
- ❌ `coluna "slug" da relação "subscribers" não existe` → ✅ **CORRIGIDO**

## 📝 Próximos Passos

1. **Rodar migrations** (se necessário):
   ```bash
   cd backend
   npm run migrate
   ```

2. **Rodar testes**:
   ```bash
   npm test
   ```

3. **Se houver banco de teste existente**, pode precisar recriar:
   ```bash
   # Os testes criam bancos isolados automaticamente
   npm test
   ```

---

**Status:** ✅ Schema atualizado e compatível com testes
