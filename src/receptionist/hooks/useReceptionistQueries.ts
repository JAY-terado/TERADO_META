import { useQuery } from '@tanstack/react-query';
import {
  getVisitsDashboard,
  getVisitsList,
  type VisitsDashboardResponse,
} from '../../pages/api/registercustomer';

export interface UseVisitsDashboardParams {
  filter?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UseVisitsListParams {
  filter?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const receptionistQueryKeys = {
  all: ['receptionist'] as const,
  dashboard: (params: UseVisitsDashboardParams) => ['receptionist', 'dashboard', params] as const,
  appointments: (params: UseVisitsListParams) => ['receptionist', 'appointments', params] as const,
};

// 1. Receptionist Visits Dashboard Query
export function useReceptionistDashboardQuery(params: UseVisitsDashboardParams, options?: { enabled?: boolean }) {
  const isEnabled = (params.filter !== 'Custom' || Boolean(params.startDate && params.endDate)) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: receptionistQueryKeys.dashboard(params),
    queryFn: async (): Promise<VisitsDashboardResponse> => {
      return await getVisitsDashboard(params);
    },
    enabled: isEnabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// 2. Receptionist Appointments / Visits List Query
export function useReceptionistAppointmentsQuery(params: UseVisitsListParams, options?: { enabled?: boolean }) {
  const isEnabled = (params.filter !== 'Custom' || Boolean(params.startDate && params.endDate)) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: receptionistQueryKeys.appointments(params),
    queryFn: async () => {
      return await getVisitsList(params);
    },
    enabled: isEnabled,
    staleTime: 60 * 1000, // 1 minute
  });
}
