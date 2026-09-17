import axiosClient from '../../../axiosinstance';
import Cookies from 'js-cookie';

export interface OtpResponse {
  success: boolean;
  message: string;
}

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return {
        Authorization: token
      };
    }
  }
  return {};
};

export const requestCustomerOtp = async (email: string): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/customers/request-otp', { email }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export const verifyCustomerOtp = async (email: string, otp: number): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/customers/verify-otp', { email, otp }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export const requestCustomerMobileOtp = async (mobile_number: string): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/customers/request-otp', { mobile_number }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export const verifyCustomerMobileOtp = async (mobile_number: string, otp: number | string): Promise<OtpResponse> => {
  try {
    const response = await axiosClient.post('/customers/verify-otp', { mobile_number, otp }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as OtpResponse;
    }
    throw error;
  }
};

export interface CreateCustomerPayload {
  customer_name: string;
  mobile_number: string;
  email?: string;
  city: string;
  project_id: number[];
  unit_type: string[];
  budget: string | number;
  scheduled_visit_date: string;
  scheduled_visit_time: string;
  expected_booking_duration?: string;
}

export interface CreateCustomerResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const createCustomer = async (payload: CreateCustomerPayload): Promise<CreateCustomerResponse> => {
  try {
    const response = await axiosClient.post('/customers/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateCustomerResponse;
    }
    throw error;
  }
};

export interface CheckMobileResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const checkMobile = async (mobileNumber: string): Promise<CheckMobileResponse> => {
  try {
    const response = await axiosClient.post('/customers/check-mobile', { mobile_number: mobileNumber }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CheckMobileResponse;
    }
    throw error;
  }
};

export interface CustomerApiResponse {
  id: number;
  customer_name: string;
  mobile_number: string;
  email: string;
  city: string;
  project_id: number;
  unit_type: string;
  budget: number;
  scheduled_visit_date: string;
  scheduled_visit_time: string;
  status?: string;
  ownership_valid_till?: string;
  Project?: {
    id: number;
    project_name: string;
  };
}

export interface GetCustomersResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: CustomerApiResponse[];
}

export const getCustomers = async (search: string = ''): Promise<GetCustomersResponse> => {
  try {
    const response = await axiosClient.get('/customers/', {
      params: { search },
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetCustomersResponse;
    }
    throw error;
  }
};

export interface CreateLeadPayload {
  customer_id: number;
  project_id: number[];
  city: string;
  unit_type: string[];
  budget: string | number;
  scheduled_visit_date: string;
  scheduled_visit_time: string;
  expected_booking_duration?: string;
}

export interface CreateLeadResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const createLeadForExistingCustomer = async (payload: CreateLeadPayload): Promise<CreateLeadResponse> => {
  try {
    const response = await axiosClient.post('/leads/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateLeadResponse;
    }
    throw error;
  }
};

export interface AssignedLeadApiResponse {
  id: number;
  customer_id: number;
  project_id: number;
  city: string;
  unit_type: string;
  budget: number;
  status: string;
  scheduled_visit_date?: string;
  scheduled_visit_time?: string;
  createdAt: string;
  updatedAt: string;
  Customer?: {
    id: number;
    customer_name: string;
    mobile_number: string;
    email: string;
    city: string;
  };
  Project?: {
    id: number;
    project_name: string;
    location: string;
  };
}

export interface GetAssignedCallingLeadsResponse {
  success: boolean;
  message?: string;
  data: AssignedLeadApiResponse[];
}

export const getAssignedCallingLeads = async (): Promise<GetAssignedCallingLeadsResponse> => {
  try {
    const response = await axiosClient.get('/leads/calling/assigned', {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetAssignedCallingLeadsResponse;
    }
    throw error;
  }
};

export interface CreateLeadNotePayload {
  lead_id: number;
  note: string;
  contact_status: number;
}

export interface CreateLeadNoteResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const createLeadNote = async (payload: CreateLeadNotePayload): Promise<CreateLeadNoteResponse> => {
  try {
    const response = await axiosClient.post('/leads/notes/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateLeadNoteResponse;
    }
    throw error;
  }
};

export interface CreateLeadReminderPayload {
  lead_id: number;
  reminder_datetime: string;
  note: string;
}

export interface CreateLeadReminderResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const createLeadReminder = async (payload: CreateLeadReminderPayload): Promise<CreateLeadReminderResponse> => {
  try {
    const response = await axiosClient.post('/leads/reminders/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateLeadReminderResponse;
    }
    throw error;
  }
};

export interface GetLeadTimelineResponse {
  success: boolean;
  data: {
    notes: any[];
    reminders: any[];
    activity_logs: any[];
    activityLogs?: any[];
    tasks?: any[];
  };
}

export const getLeadTimeline = async (leadId: number): Promise<GetLeadTimelineResponse> => {
  try {
    const response = await axiosClient.get(`/leads/${leadId}/timeline`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetLeadTimelineResponse;
    }
    throw error;
  }
};

export interface UpdateLeadActionTakenPayload {
  action_taken: string;
  note: string;
  visit_date?: string;
  visit_time?: string;
  pickup?: number;
  pickup_location?: string;
  project?: string;
  unit_type?: string;
  budget?: string;
  expected_booking_duration?: string;
}

export const updateLeadActionTaken = async (
  allocationId: number,
  payload: UpdateLeadActionTakenPayload
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axiosClient.put(`/leads/allocations/${allocationId}/action-taken`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export interface MyVisitApiResponse {
  id: number;
  customer_id: number;
  broker_id: number;
  project_id: number | null;
  lead_id: number;
  visit_code: string;
  scheduled_date: string;
  scheduled_time: string;
  check_in_time: string | null;
  check_in_method: string | null;
  status: number;
  pickup: number;
  pickup_location: string | null;
  created_by: number;
  updated_by: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    broker_id: number;
    customer_name: string;
    mobile_number: string;
    email: string;
    note: string | null;
  } | null;
  project?: {
    id: number;
    project_name: string;
    city?: string;
    state?: string;
  } | null;
  user?: {
    id: number;
    full_name: string;
    contact_number: string;
    email: string;
    role: string;
  } | null;
}

export interface GetMyVisitsResponse {
  success: boolean;
  count?: number;
  data: MyVisitApiResponse[];
}

export const getMyVisits = async (): Promise<GetMyVisitsResponse> => {
  try {
    const response = await axiosClient.get('/visits/my-visits', {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetMyVisitsResponse;
    }
    throw error;
  }
};

export interface CallingDashboardData {
  stats: {
    total: number;
    new_leads: number;
    called: number;
    follow_up: number;
    visit_scheduled: number;
  };
  visits_today: {
    count: number;
    list: any[];
  };
  new_leads: {
    count: number;
    list: any[];
  };
  called_leads: {
    count: number;
    list: any[];
  };
  follow_up: {
    count: number;
    list: any[];
  };
  visited: {
    count: number;
    list: any[];
  };
}

export interface GetCallingDashboardResponse {
  success: boolean;
  data: CallingDashboardData;
}

export const getCallingDashboard = async (params?: {
  filter?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<GetCallingDashboardResponse> => {
  try {
    const response = await axiosClient.get('/dashboard/calling', {
      params,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetCallingDashboardResponse;
    }
    throw error;
  }
};

export interface Visitor {
  visit_id: number;
  visit_code: string;
  scheduled_date: string;
  scheduled_time: string;
  check_in_time: string | null;
  check_in_method: string | null;
  completed_at: string | null;
  status_label: string;
  pickup: number;
  pickup_location: string | null;
  customer: {
    id: number;
    customer_name: string;
    mobile_number: string;
    email: string;
  };
  assigned_sales_executive?: {
    id: number;
    full_name: string;
    contact_number?: string;
    email?: string;
  } | null;
  assignedExecutive?: {
    id: number;
    full_name: string;
    contact_number?: string;
    email?: string;
  } | null;
  assigned_sales_person?: string | { full_name?: string; name?: string } | null;
}

export interface VisitsDashboardStats {
  totalVisits: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  remainingCheckIn: number;
}

export interface VisitsDashboardResponse {
  success: boolean;
  filter: string;
  dateRange: {
    from: string;
    to: string;
  };
  stats: VisitsDashboardStats;
  visitors: Visitor[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export const getVisitsDashboard = async (params?: {
  filter?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<VisitsDashboardResponse> => {
  try {
    const response = await axiosClient.get('/visits/dashboard', {
      params,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as VisitsDashboardResponse;
    }
    throw error;
  }
};
export interface SingleVisitResponse {
  success: boolean;
  data: {
    id: number;
    visit_code: string;
    scheduled_date: string;
    scheduled_time: string;
    status: number;
    status_label?: string;
    pickup: number;
    pickup_location: string | null;
    createdAt: string;
    updatedAt: string;
    customer: {
      id: number;
      customer_name: string;
      mobile_number: string;
      email: string;
      note: string | null;
      source: string | null;
      createdAt: string;
      updatedAt: string;
    };
    created_by_detail?: {
      id: number;
      full_name: string;
      role: string;
      contact_number: string;
    } | null;
    assigned_sales_executive?: {
      id: number;
      full_name: string;
      contact_number: string;
      email: string;
    } | null;
  };
}

export const getVisitDetails = async (id: number | string): Promise<SingleVisitResponse> => {
  try {
    const response = await axiosClient.get(`/visits/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as SingleVisitResponse;
    }
    throw error;
  }
};

export interface CheckInPayload {
  visit_id: string;
  visit_code: string;
  check_in_method: string;
}

export interface CheckInResponse {
  success?: boolean;
  message?: string;
  data?: any;
  visit_code?: string;
  check_in_time?: string;
  check_in_method?: string;
  customer?: {
    id: number;
    customer_name: string;
    mobile_number: string;
    email?: string;
  };
  assignedExecutive?: {
    id: number;
    name: string;
    contact: string;
    email: string;
  } | null;
}

export const postCheckInVisitor = async (payload: CheckInPayload): Promise<CheckInResponse> => {
  try {
    const response = await axiosClient.post('/visits/check-in', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CheckInResponse;
    }
    throw error;
  }
};

export interface VisitedAppointment {
  visit_id: number;
  visit_code: string;
  scheduled_date: string;
  scheduled_time: string;
  check_in_time: string | null;
  check_in_method: string | null;
  status: number;
  status_label: string;
  pickup: number;
  pickup_location: string | null;
  customer: {
    id: number;
    customer_name: string;
    mobile_number: string;
    email: string;
  };
  assignedExecutive: {
    id: number;
    full_name: string;
    contact_number: string;
    email: string;
  } | null;
}

export interface VisitsListResponse {
  success: boolean;
  data: VisitedAppointment[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export const getVisitsList = async (params?: {
  search?: string;
  filter?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<VisitsListResponse> => {
  try {
    const response = await axiosClient.get('/visits/list', {
      params,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as VisitsListResponse;
    }
    throw error;
  }
};

export interface CompleteVisitResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const putCompleteVisit = async (id: number | string): Promise<CompleteVisitResponse> => {
  try {
    const response = await axiosClient.put(`/visits/${id}/complete`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CompleteVisitResponse;
    }
    throw error;
  }
};
export interface GetSalesDashboardResponse {
  success: boolean;
  message?: string;
  data: {
    stats: {
      alloted_visits_count: number;
      visit_completed_count: number;
      negotiation_count: number;
      booking_count: number;
      negotiationLeads?: number;
      bookedLeads?: number;
      totalUniqueLeadsAssigned?: number;
      visitScheduledLeads?: number;
      notInterestedLeads?: number;
    };
    data?: any[];
    alloted_visits?: any[];
    visit_completed?: any[];
    negotiation?: any[];
    booking?: any[];
    pagination?: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

export const getSalesDashboard = async (params?: {
  filter?: string;
  startDate?: string;
  endDate?: string;
  tag?: string;
  source?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<GetSalesDashboardResponse> => {
  try {
    const response = await axiosClient.get('/dashboard/sales', {
      params,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetSalesDashboardResponse;
    }
    throw error;
  }
};

export interface GetSalesLeadDetailsResponse {
  success: boolean;
  data: {
    id: number;
    lead_id: string;
    stage: number;
    status: number;
    budget: string | null;
    unit_type: string | null;
    project: string | null;
    city: string | null;
    tag?: string | null;
    source?: string | null;
    score?: number | null;
    scheduled_visit_date: string | null;
    scheduled_visit_time: string | null;
    createdAt?: string;
    updatedAt?: string;
    customer_detail: {
      id: number;
      customer_name: string;
      mobile_number: string;
      email: string;
      note: string | null;
      source: string | null;
      purpose?: string | null;
      broker?: {
        id: number;
        broker_name: string;
        company_name: string;
        mobile_number: string;
        email: string;
      };
    };
    AssignedSalesExecutive?: {
      id: number;
      name: string;
      contact_number?: string;
      email?: string;
    } | null;
    allocations?: Array<{
      id: number;
      callerExecutive?: {
        id: number;
        full_name: string;
        contact_number?: string;
        email?: string;
      } | null;
    }>;
    visits?: Array<{
      id: number;
      visit_code: string;
      status: number;
      scheduled_date: string;
      scheduled_time: string;
      check_in_time?: string | null;
      check_in_method?: string | null;
      check_out_time?: string | null;
      completed_at?: string | null;
      pickup?: number;
      pickup_location?: string | null;
      AssignedSalesExecutive?: { id: number; full_name: string } | null;
    }>;
    notes?: Array<{
      id: number;
      lead_id: number;
      note: string;
      contact_status: number;
      created_by: number;
      createdAt: string;
      updatedAt: string;
      createdByName?: string | null;
    }>;
    reminders?: Array<{
      id: number;
      lead_id: number;
      note: string;
      reminder_datetime: string;
      status: number;
      created_by: number;
      createdAt: string;
      updatedAt: string;
      createdByName?: string | null;
    }>;
    tasks?: Array<{
      id: number;
      lead_id: number;
      task_name: string;
      note?: string | null;
      status: number;
      due_date?: string | null;
      reminder_datetime?: string | null;
      created_by: number;
      createdAt: string;
      updatedAt: string;
      createdByName?: string | null;
    }>;
    activity_logs?: Array<{
      id: number;
      activityType: string;
      message: string;
      createdAt: string;
    }>;
    activityLogs?: Array<{
      id: number;
      activityType: string;
      message: string;
      createdAt: string;
      date?: string;
    }>;
  };
}

export const getSalesLeadDetails = async (id: number | string): Promise<GetSalesLeadDetailsResponse> => {
  try {
    const response = await axiosClient.get(`/dashboard/sales/leads/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetSalesLeadDetailsResponse;
    }
    throw error;
  }
};

export interface GetSalesLeadsResponse {
  success: boolean;
  message?: string;
  data: any[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export const getSalesLeads = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<GetSalesLeadsResponse> => {
  try {
    const response = await axiosClient.get('/dashboard/sales/leads', {
      params,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetSalesLeadsResponse;
    }
    throw error;
  }
};

export interface CreateBookingApiPayload {
  lead_id: number;
  project_id: number;
  unit_number: string;
  tower: string;
  payment_schedule?: string;
  floor: string;
  booking_amount: number;
  agreement_value: number;
  booking_date: string;
}

export interface CreateBookingApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const createBookingOnServer = async (payload: CreateBookingApiPayload[] | CreateBookingApiPayload): Promise<CreateBookingApiResponse> => {
  try {
    const response = await axiosClient.post('/bookings/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateBookingApiResponse;
    }
    throw error;
  }
};

export interface SalesExecutive {
  id: number;
  full_name: string;
  contact_number: string;
  email: string;
}

export interface ReceptionistProject {
  project_id: number;
  project_name: string;
  sales_executives: SalesExecutive[];
}

export interface GetReceptionistProjectsResponse {
  success: boolean;
  data: ReceptionistProject[];
}

export const getReceptionistProjects = async (): Promise<GetReceptionistProjectsResponse> => {
  // Do not call this API in sales role as sales users lack permission and receive 403 Forbidden
  if (typeof window !== 'undefined') {
    const userRole = (Cookies.get('userRole') || '').toLowerCase();
    const isSales =
      userRole === 'sales' ||
      userRole.includes('sales') ||
      window.location.pathname.startsWith('/sales');
    if (isSales) {
      return { success: false, data: [] };
    }
  }

  try {
    const response = await axiosClient.get('/customers/receptionist/projects', {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetReceptionistProjectsResponse;
    }
    throw error;
  }
};

export interface CreateReceptionistCustomerPayload {
  customer_name: string;
  mobile_number: string;
  email?: string;
  project_id?: number;
  budget?: string;
  unit_type?: string;
  expected_booking_duration?: string;
  current_residence?: string;
  purpose_of_buying?: string;
  broker_id?: number;
  referredByName?: string;
  referredByMobileNumber?: string;
  referredByEmail?: string;
  source?: string;
  note?: string;
  purpose?: string;
  residential_address?: string;
  booking_preferences?: string;
  possession_expectation?: string;
  source_of_project_information?: string;
}

export interface CreateReceptionistCustomerResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const createReceptionistCustomer = async (payload: CreateReceptionistCustomerPayload): Promise<CreateReceptionistCustomerResponse> => {
  try {
    const response = await axiosClient.post('/customers/receptionist/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateReceptionistCustomerResponse;
    }
    throw error;
  }
};

export const createLeadWithCustomer = async (payload: any): Promise<any> => {
  try {
    const response = await axiosClient.post('/leads/create-with-customer', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export interface ReassignVisitorPayload {
  sales_executive_id: number;
  note: string;
}

export const reassignVisitor = async (visitId: string | number, payload: ReassignVisitorPayload): Promise<any> => {
  try {
    const response = await axiosClient.post(`/visits/${visitId}/reassign`, payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};





export const addSalesLeadNote = async (payload: { lead_id: number; note: string; contact_status: number }) => {
  try {
    const response = await axiosClient.post('/leads/notes/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) return error.response.data;
    throw error;
  }
};

export interface CreateLeadTaskPayload {
  lead_id: number;
  task_name: string;
  note: string;
  due_date: string;
  repeat: string;
  priority: string;
  remindercreate: boolean;
  reminder_datetime?: string;
}

export const createLeadTask = async (payload: CreateLeadTaskPayload) => {
  try {
    const response = await axiosClient.post('/leads/tasks/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) return error.response.data;
    throw error;
  }
};

export const updateLeadTaskStatus = async (taskId: number, status: number = 2) => {
  try {
    const response = await axiosClient.put(`/leads/tasks/${taskId}/status`, { status }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) return error.response.data;
    throw error;
  }
};

export interface AssignedExecutive {
  id: number;
  full_name: string;
  email: string;
  contact_number: string;
}

export interface PreviousVisit {
  id: number;
  visit_code: string;
  scheduled_date: string;
  scheduled_time: string;
  check_in_time: string | null;
  status: number;
  status_label: string;
  assigned_executive: AssignedExecutive | null;
}

export interface RevisitLead {
  id: number;
  lead_id: string;
  project: string;
  stage: number;
  status: number;
  previous_visits?: PreviousVisit[];
  last_assigned_executive?: AssignedExecutive | null;
}

export interface RevisitCustomer {
  id: number;
  customer_name: string;
  mobile_number: string;
  email: string;
  city?: string;
  budget?: string;
  residential_address?: string;
  current_residence?: string;
  purpose_of_buying?: string;
  leads?: RevisitLead[];
}

export interface SearchRevisitCustomersResponse {
  success: boolean;
  count?: number;
  data: RevisitCustomer[];
}

export const searchRevisitCustomers = async (search: string): Promise<SearchRevisitCustomersResponse> => {
  try {
    const response = await axiosClient.get('/customers/revisit/search', {
      params: { search },
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as SearchRevisitCustomersResponse;
    }
    throw error;
  }
};

export interface CreateRevisitPayload {
  customer_id: number;
  lead_id: number;
  project_id?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  purpose?: string;
  note?: string;
}

export interface CreateRevisitResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const createRevisit = async (payload: CreateRevisitPayload): Promise<CreateRevisitResponse> => {
  try {
    const response = await axiosClient.post('/customers/revisit/create', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateRevisitResponse;
    }
    throw error;
  }
};

export interface BrokerItem {
  id: number;
  name: string;
  mobile_number: string;
  email: string;
  company_name?: string;
}

export interface GetReceptionistBrokersResponse {
  success: boolean;
  data: BrokerItem[];
  message?: string;
}

export const getReceptionistBrokers = async (search?: string): Promise<GetReceptionistBrokersResponse> => {
  try {
    const url = search ? `/customers/receptionist/brokers?Search=${encodeURIComponent(search)}` : '/customers/receptionist/brokers';
    const response = await axiosClient.get(url, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as GetReceptionistBrokersResponse;
    }
    throw error;
  }
};



export interface CreateRevisitOnServerPayload {
  lead_id: number;
  date: string;
  time: string;
  pickup?: number;
  pickup_location?: string;
  is_completed: boolean;
}

export interface CreateRevisitOnServerResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const createRevisitOnServer = async (payload: CreateRevisitOnServerPayload): Promise<CreateRevisitOnServerResponse> => {
  try {
    const response = await axiosClient.post('/visits/create-revisit', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as CreateRevisitResponse;
    }
    throw error;
  }
};

export interface TransferVisitAllocationPayload {
  lead_id: number;
  sales_executive_id: number;
}

export interface TransferVisitAllocationResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const transferLeadVisitAllocation = async (payload: TransferVisitAllocationPayload): Promise<TransferVisitAllocationResponse> => {
  try {
    const response = await axiosClient.put('/leads/transfer-visit-allocation', payload, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as TransferVisitAllocationResponse;
    }
    throw error;
  }
};
