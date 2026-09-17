import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import secureStorage from "./src/components/helper/secureStorage";
import toast from "react-hot-toast";
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

// Toggle mock mode: active when in prototype mode or when live API is not configured
const USE_MOCK_API =
  process.env.NEXT_PUBLIC_ENVIROMENT === "PROTOTYPE" ||
  !baseUrl ||
  baseUrl.includes("api.teradocrm.com") ||
  baseUrl.includes("192.168.");

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

  // Simulate subtle real-world network latency (100ms - 200ms)
  await new Promise((resolve) => setTimeout(resolve, 120));

  // 1. Auth / Login
  if (url.includes("/auth/login/request-otp")) {
    return createMockResponse(config, {
      success: true,
      message: "OTP sent successfully to registered mobile. (Demo OTP: 123456)",
    });
  }

  if (url.includes("/auth/login/verify-otp")) {
    return createMockResponse(config, {
      success: true,
      message: "Identity verified successfully",
      token: "terado-admin-mock-jwt-token-meta-2026",
      refresh_token: "terado-admin-mock-refresh-token",
      user: mockAdminUser,
    });
  }

  if (url.includes("/auth/login/refresh-token")) {
    return createMockResponse(config, {
      success: true,
      token: "terado-admin-mock-jwt-token-meta-2026-refreshed",
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

    // Check for specific lead id
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

  // Fallback for any customer OTP / lead detail sub-endpoints
  if (url.includes("/customers/request-otp") || url.includes("/customers/verify-otp")) {
    return createMockResponse(config, {
      success: true,
      message: "Customer OTP verification successful",
    });
  }

  if (url.includes("/customers") || url.includes("/sales/leads")) {
    return createMockResponse(config, {
      success: true,
      data: mockLeads[0],
    });
  }

  return null;
};

// ============================================================================
// Custom Adapter with Deduplication & Prototype Mock Layer
// ============================================================================
axiosClient.defaults.adapter = async (config) => {
  // If mock mode is active, check if request matches prototype endpoints
  if (USE_MOCK_API) {
    const mockRes = await handleMockRequest(config);
    if (mockRes) return mockRes;
  }

  const method = (config.method || "get").toLowerCase();

  // Deduplicate idempotent GET requests
  if (method === "get") {
    let paramsKey = "";
    if (config.params) {
      if (typeof config.params === "string") {
        paramsKey = config.params;
      } else if (config.params instanceof URLSearchParams) {
        paramsKey = config.params.toString();
      } else if (typeof config.params === "object") {
        try {
          const sortedKeys = Object.keys(config.params).sort();
          const sortedObj: Record<string, any> = {};
          for (const k of sortedKeys) {
            sortedObj[k] = (config.params as any)[k];
          }
          paramsKey = JSON.stringify(sortedObj);
        } catch {
          paramsKey = JSON.stringify(config.params);
        }
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

  // Clear in-flight cache on any mutation (POST, PUT, PATCH, DELETE)
  inFlightGetRequests.clear();
  return defaultAdapter(config);
};

// ============================================================================
// Auth Session Helpers
// ============================================================================
const clearAuthSessionDirect = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_permissions");
    Cookies.remove("token");
    Cookies.remove("userRole");
    Cookies.remove("user_permissions");
    Cookies.remove("full_name");
    Cookies.remove("is_profile_completed");
    Cookies.remove("userToken");
    secureStorage.removeItem("type");
  }
};

const redirectToLogin = (reason = "") => {
  if (typeof window !== "undefined") {
    clearAuthSessionDirect();
    const searchParam = reason ? `?error=${reason}` : "";
    window.location.replace(`/login${searchParam}`);
  }
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
// Response Interceptor: Token Refresh & Session Timeout
// ============================================================================
let isRefreshing = false;
let failedQueue: { resolve: (token: any) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const attemptRefreshAndRetry = async (originalRequest: any) => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then((token) => {
        originalRequest.headers.Authorization = token;
        return axiosClient(originalRequest);
      })
      .catch((err) => Promise.reject(err));
  }

  isRefreshing = true;

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    isRefreshing = false;
    clearAuthSessionDirect();
    redirectToLogin("session_expired");
    return Promise.reject(new Error("No refresh token available"));
  }

  try {
    const res = await axios.post(`${baseUrl}/auth/login/refresh-token`, {
      refresh_token: refreshToken,
    });

    if (res.data && res.data.success && res.data.token) {
      const newToken = res.data.token;
      sessionStorage.setItem("token", newToken);
      Cookies.set("token", newToken, { expires: 7 });

      processQueue(null, newToken);
      isRefreshing = false;

      originalRequest.headers.Authorization = newToken;
      return axiosClient(originalRequest);
    } else {
      const errorMsg = res.data?.message || "Refresh token rejected";
      processQueue(new Error(errorMsg), null);
      isRefreshing = false;
      clearAuthSessionDirect();
      redirectToLogin("session_expired");
      return Promise.reject(new Error(errorMsg));
    }
  } catch (err: any) {
    processQueue(err, null);
    isRefreshing = false;
    clearAuthSessionDirect();
    redirectToLogin("session_expired");
    return Promise.reject(err);
  }
};

axiosClient.interceptors.response.use(
  (response) => {
    if (
      response.data?.isLoggedOut === true ||
      (response.data?.errCode === 1 &&
        (response.data?.errMsg?.includes("Session not found") ||
          response.data?.errMsg?.includes("Session Timeout") ||
          response.data?.errMsg?.includes("Invalid Token")))
    ) {
      const originalRequest = response.config as any;
      const isAuthRequest = originalRequest?.url?.includes("/auth/");
      const isLoginPage =
        typeof window !== "undefined" &&
        (window.location.pathname === "/login" || window.location.pathname === "/register");

      if (!isAuthRequest && !isLoginPage && !originalRequest._retry) {
        originalRequest._retry = true;
        return attemptRefreshAndRetry(originalRequest);
      }

      if (!isAuthRequest && !isLoginPage) {
        toast.error("Session timeout, redirecting to login page", {
          id: "session-timeout",
        });
        redirectToLogin("session_expired");
      }
      return Promise.reject(new Error(response.data.errMsg || "Session expired"));
    }

    return response;
  },
  (error) => {
    const originalRequest = error.config as any;
    const isAuthRequest = originalRequest?.url?.includes("/auth/");
    const isLoginPage =
      typeof window !== "undefined" &&
      (window.location.pathname === "/login" || window.location.pathname === "/register");

    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !isAuthRequest &&
      !isLoginPage &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      return attemptRefreshAndRetry(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
