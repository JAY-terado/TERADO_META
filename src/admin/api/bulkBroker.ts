import axiosClient from '../../../axiosinstance';
import Cookies from 'js-cookie';
import axios from 'axios';

export interface BrokerBifurcatedData {
  validData: any[];
  errorData: any[];
  rawResponse?: any;
  summary?: {
    total: number;
    validCount: number;
    errorCount: number;
  };
}

/**
 * Helper to retrieve the current JWT token
 */
export const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  const token =
    sessionStorage.getItem('token') ||
    Cookies.get('token') ||
    Cookies.get('userToken') ||
    localStorage.getItem('token') ||
    '';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

/**
 * 1. GET /brokers/download-upload-broker-headers
 * Downloads the sample template CSV for importing brokers
 */
export const downloadBrokerTemplate = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = token;
    }

    // Try using axiosClient first
    let response: any;
    try {
      response = await axiosClient.get('/brokers/download-upload-broker-headers', {
        responseType: 'blob',
        headers,
      });
    } catch (primaryErr) {
      // Fallback: Check if direct :3004 is reachable if primary failed
      if (typeof window !== 'undefined') {
        response = await axios.get('/brokers/download-upload-broker-headers', {
          responseType: 'blob',
          headers,
        });
      } else {
        throw primaryErr;
      }
    }

    // Extract filename from response headers if available
    let filename = 'visited_list_import_template.csv';
    const disposition = response.headers?.['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '').trim();
      }
    }

    // Create a Blob from the response
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error: any) {
    console.error('Failed to download broker headers from server, providing standard template:', error);

    // Provide robust offline/server-fallback CSV if server fails to connect
    const defaultHeaders = [
      'broker_name',
      'company_name',
      'mobile_number',
      'alternate_mobile',
      'email',
      'pan_number',
      'gst_number',
      'rera_registration_number',
      'address_line_1',
      'address_line_2',
      'city',
      'state',
      'pincode'
    ];
    const sampleRow = [
      'Jay Sharma',
      'Jay Realty Ltd',
      '9876543210',
      '9876543211',
      'jay@example.com',
      'ABCDE1234F',
      '27AAAAA0000A1Z5',
      'RERA12345678',
      'Suite 401 Business Hub',
      'Main Street',
      'Mumbai',
      'Maharashtra',
      '400001'
    ];
    const csvContent = [defaultHeaders.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'visited_list_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: 'Downloaded fallback broker template as the server endpoint was unreachable.'
    };
  }
};

import * as XLSX from 'xlsx';

/**
 * Parses uploaded CSV / Excel file client-side and validates records
 * without hitting the backend API immediately
 */
export const parseBrokerFile = async (file: File): Promise<BrokerBifurcatedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve({
            validData: [],
            errorData: [
              {
                rowIndex: 1,
                broker_name: '—',
                mobile_number: '—',
                reason: 'The selected file contains no data rows.',
              },
            ],
            summary: { total: 0, validCount: 0, errorCount: 1 },
          });
          return;
        }

        const validData: any[] = [];
        const errorData: any[] = [];
        const seenMobiles = new Set<string>();

        rawJson.forEach((row, idx) => {
          const rowIndex = idx + 2; // Row 1 is header
          const normalized: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase().replace(/[\s-]+/g, '_');
            normalized[cleanKey] =
              typeof row[key] === 'string' ? row[key].trim() : String(row[key] ?? '').trim();
          });

          const brokerName =
            normalized['broker_name'] ||
            normalized['name'] ||
            normalized['broker'] ||
            '';
          const rawMobile =
            normalized['mobile_number'] ||
            normalized['mobile'] ||
            normalized['contact_number'] ||
            normalized['phone'] ||
            '';
          const cleanMobile = rawMobile.replace(/[^0-9]/g, '');
          const companyName =
            normalized['company_name'] || normalized['company'] || '';
          const email = normalized['email'] || '';
          const panNumber = normalized['pan_number'] || normalized['pan'] || '';
          const gstNumber = normalized['gst_number'] || normalized['gst'] || '';
          const rera =
            normalized['rera_registration_number'] || normalized['rera'] || '';
          const address1 =
            normalized['address_line_1'] || normalized['address'] || '';
          const address2 = normalized['address_line_2'] || '';
          const city = normalized['city'] || '';
          const state = normalized['state'] || '';
          const pincode = normalized['pincode'] || normalized['pin'] || '';

          const record = {
            rowIndex,
            broker_name: brokerName,
            company_name: companyName,
            mobile_number: cleanMobile || rawMobile,
            alternate_mobile: normalized['alternate_mobile'] || '',
            email,
            pan_number: panNumber,
            gst_number: gstNumber,
            rera_registration_number: rera,
            address_line_1: address1,
            address_line_2: address2,
            city,
            state,
            pincode,
          };

          const errors: string[] = [];
          if (!brokerName) {
            errors.push('Broker name is required');
          }
          if (!cleanMobile) {
            errors.push('Mobile number is required');
          } else if (cleanMobile.length < 10) {
            errors.push('Mobile number must be at least 10 digits');
          } else if (seenMobiles.has(cleanMobile)) {
            errors.push('Duplicate mobile number within file');
          }

          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
          }

          if (cleanMobile) {
            seenMobiles.add(cleanMobile);
          }

          if (errors.length > 0) {
            errorData.push({
              ...record,
              reason: `Row ${rowIndex}: ${errors.join(', ')}`,
            });
          } else {
            validData.push(record);
          }
        });

        resolve({
          validData,
          errorData,
          summary: {
            total: rawJson.length,
            validCount: validData.length,
            errorCount: errorData.length,
          },
        });
      } catch (err: any) {
        reject(new Error(`Failed to parse file: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Re-serializes valid data rows into a clean CSV file
 */
export const generateCsvFileFromRows = (rows: any[], filename = 'brokers_bulk_import.csv'): File => {
  const headers = [
    'broker_name',
    'company_name',
    'mobile_number',
    'alternate_mobile',
    'email',
    'pan_number',
    'gst_number',
    'rera_registration_number',
    'address_line_1',
    'address_line_2',
    'city',
    'state',
    'pincode',
  ];
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    const values = headers.map((h) => {
      const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(values.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return new File([blob], filename, { type: 'text/csv' });
};

/**
 * 2. POST /brokers/bulk-upload
 * Form-data:
 *   Key: file (File .csv or .xlsx)
 * Header:
 *   Authorization: Bearer <TOKEN>
 */
export const uploadBrokerBulk = async (file: File): Promise<BrokerBifurcatedData> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
  };
  if (token) {
    headers['Authorization'] = token;
  }

  let rawRes: any;
  try {
    rawRes = await axiosClient.post('/brokers/bulk-upload', formData, { headers });
  } catch (err: any) {
    // If server responded with error containing structured skippedDetails/importedBrokers
    const errData = err.response?.data;
    if (
      errData &&
      (errData.skippedDetails ||
        errData.importedBrokers ||
        errData.skipped !== undefined ||
        errData.imported !== undefined)
    ) {
      return parseAndBifurcateResponse(errData);
    }

    if (typeof window !== 'undefined') {
      try {
        rawRes = await axios.post('/brokers/bulk-upload', formData, { headers });
      } catch (secErr: any) {
        const secErrData = secErr.response?.data;
        if (
          secErrData &&
          (secErrData.skippedDetails ||
            secErrData.importedBrokers ||
            secErrData.skipped !== undefined ||
            secErrData.imported !== undefined)
        ) {
          return parseAndBifurcateResponse(secErrData);
        }
        throw err;
      }
    } else {
      throw err;
    }
  }

  const responseData = rawRes.data || rawRes;
  return parseAndBifurcateResponse(responseData);
};

/**
 * Robust bifurcation of backend responses into validData and errorData
 */
/**
 * Robust bifurcation of backend responses into validData and errorData
 * Maps:
 * - valid data with importedBrokers / imported
 * - error data with skippedDetails / skipped
 */
export const parseAndBifurcateResponse = (data: any): BrokerBifurcatedData => {
  let validData: any[] = [];
  let errorData: any[] = [];

  if (!data) {
    return {
      validData: [],
      errorData: [],
      rawResponse: data,
      summary: { total: 0, validCount: 0, errorCount: 0 }
    };
  }

  // 1. Check exact API pattern: importedBrokers & skippedDetails
  const payload = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data;

  if (Array.isArray(payload.importedBrokers) || Array.isArray(payload.skippedDetails)) {
    validData = Array.isArray(payload.importedBrokers) ? payload.importedBrokers : [];
    errorData = Array.isArray(payload.skippedDetails) ? payload.skippedDetails : [];
  } else if (Array.isArray(data.importedBrokers) || Array.isArray(data.skippedDetails)) {
    validData = Array.isArray(data.importedBrokers) ? data.importedBrokers : [];
    errorData = Array.isArray(data.skippedDetails) ? data.skippedDetails : [];
  } else if (Array.isArray(payload.validData) || Array.isArray(payload.errorData)) {
    validData = Array.isArray(payload.validData) ? payload.validData : [];
    errorData = Array.isArray(payload.errorData) ? payload.errorData : [];
  } else if (Array.isArray(payload.valid) || Array.isArray(payload.errors)) {
    validData = Array.isArray(payload.valid) ? payload.valid : [];
    errorData = Array.isArray(payload.errors) ? payload.errors : [];
  } else if (Array.isArray(payload.data)) {
    for (const item of payload.data) {
      if (
        item.error ||
        item.errors ||
        item.reason ||
        item.status === 'error' ||
        item.status === 'failed' ||
        item.isValid === false
      ) {
        errorData.push(item);
      } else {
        validData.push(item);
      }
    }
  } else if (Array.isArray(payload)) {
    for (const item of payload) {
      if (
        item.error ||
        item.errors ||
        item.reason ||
        item.status === 'error' ||
        item.status === 'failed' ||
        item.isValid === false
      ) {
        errorData.push(item);
      } else {
        validData.push(item);
      }
    }
  } else if (payload.success && (payload.records || payload.brokers)) {
    const list = payload.records || payload.brokers;
    if (Array.isArray(list)) {
      validData = list;
    }
  }

  // Determine counts from response (imported / skipped)
  const validCount =
    typeof payload.imported === 'number'
      ? payload.imported
      : typeof data.imported === 'number'
        ? data.imported
        : typeof payload.validCount === 'number'
          ? payload.validCount
          : validData.length;

  const errorCount =
    typeof payload.skipped === 'number'
      ? payload.skipped
      : typeof data.skipped === 'number'
        ? data.skipped
        : typeof payload.errorCount === 'number'
          ? payload.errorCount
          : errorData.length;

  const total =
    typeof payload.total === 'number'
      ? payload.total
      : typeof data.total === 'number'
        ? data.total
        : validCount + errorCount;

  return {
    validData,
    errorData,
    rawResponse: data,
    summary: {
      total,
      validCount,
      errorCount,
    },
  };
};
