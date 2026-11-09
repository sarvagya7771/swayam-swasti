import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/config';
import Setup from './pages/Setup';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');

/**
 * Without Supabase credentials the app shows setup instructions instead of
 * running on browser-local data. Real accounts and real storage are required.
 */
createRoot(root).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    ) : (
      <div className="app-shell">
        <main className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div className="page">
            <Setup />
          </div>
        </main>
      </div>
    )}
  </StrictMode>,
);
