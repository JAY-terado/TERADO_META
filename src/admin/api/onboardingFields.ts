import axiosClient, { getActiveApiBaseUrl } from '../../../axiosinstance';
import axios from 'axios';

export { getActiveApiBaseUrl };

export const setActiveApiBaseUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('terado_api_base_url', url.trim());
    } else {
      localStorage.removeItem('terado_api_base_url');
    }
  }
};

export interface InitCsrfResponse {
  success: boolean;
  csrfToken: string;
  branding?: any;
  endpointUrl: string;
  status: number;
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OnboardingFieldSetting {
  id: number;
  field_name: string;
  label?: string;
  step: number;
  is_required: number | boolean;
  type?: string;
  is_custom?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
  [key: string]: any;
}

export interface PublicOnboardingFieldsResponse {
  success: boolean;
  data: OnboardingFieldSetting[];
  customFields?: any[];
  message?: string;
}

export interface UpsertSettingItem {
  id: number;
  is_required: number | boolean;
  step: number;
}

export interface UpsertOnboardingFieldsPayload {
  settings: UpsertSettingItem[];
}

export interface UpsertOnboardingFieldsResponse {
  success: boolean;
  message: string;
  data?: any;
}

// 13 Standard Seeded Broker Onboarding Fields Metadata
export const SEEDED_BROKER_FIELDS: OnboardingFieldSetting[] = [
  { id: 1, field_name: 'broker_name', label: 'Broker / Partner Name', step: 1, is_required: 1, type: 'text' },
  { id: 2, field_name: 'company_name', label: 'Company / Firm Name', step: 1, is_required: 1, type: 'text' },
  { id: 3, field_name: 'mobile_number', label: 'Primary Mobile Number', step: 1, is_required: 1, type: 'text' },
  { id: 4, field_name: 'alternate_mobile', label: 'Alternate Mobile Number', step: 1, is_required: 0, type: 'text' },
  { id: 5, field_name: 'email', label: 'Official Email Address', step: 1, is_required: 1, type: 'email' },
  { id: 6, field_name: 'pan_number', label: 'PAN Card Number', step: 2, is_required: 1, type: 'text' },
  { id: 7, field_name: 'gst_number', label: 'GST Number', step: 2, is_required: 0, type: 'text' },
  { id: 8, field_name: 'rera_registration_number', label: 'RERA Registration Number', step: 2, is_required: 0, type: 'text' },
  { id: 9, field_name: 'address_line_1', label: 'Office Address Line 1', step: 3, is_required: 1, type: 'text' },
  { id: 10, field_name: 'address_line_2', label: 'Office Address Line 2', step: 3, is_required: 0, type: 'text' },
  { id: 11, field_name: 'city', label: 'City', step: 3, is_required: 1, type: 'text' },
  { id: 12, field_name: 'state', label: 'State', step: 3, is_required: 1, type: 'text' },
  { id: 13, field_name: 'pincode', label: 'Pincode', step: 3, is_required: 1, type: 'text' },
];

// Helper to get user-friendly label for any field
export const getFieldDisplayName = (fieldName: string, fallback?: string): string => {
  const matched = SEEDED_BROKER_FIELDS.find(f => f.field_name === fieldName);
  if (matched?.label) return matched.label;
  if (fallback) return fallback;
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ============================================================================
// CSRF Token Management (Imported from src/utils/csrf)
// ============================================================================

import {
  getCsrfToken,
  clearCsrfToken,
  ensureCsrfToken,
  fetchPublicInit,
} from '../../utils/csrf';

export {
  getCsrfToken,
  clearCsrfToken,
  ensureCsrfToken,
  fetchPublicInit,
};

/**
 * Fetch full details from /organisation-settings/public/init including branding & status
 */
export const fetchInitCsrfDetails = async (): Promise<InitCsrfResponse> => {
  const endpoint = '/organisation-settings/public/init';
  const baseUrl = getActiveApiBaseUrl();
  const res = await axiosClient.get(endpoint, {
    withCredentials: true,
  });

  const token =
    res.data?.csrfToken ||
    res.data?.data?.csrfToken ||
    res.data?.token ||
    res.data?.data?.token ||
    (typeof res.headers['x-csrf-token'] === 'string' ? res.headers['x-csrf-token'] : '') ||
    '';

  if (token && typeof window !== 'undefined') {
    (window as any).__csrfToken = token;
    sessionStorage.setItem('csrf_token', token);
    sessionStorage.setItem('terado_csrf_token', token);
  }

  return {
    success: true,
    csrfToken: token,
    branding: res.data?.branding,
    endpointUrl: `${baseUrl}${endpoint}`,
    status: res.status,
  };
};

// ============================================================================
// Public API: Fetch Onboarding Field Settings
// ============================================================================

/**
 * Step 1B: Fetch the Onboarding Fields
 * URL: /onboarding-field-settings/public?type=BROKER
 * Headers: x-csrf-token: <csrfToken>
 */
export const getPublicOnboardingFields = async (
  type: 'BROKER' | 'CUSTOMER' = 'BROKER'
): Promise<PublicOnboardingFieldsResponse> => {
  let csrf = '';
  try {
    csrf = await ensureCsrfToken();
  } catch (csrfErr: any) {
    console.warn('[CSRF] Could not generate token, attempting request:', csrfErr?.message || csrfErr);
  }

  const makeRequest = async (token: string) => {
    return await axiosClient.get('/onboarding-field-settings/public', {
      params: { type },
      headers: {
        ...(token ? { 'x-csrf-token': token } : {}),
      },
      withCredentials: true,
    });
  };

  try {
    let res: any;
    try {
      res = await makeRequest(csrf);
    } catch (firstErr: any) {
      // If 403 CSRF failure, refresh token and retry once
      if (firstErr?.response?.status === 403 || firstErr?.message?.includes('CSRF')) {
        console.warn('[CSRF] 403 received, refreshing token and retrying...');
        const initRes = await fetchPublicInit(true);
        csrf = initRes?.csrfToken || getCsrfToken(true);
        res = await makeRequest(csrf);
      } else {
        throw firstErr;
      }
    }

    // Normalize response body
    const rawData = res.data;
    let fieldsArray: OnboardingFieldSetting[] = [];
    let customFieldsArray: any[] = [];

    if (Array.isArray(rawData)) {
      fieldsArray = rawData;
    } else if (Array.isArray(rawData?.data?.standardFields)) {
      fieldsArray = rawData.data.standardFields;
      customFieldsArray = rawData.data?.customFields || [];
    } else if (Array.isArray(rawData?.data)) {
      fieldsArray = rawData.data;
      customFieldsArray = rawData.customFields || [];
    } else if (Array.isArray(rawData?.fields)) {
      fieldsArray = rawData.fields;
      customFieldsArray = rawData.customFields || [];
    } else if (Array.isArray(rawData?.data?.fields)) {
      fieldsArray = rawData.data.fields;
      customFieldsArray = rawData.data.customFields || [];
    }

    // Merge with seeded metadata for labels and types
    const enrichedFields = fieldsArray.map(f => {
      const match = SEEDED_BROKER_FIELDS.find(s => s.id === f.id || s.field_name === f.field_name);
      return {
        ...f,
        label: f.label || match?.label || getFieldDisplayName(f.field_name),
        step: Number(f.step) || match?.step || 1,
        is_required: Number(f.is_required) === 1 || f.is_required === true ? 1 : 0,
      };
    });

    return {
      success: true,
      data: enrichedFields.length > 0 ? enrichedFields : SEEDED_BROKER_FIELDS,
      customFields: customFieldsArray,
    };
  } catch (err: any) {
    console.warn('[OnboardingFields] Failed to fetch from backend, returning seeded defaults:', err?.message || err);
    return {
      success: false,
      data: SEEDED_BROKER_FIELDS,
      customFields: [],
      message: err?.response?.data?.message || err.message,
    };
  }
};

// ============================================================================
// Admin API: Upsert Onboarding Field Settings
// ============================================================================

/**
 * Step 2: Test the Admin "Upsert" API (Dashboard View)
 * URL: /onboarding-field-settings/upsert
 * Method: POST
 * Headers: Authorization: Bearer <ADMIN_TOKEN>, Content-Type: application/json
 * Payload: { "settings": [ { "id": 2, "is_required": 1, "step": 1 }, ... ] }
 */
export const upsertOnboardingFieldSettings = async (
  payload: UpsertOnboardingFieldsPayload | UpsertSettingItem[]
): Promise<UpsertOnboardingFieldsResponse> => {
  const body: UpsertOnboardingFieldsPayload = Array.isArray(payload)
    ? { settings: payload }
    : payload;

  // Format booleans to 1 / 0 if required by backend schema
  const formattedBody: UpsertOnboardingFieldsPayload = {
    settings: body.settings.map(s => ({
      id: Number(s.id),
      is_required: s.is_required === 1 || s.is_required === true ? 1 : 0,
      step: Number(s.step),
    })),
  };

  try {
    const res = await axiosClient.post('/onboarding-field-settings/upsert', formattedBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    return {
      success: res.data?.success !== false,
      message: res.data?.message || 'Settings updated successfully',
      data: res.data?.data,
    };
  } catch (err: any) {
    console.error('[OnboardingFields] Upsert failed:', err);
    return {
      success: false,
      message: err?.response?.data?.message || err.message || 'Failed to update field settings',
    };
  }
};
