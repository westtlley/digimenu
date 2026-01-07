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