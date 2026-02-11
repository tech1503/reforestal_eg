import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next'; 
// IMPORTAMOS LA LÓGICA DE CÁLCULO
import { getSupportLevelByAmount, calculateDynamicCredits } from '@/utils/tierLogicUtils';

const StartnextApprovals = () => {
  const { toast } = useToast();
  const { t } = useTranslation(); 
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');

  // CORRECCIÓN: useCallback para evitar warning de dependencia
  const fetchPendingRegistrations = useCallback(async () => {
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
  }, [t, toast]);

  useEffect(() => {
    fetchPendingRegistrations();
  }, [fetchPendingRegistrations]);

  const handleApprove = async (registration) => {
    const regId = registration.id;
    setProcessing(prev => ({ ...prev, [regId]: 'approving' }));

    try {
      // 1. Asignar Rol 'startnext_user' (Acceso al Dashboard y Land Dollar)
      const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'startnext_user').single();
      if (roleData) {
          await supabase.from('users_roles').upsert({ user_id: registration.user_id, role_id: roleData.id }, { onConflict: 'user_id,role_id' });
      }
      // Actualizamos el perfil para activar el dashboard Startnext
      await supabase
        .from('profiles')
        .update({ role: 'startnext_user' })
        .eq('id', registration.user_id);

      // 2. Calcular Tier basado en el monto
      const tierId = await getSupportLevelByAmount(registration.amount);
      
      // 3. Crear registro de contribución
      // NOTA: Esto dispara triggers en la DB que pueden crear créditos automáticos incorrectos
      const { data: contribution, error: contribError } = await supabase
        .from('startnext_contributions')
        .insert({
          user_id: registration.user_id,
          contribution_amount: registration.amount,
          contribution_date: new Date().toISOString(),
          new_support_level_id: tierId,
          benefit_assigned: true, 
          notes: `Approved from pending registration. Original message: ${registration.message || 'N/A'}`
        })
        .select()
        .single();

      if (contribError) throw contribError;

      if (tierId) {
          // Asignar beneficios visuales
          await supabase.from('user_benefits').upsert({
              user_id: registration.user_id,
              new_support_level_id: tierId,
              status: 'active',
              assigned_date: new Date().toISOString()
          }, { onConflict: 'user_id' });
      }

      // 4. LÓGICA DE BONOS CORREGIDA (Evita Duplicados)
      // Calculamos los bonos correctos (Monto * 200)
      const correctCredits = calculateDynamicCredits(registration.amount);

      // Buscamos si la base de datos ya creó créditos automáticamente para esta contribución
      const { data: existingCredits } = await supabase
          .from('impact_credits')
          .select('id, amount')
          .eq('contribution_id', contribution.id);

      if (existingCredits && existingCredits.length > 0) {
          // SI EXISTEN: Actualizamos el primero al valor correcto (x200)
          await supabase.from('impact_credits')
              .update({ 
                  amount: correctCredits, 
                  description: `Startnext Contribution (Verified x200)`
              })
              .eq('id', existingCredits[0].id);
          
          // Si por error hubo múltiples (duplicados previos), borramos los sobrantes
          if (existingCredits.length > 1) {
              const idsToDelete = existingCredits.slice(1).map(c => c.id);
              await supabase.from('impact_credits').delete().in('id', idsToDelete);
          }
      } else {
          // SI NO EXISTEN: Creamos el registro manualmente
          await supabase.from('impact_credits').insert({
            user_id: registration.user_id,
            amount: correctCredits,
            source: 'startnext_contribution',
            description: `Startnext contribution approved: €${registration.amount}`,
            related_support_level_id: tierId,
            contribution_id: contribution.id
          });
      }

      // 5. GESTIÓN DE PIONEROS (Evitar Aprobación Automática)
      // Buscamos el estado actual
      const { data: currentMetric } = await supabase
          .from('founding_pioneer_metrics')
          .select('founding_pioneer_access_status, total_impact_credits_earned')
          .eq('user_id', registration.user_id)
          .maybeSingle();

      // Recalculamos el total de créditos del usuario para mantener consistencia
      const { data: allUserCredits } = await supabase.from('impact_credits').select('amount').eq('user_id', registration.user_id);
      const totalScore = allUserCredits?.reduce((sum, c) => sum + Number(c.amount), 0) || correctCredits;

      // FORZAMOS ESTADO: Si ya era 'approved', se mantiene. Si no, se queda 'pending'.
      // Esto asegura que la aprobación de la contribución NO apruebe la sección Pionero automáticamente.
      const statusToSet = currentMetric?.founding_pioneer_access_status === 'approved' ? 'approved' : 'pending';

      await supabase.from('founding_pioneer_metrics').upsert({
          user_id: registration.user_id,
          total_impact_credits_earned: totalScore,
          founding_pioneer_access_status: statusToSet, // Mantiene el bloqueo si no estaba aprobado
          updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });


      // 6. Actualizar estado de la solicitud
      const { error: updateError } = await supabase
        .from('pending_startnext_registrations')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', regId);

      if (updateError) throw updateError;

      // 7. Notificación
      await supabase.rpc('create_notification', {
        p_user_id: registration.user_id,
        p_title: 'Welcome to Startnext Pioneers! 🌟',
        p_message: `Your contribution of €${registration.amount} has been approved. You received ${correctCredits} Bonus Points.`
      });

      toast({
        title: t('common.success'),
        description: `${registration.name} approved. BP: ${correctCredits}. Pioneer Status: ${statusToSet}.`,
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
