import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
// ELIMINAMOS LA IMPORTACIÓN QUE YA NO USAREMOS
// import { emitImpactCredits } from '@/services/impactCreditService'; 
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next'; 

const StartnextApprovals = () => {
  const { toast } = useToast();
  const { t } = useTranslation(); 
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_startnext_registrations')
        .select(`
          *,
          profiles:user_id(name, email, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration) => {
    const regId = registration.id;
    setProcessing(prev => ({ ...prev, [regId]: 'approving' }));

    try {
      // 1. Determine support level based on amount
      const { data: tier, error: tierError } = await supabase.rpc(
        'calculate_tier_by_amount',
        { p_amount: registration.amount }
      );

      if (tierError) throw tierError;
      if (!tier) throw new Error('No matching tier found for amount');

      // 2. Create contribution record
      // ESTA INSERCIÓN DISPARA EL TRIGGER 'auto_assign_benefits' EN LA BASE DE DATOS
      // EL TRIGGER SE ENCARGARÁ DE DAR LOS CRÉDITOS.
      const { data: contribution, error: contribError } = await supabase
        .from('startnext_contributions')
        .insert({
          user_id: registration.user_id,
          contribution_amount: registration.amount,
          contribution_date: new Date().toISOString(),
          new_support_level_id: tier,
          benefit_assigned: false, // El trigger lo pondrá en true
          notes: `Approved from pending registration. Original message: ${registration.message || 'N/A'}`
        })
        .select()
        .single();

      if (contribError) throw contribError;

      // 3. Assign tier and benefits (triggers auto-creation of land dollars via RPC logic if configured)
      const { error: tierAssignError } = await supabase.rpc(
        'assign_tier_to_contribution',
        { 
          p_contribution_id: contribution.id,
          p_support_level_id: tier 
        }
      );

      if (tierAssignError) throw tierAssignError;

      // --- CORRECCIÓN: ELIMINADO EL PASO 4 (EMISIÓN MANUAL) ---
      // La base de datos ya está emitiendo los créditos a través del trigger en el paso 2.
      // Si dejamos esto, se duplican los puntos.
      
      /*
      const tierData = await supabase
        .from('support_levels')
        .select('impact_credits_reward')
        .eq('id', tier)
        .single();

      if (tierData.data?.impact_credits_reward) {
        await emitImpactCredits({
          user_id: registration.user_id,
          amount: tierData.data.impact_credits_reward,
          source: 'startnext_contribution',
          description: `Startnext contribution approved: €${registration.amount}`,
          related_support_level_id: tier
        });
      }
      */
      // ---------------------------------------------------------

      // 5. Update profile role to startnext_user
      await supabase
        .from('profiles')
        .update({ role: 'startnext_user' })
        .eq('id', registration.user_id);

      // 6. Update registration status
      const { error: updateError } = await supabase
        .from('pending_startnext_registrations')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', regId);

      if (updateError) throw updateError;

      // 7. Send notification
      await supabase.rpc('create_notification', {
        p_user_id: registration.user_id,
        p_title: 'Welcome to Startnext Pioneers! 🌟',
        p_message: `Your contribution of €${registration.amount} has been approved. Your Land Dollar and Impact Credits are now available.`
      });

      toast({
        title: t('common.success'),
        description: `${registration.name} has been approved and upgraded to Startnext Pioneer`,
        className: 'bg-green-50 border-green-200'
      });

      fetchPendingRegistrations();

    } catch (err) {
      console.error('Approval error:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.message
      });
    } finally {
      setProcessing(prev => ({ ...prev, [regId]: null }));
    }
  };

  const handleReject = async (registration) => {
    const regId = registration.id;
    setProcessing(prev => ({ ...prev, [regId]: 'rejecting' }));

    try {
      const { error } = await supabase
        .from('pending_startnext_registrations')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', regId);

      if (error) throw error;

      await supabase.rpc('create_notification', {
        p_user_id: registration.user_id,
        p_title: 'Registration Update',
        p_message: 'Your Startnext registration requires additional verification. Our team will contact you shortly.'
      });

      toast({
        title: 'Registration Rejected',
        description: 'User has been notified',
        className: 'bg-slate-50'
      });

      fetchPendingRegistrations();

    } catch (err) {
      console.error('Rejection error:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.message
      });
    } finally {
      setProcessing(prev => ({ ...prev, [regId]: null }));
    }
  };

  // Filtering logic
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = searchTerm === '' || 
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    
    const matchesAmount = minAmount === '' || parseFloat(reg.amount) >= parseFloat(minAmount);

    return matchesSearch && matchesStatus && matchesAmount;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('admin.startnext.pending_approvals')}</span>
            <Badge variant="outline" className="ml-2">
              {filteredRegistrations.filter(r => r.status === 'pending').length} {t('admin.startnext.pending')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">{t('admin.startnext.pending')}</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Min amount (€)"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left font-medium text-slate-500">{t('admin.startnext.user')}</th>
                  <th className="p-3 text-left font-medium text-slate-500">{t('admin.startnext.amount')}</th>
                  <th className="p-3 text-left font-medium text-slate-500">Location</th>
                  <th className="p-3 text-left font-medium text-slate-500">{t('admin.startnext.status')}</th>
                  <th className="p-3 text-left font-medium text-slate-500">Submitted</th>
                  <th className="p-3 text-right font-medium text-slate-500">{t('admin.startnext.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-medium">{reg.name}</div>
                        <div className="text-xs text-slate-400">{reg.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-600">€{reg.amount}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {reg.city && reg.country ? `${reg.city}, ${reg.country}` : 'N/A'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            reg.status === 'pending' ? 'default' :
                            reg.status === 'approved' ? 'outline' : 'destructive'
                          }
                          className={
                            reg.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            reg.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }
                        >
                          {reg.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-400 font-mono">
                        {new Date(reg.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {reg.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(reg)}
                                disabled={processing[reg.id]}
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              >
                                {processing[reg.id] === 'approving' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t('admin.startnext.approve')}
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(reg)}
                                disabled={processing[reg.id]}
                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              >
                                {processing[reg.id] === 'rejecting' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {t('admin.startnext.reject')}
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StartnextApprovals;
