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

// Toggle mock mode: active only in prototype mode
const USE_MOCK_API = process.env.NEXT_PUBLIC_ENVIROMENT === "PROTOTYPE";

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

  // 9. Meta / Facebook Integration
  if (url.includes("/meta/status")) {
    const isSaved =
      typeof window !== "undefined" ? localStorage.getItem("meta_connected") === "true" : false;
    return createMockResponse(config, {
      success: true,
      connected: isSaved,
      pageId: isSaved ? localStorage.getItem("meta_page_id") || "109823746152" : undefined,
      adAccountId: isSaved ? localStorage.getItem("meta_ad_account_id") || "act_1029384756" : undefined,
      leadFormId: isSaved ? localStorage.getItem("meta_lead_form_id") || "492019283746" : undefined,
    });
  }

  if (url.includes("/meta/oauth/callback")) {
    if (typeof window !== "undefined") {
      localStorage.setItem("meta_connected", "true");
    }
    return createMockResponse(config, {
      success: true,
      message: "Facebook account connected successfully",
    });
  }

  if (url.includes("/meta/oauth")) {
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID || "1972458773429923";
    const requestedRedirect = config.params?.redirect_uri || config.params?.redirectUri || config.params?.callback_url;
    const redirectUri = encodeURIComponent(
      requestedRedirect ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/v1/meta/oauth/callback`
        : "https://app.shreenathhomes.com/v1/meta/oauth/callback")
    );
    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=public_profile,email,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_ads,leads_retrieval&response_type=token`;
    return createMockResponse(config, {
      success: true,
      url: oauthUrl,
    });
  }

  if (url.includes("/meta/pages")) {
    return createMockResponse(config, {
      success: true,
      pages: [
        { id: "109823746152", name: "Terado Realty Living" },
        { id: "829374615201", name: "Terado Premium Estates" },
      ],
    });
  }

  if (url.includes("/meta/ad-accounts")) {
    return createMockResponse(config, {
      success: true,
      adAccounts: [
        { id: "act_1029384756", name: "Terado Realty - Primary Ads", account_id: "act_1029384756" },
      ],
    });
  }

  if (url.includes("/meta/lead-forms")) {
    return createMockResponse(config, {
      success: true,
      leadForms: [
        { id: "492019283746", name: "Skyline Residency - 3BHK Enquiry Form", status: "ACTIVE" },
        { id: "582910293847", name: "Highland Heights - Phase 2 Leads", status: "ACTIVE" },
      ],
    });
  }

  if (url.includes("/meta/config")) {
    if (typeof window !== "undefined") {
      localStorage.setItem("meta_connected", "true");
      try {
        const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
        if (body?.pageId) localStorage.setItem("meta_page_id", body.pageId);
        if (body?.adAccountId) localStorage.setItem("meta_ad_account_id", body.adAccountId);
        if (body?.leadFormId) localStorage.setItem("meta_lead_form_id", body.leadFormId);
      } catch {}
    }
    return createMockResponse(config, {
      success: true,
      message: "Facebook Lead Integration settings saved successfully!",
    });
  }

  if (url.includes("/meta/disconnect")) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("meta_connected");
      localStorage.removeItem("meta_page_id");
      localStorage.removeItem("meta_ad_account_id");
      localStorage.removeItem("meta_lead_form_id");
    }
    return createMockResponse(config, {
      success: true,
      message: "Facebook integration disconnected successfully",
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
  const url = (config.url || "").toLowerCase();
  const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/logout");

  const currentToken =
    typeof window !== "undefined"
      ? sessionStorage.getItem("token") || localStorage.getItem("token") || Cookies.get("token") || ""
      : "";
  const isMockAdmin =
    currentToken.includes("mock") ||
    currentToken === "terado-admin-mock-token";

  // In prototype mode OR when explicit mock token is active, route non-auth endpoints through mock dispatcher
  // Auth endpoints always hit the live backend API
  if (!isAuthRequest && (USE_MOCK_API || isMockAdmin)) {
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
        ? sessionStorage.getItem("token") || localStorage.getItem("token") || Cookies.get("token") || ""
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
      const token = sessionStorage.getItem("token") || localStorage.getItem("token") || Cookies.get("token");
      if (token && config.headers) {
        config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// Queue & Helper for Refreshing Access Token
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

const clearAuthSessionDirect = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    Cookies.remove("token");
    Cookies.remove("userRole");
    Cookies.remove("full_name");
    Cookies.remove("is_profile_completed");
    Cookies.remove("userToken");
    secureStorage.removeItem("type");
  }
};

const isCurrentMockAdmin = () => {
  if (typeof window === "undefined") return false;
  const currentToken =
    sessionStorage.getItem("token") || localStorage.getItem("token") || Cookies.get("token") || "";
  const role = Cookies.get("userRole");
  return (
    currentToken.includes("mock") ||
    currentToken === "terado-admin-mock-token"
  );
};

const redirectToLogin = (reason = "") => {
  if (typeof window !== "undefined") {
    // If running in mock admin mode, never boot user out to login
    if (isCurrentMockAdmin()) {
      return;
    }
    clearAuthSessionDirect();
    const searchParam = reason ? `?error=${reason}` : "";
    window.location.replace(`/login${searchParam}`);
  }
};

const attemptRefreshAndRetry = async (originalRequest: any) => {
  if (isCurrentMockAdmin()) {
    return Promise.reject(new Error("Mock admin session - skipping token refresh"));
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then((token) => {
        originalRequest.headers.Authorization = token;
        return axiosClient(originalRequest);
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }

  isRefreshing = true;

  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  if (!refreshToken) {
    isRefreshing = false;
    // Do not wipe or redirect if mock session
    if (!isCurrentMockAdmin()) {
      clearAuthSessionDirect();
      redirectToLogin("session_expired");
    }
    return Promise.reject(new Error("No refresh token available"));
  }

  try {
    const res = await axios.post(`${baseUrl}/auth/login/refresh-token`, {
      refresh_token: refreshToken,
    });

    if (res.data && res.data.success && res.data.token) {
      const newToken = res.data.token;
      sessionStorage.setItem("token", newToken);
      localStorage.setItem("token", newToken);
      Cookies.set("token", newToken, { expires: 7 });

      processQueue(null, newToken);
      isRefreshing = false;

      originalRequest.headers.Authorization = newToken;
      return axiosClient(originalRequest);
    } else {
      const errorMsg = res.data?.message || "Refresh token rejected";
      processQueue(new Error(errorMsg), null);
      isRefreshing = false;
      if (!isCurrentMockAdmin()) {
        clearAuthSessionDirect();
        redirectToLogin("session_expired");
      }
      return Promise.reject(new Error(errorMsg));
    }
  } catch (err: any) {
    processQueue(err, null);
    isRefreshing = false;
    if (!isCurrentMockAdmin()) {
      clearAuthSessionDirect();
      redirectToLogin("session_expired");
    }
    return Promise.reject(err);
  }
};

// ============================================================================
// Response Interceptor: Safe Passthrough with Token Refresh
// ============================================================================
axiosClient.interceptors.response.use(
  (response) => {
    // If mock admin session, never treat response as logged out
    if (isCurrentMockAdmin()) {
      return response;
    }

    if (
      response.data?.isLoggedOut === true ||
      (response.data?.errCode === 1 &&
        (
          response.data?.errMsg?.includes("Session not found") ||
          response.data?.errMsg?.includes("Session Timeout") ||
          response.data?.errMsg?.includes("Invalid Token")
        ))
    ) {
      const originalRequest = response.config as any;
      const isAuthRequest = originalRequest?.url?.includes("/auth/");
      const isMetaRequest = originalRequest?.url?.includes("/meta/");
      const isLoginPage =
        typeof window !== "undefined" &&
        (window.location.pathname === "/login" || window.location.pathname === "/register");

      if (!isAuthRequest && !isMetaRequest && !isLoginPage && !originalRequest._retry) {
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
        if (refreshToken) {
          originalRequest._retry = true;
          return attemptRefreshAndRetry(originalRequest);
        }
      }

      return Promise.reject(new Error(response.data.errMsg || "Session expired"));
    }

    return response;
  },
  (error) => {
    const originalRequest = error.config as any;
    const isAuthRequest = originalRequest?.url?.includes("/auth/");
    const isMetaRequest = originalRequest?.url?.includes("/meta/");
    const isLoginPage =
      typeof window !== "undefined" &&
      (window.location.pathname === "/login" || window.location.pathname === "/register");

    if (isCurrentMockAdmin() || isMetaRequest) {
      return Promise.reject(error);
    }

    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !isAuthRequest &&
      !isLoginPage &&
      !originalRequest._retry
    ) {
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
      if (refreshToken) {
        originalRequest._retry = true;
        return attemptRefreshAndRetry(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
