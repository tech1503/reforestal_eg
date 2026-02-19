import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Check, Trash2, User, Trophy, AlertCircle, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { createNotification } from '@/utils/notificationUtils'; 

const AdminNotificationCenter = () => {
    const { t } = useTranslation(); 
    const { toast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    profile:user_id (
                        email,
                        name,
                        role
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        const channel = supabase.channel('admin_notifications_global')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (_payload) => {
                fetchNotifications();
                toast({
                    title: t('admin.notifications.new_activity', 'New Activity'),
                    description: t('admin.notifications.new_msg_desc', 'A new notification has arrived.'),
                    className: "bg-blue-600 text-white"
                });
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [fetchNotifications, t, toast]); 

    const markAsRead = async (id) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const deleteNotification = async (id) => {
        await supabase.from('notifications').delete().eq('id', id);
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const openReplyModal = (notification) => {
        setSelectedNotification(notification);
        setReplyText(""); 
        setReplyModalOpen(true);
    };

    const sendReply = async () => {
        if (!replyText.trim() || !selectedNotification) return;
        setSendingReply(true);

        try {
            // AHORA USAMOS EL SISTEMA MULTILINGÜE PARA EL MENSAJE MANUAL DEL ADMIN
            await createNotification(
                selectedNotification.user_id,
                'notifications.admin_direct_reply.title', 
                'notifications.admin_direct_reply.message', 
                { replyText: replyText }, 
                'admin_reply'
            );

            await markAsRead(selectedNotification.id);

            toast({
                title: t('admin.notifications.reply_modal.success', 'Reply Sent'),
                description: t('admin.notifications.reply_modal.success_desc', 'The user has been notified.'),
                className: "bg-emerald-600 text-white"
            });

            setReplyModalOpen(false);
        } catch (error) {
            console.error("Error sending reply:", error);
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: "Failed to send reply."
            });
        } finally {
            setSendingReply(false);
        }
    };

    const getTypeStyles = (type) => {
        const tLower = type?.toLowerCase() || '';
        
        let style = { color: 'text-slate-600 bg-slate-50 border-slate-200', icon: <Bell className="w-3 h-3" /> };
        let labelKey = 'admin.notifications.types.system';

        if (tLower.includes('admin_alert') || tLower.includes('pioneer')) {
            style = { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <AlertCircle className="w-3 h-3" /> };
            labelKey = 'admin.notifications.types.pioneer';
        } else if (tLower.includes('gamification') || tLower.includes('quest')) {
            style = { color: 'text-purple-600 bg-purple-50 border-purple-200', icon: <Trophy className="w-3 h-3" /> };
            labelKey = 'admin.notifications.types.gamification';
        } else if (tLower.includes('bonus') || tLower.includes('credit')) {
            style = { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <Check className="w-3 h-3" /> };
            labelKey = 'admin.notifications.types.bonus';
        } else if (tLower.includes('reply')) {
             style = { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <MessageSquare className="w-3 h-3" /> };
             labelKey = 'admin.notifications.types.admin_reply';
        }

        return { ...style, labelKey };
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <Bell className="w-6 h-6 text-emerald-600" /> {t('admin.notifications.title', 'Global Notification Center')}
                    </h2>
                    <p className="text-slate-500">{t('admin.notifications.subtitle', 'Monitor requests and alerts.')}</p>
                </div>
                <Button variant="outline" onClick={fetchNotifications} disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Bell className="w-4 h-4"/>}
                    {t('admin.notifications.refresh', 'Refresh')}
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                {loading && notifications.length === 0 ? (
                    <div className="p-12 flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-full text-slate-400">
                        <Bell className="w-16 h-16 mb-4 opacity-10" />
                        <p>{t('admin.notifications.empty', 'No notifications found.')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map(n => {
                            const styles = getTypeStyles(n.notification_type);
                            const badgeLabel = t(styles.labelKey, n.notification_type?.replace(/_/g, ' ') || 'System');

                            // PARSEO DE METADATA IGUAL QUE EN EL DASHBOARD DE USUARIO
                            let meta = {};
                            if (typeof n.metadata === 'string') {
                                try { meta = JSON.parse(n.metadata); } catch(e) { }
                            } else if (n.metadata && typeof n.metadata === 'object') {
                                meta = n.metadata;
                            }

                            return (
                                <div key={n.id} className={`p-5 flex gap-4 transition-colors hover:bg-slate-50 ${n.is_read ? 'bg-white' : 'bg-blue-50/30'}`}>
                                    <div className="pt-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${n.is_read ? 'bg-slate-200' : 'bg-blue-500 shadow-sm shadow-blue-300 ring-2 ring-white'}`} />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            {/* APLICAMOS TRADUCCIÓN A TÍTULO */}
                                            <h4 className={`text-sm ${n.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                                                {t(n.title, meta)}
                                            </h4>
                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-4 font-mono">
                                                {format(new Date(n.created_at), 'MMM d, HH:mm')}
                                            </span>
                                        </div>

                                        {/* APLICAMOS TRADUCCIÓN A MENSAJE */}
                                        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                                            {t(n.message, meta)}
                                        </p>

                                        <div className="flex flex-wrap items-center justify-between pt-3 gap-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 ${styles.color}`}>
                                                    {styles.icon}
                                                    {badgeLabel}
                                                </Badge>

                                                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                    {n.profile ? (
                                                        <span className="font-medium text-slate-700">
                                                            {n.profile.email} 
                                                            <span className="text-slate-400 font-normal"> ({n.profile.name || 'No Name'})</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">User: {n.user_id?.slice(0,6)}...</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => openReplyModal(n)}>
                                                    <MessageSquare className="w-3 h-3" /> 
                                                    {t('admin.notifications.actions.reply', 'Reply')}
                                                </Button>

                                                {!n.is_read && (
                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => markAsRead(n.id)} title={t('admin.notifications.actions.mark_read')}>
                                                        <Check className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => deleteNotification(n.id)} title={t('admin.notifications.actions.delete')}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.notifications.reply_modal.title', 'Reply to User')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.notifications.reply_modal.desc', 'This message will appear in the user\'s dashboard notifications.')}
                            {selectedNotification && selectedNotification.profile && (
                                <div className="mt-2 text-xs font-mono bg-slate-100 p-1 rounded">
                                    To: {selectedNotification.profile.email}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea 
                            value={replyText} 
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t('admin.notifications.reply_modal.placeholder', 'Type your response here...')}
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
                            {sendingReply && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('admin.notifications.reply_modal.success', 'Send Reply')} <Send className="ml-2 w-3 h-3" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminNotificationCenter;