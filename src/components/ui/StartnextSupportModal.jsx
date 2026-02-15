import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// 1. IMPORTAR useTranslation
import { useTranslation } from 'react-i18next';

const StartnextSupportModal = ({ isOpen, onClose, initialAmount }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  // 2. INICIALIZAR HOOK
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    city: '',
    country: '',
    message: ''
  });

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setFormData({ 
          amount: initialAmount || '', 
          city: '', 
          country: '', 
          message: '' 
      });
    }
  }, [isOpen, initialAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      // TRADUCCIÓN DE ERROR
      toast({ 
          variant: "destructive", 
          title: t('startnext_modal.errors.invalid_amount_title'), 
          description: t('startnext_modal.errors.invalid_amount_desc') 
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pending_startnext_registrations').insert({
        user_id: user.id,
        name: profile?.name || user.email,
        email: user.email,
        amount: parseFloat(formData.amount),
        city: formData.city,
        country: formData.country,
        message: formData.message,
        status: 'pending'
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('Submission error:', err);
      // TRADUCCIÓN DE ERROR
      toast({ 
          variant: "destructive", 
          title: t('common.error'), 
          description: t('startnext_modal.errors.submit_error') 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
        setSuccess(false);
        setFormData({ amount: '', city: '', country: '', message: '' });
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !loading && !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 flex flex-col items-center text-center"
            >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                    <CheckCircle className="w-8 h-8" />
                </div>
                {/* TRADUCCIÓN ÉXITO */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('startnext_modal.success.title')}</h2>
                <p className="text-gray-500 max-w-xs mb-6">
                    {t('startnext_modal.success.message')}
                </p>
                <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {t('startnext_modal.buttons.close')}
                </Button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                      <HeartHandshake className="w-6 h-6 text-emerald-600" />
                      {/* TRADUCCIÓN TÍTULO */}
                      {t('startnext_modal.title')}
                  </DialogTitle>
                  <DialogDescription>
                    {/* TRADUCCIÓN DESCRIPCIÓN */}
                    {t('startnext_modal.description')}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('startnext_modal.labels.name')}</Label>
                            <Input value={profile?.name || ''} disabled className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('startnext_modal.labels.email')}</Label>
                            <Input value={user?.email || ''} disabled className="bg-gray-50" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {t('startnext_modal.labels.amount')} <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                            type="number" step="0.01" min="0.01" placeholder="e.g. 50.00" 
                            value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            required
                            className="text-lg font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>{t('startnext_modal.labels.city')}</Label>
                             <Input 
                                value={formData.city} 
                                onChange={(e) => setFormData({...formData, city: e.target.value})} 
                                placeholder={t('startnext_modal.placeholders.city')} 
                             />
                        </div>
                        <div className="space-y-2">
                             <Label>{t('startnext_modal.labels.country')}</Label>
                             <Input 
                                value={formData.country} 
                                onChange={(e) => setFormData({...formData, country: e.target.value})} 
                                placeholder={t('startnext_modal.placeholders.country')} 
                             />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('startnext_modal.labels.message')}</Label>
                        <Textarea 
                            value={formData.message} 
                            onChange={(e) => setFormData({...formData, message: e.target.value})} 
                            placeholder={t('startnext_modal.placeholders.message')}
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            {t('startnext_modal.buttons.cancel')}
                        </Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                             {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} 
                             {t('startnext_modal.buttons.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default StartnextSupportModal;