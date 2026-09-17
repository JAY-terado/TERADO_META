import { LayoutDashboard, UserCheck, ShieldCheck, IndianRupee, User, Users } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: any;
}

export const brokerNavigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/broker/dashboard', icon: LayoutDashboard },
  { name: 'Register Lead', path: '/broker/register-lead', icon: UserCheck },
  { name: 'My Leads', path: '/broker/leads', icon: Users },
  { name: 'Visit Pass', path: '/broker/visit-pass', icon: ShieldCheck },
  // { name: 'Commission', path: '/broker/commission', icon: IndianRupee },
  { name: 'Profile', path: '/broker/profile', icon: User },
];
