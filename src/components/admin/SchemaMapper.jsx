import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Database, Table as TableIcon, RefreshCw, Eye } from 'lucide-react';

const SchemaMapper = () => {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([
    { name: 'support_levels', label: 'Variants', count: 0, samples: [] },
    { name: 'support_benefits', label: 'Benefits', count: 0, samples: [] },
    { name: 'support_level_translations', label: 'Variant Trans', count: 0, samples: [] },
    { name: 'support_benefit_translations', label: 'Benefit Trans', count: 0, samples: [] },
    { name: 'startnext_contributions', label: 'User Contributions', count: 0, samples: [] },
    { name: 'user_benefits', label: 'User Benefits', count: 0, samples: [] }
  ]);

  const fetchSchemaData = async () => {
    setLoading(true);
    const updatedTables = [];

    for (const t of tables) {
      try {
        // Get Count
        const { count, error: countErr } = await supabase
          .from(t.name)
          .select('*', { count: 'exact', head: true });
        
        // Get Sample Data (First 3 rows)
        const { data: samples, error: sampleErr } = await supabase
          .from(t.name)
          .select('*')
          .limit(3);

        updatedTables.push({
          ...t,
          count: count || 0,
          samples: samples || [],
          error: countErr || sampleErr
        });
      } catch (e) {
        console.error(`Error fetching ${t.name}:`, e);
      }
    }
    setTables(updatedTables);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchemaData();
  }, []);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold tracking-tight">Live Schema Mapping</h2>
            <p className="text-muted-foreground">Real-time row counts and sample data inspection.</p>
         </div>
         <button onClick={fetchSchemaData} className="p-2 hover:bg-accent rounded-full"><RefreshCw className="w-5 h-5"/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {tables.map(t => (
           <Card key={t.name} className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-500"/>
              <CardContent className="p-6">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-foreground truncate max-w-[150px]" title={t.name}>{t.name}</h3>
                    <Badge variant="secondary" className="font-mono">{t.count} Rows</Badge>
                 </div>
                 <p className="text-xs text-muted-foreground mb-4">{t.label}</p>
                 <div className="bg-slate-950 rounded-md p-2 overflow-x-auto">
                    <code className="text-[10px] text-green-400 font-mono whitespace-pre">
                       {t.samples.length > 0 ? JSON.stringify(t.samples[0], null, 2).slice(0, 150) + '...' : '// No Data'}
                    </code>
                 </div>
              </CardContent>
           </Card>
         ))}
      </div>

      <Card>
        <CardHeader>
           <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-blue-500"/> Detailed Data Inspector</CardTitle>
           <CardDescription>View raw sample records from the relevant tables.</CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue={tables[0].name}>
              <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-4 justify-start">
                 {tables.map(t => (
                    <TabsTrigger key={t.name} value={t.name} className="border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                       {t.label}
                    </TabsTrigger>
                 ))}
              </TabsList>
              
              {tables.map(t => (
                 <TabsContent key={t.name} value={t.name}>
                    <div className="rounded-md border border-border overflow-hidden">
                       <Table>
                          <TableHeader className="bg-muted/50">
                             <TableRow>
                                <TableHead className="w-[100px]">Row Index</TableHead>
                                <TableHead>Raw Record (JSON)</TableHead>
                             </TableRow>
                          </TableHeader>
                          <TableBody>
                             {t.samples.map((row, i) => (
                                <TableRow key={i}>
                                   <TableCell className="font-mono text-xs text-muted-foreground">#{i + 1}</TableCell>
                                   <TableCell>
                                      <pre className="text-[10px] font-mono text-foreground bg-accent/20 p-2 rounded max-h-[200px] overflow-auto">
                                         {JSON.stringify(row, null, 2)}
                                      </pre>
                                   </TableCell>
                                </TableRow>
                             ))}
                             {t.samples.length === 0 && (
                                <TableRow>
                                   <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                      No data found in this table.
                                   </TableCell>
                                </TableRow>
                             )}
                          </TableBody>
                       </Table>
                    </div>
                 </TabsContent>
              ))}
           </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchemaMapper;