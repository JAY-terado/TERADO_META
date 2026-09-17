import { LayoutDashboard, Users, BarChart3, ShieldCheck, User } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: any;
}

export const callingNavigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/calling/dashboard', icon: LayoutDashboard },
  { name: 'All Leads', path: '/calling/leads', icon: Users },
  { name: 'Visit Pass', path: '/calling/visit-pass', icon: ShieldCheck },
  { name: 'Profile', path: '/calling/profile', icon: User },
];
