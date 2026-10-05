import { BarChart3, Users, Building2, UserCheck, SlidersHorizontal, Phone, Settings2, BellRing, Percent, User, ShieldCheck } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path?: string;
  icon: any;
  children?: {
    name: string;
    path: string;
    icon?: any;
  }[];
}

export const adminNavigation: NavigationItem[] = [
  { name: 'Reports & Analytics', path: '/admin/dashboard', icon: BarChart3 },
  { name: 'All Leads', path: '/admin/leads', icon: Phone },
  { name: 'Manage Brokers', path: '/admin/brokers', icon: Users },
  { name: 'Manage Projects', path: '/admin/projects', icon: Building2 },
  { name: 'User Management', path: '/admin/users', icon: UserCheck },
  {
    name: 'System Settings',
    icon: SlidersHorizontal,
    children: [
      { name: 'Field Settings', path: '/admin/settings', icon: Settings2 },
      { name: 'Event Templates', path: '/admin/templates', icon: BellRing },
      { name: 'Manage Commission', path: '/admin/commission-plans', icon: Percent },
      { name: 'Facebook Connect', path: '/admin/facebook-integration', icon: Users },
      { name: 'Permissions', path: '/admin/permissions', icon: ShieldCheck }
    ]
  },
  { name: 'Profile', path: '/admin/profile', icon: User }
];


