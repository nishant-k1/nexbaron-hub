import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { initSentry } from '@/lib/sentry'
import { initGlobalErrorHandlers } from '@/lib/runtime-errors'

initSentry()
initGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="app-root">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
