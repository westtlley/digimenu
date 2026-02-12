# Guia de Configuração: Email e Google OAuth

Este guia explica como configurar o serviço de email para recuperação de senha e o login com Google OAuth para clientes.

## ⚡ Resumo Rápido

### 📧 Email
- ✅ **SendGrid já está implementado e é a opção padrão**
- ⚠️ Se você gerou uma senha de app do Gmail, **NÃO precisa dela** se for usar SendGrid
- A senha de app do Gmail só é necessária se você quiser usar Gmail (não recomendado)

### 🔐 Google OAuth
- ✅ **100% implementado** - Apenas configure as credenciais no Google Cloud Console

---

## 📧 Configuração de Email para Recuperação de Senha

### ✅ RECOMENDADO: SendGrid (Já Implementado)

**O sistema já está configurado para usar SendGrid!** Esta é a opção recomendada e mais confiável.

**⚠️ IMPORTANTE**: Se você gerou uma senha de app do Gmail, você **NÃO precisa** dela se for usar SendGrid. O sistema usa SendGrid automaticamente quando `SENDGRID_API_KEY` está configurado.

---

### ✅ Opção 1: Usando SendGrid (RECOMENDADO - JÁ IMPLEMENTADO)

**Esta é a opção que o sistema usa por padrão!** Se você já configurou SendGrid, está tudo certo. ✅

#### Passo 1: Criar conta no SendGrid
1. Acesse https://sendgrid.com
2. Crie uma conta gratuita (até 100 emails/dia)
3. Vá em **Settings** > **API Keys**
4. Clique em **Create API Key**
5. Dê um nome (ex: "DigiMenu Production")
6. Selecione **Full Access** ou **Restricted Access** (recomendado: Restricted Access com permissões de "Mail Send")
7. Copie a API Key (ela só aparece uma vez!)

#### Passo 2: Instalar SDK ✅ JÁ INSTALADO

O pacote `@sendgrid/mail` já foi instalado. Se precisar reinstalar:

```bash
cd backend
npm install @sendgrid/mail
```

#### Passo 3: Configurar variável de ambiente

**No arquivo `.env` do backend**, adicione:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.sua-api-key-aqui
EMAIL_FROM=noreply@digimenu.com
```

**⚠️ IMPORTANTE:**
- Substitua `SG.sua-api-key-aqui` pela sua API Key real do SendGrid
- O `EMAIL_FROM` deve ser um email verificado no SendGrid (Settings > Sender Authentication)
- Para envio na UE (Europa), você pode descomentar a linha no código: `sgMail.setDataResidency('eu');`

#### Passo 4: Verificar configuração ✅ JÁ IMPLEMENTADO

O serviço de email já está configurado em `backend/utils/emailService.js` e usa SendGrid automaticamente quando `SENDGRID_API_KEY` está configurado.

**Funcionalidades já implementadas:**
- ✅ Envio de email de recuperação de senha
- ✅ Envio de email de boas-vindas para assinantes
- ✅ Envio de email de renovação de assinatura
- ✅ Envio de email de aviso de expiração
- ✅ Envio de email de assinatura expirada

**Modo de desenvolvimento:**
- Se `SENDGRID_API_KEY` não estiver configurado, os emails serão apenas logados no console (não enviados)
- Isso permite desenvolvimento sem custos enquanto você não configura o SendGrid

---

### ⚠️ Opção 2: Usando Nodemailer com Gmail (Alternativa - NÃO RECOMENDADO)

**⚠️ Esta opção é apenas se você NÃO quiser usar SendGrid e quiser modificar o código.**

**Desvantagens do Gmail:**
- Limite de 500 emails/dia (pode ser bloqueado)
- Requer senha de app (menos seguro)
- Não é ideal para produção
- Pode ser bloqueado pelo Google se enviar muitos emails
- **Requer modificação do código** (não está implementado por padrão)

**Use apenas se:**
- Está testando localmente
- Não quer criar conta no SendGrid
- Enviará poucos emails (< 50/dia)
- **E está disposto a modificar o código** em `backend/utils/emailService.js`

**⚠️ NOTA IMPORTANTE**: 
- Se você gerou uma senha de app do Gmail mas vai usar SendGrid, você **NÃO precisa** dessa senha do Gmail
- O sistema usa SendGrid por padrão quando `SENDGRID_API_KEY` está configurado
- A senha de app do Gmail só é necessária se você quiser usar Gmail ao invés de SendGrid (não recomendado)

#### Passo 1: Instalar dependências

```bash
cd backend
npm install nodemailer
```

#### Passo 2: Configurar variáveis de ambiente

Adicione no arquivo `.env` do backend:

```env
# Email Configuration (Gmail - Alternativa)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM=noreply@digimenu.com
```

**⚠️ IMPORTANTE**: Para usar Gmail (não recomendado), você precisa criar uma "Senha de App":
1. Acesse https://myaccount.google.com/apppasswords
2. Selecione "App" e "Mail"
3. Gere uma senha de app
4. Use essa senha no `EMAIL_PASS` (não use sua senha normal do Gmail)

**⚠️ NOTA CRÍTICA**: 
- Se você usar Gmail, precisará **modificar o código** em `backend/utils/emailService.js` para usar Nodemailer ao invés de SendGrid
- Isso **não é recomendado** e não está implementado por padrão
- **Recomendação**: Use SendGrid (Opção 1) que já está implementado e funcionando

---

### Opção 3: Usando AWS SES (Para alta escala)

Consulte a documentação oficial: https://docs.aws.amazon.com/ses/

---

## 🔐 Login com Google OAuth ✅ IMPLEMENTADO

O Google OAuth já está **100% implementado** no sistema! Você só precisa configurar as credenciais.

### 🚀 Configuração Rápida (5 minutos)

#### Passo 1: Criar projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com
2. Faça login com sua conta Google
3. Clique em **"Selecionar um projeto"** → **"Novo Projeto"**
4. Nomeie o projeto (ex: "DigiMenu")
5. Clique em **"Criar"** e aguarde alguns segundos

#### Passo 2: Configurar Tela de Consentimento OAuth

1. No menu lateral, vá em **"APIs e Serviços"** → **"Tela de consentimento OAuth"**
2. Selecione **"Externo"** (para desenvolvimento/testes) ou **"Interno"** (se tiver Google Workspace)
3. Preencha os campos obrigatórios:
   - **Nome do aplicativo**: DigiMenu
   - **Email de suporte do usuário**: seu email
   - **Email do desenvolvedor**: seu email
4. Clique em **"Salvar e continuar"**
5. Na tela de **Escopos**, clique em **"Salvar e continuar"** (já vem com os escopos padrão)
6. Na tela de **Usuários de teste**, adicione emails que podem testar (opcional para desenvolvimento)
7. Clique em **"Voltar ao painel"**

#### Passo 3: Criar Credenciais OAuth 2.0

1. Vá em **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ Criar credenciais"** → **"ID do cliente OAuth"**
3. Selecione **"Aplicativo da Web"**
4. Configure:
   - **Nome**: DigiMenu Web Client
   - **URIs de redirecionamento autorizados** (clique em "+ Adicionar URI"):
     - **Desenvolvimento**: `http://localhost:3000/api/auth/google/callback`
     - **Produção**: `https://seu-backend.onrender.com/api/auth/google/callback` (substitua pela sua URL)
5. Clique em **"Criar"**
6. **⚠️ IMPORTANTE**: Copie o **Client ID** e **Client Secret** imediatamente (você só verá o secret uma vez!)

#### Passo 4: Configurar Variáveis de Ambiente

**No arquivo `.env` do backend**, adicione:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=seu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

**Para produção (Render/Vercel):**

1. **No Render (Backend)**:
   - Vá em **Environment** → **Environment Variables**
   - Adicione:
     - `GOOGLE_CLIENT_ID` = seu-client-id
     - `GOOGLE_CLIENT_SECRET` = seu-client-secret
     - `BACKEND_URL` = https://seu-backend.onrender.com
     - `FRONTEND_URL` = https://seu-frontend.vercel.app

2. **Atualizar URIs no Google Console**:
   - Volte ao Google Cloud Console
   - Edite seu **ID do cliente OAuth**
   - Adicione a URI de produção: `https://seu-backend.onrender.com/api/auth/google/callback`
   - Clique em **"Salvar"**

### Passo 5: Testar o Login com Google ✅

1. **Reinicie o backend** (para carregar as novas variáveis)
2. Acesse a página de cadastro: `/cadastro-cliente`
3. Clique no botão **"Continuar com Google"**
4. Você será redirecionado para o Google
5. Faça login e autorize o acesso
6. Você será redirecionado de volta e estará logado automaticamente!

### ✅ O que já está implementado:

- ✅ Backend configurado com Passport Google Strategy
- ✅ Rotas `/api/auth/google` e `/api/auth/google/callback` funcionando
- ✅ Criação automática de usuário como cliente (role='customer')
- ✅ Criação automática de registro na tabela `customers`
- ✅ Geração automática de token JWT
- ✅ Frontend com botão "Continuar com Google" na página de cadastro
- ✅ Página de callback `GoogleCallback.jsx` implementada
- ✅ Redirecionamento automático após login

### 📋 Checklist de Configuração:

- [ ] Criar projeto no Google Cloud Console
- [ ] Configurar tela de consentimento OAuth
- [ ] Criar credenciais OAuth 2.0
- [ ] Adicionar URIs de redirecionamento (desenvolvimento e produção)
- [ ] Copiar Client ID e Client Secret
- [ ] Adicionar variáveis no `.env` do backend
- [ ] Adicionar variáveis no Render (produção)
- [ ] Atualizar URIs no Google Console para produção
- [ ] Testar login com Google

### 🔧 Como Funciona (Fluxo Completo):

### 📖 Detalhes Técnicos (Já Implementado):

O código já está implementado em `backend/server.js`. Aqui está o que acontece:

```javascript
// Rota de callback do Google OAuth
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { session: false }),
  asyncHandler(async (req, res) => {
    try {
      const profile = req.user;
      
      if (!profile || !profile.email) {
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
      }
      
      const emailLower = profile.email.toLowerCase();
      
      // Verificar se usuário já existe
      let user = null;
      if (usePostgreSQL) {
        user = await repo.getUserByEmail(emailLower);
      } else if (db && db.users) {
        user = db.users.find(u => (u.email || '').toLowerCase() === emailLower);
      }
      
      // Se não existe, criar como cliente
      if (!user) {
        const userData = {
          email: emailLower,
          full_name: profile.displayName || profile.name || 'Usuário',
          password: null, // Sem senha para login Google
          role: 'customer', // Cliente por padrão
          is_master: false,
          subscriber_email: null,
          google_id: profile.id,
          google_photo: profile.photos?.[0]?.value || null
        };
        
        if (usePostgreSQL) {
          user = await repo.createUser(userData);
        } else if (db && db.users) {
          user = {
            id: String(Date.now()),
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(user);
          if (saveDatabaseDebounced) saveDatabaseDebounced(db);
        }
        
        // Criar também registro em customers
        const customerData = {
          email: emailLower,
          name: userData.full_name,
          phone: null,
          address: null,
          complement: null,
          neighborhood: null,
          city: null,
          zipcode: null,
          subscriber_email: null,
          birth_date: null,
          cpf: null,
          password_hash: null
        };
        
        if (usePostgreSQL) {
          try {
            await repo.createCustomer(customerData, null);
          } catch (e) {
            console.warn('⚠️ Erro ao criar customer (não crítico):', e.message);
          }
        }
      } else {
        // Atualizar Google ID se não tiver
        if (!user.google_id && profile.id) {
          if (usePostgreSQL) {
            await repo.updateUser(user.id, {
              google_id: profile.id,
              google_photo: profile.photos?.[0]?.value || null
            });
          } else if (db && db.users) {
            const u = db.users.find(x => x.id === user.id);
            if (u) {
              u.google_id = profile.id;
              u.google_photo = profile.photos?.[0]?.value || null;
              if (saveDatabaseDebounced) saveDatabaseDebounced(db);
            }
          }
        }
      }
      
      // Gerar JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          is_master: user.is_master 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Redirecionar para frontend com token
      res.redirect(`${FRONTEND_URL}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error('❌ Erro no callback do Google:', error);
      res.redirect(`${FRONTEND_URL}/login?error=google_auth_error`);
    }
  })
);
```

### Passo 4: Atualizar frontend para login com Google

No `src/pages/CadastroCliente.jsx`, atualize a função `handleGoogleLogin`:

```javascript
const handleGoogleLogin = async () => {
  try {
    // Redirecionar para rota de autenticação Google
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/api/auth/google`;
  } catch (error) {
    console.error('Erro ao iniciar login Google:', error);
    toast.error('Erro ao iniciar login com Google');
  }
};
```

Crie uma página de callback: `src/pages/auth/GoogleCallback.jsx`:

```javascript
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/apiClient';
import toast from 'react-hot-toast';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const error = searchParams.get('error');
  
  useEffect(() => {
    if (error) {
      toast.error('Erro ao fazer login com Google');
      navigate('/login');
      return;
    }
    
    if (token) {
      // Salvar token
      localStorage.setItem('token', token);
      
      // Buscar dados do usuário
      apiClient.auth.me()
        .then(user => {
          localStorage.setItem('user', JSON.stringify(user));
          toast.success('Login realizado com sucesso!');
          
          // Redirecionar conforme perfil
          if (user.role === 'customer') {
            navigate('/Cardapio');
          } else {
            navigate('/');
          }
        })
        .catch(err => {
          console.error('Erro ao buscar dados do usuário:', err);
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [token, error, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Processando login...</p>
      </div>
    </div>
  );
}
```

Adicione a rota no seu router:
```javascript
<Route path="/auth/google/callback" element={<GoogleCallback />} />
```

---

## ✅ Checklist de Implementação

### Email
- [ ] Instalar nodemailer ou SendGrid
- [ ] Configurar variáveis de ambiente
- [ ] Criar serviço de email
- [ ] Implementar rota de recuperação de senha
- [ ] Testar envio de email

### Google OAuth
- [ ] Criar projeto no Google Cloud Console
- [ ] Configurar OAuth credentials
- [ ] Adicionar variáveis de ambiente
- [ ] Verificar rota de callback
- [ ] Atualizar frontend para login Google
- [ ] Criar página de callback
- [ ] Testar fluxo completo

---

## 🧪 Testando

### Testar Email
```bash
# No backend, você pode testar diretamente:
node -e "
import('./services/email.js').then(m => {
  m.sendPasswordResetEmail('seu-email@teste.com', 'token-teste')
    .then(() => console.log('Email enviado!'))
    .catch(e => console.error('Erro:', e));
});
"
```

### Testar Google OAuth
1. Acesse a página de cadastro/login
2. Clique em "Continuar com Google"
3. Faça login com sua conta Google
4. Verifique se foi redirecionado corretamente

---

## 📝 Notas Importantes

1. **Email em Produção**: Use SendGrid ou AWS SES para produção. Gmail tem limites e pode bloquear.
2. **Segurança**: Nunca commite credenciais no código. Use sempre variáveis de ambiente.
3. **HTTPS**: Em produção, use sempre HTTPS para OAuth funcionar corretamente.
4. **Domínios**: Configure corretamente os domínios autorizados no Google Cloud Console.

---

## 🆘 Troubleshooting

### Email não está sendo enviado
- Verifique as credenciais no `.env`
- Para Gmail, use senha de app (não senha normal)
- Verifique logs do servidor
- Teste conexão SMTP manualmente

### Google OAuth não funciona

#### Erro: "redirect_uri_mismatch"
**Causa**: A URI de callback no Google Console não corresponde à URL do backend.

**Solução**:
1. Verifique a URL exata do seu backend (ex: `http://localhost:3000` ou `https://seu-backend.onrender.com`)
2. Vá no Google Cloud Console → Credenciais → Edite seu OAuth Client
3. Adicione/verifique a URI: `{BACKEND_URL}/api/auth/google/callback`
4. **IMPORTANTE**: A URI deve ser **exatamente igual**, incluindo:
   - `http://` ou `https://`
   - Porta (se for localhost)
   - Caminho completo: `/api/auth/google/callback`
5. Clique em **Salvar** e aguarde alguns minutos para propagar

#### Erro: "invalid_client"
**Causa**: Client ID ou Client Secret incorretos.

**Solução**:
1. Verifique se copiou corretamente do Google Console (sem espaços extras)
2. Verifique se as variáveis estão no `.env` do backend:
   ```env
   GOOGLE_CLIENT_ID=seu-id-aqui.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=seu-secret-aqui
   ```
3. Reinicie o backend após adicionar as variáveis
4. Verifique os logs do backend ao iniciar (deve mostrar "✅ Google OAuth configurado")

#### Erro: "access_denied"
**Causa**: Usuário cancelou a autorização ou o app não está aprovado.

**Solução**:
- Em desenvolvimento, adicione seu email na lista de "Usuários de teste" no Google Console
- Em produção, publique o app ou adicione usuários de teste

#### Botão "Continuar com Google" não aparece ou não funciona
**Solução**:
1. Verifique se o botão está na página `/cadastro-cliente`
2. Abra o console do navegador (F12) e veja se há erros
3. Verifique se `VITE_API_BASE_URL` está configurado no frontend (ou use o padrão `http://localhost:3000`)

#### Usuário não é criado após login com Google
**Solução**:
1. Verifique os logs do backend
2. Certifique-se de que o banco de dados está configurado (`DATABASE_URL`)
3. Verifique se as migrações foram executadas (campos `google_id` e `google_photo` devem existir)

#### Em produção: OAuth funciona em localhost mas não em produção
**Solução**:
1. Adicione a URI de produção no Google Console: `https://seu-backend.onrender.com/api/auth/google/callback`
2. Verifique se `BACKEND_URL` e `FRONTEND_URL` estão corretos no Render
3. Certifique-se de usar HTTPS em produção (Google exige HTTPS)
4. Aguarde alguns minutos após salvar as URIs (propagação)

---

## 📚 Recursos Adicionais

- [Nodemailer Docs](https://nodemailer.com/about/)
- [SendGrid Docs](https://docs.sendgrid.com/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Passport Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
