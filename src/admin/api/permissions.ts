import axiosClient from '../../../axiosinstance';

export interface RolePermissionItem {
  id: number;
  role: string;
  can_create_lead: number; // 0 or 1
  can_update_lead: number; // 0 or 1
  is_otp_mandatory_on_lead_creation: number; // 0 or 1
  can_create_broker?: number; // 0 or 1
  can_update_broker?: number; // 0 or 1
  is_otp_mandatory_on_broker_creation?: number; // 0 or 1
}

export interface GetRolePermissionsResponse {
  success: boolean;
  data: RolePermissionItem[];
  message?: string;
}

export interface UpdateRolePermissionPayload {
  can_create_lead: number;
  can_update_lead: number;
  is_otp_mandatory_on_lead_creation: number;
  can_create_broker?: number;
  can_update_broker?: number;
  is_otp_mandatory_on_broker_creation?: number;
}

export const getRolePermissions = async (): Promise<GetRolePermissionsResponse> => {
  try {
    const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
    const path = isV1Base ? '/masters/role-permissions' : '/v1/masters/role-permissions';
    const response = await axiosClient.get(path);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetRolePermissionsResponse;
    }
    throw error;
  }
};

export const updateRolePermissions = async (
  role: string,
  payload: UpdateRolePermissionPayload
): Promise<any> => {
  try {
    const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
    const path = isV1Base ? `/masters/role-permissions/${role}` : `/v1/masters/role-permissions/${role}`;
    const response = await axiosClient.put(path, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};
