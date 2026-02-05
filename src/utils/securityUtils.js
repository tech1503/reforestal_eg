import { supabase } from '@/lib/customSupabaseClient';

/**
 * Basic Input Sanitization
 * Removes common XSS vectors and trims whitespace.
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

/**
 * Validates email format strictly
 */
export const isValidEmail = (email) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Simple client-side rate limiter using localStorage
 * Prevents rapid-fire API calls from the UI.
 * @param {string} key - Unique key for the action (e.g., 'create_contribution')
 * @param {number} limit - Number of actions allowed
 * @param {number} windowMs - Time window in milliseconds
 */
export const checkRateLimit = (key, limit = 5, windowMs = 60000) => {
  const storageKey = `rl_${key}`;
  const now = Date.now();
  const record = JSON.parse(localStorage.getItem(storageKey) || '{"count": 0, "startTime": 0}');

  if (now - record.startTime > windowMs) {
    // Reset window
    localStorage.setItem(storageKey, JSON.stringify({ count: 1, startTime: now }));
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  localStorage.setItem(storageKey, JSON.stringify(record));
  return true;
};

/**
 * Logs sensitive admin actions to the database via secure RPC
 */
export const logAdminAction = async (actionType, targetTable, targetId, details) => {
  try {
    const { error } = await supabase.rpc('log_admin_action', {
      p_action_type: actionType,
      p_target_table: targetTable,
      p_target_id: targetId,
      p_details: details
    });
    
    if (error) console.error("Audit Log Failed:", error);
  } catch (err) {
    console.error("Audit Log Exception:", err);
  }
};

/**
 * CSRF Protection Helper
 * Generates a random token and stores it in session storage.
 * Forms should include this token and validate it before submission.
 */
export const generateCSRFToken = () => {
  const token = crypto.randomUUID();
  sessionStorage.setItem('csrf_token', token);
  return token;
};

export const validateCSRFToken = (token) => {
  const stored = sessionStorage.getItem('csrf_token');
  return token === stored;
};