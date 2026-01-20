/**
 * Cliente de API genérico para substituir o Base44 SDK
 * Configure a URL da sua API no arquivo .env ou diretamente aqui
 */

// Normalizar a URL da API - garantir que termine com /api
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Se não houver URL no .env, usar padrão
  if (!envUrl) {
    return 'https://digimenu-backend-3m6t.onrender.com/api';
  }
  
  // Se a URL não terminar com /api, adicionar
  if (!envUrl.endsWith('/api')) {
    return envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`;
  }
  
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL configurada:', API_BASE_URL);

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
    this.isLoggingOut = false; // Flag para bloquear chamadas após logout
  }

  /**
   * Define o token de autenticação
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
      this.isLoggingOut = false; // Resetar flag quando novo token é definido
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Remove o token de autenticação
   */
  removeToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Faz uma requisição HTTP
   */
  async request(endpoint, options = {}) {
    // Bloquear requisições se já estamos fazendo logout
    if (this.isLoggingOut) {
      throw new Error('Sessão expirada. Redirecionando...');
    }

    const url = `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    
    // Garantir que o body seja string JSON se não for FormData
    let body = options.body;
    if (!isFormData && body && typeof body === 'object') {
      try {
        body = JSON.stringify(body);
      } catch (e) {
        console.error('Erro ao serializar body:', e);
        throw new Error('Erro ao serializar dados da requisição');
      }
    }
    
    const config = {
      ...options,
      body: body,
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Tenta fazer parse JSON, mas não falha se não for JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        // Tratamento de erro 401 (não autorizado) - redirecionar para login
        if (response.status === 401) {
          if (!this.isLoggingOut) {
            this.isLoggingOut = true;

            console.warn('🔒 Sessão expirada. Redirecionando para login...');
            this.removeToken();
            localStorage.removeItem('user');

            // Usar setTimeout para dar tempo das outras requisições terminarem
            // antes de redirecionar, evitando estados inconsistentes
            setTimeout(() => {
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }, 50);
          }

          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        const errorMessage = data?.message || data?.error || data || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Se já estamos fazendo logout, não logar erro (evita poluição)
      if (!this.isLoggingOut) {
        console.error('API Request Error:', error);
        console.error('URL:', url);
        console.error('Body:', body);
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    // Suporta FormData diretamente (para uploads)
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return this.request(endpoint, {
        method: 'POST',
        body: data,
        headers: options.headers || {}, // permitir sobrescrever headers, mas normalmente vazio
      });
    }

    // Garantir que data seja um objeto válido
    const cleanData = data || {};

    // Remover valores undefined
    const sanitizedData = Object.keys(cleanData).reduce((acc, key) => {
      if (cleanData[key] !== undefined) {
        acc[key] = cleanData[key];
      }
      return acc;
    }, {});

    return this.request(endpoint, {
      method: 'POST',
      body: sanitizedData, // Será convertido para JSON no request()
      headers: options.headers || {},
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    // Remover valores undefined e garantir que data seja um objeto válido
    const cleanData = data || {};
    const sanitizedData = Object.keys(cleanData).reduce((acc, key) => {
      if (cleanData[key] !== undefined) {
        acc[key] = cleanData[key];
      }
      return acc;
    }, {});

    return this.request(endpoint, {
      method: 'PUT',
      body: sanitizedData, // Será convertido para JSON no request()
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Módulo de autenticação
   */
  get auth() {
    const self = this;
    return {
      /**
       * Verifica se o usuário está autenticado
       */
      isAuthenticated: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return false;
        
        try {
          await self.get('/auth/me');
          return true;
        } catch {
          return false;
        }
      },

      /**
       * Obtém dados do usuário atual
       */
      me: async () => {
        return self.get('/auth/me');
      },

      /**
       * Faz login
       */
      login: async (email, password) => {
        const response = await self.post('/auth/login', { email, password });
        if (response.token) {
          self.setToken(response.token);
        }
        return response;
      },

      /**
       * Faz logout
       */
      logout: () => {
        self.removeToken();
        window.location.href = '/';
      },

      /**
       * Redireciona para página de login
       */
      redirectToLogin: (returnUrl = '/') => {
        window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      },

      /**
       * Altera a senha do usuário logado
       */
      changePassword: async (currentPassword, newPassword) => {
        return self.post('/auth/change-password', { currentPassword, newPassword });
      },
    };
  }

  /**
   * Módulo de entidades (CRUD genérico)
   */
  entities = new Proxy({}, {
    get: (target, entityName) => {
      const self = this;
      return {
        /**
         * Lista. opts.as_subscriber = email do assinante para modo suporte (master).
         */
        list: async (orderBy = null, opts = {}) => {
          const params = typeof opts === 'object' && opts !== null ? { ...opts } : {};
          if (orderBy) params.order_by = orderBy;
          return self.get(`/entities/${entityName}`, params);
        },

        filter: async (filters = {}, orderBy = null) => {
          const params = { ...filters };
          if (orderBy) params.order_by = orderBy;
          return self.get(`/entities/${entityName}`, params);
        },

        /**
         * Obtém por ID. opts.as_subscriber para modo suporte.
         */
        get: async (id, opts = {}) => {
          const q = opts?.as_subscriber ? `?as_subscriber=${encodeURIComponent(opts.as_subscriber)}` : '';
          return self.get(`/entities/${entityName}/${id}${q}`);
        },

        /**
         * Cria. Para modo suporte: incluir as_subscriber no data.
         */
        create: async (data) => {
          return self.post(`/entities/${entityName}`, data);
        },

        /**
         * Atualiza. Subscriber usa /subscribers/:id. opts.as_subscriber para modo suporte.
         */
        update: async (id, data, opts = {}) => {
          const q = opts?.as_subscriber ? `?as_subscriber=${encodeURIComponent(opts.as_subscriber)}` : '';
          if (String(entityName) === 'Subscriber') return self.put(`/subscribers/${id}`, data);
          return self.put(`/entities/${entityName}/${id}${q}`, data);
        },

        /**
         * Deleta. opts.as_subscriber para modo suporte.
         */
        delete: async (id, opts = {}) => {
          const q = opts?.as_subscriber ? `?as_subscriber=${encodeURIComponent(opts.as_subscriber)}` : '';
          return self.delete(`/entities/${entityName}/${id}${q}`);
        },

        /**
         * Cria múltiplos registros
         */
        bulkCreate: async (items) => {
          return self.post(`/entities/${entityName}/bulk`, { items });
        },
      };
    },
  });

  /**
   * Módulo de funções (endpoints customizados)
   */
  functions = new Proxy({}, {
    get: (target, functionName) => {
      const self = this;
      
      // Se for 'invoke', retornar o método invoke da classe
      if (functionName === 'invoke') {
        return self.invoke.bind(self);
      }
      
      // Caso contrário, retornar uma função que chama o endpoint
      return async (data = {}) => {
        return self.post(`/functions/${functionName}`, data);
      };
    },
  });

  /**
   * Invoca uma função específica
   */
  invoke = async (functionName, data = {}) => {
    console.log('🔵 [apiClient] invoke chamado com functionName:', functionName);
    console.log('🔵 [apiClient] data:', JSON.stringify(data, null, 2));
    const endpoint = `/functions/${functionName}`;
    console.log('🔵 [apiClient] endpoint:', endpoint);
    const result = await this.post(endpoint, data);
    console.log('🔵 [apiClient] resultado:', JSON.stringify(result, null, 2));
    return result;
  };

  /**
   * Upload de imagem para Cloudinary
   * @param {File} file - Arquivo de imagem
   * @param {string} folder - Pasta no Cloudinary (opcional, padrão: 'dishes')
   * @returns {Promise<{url: string}>} URL da imagem no Cloudinary
   */
  async uploadImageToCloudinary(file, folder = 'dishes') {
    // ⚠️ VALIDAÇÃO RIGOROSA
    console.log('🔍 [apiClient.uploadImageToCloudinary] Recebido:', {
      file,
      isFile: file instanceof File,
      type: typeof file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      folder
    });

    if (!file) {
      console.error('❌ [apiClient] Nenhum arquivo fornecido');
      throw new Error('Nenhum arquivo fornecido');
    }
    
    if (!(file instanceof File)) {
      console.error('❌ [apiClient] Arquivo não é instância de File:', typeof file, file);
      throw new Error('O arquivo deve ser uma instância de File');
    }
    
    if (!file.type || !file.type.startsWith('image/')) {
      console.error('❌ [apiClient] Arquivo não é imagem:', file.type);
      throw new Error('O arquivo deve ser uma imagem');
    }
    
    // ⚠️ CORREÇÃO DEFINITIVA: Criar FormData e adicionar o arquivo
    const formData = new FormData();
    
    // ⚠️ VALIDAR ANTES DE ADICIONAR
    console.log('📦 [apiClient] Criando FormData com arquivo:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    formData.append('image', file);
    
    // ⚠️ VALIDAR QUE FOI ADICIONADO
    const hasFile = formData.has('image');
    console.log('📦 [apiClient] FormData criado:', {
      hasFile: hasFile,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder
    });

    if (!hasFile) {
      console.error('❌ [apiClient] ERRO CRÍTICO: Arquivo não foi adicionado ao FormData!');
      throw new Error('Erro ao adicionar arquivo ao FormData');
    }
    
    // Enviar para a rota do backend que faz upload no Cloudinary
    const queryString = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    const endpoint = `/upload-image${queryString}`;
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('📤 [apiClient] Enviando upload para:', url);
    
    try {
      // ⚠️ CORREÇÃO: Usar fetch DIRETO, não passar pelo método request
      const headers = {};
      
      // Adicionar token se existir
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }
      
      // ⚠️ NÃO adicionar Content-Type - o browser define automaticamente para FormData
      console.log('📤 [apiClient] Fazendo fetch com:', {
        method: 'POST',
        url: url,
        hasFormData: formData instanceof FormData,
        hasFileInFormData: formData.has('image')
      });
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers
      });
      
      console.log('📥 [apiClient] Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [apiClient] Erro na resposta:', response.status, errorText);
        throw new Error(errorText || `Erro ${response.status} ao fazer upload`);
      }
      
      const data = await response.json();
      
      if (!data || !data.url) {
        console.error('❌ [apiClient] Resposta inválida do servidor:', data);
        throw new Error('Resposta inválida do servidor. Verifique se o backend tem a rota /api/upload-image configurada e as credenciais do Cloudinary.');
      }
      
      console.log('✅ [apiClient] Upload concluído:', data.url);
      return data;
    } catch (error) {
      console.error('❌ [apiClient] Erro no upload para Cloudinary:', error);
      if (error.message.includes('404')) {
        throw new Error('Rota de upload não encontrada. Verifique se o backend tem /api/upload-image configurada.');
      }
      if (error.message.includes('500')) {
        throw new Error('Erro no servidor. Verifique se as credenciais do Cloudinary estão configuradas no Render.');
      }
      throw error;
    }
  }

  /**
   * Módulo de integrações (opcional)
   */
  get integrations() {
    const self = this;
    return {
      Core: {
        SendEmail: async (data) => {
          return self.post('/integrations/email/send', data);
        },
        UploadFile: async (fileOrObject) => {
          // Extrair o arquivo se for um objeto
          let file = fileOrObject;
          
          // Se for um objeto com propriedade 'file', extrair
          if (fileOrObject && typeof fileOrObject === 'object' && !(fileOrObject instanceof File)) {
            file = fileOrObject.file || fileOrObject;
          }
          
          if (!file) {
            throw new Error('Nenhum arquivo fornecido');
          }
          
          // Verificar se é uma instância de File
          if (!(file instanceof File)) {
            console.warn('⚠️ Arquivo não é instância de File:', typeof file, file);
            throw new Error('O arquivo deve ser uma instância de File');
          }
          
          // Verificar se é imagem pelo tipo MIME
          const isImage = file.type && file.type.startsWith('image/');
          
          // Verificar também pela extensão do arquivo (fallback)
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
          const fileName = file.name?.toLowerCase() || '';
          const hasImageExtension = imageExtensions.some(ext => fileName.endsWith(ext));
          
          if (isImage || hasImageExtension) {
            console.log('🖼️ Detectada imagem, usando Cloudinary:', {
              name: file.name,
              type: file.type,
              size: file.size,
              isImageByType: isImage,
              isImageByExtension: hasImageExtension
            });
            
            try {
              const result = await self.uploadImageToCloudinary(file);
              // Retornar no formato esperado (com url e file_url para compatibilidade)
              return {
                url: result.url,
                file_url: result.url
              };
            } catch (error) {
              console.error('❌ Erro no upload para Cloudinary:', error);
              throw error;
            }
          }
          
          // Para outros tipos de arquivo (áudio, etc), usar o método antigo
          console.log('📄 Arquivo não é imagem, usando rota antiga:', {
            name: file.name,
            type: file.type
          });
          const formData = new FormData();
          formData.append('file', file);
          return self.request('/integrations/file/upload', {
            method: 'POST',
            body: formData,
            headers: {}, // Remove Content-Type para FormData
          });
        },
        InvokeLLM: async (data) => {
          return self.post('/integrations/llm/invoke', data);
        },
        GenerateImage: async (data) => {
          return self.post('/integrations/image/generate', data);
        },
        ExtractDataFromUploadedFile: async (data) => {
          return self.post('/integrations/file/extract', data);
        },
        CreateFileSignedUrl: async (data) => {
          return self.post('/integrations/file/signed-url', data);
        },
        UploadPrivateFile: async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          return self.request('/integrations/file/upload-private', {
            method: 'POST',
            body: formData,
            headers: {},
          });
        },
      },
    };
  }
}

// Instância singleton do cliente
export const apiClient = new ApiClient();

// Compatibilidade: export named `api` usado em alguns componentes
export const api = apiClient;

// Exporta a classe para uso avançado
export default ApiClient;
