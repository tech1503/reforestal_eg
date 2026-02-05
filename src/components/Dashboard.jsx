import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Menu } from 'lucide-react';

// Componentes de Estructura
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ImpactCreditsHistoryModal from '@/components/modals/ImpactCreditsHistoryModal';

// Secciones del Dashboard
import DashboardSection from '@/components/sections/DashboardSection';
import FoundingMembersSection from '@/components/sections/FoundingMembersSection';
import ReferralSection from '@/components/sections/ReferralSection';
import ExchangeSection from '@/components/sections/ExchangeSection';
import QuestsSection from '@/components/sections/QuestsSection';
import StartnextUserDashboard from '@/components/StartnextUserDashboard';
import ProfileSettings from '@/components/sections/ProfileSettings';

// Componente Dinámico
import MissionPlayer from '@/components/MissionPlayer'; 

const Dashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showICHistory, setShowICHistory] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  const [hasContribution, setHasContribution] = useState(false);
  const [checkLoading, setCheckLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  // Determinar visualmente qué item del menú está activo basado en la URL
  const getActiveSection = () => {
      const path = location.pathname;
      if (path.includes('/profile')) return 'profile';
      if (path.includes('/quests') || path.includes('/mission/')) return 'quests';
      if (path.includes('/referral')) return 'referral';
      if (path.includes('/exchange')) return 'exchange';
      // Unificamos la detección para founding_members
      if (path.includes('/founding_members') || path.includes('/pioneer')) return 'founding_members';
      if (path.includes('/subscription')) return 'subscription';
      return 'dashboard';
  };

  const activeSection = getActiveSection();

  // Función para manejar el cambio de sección desde el Sidebar (satisface requerimientos de props)
  const handleSetActiveSection = (sectionId) => {
      // Aquí podrías agregar lógica extra si fuera necesario, como analíticas
      console.debug(`Navigating to section: ${sectionId}`);
  };

  // Redirección de seguridad para admins
  useEffect(() => {
    if (!authLoading && profile?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [profile, authLoading, navigate]);

  // Chequeo de estatus Startnext
  useEffect(() => {
    const checkStatus = async () => {
      if (!profile?.id) return;
      setCheckLoading(true);
      if (profile.role === 'startnext_user') {
        setHasContribution(true);
        setCheckLoading(false);
        return;
      }
      const { count, error } = await supabase
        .from('startnext_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);
      
      setHasContribution(!error && count > 0);
      setCheckLoading(false);
    };
    if (profile) checkStatus();
  }, [profile]);

  if (authLoading || checkLoading) return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
          <span className="sr-only">{t('common.loading')}</span>
      </div>
  );

  const isStartnext = profile?.role === 'startnext_user' || hasContribution;
  const userRole = isStartnext ? 'startnext_user' : 'user';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-sm">
      {/* Botón Menú Móvil */}
      {!isSidebarOpen && (
        <button
          className="md:hidden fixed top-3 left-4 z-50 p-2 bg-white/90 backdrop-blur text-emerald-800 border border-emerald-100 rounded-lg shadow-md hover:bg-emerald-50 transition-all"
          onClick={() => setSidebarOpen(true)}
          aria-label={t('navigation.menu') || "Open Menu"}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <Sidebar
        activeSection={activeSection}
        setActiveSection={handleSetActiveSection}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={userRole}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300">
        <Header
          activeSection={activeSection}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onOpenHistory={() => setShowICHistory(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth pb-24 relative bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <Routes>
                  <Route index element={isStartnext ? <StartnextUserDashboard /> : <DashboardSection />} />
                  <Route path="profile" element={<ProfileSettings />} />
                  
                  {/* RUTA CORREGIDA: Coincide con el Sidebar ID */}
                  <Route path="founding_members" element={<FoundingMembersSection />} />
                  
                  <Route path="referral" element={<ReferralSection />} />
                  <Route path="exchange" element={<ExchangeSection isReadOnly={!isStartnext} />} />
                  <Route path="quests" element={<QuestsSection isReadOnly={!isStartnext} />} />
                  
                  {/* Player de Misiones */}
                  <Route path="mission/:id" element={<MissionPlayer />} />
                  
                  {/* Fallback */}
                  <Route path="*" element={isStartnext ? <StartnextUserDashboard /> : <DashboardSection />} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <ImpactCreditsHistoryModal
        isOpen={showICHistory}
        onClose={() => setShowICHistory(false)}
      />
    </div>
  );
};

export default Dashboard;