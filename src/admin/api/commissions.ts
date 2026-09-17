import axiosClient from '../../../axiosinstance';

export interface CommissionTier {
  id: number;
  planId: number;
  minBookings: number;
  maxBookings: number | null;
  percentage: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPlan {
  id: number;
  planName: string;
  commissionType: 'FLAT' | 'TIERED';
  basePercentage: string | null;
  status: number;
  active?: number;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
  tiers: CommissionTier[];
}

export interface GetCommissionPlansResponse {
  success: boolean;
  data: CommissionPlan[];
  message?: string;
}

export const getCommissionPlans = async (): Promise<GetCommissionPlansResponse> => {
  try {
    // Check if baseUrl already ends with /v1
    const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
    const path = isV1Base ? '/commissions/plans' : '/v1/commissions/plans';
    
    const response = await axiosClient.get(path);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetCommissionPlansResponse;
    }
    throw error;
  }
};

export interface CreateCommissionPlanPayload {
  planName: string;
  commissionType: 'FLAT' | 'TIERED';
  basePercentage: number | null;
  active: number;
  tiers: {
    minBookings: number;
    maxBookings: number | null;
    percentage: number;
    startDate?: string | null;
    endDate?: string | null;
  }[];
}

export interface CreateCommissionPlanResponse {
  success: boolean;
  data?: CommissionPlan;
  message?: string;
}

export interface DeleteCommissionPlanResponse {
  success: boolean;
  message?: string;
}

export const createCommissionPlan = async (payload: CreateCommissionPlanPayload): Promise<CreateCommissionPlanResponse> => {
  try {
    const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
    const path = isV1Base ? '/commissions/plans' : '/v1/commissions/plans';
    const response = await axiosClient.post(path, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateCommissionPlanResponse;
    }
    throw error;
  }
};

export const deleteCommissionPlan = async (id: number): Promise<DeleteCommissionPlanResponse> => {
  try {
    const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
    const path = isV1Base ? `/commissions/plans/${id}` : `/v1/commissions/plans/${id}`;
    const response = await axiosClient.post(path);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as DeleteCommissionPlanResponse;
    }
    throw error;
  }
};

export interface UpdateCommissionPlanPayload {
  planName?: string;
  active: number;
  basePercentage?: number | null;
  tiers?: {
    minBookings: number;
    maxBookings: number | null;
    percentage: number;
    startDate?: string | null;
    endDate?: string | null;
  }[];
}

export interface UpdateCommissionPlanResponse {
  success: boolean;
  data?: CommissionPlan;
  message?: string;
}

export const updateCommissionPlan = async (id: number, payload: UpdateCommissionPlanPayload): Promise<UpdateCommissionPlanResponse> => {
  try {
    const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
    const path = isV1Base ? `/commissions/plans/${id}` : `/v1/commissions/plans/${id}`;
    const response = await axiosClient.put(path, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as UpdateCommissionPlanResponse;
    }
    throw error;
  }
};


