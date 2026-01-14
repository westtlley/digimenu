# 🔍 Guia de Diagnóstico - Upload de Imagens

## Problemas Comuns e Soluções

### 1. Verificar se o Backend está rodando

```bash
cd backend
npm run dev
```

Você deve ver:
```
🚀 Servidor rodando na porta 3000
📡 http://localhost:3000/api
☁️ Cloudinary carregado: { name: '...', key: '...', secret: 'OK' }
```

### 2. Verificar Configuração do Cloudinary

Crie/verifique o arquivo `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**Como obter as credenciais:**
1. Acesse https://cloudinary.com
2. Faça login no Dashboard
3. Copie as credenciais da seção "Account Details"

### 3. Verificar URL da API no Frontend

Crie/verifique o arquivo `.env` na raiz do projeto:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**Importante:** Reinicie o servidor de desenvolvimento após criar/alterar o `.env`

### 4. Testar o Endpoint Manualmente

Abra o console do navegador (F12) e execute:

```javascript
// Teste 1: Verificar se o backend está acessível
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Teste 2: Testar upload
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch('http://localhost:3000/api/upload-image?folder=test', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    console.log('✅ Sucesso:', result);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};
fileInput.click();
```

### 5. Verificar Erros no Console

Abra o console do navegador (F12) e verifique:

- **Erros de CORS**: Se aparecer erro de CORS, verifique se o backend tem `cors()` habilitado
- **Erros 404**: Backend não está rodando ou URL incorreta
- **Erros 500**: Problema com Cloudinary (credenciais incorretas)
- **Erros de rede**: Backend não está acessível

### 6. Verificar Logs do Backend

Quando fizer upload, você deve ver no terminal do backend:

```
📥 UPLOAD RECEBIDO
Arquivo: { fieldname: 'image', originalname: '...', ... }
```

Se não aparecer, o request não está chegando ao backend.

### 7. Checklist Rápido

- [ ] Backend está rodando na porta 3000
- [ ] Arquivo `backend/.env` existe com credenciais do Cloudinary
- [ ] Arquivo `.env` na raiz existe com `VITE_API_BASE_URL=http://localhost:3000/api`
- [ ] Servidor de desenvolvimento do frontend foi reiniciado após criar `.env`
- [ ] Credenciais do Cloudinary estão corretas
- [ ] Não há erros no console do navegador
- [ ] Não há erros no terminal do backend

### 8. Erros Específicos

#### "Failed to fetch" ou "NetworkError"
- Backend não está rodando
- URL incorreta no `.env`
- Problema de CORS (verificar se `cors()` está habilitado no backend)

#### "404 Not Found"
- Rota `/api/upload-image` não existe no backend
- URL base incorreta

#### "500 Internal Server Error"
- Credenciais do Cloudinary incorretas
- Cloudinary não configurado no backend

#### "Nenhuma imagem enviada"
- Arquivo não está sendo enviado corretamente
- Verificar se o input de arquivo está funcionando

### 9. Testar com cURL

Se o frontend não funcionar, teste diretamente:

```bash
curl -X POST http://localhost:3000/api/upload-image \
  -F "image=@caminho/para/imagem.jpg" \
  -F "folder=test"
```

### 10. Contato

Se nada funcionar, verifique:
1. Logs do backend (terminal)
2. Console do navegador (F12)
3. Network tab do navegador (F12 > Network) para ver a requisição
