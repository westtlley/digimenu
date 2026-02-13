/**
 * Hook para páginas sob /s/:slug/... (ex: /s/raiz-maranhense/GestorPedidos).
 * Resolve o assinante dono do slug e indica se o master deve usar as_subscriber.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSlugContext() {
  const { slug } = useParams();

  const { data: publicData, isLoading: loading, isError: error } = useQuery({
    queryKey: ['publicCardapio', slug],
    queryFn: () => base44.get(`/public/cardapio/${slug}`),
    enabled: !!slug,
  });

  const subscriberEmail = publicData?.subscriber_email || null;

  return {
    slug: slug || null,
    subscriberEmail,
    inSlugContext: !!slug,
    loading: !!slug && loading,
    error: !!slug && error,
    publicData,
  };
}
