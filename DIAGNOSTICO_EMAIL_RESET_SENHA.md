# 🔍 Diagnóstico: Cliente não recebeu email de reset de senha

## ❌ Problema
Cliente solicitou reset de senha mas não recebeu o email.

## 🔍 Verificações Necessárias

### 1️⃣ Verificar se SendGrid está Configurado

**No Render (Backend):**
1. Acesse o painel do Render
2. Vá em **Environment** → **Environment Variables**
3. Verifique se existe:
   - `SENDGRID_API_KEY` = `SG.xxx...` (deve começar com `SG.`)
   - `EMAIL_FROM` = `noreply@digimenu.com` (ou seu email verificado)

**Se NÃO estiver configurado:**
- ❌ Emails não serão enviados
- ✅ Apenas serão logados no console do backend
- ⚠️ Cliente não receberá email

### 2️⃣ Verificar Logs do Backend

**No Render:**
1. Acesse **Logs** do seu serviço backend
2. Procure por mensagens relacionadas ao email:

**Se SendGrid NÃO está configurado:**
```
⚠️ SENDGRID_API_KEY não configurado. Emails não serão enviados.
📧 ===============================================
   EMAIL (MODO DESENVOLVIMENTO - NÃO ENVIADO)
================================================
Para: cliente@email.com
Assunto: Recuperação de Senha - DigiMenu
...
🔐 [forgot-password] Link de redefinição (email não enviado): https://...
```

**Se SendGrid ESTÁ configurado mas falhou:**
```
❌ [forgot-password] Erro ao enviar email: [detalhes do erro]
❌ Erro ao enviar email via SendGrid: [erro]
```

**Se SendGrid funcionou:**
```
✅ [forgot-password] Email de recuperação enviado para: cliente@email.com
✅ Email enviado via SendGrid para: cliente@email.com
```

### 3️⃣ Verificar Email FROM no SendGrid

**⚠️ CRÍTICO:** O email `EMAIL_FROM` deve estar **verificado** no SendGrid!

1. Acesse: https://app.sendgrid.com/
2. Vá em **Settings** → **Sender Authentication**
3. Verifique se o email configurado em `EMAIL_FROM` está verificado
4. Se não estiver, você precisa:
   - Verificar o domínio OU
   - Verificar o email individual

**Se o email não estiver verificado:**
- ❌ SendGrid **bloqueia** o envio
- ❌ Email não será entregue
- ✅ Aparecerá erro nos logs do backend

### 4️⃣ Verificar URL do Frontend

**No Render:**
- Verifique se `FRONTEND_URL` está configurada corretamente
- Exemplo: `FRONTEND_URL=https://digimenu-chi.vercel.app`

**Se estiver errada:**
- O link no email apontará para URL incorreta
- Cliente pode não conseguir acessar

### 5️⃣ Verificar Spam/Lixo Eletrônico

**Aconselhe o cliente a:**
- ✅ Verificar pasta de **Spam/Lixo Eletrônico**
- ✅ Verificar filtros do email
- ✅ Aguardar alguns minutos (pode haver delay)

## ✅ Solução Passo a Passo

### Se SendGrid NÃO está configurado:

#### 1. Criar conta no SendGrid
1. Acesse: https://sendgrid.com
2. Crie conta gratuita (100 emails/dia)
3. Vá em **Settings** → **API Keys**
4. Clique em **Create API Key**
5. Dê um nome: "DigiMenu Production"
6. Selecione **Restricted Access** → **Mail Send**
7. **Copie a API Key** (só aparece uma vez!)

#### 2. Verificar Email Sender
1. Vá em **Settings** → **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Preencha:
   - **From Email**: `noreply@digimenu.com` (ou seu email)
   - **From Name**: DigiMenu
   - **Reply To**: seu email de suporte
4. Verifique o email que receberá
5. Clique no link de verificação

#### 3. Configurar no Render
1. Acesse o painel do Render
2. Vá em **Environment** → **Environment Variables**
3. Adicione:
   - `SENDGRID_API_KEY` = `SG.sua-api-key-aqui`
   - `EMAIL_FROM` = `noreply@digimenu.com` (o email verificado)
   - `FRONTEND_URL` = `https://digimenu-chi.vercel.app` (sua URL do frontend)

#### 4. Reiniciar Backend
1. No Render, clique em **Manual Deploy** → **Deploy latest commit**
2. Aguarde o deploy completar
3. Verifique os logs para ver: `✅ SendGrid configurado`

### Se SendGrid ESTÁ configurado mas não funciona:

#### Verificar Erros nos Logs

**Erro comum 1: Email não verificado**
```
❌ Erro ao enviar email via SendGrid: The from address does not match a verified Sender Identity
```
**Solução:** Verificar o email no SendGrid (Settings → Sender Authentication)

**Erro comum 2: API Key inválida**
```
❌ Erro ao enviar email via SendGrid: Bad Request
```
**Solução:** Verificar se a API Key está correta e tem permissão de "Mail Send"

**Erro comum 3: Limite excedido**
```
❌ Erro ao enviar email via SendGrid: Forbidden
```
**Solução:** Verificar se não excedeu o limite de 100 emails/dia (plano gratuito)

## 🧪 Testar Envio de Email

### Via API (Teste Rápido)

Você pode testar diretamente via API:

```bash
curl -X POST https://digimenu-backend-3m6t.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@teste.com"}'
```

**Verificar logs do backend** para ver se o email foi enviado ou apenas logado.

### Verificar no SendGrid Dashboard

1. Acesse: https://app.sendgrid.com/
2. Vá em **Activity** → **Email Activity**
3. Procure pelo email enviado
4. Veja o status:
   - ✅ **Delivered**: Email entregue
   - ⚠️ **Bounced**: Email rejeitado
   - ❌ **Blocked**: Email bloqueado
   - ⏳ **Processed**: Em processamento

## 📋 Checklist de Diagnóstico

- [ ] `SENDGRID_API_KEY` está configurada no Render
- [ ] `EMAIL_FROM` está configurada no Render
- [ ] `EMAIL_FROM` está verificado no SendGrid
- [ ] `FRONTEND_URL` está configurada corretamente
- [ ] Backend mostra `✅ SendGrid configurado` nos logs
- [ ] Logs mostram `✅ Email enviado via SendGrid` (não apenas logado)
- [ ] Cliente verificou pasta de spam
- [ ] Testou enviar email de teste

## 🚨 Solução Temporária (Enquanto Configura SendGrid)

Se o cliente precisa redefinir a senha **URGENTE** e SendGrid não está configurado:

1. **Verificar logs do backend** - o link está logado lá
2. **Copiar o link** dos logs
3. **Enviar manualmente** para o cliente via WhatsApp/email pessoal

O link tem formato:
```
https://digimenu-chi.vercel.app/redefinir-senha?token=abc123...
```

**⚠️ IMPORTANTE:** O token expira em 1 hora!

## 📞 Próximos Passos

1. **Configure SendGrid** seguindo os passos acima
2. **Teste** enviando um email de reset para você mesmo
3. **Verifique** se chegou na caixa de entrada (não spam)
4. **Monitore** os logs do backend para garantir que está funcionando
