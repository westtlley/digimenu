# 🐛 Debug: Upload ainda usando rota antiga

## Problema

O upload ainda está indo para `/api/integrations/file/upload` em vez de `/api/upload-image`.

## Causa

O método `UploadFile` não está detectando corretamente que é uma imagem.

## Solução Aplicada

Melhorei a detecção de imagens no método `UploadFile`:

1. ✅ Verifica tipo MIME (`file.type.startsWith('image/')`)
2. ✅ Verifica extensão do arquivo (fallback)
3. ✅ Logs detalhados para diagnóstico
4. ✅ Melhor tratamento de objetos

## Como Verificar

### 1. Abra o Console do Navegador (F12)

Ao fazer upload, você deve ver:

```
🖼️ Detectada imagem, usando Cloudinary: {
  name: "imagem.jpg",
  type: "image/jpeg",
  size: 12345,
  isImageByType: true,
  isImageByExtension: true
}
📤 Enviando upload para Cloudinary: https://digimenu-backend-3m6t.onrender.com/api/upload-image?folder=dishes
✅ Upload concluído: https://res.cloudinary.com/...
```

### 2. Se ainda aparecer a rota antiga

Verifique no console:
- O que aparece antes do upload?
- Qual é o tipo do arquivo?
- O arquivo é uma instância de File?

### 3. Teste Manual

Execute no console:

```javascript
// Criar um input de arquivo
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.onchange = async (e) => {
  const file = e.target.files[0];
  console.log('Arquivo:', {
    name: file.name,
    type: file.type,
    isFile: file instanceof File,
    size: file.size
  });
  
  // Testar upload
  const { apiClient } = await import('/src/api/apiClient.js');
  try {
    const result = await apiClient.integrations.Core.UploadFile(file);
    console.log('✅ Resultado:', result);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};
input.click();
```

## Se ainda não funcionar

1. Verifique se o arquivo está sendo passado corretamente
2. Verifique se `file.type` está definido
3. Verifique os logs do console para ver o que está sendo detectado
4. Me envie os logs do console quando fizer upload
