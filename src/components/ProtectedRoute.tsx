import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) => {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if session has expired
  const sessionExpiresAt = localStorage.getItem('session_expires_at');
  const isSessionExpired = sessionExpiresAt ? Date.now() > parseInt(sessionExpiresAt) : false;

  if (!user || !profile || isSessionExpired) {
    if (isSessionExpired) {
      // Trigger logout cleanup asynchronously
      setTimeout(() => {
        signOut();
      }, 0);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to their respective dashboard if they don't have access
    if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
