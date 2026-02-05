import React from 'react';
import { useFoundingPioneerData } from '@/hooks/useFoundingPioneerData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trophy, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const FoundingPioneerTop100 = () => {
  const { topPioneers, loading, error } = useFoundingPioneerData();
  const { t } = useTranslation(); // HOOK

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-amber-500 w-8 h-8"/></div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <Card className="border-amber-200">
      <CardHeader className="bg-amber-50/50">
        <div className="flex items-center gap-2">
            <Trophy className="text-amber-500 w-6 h-6" />
            <CardTitle>Top 100 {t('navigation.founding_pioneer')}</CardTitle>
        </div>
        <CardDescription>Live ranking based on Evaluation Score and {t('dashboard.impact_credits')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-auto">
            <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>{t('navigation.founding_pioneer')}</TableHead>
                <TableHead className="text-center">Eval Score</TableHead>
                <TableHead className="text-right">{t('dashboard.impact_credits')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {topPioneers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No ranked pioneers yet.</TableCell></TableRow>
                ) : topPioneers.map((pioneer, idx) => {
                    const rank = idx + 1;
                    let rankIcon = null;
                    if (rank === 1) rankIcon = <Medal className="w-5 h-5 text-yellow-500" />;
                    else if (rank === 2) rankIcon = <Medal className="w-5 h-5 text-gray-400" />;
                    else if (rank === 3) rankIcon = <Medal className="w-5 h-5 text-amber-700" />;

                    return (
                        <TableRow key={pioneer.id} className="hover:bg-amber-50/30 transition-colors">
                            <TableCell className="font-bold text-slate-700">
                                <div className="flex items-center gap-2">
                                    {rankIcon} <span>#{rank}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">{pioneer.user_name}</div>
                                <div className="text-xs text-slate-400">ID: {pioneer.user_id.slice(0,8)}...</div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline" className="bg-slate-100 border-slate-200 font-mono text-base">
                                    {pioneer.total_score}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-emerald-600">
                                {pioneer.impact_credits.toLocaleString()}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FoundingPioneerTop100;