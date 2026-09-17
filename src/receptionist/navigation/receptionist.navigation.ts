import { LayoutDashboard, Eye, UserCheck, Shield, User } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: any;
}

export const receptionistNavigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/receptionist/dashboard', icon: LayoutDashboard },
  { name: 'Appointment Allocation', path: '/receptionist/appointments', icon: UserCheck },
  { name: 'Profile', path: '/receptionist/profile', icon: User },
];
