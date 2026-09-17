import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';
import { mockAdminUser } from '../mock/mockData';

export const RequireAuth: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Read auth token from storage or cookies
    let token = sessionStorage.getItem('token') || Cookies.get('token') || localStorage.getItem('token');

    // In prototype mode, ensure admin session is always available
    if (!token) {
      token = 'terado-admin-mock-token';
      sessionStorage.setItem('token', token);
      Cookies.set('token', token, { expires: 7 });
      Cookies.set('userRole', 'admin', { expires: 7 });
      Cookies.set('full_name', 'Terado Admin', { expires: 7 });
      localStorage.setItem('user', JSON.stringify(mockAdminUser));
    }

    setAuthenticated(true);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Loading Terado CRM...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
