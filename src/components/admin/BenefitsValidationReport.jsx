import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { runBenefitsValidation } from '@/utils/validationTestUtils';
import BenefitsDisplay from '@/components/ui/BenefitsDisplay';

const BenefitsValidationReport = () => {
    const [report, setReport] = useState(null);
    const [running, setRunning] = useState(false);

    const handleRun = async () => {
        setRunning(true);
        const data = await runBenefitsValidation();
        setReport(data);
        setRunning(false);
    };

    return (
        <div className="space-y-8 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Benefits System Validation</h2>
                    <p className="text-muted-foreground">Automated verification of benefit tiers, counts, and legacy data cleanup.</p>
                </div>
                <Button onClick={handleRun} disabled={running} size="lg" className={running ? 'opacity-50' : ''}>
                    {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Run Comprehensive Test
                </Button>
            </div>

            {report && (
                <div className="space-y-6">
                    <Card className={`border-l-4 ${report.overall_status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                Overall Status: 
                                <Badge variant={report.overall_status === 'PASS' ? 'default' : 'destructive'} className="text-lg px-3 py-1">
                                    {report.overall_status}
                                </Badge>
                            </CardTitle>
                            <CardDescription>Timestamp: {new Date(report.timestamp).toLocaleString()}</CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {report.variants.map((variant, idx) => (
                            <Card key={idx} className="overflow-hidden">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg font-bold">{variant.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Input: €{variant.input_amount}</span>
                                            {variant.status === 'pass' ? <CheckCircle className="text-green-500 w-5 h-5"/> : <XCircle className="text-red-500 w-5 h-5"/>}
                                        </div>
                                    </div>
                                    {variant.status !== 'pass' && (
                                        <div className="mt-2 bg-red-50 text-red-700 p-2 rounded text-xs font-mono flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4"/> {variant.details}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-6">
                                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                        Found Benefits ({variant.benefits_found.length})
                                    </h4>
                                    
                                    {/* Visual Simulation of BenefitsDisplay */}
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-dashed">
                                        <p className="text-xs text-center text-muted-foreground mb-4">- Component Render Preview -</p>
                                        <BenefitsDisplay 
                                            tierName={variant.name} 
                                            benefits={variant.benefits_found.map((b, i) => ({
                                                id: i,
                                                translated_desc: b.desc,
                                                benefit_type: b.type,
                                                icon_name: b.icon
                                            }))} 
                                        />
                                    </div>

                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-xs font-mono text-slate-500">Raw Data:</p>
                                        <ul className="text-xs space-y-1 mt-1 font-mono text-slate-600 dark:text-slate-400">
                                            {variant.benefits_found.map((b, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    [{b.icon || 'no-icon'}] {b.desc} ({b.type})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BenefitsValidationReport;