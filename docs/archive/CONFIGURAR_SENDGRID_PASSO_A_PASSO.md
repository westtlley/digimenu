# 📧 Configurar SendGrid - Passo a Passo Completo

## 🎯 Objetivo
Configurar SendGrid para que os emails de reset de senha sejam enviados corretamente.

---

## ✅ Passo 1: Criar Conta no SendGrid

1. Acesse: https://sendgrid.com
2. Clique em **"Start for free"** ou **"Sign Up"**
3. Preencha:
   - Nome
   - Email
   - Senha
4. Confirme seu email
5. Complete o cadastro

**Plano Gratuito:**
- ✅ 100 emails/dia
- ✅ Sem necessidade de cartão de crédito
- ✅ Ideal para começar

---

## ✅ Passo 2: Verificar Email Sender (CRÍTICO!)

**⚠️ IMPORTANTE:** Você DEVE verificar um email sender antes de enviar emails!

### Opção A: Verificar Email Individual (Mais Rápido)

1. Acesse: https://app.sendgrid.com/
2. Vá em **Settings** → **Sender Authentication** → **Verify a Single Sender**
3. Preencha:
   - **From Email**: `noreply@digimenu.com` (ou seu email pessoal para testes)
   - **From Name**: `DigiMenu`
   - **Reply To**: seu email de suporte
   - **Company Address**: endereço da empresa
   - **City**: sua cidade
   - **State**: seu estado
   - **Country**: seu país
   - **Zip Code**: seu CEP
4. Clique em **"Create"**
5. **Verifique seu email** - você receberá um email do SendGrid
6. Clique no link de verificação no email
7. ✅ Email verificado!

**⚠️ IMPORTANTE:** 
- Use um email que você tem acesso (para verificar)
- Para produção, considere verificar um domínio completo (mais profissional)

### Opção B: Verificar Domínio Completo (Recomendado para Produção)

1. Vá em **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Siga as instruções para adicionar registros DNS
3. Mais profissional, mas requer acesso ao DNS do domínio

---

## ✅ Passo 3: Criar API Key

1. Acesse: https://app.sendgrid.com/
2. Vá em **Settings** → **API Keys**
3. Clique em **"Create API Key"**
4. Configure:
   - **API Key Name**: `DigiMenu Production` (ou outro nome)
   - **API Key Permissions**: 
     - ✅ **Restricted Access** (recomendado)
     - Selecione: **Mail Send** → **Full Access**
5. Clique em **"Create & View"**
6. **⚠️ COPIE A API KEY AGORA!** Ela só aparece uma vez!
   - Formato: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Guarde em local seguro

---

## ✅ Passo 4: Configurar no Render (Backend)

1. Acesse o painel do Render: https://dashboard.render.com/
2. Selecione seu serviço **Backend**
3. Vá em **Environment** → **Environment Variables**
4. Clique em **"Add Environment Variable"**
5. Adicione as seguintes variáveis:

### Variável 1: SENDGRID_API_KEY
- **Key**: `SENDGRID_API_KEY`
- **Value**: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (cole a API Key que você copiou)
- Clique em **"Save Changes"**

### Variável 2: EMAIL_FROM
- **Key**: `EMAIL_FROM`
- **Value**: `noreply@digimenu.com` (ou o email que você verificou no SendGrid)
- ⚠️ **DEVE ser o mesmo email que você verificou no Passo 2!**
- Clique em **"Save Changes"**

### Variável 3: FRONTEND_URL (se ainda não tiver)
- **Key**: `FRONTEND_URL`
- **Value**: `https://digimenu-chi.vercel.app` (sua URL do frontend)
- Clique em **"Save Changes"**

---

## ✅ Passo 5: Reiniciar Backend

1. No Render, vá em **Manual Deploy** → **Deploy latest commit**
2. Aguarde o deploy completar
3. Vá em **Logs** e verifique se aparece:
   ```
   ✅ SendGrid configurado
   ```

**Se aparecer essa mensagem, está tudo certo! ✅**

---

## 🧪 Passo 6: Testar Envio de Email

### Opção A: Testar via Interface (Recomendado)

1. Acesse sua aplicação
2. Vá em **"Esqueci minha senha"**
3. Digite um email que você tem acesso
4. Clique em **"Enviar link"**
5. Verifique:
   - ✅ **Logs do backend** devem mostrar: `✅ Email enviado via SendGrid`
   - ✅ **Email deve chegar** na caixa de entrada (ou spam)

### Opção B: Testar via API

```bash
curl -X POST https://digimenu-backend-3m6t.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@teste.com"}'
```

Verifique os logs do backend para ver se o email foi enviado.

---

## 🔍 Verificar Status no SendGrid Dashboard

1. Acesse: https://app.sendgrid.com/
2. Vá em **Activity** → **Email Activity**
3. Você verá todos os emails enviados com status:
   - ✅ **Delivered**: Email entregue
   - ⚠️ **Bounced**: Email rejeitado (email inválido)
   - ❌ **Blocked**: Email bloqueado (spam)
   - ⏳ **Processed**: Em processamento

---

## 🐛 Problemas Comuns e Soluções

### ❌ Erro: "The from address does not match a verified Sender Identity"

**Causa:** O email em `EMAIL_FROM` não está verificado no SendGrid.

**Solução:**
1. Verifique se o email está verificado (Passo 2)
2. Certifique-se de que `EMAIL_FROM` no Render é **exatamente igual** ao email verificado
3. Reinicie o backend

### ❌ Erro: "Bad Request" ou "Forbidden"

**Causa:** API Key inválida ou sem permissões.

**Solução:**
1. Verifique se a API Key está correta (sem espaços extras)
2. Certifique-se de que a API Key tem permissão de **Mail Send**
3. Crie uma nova API Key se necessário

### ❌ Erro: "Limit exceeded"

**Causa:** Excedeu o limite de 100 emails/dia (plano gratuito).

**Solução:**
- Aguarde até o próximo dia OU
- Faça upgrade do plano SendGrid

### ❌ Email não chega (mas logs mostram sucesso)

**Causa:** Email pode estar em spam ou filtros.

**Solução:**
1. Verifique pasta de **Spam/Lixo Eletrônico**
2. Verifique filtros do email
3. Aguarde alguns minutos (pode haver delay)
4. Verifique no SendGrid Dashboard (Activity) o status do email

### ❌ Logs mostram: "⚠️ SENDGRID_API_KEY não configurado"

**Causa:** Variável não está configurada ou backend não foi reiniciado.

**Solução:**
1. Verifique se `SENDGRID_API_KEY` está no Render
2. Certifique-se de que não há espaços extras
3. Reinicie o backend (Manual Deploy)

---

## 📋 Checklist Final

- [ ] Conta criada no SendGrid
- [ ] Email sender verificado (Passo 2)
- [ ] API Key criada e copiada
- [ ] `SENDGRID_API_KEY` configurada no Render
- [ ] `EMAIL_FROM` configurada no Render (mesmo email verificado)
- [ ] `FRONTEND_URL` configurada no Render
- [ ] Backend reiniciado
- [ ] Logs mostram: `✅ SendGrid configurado`
- [ ] Teste de envio funcionou
- [ ] Email chegou na caixa de entrada

---

## 🎉 Pronto!

Se todos os itens do checklist estão marcados, o SendGrid está configurado e funcionando! 

Os emails de reset de senha agora serão enviados automaticamente para os clientes.

---

## 📞 Suporte

Se ainda tiver problemas:
1. Verifique os logs do backend no Render
2. Verifique o SendGrid Dashboard (Activity)
3. Consulte o arquivo `DIAGNOSTICO_EMAIL_RESET_SENHA.md` para mais detalhes
