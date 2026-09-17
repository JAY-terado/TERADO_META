import { LayoutDashboard, Activity, Clock, Users, Eye, Building2, Landmark, User } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: any;
}

export const salesNavigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/sales/dashboard', icon: LayoutDashboard },
  { name: 'Activity', path: '/sales/activity', icon: Activity },
  { name: 'Pending Actions', path: '/sales/pending-actions', icon: Clock },
  // { name: 'Inventory', path: '/sales/inventory', icon: Building2 },
  { name: 'Bookings', path: '/sales/bookings', icon: Landmark },
  { name: 'Profile', path: '/sales/profile', icon: User },
];
