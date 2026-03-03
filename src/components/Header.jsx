import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, LogOut } from 'lucide-react'; 
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserNotificationCenter from '@/components/ui/UserNotificationCenter';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher'; 

const Header = ({ activeSection, toggleSidebar, isSidebarOpen }) => {
  const { t } = useTranslation();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getTitle = () => {
    if (activeSection === 'dashboard') return t('navigation.dashboard');
    if (activeSection === 'founding_members') return t('navigation.founding_pioneer');
    if (activeSection === 'referral') return t('navigation.referral');
    if (activeSection === 'exchange') return t('navigation.exchange');
    if (activeSection === 'quests') return t('navigation.quests');
    return t('dashboard.title');
  };

  return (
    <header className="bg-white/80 dark:bg-[#063127]/30 backdrop-blur-xl text-foreground h-16 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-30 transition-normal border-b border-border dark:border-white/5">

      <div className="flex items-center gap-4 pl-10 md:pl-0"> 
        <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#063127] dark:text-white truncate">
                {getTitle()}
            </h1>
            <p className="text-xs text-[#5b8370] dark:text-[#c4d1c0]/80 hidden md:block font-medium">
                {t('dashboard.greeting', { name: profile?.full_name || 'User' })}
            </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3">
        
        <div className="hover:scale-105 transition-fast">
          <UserNotificationCenter />
        </div>

        {/* --- NUEVO: Language Switcher --- */}
        <LanguageSwitcher />

        {/* --- NUEVO: Theme Switcher --- */}
        <ThemeSwitcher className="w-9 h-9 rounded-md" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 border border-[#5b8370]/30 bg-[#5b8370]/10 hover:bg-[#5b8370]/20 text-[#063127] dark:text-[#c4d1c0] transition-all">
              {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="User" className="w-full h-full rounded-full object-cover" />
              ) : (
                  <User className="w-5 h-5 text-[#5b8370]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-xl shadow-lg p-1">
            <DropdownMenuLabel className="font-normal px-2 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-[#063127] dark:text-white">{profile?.full_name || profile?.name || 'User'}</p>
                <p className="text-xs leading-none text-[#5b8370] dark:text-[#c4d1c0]/80 mt-1">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer rounded-md font-medium">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('navigation.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;