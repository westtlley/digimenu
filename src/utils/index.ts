


/**
 * Gera a URL de uma página. Com slug (contexto /s/:slug), gera /s/:slug/PageName.
 * Para Cardapio com slug: /s/:slug. Para Admin, sempre /Admin.
 */
export function createPageUrl(pageName: string, slug?: string | null) {
    if (pageName === 'Admin' || pageName === 'admin') return '/Admin';
    if (slug) {
        if (pageName === 'Cardapio' || pageName === 'cardapio') return `/s/${slug}`;
        return `/s/${slug}/${pageName}`;
    }
    // Cardápio sem slug: não existe /cardapio genérico; ir para a home.
    if (pageName === 'Cardapio' || pageName === 'cardapio') return '/';
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}