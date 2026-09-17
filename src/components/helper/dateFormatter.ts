/**
 * Formats any date string (ISO, YYYY-MM-DD, or Date object) into DD-MM-YYYY format.
 * Returns the formatted string or '—' if empty/invalid.
 */
export const formatDateDDMMYYYY = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
  try {
    let date: Date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      if (typeof dateStr === 'string') {
        const cleanStr = dateStr.split('T')[0].trim();
        const parts = cleanStr.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          if (parts[2].length === 4) {
            return cleanStr;
          }
        }
        // Fallback for space separated or slash separated dates
        const slashParts = cleanStr.split('/');
        if (slashParts.length === 3) {
          if (slashParts[0].length === 4) {
            return `${slashParts[2]}-${slashParts[1]}-${slashParts[0]}`;
          }
          return `${slashParts[0]}-${slashParts[1]}-${slashParts[2]}`;
        }
      }
      return typeof dateStr === 'string' ? dateStr.split('T')[0] : '—';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    if (typeof dateStr === 'string') {
      const cleanStr = dateStr.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return cleanStr;
    }
    return '—';
  }
};
