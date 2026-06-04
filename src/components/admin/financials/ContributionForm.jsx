import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import TierBenefitsPreview from './TierBenefitsPreview';
import { generateLandDollarWithQR } from '@/utils/landDollarQRRenderer';

const ContributionForm = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [userMode, setUserMode] = useState('manual');
  const [users, setUsers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [manualUser, setManualUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
  });
  
  const [formData, setFormData] = useState({
    user_id: '', 
    contribution_amount: '',
    contribution_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const { data: profiles } = await supabase.from('profiles').select('id, name, email');
        setUsers(profiles || []);

        const { data: levels } = await supabase
            .from('support_levels')
            .select(`
                *,
                support_level_translations(language_code, name, description),
                support_benefits(id, icon_name, benefit_type, support_benefit_translations(language_code, description))
            `)
            .eq('is_active', true)
            .order('min_amount', { ascending: true });
            
        setTiers(levels || []);
      } catch (err) {
        console.error("Failed to load form data:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const selectedTier = useMemo(() => {
    const amount = parseFloat(formData.contribution_amount);
    if (!amount || isNaN(amount) || amount < 5) return null;
    
    const eligibleTiers = tiers.filter(t => amount >= t.min_amount);
    return eligibleTiers.length > 0 ? eligibleTiers[eligibleTiers.length - 1] : null;
  }, [formData.contribution_amount, tiers]);

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      if (!selectedTier) throw new Error("Amount too low (Min €5.00)");
      
      let finalUserId = formData.user_id || null;

      if (userMode === 'manual') {
        if (!manualUser.email || !manualUser.full_name) throw new Error("Name and Email required.");

        const { data: userData, error: userError } = await supabase.functions.invoke('admin-user-ops', {
            body: {
                action: 'createUser',
                payload: {
                    email: manualUser.email,
                    name: manualUser.full_name,
                    role: 'startnext_user',
                    city: manualUser.city,
                    country: manualUser.country
                }
            }
        });

        if (userError || userData?.error) throw new Error(userError?.message || userData?.error || 'Failed to create user account');
        finalUserId = userData.user.id;
      } else {
         if (!formData.user_id) throw new Error("Select a user.");
         finalUserId = formData.user_id;
      }

      const { data, error } = await supabase.rpc('admin_process_startnext_contribution', {
          p_user_id: finalUserId,
          p_amount: parseFloat(formData.contribution_amount),
          p_notes: formData.notes,
          p_city: manualUser.city,
          p_country: manualUser.country,
          p_phone: manualUser.phone
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      try {
          const blob = await generateLandDollarWithQR(data.link_ref);
          const fileName = `land-dollars/${finalUserId}/${data.link_ref}.png`;
          const { error: upError } = await supabase.storage.from('land-dollars').upload(fileName, blob, { upsert: true, contentType: 'image/png' });
          
          if (!upError) {
              const { data: publicUrlData } = supabase.storage.from('land-dollars').getPublicUrl(fileName);
              
              await supabase.from('land_dollars').update({ 
                  land_dollar_url: publicUrlData.publicUrl,
                  qr_code_url: `https://reforest.al/${data.link_ref}`
              }).eq('contribution_id', data.contribution_id);
          }
      } catch (e) {
          console.warn("Asset generation warning:", e);
      }

      toast({ title: "Success", description: "Contribution recorded securely." });
      onSuccess?.();

    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-violet-600"/></div>;

  return (
    <div className="space-y-6">
       <Tabs value={userMode} onValueChange={setUserMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="manual">New Supporter</TabsTrigger>
              <TabsTrigger value="existing">Existing User</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name *</Label><Input value={manualUser.full_name} onChange={e => setManualUser({...manualUser, full_name: e.target.value})}/></div>
                  <div className="space-y-2"><Label>Email *</Label><Input value={manualUser.email} onChange={e => setManualUser({...manualUser, email: e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-2"><Label>Phone</Label><Input value={manualUser.phone} onChange={e => setManualUser({...manualUser, phone: e.target.value})}/></div>
                   <div className="space-y-2"><Label>City</Label><Input value={manualUser.city} onChange={e => setManualUser({...manualUser, city: e.target.value})}/></div>
                   <div className="space-y-2"><Label>Country</Label><Input value={manualUser.country} onChange={e => setManualUser({...manualUser, country: e.target.value})}/></div>
                </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <select className="w-full p-2 rounded-md border text-sm bg-white" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})}>
                    <option value="">Select user...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
            </TabsContent>
       </Tabs>

       <div className="pt-4 space-y-4 border-t">
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Contribution Amount (€)</Label>
                  <div className="relative">
                      <Input type="number" min="5" step="0.01" value={formData.contribution_amount} onChange={e => setFormData({...formData, contribution_amount: e.target.value})} className="pl-8 font-bold text-lg" placeholder="0.00"/>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.contribution_date} onChange={e => setFormData({...formData, contribution_date: e.target.value})} />
              </div>
          </div>

          <TierBenefitsPreview tier={selectedTier} amount={parseFloat(formData.contribution_amount)} />

          <div className="space-y-2">
               <Label>Internal Notes</Label>
               <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Reference ID, payment method, etc." />
          </div>
       </div>

       <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isProcessing || !selectedTier} className="bg-emerald-600 hover:bg-emerald-700 text-white">
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
             Process Contribution
          </Button>
       </div>
    </div>
  );
};

export default ContributionForm;