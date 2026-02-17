import { apiClient } from '@/api/apiClient';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

/**
 * Upload direto do navegador para o Cloudinary (preset unsigned).
 * Usado quando o backend retorna 404 na rota /api/upload-image.
 * Requer: VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env
 */
async function directCloudinaryUpload(file, folder = 'dishes') {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Upload direto não configurado. Defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env (preset deve ser unsigned).');
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (folder) formData.append('folder', folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Cloudinary: ${res.status}`);
  }
  if (!data?.secure_url) {
    throw new Error('Resposta do Cloudinary sem URL');
  }
  return data.secure_url;
}

/**
 * Faz upload de uma imagem para o Cloudinary.
 * Tenta primeiro o backend; se der 404, usa upload direto (se configurado).
 * @param {File} file - Arquivo de imagem
 * @param {string} folder - Pasta no Cloudinary (opcional)
 * @returns {Promise<string>} URL da imagem no Cloudinary
 */
export async function uploadToCloudinary(file, folder = 'dishes') {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido');
  }
  if (!(file instanceof File)) {
    throw new Error('O arquivo deve ser uma instância de File');
  }
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem');
  }

  const isBackend404 = (err) =>
    err?.message?.includes('404') ||
    err?.message?.includes('Cannot POST') ||
    (typeof err?.message === 'string' && err.message.includes('upload-image'));

  try {
    const response = await apiClient.uploadImageToCloudinary(file, folder);
    if (!response?.url) {
      throw new Error('Resposta inválida do servidor');
    }
    return response.url;
  } catch (error) {
    if (isBackend404(error) && CLOUD_NAME && UPLOAD_PRESET) {
      try {
        const url = await directCloudinaryUpload(file, folder);
        return url;
      } catch (directError) {
        throw new Error(
          directError.message ||
            'Upload pelo backend falhou (404) e o upload direto também falhou. Configure o preset unsigned no Cloudinary e as variáveis VITE_CLOUDINARY_* no .env.'
        );
      }
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    if (error.message.includes('404') || error.message.includes('Cannot POST')) {
      throw new Error(
        'Rota de upload não encontrada no backend. Faça o deploy do backend ou configure upload direto: crie um preset unsigned no Cloudinary e defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env.'
      );
    }
    if (error.message.includes('500')) {
      throw new Error('Erro no servidor. Verifique as credenciais do Cloudinary no backend.');
    }
    throw error;
  }
}

/**
 * Faz upload de uma imagem para o Cloudinary (compatível com formato antigo)
 * @param {File|Object} fileOrObject - Arquivo ou objeto com propriedade 'file'
 * @param {string} folder - Pasta no Cloudinary (opcional)
 * @returns {Promise<{url: string, file_url: string}>} Objeto com URL da imagem
 */
export async function uploadImage(fileOrObject, folder = 'dishes') {
  const file = fileOrObject instanceof File ? fileOrObject : fileOrObject?.file;
  
  if (!file) {
    throw new Error('Nenhum arquivo fornecido');
  }

  const url = await uploadToCloudinary(file, folder);
  
  // Retornar em ambos os formatos para compatibilidade
  return {
    url,
    file_url: url
  };
}
