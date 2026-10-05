import axiosClient from '../../../axiosinstance';
import Cookies from 'js-cookie';
import { mockAdminUser } from '../../mock/mockData';

export interface LoginOtpResponse {
  success: boolean;
  message: string;
}

export const requestLoginOtp = async (identifier: string): Promise<LoginOtpResponse> => {
  try {
    const payload: { email?: string; mobile_number?: string } = {};
    if (identifier.includes('@')) {
      payload.email = identifier;
    } else {
      payload.mobile_number = identifier.replace(/[^0-9]/g, '');
    }

    const response = await axiosClient.post('/auth/login/request-otp', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as LoginOtpResponse;
    }
    throw error;
  }
};

export interface UserPermissions {
  can_create_lead: number;
  can_update_lead: number;
  is_otp_mandatory_on_lead_creation: number;
  can_create_broker?: number;
  can_update_broker?: number;
  is_otp_mandatory_on_broker_creation?: number;
}

export const getUserPermissions = (): UserPermissions | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user_permissions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    const cookieRaw = Cookies.get('user_permissions');
    if (cookieRaw) {
      const parsed = JSON.parse(cookieRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u?.permissions && typeof u.permissions === 'object') {
        localStorage.setItem('user_permissions', JSON.stringify(u.permissions));
        return u.permissions;
      }
    }
  } catch (e) {
    console.error('Failed to read user permissions:', e);
  }
  return mockAdminUser.permissions;
};

export const saveUserPermissions = (permissions: UserPermissions) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('user_permissions', JSON.stringify(permissions));
    Cookies.set('user_permissions', JSON.stringify(permissions), { expires: 7 });
  } catch (e) {
    console.error('Failed to save user permissions:', e);
  }
};

let inFlightProfilePromise: Promise<UserPermissions | null> | null = null;
let lastProfileFetchTime = 0;
const PROFILE_CACHE_TTL = 30 * 1000;

export const fetchAndStoreUserProfile = async (): Promise<UserPermissions | null> => {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem('token') || Cookies.get('token');
  if (!token) return null;

  const now = Date.now();
  if (inFlightProfilePromise) {
    return inFlightProfilePromise;
  }
  if (now - lastProfileFetchTime < PROFILE_CACHE_TTL) {
    const saved = getUserPermissions();
    if (saved) return saved;
  }

  inFlightProfilePromise = (async () => {
    try {
      const res = await axiosClient.get('/users/profile');
      lastProfileFetchTime = Date.now();
      if (res.data) {
        const payload = res.data.data || res.data;
        const permissions: UserPermissions | undefined =
          payload?.permissions || res.data.permissions || payload?.user?.permissions;
        if (permissions && typeof permissions === 'object') {
          saveUserPermissions(permissions);
          return permissions;
        }
      }
    } catch (err) {
      console.warn('Using prototype fallback user permissions');
    } finally {
      inFlightProfilePromise = null;
    }
    saveUserPermissions(mockAdminUser.permissions);
    return mockAdminUser.permissions;
  })();

  return inFlightProfilePromise;
};

export interface LoginVerifyResponse {
  success: boolean;
  message: string;
  token?: string;
  refresh_token?: string;
  user?: {
    id: number;
    full_name: string;
    contact_number: string;
    role: string;
    broker_id?: number;
    email?: string;
    permissions?: UserPermissions;
    [key: string]: any;
  };
}

export const verifyLoginOtp = async (identifier: string, otp: number): Promise<LoginVerifyResponse> => {
  try {
    const payload: { email?: string; mobile_number?: string; otp: number } = { otp };
    if (identifier.includes('@')) {
      payload.email = identifier;
    } else {
      payload.mobile_number = identifier.replace(/[^0-9]/g, '');
    }

    const response = await axiosClient.post('/auth/login/verify-otp', payload);
    const headerToken = response.headers?.['authorization'] || response.headers?.['Authorization'];

    return {
      ...response.data,
      token: headerToken || response.data?.token,
    };
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as LoginVerifyResponse;
    }
    throw error;
  }
};

export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  try {
    const response = await axiosClient.post('/auth/login/refresh-token', {
      refresh_token: refreshToken,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as RefreshTokenResponse;
    }
    throw error;
  }
};

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export const logout = async (refreshToken: string): Promise<LogoutResponse> => {
  try {
    const response = await axiosClient.post('/auth/logout', {
      refresh_token: refreshToken,
    });
    return response.data;
  } catch (error: any) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
};

export const clearAuthSession = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem('user');

    Cookies.remove('token');
    Cookies.remove('userRole');
    Cookies.remove('user_permissions');
    Cookies.remove('full_name');
    Cookies.remove('is_profile_completed');
    Cookies.remove('userToken');
  }
};

export const logoutUser = async () => {
  if (typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logout(refreshToken);
      } catch (error) {
        console.error('Logout request failed', error);
      }
    }
    clearAuthSession();
    window.location.replace('/login');
  }
};
