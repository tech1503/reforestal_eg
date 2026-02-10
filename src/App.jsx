import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Componentes
import Dashboard from '@/components/Dashboard';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AuthScreen from '@/components/AuthScreen';
import GenesisQuest from '@/components/GenesisQuest';
import HomePage from '@/components/HomePage';
import UpdatePassword from '@/components/UpdatePassword';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import ContactPage from '@/pages/ContactPage'; // <--- IMPORTACIÓN NUEVA

// Contextos y Hooks
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { FinancialProvider } from '@/contexts/FinancialContext';
import { useAnalyticsFeedback } from '@/hooks/useAnalyticsFeedback';
import { runDataIntegrityCheck } from '@/utils/dataIntegrityCheck';
import { useGenesisSync } from '@/hooks/useGenesisSync';

// --- Middlewares de Protección ---

const AppWithAnalytics = ({ children }) => {
  useAnalyticsFeedback();
  return children;
};

const RedirectAuthenticated = ({ children }) => {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="h-screen w-full flex items-center justify-center"><Loader className="animate-spin text-emerald-500 w-10 h-10" /></div>;

  if (session && profile) {
    const role = profile.role || 'user';
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'startnext_user') return <Navigate to="/startnext" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (session && !profile)) {
    return <div className="h-screen w-full flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  if (!session) return <Navigate to="/auth" state={{ from: location }} replace />;

  const userRole = profile?.role || 'user';
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'startnext_user') return <Navigate to="/startnext" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// --- Contenido Principal ---

const AppContent = () => {
  const { loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  useGenesisSync();

  useEffect(() => { runDataIntegrityCheck(); }, []);

  // Kill Switch para bucles de redirección infinitos
  useEffect(() => {
    const reloadCount = parseInt(sessionStorage.getItem('reload_count') || '0');
    const lastReloadTime = parseInt(sessionStorage.getItem('last_reload_time') || '0');
    const now = Date.now();
    
    if (now - lastReloadTime < 10000) {
      sessionStorage.setItem('reload_count', (reloadCount + 1).toString());
    } else {
      sessionStorage.setItem('reload_count', '1');
    }
    sessionStorage.setItem('last_reload_time', now.toString());

    if (reloadCount > 5) {
      console.error('CRITICAL: Infinite reload cycle prevented.');
      toast({ variant: "destructive", title: "System Alert", description: "Stability protocol activated. Please clear cache." });
    }
  }, [toast]);

  // Manejo de Referrals
  if (location.pathname.startsWith('/ref/')) {
    const refId = location.pathname.split('/ref/')[1];
    if (refId) {
      localStorage.setItem('reforestal_ref', refId);
      return <Navigate to="/auth" replace />;
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader className="w-12 h-12 animate-spin text-emerald-500" /></div>;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rutas Públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/genesis-quest" element={<GenesisQuest />} />
        <Route path="/genesis-profile" element={<GenesisQuest forceShowResult={true} />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        {/* RUTA DE CONTACTO (NUEVA) */}
        {/* Accesible para todos. La lógica de 'volver' se maneja dentro del componente. */}
        <Route path="/contact" element={<ContactPage />} />

        {/* Autenticación */}
        <Route path="/auth" element={<RedirectAuthenticated><AuthScreen /></RedirectAuthenticated>} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth" replace />} />

        {/* --- ÁREAS PROTEGIDAS (Rutas Anidadas) --- */}
        
        {/* User Dashboard Standard */}
        <Route path="/dashboard/*" element={
            <ProtectedRoute allowedRoles={['user']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Startnext User Dashboard */}
        <Route path="/startnext/*" element={
            <ProtectedRoute allowedRoles={['startnext_user']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Admin Panel */}
        <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <>
    <Helmet>
      <title>Reforestal eG</title>
      <meta name="description" content="Secure Platform for Reforestation Impact" />
    </Helmet>
    <GlobalErrorBoundary>
      <FinancialProvider>
        <AppWithAnalytics>
          <div className="min-h-screen font-sans text-foreground bg-slate-50">
            <AppContent />
            <Toaster />
          </div>
        </AppWithAnalytics>
      </FinancialProvider>
    </GlobalErrorBoundary>
  </>
);

export default App;