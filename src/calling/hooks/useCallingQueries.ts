import { useQuery } from '@tanstack/react-query';
import {
  getCallingDashboard,
  getAssignedCallingLeads,
  type GetCallingDashboardResponse,
  type GetAssignedCallingLeadsResponse,
} from '../../pages/api/registercustomer';

export interface UseCallingDashboardParams {
  filter?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const callingQueryKeys = {
  all: ['calling'] as const,
  dashboard: (params: UseCallingDashboardParams) => ['calling', 'dashboard', params] as const,
  assignedLeads: () => ['calling', 'assigned-leads'] as const,
};

// 1. Calling Dashboard Query
export function useCallingDashboardQuery(params: UseCallingDashboardParams, options?: { enabled?: boolean }) {
  const isEnabled = (params.filter !== 'Custom' || Boolean(params.startDate && params.endDate)) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: callingQueryKeys.dashboard(params),
    queryFn: async (): Promise<GetCallingDashboardResponse> => {
      return await getCallingDashboard(params);
    },
    enabled: isEnabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// 2. Assigned Calling Leads Query
export function useAssignedCallingLeadsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: callingQueryKeys.assignedLeads(),
    queryFn: async (): Promise<GetAssignedCallingLeadsResponse> => {
      return await getAssignedCallingLeads();
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}
