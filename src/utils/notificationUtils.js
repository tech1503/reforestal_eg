
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Creates a new notification for a user.
 * @param {string} userId - The UUID of the user to receive the notification.
 * @param {string} title - The title of the notification.
 * @param {string} message - The body message of the notification.
 * @param {string} [type='info'] - The type of notification (e.g., 'info', 'success', 'warning', 'scoring_updated', 'action_created').
 * @param {string} [relatedActionId=null] - Optional UUID of a related gamification action.
 * @param {string} [relatedUserId=null] - Optional UUID of a related user (e.g., for referrals).
 * @returns {Promise<{success: boolean, error: object|null}>}
 */
export async function createNotification(userId, title, message, type = 'info', relatedActionId = null, relatedUserId = null) {
  if (!userId) {
    console.error('[NotificationUtils] createNotification called without userId');
    return { success: false, error: { message: 'User ID is required' } };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
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
 * @param {string} notificationId - The UUID of the notification.
 * @returns {Promise<{success: boolean, error: object|null}>}
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
 * @param {string} userId - The UUID of the user.
 * @returns {Promise<{success: boolean, error: object|null}>}
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
