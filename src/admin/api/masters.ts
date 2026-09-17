import axiosClient from '../../../axiosinstance';

export interface CreateMasterPayload {
  name: string;
  slug: string;
  type?: string;
  master?: string;
}

export interface CreateMasterResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    name: string;
    slug: string;
    type?: string;
    master?: string;
  };
}

export interface MasterItem {
  id: number;
  name: string;
  slug: string;
  type?: string;
  master?: string;
  status: number;
  created_by: number | null;
  updated_by: number | null;
  createdAt: string;
  updatedAt: string;
  ismandate?: number;
}

export interface GetMastersParams {
  page?: number;
  limit?: number;
  name?: string;
  search?: string;
}

export interface GetMastersResponse {
  success: boolean;
  data: MasterItem[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export const createMaster = async (
  payload: CreateMasterPayload
): Promise<CreateMasterResponse> => {
  try {
    const res = await axiosClient.post('/masters', payload);
    clearMastersCache();
    return res.data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message || 'Failed to create master entry',
    };
  }
};

const inFlightMastersPromises = new Map<string, Promise<GetMastersResponse>>();
const cachedMastersMap = new Map<string, { data: GetMastersResponse; time: number }>();
const MASTERS_CACHE_TTL = 60 * 1000; // 1 minute

export const clearMastersCache = () => {
  cachedMastersMap.clear();
};

export const getMasters = async (
  params?: GetMastersParams
): Promise<GetMastersResponse> => {
  const key = JSON.stringify(params || {});
  const now = Date.now();
  if (inFlightMastersPromises.has(key)) {
    return inFlightMastersPromises.get(key)!;
  }
  const cached = cachedMastersMap.get(key);
  if (cached && now - cached.time < MASTERS_CACHE_TTL) {
    return cached.data;
  }

  const promise = (async () => {
    try {
      const res = await axiosClient.get('/masters', { params });
      cachedMastersMap.set(key, { data: res.data, time: Date.now() });
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        data: [],
      };
    } finally {
      inFlightMastersPromises.delete(key);
    }
  })();

  inFlightMastersPromises.set(key, promise);
  return promise;
};

export const updateMasterStatus = async (
  id: string | number,
  status: number
): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await axiosClient.put(`/masters/${id}`, { status });
    clearMastersCache();
    return res.data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message || 'Failed to update master status',
    };
  }
};

export interface BulkUpdateRecord {
  id?: number;
  name: string;
  slug: string;
  master: string;
  type: string;
  status?: number;
}

export interface BulkUpdateResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const bulkUpdateMasters = async (
  payload: { records: BulkUpdateRecord[] }
): Promise<BulkUpdateResponse> => {
  try {
    const res = await axiosClient.put('/masters/bulk-update', payload);
    clearMastersCache();
    return res.data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message || 'Failed bulk update',
    };
  }
};

