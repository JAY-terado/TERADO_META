import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../axiosinstance';

export interface UseSalesAnalyticsParams {
  salesUserId?: string | null;
  timeFilter: string;
  customStartDate?: string;
  customEndDate?: string;
}

export interface UseSalesNoActionParams {
  salesUserId?: string | null;
  page: number;
  limit: number;
  search?: string;
  projectId?: string;
  tag?: string;
}

export const salesQueryKeys = {
  all: ['sales'] as const,
  analytics: (params: UseSalesAnalyticsParams) => ['sales', 'analytics', params] as const,
  noAction: (params: UseSalesNoActionParams) => ['sales', 'no-action', params] as const,
};

// 1. Sales Executive Analytics Query
export function useSalesAnalyticsQuery(params: UseSalesAnalyticsParams, options?: { enabled?: boolean }) {
  const isEnabled = Boolean(params.salesUserId) &&
    (params.timeFilter !== 'Custom' || Boolean(params.customStartDate && params.customEndDate)) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: salesQueryKeys.analytics(params),
    queryFn: async () => {
      const apiParams: any = {
        sales_executive_id: params.salesUserId,
        filter: params.timeFilter,
      };
      if (params.timeFilter === 'Custom') {
        apiParams.startDate = params.customStartDate;
        apiParams.endDate = params.customEndDate;
      }
      const res = await axiosClient.get('/leads/analytics/sales-executive', { params: apiParams });
      return res.data?.data || res.data;
    },
    enabled: isEnabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// 2. Sales No-Action Leads Query
export function useSalesNoActionQuery(params: UseSalesNoActionParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: salesQueryKeys.noAction(params),
    queryFn: async () => {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
      };
      if (params.salesUserId) {
        apiParams.sales_executive_id = params.salesUserId;
      }
      if (params.search) {
        apiParams.search = params.search;
      }
      if (params.projectId && params.projectId !== 'All') {
        apiParams.project_id = params.projectId;
      }
      if (params.tag && params.tag !== 'All') {
        apiParams.tag = params.tag;
      }

      const res = await axiosClient.get('/leads/analytics/no-action', { params: apiParams });
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}
