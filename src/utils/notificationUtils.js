import { supabase } from '@/lib/customSupabaseClient';

/**
 * @param {string} userId 
 * @param {string} titleKey 
 * @param {string} messageKey 
 * @param {object} [metadata={}] 
 * @param {string} [type='info'] 
 * @param {string} [relatedActionId=null]
 * @param {string} [relatedUserId=null] 
 * @returns {Promise<{success: boolean, error: object|null}>}
 */
export async function createNotification(userId, titleKey, messageKey, metadata = {}, type = 'info', relatedActionId = null, relatedUserId = null) {
  if (!userId) {
    console.error('[NotificationUtils] createNotification called without userId');
    return { success: false, error: { message: 'User ID is required' } };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: titleKey,     
        message: messageKey, 
        metadata: metadata,  
        notification_type: type,
        related_action_id: relatedActionId,
        related_user_id: relatedUserId,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[NotificationUtils] Error creating notification:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[NotificationUtils] Unexpected error creating notification:', err);
    return { success: false, error: err };
  }
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return { success: false, error: { message: 'Notification ID is required' } };

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationUtils] Error marking notification as read:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[NotificationUtils] Unexpected error marking notification as read:', err);
    return { success: false, error: err };
  }
}

/**
 * Marks all notifications as read for a specific user.
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) return { success: false, error: { message: 'User ID is required' } };

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[NotificationUtils] Error marking all notifications as read:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[NotificationUtils] Unexpected error marking all notifications as read:', err);
    return { success: false, error: err };
  }
}