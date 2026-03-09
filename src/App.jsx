import './App.css'
import '@/styles/animations.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from "react-hot-toast"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ErrorBoundary from '@/components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2, // Tentar 2 vezes em caso de erro
      staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
      gcTime: 10 * 60 * 1000, // 10 minutos - tempo no cache (antigo cacheTime)
      refetchOnMount: true, // Refetch quando componente monta
      refetchOnReconnect: true, // Refetch quando reconecta
    },
    mutations: {
      retry: 1, // Tentar 1 vez em caso de erro em mutations
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Pages />
        <Toaster />
        <HotToaster
          position="top-center"
          gutter={8}
          containerStyle={{ top: 12, zIndex: 2147483646 }}
          toastOptions={{
            duration: 4500,
            style: {
              maxWidth: 'min(92vw, 420px)',
              fontSize: '14px',
              lineHeight: '1.35',
            },
            success: { duration: 3500 },
            error: { duration: 5000 },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App 
