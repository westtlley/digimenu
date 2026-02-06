/**
 * QueryErrorBoundary - Error boundary específico para erros de queries
 * Mostra mensagem clara quando uma query falha
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingError } from './AccessDenied';

class QueryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Verificar se é erro de query (tem propriedades específicas)
    const isQueryError = error?.message?.includes('query') || 
                        error?.message?.includes('fetch') ||
                        error?.name === 'QueryError';
    
    if (isQueryError) {
      return { hasError: true, error };
    }
    
    // Se não for erro de query, deixar o ErrorBoundary global tratar
    return null;
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 [QueryErrorBoundary] Erro de query capturado:', {
      error: error?.message || error,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Forçar refetch de todas as queries
    if (window.queryClient) {
      window.queryClient.refetchQueries();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <LoadingError
          title="Erro ao carregar dados"
          message={this.state.error?.message || "Não foi possível carregar os dados. Verifique sua conexão e tente novamente."}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default QueryErrorBoundary;
