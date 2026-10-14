import axiosClient from '../../axiosinstance';
import Cookies from 'js-cookie';

export interface PublicBrandingData {
  applicationName?: string;
  awsLogoURL?: string;
  awsFaviconURL?: string;
  applicationPrimaryColour?: string;
  applicationSecondaryColour?: string;
  applicationTertiaryColour?: string;
  [key: string]: any;
}

export interface PublicInitResponse {
  success: boolean;
  csrfToken?: string;
  branding?: PublicBrandingData;
  message?: string;
  [key: string]: any;
}

// In-memory cache for CSRF token
let inMemoryCsrfToken: string | null = null;
let inFlightInitPromise: Promise<PublicInitResponse | null> | null = null;
let lastInitFetchTimestamp = 0;
const INIT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Retrieve the active CSRF token from memory, sessionStorage, or cookies.
 */
export const getCsrfToken = (forceRefresh = false): string => {
  if (forceRefresh) {
    inMemoryCsrfToken = null;
  } else if (inMemoryCsrfToken && !inMemoryCsrfToken.startsWith('da39c5bb')) {
    return inMemoryCsrfToken;
  }

  if (typeof window !== 'undefined') {
    try {
      const fromSession = sessionStorage.getItem('csrf_token') || sessionStorage.getItem('terado_csrf_token');
      if (fromSession && !fromSession.startsWith('da39c5bb')) {
        inMemoryCsrfToken = fromSession;
        return fromSession;
      }
    } catch {
      // ignore
    }
  }

  // Fallback: check cookie if accessible (non-HttpOnly copy)
  const fromCookie = Cookies.get('_csrfToken') || Cookies.get('csrf_token') || Cookies.get('x-csrf-token');
  if (fromCookie && !fromCookie.startsWith('da39c5bb')) {
    inMemoryCsrfToken = fromCookie;
    return fromCookie;
  }

  return '';
};

/**
 * Store the CSRF token across memory, sessionStorage, and cookie backup.
 */
export const setCsrfToken = (token: string): void => {
  if (!token) return;
  inMemoryCsrfToken = token;
  if (typeof window !== 'undefined') {
    (window as any).__csrfToken = token;
    try {
      sessionStorage.setItem('csrf_token', token);
      sessionStorage.setItem('terado_csrf_token', token);
    } catch {
      // ignore
    }
  }

  try {
    Cookies.set('csrf_token', token, { expires: 1 });
  } catch {
    // ignore
  }
};

/**
 * Clear the CSRF token.
 */
export const clearCsrfToken = (): void => {
  inMemoryCsrfToken = null;
  if (typeof window !== 'undefined') {
    delete (window as any).__csrfToken;
    try {
      sessionStorage.removeItem('csrf_token');
      sessionStorage.removeItem('terado_csrf_token');
    } catch {
      // ignore
    }
  }
  try {
    Cookies.remove('csrf_token');
  } catch {
    // ignore
  }
};

/**
 * Update app branding state with branding info returned by /organisation-settings/public/init
 */
export const applyBrandingFromInit = (branding?: PublicBrandingData): void => {
  if (!branding || typeof window === 'undefined') return;

  if (branding.applicationName) {
    localStorage.setItem('app_custom_name', branding.applicationName);
  }
  if (branding.awsLogoURL) {
    localStorage.setItem('app_custom_logo_url', branding.awsLogoURL);
  }
  if (branding.awsFaviconURL) {
    localStorage.setItem('app_custom_favicon_url', branding.awsFaviconURL);
    const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    iconLinks.forEach((el) => {
      el.href = branding.awsFaviconURL!;
    });
  }
  if (branding.applicationPrimaryColour) {
    localStorage.setItem('app_primary_color', branding.applicationPrimaryColour);
    document.documentElement.style.setProperty('--brand-primary', branding.applicationPrimaryColour);
    document.documentElement.style.setProperty('--color-primary', branding.applicationPrimaryColour);
  }
  if (branding.applicationSecondaryColour) {
    localStorage.setItem('app_secondary_color', branding.applicationSecondaryColour);
    document.documentElement.style.setProperty('--brand-secondary', branding.applicationSecondaryColour);
    document.documentElement.style.setProperty('--color-secondary', branding.applicationSecondaryColour);
  }
  if (branding.applicationTertiaryColour) {
    localStorage.setItem('app_tertiary_color', branding.applicationTertiaryColour);
    document.documentElement.style.setProperty('--brand-tertiary', branding.applicationTertiaryColour);
    document.documentElement.style.setProperty('--color-tertiary', branding.applicationTertiaryColour);
  }

  window.dispatchEvent(new Event('app-branding-updated'));
};

/**
 * API 1: Fetch Branding & Get CSRF Token
 * GET /v1/organisation-settings/public/init
 * 
 * Sets the _csrfToken cookie on the browser (via withCredentials: true)
 * and returns { success: true, csrfToken: "...", branding: { ... } }
 */
export const fetchPublicInit = async (force = false): Promise<PublicInitResponse | null> => {
  const now = Date.now();

  // If already in flight, reuse the promise
  if (inFlightInitPromise) {
    return inFlightInitPromise;
  }

  // If already fetched recently and token exists, return cached token
  if (!force && inMemoryCsrfToken && now - lastInitFetchTimestamp < INIT_CACHE_TTL) {
    return {
      success: true,
      csrfToken: inMemoryCsrfToken,
    };
  }

  inFlightInitPromise = (async () => {
    try {
      const response = await axiosClient.get('/organisation-settings/public/init', {
        withCredentials: true,
      });

      lastInitFetchTimestamp = Date.now();
      const data: PublicInitResponse = response.data;

      const token =
        data?.csrfToken ||
        (data as any)?.data?.csrfToken ||
        (data as any)?.token ||
        '';

      if (token) {
        setCsrfToken(token);
      }

      if (data?.branding) {
        applyBrandingFromInit(data.branding);
      }

      return data;
    } catch (err: any) {
      console.warn('Failed to fetch public branding / CSRF init:', err?.message || err);
      return null;
    } finally {
      inFlightInitPromise = null;
    }
  })();

  return inFlightInitPromise;
};

/**
 * Ensure a valid CSRF token is available.
 * If not present, calls fetchPublicInit() first.
 */
export const ensureCsrfToken = async (): Promise<string> => {
  const existing = getCsrfToken();
  if (existing) return existing;

  const res = await fetchPublicInit();
  return res?.csrfToken || getCsrfToken() || '';
};
