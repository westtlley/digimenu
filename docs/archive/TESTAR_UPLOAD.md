# 🧪 Como Testar o Upload de Imagens

## ✅ Verificar se está Funcionando

### 1. Teste Rápido no Console

Abra o console do navegador (F12) e execute:

```javascript
// Verificar URL da API configurada
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);

// Testar upload direto
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  console.log('📤 Testando upload...', file.name);
  
  try {
    const { uploadToCloudinary } = await import('/src/utils/cloudinaryUpload.js');
    const url = await uploadToCloudinary(file, 'test');
    console.log('✅ Upload concluído!', url);
    alert('Upload funcionou! URL: ' + url);
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    alert('Erro: ' + error.message);
  }
};
fileInput.click();
```

### 2. Testar no Formulário

1. Vá para **Admin > Categorias** ou **Admin > Pratos**
2. Clique em **Nova Categoria** ou **Novo Prato**
3. Clique no campo de upload de imagem
4. Selecione uma imagem
5. **Observe o console** (F12) - você deve ver:

```
🖼️ Detectada imagem, usando Cloudinary: imagem.jpg image/jpeg
📤 Enviando upload para Cloudinary: https://digimenu-backend-3m6t.onrender.com/api/upload-image?folder=categories
✅ Upload concluído: https://res.cloudinary.com/...
```

### 3. Verificar Logs do Render

1. Acesse https://dashboard.render.com
2. Vá para o serviço `digimenu-backend-3m6t`
3. Clique em **Logs**
4. Ao fazer upload, você deve ver:

```
📥 UPLOAD RECEBIDO
Query params: { folder: 'categories' }
Arquivo recebido: { originalname: 'imagem.jpg', mimetype: 'image/jpeg', size: 12345 }
📁 Pasta do Cloudinary: categories
✅ Upload concluído: https://res.cloudinary.com/...
```

## ❌ Se Não Estiver Funcionando

### Erro: "404 Not Found"
- **Causa**: Backend não tem a rota `/api/upload-image`
- **Solução**: Verifique se o código do backend no Render tem a rota configurada

### Erro: "500 Internal Server Error"
- **Causa**: Credenciais do Cloudinary não configuradas
- **Solução**: Configure as variáveis de ambiente no Render (veja `CONFIGURAR_RENDER.md`)

### Erro: "Failed to fetch" ou "NetworkError"
- **Causa**: Backend não está acessível ou CORS bloqueado
- **Solução**: Verifique se o backend está rodando no Render

### Erro: "Resposta inválida do servidor"
- **Causa**: Backend retornou algo diferente de `{ url: "..." }`
- **Solução**: Verifique os logs do Render para ver o que está sendo retornado

## 🔍 Verificar Configuração

### No Console do Navegador

Execute:
```javascript
// Verificar configuração
console.log({
  apiUrl: import.meta.env.VITE_API_BASE_URL,
  apiClient: window.apiClient || 'Não disponível'
});
```

### No Render

Verifique se as variáveis estão configuradas:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FRONTEND_URL`

## 📝 Checklist

- [ ] Variáveis de ambiente configuradas no Render
- [ ] Backend fez deploy após configurar variáveis
- [ ] Logs do Render mostram "Cloudinary carregado: { secret: 'OK' }"
- [ ] Console do navegador mostra logs de upload
- [ ] Imagem aparece no formulário após upload
- [ ] URL da imagem começa com `https://res.cloudinary.com/`

## 🎯 Próximos Passos

Se tudo estiver funcionando:
1. ✅ Upload de imagens funcionando
2. ✅ Imagens sendo salvas no Cloudinary
3. ✅ URLs sendo retornadas corretamente
4. ✅ Imagens aparecendo nos formulários

Se ainda não funcionar:
1. Verifique os logs do Render
2. Verifique o console do navegador
3. Teste com o código acima
4. Me envie os erros específicos
