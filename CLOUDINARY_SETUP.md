# 📸 Configuração do Cloudinary

Este guia explica como configurar o Cloudinary para armazenar todas as imagens do aplicativo.

## 🔧 Configuração do Backend

### 1. Criar conta no Cloudinary

1. Acesse [https://cloudinary.com](https://cloudinary.com)
2. Crie uma conta gratuita
3. Acesse o Dashboard e copie suas credenciais:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 3. Estrutura de pastas no Cloudinary

O sistema organiza as imagens nas seguintes pastas:

- `dishes` - Imagens de pratos/pizzas
- `categories` - Imagens de categorias
- `flavors` - Imagens de sabores
- `profiles` - Fotos de perfil (entregadores, etc)
- `store` - Logotipos e imagens da loja
- `complements` - Imagens de complementos/opções
- `delivery-proofs` - Comprovantes de entrega
- `notifications` - Arquivos de áudio de notificações
- `payment-methods` - Imagens de métodos de pagamento
- `pizza-config` - Imagens de configuração de pizza
- `loyalty` - Imagens de recompensas de fidelidade

## ✅ Verificação

Após configurar, inicie o backend:

```bash
cd backend
npm install
npm run dev
```

Você deve ver no console:
```
☁️ Cloudinary carregado: { name: 'seu_cloud_name', key: 'sua_api_key', secret: 'OK' }
🚀 Servidor rodando na porta 3000
```

## 📤 Como funciona

1. **Frontend**: Quando um usuário faz upload de uma imagem, o componente chama `uploadToCloudinary(file, folder)`
2. **API Client**: A função envia a imagem para `/api/upload-image` com o parâmetro `folder`
3. **Backend**: O servidor recebe a imagem, faz upload para o Cloudinary na pasta especificada
4. **Resposta**: Retorna a URL pública da imagem no Cloudinary

## 🔍 Testando

Para testar o upload:

1. Acesse qualquer formulário que tenha upload de imagem (ex: criar prato, categoria, etc)
2. Selecione uma imagem
3. A imagem deve aparecer no formulário
4. Verifique no Dashboard do Cloudinary se a imagem foi salva na pasta correta

## 🐛 Troubleshooting

### Erro: "Cloudinary error"
- Verifique se as credenciais estão corretas no `.env`
- Certifique-se de que o arquivo `.env` está na pasta `backend/`
- Reinicie o servidor após alterar o `.env`

### Imagens não aparecem
- Verifique se a URL retornada é válida
- Abra a URL da imagem diretamente no navegador
- Verifique o console do navegador para erros

### Upload lento
- Verifique sua conexão com a internet
- Imagens muito grandes podem demorar mais
- Considere redimensionar imagens antes do upload

## 📝 Notas

- O Cloudinary oferece um plano gratuito generoso
- Todas as imagens são públicas por padrão (URLs públicas)
- As imagens são otimizadas automaticamente pelo Cloudinary
- Você pode configurar transformações adicionais no Cloudinary Dashboard
