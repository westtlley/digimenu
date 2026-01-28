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

## 🗺️ Google Maps (VITE_GOOGLE_MAPS_KEY ou VITE_GOOGLE_MAPS_API_KEY)

Para os mapas no **Gestor** (Mapa ao Vivo), **Entregador** e **checkout** funcionarem (API 2.x):

1. **Local:** crie `.env` na raiz com (nome preferido em 2.x):
   ```env
   VITE_GOOGLE_MAPS_KEY=sua_chave_maps_javascript_api
   ```
   Ou use `VITE_GOOGLE_MAPS_API_KEY` (também aceito). Reinicie o servidor (`npm run dev`).

2. **Vercel:** em **Settings → Environment Variables**, adicione:
   - Nome: `VITE_GOOGLE_MAPS_KEY` (ou `VITE_GOOGLE_MAPS_API_KEY`)
   - Valor: sua chave da [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (com **Maps JavaScript API** ativada)

   Faça um novo deploy após salvar.

3. **Se `window.google` ficar `undefined`:** a chave não está chegando (verifique o nome exato da variável e reinício/redeploy) ou o script do Google não carregou (rede, bloqueio, faturamento na conta Google).

4. **"For development purposes only" no mapa:** a chave está em modo desenvolvimento ou o **domínio do site** (ex. `https://menu-chi.vercel.app`) não está autorizado. Em [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → sua chave → Restrições de aplicativo → Referenciadores HTTP, inclua `https://*.vercel.app/*` e seu domínio exato (ex. `https://menu-chi.vercel.app/*`). Ative também o faturamento no projeto se for uso em produção.

5. **⚠️ Não use `<script src="https://maps.googleapis.com/...">`** no `index.html` nem em plugins. O Maps é carregado **apenas** via `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`). Script manual gera **ApiProjectMapError** e quebra o loader 2.x.

## 🛣️ Rotas ORS (VITE_ORS_KEY)

O cálculo de rotas (distância/tempo) usa [OpenRouteService](https://openrouteservice.org/). A chave **não** deve ficar no código.

1. **.env na raiz:**
   ```env
   VITE_ORS_KEY=sua_chave_openrouteservice
   ```
   Obtenha em [openrouteservice.org/dev](https://openrouteservice.org/dev/) (plano gratuito disponível).

2. **Vercel:** em **Settings → Environment Variables**, adicione `VITE_ORS_KEY` com sua chave. Faça novo deploy.

3. **Se não configurar:** o mapa continua funcionando, mas a rota (linha azul e card distância/tempo) não é exibida.

## 📝 Nota Importante

A URL `https://digimenu-chi.vercel.app` é o **frontend**, não o backend. Você precisa de um backend separado rodando com:
- Rota `/api/upload-image` configurada
- Cloudinary configurado
- CORS habilitado
