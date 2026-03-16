
import { supabase } from '@/lib/customSupabaseClient';

/**
 * 
 * @param {string} userId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteUserCascade = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('admin_delete_user', {
      target_user_id: userId
    });

    if (error) throw error;
    if (!data) throw new Error('Delete function returned unsuccessful status.');

    return { success: true };
  } catch (error) {
    console.error('[userService] Error in deleteUserCascade:', error.message);
    return { success: false, error: error.message };
  }
};