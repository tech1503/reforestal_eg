import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { FinancialProvider } from '@/contexts/FinancialContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { BrowserRouter as Router } from 'react-router-dom';
import '@/i18n';

// --- SERVICE WORKER KILL SWITCH OPTIMIZADO ---
console.log('SERVICE WORKER KILL SWITCH: Iniciando...');

const isSWCleaned = () => {
  try {
    return sessionStorage.getItem('sw_cleaned') === 'true';
  } catch (e) {
    return false;
  }
};

const setSWCleaned = () => {
  try {
    sessionStorage.setItem('sw_cleaned', 'true');
  } catch (e) { }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0 && !isSWCleaned()) {
        for (let registration of registrations) {
          registration.unregister();
        }
        setSWCleaned();
        console.log('KILL SWITCH: Limpieza inicial. Recargando...');
        window.location.reload();
      } else {
        console.log('KILL SWITCH: Entorno limpio.');
      }
    });
  });
}

// ELIMINADO: El setTimeout que borraba el sessionStorage ha sido removido 
// para evitar que la app pierda su estado de "limpieza realizada".

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <FinancialProvider>
            <App />
          </FinancialProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  </Router>
);