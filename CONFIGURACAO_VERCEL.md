# 🔧 Configuração para Vercel

## Problema Identificado

Você está usando `VITE_API_BASE_URL=https://digimenu-chi.vercel.app`, mas essa URL precisa apontar para um **backend** que tenha a rota `/api/upload-image` configurada com Cloudinary.

## ⚠️ Situação Atual

A URL `https://digimenu-chi.vercel.app` parece ser o **frontend** na Vercel, não o backend. Para o upload funcionar, você precisa de um dos seguintes:

### Opção 1: Usar Backend Local (Recomendado para desenvolvimento)

1. **Configure o `.env` na raiz do projeto:**
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

2. **Configure o `backend/.env`:**
```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
PORT=3000
FRONTEND_URL=http://localhost:5173
```

3. **Inicie o backend local:**
```bash
cd backend
npm install
npm run dev
```

4. **Inicie o frontend:**
```bash
npm run dev
```

### Opção 2: Configurar Backend na Vercel

Se você quiser usar um backend na Vercel, você precisa:

1. **Criar um projeto separado na Vercel para o backend** (ou usar serverless functions)

2. **Configurar as variáveis de ambiente na Vercel:**
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

3. **Atualizar o `.env` na raiz:**
```env
VITE_API_BASE_URL=https://seu-backend.vercel.app/api
```

### Opção 3: Usar Backend em Render/Railway/Outro Serviço

1. **Faça deploy do backend** (pasta `backend/`) em Render, Railway, ou outro serviço

2. **Configure as variáveis de ambiente** no serviço de hospedagem

3. **Atualize o `.env` na raiz:**
```env
VITE_API_BASE_URL=https://seu-backend.onrender.com/api
```

## ✅ Verificação

Para verificar se está funcionando:

1. Abra o console do navegador (F12)
2. Tente fazer upload de uma imagem
3. Verifique os logs:
   - Se aparecer `📤 Enviando upload para: http://localhost:3000/api/upload-image` → Backend local
   - Se aparecer erro 404 → Backend não tem a rota configurada
   - Se aparecer erro 500 → Credenciais do Cloudinary incorretas

## 🔍 Diagnóstico

Execute no console do navegador:

```javascript
// Verificar URL da API
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);

// Testar endpoint de upload
fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/upload-image`, {
  method: 'POST',
  body: new FormData()
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 🗺️ Google Maps (VITE_GOOGLE_MAPS_API_KEY)

Para os mapas no **Gestor** (Mapa ao Vivo), **Entregador** e **checkout** funcionarem:

1. **Local:** crie `.env` na raiz (ou copie de `.env.example`) com:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=sua_chave_maps_javascript_api
   ```
   Reinicie o servidor (`npm run dev`).

2. **Vercel:** em **Settings → Environment Variables**, adicione:
   - Nome: `VITE_GOOGLE_MAPS_API_KEY`
   - Valor: sua chave da [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (com **Maps JavaScript API** ativada)

   Faça um novo deploy após salvar.

3. **Se `window.google` ficar `undefined`:** a chave não está chegando (verifique o nome exato da variável e reinício/redeploy) ou o script do Google não carregou (rede, bloqueio, faturamento na conta Google).

## 📝 Nota Importante

A URL `https://digimenu-chi.vercel.app` é o **frontend**, não o backend. Você precisa de um backend separado rodando com:
- Rota `/api/upload-image` configurada
- Cloudinary configurado
- CORS habilitado
