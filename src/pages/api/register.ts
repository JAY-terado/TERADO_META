import axiosClient from '../../../axiosinstance';

export interface OtpResponse {
  success: boolean;
  message: string;
}

export const requestEmailOtp = async (email: string): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/auth/request-otp', { email });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export const verifyEmailOtp = async (email: string, otp: number): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/auth/verify-otp', { email, otp });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export interface RegisterBrokerPayload {
  broker_name: string;
  company_name?: string;
  mobile_number: string;
  alternate_mobile?: string;
  email?: string;
  pan_number?: string;
  gst_number?: string;
  rera_registration_number?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  status?: number;
}

export interface RegisterBrokerResponse {
  success: boolean;
  message: string;
}

export const registerBroker = async (payload: RegisterBrokerPayload): Promise<RegisterBrokerResponse> => {
  try {
    const response = await axiosClient.post('/auth/register', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as RegisterBrokerResponse;
    }
    throw error;
  }
};

export {
  createBroker,
  type CreateBrokerPayload,
  type CreateBrokerResponse,
} from '../../admin/api/brokers';

export const requestMobileOtp = async (mobileNumber: string): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/auth/request-otp', { mobile_number: mobileNumber });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export const verifyMobileOtp = async (mobileNumber: string, otp: string | number): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/auth/verify-otp', { mobile_number: mobileNumber, otp: String(otp) });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};
