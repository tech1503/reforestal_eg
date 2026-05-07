import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Trash2, Download, RefreshCw, Loader2, Leaf, Coins, Wallet, Ban, Users, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { investorProfiles } from '@/constants/investorProfiles';
import { useRealtimeProfileUpdate } from '@/hooks/useRealtimeProfileUpdate';
import { useTranslation } from 'react-i18next';
import { deleteUserCascade } from '@/services/userService';

const UserManagement = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  useRealtimeProfileUpdate();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingUser, setEditingUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [availableTiers, setAvailableTiers] = useState([]);

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
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profileError) throw profileError;

      const { data: tiers } = await supabase.from('support_levels').select('*').order('min_amount');
      const { data: benefits } = await supabase.from('user_benefits').select('*').eq('status', 'active').order('assigned_date', { ascending: false });
      const { data: metrics } = await supabase.from('founding_pioneer_metrics').select('user_id, total_impact_credits_earned, founding_pioneer_access_status');
      
      let landDollars = [];
      try { const { data: ld } = await supabase.from('land_dollars').select('*'); landDollars = ld || []; } catch (e) {}

      setAvailableTiers(tiers || []);

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
          ic_balance: metric ? metric.total_impact_credits_earned : 0,
          founding_pioneer_access_status: metric ? metric.founding_pioneer_access_status : 'pending',
          has_land_dollar: !!userLandDollar,
          land_dollar_id: userLandDollar?.id,
          land_dollar_status: userLandDollar?.status || 'none',
          land_dollar_link: userLandDollar?.link_ref || 'N/A',
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
      (user.referral_code?.toLowerCase() || '').includes(lowerTerm)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleInlinePioneerStatusChange = async (userObj, newStatus) => {
      setProcessing(true);
      try {
          const { error } = await supabase.from('founding_pioneer_metrics').upsert({
              user_id: userObj.id,
              founding_pioneer_access_status: newStatus,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
          
          if (error) throw error;
          
          if (newStatus === 'approved') {
              await supabase.from('profiles').update({ role: 'startnext_user' }).eq('id', userObj.id);
          }
          
          toast({ 
              title: "Status Updated", 
              description: `${userObj.name || 'User'} is now ${newStatus}.`, 
              className: newStatus === 'approved' ? "bg-emerald-600 text-white border-none" : "" 
          });
          
          fetchAllData();
      } catch (error) {
          toast({ variant: "destructive", title: t('common.error'), description: error.message });
      } finally {
          setProcessing(false);
      }
  };

  const handleEditClick = (user) => {
    setEditingUser({ 
        ...user, 
        selectedTier: user.tier_id || 'none',
        editLandDollarStatus: user.land_dollar_status === 'none' ? 'active' : user.land_dollar_status,
        referral_code: user.referral_code || '',
        pioneer_status: user.founding_pioneer_access_status || 'pending'
    }); 
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setProcessing(true);
    try {
      const safeReferralCode = editingUser.referral_code.trim() === '' ? null : editingUser.referral_code.trim().toLowerCase();

      const { error: profileErr } = await supabase.from('profiles').update({ 
          name: editingUser.name, 
          role: editingUser.role,
          genesis_profile: editingUser.genesis_profile,
          referral_code: safeReferralCode
      }).eq('id', editingUser.id);
      
      if (profileErr) throw profileErr;

      const isNewTier = editingUser.selectedTier !== editingUser.tier_id;
      const isFundsEmpty = Number(editingUser.land_dollar_amount) === 0;

      if (editingUser.selectedTier && editingUser.selectedTier !== 'none' && (isNewTier || isFundsEmpty)) {
          let tierData = availableTiers.find(t => t.id === editingUser.selectedTier);
          if (tierData) {
              const { data: rpcData, error: rpcError } = await supabase.rpc('admin_process_startnext_contribution', {
                  p_user_id: editingUser.id,
                  p_amount: tierData.min_amount,
                  p_notes: 'Admin manual tier assignment',
                  p_pioneer_status: editingUser.pioneer_status
              });
              if (rpcError) throw rpcError;
          }
      } else {
          const { data: existMetric } = await supabase.from('founding_pioneer_metrics').select('id').eq('user_id', editingUser.id).maybeSingle();
          if (existMetric) {
              await supabase.from('founding_pioneer_metrics').update({ founding_pioneer_access_status: editingUser.pioneer_status }).eq('user_id', editingUser.id);
          } else {
              await supabase.from('founding_pioneer_metrics').insert({ user_id: editingUser.id, founding_pioneer_access_status: editingUser.pioneer_status });
          }
      }

      const linkRefToUse = safeReferralCode || `REF-${editingUser.id.substring(0,6).toUpperCase()}`;
      const newQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://reforest.al/${linkRefToUse}`;

      const { data: ldExist } = await supabase.from('land_dollars').select('id').eq('user_id', editingUser.id).maybeSingle();

      if (ldExist) {
          await supabase.from('land_dollars').update({ 
              status: editingUser.editLandDollarStatus,
              is_active: editingUser.editLandDollarStatus === 'active' || editingUser.editLandDollarStatus === 'issued',
              link_ref: linkRefToUse,
              qr_code_url: newQrUrl
          }).eq('id', ldExist.id);
      } else if (editingUser.editLandDollarStatus === 'active') {
          await supabase.from('land_dollars').insert({
               user_id: editingUser.id,
               amount: 0,
               status: 'active',
               is_active: true,
               link_ref: linkRefToUse,
               land_dollar_url: '/assets/land-dollar-base1.webp',
               qr_code_url: newQrUrl
           });
      }

      toast({ title: t('common.success'), description: "Usuario actualizado exitosamente." });
      setIsEditOpen(false);
      await fetchAllData();
    } catch (error) {
      console.error("Save Error:", error);
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClick = (user) => { 
      setDeletingUser(user); 
      setIsDeleteOpen(true); 
  };
  
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setProcessing(true);
    try {
        const result = await deleteUserCascade(deletingUser.id);
        if (!result.success) throw new Error(result.error);

        setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
        setFilteredUsers(prev => prev.filter(u => u.id !== deletingUser.id));

        toast({ title: "User Deleted", className: "bg-emerald-600 text-white border-none" });
    } catch (e) { 
        toast({ variant: "destructive", title: "Deletion Failed", description: e.message }); 
    } finally { 
        setProcessing(false); 
        setIsDeleteOpen(false);
        setDeletingUser(null); 
    }
  };

  const handleExportCSV = () => {
    if (!users.length) return;
    const csvContent = [['ID', 'Name', 'Email', 'Apodo', 'Role', 'Genesis', 'Tier', 'IC', 'LD Status', 'Pioneer Status'].join(",") + "\n" + users.map(u => [u.id, u.name, u.email, u.referral_code || 'N/A', u.role, u.genesis_profile, u.tier_name, u.ic_balance, u.land_dollar_status, u.founding_pioneer_access_status].join(",")).join("\n")];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `users_export.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar usuario, email o apodo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
            <Button onClick={fetchAllData} variant="outline" size="icon" disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Button onClick={handleExportCSV} variant="outline" disabled={!users.length}><Download className="w-4 h-4 mr-2" /> {t('common.download')}</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full bg-background text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">{t('admin.startnext.user')}</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Apodo</th>
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
                <tr><td colSpan="9" className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                 <tr><td colSpan="9" className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                filteredUsers.map((user) => {
                    const profileKey = user.genesis_profile ? user.genesis_profile.toLowerCase() : 'none';
                    const ProfileIcon = profileIcons[profileKey] || null;
                    const badgeClass = profileColors[profileKey] || profileColors.none;
                    const isPioneerApproved = user.founding_pioneer_access_status === 'approved';

                    return (
                      <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4"><div className="flex flex-col"><span className="font-semibold">{user.name || 'Unnamed'}</span><span className="text-xs text-muted-foreground">{user.email}</span></div></td>
                        <td className="p-4"><span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded">@{user.referral_code || 'N/A'}</span></td>
                        <td className="p-4"><Badge variant="outline" className={`gap-1 pr-3 capitalize ${badgeClass}`}>{ProfileIcon && <ProfileIcon className="w-3 h-3" />}{user.genesis_profile || 'None'}</Badge></td>
                        <td className="p-4"><Badge variant="outline">{user.role}</Badge></td>
                        
                        <td className="p-4">
                            <Select 
                                value={user.founding_pioneer_access_status || 'pending'} 
                                onValueChange={(val) => handleInlinePioneerStatusChange(user, val)}
                                disabled={processing}
                            >
                                <SelectTrigger className={`h-8 text-xs font-bold capitalize w-[115px] ${isPioneerApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="revoked">Revoked</SelectItem>
                                </SelectContent>
                            </Select>
                        </td>

                        <td className="p-4"><div className="flex items-center gap-1"><Leaf className="w-3 h-3 text-emerald-500"/><span className="text-foreground font-medium">{user.tier_name}</span></div></td>
                        <td className="p-4"><div className="flex items-center gap-1 font-mono"><Coins className="w-3 h-3 text-amber-500"/>{user.ic_balance}</div></td>
                        
                        <td className="p-4 text-center">
                            {user.has_land_dollar ? (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1 font-bold text-foreground">
                                        <Wallet className="w-3 h-3"/> €{parseFloat(user.land_dollar_amount).toFixed(2)}
                                    </div>
                                    <Badge variant={['active','issued'].includes(user.land_dollar_status) ? "default" : "destructive"} 
                                           className={`text-[9px] h-4 ${['active','issued'].includes(user.land_dollar_status) ? 'bg-green-600' : 'bg-red-600'}`}>
                                        {user.land_dollar_status}
                                    </Badge>
                                </div>
                            ) : <span className="text-slate-300 text-xs italic">N/A</span>}
                        </td>
                        
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 items-center">
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
          <DialogHeader><DialogTitle>Edit User & Controls</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t('auth.name_label')}</Label><Input value={editingUser.name || ''} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>{t('auth.email_label')}</Label><Input disabled value={editingUser.email || ''} /></div>
              </div>

              <div className="space-y-2">
                  <Label className="text-emerald-700 font-bold">Apodo (URL / Código de Referido)</Label>
                  <Input 
                      value={editingUser.referral_code || ''} 
                      onChange={(e) => setEditingUser({...editingUser, referral_code: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()})} 
                      placeholder="ej: carlos123"
                  />
                  <p className="text-xs text-muted-foreground">Al cambiarlo, se regenerará automáticamente el QR y el enlace del Land Dollar.</p>
              </div>
              
              <div className="space-y-2 border-t pt-4 bg-slate-50 p-3 rounded-lg border">
                  <Label className="text-emerald-800 font-bold flex items-center gap-2">
                      {editingUser.editLandDollarStatus === 'suspended' ? <Ban className="w-4 h-4 text-red-500"/> : <Wallet className="w-4 h-4"/>} 
                      Digital Asset Status (Admin Control)
                  </Label>
                  <Select value={editingUser.editLandDollarStatus || 'active'} onValueChange={(val) => setEditingUser({...editingUser, editLandDollarStatus: val})}>
                    <SelectTrigger className={editingUser.editLandDollarStatus === 'suspended' ? 'border-red-500 bg-red-50 text-red-700' : ''}>
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Active (Enable Rewards)</SelectItem>
                        <SelectItem value="suspended">Suspended (Rewards Paused)</SelectItem>
                        <SelectItem value="blocked">Blocked (Banned)</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={editingUser.role} onValueChange={(val) => setEditingUser({...editingUser, role: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user">User Common</SelectItem>
                            <SelectItem value="startnext_user">Startnext User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                  
                  <div className="space-y-2">
                      <Label className="text-blue-700 font-bold">Pioneer Access Status</Label>
                      <Select value={editingUser.pioneer_status} onValueChange={(val) => setEditingUser({...editingUser, pioneer_status: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
              </div>
              
              <div className="space-y-2">
                  <Label>{t('admin.investor_profile')}</Label>
                  <Select value={editingUser.genesis_profile || 'none'} onValueChange={(val) => setEditingUser({...editingUser, genesis_profile: val === 'none' ? null : val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{investorProfiles.map(p => <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>)}</SelectContent>
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
          <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSaveEdit} disabled={processing}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" /> 
                    Delete User in Cascade?
                </DialogTitle>
            </DialogHeader>
            <div className="pt-3 space-y-2 text-sm text-slate-600">
                <p>You are about to permanently delete <strong>{deletingUser?.email}</strong>.</p>
                <p>This action will destroy:</p>
                <ul className="list-disc pl-5">
                    <li>Authentication record</li>
                    <li>Land Dollars & Impact Credits</li>
                    <li>MLM / Gamification History</li>
                    <li>Startnext Contributions</li>
                </ul>
                <p className="font-bold text-red-600 mt-2">This cannot be undone.</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={processing}>{t('common.cancel')}</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={processing}>
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete Permanently
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserManagement;