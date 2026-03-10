/**
 * Gera URLs canônicas com fallback para rotas legadas.
 * - Público: /s/:slug
 * - Apps operacionais: /app/:slug/:app
 * - Gestão: /Admin, /PainelAssinante, /PainelGerente
 */
export function createPageUrl(pageName: string, slug?: string | null) {
    const rawPage = String(pageName || '').trim();
    const page = rawPage.toLowerCase();
    const cleanSlug = slug ? String(slug).trim().toLowerCase() : '';

    if (page === 'admin') return '/Admin';

    if (page === 'cardapio') {
        if (cleanSlug) return `/s/${cleanSlug}`;
        return '/';
    }

    if (page === 'painelassinante') {
        if (cleanSlug) return `/s/${cleanSlug}/PainelAssinante`;
        return '/PainelAssinante';
    }

    if (page === 'painelgerente') return '/PainelGerente';
    if (page === 'colaboradorhome') return '/colaborador';

    const operationalMap: Record<string, string> = {
        gestorpedidos: 'gestor',
        pdv: 'pdv',
        cozinha: 'cozinha',
        garcom: 'garcom',
        entregador: 'entregador',
        entregadorpanel: 'entregador',
    };

    if (operationalMap[page]) {
        if (cleanSlug) return `/app/${cleanSlug}/${operationalMap[page]}`;
        const legacyPathMap: Record<string, string> = {
            gestorpedidos: '/GestorPedidos',
            pdv: '/PDV',
            cozinha: '/Cozinha',
            garcom: '/Garcom',
            entregador: '/Entregador',
            entregadorpanel: '/EntregadorPanel',
        };
        return legacyPathMap[page];
    }

    if (cleanSlug && page !== 'assinar') {
        return `/s/${cleanSlug}/${rawPage}`;
    }

    return '/' + page.replace(/ /g, '-');
}
