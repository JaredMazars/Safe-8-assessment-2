import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { getCsrfToken } from './services/api'

// Pre-fetch CSRF token when app loads
getCsrfToken().catch(err => console.warn('CSRF token pre-fetch failed:', err));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
