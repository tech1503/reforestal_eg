import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Mail, Loader2, UserPlus, Eye, Info, Edit, MoreVertical, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateLandDollarWithQR } from '@/utils/landDollarQRRenderer';
import { useI18n } from '@/contexts/I18nContext';
import { validateContributionForm } from '@/utils/validationUtils';
import { safeSupabaseCall } from '@/utils/supabaseErrorHandler';
import { format } from 'date-fns';
import { getSupportLevelByAmount, getVariantDetails } from '@/utils/tierLogicUtils';
import StartnextEditModal from './financials/StartnextEditModal';

const StartnextManagement = () => {
  const { toast } = useToast();
  const { currentLanguage } = useI18n();
  const [contributions, setContributions] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Search & Loading
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dialogs
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [editingContrib, setEditingContrib] = useState(null);
  
  // Form States
  const [userMode, setUserMode] = useState('manual');
  const [createAccount, setCreateAccount] = useState(true); // Default to creating account
  const [manualUser, setManualUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
  });
  const [formData, setFormData] = useState({
    user_id: '', 
    contribution_amount: '',
    contribution_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Calculated Variant State
  const [calculatedVariant, setCalculatedVariant] = useState(null);
  const [variantLoading, setVariantLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, contribRes] = await Promise.all([
        safeSupabaseCall(supabase.from('profiles').select('id, name, email'), 'Fetch Profiles'),
        safeSupabaseCall(supabase.from('startnext_contributions').select(`
          *, 
          profiles:user_id(name, email), 
          imported_user:imported_user_id(full_name, email, snx_id, is_registered),
          support_levels:new_support_level_id(slug, min_amount, support_level_translations(name, language_code))
        `).order('contribution_date', { ascending: false }), 'Fetch Contributions')
      ]);

      setUsers(profilesRes || []);

      // Process Contributions for Display
      const processedContribs = (contribRes || []).map(c => {
          let levelName = 'Legacy / Custom';
          if (c.support_levels) {
             const sl = c.support_levels;
             const trans = sl.support_level_translations?.find(t => t.language_code === currentLanguage) 
                        || sl.support_level_translations?.find(t => t.language_code === 'en');
             levelName = trans?.name || sl.slug;
          } else if (c.benefit_level) {
             levelName = c.benefit_level;
          }
          return { ...c, display_level: levelName };
      });
      setContributions(processedContribs);

    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  }, [currentLanguage, toast]);

  useEffect(() => {
    fetchData();
    
    // Realtime subscription
    const subscription = supabase
      .channel('public:startnext_contributions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'startnext_contributions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchData]);

  // Effect to calculate variant details when amount changes
  useEffect(() => {
    const calc = async () => {
        const amount = parseFloat(formData.contribution_amount);
        if (!amount || isNaN(amount)) {
            setCalculatedVariant(null);
            return;
        }

        setVariantLoading(true);
        try {
            const levelId = await getSupportLevelByAmount(amount);
            if (levelId) {
                const details = await getVariantDetails(levelId, currentLanguage);
                const { data: fullLevel } = await supabase
                    .from('support_levels')
                    .select('*, support_benefits(id, benefit_type, icon_name, support_benefit_translations(description, language_code))')
                    .eq('id', levelId)
                    .single();
                
                if (fullLevel && details) {
                    setCalculatedVariant({
                        ...details,
                        id: levelId,
                        impact_credits_reward: fullLevel.impact_credits_reward,
                        land_dollars_reward: fullLevel.land_dollars_reward,
                        benefits: fullLevel.support_benefits || []
                    });
                }
            } else {
                setCalculatedVariant(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setVariantLoading(false);
        }
    };

    const timer = setTimeout(calc, 400); // Debounce
    return () => clearTimeout(timer);
  }, [formData.contribution_amount, currentLanguage]);

  const handleCreateContribution = async () => {
    setIsProcessing(true);
    try {
      if (!calculatedVariant) throw new Error("Amount too low for any benefit tier.");

      // Validate Form Data
      const validationPayload = userMode === 'manual' 
          ? { ...manualUser, ...formData } 
          : { user_id: formData.user_id, ...formData };
          
      const validation = validateContributionForm(validationPayload, userMode);
      if (!validation.isValid) {
          throw new Error(Object.values(validation.errors).join(', '));
      }

      let finalUserId = formData.user_id || null;
      let finalImportedUserId = null;
      let snxId = null;

      // 1. Handle User Identity
      if (userMode === 'manual') {
        if (createAccount) {
            // A) Create REAL User (Auth + Profile + Role) via Edge Function
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

            if (userError || userData?.error) {
                throw new Error(userError?.message || userData?.error || 'Failed to create user account');
            }

            finalUserId = userData.user.id;
            snxId = `SNX-ACC-${Date.now().toString().slice(-6)}`;
        } else {
            // B) Legacy Import (No Auth yet) - WARNING: USER WON'T BE ABLE TO LOGIN
            const { data: existingImport } = await supabase
              .from('startnext_imported_users')
              .select('id, snx_id')
              .eq('email', manualUser.email)
              .maybeSingle();

            if (existingImport) {
              finalImportedUserId = existingImport.id;
              snxId = existingImport.snx_id;
            } else {
              const { data: newImport, error: importError } = await supabase
                .from('startnext_imported_users')
                .insert({
                  email: manualUser.email,
                  full_name: manualUser.full_name,
                  city: manualUser.city,
                  country: manualUser.country,
                  snx_id: `SNX-${Date.now().toString().slice(-6)}`
                })
                .select()
                .single();
              
              if (importError) throw importError;
              finalImportedUserId = newImport.id;
              snxId = newImport.snx_id;
            }
        }
      } else {
        // C) Existing User Selected
        finalUserId = formData.user_id;
        snxId = `SNX-EXT-${Date.now().toString().slice(-6)}`;
      }

      // 2. Generate Assets
      const linkRef = crypto.randomUUID();
      let landDollarUrl = null;

      if (snxId) {
         try {
           const blob = await generateLandDollarWithQR(linkRef);
           const fileName = `land-dollars/${finalUserId || 'imported'}/${linkRef}.png`;
           const { error: uploadError } = await supabase.storage
              .from('land-dollars')
              .upload(fileName, blob, { upsert: true, contentType: 'image/png' });
           
           if (!uploadError) {
               const { data: { publicUrl } } = supabase.storage.from('land-dollars').getPublicUrl(fileName);
               landDollarUrl = publicUrl;
           }
         } catch (e) {
           console.warn("Asset generation skipped:", e);
         }
      }

      // 3. Create Contribution Record (Financial)
      const { data: newContrib, error: contribError } = await supabase.from('startnext_contributions').insert({
        user_id: finalUserId,
        imported_user_id: finalImportedUserId,
        contribution_amount: parseFloat(formData.contribution_amount),
        contribution_date: formData.contribution_date,
        benefit_level: calculatedVariant.variant_title, 
        new_support_level_id: calculatedVariant.id, 
        benefit_assigned: true,
        notes: formData.notes,
        phone: manualUser.phone,
        city: manualUser.city,
        country: manualUser.country,
        land_dollar_image_url: landDollarUrl,
      }).select().single();

      if (contribError) throw contribError;

      // 4. Issue Credits & Assets (Only if we have a real user_id)
      if (finalUserId) {
          await supabase.from('impact_credits').insert({
              user_id: finalUserId,
              amount: calculatedVariant.impact_credits_reward, 
              source: 'startnext',
              description: `Startnext: ${calculatedVariant.variant_title}`,
              related_support_level_id: calculatedVariant.id,
              contribution_id: newContrib.id
          });

          await supabase.from('land_dollars').insert({
              user_id: finalUserId,
              amount: parseFloat(formData.contribution_amount),
              land_dollar_url: landDollarUrl,
              link_ref: linkRef,
              qr_code_url: `https://reforest.al/ref/${linkRef}`,
              status: 'issued',
              related_support_level_id: calculatedVariant.id,
              contribution_id: newContrib.id
          });
          
          await supabase.from('user_benefits').insert({
              user_id: finalUserId,
              new_support_level_id: calculatedVariant.id,
              contribution_id: newContrib.id,
              status: 'active',
              benefit_level_id: '00000000-0000-0000-0000-000000000000' 
          });
      }

      toast({ 
          title: "Contribution & User Created!", 
          description: createAccount && userMode === 'manual' 
             ? "New account active (Auth+Profile+Role)." 
             : "Startnext contribution recorded." 
      });
      
      setShowDialog(false);
      setManualUser({ full_name: '', email: '', phone: '', city: '', country: '' });
      setFormData({ ...formData, contribution_amount: '', notes: '' });
      setCalculatedVariant(null);
      setCreateAccount(true);

    } catch (error) {
      console.error("Process Error:", error);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteContribution = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase.from('startnext_contributions').delete().eq('id', deleteTargetId);
      if(error) throw error;
      toast({description: "Deleted"});
      // fetchData called automatically by realtime
    } catch (err) {
      toast({variant: 'destructive', description: err.message});
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
    }
  };

  const filteredContributions = contributions.filter(c => {
      const name = c.profiles?.name || c.imported_user?.full_name || '';
      const email = c.profiles?.email || c.imported_user?.email || '';
      const search = searchTerm.toLowerCase();
      return name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search contributions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setShowDialog(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Contribution
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Contributor</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Level / Tier</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Land Dollar</th>
                    <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y">
                {loading ? (
                    <tr><td colSpan="5" className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-violet-600"/></td></tr>
                ) : filteredContributions.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">No contributions found.</td></tr>
                ) : (
                    filteredContributions.map((c) => {
                    const name = c.profiles?.name || c.imported_user?.full_name;
                    const email = c.profiles?.email || c.imported_user?.email;
                    
                    return (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                            <div>
                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                    {name}
                                    {c.user_id && <CheckCircle2 className="w-3 h-3 text-emerald-500" title="Active User Account"/>}
                                </div>
                                <div className="text-xs text-gray-500">{email}</div>
                                {c.city && <div className="text-[10px] text-gray-400">{c.city}, {c.country}</div>}
                            </div>
                        </td>
                        <td className="p-4">
                            <div className="font-bold text-emerald-700">€{parseFloat(c.contribution_amount).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{format(new Date(c.contribution_date), 'MMM d, yyyy')}</div>
                        </td>
                        <td className="p-4">
                            <Badge variant="secondary" className="mb-1 bg-violet-100 text-violet-800 hover:bg-violet-200">
                                {c.display_level}
                            </Badge>
                        </td>
                        <td className="p-4">
                            {c.land_dollar_image_url ? (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => window.open(c.land_dollar_image_url, '_blank')}>
                                    <Eye className="w-3 h-3"/> View PNG
                                </Button>
                            ) : <span className="text-gray-400 text-xs italic">Pending...</span>}
                        </td>
                        <td className="p-4 text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4 text-slate-500"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingContrib(c)}>
                                        <Edit className="w-4 h-4 mr-2"/> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTargetId(c.id); setShowDeleteConfirm(true); }}>
                                        <Trash2 className="w-4 h-4 mr-2"/> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </td>
                        </tr>
                    );
                    })
                )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Startnext Contribution</DialogTitle>
            <DialogDescription>Record a new contribution and create user account with correct roles.</DialogDescription>
          </DialogHeader>

          <Tabs value={userMode} onValueChange={setUserMode} className="w-full mt-4">
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

                <div className="flex items-center space-x-2 border p-3 rounded-md bg-emerald-50/50">
                    <Checkbox id="createAccount" checked={createAccount} onCheckedChange={setCreateAccount} />
                    <label
                        htmlFor="createAccount"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Create active User Account immediately (Role: startnext_user)
                    </label>
                </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <select className="w-full p-2 rounded-md border text-sm" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})}>
                    <option value="">Select...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
            </TabsContent>

            <div className="pt-4 space-y-4 border-t mt-4">
                <div className="space-y-2">
                    <Label>Contribution Amount (€)</Label>
                    <Input type="number" min="0" step="0.01" value={formData.contribution_amount} onChange={e => setFormData({...formData, contribution_amount: e.target.value})} className="font-bold text-lg" placeholder="0.00"/>
                </div>
                
                {/* Variant Info Display */}
                <div className="bg-slate-50 p-4 rounded-md border space-y-3 relative">
                    {variantLoading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>}
                    
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold text-slate-700">Calculated Variant</h4>
                        {calculatedVariant ? (
                             <Badge className="bg-emerald-600 hover:bg-emerald-700">
                                {calculatedVariant.logical_name} // {calculatedVariant.variant_title}
                             </Badge>
                        ) : (
                             <Badge variant="outline" className="text-slate-400">No Match</Badge>
                        )}
                    </div>
                    
                    {calculatedVariant ? (
                        <div className="text-xs space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white p-2 rounded border">
                                    <span className="block text-slate-400 uppercase text-[10px]">Logical Level</span>
                                    <span className="font-medium text-slate-800">{calculatedVariant.logical_name}</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="block text-slate-400 uppercase text-[10px]">Variant Title</span>
                                    <span className="font-medium text-slate-800">{calculatedVariant.variant_title}</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="block text-slate-400 uppercase text-[10px]">Order / Priority</span>
                                    <span className="font-medium text-slate-800">#{calculatedVariant.display_order}</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="block text-slate-400 uppercase text-[10px]">Min Threshold</span>
                                    <span className="font-medium text-emerald-600">€{calculatedVariant.min_amount}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <span className="font-semibold text-slate-700 block mb-1">Rewards:</span>
                                <div className="flex gap-4">
                                     <div className="flex items-center gap-1">
                                        <Info className="w-3 h-3 text-blue-500"/>
                                        <span className="font-mono text-blue-600">{calculatedVariant.impact_credits_reward} IC</span>
                                     </div>
                                     <div className="flex items-center gap-1">
                                        <Info className="w-3 h-3 text-green-500"/>
                                        <span className="font-mono text-green-600">{calculatedVariant.land_dollars_reward} LD</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-2">Enter amount to see Startnext variant details (Min €5.00)</p>
                    )}
                </div>
                
                <div className="space-y-2">
                    <Label>Admin Notes</Label>
                    <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Internal reference..."/>
                </div>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateContribution} disabled={isProcessing || !calculatedVariant} className="btn-primary min-w-[140px]">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <><Mail className="w-4 h-4 mr-2"/> Process</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Modal */}
      <StartnextEditModal 
        isOpen={!!editingContrib}
        onClose={() => setEditingContrib(null)}
        contribution={editingContrib}
        onSuccess={fetchData}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete this contribution? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteContribution}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StartnextManagement;