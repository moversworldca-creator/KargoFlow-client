import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './features/auth/context/AuthContext'
import companyLogo from './assets/comapny_logo.png'

const faviconId = 'app-favicon'
let faviconLink = document.getElementById(faviconId)

if (!faviconLink) {
  faviconLink = document.createElement('link')
  faviconLink.id = faviconId
  faviconLink.rel = 'icon'
  faviconLink.type = 'image/png'
  document.head.appendChild(faviconLink)
}

faviconLink.href = companyLogo
faviconLink.type = 'image/png'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/queries/queryClient'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
)
