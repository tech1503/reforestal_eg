import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle, XCircle, Shield, Coins, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const FoundingPioneerMetricsModal = ({ pioneer, onClose }) => {
  const { toast } = useToast();
  const { t } = useTranslation(); // HOOK
  const [loading, setLoading] = useState(false);

  const handleAction = async (actionType) => {
      setLoading(true);
      try {
          if (actionType === 'approve') {
              // 1. Update role
              const { error: roleError } = await supabase
                  .from('profiles')
                  .update({ role: 'startnext_user' }) 
                  .eq('id', pioneer.id);
              if (roleError) throw roleError;

              // 2. Issue Welcome Credits
              const { error: creditError } = await supabase
                  .from('impact_credits')
                  .insert({
                      user_id: pioneer.id,
                      amount: 100,
                      source: 'admin_bonus',
                      description: 'Founding Pioneer Approval Bonus'
                  });
               if (creditError) throw creditError;

               // 3. Update Metrics Status
               await supabase.from('founding_pioneer_metrics').upsert({
                   user_id: pioneer.id,
                   founding_pioneer_access_status: 'approved',
                   founding_pioneer_access_date: new Date().toISOString()
               });

               toast({ title: t('common.success'), description: `${pioneer.full_name} is now a Founding Pioneer.` });

          } else if (actionType === 'reject' || actionType === 'revoke') {
              // Revert Role
              await supabase.from('profiles').update({ role: 'user' }).eq('id', pioneer.id);
              
              // Update Metrics
              await supabase.from('founding_pioneer_metrics').upsert({
                   user_id: pioneer.id,
                   founding_pioneer_access_status: actionType === 'revoke' ? 'revoked' : 'rejected',
                   founding_pioneer_revoke_date: new Date().toISOString()
               });

               toast({ 
                   title: actionType === 'revoke' ? "Revoked" : t('admin.startnext.reject'), 
                   description: `Access removed for ${pioneer.full_name}.` 
               });
          }
          
          onClose();
      } catch (err) {
          console.error(err);
          toast({ variant: "destructive", title: t('common.error'), description: err.message });
      } finally {
          setLoading(false);
      }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600"/> 
              Evaluate {pioneer.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Role:</span>
                    <Badge variant="outline">{pioneer.role}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Contributions:</span>
                    <span className="font-medium">{pioneer.contribution_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Value:</span>
                    <span className="font-medium text-emerald-600">€{pioneer.total_contribution}</span>
                </div>
            </div>

            <div className="flex gap-2 p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
                <Coins className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                    Approving this user will grant them the <strong>{t('navigation.founding_pioneer')}</strong> status and issue <strong>100 {t('dashboard.impact_credits')}</strong> automatically.
                </p>
            </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
                onClick={() => handleAction('approve')} 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
                {t('admin.startnext.approve')} & Issue Credits
            </Button>
            
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button 
                    variant="outline" 
                    onClick={() => handleAction('reject')} 
                    disabled={loading}
                    className="border-red-200 text-red-700 hover:bg-red-50"
                >
                    <XCircle className="w-4 h-4 mr-2"/> {t('admin.startnext.reject')}
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={() => handleAction('revoke')} 
                    disabled={loading}
                    className="text-slate-500"
                >
                    <AlertTriangle className="w-4 h-4 mr-2"/> Revoke Access
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FoundingPioneerMetricsModal;
