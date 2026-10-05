// Facebook JavaScript SDK Integration Helper for Terado CRM
// Meta App ID: 1972458773429923 (Terado)

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: any;
  }
}

export const FB_APP_ID =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FB_APP_ID) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FB_APP_ID) ||
  '1972458773429923';

export const FB_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
  'leads_retrieval'
].join(',');

let sdkPromise: Promise<any> | null = null;

/**
 * Dynamically loads and initializes the Facebook JavaScript SDK
 */
export const initFacebookSdk = (): Promise<any> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'));
  }

  if (window.FB) {
    return Promise.resolve(window.FB);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    // Timeout safeguard (10 seconds)
    const timeout = setTimeout(() => {
      if (!window.FB) {
        reject(new Error('Facebook SDK script load timed out. Please check your network connection or ad-blocker.'));
      }
    }, 10000);

    window.fbAsyncInit = function () {
      clearTimeout(timeout);
      try {
        window.FB.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
        console.log('[Meta SDK] Facebook JavaScript SDK Initialized with App ID:', FB_APP_ID);
        resolve(window.FB);
      } catch (err) {
        reject(err);
      }
    };

    // Inject SDK script tag if not already on the page
    const scriptId = 'facebook-jssdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Facebook SDK. Please check your internet connection or ad-blocker.'));
      };
      document.body.appendChild(script);
    }
  });

  return sdkPromise;
};

/**
 * Checks current Facebook login status
 */
export const getFacebookLoginStatus = async (): Promise<any> => {
  const FB = await initFacebookSdk();
  return new Promise((resolve) => {
    FB.getLoginStatus((response: any) => {
      resolve(response);
    });
  });
};

/**
 * Opens Facebook Login Dialog requesting required permissions
 */
export const loginWithFacebook = async (): Promise<{
  authResponse: {
    accessToken: string;
    userID: string;
    expiresIn?: number;
    grantedScopes?: string;
  };
  status: string;
}> => {
  const FB = await initFacebookSdk();

  return new Promise((resolve, reject) => {
    FB.login(
      (response: any) => {
        if (response && response.authResponse) {
          console.log('[Meta SDK] Facebook Login Successful:', response.authResponse);
          // Persist user token locally
          localStorage.setItem('meta_user_access_token', response.authResponse.accessToken);
          localStorage.setItem('meta_user_id', response.authResponse.userID);
          resolve(response);
        } else {
          console.warn('[Meta SDK] User cancelled login or did not fully authorize:', response);
          reject(new Error(response?.status === 'not_authorized' ? 'Permissions not authorized' : 'Login cancelled by user'));
        }
      },
      {
        scope: FB_SCOPES,
        return_scopes: true
      }
    );
  });
};

/**
 * Fetches all Facebook Pages the authenticated user manages
 */
export const fetchFacebookPagesDirect = async (userAccessToken?: string): Promise<Array<{ id: string; name: string; access_token?: string }>> => {
  const FB = await initFacebookSdk();
  const token = userAccessToken || localStorage.getItem('meta_user_access_token') || undefined;

  return new Promise((resolve, reject) => {
    const params: any = { fields: 'id,name,access_token,category' };
    if (token) params.access_token = token;

    FB.api('/me/accounts', params, (response: any) => {
      if (response && !response.error && Array.isArray(response.data)) {
        console.log('[Meta SDK] Fetched Facebook Pages:', response.data);
        resolve(response.data);
      } else {
        console.error('[Meta SDK] Error fetching Facebook Pages:', response?.error);
        reject(new Error(response?.error?.message || 'Failed to fetch Facebook Pages'));
      }
    });
  });
};

/**
 * Fetches user Ad Accounts
 */
export const fetchFacebookAdAccountsDirect = async (userAccessToken?: string): Promise<Array<{ id: string; name: string; account_id: string }>> => {
  const FB = await initFacebookSdk();
  const token = userAccessToken || localStorage.getItem('meta_user_access_token') || undefined;

  return new Promise((resolve, reject) => {
    const params: any = { fields: 'id,name,account_id' };
    if (token) params.access_token = token;

    FB.api('/me/adaccounts', params, (response: any) => {
      if (response && !response.error && Array.isArray(response.data)) {
        resolve(response.data);
      } else {
        console.warn('[Meta SDK] Notice fetching Ad Accounts:', response?.error?.message);
        resolve([]);
      }
    });
  });
};

/**
 * Fetches Lead Forms for a given Facebook Page
 */
export const fetchFacebookLeadFormsDirect = async (
  pageId: string,
  pageAccessToken?: string
): Promise<Array<{ id: string; name: string; status?: string }>> => {
  if (!pageId) return [];
  const FB = await initFacebookSdk();

  return new Promise((resolve, reject) => {
    const params: any = { fields: 'id,name,status,created_time' };
    if (pageAccessToken) params.access_token = pageAccessToken;

    FB.api(`/${pageId}/leadgen_forms`, params, (response: any) => {
      if (response && !response.error && Array.isArray(response.data)) {
        console.log('[Meta SDK] Fetched Lead Forms for Page:', pageId, response.data);
        resolve(response.data);
      } else {
        console.warn('[Meta SDK] Notice fetching Lead Forms for Page:', pageId, response?.error?.message);
        resolve([]);
      }
    });
  });
};

/**
 * Logs out of Facebook session
 */
export const logoutFacebook = async (): Promise<void> => {
  try {
    const FB = await initFacebookSdk();
    await new Promise<void>((resolve) => {
      FB.logout(() => resolve());
    });
  } catch (e) {
    console.warn('[Meta SDK] Logout error:', e);
  } finally {
    localStorage.removeItem('meta_user_access_token');
    localStorage.removeItem('meta_user_id');
  }
};
