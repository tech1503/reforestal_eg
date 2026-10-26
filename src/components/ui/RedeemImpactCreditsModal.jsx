import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Modal de canje de Créditos de Impacto.
// Flujo unificado: el usuario envía una solicitud de canje que un
// administrador revisará manualmente. El flujo de verificación de la
// campaña de crowdfunding se eliminó en la Fase 1 (SaaS limpio).

const RedeemImpactCreditsModal = ({ isOpen, onClose, currentBalance = 0 }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
    }
  }, [isOpen]);

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
        toast({ variant: "destructive", title: t('common.error'), description: t('exchange.redeem_modal.error_req', 'Failed to submit request.') });
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
                    {t('exchange.redeem_modal.success_req')}
                </p>
                <Button onClick={onClose} className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white">{t('common.close')}</Button>
            </motion.div>
          ) : (
            <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                      <Coins className="w-6 h-6 text-emerald-600" />
                      {t('exchange.redeem_modal.title')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('exchange.redeem_modal.description')}
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
                    <Button 
                        onClick={handleSubmitRequest} 
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {t('exchange.redeem_modal.btn_verify')}
                    </Button>
                </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default RedeemImpactCreditsModal;
