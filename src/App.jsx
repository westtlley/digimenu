import './App.css'
import '@/styles/animations.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from "react-hot-toast"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0, // Sempre considera os dados como desatualizados
      gcTime: 0, // Remove do cache imediatamente (antigo cacheTime)
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Pages />
      <Toaster />
      <HotToaster position="top-center" />
    </QueryClientProvider>
  )
}

export default App 