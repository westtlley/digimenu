/**
 * Testes para useOptimizedQuery
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';

describe('useOptimizedQuery', () => {
  it('deve deduplear queries rápidas', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const queryFn = vi.fn(() => Promise.resolve('data'));

    const { result } = renderHook(
      () => useOptimizedQuery(['test'], queryFn, { minInterval: 1000 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
