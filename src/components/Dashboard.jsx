import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
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
import PremiumDashboard from '@/components/PremiumDashboard';
import ProfileSettings from '@/components/sections/ProfileSettings';

// Componente Dinámico
import MissionPlayer from '@/components/MissionPlayer'; 

const Dashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showICHistory, setShowICHistory] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const getActiveSection = () => {
      const path = location.pathname;
      if (path.includes('/profile')) return 'profile';
      if (path.includes('/quests') || path.includes('/mission/')) return 'quests';
      if (path.includes('/referral')) return 'referral';
      if (path.includes('/exchange')) return 'exchange';
      if (path.includes('/founding_members') || path.includes('/pioneer')) return 'founding_members';
      if (path.includes('/subscription')) return 'subscription';
      return 'dashboard';
  };

  const activeSection = getActiveSection();

  
  const handleSetActiveSection = (sectionId) => {
      
      console.debug(`Navigating to section: ${sectionId}`);
  };

  useEffect(() => {
    if (!authLoading && profile?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [profile, authLoading, navigate]);

  if (authLoading) return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
          <span className="sr-only">{t('common.loading')}</span>
      </div>
  );

  // Freemium (Fase 4/5): solo `user_premium` ve el dashboard premium.
  // Los usuarios legacy (`startnext_user`) quedan normalizados a `user`
  // en SupabaseAuthContext, por lo que ven el dashboard básico hasta
  // su migración manual.
  const isPremium = profile?.role === 'user_premium';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-transparent overflow-hidden font-sans text-sm">
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
        isPremium={isPremium}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300">
        <Header
          activeSection={activeSection}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onOpenHistory={() => setShowICHistory(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth pb-24 relative bg-background dark:bg-transparent">
          <div className="max-w-7xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <Routes>
                  <Route index element={isPremium ? <PremiumDashboard /> : <DashboardSection />} />
                  <Route path="profile" element={<ProfileSettings />} />
                  
                  <Route path="founding_members" element={<FoundingMembersSection />} />
                  
                  <Route path="referral" element={<ReferralSection />} />
                  <Route path="exchange" element={<ExchangeSection isReadOnly={!isPremium} />} />
                  
                  {/*<Route path="quests" element={<QuestsSection isReadOnly={!isPremium} />} />*/}
                  <Route path="quests" element={<QuestsSection />} />

                  
                  <Route path="mission/:id" element={<MissionPlayer />} />
                  
                  <Route path="*" element={isPremium ? <PremiumDashboard /> : <DashboardSection />} />
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