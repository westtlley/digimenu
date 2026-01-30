# 🔧 Resolver Erro de Slug - Passo a Passo

## 🎯 Problema

Erro ao tentar salvar o slug `pratodahora`:
- ❌ Erro 500: `/api/functions/updateMasterSlug`
- ❌ Slug já está em uso pelo subscriber "Raiz Maranhense"
- ❌ Coluna `slug` pode não existir na tabela `users`

---

## ✅ Solução Completa

Execute **NA ORDEM** as URLs abaixo no seu navegador:

---

### **PASSO 1: Deletar o subscriber "Raiz Maranhense"**

Abra esta URL para liberar o slug `pratodahora`:

```
https://digimenu-backend-3m6t.onrender.com/api/delete-subscriber-by-slug?key=@Erlane.emt2407&slug=pratodahora
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Subscriber \"Raiz Maranhense\" deletado com sucesso!"
}
```

---

### **PASSO 2: Adicionar coluna slug na tabela users**

Abra esta URL para executar a migração SQL:

```
https://digimenu-backend-3m6t.onrender.com/api/run-migration?key=@Erlane.emt2407&migration=add_slug_to_users
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Migração executada com sucesso!"
}
```

---

### **PASSO 3: Configurar seu slug**

Agora volte para o painel Admin:

1. **Recarregue a página** (F5)
2. Vá em **Admin** → **Loja**
3. Digite o slug: `pratodahora`
4. Clique em **Salvar**
5. ✅ Deve funcionar!

---

## 🔍 Verificar se Funcionou

Após executar os passos acima:

1. O botão **"Cardápio"** deve aparecer no header
2. Ao clicar, deve abrir: `https://digimenu-chi.vercel.app/s/pratodahora`
3. Seu cardápio deve estar acessível

---

## 🚨 Se Ainda Houver Erro

Se o erro persistir, execute esta URL para ver os logs:

```
https://digimenu-backend-3m6t.onrender.com/api/debug-user?key=@Erlane.emt2407
```

Isso vai mostrar:
- Seu usuário master
- Se a coluna slug existe
- Quais subscribers existem
- Possíveis conflitos
