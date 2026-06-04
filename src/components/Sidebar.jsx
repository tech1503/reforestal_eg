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
import logoDorado from '@/assets/icons/Logo-Reforestal-1.svg';

// Componente para inyectar el gradiente SVG para los iconos de Lucide
const GoldGradientSVG = () => (
  <svg width="0" height="0" className="absolute pointer-events-none">
    <linearGradient id="icon-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop stopColor="#734b07" offset="0%" />
      <stop stopColor="#cf9c2a" offset="25%" />
      <stop stopColor="#fef1a7" offset="50%" />
      <stop stopColor="#cf9c2a" offset="75%" />
      <stop stopColor="#734b07" offset="100%" />
    </linearGradient>
  </svg>
);

const Sidebar = ({ activeSection, setActiveSection, isOpen, onClose, role }) => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const isStartnext = role === 'startnext_user';
  
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
      translationKey: 'navigation.subscription'
    },
    { 
      id: 'referral', 
      label: t('navigation.referral'), 
      icon: Users, 
      locked: false, 
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
      href: `${basePath}/founding_members`,
      translationKey: 'navigation.founding_members'
    },
  ];

  const handleNavigation = (item) => {
    
    if (item.id === 'subscription') {
        toast({
            variant: "default", 
            title: t('dashboard.reforestal_pfad.title'), 
            description: t('dashboard.reforestal_pfad.description')
        });
        return;
    }

    if (item.href) {
        navigate(item.href);
        
        if (setActiveSection) {
            setActiveSection(item.id);
        }

        if (onClose) onClose();
    }
  };

  const handleSignOut = async () => {
      await signOut();
  };

  return (
    <>
      <GoldGradientSVG />
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
            "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out bg-gradient-to-b from-[#063127] via-[#215141] to-[#5b8370] border-r border-white/10 md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none",
            isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 flex items-center justify-between h-[64px] border-b border-white/20 w-full bg-transparent">
          <div className="flex items-center gap-3">
               <img src={logoDorado} alt="Reforestal" className="w-8 h-8" />
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
             const isActive = activeSection === item.id;
             const isLocked = item.locked;
             const isHighlight = item.id === 'quests'; 
             
             return (
                <button
                   key={item.id}
                   onClick={() => handleNavigation(item)}
                   className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden text-left",
                      
                      // Estilos para ítems normales
                      isActive && !isHighlight && "bg-white/20 text-white font-bold shadow-md border border-white/30",
                      !isActive && !isHighlight && "text-white/90 hover:bg-white/10 hover:text-white border border-transparent",
                      
                      // Estilos para el ítem DESTACADO (Quests)
                      isActive && isHighlight && "bg-white/20 border border-[#cf9c2a] shadow-glow",
                      !isActive && isHighlight && "border border-[#cf9c2a]/40 hover:bg-white/10 hover:border-[#cf9c2a] shadow-glow",
                      
                      isLocked && !isActive && "opacity-75"
                   )}
                >
                   <div className="relative z-10 flex-shrink-0">
                       <item.icon 
                          size={20} 
                          className={cn(
                            "transition-colors duration-200 drop-shadow-md",
                            isLocked && "opacity-75"
                          )} 
                          style={{ stroke: 'url(#icon-gold-gradient)' }}
                       />
                       {isLocked && (
                           <div className="absolute -top-1 -right-1 bg-[#063127] rounded-full p-0.5 border border-[#cf9c2a]/30 shadow-sm">
                               <Lock size={8} style={{ stroke: 'url(#icon-gold-gradient)' }} />
                           </div>
                       )}
                   </div>
                   
                   <div className="flex-1 relative z-10 whitespace-nowrap overflow-hidden">
                       <span className={cn(
                          "text-sm tracking-wide transition-all duration-200",
                          !isActive && "font-medium",
                          isActive && "font-bold",
                          isHighlight && "text-gradient-gold font-bold" 
                       )}>
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
                   className="w-full h-auto min-h-[48px] flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 rounded-lg px-3 py-3 transition-all duration-200 group text-xs font-semibold shadow-md"
                >
                   <HeartHandshake 
                      size={18} 
                      className="shrink-0 drop-shadow-md" 
                      style={{ stroke: 'url(#icon-gold-gradient)' }} 
                   />
                   
                   <span className="text-left leading-tight w-full break-words whitespace-normal">
                      {t('exchange.cta.sidebar_btn')}
                   </span>

                </button>
            </div>
        )}

        <div className="p-4 border-t border-white/20 w-full bg-black/10 dark:bg-transparent">
           <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 hover:bg-red-500/20 hover:text-white transition-colors duration-200 font-medium"
           >
              <LogOut 
                 size={18} 
                 className="drop-shadow-md"
                 style={{ stroke: 'url(#icon-gold-gradient)' }}
              />
              <span className="text-sm">{t('navigation.logout')}</span>
           </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;