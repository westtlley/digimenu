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

  // Cabeçalhos
  const headers = [
    'Email',
    'Nome',
    'Plano',
    'Status',
    'Data de Expiração',
    'Email de Acesso',
    'Observações'
  ];

  // Converter assinantes para linhas CSV
  const rows = subscribers.map(sub => {
    return [
      sub.email || '',
      sub.name || '',
      sub.plan || 'basic',
      sub.status || 'active',
      sub.expires_at || '',
      sub.linked_user_email || '',
      (sub.notes || '').replace(/"/g, '""') // Escapar aspas duplas
    ].map(field => `"${field}"`).join(',');
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
  const emailIdx = headers.findIndex(h => /email/i.test(h) && !/acesso/i.test(h));
  const nameIdx = headers.findIndex(h => /nome/i.test(h));
  const planIdx = headers.findIndex(h => /plano/i.test(h));
  const statusIdx = headers.findIndex(h => /status/i.test(h));
  const expiresIdx = headers.findIndex(h => /expira/i.test(h));
  const linkedEmailIdx = headers.findIndex(h => /acesso/i.test(h));
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

    subscribers.push({
      email: email.toLowerCase(),
      name: values[nameIdx]?.trim() || '',
      plan: values[planIdx]?.trim() || 'basic',
      status: values[statusIdx]?.trim() || 'active',
      expires_at: values[expiresIdx]?.trim() || '',
      linked_user_email: values[linkedEmailIdx]?.trim() || '',
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
