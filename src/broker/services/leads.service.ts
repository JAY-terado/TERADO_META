import axiosClient from '../../../axiosinstance';
import Cookies from 'js-cookie';

export interface CustomerDetail {
  id: number;
  broker_id: number;
  customer_name: string;
  mobile_number: string;
  email: string;
  status: number;
  created_by: number;
  updated_by: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: number;
  project_name: string;
  project_type_id: number;
  project_status_id: number;
  launch_date: string;
  possession_date: string;
  country: string;
  state: string;
  city: string;
  area_locality: string;
  landmark: string;
  full_address: string;
  pincode: string;
  rera_registration_number: string;
  rera_registration_date: string;
  rera_expiry_date: string;
  towers: number;
  units: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: number;
  customer_id: number;
  lead_id: string;
  city: string;
  project: number;
  unit_type: string;
  budget: number;
  scheduled_visit_date: string;
  scheduled_visit_time: string;
  stage: number;
  status: number;
  created_by: number;
  updated_by: number;
  createdAt: string;
  updatedAt: string;
  customer_detail: CustomerDetail;
  project_detail: ProjectDetail;
}

export interface LeadsPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface LeadsResponse {
  success: boolean;
  data: Lead[];
  pagination: LeadsPagination;
}

export interface LeadsFilters {
  source?: string;
  tag?: string;
  filter?: string; // 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Custom Date'
  startDate?: string; // 'YYYY-MM-DD', used when filter='Custom Date'
  endDate?: string;   // 'YYYY-MM-DD', used when filter='Custom Date'
  assignedExecutive?: string | number;
}

export const getLeads = async (
  page = 1,
  limit = 50,
  search = '',
  projectId?: string,
  stage?: string,
  filters?: LeadsFilters
): Promise<LeadsResponse> => {
  try {
    let url = `/leads?page=${page}&limit=${limit}&Search=${encodeURIComponent(search)}`;
    if (projectId) {
      url += `&project_id=${projectId}`;
    }
    if (stage) {
      url += `&stage=${stage}`;
    }
    if (filters?.source) {
      url += `&source=${encodeURIComponent(filters.source)}`;
    }
    if (filters?.tag) {
      url += `&tag=${encodeURIComponent(filters.tag)}`;
    }
    if (filters?.filter) {
      url += `&filter=${encodeURIComponent(filters.filter)}`;
      if (filters.filter === 'Custom Date') {
        if (filters.startDate) url += `&start_date=${filters.startDate}`;
        if (filters.endDate)   url += `&end_date=${filters.endDate}`;
      }
    }
    if (filters?.assignedExecutive) {
      url += `&assigned_executive=${filters.assignedExecutive}`;
    }
    const response = await axiosClient.get(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as LeadsResponse;
    }
    throw error;
  }
};

export const importLeadsBulk = async (file: File, nameOverride?: string, projectId?: string, projectName?: string): Promise<{ success: boolean; message?: string; count?: number }> => {
  try {
    const formData = new FormData();
    const finalFile = nameOverride
      ? new File([file], nameOverride, { type: file.type })
      : file;
    formData.append('file', finalFile);
    if (projectId) {
      formData.append('project_id', projectId);
    }
    if (projectName) {
      formData.append('project_name', projectName);
    }
    const response = await axiosClient.post('/leads/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const STAGE_LABELS: Record<number, string> = {
  [-1]: 'Not Interested',
  0: 'New lead',
  1: 'Verified',
  2: 'Checked In',
  3: 'Negotiation',
  4: 'Booked',
};

export const STAGE_COLORS: Record<number, string> = {
  [-1]: 'bg-amber-50 text-amber-700 border border-amber-200',
  0: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  1: 'bg-blue-50 text-blue-700 border border-blue-100',
  2: 'bg-sky-50 text-sky-700 border border-sky-100',
  3: 'bg-purple-50 text-purple-700 border border-purple-100',
  4: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

export interface SoftDeleteLeadResponse {
  success: boolean;
  message: string;
  data?: {
    lead_id: number;
    lead_code: string;
    deletedVisits: number;
    deletedVisitAllocations: number;
    deletedLeadAllocations: number;
    deletedBookings: number;
  };
}

export const softDeleteLead = async (id: number | string): Promise<SoftDeleteLeadResponse> => {
  try {
    const rawToken = typeof window !== 'undefined'
      ? sessionStorage.getItem('token') || Cookies.get('token') || localStorage.getItem('token') || ''
      : '';
    const headers: Record<string, string> = {};
    if (rawToken) {
      headers.Authorization = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
    }

    const response = await axiosClient.post(`/leads/delete/${id}`, {}, { headers });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as SoftDeleteLeadResponse;
    }
    throw error;
  }
};

export interface BulkSoftDeleteLeadsResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const bulkSoftDeleteLeads = async (leadIds: (number | string)[]): Promise<BulkSoftDeleteLeadsResponse> => {
  try {
    const rawToken = typeof window !== 'undefined'
      ? sessionStorage.getItem('token') || Cookies.get('token') || localStorage.getItem('token') || ''
      : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (rawToken) {
      headers.Authorization = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
    }

    const numericIds = leadIds.map(id => Number(id)).filter(id => !isNaN(id));
    const payload = { lead_ids: numericIds };

    const response = await axiosClient.post('/leads/bulk-delete', payload, { headers });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as BulkSoftDeleteLeadsResponse;
    }
    throw error;
  }
};


