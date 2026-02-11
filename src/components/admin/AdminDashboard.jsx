import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Sprout, Wallet, Gamepad2, ScrollText, Database, Activity,
  LogOut, Menu, X, Settings, Globe, Share2, Layers, LineChart, Loader2, ClipboardCheck,
  FlaskConical, CheckSquare, Search, ChevronDown, UserPlus, Award, ListChecks, Trophy, Bell,
  Banknote, BarChart4
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

// Lazy load admin modules...
const AdminOverview = lazy(() => import('@/components/admin/AdminOverview'));
const UserManagement = lazy(() => import('@/components/admin/UserManagement'));
const CommunityManagement = lazy(() => import('@/components/admin/CommunityManagement'));
const VestingManagement = lazy(() => import('@/components/admin/VestingManagement'));
const FinancialsManagement = lazy(() => import('@/components/admin/FinancialsManagement'));
const ContentManagement = lazy(() => import('@/components/admin/ContentManagement'));
const SystemLogs = lazy(() => import('@/components/admin/SystemLogs'));
const MlmManagement = lazy(() => import('@/components/admin/MlmManagement'));
const TierManagement = lazy(() => import('@/components/admin/TierManagement'));
const AnalyticsDashboard = lazy(() => import('@/components/admin/AnalyticsDashboard'));
const SystemValidationReport = lazy(() => import('@/components/admin/SystemValidationReport'));
const FinalDashboardTest = lazy(() => import('@/components/admin/FinalDashboardTest'));
const SchemaAuditView = lazy(() => import('@/components/admin/SchemaAuditView'));
const SchemaMapper = lazy(() => import('@/components/admin/SchemaMapper'));
const PendingRegistrations = lazy(() => import('@/components/admin/PendingRegistrations'));
//const LandDollarsTable = lazy(() => import('@/components/admin/LandDollarsTable'));

// New Gamification & Founding Pioneer Modules...
const AdminGamificationActionsConfig = lazy(() => import('@/components/admin/gamification/AdminGamificationActionsConfig'));
const AdminUserHistoryLog = lazy(() => import('@/components/admin/gamification/AdminUserHistoryLog'));
const AdminUserScoring = lazy(() => import('@/components/admin/gamification/AdminUserScoring'));
const FoundingPioneerEvaluation = lazy(() => import('@/components/admin/FoundingPioneerEvaluation'));
const AdminFoundingPioneerRanking = lazy(() => import('@/components/admin/AdminFoundingPioneerRanking'));
const GamificationManagement = lazy(() => import('@/components/admin/GamificationManagement'));
const AdminNotificationCenter = lazy(() => import('@/components/admin/AdminNotificationCenter'));

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [gamificationExpanded, setGamificationExpanded] = useState(false);
  const [pioneerExpanded, setPioneerExpanded] = useState(false);

  const { signOut, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // --- FUNCIÓN MANUAL ELIMINADA (Ya no se necesita) ---

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, loading, navigate]);

  // Auto-Expand Logic
  useEffect(() => {
    const settingsSubItems = ['schema_mapping', 'schema_audit', 'final_test', 'validation', 'logs'];
    if (settingsSubItems.includes(activeSection)) setSettingsExpanded(true);

    const gamificationSubItems = ['gamification_actions_config', 'gamification_history', 'gamification_scoring', 'gamification_quests'];
    if (gamificationSubItems.includes(activeSection)) setGamificationExpanded(true);

    const pioneerSubItems = ['founding_eval', 'founding_ranking'];
    if (pioneerSubItems.includes(activeSection)) setPioneerExpanded(true);
  }, [activeSection]);

  const menuItems = [
    { id: 'overview', label: t('admin.overview', 'Overview'), icon: LayoutDashboard, component: AdminOverview },
    { id: 'notifications', label: t('admin.notifications.title', 'Notifications'), icon: Bell, component: AdminNotificationCenter },
    { id: 'analytics', label: t('admin.analytics.title', 'Analytics'), icon: LineChart, component: AnalyticsDashboard },
    { id: 'pending', label: t('admin.startnext.pending_approvals', 'Pending Registrations'), icon: UserPlus, component: PendingRegistrations },
    {
      id: 'pioneer_group',
      label: t('navigation.founding_pioneer', 'Founding Pioneer'),
      icon: Award,
      state: [pioneerExpanded, setPioneerExpanded],
      children: [
        { id: 'founding_eval', label: t('admin.evaluation', 'Evaluation'), icon: ListChecks, component: FoundingPioneerEvaluation },
        { id: 'founding_ranking', label: t('admin.ranking', 'Ranking'), icon: Trophy, component: AdminFoundingPioneerRanking },
      ]
    },
    {
      id: 'gamification_group',
      label: t('admin.gamification', 'Gamification'),
      icon: Gamepad2,
      state: [gamificationExpanded, setGamificationExpanded],
      children: [
        { id: 'gamification_scoring', label: t('admin.scoring', 'Scoring'), icon: Activity, component: AdminUserScoring },
        { id: 'gamification_actions_config', label: t('admin.impact_credits.action', 'Actions'), icon: Settings, component: AdminGamificationActionsConfig },
        { id: 'gamification_history', label: t('admin.analytics.audit_history', 'History'), icon: ScrollText, component: AdminUserHistoryLog },
        { id: 'gamification_quests', label: t('navigation.quests', 'Quests'), icon: Sprout, component: GamificationManagement },
      ]
    },
    { id: 'users', label: t('admin.user_management', 'Users'), icon: Users, component: UserManagement },
    { id: 'community', label: 'Community', icon: Globe, component: CommunityManagement },
    { id: 'financials', label: t('admin.financials.title', 'Financials'), icon: Wallet, component: FinancialsManagement },
    { id: 'tiers', label: t('admin.startnext.tier', 'Tiers'), icon: Layers, component: TierManagement },
    { id: 'mlm', label: t('admin.mlm', 'Referrals (MLM)'), icon: Share2, component: MlmManagement },
    { id: 'vesting', label: t('admin.vesting', 'Vesting'), icon: ScrollText, component: VestingManagement },
    { id: 'content', label: t('admin.content', 'Content'), icon: FlaskConical, component: ContentManagement },
    {
      id: 'settings_group',
      label: t('admin.settings', 'Settings'),
      icon: Settings,
      state: [settingsExpanded, setSettingsExpanded],
      children: [
        { id: 'schema_mapping', label: t('admin.schema_mapping', 'Schema Mapping'), icon: Search, component: SchemaMapper },
        { id: 'schema_audit', label: t('admin.schema_audit', 'Schema Audit'), icon: Database, component: SchemaAuditView },
        { id: 'final_test', label: t('admin.final_validation', 'Final Validation'), icon: CheckSquare, component: FinalDashboardTest },
        { id: 'validation', label: t('admin.system_health', 'System Health'), icon: ClipboardCheck, component: SystemValidationReport },
        { id: 'logs', label: t('admin.logs', 'Logs'), icon: Activity, component: SystemLogs },
      ]
    },
  ];

  let ActiveComponent = AdminOverview;
  menuItems.forEach(item => {
    if (item.id === activeSection) ActiveComponent = item.component;
    else if (item.children) {
      const child = item.children.find(childItem => childItem.id === activeSection);
      if (child) ActiveComponent = child.component;
    }
  });

  if (loading || profile?.role !== 'admin') return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300">
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-50 shadow-xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
          ${!sidebarOpen && 'md:w-20'} 
          dark:bg-slate-950 dark:border-r dark:border-slate-800
        `}
      >
        <div className="h-full flex flex-col">
          <div className={`h-16 flex items-center ${sidebarOpen ? 'px-6 justify-between' : 'justify-center'} border-b border-slate-800`}>
            {sidebarOpen ? (
              <>
                <div className="font-bold text-xl tracking-tight flex items-center gap-2">
                  <Settings className="h-6 w-6 text-violet-500" />
                  <span>Admin<span className="text-violet-500">Panel</span></span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </>
            ) : (
              <Settings className="h-8 w-8 text-violet-500" />
            )}
          </div>

          <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id || (item.children && item.children.some(child => child.id === activeSection));
              if (item.children) {
                const [isExpanded, setIsExpanded] = item.state;
                return (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => { setIsExpanded(!isExpanded); if (!sidebarOpen) setSidebarOpen(true); }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
                        ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                        ${!sidebarOpen && 'justify-center'}
                      `}
                    >
                      <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                      {sidebarOpen && <span className="font-medium text-sm flex-1 text-left">{item.label}</span>}
                      {sidebarOpen && <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-8 pt-1 space-y-1 overflow-hidden">
                        {item.children.map(child => {
                          const isChildActive = activeSection === child.id;
                          return (
                            <button
                              key={child.id}
                              onClick={() => setActiveSection(child.id)}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative
                                ${isChildActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                text-sm
                              `}
                            >
                              <child.icon size={16} className={isChildActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                              <span className="font-normal text-sm">{child.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              } else {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
                      ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                      ${!sidebarOpen && 'justify-center'}
                    `}
                  >
                    <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                    {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                  </button>
                );
              }
            })}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">{t('admin.title', 'Admin Panel')}</h2>
          <div className="flex items-center gap-3">

            {/* --- NUEVO COMPONENTE LanguageSwitcher --- */}
            <LanguageSwitcher />

            <ThemeSwitcher />
            <Button variant="ghost" onClick={signOut}>{t('navigation.sign_out', 'Sign Out')}</Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>}>
            <ActiveComponent />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;