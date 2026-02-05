
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-darkBg">
        <Loader2 className="w-8 h-8 animate-spin text-[#17a277]" />
      </div>
    );
  }

  // 1. Not Authenticated -> Redirect to Auth
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 2. Role Verification
  if (allowedRoles.length > 0 && profile) {
    const userRole = profile.role || 'user';
    if (!allowedRoles.includes(userRole)) {
      // User has session but wrong role -> Redirect to Dashboard or Home
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
