import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ className }) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = () => {
    // Orden de rotación de idiomas
    const languages = ['es', 'en', 'de', 'fr'];
    
    // Detectar idioma actual (tomamos solo las primeras 2 letras, ej: 'es-ES' -> 'es')
    // Si no detecta nada, asume 'es' por defecto
    const currentLang = i18n.language ? i18n.language.split('-')[0] : 'es';
    
    const currentIndex = languages.indexOf(currentLang);
    // Calcular el siguiente idioma en la lista
    // Si es el último, vuelve al primero (0)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % languages.length;
    
    i18n.changeLanguage(languages[nextIndex]);
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
        {i18n.language ? i18n.language.split('-')[0] : 'es'}
      </span>
    </Button>
  );
};

export default LanguageSwitcher;