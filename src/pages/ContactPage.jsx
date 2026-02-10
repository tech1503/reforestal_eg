import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  MessageSquare, 
  Loader2, 
  Leaf,
  ArrowLeft
} from 'lucide-react';

// Importamos contextos y componentes UI existentes
import { useAuth } from '@/contexts/SupabaseAuthContext'; // Importante para saber si está registrado
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'; 

const ContactPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth(); // Obtenemos el usuario actual
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '', // Pre-llenamos si tiene perfil
    email: user?.email || '',  // Pre-llenamos si tiene usuario
    subject: '',
    message: ''
  });

  // Lógica inteligente para el botón de volver
  const handleBackNavigation = () => {
    if (user) {
        // Si hay usuario, verificamos su rol para enviarlo al dashboard correcto
        const role = profile?.role || 'user';
        if (role === 'admin') navigate('/admin');
        else if (role === 'startnext_user') navigate('/startnext');
        else navigate('/dashboard');
    } else {
        // Si NO hay usuario, vuelve al Home público
        navigate('/');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulación de envío (Aquí conectarías con tu backend/Supabase si guardas mensajes)
    setTimeout(() => {
      setLoading(false);
      toast({
        title: t('contact.success_title', "Message Sent!"),
        description: t('contact.success_desc', "We'll get back to you shortly."),
        className: "bg-emerald-600 text-white border-none"
      });
      // Solo limpiamos mensaje y asunto para mantener nombre/email si es usuario
      setFormData(prev => ({ ...prev, subject: '', message: '' }));
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500 selection:text-white pb-20">
      
      {/* --- HEADER DE NAVEGACIÓN --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16">
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          
          {/* Botón Inteligente Volver */}
          <Button 
            variant="ghost" 
            onClick={handleBackNavigation}
            className="flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {user ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
            <span className="hidden sm:inline font-medium">
                {user ? t('common.back', 'Back to Dashboard') : t('navigation.home', 'Home')}
            </span>
          </Button>

          {/* Logo Central */}
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
            <Leaf className="w-6 h-6" />
            <span className="hidden md:inline">Reforestal eG</span>
          </div>

          {/* Selector de Idioma */}
          <div className="flex items-center gap-2">
             <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="container mx-auto px-4 pt-32">
        
        {/* Título Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
            {t('contact.title', 'Get in Touch')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('contact.subtitle', 'Have questions about your impact, investment, or our mission? We are here to help.')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* COLUMNA IZQUIERDA: Información */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            <Card className="bg-card border-border shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Leaf className="w-24 h-24 text-emerald-500" />
              </div>
              <CardContent className="p-6 space-y-8 relative z-10">
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{t('contact.address_label', 'Headquarters')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Musterstraße 123<br />
                      10115 Berlin, Germany
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{t('contact.email_label', 'Email Us')}</h3>
                    <a href="mailto:support@reforestal.eg" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      support@reforestal.eg
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{t('contact.phone_label', 'Call Us')}</h3>
                    <p className="text-sm text-muted-foreground">
                      +49 30 12345678
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t('contact.faq_title', 'Need quick answers?')}
                </h3>
                <p className="text-emerald-100 text-sm mb-4">
                  Check our Help Center for immediate answers to common questions about Land Dollars and Impact Credits.
                </p>
                <Button variant="secondary" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 border-none font-bold">
                  {t('contact.visit_faq', 'Visit Help Center')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* COLUMNA DERECHA: Formulario */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-card border-border shadow-xl h-full">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground ml-1">
                        {t('contact.form_name', 'Your Name')} <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe" 
                        required 
                        className="bg-background"
                        // Si es usuario logueado, podríamos deshabilitarlo o dejarlo editable
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground ml-1">
                        {t('contact.form_email', 'Email Address')} <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com" 
                        required 
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground ml-1">
                      {t('contact.form_subject', 'Subject')}
                    </label>
                    <Input 
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Investment Inquiry" 
                      required 
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground ml-1">
                      {t('contact.form_message', 'Message')} <span className="text-red-500">*</span>
                    </label>
                    <Textarea 
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="How can we help you today?" 
                      className="min-h-[150px] bg-background resize-none"
                      required
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full md:w-auto px-8 h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-emerald-500/20"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Send className="w-5 h-5 mr-2" />
                      )}
                      {loading ? t('contact.sending', 'Sending...') : t('contact.send_btn', 'Send Message')}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default ContactPage;