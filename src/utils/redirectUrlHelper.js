
/**
 * Helper to generate secure redirect URLs for authentication flows
 * Supports Development, Staging, and Production environments dynamically
 */

export const getUpdatePasswordRedirectUrl = () => {
  // Get current origin (e.g., http://localhost:5173 or https://app.reforestal.com)
  const origin = window.location.origin;
  
  // Construct the full URL
  const url = `${origin}/update-password`;
  
  // Validate the constructed URL
  if (!validateRedirectUrl(url)) {
    console.error("Critical: Invalid redirect URL generated", url);
    throw new Error("Failed to generate a valid redirect URL");
  }

  return url;
};

export const getAuthRedirectUrl = () => {
  return `${window.location.origin}/auth`;
};

export const getDashboardRedirectUrl = () => {
  return `${window.location.origin}/dashboard`;
};

export const validateRedirectUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  
  // Security check: Ensure URL belongs to the same origin
  if (!url.startsWith(window.location.origin)) return false;
  
  return true;
};
