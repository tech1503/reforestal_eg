import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const UserTierAssignmentView = ({ initialFilterLevelId, title }) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [reassigningUser, setReassigningUser] = useState(null);
  const [newLevelId, setNewLevelId] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => { // useCallback para estabilidad
    setLoading(true);
    try {
      const [
          { data: benefits },
          { data: profiles },
          { data: levelsData }
      ] = await Promise.all([
          supabase.from('user_benefits').select('*').order('assigned_date', { ascending: false }),
          supabase.from('profiles').select('id, name, email'),
          supabase.from('support_levels').select('id, slug, min_amount').order('min_amount')
      ]);
      
      setLevels(levelsData || []);

      let mappedData = (benefits || []).map(benefit => {
          const profile = profiles?.find(p => p.id === benefit.user_id);
          const level = levelsData?.find(l => l.id === benefit.new_support_level_id);
          
          return {
              ...benefit,
              profiles: profile,
              support_levels: level
          };
      });

      if (initialFilterLevelId) {
          mappedData = mappedData.filter(d => d.new_support_level_id === initialFilterLevelId);
      }

      setAssignments(mappedData);

    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load assignments." });
    } finally {
      setLoading(false);
    }
  }, [initialFilterLevelId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Hook corregido

  const formatTierName = (slug) => {
      if (!slug) return 'Unknown';
      return slug.replace('explorer-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleReassign = async () => {
      if (!reassigningUser || !newLevelId) return;
      setProcessing(true);
      try {
        const { error } = await supabase
            .from('user_benefits')
            .update({ 
                new_support_level_id: newLevelId,
                assigned_date: new Date().toISOString() 
            })
            .eq('id', reassigningUser.id);
        
        if (error) throw error;

        toast({ title: "Success", description: "User tier reassigned." });
        setReassigningUser(null);
        setNewLevelId('');
        fetchData();

      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      } finally {
        setProcessing(false);
      }
  };

  const filteredAssignments = assignments.filter(a => {
      const email = a.profiles?.email?.toLowerCase() || '';
      const name = a.profiles?.name?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      return email.includes(search) || name.includes(search);
  });

  return (
    <div className="space-y-4">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Search user..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-9 bg-white"
                />
           </div>
           <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800 hidden sm:block">{title || "Assignments"}</h3>
                <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2"/> Refresh</Button>
           </div>
       </div>

       <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
              <TableHeader>
                  <TableRow className="bg-slate-50">
                      <TableHead>User</TableHead>
                      <TableHead>Current Tier</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {loading ? (
                      <TableRow><TableCell colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
                  ) : filteredAssignments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="p-8 text-center text-slate-500">No assignments match your search.</TableCell></TableRow>
                  ) : filteredAssignments.map(a => (
                      <TableRow key={a.id}>
                          <TableCell>
                              <div className="font-medium">{a.profiles?.name || 'Unknown User'}</div>
                              <div className="text-xs text-slate-500">{a.profiles?.email}</div>
                          </TableCell>
                          <TableCell>
                              {a.support_levels ? (
                                <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200">
                                    {formatTierName(a.support_levels.slug)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-500">No Tier</Badge>
                              )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                              €{a.support_levels?.min_amount || 0}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                              {a.assigned_date ? format(new Date(a.assigned_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                              <Badge variant="outline" className={`${a.status === 'active' ? 'text-green-600 bg-green-50 border-green-200' : 'text-slate-500'} uppercase text-[10px]`}>
                                  {a.status || 'inactive'}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setReassigningUser(a)}>
                                  Reassign
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
       </div>

       <Dialog open={!!reassigningUser} onOpenChange={(o) => !o && setReassigningUser(null)}>
           <DialogContent>
               <DialogHeader>
                   <DialogTitle>Reassign Tier</DialogTitle>
               </DialogHeader>
               <div className="py-4 space-y-4">
                   <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                       Changing tier for <strong>{reassigningUser?.profiles?.name}</strong>.
                   </p>
                   <div className="space-y-2">
                       <Label>Select New Tier</Label>
                       <Select value={newLevelId} onValueChange={setNewLevelId}>
                           <SelectTrigger className="w-full">
                               <SelectValue placeholder="Select Tier..." />
                           </SelectTrigger>
                           <SelectContent>
                               {levels.map(l => (
                                   <SelectItem key={l.id} value={l.id}>
                                       {formatTierName(l.slug)} (Min €{l.min_amount})
                                   </SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>
               </div>
               <DialogFooter>
                   <Button variant="outline" onClick={() => setReassigningUser(null)}>Cancel</Button>
                   <Button onClick={handleReassign} disabled={!newLevelId || processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                       {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : 'Confirm Change'}
                   </Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  );
};

export default UserTierAssignmentView;