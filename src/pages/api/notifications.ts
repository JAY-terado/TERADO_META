import Cookies from 'js-cookie';
import axiosClient from '../../../axiosinstance';

export interface NotificationItem {
  id: number;
  recipientId?: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;

  // Backwards compatibility fields
  event_name: string;
  what_occurs: string;
  created_by?: number;
  created_by_name?: string;
  created_by_role?: string;
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface NotificationsResponse {
  success: boolean;
  data: NotificationItem[];
  pagination?: PaginationInfo;
}

export interface NotificationDetailResponse {
  success: boolean;
  data: NotificationItem;
}

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token') || Cookies.get('token');
    if (token) {
      return {
        Authorization: token
      };
    }
  }
  return {};
};

// 1. GET /notifications/in-app?page=1&limit=10
export const getNotifications = async (page = 1, limit = 10): Promise<NotificationsResponse> => {
  try {
    const response = await axiosClient.get('/notifications/in-app', {
      params: { page, limit },
      headers: getAuthHeaders(),
    });
    
    // Adapter mapping to ensure seamless backwards compatibility
    if (response.data && Array.isArray(response.data.data)) {
      response.data.data = response.data.data.map((item: any) => ({
        ...item,
        event_name: item.title || item.event_name || 'System Alert',
        what_occurs: item.message || item.what_occurs || '',
        message: item.message || item.what_occurs || '',
        created_by_name: item.created_by_name || 'System',
        created_by_role: item.created_by_role || 'System',
      }));
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as NotificationsResponse;
    }
    throw error;
  }
};

// Fetch individual notification detail
export const getNotificationDetail = async (id: number | string): Promise<NotificationDetailResponse> => {
  try {
    // Fetch a larger page size or check locally first. If not found, search with limit 100
    const response = await axiosClient.get('/notifications/in-app', {
      params: { page: 1, limit: 100 },
      headers: getAuthHeaders(),
    });
    
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const found = response.data.data.find((item: any) => String(item.id) === String(id));
      if (found) {
        // Map fields
        const mapped: NotificationItem = {
          ...found,
          event_name: found.title || found.event_name || 'System Alert',
          what_occurs: found.message || found.what_occurs || '',
          message: found.message || found.what_occurs || '',
          created_by_name: found.created_by_name || 'System',
          created_by_role: found.created_by_role || 'System',
        };
        return {
          success: true,
          data: mapped,
        };
      }
    }
    
    return {
      success: false,
      message: `Notification with ID ${id} not found.`
    } as any;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as NotificationDetailResponse;
    }
    throw error;
  }
};

// 2. PATCH /notifications/in-app/:id/read
export const markNotificationAsRead = async (id: number | string): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    const response = await axiosClient.patch(`/notifications/in-app/${id}/read`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// 3. PATCH /notifications/in-app/read-all
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axiosClient.patch('/notifications/in-app/read-all', {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};
