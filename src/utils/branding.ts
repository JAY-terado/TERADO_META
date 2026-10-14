export interface AppBrandingConfig {
  appName: string;
  logoUrl: string;
  logoKey?: string;
  faviconUrl: string;
  faviconKey?: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor?: string;
}

export const DEFAULT_BRANDING: AppBrandingConfig = {
  appName: 'Terado CRM',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#1062AC',
  secondaryColor: '#EC3237',
  tertiaryColor: '#E0EFFF',
};

// Helper: Adjust brightness of hex color
export const adjustColorBrightness = (hex: string, percent: number): string => {
  try {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    const num = parseInt(clean, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  } catch {
    return hex;
  }
};

// Helper: Convert hex to RGB triplet string (e.g. "16, 98, 172")
export const hexToRgb = (hex: string): string => {
  try {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
  } catch {
    // fallback
  }
  return '16, 98, 172';
};

/**
 * Applies primary, secondary, and tertiary theme colors live across the entire DOM.
 */
export const applyLiveThemeColors = (
  primary = '#1062AC',
  secondary = '#EC3237',
  tertiary = '#E0EFFF'
) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Primary palette
  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-primary-hover', adjustColorBrightness(primary, -12));
  root.style.setProperty('--brand-primary-dark', adjustColorBrightness(primary, -20));
  root.style.setProperty('--brand-primary-light', adjustColorBrightness(primary, 25));
  root.style.setProperty('--brand-primary-rgb', hexToRgb(primary));

  // Secondary palette
  root.style.setProperty('--brand-secondary', secondary);
  root.style.setProperty('--brand-secondary-hover', adjustColorBrightness(secondary, -12));
  root.style.setProperty('--brand-secondary-dark', adjustColorBrightness(secondary, -20));
  root.style.setProperty('--brand-secondary-rgb', hexToRgb(secondary));

  // Tertiary palette
  root.style.setProperty('--brand-tertiary', tertiary);
  root.style.setProperty('--brand-tertiary-hover', adjustColorBrightness(tertiary, -6));
  root.style.setProperty('--brand-tertiary-rgb', hexToRgb(tertiary));

  // Tailwind & Semantic tokens
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-tertiary', tertiary);
};

export const getStoredBranding = (): AppBrandingConfig => {
  if (typeof window === 'undefined') return DEFAULT_BRANDING;
  return {
    appName: localStorage.getItem('app_custom_name') || DEFAULT_BRANDING.appName,
    logoUrl: localStorage.getItem('app_custom_logo_url') || DEFAULT_BRANDING.logoUrl,
    logoKey: localStorage.getItem('app_custom_logo_key') || undefined,
    faviconUrl: localStorage.getItem('app_custom_favicon_url') || DEFAULT_BRANDING.faviconUrl,
    faviconKey: localStorage.getItem('app_custom_favicon_key') || undefined,
    primaryColor: localStorage.getItem('app_primary_color') || DEFAULT_BRANDING.primaryColor,
    secondaryColor: localStorage.getItem('app_secondary_color') || DEFAULT_BRANDING.secondaryColor,
    tertiaryColor: localStorage.getItem('app_tertiary_color') || DEFAULT_BRANDING.tertiaryColor,
  };
};

export const applyAppBranding = () => {
  const branding = getStoredBranding();
  applyLiveThemeColors(
    branding.primaryColor || DEFAULT_BRANDING.primaryColor,
    branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    branding.tertiaryColor || DEFAULT_BRANDING.tertiaryColor
  );

  if (typeof document !== 'undefined') {
    if (branding.appName && branding.appName !== DEFAULT_BRANDING.appName) {
      if (!document.title.includes(branding.appName)) {
        document.title = `${branding.appName} | Lead Protection & Sales Management`;
      }
    }

    if (branding.faviconUrl) {
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      if (iconLinks.length > 0) {
        iconLinks.forEach((el) => {
          el.href = branding.faviconUrl;
        });
      }
    }
  }
};
