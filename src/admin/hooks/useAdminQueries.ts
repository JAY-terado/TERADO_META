import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../axiosinstance';
import { getUsers, type GetUsersResponse } from '../api/users';
import { getAllProjects, type GetAllProjectsResponse } from '../../pages/api/projects';

export interface UseAdminBrokersParams {
  page: number;
  limit: number;
  search: string;
  activeTab: 'All' | 'Active' | 'Pending' | 'Suspended';
}

export interface UseAdminProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UseActionLeadsParams {
  tab: 'taken' | 'noAction';
  page: number;
  limit: number;
  search?: string;
  salesExecutiveId?: string;
  projectId?: string;
  tag?: string;
}

export interface UseActionTasksParams {
  page: number;
  limit: number;
  status: string;
  search?: string;
  salesUser?: string;
  priority?: string;
}

export const adminQueryKeys = {
  all: ['admin'] as const,
  brokers: (params: UseAdminBrokersParams) => ['admin', 'brokers', params] as const,
  projects: (params: UseAdminProjectsParams) => ['admin', 'projects', params] as const,
  users: (search: string, page: number, limit: number, projectId?: number | string | null) =>
    ['admin', 'users', { search, page, limit, projectId }] as const,
  actionLeads: (params: UseActionLeadsParams) => ['admin', 'action-leads', params] as const,
  actionTasks: (params: UseActionTasksParams) => ['admin', 'action-tasks', params] as const,
};

// 1. Admin Brokers Query
export function useAdminBrokersQuery(params: UseAdminBrokersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.brokers(params),
    queryFn: async () => {
      let filterParam = '';
      if (params.activeTab === 'Active') {
        filterParam = '&filter=approved&approvedByAdmin=approved';
      } else if (params.activeTab === 'Pending') {
        filterParam = '&filter=pending&approvedByAdmin=pending';
      } else if (params.activeTab === 'Suspended') {
        filterParam = '&filter=suspended&approvedByAdmin=suspended';
      }

      const res = await axiosClient.get(
        `/auth/brokers?page=${params.page}&limit=${params.limit}&search=${encodeURIComponent(params.search)}${filterParam}`
      );
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
  });
}

// 2. Admin Users Query
export function useAdminUsersQuery(
  search: string = '',
  page: number = 1,
  limit: number = 10,
  projectId?: number | string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: adminQueryKeys.users(search, page, limit, projectId),
    queryFn: async (): Promise<GetUsersResponse> => {
      return await getUsers(search, page, limit, projectId);
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

// 3. Action Leads Query (Action Taken / No Action tabs)
export function useActionLeadsQuery(params: UseActionLeadsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.actionLeads(params),
    queryFn: async () => {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
      };

      if (params.salesExecutiveId && params.salesExecutiveId !== 'All') {
        apiParams.sales_executive_id = params.salesExecutiveId;
      }
      if (params.search) {
        apiParams.Search = params.search;
        apiParams.search = params.search;
      }
      if (params.projectId && params.projectId !== 'All') {
        apiParams.project_id = params.projectId;
        apiParams.project = params.projectId;
      }
      if (params.tag && params.tag !== 'All') {
        apiParams.tag = params.tag;
      }

      const endpoint = params.tab === 'taken'
        ? '/leads/analytics/action-taken'
        : '/leads/analytics/no-action';

      const res = await axiosClient.get(endpoint, { params: apiParams });
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

// 4. Action Tasks Query (Admin and Sales task list)
export function useActionTasksQuery(params: UseActionTasksParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.actionTasks(params),
    queryFn: async () => {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
      };

      if (params.status && params.status !== 'ALL') {
        apiParams.status = params.status;
      }
      if (params.salesUser && params.salesUser !== 'All') {
        apiParams.sales_user = params.salesUser;
        apiParams.sales_executive_id = params.salesUser;
      }
      if (params.search) {
        apiParams.search = params.search;
        apiParams.Search = params.search;
      }
      if (params.priority && params.priority !== 'All') {
        apiParams.priority = params.priority;
      }

      const res = await axiosClient.get('/leads/tasks', { params: apiParams });
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

// 5. Admin Projects Query
export function useAdminProjectsQuery(params: UseAdminProjectsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.projects(params),
    queryFn: async (): Promise<GetAllProjectsResponse> => {
      return await getAllProjects(params);
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}
