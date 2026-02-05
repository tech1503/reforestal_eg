import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  LogOut, 
  ChevronLeft,
  CreditCard,
  Users,
  ShoppingCart,
  Award,
  Star,
  Lock,
  HeartHandshake,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import StartnextSupportModal from '@/components/ui/StartnextSupportModal';

const Sidebar = ({ activeSection, setActiveSection, isOpen, onClose, role }) => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const isStartnext = role === 'startnext_user';
  
  // Define el camino base dinámicamente
  const basePath = isStartnext ? '/startnext' : '/dashboard';

  const menuItems = [
    { 
      id: 'dashboard', 
      label: t('navigation.dashboard'), 
      icon: LayoutDashboard, 
      locked: false,
      href: `${basePath}`, 
      translationKey: 'navigation.dashboard'
    },
    { 
      id: 'profile', 
      label: t('navigation.profile'), 
      icon: User, 
      locked: false,
      href: `${basePath}/profile`,
      translationKey: 'navigation.profile'
    },
    { 
      id: 'subscription', 
      label: t('navigation.subscription'), 
      icon: CreditCard, 
      locked: true,
      // href opcional para elementos bloqueados/especiales
      translationKey: 'navigation.subscription'
    },
    { 
      id: 'referral', 
      label: t('navigation.referral'), 
      icon: Users, 
      locked: !isStartnext,
      href: `${basePath}/referral`,
      translationKey: 'navigation.referral'
    },
    { 
      id: 'exchange', 
      label: t('navigation.exchange'), 
      icon: ShoppingCart, 
      locked: false,
      href: `${basePath}/exchange`,
      translationKey: 'navigation.exchange'
    },
    { 
      id: 'quests', 
      label: t('navigation.quests'), 
      icon: Award, 
      locked: false,
      href: `${basePath}/quests`,
      translationKey: 'navigation.quests'
    },
    { 
      id: 'founding_members', 
      label: t('navigation.founding_pioneer'),
      icon: Star, 
      locked: !isStartnext,
      // CORREGIDO: Ruta alineada con Dashboard.jsx
      href: `${basePath}/founding_members`,
      translationKey: 'navigation.founding_members'
    },
  ];

  const handleNavigation = (item) => {
    // Lógica para items bloqueados o especiales (ej. Subscription)
    if (item.id === 'subscription') {
        toast({
            variant: "default", 
            title: t('dashboard.reforestal_pfad.title'), 
            description: t('dashboard.reforestal_pfad.description')
        });
        return;
    }

    if (item.href) {
        // 1. Ejecutar navegación
        navigate(item.href);
        
        // 2. Actualizar estado activo usando la prop (Satisface requerimiento de uso)
        if (setActiveSection) {
            setActiveSection(item.id);
        }

        // 3. Cerrar sidebar en móvil
        if (onClose) onClose();
    }
  };

  const handleSignOut = async () => {
      await signOut();
  };

  return (
    <>
      <StartnextSupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />

      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            aria-label="Close sidebar"
        />
      )}

      <aside 
        className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out bg-gradient-to-b from-[#055b4f] via-[#17a277] to-[#82c6ba] border-r border-white/10 md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none",
            isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 flex items-center justify-between h-[64px] border-b border-white/20 w-full bg-transparent">
          <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white font-bold shadow-md border border-white/30">
                 R
               </div>
               <span className="font-bold text-lg text-white tracking-tight drop-shadow-sm">Reforestal</span>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden text-white/80 hover:bg-white/10 p-2 rounded-lg transition-colors duration-200"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
          {menuItems.map((item) => {
             // CORREGIDO: Usamos activeSection para determinar el estilo
             const isActive = activeSection === item.id;
             const isLocked = item.locked;
             
             return (
                <button
                   key={item.id}
                   onClick={() => handleNavigation(item)}
                   className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden text-left",
                      isActive 
                        ? "bg-white/20 text-white font-bold shadow-md border border-white/30" 
                        : "text-white/90 hover:bg-white/10 hover:text-white border border-transparent",
                      isLocked && !isActive && "opacity-75"
                   )}
                >
                   <div className="relative z-10 flex-shrink-0">
                       <item.icon 
                          size={20} 
                          className={cn(
                            "transition-colors duration-200 text-white",
                            isLocked && "text-white/80"
                          )} 
                       />
                       {isLocked && (
                           <div className="absolute -top-1 -right-1 bg-[#055b4f] rounded-full p-0.5 border border-white/30 shadow-sm">
                               <Lock size={8} className="text-white/80" />
                           </div>
                       )}
                   </div>
                   
                   <div className="flex-1 relative z-10 whitespace-nowrap overflow-hidden">
                       <span className="text-sm font-medium tracking-wide">
                           {t(item.translationKey)}
                       </span>
                   </div>
                </button>
             )
          })}
        </nav>
        
        {!isStartnext && (
            <div className="px-3 pb-4 w-full">
                 <button
                   onClick={() => setIsSupportModalOpen(true)}
                   className="w-full flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 rounded-lg px-3 py-3 transition-all duration-200 group text-xs font-semibold shadow-md"
                >
                   <HeartHandshake size={18} className="shrink-0 text-white" />
                   <span className="text-left leading-tight">Supported on<br/>Startnext?</span>
                </button>
            </div>
        )}

        <div className="p-4 border-t border-white/20 w-full bg-black/10">
           <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 hover:bg-red-500/20 hover:text-white transition-colors duration-200 font-medium"
           >
              <LogOut size={18} />
              <span className="text-sm">{t('navigation.logout')}</span>
           </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;