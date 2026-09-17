import { LayoutDashboard, Users, User } from 'lucide-react';

export interface NavigationItem {
  name: string;
  path: string;
  icon: any;
}

export const channelPartnerNavigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/channel-partner/dashboard', icon: LayoutDashboard },
  { name: 'My Brokers', path: '/channel-partner/leads', icon: Users },
  { name: 'My Profile', path: '/channel-partner/profile', icon: User },
  // { name: 'Commissions Ledger', path: '/channel-partner/commissions', icon: Landmark },
  // { name: 'Project Gallery', path: '/channel-partner/projects', icon: Building2 },
];
