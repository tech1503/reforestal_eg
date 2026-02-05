import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Database, Table as TableIcon, Link, Users, RefreshCw } from 'lucide-react';

const SchemaAuditView = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    levels: [],
    benefits: [],
    contributions: [],
    tableStats: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Levels with Translations and Benefit Counts
      const { data: levels } = await supabase
        .from('support_levels')
        .select(`
          id, slug, min_amount, is_active,
          support_level_translations(name, language_code),
          support_benefits(id)
        `)
        .order('min_amount');

      // 2. Fetch All Benefits Detail
      const { data: benefits } = await supabase
        .from('support_benefits')
        .select(`
          id, icon_name, benefit_type, is_active, support_level_id,
          support_benefit_translations(description, language_code),
          support_levels(slug)
        `)
        .order('support_level_id');

      // 3. Fetch User Associations (Aggregated)
      // Note: We can't do complex aggregation easily with simple client, so we fetch raw subset or use rpc if available.
      // We'll fetch raw contributions to count JS side for audit.
      const { data: contribs } = await supabase
        .from('startnext_contributions')
        .select('id, new_support_level_id');

      // 4. Approximate Table Counts (using planned queries)
      const tables = ['support_levels', 'support_benefits', 'startnext_contributions', 'profiles'];
      const stats = [];
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        stats.push({ name: t, count: count || 0 });
      }

      setData({
        levels: levels || [],
        benefits: benefits || [],
        contributions: contribs || [],
        tableStats: stats
      });

    } catch (err) {
      console.error("Audit fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process User Counts per Level
  const userCounts = data.contributions.reduce((acc, curr) => {
    const key = curr.new_support_level_id || 'unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Database Schema Audit</h2>
           <p className="text-muted-foreground">Live inspection of tables, relationships, and data integrity.</p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-accent rounded-full"><RefreshCw className="w-5 h-5"/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.tableStats.map(stat => (
          <Card key={stat.name}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.count}</p>
              </div>
              <Database className="w-5 h-5 text-blue-500 opacity-50"/>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="variants" className="w-full">
        <TabsList>
          <TabsTrigger value="variants"><TableIcon className="w-4 h-4 mr-2"/> Support Levels (Variants)</TabsTrigger>
          <TabsTrigger value="benefits"><Link className="w-4 h-4 mr-2"/> Benefits Mapping</TabsTrigger>
          <TabsTrigger value="associations"><Users className="w-4 h-4 mr-2"/> User Associations</TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Active Support Variants</CardTitle><CardDescription>Data from `support_levels`</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug (ID)</TableHead>
                    <TableHead>Min Amount</TableHead>
                    <TableHead>Total Benefits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>EN Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.levels.map(l => {
                    const enName = l.support_level_translations?.find(t => t.language_code === 'en')?.name;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <span className="text-foreground font-bold">{l.slug}</span><br/>{l.id}
                        </TableCell>
                        <TableCell>€{l.min_amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.support_benefits?.length || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={l.is_active ? 'bg-green-600' : 'bg-gray-400'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>{enName || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Benefit Inventory</CardTitle><CardDescription>Data from `support_benefits` linking to Levels</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linked Variant</TableHead>
                    <TableHead>Icon Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>EN Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.benefits.map(b => {
                    const enDesc = b.support_benefit_translations?.find(t => t.language_code === 'en')?.description;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-xs">{b.support_levels?.slug}</TableCell>
                        <TableCell className="font-mono text-xs">{b.icon_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{b.benefit_type}</Badge></TableCell>
                        <TableCell className="text-sm">{enDesc}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="associations" className="mt-4">
          <Card>
            <CardHeader><CardTitle>User Distribution</CardTitle><CardDescription>Count of `startnext_contributions` per Level ID</CardDescription></CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant Level</TableHead>
                    <TableHead>Level ID</TableHead>
                    <TableHead className="text-right">User Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.levels.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-bold">{l.slug}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.id}</TableCell>
                      <TableCell className="text-right text-lg font-bold">
                        {userCounts[l.id] || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                     <TableCell colSpan={2} className="text-muted-foreground">Unassigned / Legacy</TableCell>
                     <TableCell className="text-right">{userCounts['unassigned'] || 0}</TableCell>
                  </TableRow>
                </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchemaAuditView;