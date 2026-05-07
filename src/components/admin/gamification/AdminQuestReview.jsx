import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, FileText, Zap, PieChart as PieChartIcon, Eye, Clock, Sparkles, Download } from 'lucide-react';
import { format } from 'date-fns';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import { createNotification } from '@/utils/notificationUtils';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminQuestReview = () => {
    const { toast } = useToast();
    const { t } = useTranslation();
    
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingReviews, setPendingReviews] = useState([]);
    const [historyResponses, setHistoryResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [adminFeedback, setAdminFeedback] = useState('');

    const [missionsList, setMissionsList] = useState([]);
    const [selectedMissionChart, setSelectedMissionChart] = useState('all');
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);

    const fetchMissionsList = useCallback(async () => {
        const { data } = await supabase.from('genesis_missions').select('id, title').order('created_at', { ascending: false });
        setMissionsList(data || []);
    }, []);

    const fetchChartData = useCallback(async () => {
        setChartLoading(true);
        try {
            let query = supabase.from('user_quest_responses').select(`user_id, profiles ( role )`);
            if (selectedMissionChart !== 'all') query = query.eq('mission_id', selectedMissionChart);
            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) { setChartData([]); return; }
            
            const userIds = [...new Set(data.map(d => d.user_id))];
            const { data: metrics } = await supabase.from('founding_pioneer_metrics').select('user_id, founding_pioneer_access_status').in('user_id', userIds);
            
            let common = 0, startnext = 0, pioneer = 0;
            data.forEach(resp => {
                const role = resp.profiles?.role;
                const metric = metrics?.find(m => m.user_id === resp.user_id);
                if (metric?.founding_pioneer_access_status === 'approved') pioneer++;
                else if (role === 'startnext_user') startnext++;
                else common++;
            });
            setChartData([
                { name: t('admin.audience.user', 'Usuario Estándar'), value: common, color: '#94a3b8' },
                { name: t('admin.audience.startnext_user', 'Startnext'), value: startnext, color: '#3b82f6' },
                { name: t('admin.audience.pioneer', 'Pionero Fundador'), value: pioneer, color: '#10b981' }
            ].filter(d => d.value > 0));
        } catch (error) { console.error(error); } finally { setChartLoading(false); }
    }, [selectedMissionChart, t]);

    const fetchPendingReviews = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from('user_quest_responses')
                .select(`*, profiles:user_id (name, email), genesis_missions (title, steps, impact_credit_reward, reputation_reward, referrer_reward)`)
                .eq('review_status', 'pending').order('created_at', { ascending: true });
            if (selectedMissionChart !== 'all') query = query.eq('mission_id', selectedMissionChart);
            const { data, error } = await query;
            if (error) throw error;
            setPendingReviews(data || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [selectedMissionChart]);

    const fetchHistoryResponses = useCallback(async () => {
        setLoadingHistory(true);
        try {
            let query = supabase.from('user_quest_responses')
                .select(`*, profiles:user_id (name, email), genesis_missions (title, steps, impact_credit_reward, reputation_reward, referrer_reward)`)
                .neq('review_status', 'pending').order('created_at', { ascending: false }).limit(50);
            if (selectedMissionChart !== 'all') query = query.eq('mission_id', selectedMissionChart);
            const { data, error } = await query;
            if (error) throw error;
            setHistoryResponses(data || []);
        } catch (err) { console.error(err); } finally { setLoadingHistory(false); }
    }, [selectedMissionChart]);

    useEffect(() => {
        fetchMissionsList(); fetchPendingReviews(); fetchHistoryResponses(); fetchChartData();
        const channel = supabase.channel('quest_db_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'user_quest_responses' }, () => {
            fetchPendingReviews(); fetchHistoryResponses(); fetchChartData();
        }).subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchPendingReviews, fetchHistoryResponses, fetchMissionsList, fetchChartData]);

    // --- NUEVO: FUNCIÓN PARA EXPORTAR HISTORIAL COMPLETO A CSV/EXCEL ---
    const handleExportCSV = async () => {
        try {
            // Notificamos inicio
            toast({ title: "Preparando Exportación", description: "Descargando datos y procesando respuestas..." });
            
            // Obtenemos todos los registros (sin límite de 50)
            const { data, error } = await supabase
                .from('user_quest_responses')
                .select(`
                    *,
                    profiles:user_id (name, email),
                    genesis_missions (title, steps)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) {
                toast({ description: "No hay registros para exportar." });
                return;
            }

            // Cabeceras del Excel
            const headers = ['Fecha_Envio', 'Nombre_Usuario', 'Email_Usuario', 'Titulo_Mision', 'Estado_Revision', 'Bonos_Obtenidos', 'Reputacion_Obtenida', 'Preguntas_y_Respuestas', 'Feedback_Admin'];

            // Formateo de Filas
            const rows = data.map(row => {
                const date = new Date(row.created_at).toLocaleString();
                const name = row.profiles?.name || 'Desconocido';
                const email = row.profiles?.email || 'Desconocido';
                const mission = row.genesis_missions?.title || 'Misión Desconocida';
                const status = row.review_status || 'N/A';
                const credits = row.credits_awarded || 0;
                const rep = row.earned_reputation || 0;
                const feedback = row.admin_feedback ? row.admin_feedback.replace(/(\r\n|\n|\r)/gm, " ") : '';
                
                // Formateo de las respuestas JSON a texto legible para Excel
                let answersStr = '';
                if (row.response_data) {
                    try {
                        let steps = row.genesis_missions?.steps;
                        // Si steps viene como string, lo parseamos
                        if (typeof steps === 'string') steps = JSON.parse(steps);
                        
                        const ansArr = Object.entries(row.response_data).map(([idx, ans]) => {
                            const stepConfig = steps && steps[idx] ? steps[idx] : null;
                            const questionText = stepConfig?.content || `Paso ${idx}`;
                            const answerVal = typeof ans === 'object' ? JSON.stringify(ans) : ans;
                            return `[Pregunta: ${questionText} | Respuesta: ${answerVal}]`;
                        });
                        answersStr = ansArr.join('  //  ');
                    } catch (e) {
                        // Fallback si hay error al cruzar la pregunta
                        answersStr = JSON.stringify(row.response_data);
                    }
                }
                
                // Escapar comillas dobles y armar la fila CSV
                const cleanAnswers = answersStr.replace(/"/g, '""');
                return `"${date}","${name}","${email}","${mission}","${status}","${credits}","${rep}","${cleanAnswers}","${feedback}"`;
            });

            // Ensamblar archivo
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF para soportar tildes en Excel
            const url = URL.createObjectURL(blob);
            
            // Forzar descarga
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Reporte_Respuestas_Misiones_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({ title: t('common.success'), description: "Exportación completada y archivo descargado." });
        } catch (err) {
            console.error("Export error:", err);
            toast({ variant: 'destructive', title: t('common.error'), description: "Fallo al exportar los datos." });
        }
    };

    const handleAction = async (actionType) => {
        if (!selectedReview || processing) return;
        
        setProcessing(true);
        const currentReview = { ...selectedReview }; 
        const isApproved = actionType === 'approve';
        const newStatus = isApproved ? 'approved' : 'rejected';
        const feedbackToSave = adminFeedback;

        try {
            const { data, error: updateError } = await supabase
                .from('user_quest_responses')
                .update({ 
                    review_status: newStatus, 
                    admin_feedback: feedbackToSave, 
                    is_correct: isApproved,
                    credits_awarded: isApproved ? currentReview.credits_awarded : 0, 
                    earned_reputation: isApproved ? currentReview.genesis_missions.reputation_reward : 0
                })
                .eq('id', currentReview.id)
                .eq('review_status', 'pending')
                .select(); 

            if (updateError) throw updateError;
            
            if (!data || data.length === 0) {
                throw new Error(t('admin.quest_review.errors.already_processed', "Permiso denegado por la base de datos o la misión ya no está pendiente."));
            }

            if (isApproved) {
                // 1. PAGO AL USUARIO
                await executeGamificationAction(currentReview.user_id, null, {
                    dynamicAction: {
                        id: currentReview.mission_id,
                        action_name: `mission_${currentReview.mission_id.slice(0,8)}`,
                        action_title: currentReview.genesis_missions.title,
                        action_type: 'Mission Quest',
                        impact_credit_reward: currentReview.credits_awarded, // Monto descontado
                        reputation_reward: currentReview.genesis_missions.reputation_reward,
                        source_event: 'quest_completion'
                    },
                    preventNotification: true
                });

                // 2. PAGO AL REFERIDOR (Si existe)
                if (currentReview.genesis_missions.referrer_reward > 0) {
                    try {
                        const { data: pData } = await supabase.from('profiles').select('referrer_id').eq('id', currentReview.user_id).single();
                        if (pData?.referrer_id) {
                            await executeGamificationAction(pData.referrer_id, null, {
                                dynamicAction: {
                                    id: currentReview.mission_id,
                                    action_name: `mlm_mission_${currentReview.mission_id.slice(0,8)}`,
                                    action_title: `Red Bonus: ${currentReview.genesis_missions.title}`,
                                    action_type: 'Referral (MLM)',
                                    impact_credit_reward: currentReview.genesis_missions.referrer_reward,
                                    reputation_reward: 0,
                                    source_event: 'mlm_indirect_quest'
                                },
                                preventNotification: true
                            });
                            await createNotification(
                                pData.referrer_id, 
                                'notifications.points_earned.title', 
                                'notifications.points_earned.message', 
                                { points: currentReview.genesis_missions.referrer_reward, action: currentReview.genesis_missions.title }, 
                                'bonus'
                            );
                        }
                    } catch (mlmErr) {
                        console.error("MLM Distribution Error in Admin Review:", mlmErr);
                    }
                }
            }

            const notifTitle = isApproved 
                ? t('admin.quest_review.notif_approved_title', '¡Misión Aprobada! 🌟') 
                : t('admin.quest_review.notif_rejected_title', 'Misión Requiere Revisión ⚠️');
            
            const notifMsg = isApproved
                ? t('admin.quest_review.notif_approved_msg', { title: currentReview.genesis_missions.title, feedback: feedbackToSave ? `Nota: "${feedbackToSave}"` : '' })
                : t('admin.quest_review.notif_rejected_msg', { title: currentReview.genesis_missions.title, feedback: feedbackToSave || '' });

            await createNotification(currentReview.user_id, notifTitle, notifMsg, {}, isApproved ? 'success' : 'alert');

            toast({ title: t('common.success'), description: t('admin.quest_review.status_updated', { status: newStatus }) });
            setSelectedReview(null);

        } catch (err) {
            console.error("Error en evaluación:", err);
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        } finally {
            setProcessing(false);
            await fetchPendingReviews();
            await fetchHistoryResponses();
        }
    };

    const renderAnswers = () => {
        if (!selectedReview) return null;
        let steps = [];
        try { steps = typeof selectedReview.genesis_missions.steps === 'string' ? JSON.parse(selectedReview.genesis_missions.steps) : selectedReview.genesis_missions.steps; } catch(e) { steps = []; }
        const answers = selectedReview.response_data || {};

        return (steps || []).map((step, idx) => {
            if (step.type !== 'question') return null;
            const ans = answers[idx];
            let display = ans;
            
            if (step.ui_type === 'single_choice') {
                display = step.options[parseInt(ans)] || ans;
            } else if (step.ui_type === 'multiple_choice') {
                display = Array.isArray(ans) ? ans.map(i => step.options[i]).join(', ') : ans;
            } else if (step.ui_type === 'circular_slider') {
                display = Object.entries(ans || {}).map(([k, v]) => `${k}: ${v}%`).join(' | ');
            } else if (step.ui_type === 'scale_5') {
                display = `${ans} / 5 ${t('admin.quest_review.modal.stars', 'Estrellas')}`;
            }

            return (
                <div key={idx} className="mb-4 bg-background p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-black text-foreground uppercase">{t('admin.quest_review.modal.step', 'Paso')} {idx + 1}</p>
                        <Badge variant="outline" className="text-[10px] uppercase text-slate-400 bg-background">{step.ui_type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="font-bold text-slate-800 mb-2">{step.content}</p>
                    <div className="p-3 bg-background rounded-xl border border-slate-200 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                        {display || t('admin.quest_review.modal.no_answer', 'Sin respuesta')}
                    </div>
                </div>
            );
        });
    };

    const getStatusBadge = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'approved') return <Badge className="bg-emerald-500 text-white font-black px-2 py-1">{t('admin.quest_review.status_badge.approved', 'APROBADA')}</Badge>;
        if (s === 'auto_approved') return <Badge className="bg-blue-500 text-white font-black px-2 py-1">{t('admin.quest_review.status_badge.auto_approved', 'AUTO-APROBADA')}</Badge>;
        if (s === 'rejected') return <Badge className="bg-red-500 text-white font-black px-2 py-1">{t('admin.quest_review.status_badge.rejected', 'RECHAZADA')}</Badge>;
        return <Badge variant="outline" className="font-black px-2 py-1 bg-amber-50 text-amber-600 border-amber-200">{t('admin.quest_review.status_badge.pending', 'PENDIENTE')}</Badge>;
    };

    const isReadOnlyMode = selectedReview?.review_status !== 'pending';

    return (
        <div className="space-y-6 pb-10">
            <Card className="border-b shadow-xl bg-background rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-background border-b border-gold-700 p-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 shadow-inner">
                            <PieChartIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black text-foreground">{t('admin.quest_review.analytics_title', 'Analítica de Participación')}</CardTitle>
                            <CardDescription className="font-medium text-foreground">{t('admin.quest_review.analytics_desc', 'Métricas reales por rol de usuario')}</CardDescription>
                        </div>
                    </div>
                    <Select value={selectedMissionChart} onValueChange={setSelectedMissionChart}>
                        <SelectTrigger className="w-full md:w-72 h-12 rounded-xl bg-background border-slate-200 shadow-sm font-bold">
                            <SelectValue placeholder="Filtrar misiones" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl font-medium">
                            <SelectItem value="all">{t('admin.quest_review.all_missions', 'Todas las Misiones (Global)')}</SelectItem>
                            {missionsList.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="p-8">
                    {chartLoading ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div> :
                     chartData.length === 0 ? <div className="text-center py-10 text-slate-400 font-bold italic">{t('admin.quest_review.no_data', 'Sin participaciones registradas')}</div> :
                     <div className="h-[300px]"><ResponsiveContainer><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">{chartData.map((entry, index) => <Cell key={index} fill={entry.color} strokeWidth={0} />)}</Pie><RechartsTooltip formatter={(value) => [`${value} ${t('admin.quest_review.tooltip_users', 'Usuarios')}`, t('admin.quest_review.tooltip_participation', 'Participación')]} contentStyle={{borderRadius: '15px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} /><Legend iconType="circle" wrapperStyle={{fontWeight: 'bold', paddingTop: '20px'}} /></PieChart></ResponsiveContainer></div>}
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">{t('admin.quest_review.title', 'Moderación de Misiones')}</h2>
                    <p className="text-slate-500 font-medium">{t('admin.quest_review.subtitle', 'Supervisa y recompensa el compromiso de la comunidad.')}</p>
                </div>
                
                {/* BOTÓN GLOBAL DE EXPORTACIÓN */}
                <Button 
                    onClick={handleExportCSV} 
                    variant="outline" 
                    className="gap-2 font-bold bg-background text-foreground border-emerald-200 hover:bg-background shadow-sm rounded-xl"
                >
                    <Download className="w-4 h-4" /> Exportar Respuestas a Excel
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-background p-1 rounded-2xl mb-6 h-14">
                    <TabsTrigger value="pending" className="rounded-xl font-black text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Clock className="w-4 h-4 mr-2" /> {t('admin.quest_review.tabs.pending', 'REVISIÓN PENDIENTE')}
                        {pendingReviews.length > 0 && <Badge className="ml-2 bg-blue-500 text-foreground border-0">{pendingReviews.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl font-black text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <CheckCircle className="w-4 h-4 mr-2" /> {t('admin.quest_review.tabs.history', 'HISTORIAL COMPLETO')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="bg-background rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-0">
                                <TableHead className="font-black text-foreground py-6 px-8">{t('admin.quest_review.table.user', 'USUARIO')}</TableHead>
                                <TableHead className="font-black text-foreground">{t('admin.quest_review.table.mission', 'MISIÓN')}</TableHead>
                                <TableHead className="font-black text-foreground">{t('admin.quest_review.table.reward', 'RECOMPENSA')}</TableHead>
                                <TableHead className="font-black text-foreground text-right pr-8">{t('admin.quest_review.table.action', 'ACCIÓN')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-blue-500" /></TableCell></TableRow> :
                             pendingReviews.length === 0 ? <TableRow><TableCell colSpan={4} className="py-20 text-center text-foreground font-bold italic">{t('admin.quest_review.no_pending', 'No hay misiones esperando revisión.')}</TableCell></TableRow> :
                             pendingReviews.map(r => (
                                <TableRow key={r.id} className="hover:bg-slate-50/80 border-slate-50 transition-colors">
                                    <TableCell className="py-6 px-8">
                                        <div className="font-black text-slate-800">{r.profiles?.name || 'Usuario'}</div>
                                        <div className="text-xs font-bold text-slate-400">{r.profiles?.email}</div>
                                    </TableCell>
                                    <TableCell><div className="flex items-center gap-2 font-bold text-slate-700"><FileText className="w-4 h-4 text-purple-500" /> {r.genesis_missions?.title}</div></TableCell>
                                    <TableCell><div className="flex gap-2"><Badge className="bg-background text-emerald-700 border-emerald-100 shadow-none font-black">+{r.credits_awarded} BP</Badge></div></TableCell>
                                    <TableCell className="text-right pr-8"><Button onClick={() => { setSelectedReview(r); setAdminFeedback(''); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-6 h-11">{t('admin.quest_review.evaluate_btn', 'EVALUAR')}</Button></TableCell>
                                </TableRow>
                             ))}
                        </TableBody>
                    </Table>
                </TabsContent>

                <TabsContent value="history" className="bg-background rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-0">
                                <TableHead className="font-black text-foreground py-6 px-8">{t('admin.quest_review.table.user', 'USUARIO')}</TableHead>
                                <TableHead className="font-black text-foreground">{t('admin.quest_review.table.mission', 'MISIÓN')}</TableHead>
                                <TableHead className="font-black text-foreground">{t('admin.quest_review.table.status', 'ESTADO')}</TableHead>
                                <TableHead className="font-black text-foreground text-right pr-8">{t('admin.quest_review.table.details', 'DETALLE')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingHistory ? <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-emerald-500" /></TableCell></TableRow> :
                             historyResponses.length === 0 ? <TableRow><TableCell colSpan={4} className="py-20 text-center text-foreground font-bold italic">{t('admin.quest_review.no_history', 'Historial vacío.')}</TableCell></TableRow> :
                             historyResponses.map(r => (
                                <TableRow key={r.id} className="hover:bg-slate-50/80 border-slate-50 transition-colors">
                                    <TableCell className="py-6 px-8">
                                        <div className="font-black text-slate-800">{r.profiles?.name}</div>
                                        <div className="text-xs font-bold text-slate-400">{format(new Date(r.created_at), 'MMM d, HH:mm')}</div>
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-600">{r.genesis_missions?.title}</TableCell>
                                    <TableCell>
                                        {getStatusBadge(r.review_status)}
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <Button variant="outline" onClick={() => { setSelectedReview(r); setAdminFeedback(r.admin_feedback || ''); }} className="text-slate-600 border-slate-200 hover:bg-slate-100 font-black h-10 rounded-xl">
                                            <Eye className="w-4 h-4 mr-2" /> {t('admin.quest_review.view_btn', 'VER RESPUESTA')}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                             ))}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedReview} onOpenChange={(o) => !o && !processing && setSelectedReview(null)}>
                <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl bg-white">
                    <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <Badge className="bg-emerald-100 text-emerald-700 font-black mb-2 px-3 uppercase tracking-tighter">
                                    {isReadOnlyMode ? t('admin.quest_review.modal.read_only', 'MODO SOLO LECTURA') : t('admin.quest_review.modal.guardian_eval', 'EVALUACIÓN DE GUARDIÁN')}
                                </Badge>
                                <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight">{selectedReview?.profiles?.name}</DialogTitle>
                                <p className="font-bold text-slate-400 text-sm mt-1 uppercase tracking-widest">{selectedReview?.genesis_missions?.title}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                {isReadOnlyMode && getStatusBadge(selectedReview?.review_status)}
                                <div className="bg-background p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                                    <Zap className={`w-6 h-6 ${isReadOnlyMode ? 'text-slate-400 fill-slate-200' : 'text-emerald-500 fill-emerald-500'}`} />
                                    <span className="text-2xl font-black text-slate-800">
                                        +{selectedReview?.credits_awarded || 0} 
                                        <span className="text-xs text-slate-400 block -mt-1 uppercase">{t('admin.quest_review.modal.rewards_label', 'Créditos')}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 max-h-[50vh] overflow-y-auto bg-slate-50/30">
                        <DialogDescription className="hidden" aria-hidden="true">Detalle de respuesta del usuario</DialogDescription> 
                        {renderAnswers()}
                        
                        {(!isReadOnlyMode || adminFeedback) && (
                            <div className={`mt-8 p-6 rounded-3xl border-2 ${isReadOnlyMode ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/50 border-dashed border-blue-100'}`}>
                                <h3 className={`text-lg font-black flex items-center gap-2 mb-3 ${isReadOnlyMode ? 'text-slate-600' : 'text-blue-900'}`}>
                                    <Sparkles className="w-5 h-5" /> {isReadOnlyMode ? t('admin.quest_review.feedback_guardian', 'FEEDBACK DEL GUARDIÁN') : t('admin.quest_review.feedback_label', 'FEEDBACK PARA EL USUARIO')}
                                </h3>
                                <Textarea 
                                    value={adminFeedback} 
                                    onChange={(e) => setAdminFeedback(e.target.value)} 
                                    placeholder={t('admin.quest_review.feedback_placeholder', 'Ej: ¡Excelente respuesta! Tu perspectiva es muy valiosa.')} 
                                    className={`min-h-[120px] rounded-2xl font-medium ${isReadOnlyMode ? 'bg-slate-100 border-slate-200 text-slate-600 resize-none' : 'bg-white border-slate-200 focus:ring-blue-500'}`} 
                                    disabled={isReadOnlyMode} 
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setSelectedReview(null)} className="font-black text-slate-400 hover:text-slate-800 h-12 rounded-xl">{t('admin.quest_review.modal.close', 'CERRAR')}</Button>
                        {!isReadOnlyMode && (
                            <div className="flex gap-4">
                                <Button variant="ghost" onClick={() => handleAction('reject')} className="text-red-500 hover:bg-red-50 font-black h-12 px-8 rounded-xl">{t('admin.quest_review.modal.reject', 'RECHAZAR')}</Button>
                                <Button onClick={() => handleAction('approve')} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 px-10 rounded-xl shadow-lg shadow-emerald-200">
                                    {processing ? <Loader2 className="animate-spin" /> : t('admin.quest_review.modal.approve_reward', 'APROBAR Y PREMIAR')}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminQuestReview;