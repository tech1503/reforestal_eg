import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';

// Componentes
import Dashboard from '@/components/Dashboard';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AuthScreen from '@/components/AuthScreen';
import GenesisQuest from '@/components/GenesisQuest';
import HomePage from '@/components/HomePage';
import UpdatePassword from '@/components/UpdatePassword';
import ContactPage from '@/pages/ContactPage';

// Contextos y Hooks
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { FinancialProvider } from '@/contexts/FinancialContext';
import { useAnalyticsFeedback } from '@/hooks/useAnalyticsFeedback';
import { runDataIntegrityCheck } from '@/utils/dataIntegrityCheck';
import { useGenesisSync } from '@/hooks/useGenesisSync';

const AppWithAnalytics = ({ children }) => {
  useAnalyticsFeedback();
  return children;
};

const ReferralHandler = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const reserved = ['admin', 'dashboard', 'auth', 'login', 'register', 'contact', 'genesis-quest', 'genesis-profile', 'update-password', 'startnext'];
    
    if (username && !reserved.includes(username.toLowerCase())) {
      localStorage.setItem('reforestal_ref', username);
      navigate('/auth', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [username, navigate]);

  return <div className="h-screen w-full flex items-center justify-center"><Loader className="animate-spin text-emerald-500 w-10 h-10" /></div>;
};

const AppContent = () => {
  const { loading, session, profile } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  useGenesisSync();
  useEffect(() => { runDataIntegrityCheck(); }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader className="w-12 h-12 animate-spin text-emerald-500" /></div>;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/genesis-quest" element={<GenesisQuest />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        {/* Dashboards con Rutas Protegidas */}
        <Route path="/admin/*" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/auth" />} />
        <Route path="/dashboard/*" element={session ? <Dashboard /> : <Navigate to="/auth" />} />
        <Route path="/startnext/*" element={profile?.role === 'startnext_user' ? <Dashboard /> : <Navigate to="/auth" />} />

        {/* Captura de Referidos */}
        <Route path="/ref/:username" element={<ReferralHandler />} />
        <Route path="/:username" element={<ReferralHandler />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <FinancialProvider>
    <AppWithAnalytics>
       <div className="min-h-screen font-sans text-foreground bg-slate-50 dark:bg-transparent">
          <AppContent />
          <Toaster />
       </div>
    </AppWithAnalytics>
  </FinancialProvider>
);

export default App;