


/**
 * Gera a URL de uma página. URLs simplificadas sem /s/:slug quando possível.
 * - Cardápio público: /s/:slug (necessário para multi-tenant)
 * - Páginas autenticadas: URLs diretas (PainelAssinante, GestorPedidos, etc.)
 * - Admin: sempre /Admin
 */
export function createPageUrl(pageName: string, slug?: string | null) {
    // Admin sempre sem slug
    if (pageName === 'Admin' || pageName === 'admin') return '/Admin';
    
    // Cardápio: usar /s/:slug apenas se tiver slug (cardápio público)
    if (pageName === 'Cardapio' || pageName === 'cardapio') {
        if (slug) return `/s/${slug}`;
        return '/'; // Sem slug, página inicial
    }
    
    // Páginas autenticadas: URLs diretas sem /s/:slug
    // O contexto do assinante vem do login do usuário
    const authenticatedPages = [
        'PainelAssinante', 'GestorPedidos', 'Entregador', 'EntregadorPanel',
        'Cozinha', 'PDV', 'Garcom', 'PainelGerente', 'ColaboradorHome'
    ];
    
    if (authenticatedPages.includes(pageName)) {
        // URLs diretas, sem /s/:slug
        return '/' + pageName;
    }
    
    // Outras páginas: usar slug apenas se necessário
    if (slug && pageName !== 'Assinar') {
        return `/s/${slug}/${pageName}`;
    }
    
    // Padrão: URL direta
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}