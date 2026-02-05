import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Trash2, Download, RefreshCw, Loader2, Leaf, Coins, Wallet, Ban, Award, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { investorProfiles } from '@/constants/investorProfiles';
import { useRealtimeProfileUpdate } from '@/hooks/useRealtimeProfileUpdate';
import { useTranslation } from 'react-i18next';

const UserManagement = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  useRealtimeProfileUpdate();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Pioneer Approval State
  const [approvingPioneer, setApprovingPioneer] = useState(null);
  const [isApprovePioneerOpen, setIsApprovePioneerOpen] = useState(false);
  const [approveProcessing, setApproveProcessing] = useState(false);
  
  // System Data
  const [availableTiers, setAvailableTiers] = useState([]);
  const [gamificationRules, setGamificationRules] = useState([]);

  // Iconos para perfiles
  const profileIcons = { lena: Leaf, markus: Shield, david: Users };
  const profileColors = {
    lena: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    markus: 'bg-blue-100 text-blue-800 border-blue-200',
    david: 'bg-orange-100 text-orange-800 border-orange-200',
    none: 'bg-slate-100 text-slate-500 border-slate-200'
  };

  const formatTierName = (slug) => {
      if (!slug) return 'Standard';
      return slug.replace(/explorer[-_]/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load Profiles
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profileError) throw profileError;

      const { data: tiers } = await supabase.from('support_levels').select('*').order('min_amount');
      const { data: benefits } = await supabase.from('user_benefits').select('*').eq('status', 'active').order('assigned_date', { ascending: false });
      
      // Load Metrics (Reference only)
      const { data: metrics } = await supabase.from('founding_pioneer_metrics').select('user_id, total_impact_credits_earned, founding_pioneer_access_status');
      
      let landDollars = [];
      try { const { data: ld } = await supabase.from('land_dollars').select('*'); landDollars = ld || []; } catch (e) {}

      let gameRules = [];
      try { const { data: gr } = await supabase.from('gamification_actions').select('*').eq('is_active', true); gameRules = gr || []; } catch (e) {}
      
      setAvailableTiers(tiers || []);
      setGamificationRules(gameRules);

      const mergedUsers = (profiles || []).map(user => {
        const userBenefit = benefits?.find(b => b.user_id === user.id);
        let tierInfo = null;
        if (userBenefit && userBenefit.new_support_level_id) {
             tierInfo = tiers?.find(t => t.id === userBenefit.new_support_level_id);
        }
        const metric = metrics?.find(m => m.user_id === user.id);
        const userLandDollar = landDollars?.find(l => l.user_id === user.id);

        return {
          ...user,
          tier_name: tierInfo ? formatTierName(tierInfo.slug) : 'Standard',
          tier_id: tierInfo ? tierInfo.id : 'none',
          benefit_row_id: userBenefit ? userBenefit.id : null,
          ic_balance: metric ? metric.total_impact_credits_earned : 0,
          founding_pioneer_access_status: metric ? metric.founding_pioneer_access_status : null,
          has_land_dollar: !!userLandDollar,
          land_dollar_id: userLandDollar?.id,
          land_dollar_status: userLandDollar?.status || 'none',
          land_dollar_amount: userLandDollar?.amount || 0
        };
      });

      setUsers(mergedUsers);
      setFilteredUsers(mergedUsers);

    } catch (err) {
      console.error("Data Load Error:", err);
      toast({ variant: "destructive", title: t('common.error'), description: "Could not load user data." });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchAllData();
    const channel = supabase.channel('admin_users_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollars' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'startnext_contributions' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_benefits' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData]);

  useEffect(() => {
    if (!Array.isArray(users)) return;
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = users.filter(user =>
      (user.name?.toLowerCase() || '').includes(lowerTerm) ||
      (user.email?.toLowerCase() || '').includes(lowerTerm) ||
      (user.role?.toLowerCase() || '').includes(lowerTerm) ||
      (user.genesis_profile?.toLowerCase() || '').includes(lowerTerm)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleEditClick = (user) => {
    setEditingUser({ 
        ...user, 
        selectedTier: user.tier_id || 'none',
        editLandDollarStatus: user.land_dollar_status === 'none' ? 'active' : user.land_dollar_status 
    }); 
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setProcessing(true);
    try {
      const { error: profileErr } = await supabase.from('profiles').update({ 
          name: editingUser.name, 
          role: editingUser.role,
          genesis_profile: editingUser.genesis_profile
        }).eq('id', editingUser.id);
      
      if (profileErr) throw new Error("Error updating profile: " + profileErr.message);

      if (editingUser.land_dollar_id && editingUser.editLandDollarStatus) {
          await supabase.from('land_dollars').update({ status: editingUser.editLandDollarStatus }).eq('id', editingUser.land_dollar_id);
      }

      if (editingUser.selectedTier) { 
          let tierData = null;
          let prettyTierName = 'Standard';
          let creditsToAward = 0;

          if (editingUser.selectedTier !== 'none') {
             tierData = availableTiers.find(t => t.id === editingUser.selectedTier);
             if (tierData) {
                 prettyTierName = `Explorer / ${formatTierName(tierData.slug)}`;
                 creditsToAward = Number(tierData.impact_credits_reward);
             }
          }

          if (tierData) { 
              let bonusPoints = 0;
              const { data: existingContrib } = await supabase.from('startnext_contributions')
                  .select('id, contribution_amount')
                  .eq('user_id', editingUser.id)
                  .order('contribution_date', { ascending: false }).limit(1).maybeSingle();
              
              let contributionId = existingContrib?.id;

              if (existingContrib) {
                  if (Number(tierData.min_amount) > Number(existingContrib.contribution_amount || 0)) {
                      const rule = gamificationRules.find(r => r.action_name === 'contribution_upgrade');
                      if (rule) bonusPoints = Number(rule.impact_credits_value || 0);
                  }
                  await supabase.from('startnext_contributions').update({
                      contribution_amount: tierData.min_amount, 
                      benefit_level: prettyTierName, 
                      new_support_level_id: editingUser.selectedTier
                  }).eq('id', existingContrib.id);
              } else {
                  const { data: newContrib } = await supabase.from('startnext_contributions').insert({
                      user_id: editingUser.id, 
                      contribution_amount: tierData.min_amount, 
                      contribution_date: new Date().toISOString(),
                      notes: 'Admin Allocation', 
                      benefit_assigned: true, 
                      benefit_level: prettyTierName, 
                      new_support_level_id: editingUser.selectedTier
                  }).select().single();
                  contributionId = newContrib.id;
              }

              const bPayload = { 
                  user_id: editingUser.id, 
                  new_support_level_id: editingUser.selectedTier, 
                  benefit_level_id: null, 
                  contribution_id: contributionId,
                  status: 'active', 
                  assigned_date: new Date().toISOString() 
              };
              
              if (editingUser.benefit_row_id) {
                  await supabase.from('user_benefits').update(bPayload).eq('id', editingUser.benefit_row_id);
              } else {
                  const { data: existingBen } = await supabase.from('user_benefits').select('id').eq('user_id', editingUser.id).limit(1).maybeSingle();
                  if (existingBen) await supabase.from('user_benefits').update(bPayload).eq('id', existingBen.id);
                  else await supabase.from('user_benefits').insert(bPayload);
              }

              // CRITICAL FIX: Update Income (metrics) AND Ledger (log)
              const totalAward = creditsToAward + bonusPoints;
              if (totalAward > 0) {
                 // 1. Log en Ledger (Historial)
                 await supabase.from('impact_credits').insert({ 
                    user_id: editingUser.id, 
                    amount: totalAward, 
                    source: 'tier_assignment', 
                    description: `Tier Update: ${prettyTierName} (Admin Set)`, 
                    issued_date: new Date().toISOString(),
                    related_support_level_id: editingUser.selectedTier
                 });

                 // 2. Sumar a Métricas (Ingresos Acumulados) - ¡ESTO ES LO QUE VE EL USUARIO!
                 const { data: currentMetric } = await supabase.from('founding_pioneer_metrics').select('total_impact_credits_earned').eq('user_id', editingUser.id).maybeSingle();
                 const currentTotal = currentMetric?.total_impact_credits_earned || 0;
                 
                 await supabase.from('founding_pioneer_metrics').upsert({
                     user_id: editingUser.id, 
                     total_impact_credits_earned: currentTotal + totalAward,
                     last_activity_date: new Date().toISOString()
                 }, { onConflict: 'user_id' });
              }

              const { data: existingLD } = await supabase.from('land_dollars').select('id').eq('user_id', editingUser.id).maybeSingle();
              const ldPayload = {
                  user_id: editingUser.id, 
                  amount: tierData.min_amount, 
                  status: editingUser.editLandDollarStatus || 'active',
                  link_ref: `REF-${editingUser.id.substring(0,6).toUpperCase()}`, 
                  related_support_level_id: editingUser.selectedTier
              };
              if (existingLD) await supabase.from('land_dollars').update(ldPayload).eq('id', existingLD.id);
              else if (tierData.land_dollars_reward > 0) await supabase.from('land_dollars').insert({ ...ldPayload, issued_date: new Date().toISOString() });
          }
      }

      toast({ title: t('common.success'), description: "User data updated successfully." });
      setIsEditOpen(false);
      await fetchAllData();
    } catch (error) {
      console.error("Save Error:", error);
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClick = (user) => { setDeletingUser(user); setIsDeleteOpen(true); };
  
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setProcessing(true);
    try {
        await supabase.from('gamification_history').delete().eq('user_id', deletingUser.id);
        await supabase.from('founding_pioneer_metrics').delete().eq('user_id', deletingUser.id);
        await supabase.from('impact_credits').delete().eq('user_id', deletingUser.id);
        await supabase.from('user_benefits').delete().eq('user_id', deletingUser.id);
        await supabase.from('land_dollars').delete().eq('user_id', deletingUser.id);
        await supabase.from('startnext_contributions').delete().eq('user_id', deletingUser.id);
        await supabase.from('user_quest_responses').delete().eq('user_id', deletingUser.id);
        const { error } = await supabase.from('profiles').delete().eq('id', deletingUser.id);
        if (error) throw error;
        toast({ title: "Deleted", description: "User and all related data deleted." });
        setIsDeleteOpen(false);
        fetchAllData();
    } catch (e) { 
        console.error("Delete error:", e);
        toast({ variant: "destructive", title: t('common.error'), description: "Failed to delete user." }); 
    }
    finally { setProcessing(false); setDeletingUser(null); }
  };

  const handleApprovePioneerClick = (user) => { setApprovingPioneer(user); setIsApprovePioneerOpen(true); };

  const confirmApprovePioneer = async () => {
    if (!approvingPioneer) return;
    setApproveProcessing(true);
    try {
      const { error: updateError } = await supabase.from('founding_pioneer_metrics').update({ founding_pioneer_access_status: 'approved' }).eq('user_id', approvingPioneer.id);
      if (updateError) throw updateError;
      toast({ title: "Pioneer Approved! 🚀", description: "User successfully approved.", className: "bg-emerald-600 border-emerald-200 text-white" });
      setIsApprovePioneerOpen(false);
      fetchAllData();
    } catch (error) {
      console.error("Approval Error:", error);
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    } finally {
      setApproveProcessing(false);
      setApprovingPioneer(null);
    }
  };

  const handleExportCSV = () => {
    if (!users.length) return;
    const csvContent = [['ID', 'Name', 'Email', 'Role', 'Genesis', 'Tier', 'IC', 'LandDollar'].join(",") + "\n" + users.map(u => [u.id, u.name, u.email, u.role, u.genesis_profile, u.tier_name, u.ic_balance, u.has_land_dollar ? 'Yes' : 'No'].join(",")).join("\n")];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(csvContent, { type: 'text/csv;charset=utf-8;' }));
    link.download = `users_export.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchAllData} variant="outline" size="icon" disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Button onClick={handleExportCSV} variant="outline" disabled={!users.length}><Download className="w-4 h-4 mr-2" /> {t('common.download')}</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">{t('admin.startnext.user')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Partner Profile</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Pioneer Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">{t('admin.startnext.tier')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground">{t('dashboard.impact_credits')}</th>
                <th className="text-center p-4 font-medium text-muted-foreground">{t('dashboard.land_dollar.title')}</th>
                <th className="text-right p-4 font-medium text-muted-foreground">{t('admin.startnext.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                 <tr><td colSpan="8" className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                filteredUsers.map((user) => {
                    const profileKey = user.genesis_profile ? user.genesis_profile.toLowerCase() : 'none';
                    const ProfileIcon = profileIcons[profileKey] || null;
                    const badgeClass = profileColors[profileKey] || profileColors.none;

                    return (
                      <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4"><div className="flex flex-col"><span className="font-semibold">{user.name || 'Unnamed'}</span><span className="text-xs text-muted-foreground">{user.email}</span></div></td>
                        <td className="p-4"><Badge variant="outline" className={`gap-1 pr-3 capitalize ${badgeClass}`}>{ProfileIcon && <ProfileIcon className="w-3 h-3" />}{user.genesis_profile || 'None'}</Badge></td>
                        <td className="p-4"><Badge variant="outline">{user.role}</Badge></td>
                        <td className="p-4">{user.founding_pioneer_access_status ? <Badge className={`${user.founding_pioneer_access_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} border-0 capitalize`}>{user.founding_pioneer_access_status}</Badge> : <span className="text-gray-300">-</span>}</td>
                        <td className="p-4"><div className="flex items-center gap-1"><Leaf className="w-3 h-3 text-emerald-500"/><span className="text-emerald-700 font-medium">{user.tier_name}</span></div></td>
                        <td className="p-4"><div className="flex items-center gap-1 font-mono"><Coins className="w-3 h-3 text-amber-500"/>{user.ic_balance}</div></td>
                        <td className="p-4 text-center">{user.has_land_dollar ? (<div className="flex flex-col items-center gap-1"><div className="flex items-center gap-1 font-bold text-emerald-800"><Wallet className="w-3 h-3"/> €{parseFloat(user.land_dollar_amount).toFixed(2)}</div><Badge variant={user.land_dollar_status === 'active' || user.land_dollar_status === 'issued' ? "default" : "destructive"} className={`text-[9px] h-4 ${user.land_dollar_status === 'active' || user.land_dollar_status === 'issued' ? 'bg-green-600' : 'bg-red-600'}`}>{user.land_dollar_status}</Badge></div>) : <span className="text-slate-300 text-xs italic">None</span>}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 items-center">
                            {user.role === 'startnext_user' && user.founding_pioneer_access_status === 'pending' && (
                              <Button onClick={() => handleApprovePioneerClick(user)} disabled={approveProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded text-sm mr-1" size="sm">
                                {approveProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3 mr-1" />} Approve
                              </Button>
                            )}
                            <Button onClick={() => handleEditClick(user)} variant="ghost" size="icon" className="h-8 w-8 text-blue-500"><Edit className="w-4 h-4" /></Button>
                            <Button onClick={() => handleDeleteClick(user)} variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit User & Financials</DialogTitle><DialogDescription>Modify user details and tiers.</DialogDescription></DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t('auth.name_label')}</Label><Input value={editingUser.name || ''} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>{t('auth.email_label')}</Label><Input disabled value={editingUser.email || ''} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={editingUser.role} onValueChange={(val) => setEditingUser({...editingUser, role: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="user">Common User</SelectItem><SelectItem value="startnext_user">Startnext User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label>{t('admin.investor_profile')}</Label>
                      <Select value={editingUser.genesis_profile || 'none'} onValueChange={(val) => setEditingUser({...editingUser, genesis_profile: val === 'none' ? null : val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem>{investorProfiles.map(p => <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
              </div>
              <div className="space-y-2 border-t pt-4 bg-slate-50 p-3 rounded-lg border">
                  <Label className="text-emerald-800 font-bold flex items-center gap-2">{editingUser.editLandDollarStatus === 'suspended' ? <Ban className="w-4 h-4 text-red-500"/> : <Wallet className="w-4 h-4"/>} Digital Asset Status</Label>
                  <Select value={editingUser.editLandDollarStatus || 'none'} onValueChange={(val) => setEditingUser({...editingUser, editLandDollarStatus: val})} disabled={!editingUser.land_dollar_id && editingUser.selectedTier === 'none'}>
                    <SelectTrigger className={editingUser.editLandDollarStatus === 'suspended' ? 'border-red-500 bg-red-50 text-red-700' : ''}><SelectValue placeholder="Asset Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="active">Active (Issued)</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
                  </Select>
              </div>
              <div className="space-y-2 border-t pt-4">
                  <Label className="text-emerald-600 font-bold flex items-center gap-2"><Leaf className="w-4 h-4"/> Explorer Tier (Level)</Label>
                  <Select value={editingUser.selectedTier || 'none'} onValueChange={(val) => setEditingUser({...editingUser, selectedTier: val})}>
                    <SelectTrigger><SelectValue placeholder="Select Tier" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">No Tier</SelectItem>{availableTiers.map(t => (<SelectItem key={t.id} value={t.id}>{formatTierName(t.slug)} (€{t.min_amount})</SelectItem>))}
                    </SelectContent>
                  </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>{t('common.cancel')}</Button><Button onClick={handleSaveEdit} disabled={processing}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent><DialogHeader><DialogTitle>Delete User?</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsDeleteOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" onClick={confirmDelete} disabled={processing}>Delete User</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isApprovePioneerOpen} onOpenChange={setIsApprovePioneerOpen}>
        <DialogContent><DialogHeader><DialogTitle>Approve Founding Pioneer</DialogTitle><DialogDescription>Grant 100 credits?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsApprovePioneerOpen(false)}>{t('common.cancel')}</Button><Button className="bg-emerald-600 text-white" onClick={confirmApprovePioneer} disabled={approveProcessing}>Approve</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;