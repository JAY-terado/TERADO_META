import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import secureStorage from "./src/components/helper/secureStorage";
import Cookies from "js-cookie";
import {
  mockAdminUser,
  mockProjects,
  mockUsers,
  mockBrokers,
  mockLeads,
  mockAnalyticsData,
  mockStates,
  mockCities,
} from "./src/mock/mockData";

// ============================================================================
// Base URL & Environment Configuration
// ============================================================================
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.teradocrm.com/v1";

// Toggle mock mode: active in prototype mode
const USE_MOCK_API = true;

export const axiosClient = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
});

// ============================================================================
// In-Flight Request Deduplication & Micro-Caching
// ============================================================================
const inFlightGetRequests = new Map<string, Promise<any>>();
const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

export const clearAxiosDeduplicationCache = () => {
  inFlightGetRequests.clear();
};

// Helper to create mock AxiosResponse
const createMockResponse = (config: any, data: any, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: "OK",
  headers: { "content-type": "application/json" },
  config,
});

// Prototype Mock Dispatcher for seamless Meta verification demo
const handleMockRequest = async (config: any): Promise<AxiosResponse | null> => {
  const url = (config.url || "").toLowerCase();
  const method = (config.method || "get").toLowerCase();

  // Simulate minimal latency (40ms)
  await new Promise((resolve) => setTimeout(resolve, 40));

  // 1. Auth / Login
  if (url.includes("/auth/login/request-otp")) {
    return createMockResponse(config, {
      success: true,
      message: "OTP sent successfully. Demo code: 123456",
    });
  }

  if (url.includes("/auth/login/verify-otp")) {
    return createMockResponse(config, {
      success: true,
      message: "Identity verified successfully",
      token: "terado-admin-mock-jwt-token-meta-2026",
      user: mockAdminUser,
    });
  }

  if (url.includes("/auth/logout")) {
    return createMockResponse(config, {
      success: true,
      message: "Logged out successfully",
    });
  }

  // 2. User Profile
  if (url.includes("/users/profile")) {
    if (method === "post" || method === "put") {
      return createMockResponse(config, {
        success: true,
        message: "Profile updated successfully",
        data: { ...mockAdminUser, ...(config.data || {}) },
      });
    }
    return createMockResponse(config, {
      success: true,
      data: mockAdminUser,
    });
  }

  // 3. User Management
  if (url.includes("/users")) {
    return createMockResponse(config, {
      success: true,
      data: mockUsers,
      pagination: {
        totalItems: mockUsers.length,
        totalPages: 1,
        currentPage: 1,
        limit: 100,
      },
    });
  }

  // 4. Analytics & Reports
  if (url.includes("/leads/analytics/action-taken")) {
    return createMockResponse(config, {
      success: true,
      count: 1320,
      totalItems: 1320,
      pagination: { totalItems: 1320 },
    });
  }

  if (url.includes("/leads/analytics/no-action")) {
    return createMockResponse(config, {
      success: true,
      count: 162,
      totalItems: 162,
      pagination: { totalItems: 162 },
    });
  }

  if (url.includes("/leads/analytics")) {
    return createMockResponse(config, {
      success: true,
      data: mockAnalyticsData,
    });
  }

  // 5. Leads Management
  if (url.includes("/leads")) {
    if (method === "post" && (url.includes("/delete") || url.includes("/bulk-delete"))) {
      return createMockResponse(config, { success: true, message: "Lead status updated" });
    }
    if (method === "post" && url.includes("/import")) {
      return createMockResponse(config, {
        success: true,
        message: "Leads imported successfully from Meta Lead Ads template",
        count: 15,
      });
    }

    // Specific lead
    const match = url.match(/\/leads\/(\d+)/);
    if (match) {
      const leadId = parseInt(match[1], 10);
      const found = mockLeads.find((l) => l.id === leadId) || mockLeads[0];
      return createMockResponse(config, { success: true, data: found });
    }

    return createMockResponse(config, {
      success: true,
      data: mockLeads,
      pagination: {
        totalItems: mockLeads.length,
        totalPages: 1,
        currentPage: 1,
        limit: 50,
      },
    });
  }

  // 6. Projects
  if (url.includes("/projects")) {
    return createMockResponse(config, {
      success: true,
      data: mockProjects,
      pagination: {
        totalItems: mockProjects.length,
        totalPages: 1,
        currentPage: 1,
        limit: 20,
      },
    });
  }

  // 7. Brokers / Channel Partners
  if (url.includes("/brokers")) {
    return createMockResponse(config, {
      success: true,
      data: mockBrokers,
      pagination: {
        totalItems: mockBrokers.length,
        totalPages: 1,
        currentPage: 1,
        limit: 50,
      },
    });
  }

  // 8. Masters (States / Cities)
  if (url.includes("/masters/states") || url.includes("/masters/state")) {
    return createMockResponse(config, {
      success: true,
      data: mockStates,
    });
  }

  if (url.includes("/masters/cities") || url.includes("/masters/city")) {
    return createMockResponse(config, {
      success: true,
      data: mockCities[1] || [],
    });
  }

  // Default fallback for any remaining sub-endpoints
  return createMockResponse(config, {
    success: true,
    data: mockLeads[0],
  });
};

// ============================================================================
// Custom Adapter with Deduplication & Prototype Mock Layer
// ============================================================================
axiosClient.defaults.adapter = async (config) => {
  if (USE_MOCK_API) {
    const mockRes = await handleMockRequest(config);
    if (mockRes) return mockRes;
  }

  const method = (config.method || "get").toLowerCase();

  // Deduplicate GET requests
  if (method === "get") {
    let paramsKey = "";
    if (config.params) {
      try {
        paramsKey = JSON.stringify(config.params);
      } catch {
        paramsKey = String(config.params);
      }
    }
    const token =
      (config.headers as any)?.Authorization ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("token") || Cookies.get("token") || ""
        : "");
    const key = `GET:${config.baseURL || ""}:${config.url || ""}?${paramsKey}&auth=${token}`;

    if (inFlightGetRequests.has(key)) {
      const res = await inFlightGetRequests.get(key);
      return { ...res, config };
    }

    const requestPromise = (async () => {
      try {
        const response = await defaultAdapter(config);
        setTimeout(() => {
          inFlightGetRequests.delete(key);
        }, 1200);
        return response;
      } catch (err) {
        inFlightGetRequests.delete(key);
        throw err;
      }
    })();

    inFlightGetRequests.set(key, requestPromise);
    return requestPromise;
  }

  inFlightGetRequests.clear();
  return defaultAdapter(config);
};

// ============================================================================
// Request Interceptor: Attach Authorization Header
// ============================================================================
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("token") || Cookies.get("token");
      if (token && config.headers) {
        config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// Response Interceptor: Safe Passthrough (No Refresh Token Loop)
// ============================================================================
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default axiosClient;
