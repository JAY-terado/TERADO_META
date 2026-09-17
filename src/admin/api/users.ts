import axiosClient from '../../../axiosinstance';

export interface OtpResponse {
  success: boolean;
  message?: string;
}

export interface CreateUserPayload {
  full_name: string;
  contact_number: string;
  email: string;
  role: 'SALES' | 'RECEIPTIONIST' | 'RECEPTIONIST' | 'CALLING';
  address_line_1?: string;
  address_line_2?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gender?: string;
}

export interface CreateUserResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    full_name: string;
    email: string;
    contact_number: string;
    role: string;
  };
}

/**
 * Step 1: Request OTP for user creation
 */
export const requestUserCreationOtp = async (email: string): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/users/request-otp', { email });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

/**
 * Step 2: Verify OTP for user creation
 */
export const verifyUserCreationOtp = async (email: string, otp: number): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/users/verify-otp', { email, otp });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

/**
 * Step 3: Finalize user creation
 */
export const createInternalUser = async (payload: CreateUserPayload): Promise<CreateUserResponse> => {
  try {
    const response = await axiosClient.post('/users/create', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateUserResponse;
    }
    throw error;
  }
};

export interface UserApiResponse {
  id: number;
  broker_name?: string;
  full_name?: string;
  company_name?: string | null;
  mobile_number?: string;
  alternate_mobile?: string | null;
  contact_number?: string;
  email: string;
  pan_number?: string;
  gst_number?: string | null;
  rera_registration_number?: string | null;
  address_line_1?: string;
  address_line_2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  email_verified?: number;
  mobile_verified?: number;
  status?: number;
  created_by?: number | null;
  updated_by?: number | null;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
}

export interface GetUsersResponse {
  success: boolean;
  count: number;
  data: UserApiResponse[];
}

export const getUsers = async (
  search: string = '',
  page: number = 1,
  limit: number = 10,
  projectId?: number | string | null
): Promise<GetUsersResponse> => {
  try {
    let url = `/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`;
    if (projectId) {
      url += `&project_id=${projectId}`;
    }
    const response = await axiosClient.get(url);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetUsersResponse;
    }
    throw error;
  }
};

export interface DeactivateUserResponse {
  success: boolean;
  message?: string;
}

export const deactivateUser = async (userId: number): Promise<DeactivateUserResponse> => {
  try {
    const response = await axiosClient.post(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as DeactivateUserResponse;
    }
    throw error;
  }
};

export interface AssignedProject {
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
  amenities: number[];
  project_flat_types: any[];
  created_by: number | null;
  updated_by: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserBasicDetails {
  id: number;
  user_id: number;
  address_line_1: string | null;
  address_line_2: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  gender: string | null;
  alternate_number: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetailData {
  id: number;
  full_name: string;
  contact_number: string;
  email: string;
  role: string;
  created_by: string | number | null;
  updated_by: string | number | null;
  createdAt: string;
  updatedAt: string;
  basic_details: UserBasicDetails | null;
  assigned_projects: AssignedProject[];
}

export interface GetUserDetailResponse {
  success: boolean;
  data?: UserDetailData;
  activityLogs?: any[];
  message?: string;
}

export const getUserDetail = async (userId: string | number): Promise<GetUserDetailResponse> => {
  try {
    const response = await axiosClient.get(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetUserDetailResponse;
    }
    throw error;
  }
};

export const updateInternalUser = async (userId: number | string, payload: any): Promise<any> => {
  try {
    const response = await axiosClient.put(`/users/${userId}`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};



