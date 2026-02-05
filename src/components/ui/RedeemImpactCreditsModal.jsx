import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next'; // IMPORTADO

// Import the Startnext specific modal logic if needed, or recreate the fields here for the "Yes" path
// Since the requirement is to use the "same form" for "Yes", we will render those fields dynamically.

const RedeemImpactCreditsModal = ({ isOpen, onClose, currentBalance = 0 }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(); // HOOK
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState('selection'); // 'selection', 'startnext_form', 'request_form'
  
  // Selection State
  const [isStartnextSupporter, setIsStartnextSupporter] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    amount: '',
    city: '',
    country: '',
    message: ''
  });

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setStep('selection');
      setIsStartnextSupporter(null);
      setFormData({ amount: '', city: '', country: '', message: '' });
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (isStartnextSupporter === 'yes') {
      setStep('startnext_form');
    } else if (isStartnextSupporter === 'no') {
      handleSubmitRequest(); // Submit immediately or show confirmation step? Prompt implies submitting data.
    }
  };

  // Logic for "No" - Non-contributor request
  const handleSubmitRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const { error } = await supabase.from('impact_credits_requests').insert({
            user_id: user.id,
            name: profile?.name || user.email,
            email: user.email,
            impact_credits_balance: currentBalance,
            status: 'pending'
        });

        if (error) throw error;
        setSuccess(true);
    } catch (err) {
        console.error("Request Error:", err);
        toast({ variant: "destructive", title: t('common.error'), description: "Failed to submit request." });
    } finally {
        setLoading(false);
    }
  };

  // Logic for "Yes" - Startnext Registration (Same as Option 1)
  const handleSubmitStartnext = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast({ variant: "destructive", title: t('common.error'), description: "Please enter a valid amount." });
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
        toast({ variant: "destructive", title: t('common.error'), description: "Could not submit registration." });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && onClose()}>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('exchange.redeem_modal.success_title')}</h2>
                <p className="text-gray-500 max-w-xs">
                    {step === 'startnext_form' 
                        ? t('exchange.redeem_modal.success_snx')
                        : t('exchange.redeem_modal.success_req')}
                </p>
                <Button onClick={onClose} className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white">{t('common.close')}</Button>
            </motion.div>
          ) : step === 'selection' ? (
            <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                      <Coins className="w-6 h-6 text-emerald-600" />
                      {t('exchange.redeem_modal.title')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('exchange.redeem_modal.description')}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="space-y-3">
                        <Label className="text-base font-medium">{t('exchange.redeem_modal.question')}</Label>
                        <RadioGroup value={isStartnextSupporter} onValueChange={setIsStartnextSupporter}>
                            <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                                <RadioGroupItem value="yes" id="r1" />
                                <Label htmlFor="r1" className="cursor-pointer flex-grow">{t('exchange.redeem_modal.option_yes')}</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                                <RadioGroupItem value="no" id="r2" />
                                <Label htmlFor="r2" className="cursor-pointer flex-grow">{t('exchange.redeem_modal.option_no')}</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button 
                        onClick={handleContinue} 
                        disabled={!isStartnextSupporter}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {t('common.next')}
                    </Button>
                </DialogFooter>
            </motion.div>
          ) : step === 'startnext_form' ? (
             <motion.div key="startnext_form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle>{t('exchange.redeem_modal.form_title')}</DialogTitle>
                  <DialogDescription>{t('exchange.redeem_modal.form_desc')}</DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmitStartnext} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('auth.name_label')}</Label>
                        <Input value={profile?.name || ''} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('auth.email_label')}</Label>
                        <Input value={user?.email || ''} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('exchange.redeem_modal.label_amount')} <span className="text-red-500">*</span></Label>
                        <Input 
                            type="number" step="0.01" min="0.01" placeholder="e.g. 50.00" 
                            value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>{t('exchange.redeem_modal.label_city')}</Label>
                             <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                             <Label>{t('exchange.redeem_modal.label_country')}</Label>
                             <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setStep('selection')} disabled={loading}>{t('common.back')}</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                             {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {t('exchange.redeem_modal.btn_verify')}
                        </Button>
                    </DialogFooter>
                </form>
             </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default RedeemImpactCreditsModal;
