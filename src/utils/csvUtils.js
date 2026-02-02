/**
 * Utilitários para manipulação de CSV (exportação/importação de assinantes)
 */

/**
 * Exportar assinantes para CSV
 * @param {Array} subscribers - Lista de assinantes
 * @returns {string} - String CSV formatada
 */
export function exportSubscribersToCSV(subscribers) {
  if (!subscribers || subscribers.length === 0) {
    return '';
  }

  const headers = [
    'Email', 'Nome', 'Plano', 'Status', 'Data de Expiração', 'Email de Acesso',
    'Telefone', 'CNPJ_CPF', 'Origem', 'Tags', 'Slug', 'Observações'
  ];

  const rows = subscribers.map(sub => {
    const tagsStr = Array.isArray(sub.tags) ? sub.tags.join(';') : '';
    return [
      sub.email || '', sub.name || '', sub.plan || 'basic', sub.status || 'active',
      sub.expires_at || '', sub.linked_user_email || '', sub.phone || '',
      sub.cnpj_cpf || '', sub.origem || '', tagsStr, sub.slug || '',
      (sub.notes || '').replace(/"/g, '""')
    ].map(field => `"${String(field)}"`).join(',');
  });

  // Combinar cabeçalhos e linhas
  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
}

/**
 * Baixar CSV
 * @param {string} csvContent - Conteúdo CSV
 * @param {string} filename - Nome do arquivo
 */
export function downloadCSV(csvContent, filename = 'assinantes.csv') {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Importar CSV e converter para array de assinantes
 * @param {string} csvText - Texto CSV
 * @returns {Array} - Array de objetos assinantes
 */
export function importCSVToSubscribers(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV inválido: deve ter pelo menos cabeçalho e uma linha de dados');
  }

  // Parsear cabeçalho
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Mapear índices esperados
  const emailIdx = headers.findIndex(h => /^email$/i.test(h) || (/email/i.test(h) && !/acesso/i.test(h)));
  const nameIdx = headers.findIndex(h => /nome/i.test(h));
  const planIdx = headers.findIndex(h => /plano/i.test(h));
  const statusIdx = headers.findIndex(h => /status/i.test(h));
  const expiresIdx = headers.findIndex(h => /expira/i.test(h));
  const linkedEmailIdx = headers.findIndex(h => /acesso/i.test(h));
  const phoneIdx = headers.findIndex(h => /telefone|phone/i.test(h));
  const cnpjIdx = headers.findIndex(h => /cnpj|cpf/i.test(h));
  const origemIdx = headers.findIndex(h => /origem/i.test(h));
  const tagsIdx = headers.findIndex(h => /tags/i.test(h));
  const slugIdx = headers.findIndex(h => /slug|link/i.test(h));
  const notesIdx = headers.findIndex(h => /observa|note/i.test(h));

  // Parsear linhas de dados
  const subscribers = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Validar email obrigatório
    const email = values[emailIdx]?.trim();
    if (!email) {
      console.warn(`Linha ${i + 1}: Email não encontrado, pulando...`);
      continue;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn(`Linha ${i + 1}: Email inválido (${email}), pulando...`);
      continue;
    }

    const tagsRaw = values[tagsIdx]?.trim();
    const tags = tagsRaw ? tagsRaw.split(/[;,]/).map(t => t.trim()).filter(Boolean) : [];
    subscribers.push({
      email: email.toLowerCase(),
      name: values[nameIdx]?.trim() || '',
      plan: values[planIdx]?.trim() || 'basic',
      status: values[statusIdx]?.trim() || 'active',
      expires_at: values[expiresIdx]?.trim() || '',
      linked_user_email: values[linkedEmailIdx]?.trim() || '',
      phone: values[phoneIdx]?.trim() || '',
      cnpj_cpf: values[cnpjIdx]?.trim() || '',
      origem: values[origemIdx]?.trim() || 'import',
      tags: tags.length ? tags : undefined,
      slug: values[slugIdx]?.trim() || '',
      notes: values[notesIdx]?.trim() || ''
    });
  }

  return subscribers;
}

/**
 * Parsear linha CSV (suporta campos com aspas e vírgulas)
 * @param {string} line - Linha CSV
 * @returns {Array<string>} - Array de valores
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Aspas duplas escapadas
        current += '"';
        i++; // Pular próximo caractere
      } else {
        // Toggle de aspas
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Nova coluna
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Adicionar último valor
  values.push(current.trim());
  return values;
}
