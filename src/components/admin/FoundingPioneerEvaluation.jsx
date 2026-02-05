import React, { useState } from 'react';
import { useFoundingPioneerData } from '@/hooks/useFoundingPioneerData';
import FoundingPioneerMetricsModal from './FoundingPioneerMetricsModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

const FoundingPioneerEvaluation = () => {
  const { pioneers, loading, error, refetch } = useFoundingPioneerData();
  const [selectedPioneer, setSelectedPioneer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8"/></div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const filteredPioneers = pioneers.filter(p => 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <div>
                 <h2 className="text-2xl font-bold tracking-tight">Pioneer Evaluation</h2>
                 <p className="text-slate-500">Review and manage access for potential Founding Pioneers.</p>
             </div>
             <div className="flex gap-2">
                 <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                     <Input 
                        placeholder="Search pioneers..." 
                        className="pl-9 w-[250px]" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                 </div>
                 <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
             </div>
        </div>

        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Current Role</TableHead>
                            <TableHead>Startnext History</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPioneers.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No pioneers found.</TableCell></TableRow>
                        ) : filteredPioneers.map((p) => (
                            <TableRow key={p.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                    <div className="font-medium text-slate-900">{p.full_name || 'Anonymous'}</div>
                                    <div className="text-xs text-slate-500">{p.email}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">
                                        {p.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        <span className="font-bold">{p.contribution_count}</span> contribs
                                        {p.total_contribution > 0 && (
                                            <span className="text-slate-500 ml-1">(€{p.total_contribution})</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => setSelectedPioneer(p)}>
                                        Evaluate
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {selectedPioneer && (
            <FoundingPioneerMetricsModal 
                pioneer={selectedPioneer} 
                onClose={() => {
                    setSelectedPioneer(null);
                    refetch(); // Refresh data after updates
                }} 
            />
        )}
    </div>
  );
};

export default FoundingPioneerEvaluation;