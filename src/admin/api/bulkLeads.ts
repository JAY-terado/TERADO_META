import axiosClient from '../../../axiosinstance';
import Cookies from 'js-cookie';
import * as XLSX from 'xlsx';

export interface LeadSkippedRow {
  row: number;
  customer?: string;
  reason: string;
  isSkipped?: boolean;
  isError?: boolean;
}

export interface LeadsBifurcatedData {
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
 * Step 1: GET /leads/download-visited-list-headers
 * Downloads visited_list_import_template.csv directly from the backend
 */
export const downloadLeadsVisitedListHeaders = async (): Promise<{ success: boolean; message?: string }> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = token;
  }

  const response = await axiosClient.get('/leads/download-visited-list-headers', {
    responseType: 'blob',
    headers,
  });

  let filename = 'visited_list_import_template.csv';
  const disposition = response.headers?.['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '').trim();
    }
  }

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
};

/**
 * Parses uploaded CSV / Excel file client-side and validates records
 * without hitting the backend API immediately
 */
export const parseLeadsFile = async (file: File): Promise<LeadsBifurcatedData> => {
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
                row: 1,
                customer: '—',
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

          const customer =
            normalized['customer'] ||
            normalized['customer_name'] ||
            normalized['name'] ||
            normalized['client_name'] ||
            '';
          const rawMobile =
            normalized['mobile_number'] ||
            normalized['mobile'] ||
            normalized['contact_number'] ||
            normalized['phone'] ||
            '';
          const cleanMobile = rawMobile.replace(/[^0-9]/g, '');
          const projectName =
            normalized['project_name'] ||
            normalized['project'] ||
            '';
          const salesExecutive =
            normalized['sales_executive'] ||
            normalized['sales_person'] ||
            normalized['executive'] ||
            normalized['assigned_to'] ||
            '';
          const visitDate =
            normalized['visit_date'] ||
            normalized['date'] ||
            normalized['scheduled_date'] ||
            '';
          const email = normalized['email'] || '';
          const budget = normalized['budget'] || '';
          const requirement = normalized['requirement'] || normalized['configuration'] || normalized['bhk'] || '';
          const source = normalized['source'] || '';
          const notes = normalized['notes'] || normalized['remarks'] || '';

          const record = {
            rowIndex,
            row: rowIndex,
            customer,
            mobile_number: cleanMobile || rawMobile,
            project_name: projectName,
            sales_executive: salesExecutive,
            visit_date: visitDate,
            email,
            budget,
            requirement,
            source,
            notes,
            _raw: row,
          };

          const errors: string[] = [];
          if (!customer) {
            errors.push('Customer name is required');
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
export const generateLeadsCsvFileFromRows = (rows: any[], filename = 'visited_leads_cleaned.csv'): File => {
  if (rows.length === 0) {
    const blob = new Blob([''], { type: 'text/csv;charset=utf-8;' });
    return new File([blob], filename, { type: 'text/csv' });
  }

  // Preserve original headers from raw rows if available
  const sample = rows[0]._raw || rows[0];
  const keys = Object.keys(sample).filter((k) => !k.startsWith('_') && k !== 'rowIndex' && k !== 'row');
  const headers = keys.length > 0 ? keys : ['customer', 'mobile_number', 'project_name', 'sales_executive', 'visit_date', 'email', 'budget', 'requirement', 'source', 'notes'];

  const lines = [headers.join(',')];
  rows.forEach((r) => {
    const sourceObj = r._raw || r;
    const values = headers.map((h) => {
      const val = sourceObj[h] !== undefined && sourceObj[h] !== null ? String(sourceObj[h]) : (r[h] !== undefined ? String(r[h]) : '');
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(values.join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return new File([blob], filename, { type: 'text/csv' });
};

/**
 * Step 2: POST /leads/import/visited-list
 * Form-data:
 *   Key: file (File .csv or .xlsx)
 * Header:
 *   Authorization: Bearer <ADMIN_ACCESS_TOKEN>
 * ⚠️ Important: Do NOT manually add Content-Type: multipart/form-data. Postman/Axios sets the boundary automatically.
 */
export const uploadVisitedLeadsBulk = async (file: File): Promise<LeadsBifurcatedData> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = token;
  }

  let rawRes: any;
  try {
    rawRes = await axiosClient.post('/leads/import/visited-list', formData, { headers });
  } catch (err: any) {
    const errData = err.response?.data;
    if (
      errData &&
      (errData.summary ||
        errData.skippedRows ||
        errData.errorRows ||
        errData.message ||
        errData.success !== undefined)
    ) {
      return parseAndBifurcateLeadsResponse(errData);
    }
    throw err;
  }

  const responseData = rawRes.data || rawRes;
  return parseAndBifurcateLeadsResponse(responseData);
};

/**
 * Parses and maps backend responses into validData and errorData
 * Handles:
 * {
 *   "success": true,
 *   "message": "Import complete. 2 inserted, 0 skipped, 0 errors.",
 *   "summary": { "totalRows": 2, "inserted": 2, "skipped": 0, "errors": 0 },
 *   "skippedRows": [],
 *   "errorRows": []
 * }
 */
export const parseAndBifurcateLeadsResponse = (data: any): LeadsBifurcatedData => {
  let validData: any[] = [];
  let errorData: any[] = [];

  if (!data) {
    return {
      validData: [],
      errorData: [],
      rawResponse: data,
      summary: { total: 0, validCount: 0, errorCount: 0 },
    };
  }

  const payload = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data;
  const summary = payload.summary || data.summary || {};

  const skippedList: any[] = Array.isArray(payload.skippedRows)
    ? payload.skippedRows
    : Array.isArray(data.skippedRows)
    ? data.skippedRows
    : [];

  const errorList: any[] = Array.isArray(payload.errorRows)
    ? payload.errorRows
    : Array.isArray(data.errorRows)
    ? data.errorRows
    : [];

  // Map skipped rows
  skippedList.forEach((item: any, idx: number) => {
    errorData.push({
      row: item.row || item.rowIndex || idx + 1,
      customer: item.customer || item.customer_name || item.name || '—',
      reason: item.reason || item.message || 'Row was skipped by server',
      isSkipped: true,
      ...item,
    });
  });

  // Map error rows
  errorList.forEach((item: any, idx: number) => {
    errorData.push({
      row: item.row || item.rowIndex || idx + 1,
      customer: item.customer || item.customer_name || item.name || '—',
      reason: item.reason || item.message || 'Server validation error',
      isError: true,
      ...item,
    });
  });

  if (Array.isArray(payload.insertedLeads)) {
    validData = payload.insertedLeads;
  } else if (Array.isArray(payload.validData)) {
    validData = payload.validData;
  }

  const insertedCount =
    typeof summary.inserted === 'number'
      ? summary.inserted
      : typeof payload.inserted === 'number'
      ? payload.inserted
      : validData.length;

  const total =
    typeof summary.totalRows === 'number'
      ? summary.totalRows
      : typeof payload.total === 'number'
      ? payload.total
      : insertedCount + errorData.length;

  return {
    validData,
    errorData,
    rawResponse: data,
    summary: {
      total,
      validCount: insertedCount,
      errorCount: errorData.length,
    },
  };
};
