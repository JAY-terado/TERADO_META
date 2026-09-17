import axiosClient from '../../../axiosinstance';

export interface BrokerProfile {
  id: number;
  broker_name?: string;
  full_name?: string;
  company_name: string | null;
  mobile_number: string;
  contact_number?: string;
  alternate_mobile: string | null;
  email: string;
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
  createdAt: string;
  updatedAt: string;
  gender?: string | null;
  basic_details?: {
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
  } | null;
}

export interface BrokerProfileResponse {
  success: boolean;
  data: BrokerProfile;
}

let inFlightProfilePromise: Promise<BrokerProfileResponse> | null = null;
let cachedProfileRes: BrokerProfileResponse | null = null;
let lastProfileFetchTime = 0;
const PROFILE_CACHE_TTL = 30 * 1000; // 30 seconds

export const clearBrokerProfileCache = () => {
  cachedProfileRes = null;
};

export const getBrokerProfile = async (): Promise<BrokerProfileResponse> => {
  const now = Date.now();
  if (inFlightProfilePromise) return inFlightProfilePromise;
  if (cachedProfileRes && now - lastProfileFetchTime < PROFILE_CACHE_TTL) {
    return cachedProfileRes;
  }

  inFlightProfilePromise = (async () => {
    try {
      const response = await axiosClient.get('/users/profile');
      cachedProfileRes = response.data;
      lastProfileFetchTime = Date.now();
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as BrokerProfileResponse;
      }
      throw error;
    } finally {
      inFlightProfilePromise = null;
    }
  })();

  return inFlightProfilePromise;
};

export interface UpdateBrokerProfilePayload {
  gst_number?: string;
  rera_registration_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  alternate_number?: string;
  gender?: string;
  email?: string;
}

export interface UpdateBrokerProfileResponse {
  success: boolean;
  message?: string;
}

export const updateBrokerProfile = async (
  payload: UpdateBrokerProfilePayload
): Promise<UpdateBrokerProfileResponse> => {
  try {
    const response = await axiosClient.post('/users/profile', payload);
    clearBrokerProfileCache();
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as UpdateBrokerProfileResponse;
    }
    throw error;
  }
};

