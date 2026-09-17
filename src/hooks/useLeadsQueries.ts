import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeads,
  softDeleteLead,
  type LeadsFilters,
  type LeadsResponse,
} from '../broker/services/leads.service';
import { getSalesLeadDetails, type GetSalesLeadDetailsResponse } from '../pages/api/registercustomer';

export interface UseLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  stage?: string;
  filters?: LeadsFilters;
}

export const leadsQueryKeys = {
  all: ['leads'] as const,
  lists: () => ['leads', 'list'] as const,
  list: (params: UseLeadsParams) => ['leads', 'list', params] as const,
  details: () => ['leads', 'detail'] as const,
  detail: (id: string | number) => ['leads', 'detail', String(id)] as const,
};

// 1. Leads Table List Query (Admin, Sales, Calling, CP, Broker)
export function useLeadsQuery(params: UseLeadsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadsQueryKeys.list(params),
    queryFn: async (): Promise<LeadsResponse> => {
      const res = await getLeads(
        params.page || 1,
        params.limit || 10,
        params.search || '',
        params.projectId,
        params.stage,
        params.filters
      );
      return res;
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// 2. Single Lead Details Query (Details view in /admin/leads/:id, etc.)
export function useLeadDetailsQuery(id?: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadsQueryKeys.detail(id || ''),
    queryFn: async (): Promise<GetSalesLeadDetailsResponse> => {
      if (!id) throw new Error('Lead ID is required');
      return await getSalesLeadDetails(id);
    },
    enabled: Boolean(id) && options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
}

// 3. Soft Delete Lead Mutation (Invalidates leads lists and details)
export function useSoftDeleteLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string | number) => softDeleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsQueryKeys.all });
    },
  });
}
