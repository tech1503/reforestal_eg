import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const UserNotificationCenter = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        
        const channel = supabase.channel(`user_notif_${user.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, fetchNotifications]);

    const handleMarkRead = async (id) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleClearAll = async () => {
        const ids = notifications.map(n => n.id);
        if (ids.length > 0) {
             await supabase.from('notifications').update({ is_read: true }).in('id', ids);
             setNotifications(notifications.map(n => ({ ...n, is_read: true })));
             setUnreadCount(0);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-foreground hover:text-[#063127] hover:bg-[#5b8370]/20 dark:hover:text-white dark:hover:bg-white/10">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[85vw] sm:w-[400px] flex flex-col">
                <SheetHeader className="mb-4">
                    <div className="flex justify-between items-center">
                        <SheetTitle className="flex items-center gap-2 text-foreground">
                            {t('common.notifications', 'Notifications')} 
                            {/* AQUÍ HICIMOS EL BADGE MÁS PEQUEÑO */}
                            {unreadCount > 0 && <Badge className="bg-red-500 text-white shadow-sm border-none text-[10px] px-1.5 py-0 h-5 flex items-center">{unreadCount} {t('user_notifications.new', 'New')}</Badge>}
                        </SheetTitle>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-foreground">
                                {t('user_notifications.mark_all_read', 'Mark all read')}
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {loading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gold" /></div>
                    ) : notifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            <p>{t('user_notifications.empty', "You're all caught up!")}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    className={`p-4 rounded-xl border transition-all ${n.is_read ? 'bg-card border-border opacity-70' : 'bg-[#5b8370]/10 dark:bg-gold/5 border-gold/40 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className={`text-sm ${n.is_read ? 'font-medium text-foreground/70' : 'font-bold text-[#063127] dark:text-gold'}`}>
                                            {t(n.title, n.metadata || {})} 
                                        </h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                            {format(new Date(n.created_at), 'MMM d, HH:mm')}
                                        </span>
                                    </div>

                                    <p className={`text-sm mb-3 ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        {t(n.message, n.metadata || {})}
                                    </p>
                                    
                                    {!n.is_read && (
                                        <div className="flex justify-end">
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-7 text-xs text-[#5b8370] dark:text-gold hover:text-white hover:bg-[#063127] dark:hover:bg-gold/20 dark:hover:text-gold"
                                                onClick={() => handleMarkRead(n.id)}
                                            >
                                                <Check className="w-3 h-3 mr-1" /> {t('user_notifications.mark_read', 'Mark Read')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};


export default UserNotificationCenter;