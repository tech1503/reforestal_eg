
import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useRealtimeProfileUpdate = () => {
  const { user, fetchProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    // 1. Profile Changes Subscription
    const profileSub = supabase
      .channel('realtime-profile-updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          const newData = payload.new;
          const oldData = payload.old;

          // Detect Role Change
          if (newData.role !== oldData.role) {
            toast({
              title: "Role Updated",
              description: `Your account role is now: ${newData.role}`,
              className: "bg-blue-50 border-blue-200"
            });
            await fetchProfile(user.id);
          }

          // Detect Genesis Profile Change
          if (newData.genesis_profile !== oldData.genesis_profile) {
             toast({
              title: "Genesis Profile Updated",
              description: `You are now a ${newData.genesis_profile}`,
              className: "bg-emerald-50 border-emerald-200"
            });
            await fetchProfile(user.id);
          }
        }
      )
      .subscribe();

    // 2. User Benefits Subscription
    const benefitsSub = supabase
      .channel('realtime-benefits-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_benefits', filter: `user_id=eq.${user.id}` },
        async (payload) => {
           if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             toast({
               title: "Membership Tier Updated",
               description: "Your benefits have been refreshed.",
               className: "bg-purple-50 border-purple-200"
             });
             await fetchProfile(user.id);
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSub);
      supabase.removeChannel(benefitsSub);
    };
  }, [user?.id, fetchProfile, toast]);
};
