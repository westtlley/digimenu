/**
 * Hook para páginas sob /s/:slug/... (ex: /s/raiz-maranhense/GestorPedidos).
 * Resolve o assinante dono do slug e indica se o master deve usar as_subscriber.
 */
import { useEffect } from 'react';
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

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7244/ingest/f18c0e00-5c91-42a3-87eb-dd9db415f5ec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H2', location: 'useSlugContext.jsx:subscriberEmail', message: 'subscriberEmail state', data: { slug, subscriberEmail, loading, hasPublicData: !!publicData }, timestamp: Date.now() }) }).catch(() => {});
  }, [slug, subscriberEmail, loading, publicData]);
  // #endregion

  return {
    slug: slug || null,
    subscriberEmail,
    inSlugContext: !!slug,
    loading: !!slug && loading,
    error: !!slug && error,
    publicData,
  };
}
