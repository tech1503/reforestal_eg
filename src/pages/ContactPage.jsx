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
  ArrowLeft,
  BellRing
} from 'lucide-react';

import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'; 
import { supabase } from '@/lib/customSupabaseClient'; 

const ContactPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth(); 
  
  const [loading, setLoading] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);

  const [quickContactInfo, setQuickContactInfo] = useState('');

  const [formData, setFormData] = useState({
    name: profile?.name || '', 
    email: user?.email || '',  
    subject: '',
    message: ''
  });

  const handleBackNavigation = () => {
    if (user) {
        const role = profile?.role || 'user';
        if (role === 'admin') navigate('/admin');
        else if (role === 'startnext_user') navigate('/startnext');
        else navigate('/dashboard');
    } else {
        navigate('/');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickHelpAlert = async () => {
    if (!quickContactInfo.trim() && !user?.email) {
      toast({ 
        variant: "destructive", 
        title: t('common.error', 'Error'), 
        description: "Por favor ingresa un email o teléfono de contacto." 
      });
      return;
    }

    setHelpLoading(true);
    try {
      const lang = i18n.language ? i18n.language.split('-')[0].toUpperCase() : 'ES';
      const contactMethod = quickContactInfo.trim() || formData.email || 'No especificado';
      const userName = formData.name || 'Visitante';

      const { error } = await supabase.from('notifications').insert({
        user_id: user?.id || null,
        title: `[${lang}] ¡Asistencia Rápida Requerida!`,
        message: `Usuario: ${userName}\nContacto: ${contactMethod}\nIdioma: ${lang}\nSolicita asistencia rápida desde la página de contacto.`,
        notification_type: 'admin_alert', 
        is_read: false,

        metadata: {
          name: userName,
          email: contactMethod,
          subject: 'Asistencia Rápida Reforestal eG - Página de Contacto',
          raw_message: 'El usuario ha solicitado asistencia rápida mediante el botón de alerta.',
          language: lang,
          source: 'quick_alert'
        }
      });

      if (error) throw error;

      toast({
        title: t('contact.success_title', "Alert Sent!"),
        description: "An admin has been notified and will assist you.",
        className: "bg-primary text-primary-foreground border-none shadow-lg"
      });
      
      setQuickContactInfo(''); 

    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to send alert." });
    } finally {
      setHelpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const lang = i18n.language ? i18n.language.split('-')[0].toUpperCase() : 'ES';
      const userName = formData.name || 'Visitante';

      const { error } = await supabase.from('notifications').insert({
        user_id: user?.id || null,
        notification_type: 'admin_alert', 
        title: `[${lang}] Nuevo mensaje de Formulario de contacto de: ${userName}`,
        message: `Email: ${formData.email}\nAsunto: ${formData.subject}\nMensaje: ${formData.message}\nIdioma: ${lang}`,
        is_read: false,

        metadata: {
          name: userName,
          email: formData.email,
          subject: formData.subject,
          raw_message: formData.message,
          language: lang,
          source: 'contact_form'
        }
      });

      if (error) throw error;

      toast({
        title: t('contact.success_title', "Message Sent!"),
        description: t('contact.success_desc', "We'll get back to you shortly."),
        className: "bg-primary text-primary-foreground border-none shadow-lg"
      });
      
      setFormData(prev => ({ ...prev, subject: '', message: '' }));

    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        variant: "destructive",
        title: t('common.error', "Error"),
        description: "There was a problem sending your message. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20">
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16">
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          
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

          <div className="flex items-center gap-2 text-primary font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
            <Leaf className="w-6 h-6" />
            <span className="hidden md:inline">Reforestal eG</span>
          </div>

          <div className="flex items-center gap-2">
             <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-32">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground drop-shadow-sm">
            {t('contact.title', 'Get in Touch')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('contact.subtitle', 'Have questions about your impact, investment, or our mission? We are here to help.')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            <Card className="bg-card border-border shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Leaf className="w-24 h-24 text-primary" />
              </div>
              <CardContent className="p-6 space-y-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary"><MapPin className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{t('contact.address_label', 'Headquarters')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Musterstraße 123<br />10115 Berlin, Germany</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary"><Mail className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{t('contact.email_label', 'Email Us')}</h3>
                    <a href="mailto:support@reforest.al" className="text-sm text-muted-foreground hover:text-primary transition-colors">support@reforest.al</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary"><Phone className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{t('contact.phone_label', 'Call Us')}</h3>
                    <p className="text-sm text-muted-foreground">+49</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground border-none shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t('contact.faq_title', 'Need quick answers?')}
                </h3>
                <p className="text-primary-foreground/80 text-sm mb-4">
                  {t('contact.faq_description', 'Check our Help Center for immediate answers to common questions about Land Dollars and Bonus Points.')}
                </p>
                
                <div className="space-y-3">
                  <Input 
                    type="text"
                    placeholder="Email or Phone number..." 
                    value={quickContactInfo}
                    onChange={(e) => setQuickContactInfo(e.target.value)}
                    className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/50 h-11"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleQuickHelpAlert}
                    disabled={helpLoading}
                    className="w-full bg-white text-primary hover:bg-slate-100 border-none font-bold shadow-sm"
                  >
                    {helpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BellRing className="w-4 h-4 mr-2" />}
                    {t('contact.visit_faq', 'Alert Support Team')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-card border-border shadow-md h-full">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground ml-1">
                        {t('contact.form_name', 'Your Name')} <span className="text-destructive">*</span>
                      </label>
                      <Input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required className="bg-background focus-visible:ring-primary" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground ml-1">
                        {t('contact.form_email', 'Email Address')} <span className="text-destructive">*</span>
                      </label>
                      <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required className="bg-background focus-visible:ring-primary" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground ml-1">{t('contact.form_subject', 'Subject')}</label>
                    <Input name="subject" value={formData.subject} onChange={handleChange} placeholder={t('contact.subjectPlaceholder', 'Important Topic')} required className="bg-background focus-visible:ring-primary" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground ml-1">
                      {t('contact.form_message', 'Message')} <span className="text-destructive">*</span>
                    </label>
                    <Textarea name="message" value={formData.message} onChange={handleChange} placeholder={t('contact.messagePlaceholder', 'Your message here...')} className="min-h-[150px] bg-background resize-none focus-visible:ring-primary" required />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto px-8 h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform active:scale-95 border-none">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
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