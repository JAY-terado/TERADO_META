import React from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export const RouteGuard: React.FC = () => {
  const userRole = Cookies.get('userRole');
  
  if (userRole === 'broker') {
    return <Navigate to="/broker/dashboard" replace />;
  }
  if (userRole === 'channel_partner') {
    return <Navigate to="/channel-partner/dashboard" replace />;
  }
  if (userRole === 'receptionist') {
    return <Navigate to="/receptionist/dashboard" replace />;
  }
  if (userRole === 'sales') {
    return <Navigate to="/sales/dashboard" replace />;
  }
  if (userRole === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (userRole === 'calling') {
    return <Navigate to="/calling/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
};
