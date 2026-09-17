import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';

interface RequireRoleProps {
  allowedRoles: ('broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner')[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles }) => {
  let userRole = Cookies.get('userRole') as 'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner' | undefined;
  
  // Default to admin for prototype preview
  if (!userRole) {
    userRole = 'admin';
    Cookies.set('userRole', 'admin', { expires: 7 });
  }

  // Admin has access to all prototype screens
  if (userRole === 'admin' || allowedRoles.includes(userRole)) {
    return <Outlet />;
  }
  
  return <Navigate to="/admin/dashboard" replace />;
};
