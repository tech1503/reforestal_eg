
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

const ExchangePurchasesTable = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPurchases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_purchases')
      .select(`
        *,
        profiles:user_id (email, name),
        exchange_products (name, price)
      `)
      .order('purchased_at', { ascending: false });

    if (error) console.error('Error fetching purchases:', error);
    else setPurchases(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPurchases();
    
    // Real-time subscription
    const sub = supabase.channel('purchases_table_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_purchases' }, () => {
        fetchPurchases();
      })
      .subscribe();
      
    return () => supabase.removeChannel(sub);
  }, []);

  const handleDelete = async (id) => {
      if(!window.confirm("Are you sure? This deletes the history record.")) return;
      const { error } = await supabase.from('user_purchases').delete().eq('id', id);
      if (error) toast({variant: "destructive", title: "Error", description: error.message});
      else toast({title: "Deleted", description: "Purchase record removed."});
  };

  const handleStatusUpdate = async (id, status) => {
      const { error } = await supabase.from('user_purchases').update({ status }).eq('id', id);
      if (error) toast({variant: "destructive", title: "Error", description: error.message});
      else toast({title: "Updated", description: `Status set to ${status}`});
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exchange Purchases</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No purchases found.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    {purchase.purchased_at ? format(new Date(purchase.purchased_at), 'MMM d, yyyy HH:mm') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{purchase.profiles?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{purchase.profiles?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{purchase.exchange_products?.name || 'Unknown Product'}</TableCell>
                  <TableCell>{purchase.quantity}</TableCell>
                  <TableCell>{purchase.credits_spent}</TableCell>
                  <TableCell>
                    <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'} className={purchase.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}>
                      {purchase.status || 'Completed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4 text-slate-500"/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusUpdate(purchase.id, 'completed')}>Mark Completed</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(purchase.id, 'pending')}>Mark Pending</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(purchase.id, 'cancelled')} className="text-orange-600">Mark Cancelled</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(purchase.id)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2"/> Delete Record
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ExchangePurchasesTable;
