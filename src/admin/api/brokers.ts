import axiosClient from '../../../axiosinstance';

export interface BrokerDetailData {
  id: number;
  broker_name: string;
  company_name: string | null;
  mobile_number: string;
  alternate_mobile: string | null;
  email: string | null;
  pan_number: string | null;
  gst_number: string | null;
  rera_registration_number: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email_verified: number;
  mobile_verified: number;
  status: number;
  approvedByAdmin: number;
  created_by: number | null;
  updated_by: number | null;
  createdAt: string;
  updatedAt: string;
  totalProjects: number;
  totalLeads: number;
  totalVisits: number;
  totalBookings: number;
}

export interface GetBrokerDetailResponse {
  success: boolean;
  data?: BrokerDetailData;
  message?: string;
}

export const getBrokerDetail = async (brokerId: string | number): Promise<GetBrokerDetailResponse> => {
  try {
    const response = await axiosClient.get(`/auth/brokers/${brokerId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetBrokerDetailResponse;
    }
    throw error;
  }
};

export const getBrokersList = async (page = 1, limit = 100): Promise<any> => {
  try {
    const response = await axiosClient.get(`/auth/brokers?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export interface CreateBrokerPayload {
  broker_name: string;
  mobile_number: string;
  company_name?: string;
  alternate_mobile?: string;
  email?: string;
  pan_number?: string;
  gst_number?: string;
  rera_registration_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CreateBrokerResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    broker_name: string;
    [key: string]: any;
  };
}

export const createBroker = async (payload: CreateBrokerPayload): Promise<CreateBrokerResponse> => {
  try {
    const response = await axiosClient.post('/brokers/create', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateBrokerResponse;
    }
    throw error;
  }
};

