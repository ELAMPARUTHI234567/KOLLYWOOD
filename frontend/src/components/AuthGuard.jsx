import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * AuthGuard — wraps any route that requires a logged-in user.
 * If no JWT is present in localStorage the user is redirected to /login,
 * and the attempted URL is preserved so we can redirect back after login.
 */
export default function AuthGuard({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('kw_token');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
