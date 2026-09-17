import React from 'react';
import { Navigate } from 'react-router-dom';

export const RouteGuard: React.FC = () => {
  // Always route directly to Admin Dashboard in prototype
  return <Navigate to="/admin/dashboard" replace />;
};
