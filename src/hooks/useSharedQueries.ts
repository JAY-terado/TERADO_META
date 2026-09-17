import { useQuery } from '@tanstack/react-query';
import { getNotifications, type NotificationItem } from '../pages/api/notifications';
import { getUsers, type UserApiResponse } from '../admin/api/users';
import { getProjectsDropdownList, type ProjectDropdownItem } from '../pages/api/projects';
import axiosClient from '../../axiosinstance';

export const sharedQueryKeys = {
  notifications: (page = 1, limit = 10) => ['notifications', 'in-app', page, limit] as const,
  salesUsers: () => ['users', 'sales-options'] as const,
  projectsDropdown: () => ['projects', 'dropdown-list'] as const,
  userProfile: () => ['users', 'profile'] as const,
};

// 1. In-App Notifications Hook (Used across all role layouts via NotificationBell)
export function useNotificationsQuery(page = 1, limit = 10) {
  return useQuery({
    queryKey: sharedQueryKeys.notifications(page, limit),
    queryFn: async () => {
      const res = await getNotifications(page, limit);
      return res?.data ?? [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// 2. Sales Users/Executives Options Hook (Used in Lead filters, assignment dropdowns, modals)
export function useSalesUsersQuery() {
  return useQuery({
    queryKey: sharedQueryKeys.salesUsers(),
    queryFn: async () => {
      const res = await getUsers('', 1, 1000);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data
          .filter((u: UserApiResponse) => u.role === 'SALES' || (u.role as string)?.toUpperCase() === 'SALES')
          .map((u: UserApiResponse) => ({
            id: u.id,
            name: u.full_name || u.email || `User #${u.id}`,
            role: u.role,
            email: u.email,
            mobile_number: u.mobile_number,
          }));
      }
      return [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

// 3. Projects Dropdown List Hook (Header project selector, lead creation, forms)
export function useProjectsDropdownQuery() {
  return useQuery({
    queryKey: sharedQueryKeys.projectsDropdown(),
    queryFn: async (): Promise<ProjectDropdownItem[]> => {
      const res = await getProjectsDropdownList();
      return res?.data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

// 4. User Profile Hook (Used across all role layouts and dashboards for current user info & permissions)
export function useUserProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sharedQueryKeys.userProfile(),
    queryFn: async () => {
      const res = await axiosClient.get('/users/profile');
      return res.data?.data || res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}
