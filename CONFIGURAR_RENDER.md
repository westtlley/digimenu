# 🔧 Configurar Backend no Render com Cloudinary

## ⚠️ Problema Atual

O backend no Render (`https://digimenu-backend-3m6t.onrender.com`) está recebendo requisições de upload, mas precisa ter:
1. ✅ A rota `/api/upload-image` configurada (já está no código)
2. ❌ As credenciais do Cloudinary configuradas nas variáveis de ambiente

## 📋 Passos para Configurar

### 1. Obter Credenciais do Cloudinary

1. Acesse https://cloudinary.com
2. Faça login no Dashboard
3. Na página inicial, você verá:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Configurar Variáveis de Ambiente no Render

1. Acesse o dashboard do Render: https://dashboard.render.com
2. Vá para o seu serviço `digimenu-backend-3m6t`
3. Clique em **Environment** (ou **Variáveis de Ambiente**)
4. Adicione as seguintes variáveis:

```
CLOUDINARY_CLOUD_NAME=seu_cloud_name_aqui
CLOUDINARY_API_KEY=sua_api_key_aqui
CLOUDINARY_API_SECRET=seu_api_secret_aqui
JWT_SECRET=digimenu_super_secret_2026
FRONTEND_URL=https://digimenu-chi.vercel.app
```

**🌐 CORS – Desenvolvimento local (localhost):**  
Para o frontend em `http://localhost:5173` falar com o backend no Render, o backend precisa aceitar essa origem. Se você **não** definir `CORS_ORIGINS`, o backend já permite `FRONTEND_URL`, `http://localhost:5173` e `http://127.0.0.1:5173`. Se quiser controlar manualmente, defina:

```
CORS_ORIGINS=https://digimenu-chi.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

**⚠️ IMPORTANTE - JWT_SECRET:**
- Use o **mesmo valor** no backend local e no Render
- Escolha uma string forte e segura (ex: `digimenu_super_secret_2026`)
- **Nunca** commite este valor no código
- Se mudar, todos os usuários precisarão fazer login novamente

### 3. Fazer Deploy

Após adicionar as variáveis de ambiente:
1. O Render vai fazer um novo deploy automaticamente
2. Aguarde o deploy terminar
3. Verifique os logs para ver se o Cloudinary foi carregado:

```
☁️ Cloudinary carregado: { name: '...', key: '...', secret: 'OK' }
```

## ✅ Verificação

### 1. Verificar Logs no Render

Após o deploy, você deve ver nos logs:
```
🧪 ENV TEST: {
  CLOUDINARY_CLOUD_NAME: 'seu_cloud_name',
  CLOUDINARY_API_KEY: 'sua_api_key',
  CLOUDINARY_API_SECRET: 'OK',
  JWT_SECRET: 'digimenu_super_secret_2026',
  FRONTEND_URL: 'https://digimenu-chi.vercel.app'
}
```

**✅ Verificação do JWT:**
- Se você **não** ver mais o log "Token JWT inválido, tentando método alternativo" → ✅ Configurado corretamente
- Se ainda aparecer → Verifique se o `JWT_SECRET` está configurado e se você fez login novamente após configurar

### 2. Testar Upload

1. Abra o console do navegador (F12)
2. Tente fazer upload de uma imagem
3. Você deve ver:
   ```
   🖼️ Detectada imagem, usando Cloudinary: imagem.jpg image/jpeg
   📤 Enviando upload para Cloudinary: https://digimenu-backend-3m6t.onrender.com/api/upload-image?folder=dishes
   ✅ Upload concluído: https://res.cloudinary.com/...
   ```

### 3. Verificar Logs do Backend

Nos logs do Render, você deve ver:
```
📥 UPLOAD RECEBIDO
Query params: { folder: 'dishes' }
Arquivo recebido: { originalname: 'imagem.jpg', mimetype: 'image/jpeg', size: 12345 }
📁 Pasta do Cloudinary: dishes
✅ Upload concluído: https://res.cloudinary.com/...
```

## 🐛 Troubleshooting

### Erro: "Cloudinary error" nos logs

- Verifique se as credenciais estão corretas
- Certifique-se de que não há espaços extras nas variáveis de ambiente
- Verifique se o Cloud Name está correto (case-sensitive)

### Erro: "Nenhum arquivo recebido"

- Verifique se o frontend está enviando o arquivo corretamente
- Verifique os logs do navegador para ver a requisição

### Upload não funciona

1. Verifique se o backend fez deploy após adicionar as variáveis
2. Verifique os logs do Render para erros
3. Teste a rota diretamente:

```bash
curl -X POST https://digimenu-backend-3m6t.onrender.com/api/upload-image \
  -F "image=@teste.jpg" \
  -F "folder=test"
```

## 📝 Notas Importantes

- ⚠️ **Nunca commite as credenciais do Cloudinary no código**
- ✅ Use sempre variáveis de ambiente
- ✅ O Render faz deploy automático quando você adiciona variáveis
- ✅ Aguarde o deploy terminar antes de testar

## 🔗 Links Úteis

- Dashboard do Render: https://dashboard.render.com
- Dashboard do Cloudinary: https://console.cloudinary.com
- Documentação do Render: https://render.com/docs/environment-variables
