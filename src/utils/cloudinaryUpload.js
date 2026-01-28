import { apiClient } from '@/api/apiClient';

/**
 * Faz upload de uma imagem para o Cloudinary
 * @param {File} file - Arquivo de imagem
 * @param {string} folder - Pasta no Cloudinary (opcional)
 * @returns {Promise<string>} URL da imagem no Cloudinary
 */
export async function uploadToCloudinary(file, folder = 'dishes') {
  // ⚠️ VALIDAÇÃO RIGOROSA DO ARQUIVO
  console.log('🔍 [uploadToCloudinary] Recebido:', {
    file,
    isFile: file instanceof File,
    type: typeof file,
    fileName: file?.name,
    fileSize: file?.size,
    fileType: file?.type,
    folder
  });

  if (!file) {
    console.error('❌ [uploadToCloudinary] Nenhum arquivo fornecido');
    throw new Error('Nenhum arquivo fornecido');
  }

  if (!(file instanceof File)) {
    console.error('❌ [uploadToCloudinary] Arquivo não é instância de File:', typeof file, file);
    throw new Error('O arquivo deve ser uma instância de File');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    console.error('❌ [uploadToCloudinary] Arquivo não é imagem:', file.type);
    throw new Error('O arquivo deve ser uma imagem');
  }

  try {
    console.log('📤 [uploadToCloudinary] Iniciando upload...', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      folder 
    });
    
    // ⚠️ GARANTIR QUE O ARQUIVO CHEGUE ATÉ A FUNÇÃO
    const response = await apiClient.uploadImageToCloudinary(file, folder);
    
    if (!response || !response.url) {
      console.error('❌ [uploadToCloudinary] Resposta inválida do servidor:', response);
      throw new Error('Resposta inválida do servidor. Verifique se o backend está rodando e configurado corretamente.');
    }
    
    console.log('✅ [uploadToCloudinary] Upload concluído:', response.url);
    return response.url;
  } catch (error) {
    console.error('❌ [uploadToCloudinary] Erro ao fazer upload:', error);
    
    // Mensagens de erro mais específicas
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    
    if (error.message.includes('404')) {
      throw new Error('Endpoint de upload não encontrado. Verifique se a rota /api/upload-image está configurada no backend.');
    }
    
    if (error.message.includes('500')) {
      throw new Error('Erro no servidor. Verifique se as credenciais do Cloudinary estão configuradas.');
    }
    
    throw new Error(error.message || 'Erro ao fazer upload da imagem. Verifique o console para mais detalhes.');
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
