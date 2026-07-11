import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PreferencesProvider } from './lib/preferences.jsx'
import { ToastProvider } from './lib/toast.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary label="Aplikasi">
      <PreferencesProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
