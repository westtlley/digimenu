/**
 * Serviço para buscar endereço por CEP usando ViaCEP
 * @param {string} cep - CEP com ou sem formatação
 * @returns {Promise<Object>} - Dados do endereço
 */
export async function buscarCEP(cep) {
  // Remove formatação
  const cleanCEP = cep.replace(/\D/g, '');
  
  // Valida se tem 8 dígitos
  if (cleanCEP.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }
    
    return {
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      enderecoCompleto: `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade || ''} - ${data.uf || ''}`.trim()
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    throw error;
  }
}
