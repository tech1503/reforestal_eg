import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext'; 

const LanguageSwitcher = ({ className }) => {
  
  const { currentLanguage, changeLanguage } = useI18n();

  const handleLanguageChange = () => {
    
    const languages = ['es', 'en', 'de', 'fr'];
    
    const currentLang = currentLanguage ? currentLanguage.split('-')[0] : 'es';
    
    const currentIndex = languages.indexOf(currentLang);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % languages.length;
    
    changeLanguage(languages[nextIndex]);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLanguageChange}
      className={`text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 ${className}`}
      title="Cambiar Idioma / Change Language"
    >
      <Globe className="h-5 w-5" />
      <span className="text-xs font-bold uppercase w-4">
        {currentLanguage ? currentLanguage.split('-')[0] : 'es'}
      </span>
    </Button>
  );
};

export default LanguageSwitcher;