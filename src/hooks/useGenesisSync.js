import { useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
// IMPRESCINDIBLE: Importar el motor para dar los créditos
import { executeGamificationAction } from '@/utils/gamificationEngine';

export const useGenesisSync = () => {
  const { user, fetchProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const syncGenesisProfile = async () => {
      // 1. Verificar si hay usuario y perfil pendiente en localStorage
      if (!user?.id) return;

      const pendingProfile = localStorage.getItem('pending_genesis_profile');
      const sessionId = localStorage.getItem('genesisQuestSessionId');

      if (pendingProfile) {
        try {
          console.log(`[GenesisSync] Sincronizando perfil: ${pendingProfile}...`);

          // 2. Actualizar el Perfil en la base de datos (Lena/Markus/David)
          const { error } = await supabase
            .from('profiles')
            .update({ genesis_profile: pendingProfile })
            .eq('id', user.id);

          if (error) throw error;

          // 3. Vincular el intento técnico (si existe session ID)
          if (sessionId) {
              await supabase
                  .from('genesis_quest_attempts')
                  .update({ user_id: user.id })
                  .eq('session_id', sessionId);
          }

          // 4. >>> PASO CLAVE: DAR LOS CRÉDITOS <<<
          // Esto busca la acción 'initial_profile_quest' que arreglamos con el SQL
          // y le suma los puntos al usuario.
          const gamificationResult = await executeGamificationAction(
              user.id, 
              'initial_profile_quest', 
              { 
                  profile: pendingProfile,
                  source: 'sync_after_registration' 
              }
          );

          // 5. Limpieza y Notificación
          localStorage.removeItem('pending_genesis_profile');
          localStorage.removeItem('genesisQuestSessionId');
          
          const rewardMsg = gamificationResult.success 
                ? ` (+${gamificationResult.points} IC)` 
                : '';

          toast({
              title: t('genesis.profile_assigned', 'Profile Synced!'),
              description: `${t('genesis.profile_synced_success', 'Your Genesis Profile is linked.')}${rewardMsg}`,
              className: "bg-emerald-50 border-emerald-200 text-emerald-800"
          });

          // 6. Refrescar estado global
          if (typeof fetchProfile === 'function') {
             await fetchProfile(user.id);
          }

        } catch (err) {
          console.error('[GenesisSync] Error syncing profile:', err);
          toast({
              variant: "destructive",
              title: t('common.error'),
              description: t('genesis.sync_error', 'Failed to sync your profile. Please try again.')
          });
        }
      }
    };

    syncGenesisProfile();
  }, [user?.id, fetchProfile, toast, t]);
};
