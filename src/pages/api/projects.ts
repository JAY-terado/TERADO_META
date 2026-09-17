import axiosClient from '../../../axiosinstance';

export interface CreateProjectPayload {
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
  towers: number;
  units: number;
  rera_registration_number: string;
  rera_registration_date: string;
  rera_expiry_date: string;
  status: number;
  amenities: number[];
  project_flat_types: number[];
}

export interface CreateProjectResponse {
  success: boolean;
  message: string;
}

export const createProject = async (payload: CreateProjectPayload): Promise<CreateProjectResponse> => {
  try {
    const response = await axiosClient.post('/projects/create', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateProjectResponse;
    }
    throw error;
  }
};

export interface ProjectApiResponse {
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
  towers: number;
  units: number;
  rera_registration_number: string;
  rera_registration_date: string;
  rera_expiry_date: string;
  facilities: string[];
  unit_configs: {
    unit_type: string;
    budgets: string[];
  }[];
}

export interface GetAllProjectsResponse {
  success: boolean;
  message?: string;
  count?: number;
  total?: number;
  data: ProjectApiResponse[];
}

export const getAllProjects = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<GetAllProjectsResponse> => {
  try {
    const response = await axiosClient.get('/projects/get-all', { params });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetAllProjectsResponse;
    }
    throw error;
  }
};

export const getProjectsList = async (): Promise<GetAllProjectsResponse> => {
  try {
    const response = await axiosClient.get('/projects/list');
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetAllProjectsResponse;
    }
    throw error;
  }
};

export interface ProjectBookingsResponse {
  success: boolean;
  count: number;
  data: any[];
}

export const getProjectBookings = async (projectId: string | number): Promise<ProjectBookingsResponse> => {
  try {
    const response = await axiosClient.get(`/bookings/project/${projectId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as ProjectBookingsResponse;
    }
    throw error;
  }
};

export const getMyBookings = async (params?: {
  filter?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await axiosClient.get('/bookings/my-bookings', { params });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export interface GetProjectDetailResponse {
  success: boolean;
  message?: string;
  data: any;
}

export const getProjectDetail = async (id: number | string): Promise<GetProjectDetailResponse> => {
  try {
    const response = await axiosClient.get(`/projects/get/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetProjectDetailResponse;
    }
    throw error;
  }
};

export const updateProject = async (id: number | string, payload: any): Promise<any> => {
  try {
    const response = await axiosClient.put(`/projects/update/${id}`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const deleteProject = async (id: number | string): Promise<any> => {
  try {
    const response = await axiosClient.post(`/projects/delete/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export interface ProjectDropdownItem {
  id: number;
  project_name: string;
}

export interface ProjectsDropdownResponse {
  success: boolean;
  count: number;
  data: ProjectDropdownItem[];
}

let inFlightDropdownPromise: Promise<ProjectsDropdownResponse> | null = null;
let lastDropdownFetchTime = 0;
let cachedDropdownRes: ProjectsDropdownResponse | null = null;
const DROPDOWN_CACHE_TTL = 30 * 1000;

export const getProjectsDropdownList = async (): Promise<ProjectsDropdownResponse> => {
  const now = Date.now();
  if (inFlightDropdownPromise) return inFlightDropdownPromise;
  if (cachedDropdownRes && now - lastDropdownFetchTime < DROPDOWN_CACHE_TTL) {
    return cachedDropdownRes;
  }

  inFlightDropdownPromise = (async () => {
    try {
      const response = await axiosClient.get('/projects/dropdown-list');
      cachedDropdownRes = response.data;
      lastDropdownFetchTime = Date.now();
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as ProjectsDropdownResponse;
      }
      throw error;
    } finally {
      inFlightDropdownPromise = null;
    }
  })();

  return inFlightDropdownPromise;
};

