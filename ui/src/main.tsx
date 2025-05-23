import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { ParameterProvider } from './components/ParameterUtils'

// Create a client
const queryClient = new QueryClient()

// Configure React Router
// const router = BrowserRouter // Commented out: Unused variable

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ParameterProvider>
          <App />
        </ParameterProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
) 