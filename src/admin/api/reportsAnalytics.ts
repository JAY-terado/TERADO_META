import axiosClient from '../../../axiosinstance';
import { getUsers } from './users';

export interface ProjectStat {
  projectId: number;
  projectName: string;
  totalLeads: number;
  totalVisits: number;
  totalNegotiations: number;
  totalBookings: number;
  totalCancelled: number;
}

export interface LeadListItem {
  lead_id: string;
  createdAt: string;
}

export interface AdminStats {
  totalLeads: number;
  totalVisits: number;
  totalNegotiations: number;
  totalBookings: number;
  totalCancelled: number;
  projectsStats: ProjectStat[];
  agreementValue?: number;
  totalAgreementValue?: number;
  leadsList?: LeadListItem[];
}

export interface AnalyticsResponseData {
  leadsDistribution?: {
    Leadsfrombroker?: number;
    Leadsfromreferral?: number;
    leadsdirect?: number;
    leadsFromBroker?: number;
    leadsFromReferral?: number;
    leadsDirect?: number;
  };
  LeadsDistribution?: {
    Leadsfrombroker?: number;
    Leadsfromreferral?: number;
    leadsdirect?: number;
  };
  LeadsPipelineStats?: {
    LeadsAssigned?: number;
    Leadsonwhichfollowupgettingtook?: number;
    LeadsOnwhichBookingDone?: number;
    leadsAssigned?: number;
    leadsOnWhichFollowUpGettingTook?: number;
    leadsOnWhichBookingDone?: number;
  };
  leadsPipelineStats?: {
    LeadsAssigned?: number;
    Leadsonwhichfollowupgettingtook?: number;
    LeadsOnwhichBookingDone?: number;
  };
  leadsSection?: {
    totalLeads: number;
    engagedLeads: number;
    LeadsOnWhichActionTaken?: number;
    LeadsOnwhichActionTaken?: number;
    leadsOnWhichActionTaken?: number;
    LeadsOnWhichActionNotTaken?: number;
    LeadsOnwhichActionNotTaken?: number;
    leadsOnWhichActionNotTaken?: number;
  };
  tasksSection?: {
    totalTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    completedTasks: number;
  };
  salesUserDistribution?: Array<{
    id: number;
    full_name: string;
    email: string;
    uniqueLeadsCount: number;
  }>;
}

export interface ReportsFilterParams {
  filter: 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Custom';
  startDate?: string;
  endDate?: string;
  selectedProjectId?: number | string | null;
  selectedExecutiveId?: string;
}

export interface ActionCounts {
  actionTakenCount: number;
  noActionCount: number;
}

export interface ActionLeadsResult {
  list: any[];
  totalCount: number;
}

export interface ExecutiveOption {
  id: string;
  name: string;
}

export const reportsAnalyticsApi = {
  // 1. Get Sales Executives for filter dropdown
  getSalesExecutives: async (): Promise<ExecutiveOption[]> => {
    try {
      const res = await getUsers('', 1, 1000);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data
          .filter((u: any) => u.role === 'SALES' || u.role === 'sales')
          .map((u: any) => ({
            id: String(u.id),
            name: u.full_name || u.email || `User #${u.id}`,
          }));
      }
    } catch (err) {
      console.error('Failed to fetch sales users for analytics filter:', err);
    }
    return [];
  },

  // 2. Fetch /leads/analytics
  getAnalytics: async (params: ReportsFilterParams): Promise<AnalyticsResponseData | null> => {
    let url = '/leads/analytics';
    const queryParams: string[] = [];
    if (params.selectedExecutiveId && params.selectedExecutiveId !== 'All') {
      queryParams.push(`sales_executive_id=${params.selectedExecutiveId}`);
    }
    if (params.selectedProjectId) {
      queryParams.push(`project_id=${params.selectedProjectId}`);
    }
    if (params.filter) {
      queryParams.push(`filter=${params.filter}`);
      if (params.filter === 'Custom' && params.startDate && params.endDate) {
        queryParams.push(`startDate=${params.startDate}`);
        queryParams.push(`endDate=${params.endDate}`);
      }
    }
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    const res = await axiosClient.get(url);
    if (res.data && res.data.success && res.data.data) {
      return res.data.data;
    }
    return null;
  },

  // 3. Fetch exact Action Taken & No Action Taken counts in a single unified promise
  getActionCounts: async (params: ReportsFilterParams): Promise<ActionCounts> => {
    const queryParams: any = { page: 1, limit: 1 };
    if (params.selectedExecutiveId && params.selectedExecutiveId !== 'All') {
      queryParams.sales_executive_id = params.selectedExecutiveId;
    }
    if (params.selectedProjectId) {
      queryParams.project_id = params.selectedProjectId;
    }
    if (params.filter) {
      queryParams.filter = params.filter;
      if (params.filter === 'Custom' && params.startDate && params.endDate) {
        queryParams.startDate = params.startDate;
        queryParams.endDate = params.endDate;
      }
    }

    const [takenRes, noActionRes] = await Promise.all([
      axiosClient.get('/leads/analytics/action-taken', { params: queryParams }),
      axiosClient.get('/leads/analytics/no-action', { params: queryParams }),
    ]);

    const takenCount =
      takenRes.data?.pagination?.totalItems ??
      takenRes.data?.pagination?.total ??
      takenRes.data?.count ??
      takenRes.data?.totalItems ??
      (Array.isArray(takenRes.data?.data) ? takenRes.data.data.length : 0);

    const noActionCount =
      noActionRes.data?.pagination?.totalItems ??
      noActionRes.data?.pagination?.total ??
      noActionRes.data?.count ??
      noActionRes.data?.totalItems ??
      (Array.isArray(noActionRes.data?.data) ? noActionRes.data.data.length : 0);

    return {
      actionTakenCount: takenCount,
      noActionCount: noActionCount,
    };
  },

  // 4. Fetch Action Leads list for Modal (paginated)
  getActionLeads: async (
    params: ReportsFilterParams,
    activeTab: 'taken' | 'noAction',
    page: number,
    limit = 10
  ): Promise<ActionLeadsResult> => {
    const queryParams: any = { page, limit };
    if (params.selectedExecutiveId && params.selectedExecutiveId !== 'All') {
      queryParams.sales_executive_id = params.selectedExecutiveId;
    }
    if (params.selectedProjectId) {
      queryParams.project_id = params.selectedProjectId;
    }
    if (params.filter) {
      queryParams.filter = params.filter;
      if (params.filter === 'Custom' && params.startDate && params.endDate) {
        queryParams.startDate = params.startDate;
        queryParams.endDate = params.endDate;
      }
    }

    const endpoint =
      activeTab === 'taken' ? '/leads/analytics/action-taken' : '/leads/analytics/no-action';

    const res = await axiosClient.get(endpoint, { params: queryParams });
    const resData = res.data;

    let list: any[] = [];
    if (Array.isArray(resData)) {
      list = resData;
    } else if (resData?.data && Array.isArray(resData.data)) {
      list = resData.data;
    } else if (resData?.leads && Array.isArray(resData.leads)) {
      list = resData.leads;
    } else if (resData?.rows && Array.isArray(resData.rows)) {
      list = resData.rows;
    } else if (resData?.result && Array.isArray(resData.result)) {
      list = resData.result;
    }

    const totalCount =
      resData?.pagination?.totalItems ??
      resData?.pagination?.total ??
      resData?.count ??
      resData?.totalItems ??
      list.length;

    return { list, totalCount };
  },

  // 5. Fetch Broker Performance Ranking
  getBrokerPerformance: async (): Promise<any[]> => {
    const res = await axiosClient.get('/leads/admin/broker-performance?page=1&limit=10');
    const d = res.data;
    if (d?.success && Array.isArray(d?.data)) {
      return d.data;
    } else if (Array.isArray(d)) {
      return d;
    }
    return [];
  },

  // 6. Fetch Admin Stats
  getAdminStats: async (params: ReportsFilterParams): Promise<AdminStats | null> => {
    let url = `/leads/admin/stats?filter=${params.filter}`;
    if (params.filter === 'Custom' && params.startDate && params.endDate) {
      url += `&startDate=${params.startDate}&endDate=${params.endDate}`;
    }
    if (params.selectedProjectId) {
      url += `&project_id=${params.selectedProjectId}`;
    }
    if (params.selectedExecutiveId && params.selectedExecutiveId !== 'All') {
      url += `&sales_executive_id=${params.selectedExecutiveId}`;
    }

    const res = await axiosClient.get(url);
    const d = res.data;
    if (d?.success && d?.data) {
      return d.data;
    } else if (d && typeof d === 'object') {
      return d;
    }
    return null;
  },
};
