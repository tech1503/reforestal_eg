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
    const payloadMetadata = { ...(metadata || {}) };

    if (relatedActionId) {
      payloadMetadata.related_action_id = relatedActionId;
    }

    if (relatedUserId) {
      payloadMetadata.related_user_id = relatedUserId;
    }

    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_title: titleKey,
      p_message: messageKey,
      p_metadata: payloadMetadata,
      p_type: type,
    });

    if (error) {
      console.error('[NotificationUtils] Error creating notification:', error);
      return { success: false, error };
    }

    return { success: true, error: null, data };
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