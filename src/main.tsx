import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './hooks/useToast'
import { AuthProvider } from './hooks/useAuth'
import { TeamProvider } from './hooks/useTeam'
import './index.css'

/** Without this, a single render error blanks the entire app. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0b1220', color: '#e2e8f0', fontFamily: 'ui-monospace, monospace' }}>
          <div style={{ maxWidth: 720, width: '100%' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5, color: '#fca5a5' }}>{this.state.error.message}</pre>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.5, opacity: 0.7 }}>{this.state.error.stack}</pre>
            <button onClick={() => location.reload()} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', fontWeight: 600 }}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is progressive enhancement — ignore failures */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TeamProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </TeamProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
