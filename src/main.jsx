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
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';


ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <FinancialProvider>
            <GlobalErrorBoundary>
              <App />
            </GlobalErrorBoundary>
          </FinancialProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  </Router>
);