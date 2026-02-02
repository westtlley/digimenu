import { useEffect } from 'react';

const DEFAULT_FAVICON = '/images/digimenu-logo.svg';
const DEFAULT_TITLE = 'DigiMenu';

/**
 * Atualiza o título da página e o favicon com os dados da loja/restaurante.
 * Para assinantes: foto/logo da loja vira favicon, nome da loja vira título da aba.
 * @param {object} store - { name, logo } ou undefined
 */
export function useDocumentHead(store) {
  const name = store?.name;
  const logo = store?.logo;

  useEffect(() => {
    document.title = name && String(name).trim() ? String(name).trim() : DEFAULT_TITLE;
  }, [name]);

  useEffect(() => {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (logo && typeof logo === 'string' && (logo.startsWith('http') || logo.startsWith('data:'))) {
      link.href = logo;
      link.type = logo.toLowerCase().includes('.svg') ? 'image/svg+xml' : 'image/png';
    } else {
      link.href = DEFAULT_FAVICON;
      link.type = 'image/svg+xml';
    }
  }, [logo]);
}
