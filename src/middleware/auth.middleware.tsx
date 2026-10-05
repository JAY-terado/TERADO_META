import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';
import { refreshAccessToken, clearAuthSession, fetchAndStoreUserProfile } from '../pages/api/login';

export const RequireAuth: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token') || Cookies.get('token') || localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (token && (refreshToken || !token.includes('mock'))) {
        setAuthenticated(true);
        setLoading(false);
        // Refresh permissions from /users/profile in background
        fetchAndStoreUserProfile();
        return;
      }

      if (refreshToken) {
        try {
          const res = await refreshAccessToken(refreshToken);
          if (res.success && res.token) {
            sessionStorage.setItem('token', res.token);
            Cookies.set('token', res.token, { expires: 7 });
            setAuthenticated(true);
            fetchAndStoreUserProfile();
          } else {
            clearAuthSession();
            setAuthenticated(false);
            window.location.replace('/login?error=session_expired');
            return;
          }
        } catch (err: any) {
          clearAuthSession();
          setAuthenticated(false);
          window.location.replace('/login?error=session_expired');
          return;
        }
      } else {
        clearAuthSession();
        setAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'refresh_token' && !e.newValue) {
        clearAuthSession();
        setAuthenticated(false);
        window.location.replace('/login?error=session_expired');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
