import { useQuery } from '@tanstack/react-query';
import {
  reportsAnalyticsApi,
  type ReportsFilterParams,
} from '../api/reportsAnalytics';

export const queryKeys = {
  reports: {
    all: ['reports'] as const,
    executives: () => ['reports', 'sales-executives'] as const,
    analytics: (params: ReportsFilterParams) => ['reports', 'analytics', params] as const,
    actionCounts: (params: ReportsFilterParams) => ['reports', 'action-counts', params] as const,
    actionLeads: (params: ReportsFilterParams, activeTab: string, page: number) =>
      ['reports', 'action-leads', params, activeTab, page] as const,
    brokerPerformance: () => ['reports', 'broker-performance'] as const,
    adminStats: (params: ReportsFilterParams) => ['reports', 'admin-stats', params] as const,
  },
};

// 1. Sales Executives for Dropdown
export function useSalesExecutives() {
  return useQuery({
    queryKey: queryKeys.reports.executives(),
    queryFn: () => reportsAnalyticsApi.getSalesExecutives(),
    staleTime: 10 * 60 * 1000,
  });
}

// 2. Leads Analytics Data
export function useReportsAnalytics(params: ReportsFilterParams) {
  return useQuery({
    queryKey: queryKeys.reports.analytics(params),
    queryFn: () => reportsAnalyticsApi.getAnalytics(params),
    staleTime: 3 * 60 * 1000,
  });
}

// 3. Exact Action Taken & No Action Counts
export function useReportsActionCounts(params: ReportsFilterParams) {
  return useQuery({
    queryKey: queryKeys.reports.actionCounts(params),
    queryFn: () => reportsAnalyticsApi.getActionCounts(params),
    staleTime: 3 * 60 * 1000,
  });
}

// 4. Modal Action Leads (Paginated, only enabled when modal is opened!)
export function useReportsActionLeads(
  params: ReportsFilterParams,
  activeTab: 'taken' | 'noAction',
  page: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.reports.actionLeads(params, activeTab, page),
    queryFn: () => reportsAnalyticsApi.getActionLeads(params, activeTab, page),
    enabled,
    staleTime: 1 * 60 * 1000,
  });
}

// 5. Broker Performance
export function useBrokerPerformance() {
  return useQuery({
    queryKey: queryKeys.reports.brokerPerformance(),
    queryFn: () => reportsAnalyticsApi.getBrokerPerformance(),
    staleTime: 5 * 60 * 1000,
  });
}

// 6. Admin Stats
export function useAdminStats(params: ReportsFilterParams) {
  return useQuery({
    queryKey: queryKeys.reports.adminStats(params),
    queryFn: () => reportsAnalyticsApi.getAdminStats(params),
    staleTime: 3 * 60 * 1000,
  });
}
