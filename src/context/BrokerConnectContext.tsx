import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { getAllProjects, getProjectsDropdownList } from '../pages/api/projects';

// Types
export interface Broker {
  id: string;
  name: string;
  mobile: string;
  status: 'Active' | 'Pending Approval' | 'Suspended';
  companyName?: string;
  brokerType?: string;
  altMobile?: string;
  email?: string;
  gender?: string;
  addressLine1?: string;
  addressLine2?: string;
  areaLocality?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  reraNumber?: string;
  reraExpiry?: string;
  panNumber?: string;
  gstNumber?: string;
  yearsExperience?: string;
  totalProjects?: number;
  totalLeads?: number;
  totalVisits?: number;
  totalBookings?: number;
}

export interface Project {
  id?: number | string;
  name: string;
  location: string;
  towers: number;
  units: number;
  status: 'Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold';
  project_type?: string;
  launch_date?: string;
  possession_date?: string;
  country?: string;
  state?: string;
  city?: string;
  area_locality?: string;
  landmark?: string;
  full_address?: string;
  pincode?: string;
  rera_registration_number?: string;
  rera_registration_date?: string;
  rera_expiry_date?: string;
  facilities?: string[];
  unit_configs?: {
    unit_type: string;
    budgets: string[];
  }[];
}

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  project: string;
  unitType: string;
  budget: string;
  expectedDate: string;
  expectedTime: string;
  brokerId: string;
  brokerName: string;
  status: 'OTP Pending' | 'OTP Verified' | 'Checked In' | 'Allocated' | 'Follow-Up' | 'Negotiation' | 'Booked' | 'New' | 'Called' | 'Followup' | 'Visit Scheduled' | 'Lost' | 'Not Interested';
  otp: string;
  visitCode: string;
  registeredOn: string;
  ownershipValidTill: string;
  address?: string;
  occupation?: string;
  company?: string;
  documents?: {
    pan?: boolean;
    aadhaar?: boolean;
  };
  selfieUrl?: string;
  assignedExecutive?: string;
  allocationTime?: string;
  lastActivity?: string;
  visitDate?: string;
  followupTime?: string;
  pickupRequired?: 'Yes' | 'No';
  pickupPoint?: string;
  additionalNotes?: string;
  source?: 'Website' | 'Broker' | 'Facebook' | 'Google' | 'IMPORT';
  leadDetailsId?: number;
  expectedBookingDuration?: string;
}

export interface Booking {
  id: string;
  leadId: string;
  customerName: string;
  project: string;
  tower: string;
  paymentSchedule?: string;
  floor: string;
  unitNo: string;
  bookingAmount: number;
  agreementValue: number;
  bookingDate: string;
  status: 'Booked' | 'Cancelled';
}

export interface Commission {
  id: string;
  bookingId: string;
  customerName: string;
  brokerName: string;
  agreementValue: number;
  commissionPercent: number;
  commissionAmount: number;
  status: 'Pending' | 'Approved' | 'Paid';
  expectedPayoutDate: string;
}

export interface Dispute {
  id: string;
  customerName: string;
  mobile: string;
  brokerAId: string;
  brokerAName: string;
  brokerBId: string;
  brokerBName: string;
  raisedOn: string;
  status: 'Under Review' | 'Resolved (Broker A)' | 'Resolved (Broker B)' | 'Rejected';
  otpVerified: boolean;
  registrationTime: string;
  visitHistory: number;
  customerConsent: boolean;
}

interface BrokerConnectContextType {
  brokers: Broker[];
  projects: Project[];
  leads: Lead[];
  bookings: Booking[];
  commissions: Commission[];
  disputes: Dispute[];
  currentRole: 'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner';
  setCurrentRole: (role: 'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner') => void;
  activeScreen: number; // 1 to 16 matching the mock screens
  setActiveScreen: (screen: number) => void;
  deviceMode: 'desktop' | 'mobile' | 'responsive';
  setDeviceMode: (mode: 'desktop' | 'mobile' | 'responsive') => void;

  // Actions
  registerLead: (leadData: Omit<Lead, 'id' | 'otp' | 'visitCode' | 'registeredOn' | 'ownershipValidTill' | 'status'>) => { leadId: string; otp: string; disputeRaised: boolean };
  verifyLeadOTP: (leadId: string, enteredOtp: string) => boolean;
  checkInVisitor: (leadId: string, details: { address: string; occupation: string; company: string; panUploaded: boolean; aadhaarUploaded: boolean; selfieCaptured: boolean }) => void;
  autoAllocateSales: (leadId: string) => string;
  reallocateSales: (leadId: string, executive: string) => void;
  updateLeadStage: (leadId: string, stage: Lead['status']) => void;
  updateCallingLead: (leadId: string, updates: { project?: string; unitType: string; budget: string; expectedDate: string; status: Lead['status']; visitDate?: string; followupTime?: string; expectedTime?: string; pickupRequired?: 'Yes' | 'No'; pickupPoint?: string; additionalNotes?: string; source?: 'Website' | 'Broker' | 'Facebook' | 'Google' | 'IMPORT'; expectedBookingDuration?: string }) => void;
  createBooking: (bookingData: Omit<Booking, 'id' | 'bookingDate' | 'status'>) => void;
  approveCommission: (commissionId: string) => void;
  payCommission: (commissionId: string) => void;
  resolveDispute: (disputeId: string, decision: 'brokerA' | 'brokerB' | 'reject') => void;
  addBroker: (brokerData: Omit<Broker, 'id' | 'status'>) => void;
  approveBroker: (brokerId: string) => void;
  toggleBrokerStatus: (brokerId: string) => void;
  addProject: (project: Project) => void;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;

  // Simulation Helpers
  resetSimulation: () => void;
  selectedProjectId: number | string | null;
  setSelectedProjectId: (id: number | string | null) => void;
}

const BrokerConnectContext = createContext<BrokerConnectContextType | undefined>(undefined);

const initialBrokers: Broker[] = [
  { id: 'BRK-001', name: 'Amit Patel', mobile: '98765 43210', status: 'Active', companyName: 'Patel Realty' },
  { id: 'BRK-002', name: 'Kiran Desai', mobile: '91234 56789', status: 'Active', companyName: 'Desai Properties' },
  { id: 'BRK-003', name: 'Neha Gupta', mobile: '90887 76655', status: 'Pending Approval', companyName: 'Gupta Estates' },
  { id: 'BRK-004', name: 'Rohit Sharma', mobile: '88998 87766', status: 'Suspended', companyName: 'Sharma & Co.' },
  { id: 'BRK-005', name: 'Vikram Singh', mobile: '88776 65544', status: 'Active', companyName: 'Singh Infra' },
];

const initialProjects: Project[] = [];

const initialLeads: Lead[] = [];

const initialBookings: Booking[] = [];

const initialCommissions: Commission[] = [];

const initialDisputes: Dispute[] = [];

const salesExecutives = ['Executive A', 'Executive B', 'Executive C', 'Executive D'];

const screenToPath: Record<number, string> = {
  2: '/broker/dashboard',
  3: '/broker/register-lead',
  5: '/broker/visit-pass',
  6: '/receptionist/dashboard',
  7: '/receptionist/checkin',
  8: '/receptionist/appointments',
  9: '/sales/dashboard',
  10: '/sales/leads',
  11: '/sales/bookings',
  12: '/broker/commission',
  13: '/admin/disputes',
  14: '/admin/dashboard',
  15: '/admin/brokers',
  16: '/admin/projects',
  17: '/admin/settings',
  18: '/calling/dashboard',
  19: '/calling/leads',
  20: '/broker/profile',
  21: '/calling/visit-pass',
  22: '/calling/profile',
  23: '/admin/users',
  24: '/admin/leads',
  25: '/sales/profile',
  26: '/receptionist/register-customer',
  27: '/receptionist/register-broker',
  28: '/channel-partner/dashboard',
  29: '/channel-partner/leads',
  // 30: '/channel-partner/commissions',
  // 31: '/channel-partner/projects',
  32: '/channel-partner/profile',
};

const pathToScreen: Record<string, { screen: number; role: 'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner' }> = {
  '/broker/dashboard': { screen: 2, role: 'broker' },
  '/broker/register-lead': { screen: 3, role: 'broker' },
  '/broker/visit-pass': { screen: 5, role: 'broker' },
  '/receptionist/dashboard': { screen: 6, role: 'receptionist' },
  '/receptionist/checkin': { screen: 7, role: 'receptionist' },
  '/receptionist/appointments': { screen: 8, role: 'receptionist' },
  '/sales/dashboard': { screen: 9, role: 'sales' },
  '/sales/leads': { screen: 10, role: 'sales' },
  '/sales/bookings': { screen: 11, role: 'sales' },
  '/broker/commission': { screen: 12, role: 'broker' },
  '/sales/commission': { screen: 12, role: 'sales' },
  '/admin/disputes': { screen: 13, role: 'admin' },
  '/admin/dashboard': { screen: 14, role: 'admin' },
  '/admin/brokers': { screen: 15, role: 'admin' },
  '/admin/projects': { screen: 16, role: 'admin' },
  '/admin/settings': { screen: 17, role: 'admin' },
  '/calling/dashboard': { screen: 18, role: 'calling' },
  '/calling/leads': { screen: 19, role: 'calling' },
  '/broker/profile': { screen: 20, role: 'broker' },
  '/calling/visit-pass': { screen: 21, role: 'calling' },
  '/calling/profile': { screen: 22, role: 'calling' },
  '/admin/users': { screen: 23, role: 'admin' },
  '/admin/leads': { screen: 24, role: 'admin' },
  '/sales/profile': { screen: 25, role: 'sales' },
  '/receptionist/register-customer': { screen: 26, role: 'receptionist' },
  '/receptionist/register-broker': { screen: 27, role: 'receptionist' },
  '/channel-partner/dashboard': { screen: 28, role: 'channel_partner' },
  '/channel-partner/leads': { screen: 29, role: 'channel_partner' },
  // '/channel-partner/commissions': { screen: 30, role: 'channel_partner' },
  // '/channel-partner/projects': { screen: 31, role: 'channel_partner' },
  '/channel-partner/profile': { screen: 32, role: 'channel_partner' },
  '/receptionist/profile': { screen: 33, role: 'receptionist' },
};

export const BrokerConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brokers, setBrokers] = useState<Broker[]>(initialBrokers);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | string | null>(() => {
    try {
      const saved = localStorage.getItem('selectedProjectId') || Cookies.get('selectedProjectId');
      if (saved === 'null' || saved === null || saved === undefined || saved === '') return null;
      return isNaN(Number(saved)) ? saved : Number(saved);
    } catch (e) {
      return null;
    }
  });

  const setSelectedProjectId = (id: number | string | null) => {
    setSelectedProjectIdState(id);
    if (id === null || id === undefined || id === '') {
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('selectedProjectName');
      localStorage.removeItem('admin_leads_selectedProject');
      Cookies.remove('selectedProjectId');
      Cookies.remove('selectedProjectName');
    } else {
      localStorage.setItem('selectedProjectId', String(id));
      localStorage.setItem('admin_leads_selectedProject', String(id));
      Cookies.set('selectedProjectId', String(id), { expires: 30 });
    }
  };
  const [commissions, setCommissions] = useState<Commission[]>(initialCommissions);
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);

  const [currentRole, setCurrentRoleState] = useState<'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner'>('broker');
  const [activeScreen, setActiveScreenState] = useState<number>(2); // Starts on Broker Dashboard
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile' | 'responsive'>('responsive');
  const [roundRobinIndex, setRoundRobinIndex] = useState<number>(1); // Current pointer: Executive B

  const location = useLocation();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const dropRes = await getProjectsDropdownList();
      if (dropRes && dropRes.success && dropRes.data && Array.isArray(dropRes.data) && dropRes.data.length > 0) {
        const mapped = dropRes.data.map(p => ({
          id: p.id,
          name: p.project_name,
          location: (p as any).city || (p as any).area_locality || 'N/A',
          towers: (p as any).towers || 1,
          units: (p as any).units || 100,
          status: 'Active' as const,
        }));
        setProjects(mapped);
        return;
      }
    } catch (dropErr) {
      console.warn('Projects dropdown fetch error, falling back to getAllProjects:', dropErr);
    }

    try {
      const res = await getAllProjects();
      if (res && res.success && res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(p => ({
          id: p.id,
          name: p.project_name,
          location: p.city || p.area_locality || 'N/A',
          towers: p.towers || 1,
          units: p.units || 100,
          status: 'Active' as const,
        }));
        setProjects(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch projects in context:', err);
    }
  };

  useEffect(() => {
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!isAuthPage && token) {
      fetchProjects();
    }
  }, [location.pathname]);

  const setActiveScreen = (screen: number) => {
    if (screen === 12) {
      if (currentRole === 'sales') {
        navigate('/sales/commission');
      } else {
        navigate('/broker/commission');
      }
      return;
    }
    const path = screenToPath[screen];
    if (path) {
      navigate(path);
    }
  };

  const setCurrentRole = (role: 'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner') => {
    setCurrentRoleState(role);
    if (role === 'broker') {
      navigate('/broker/dashboard');
    } else if (role === 'receptionist') {
      navigate('/receptionist/dashboard');
    } else if (role === 'sales') {
      navigate('/sales/dashboard');
    } else if (role === 'admin') {
      navigate('/admin/dashboard');
    } else if (role === 'calling') {
      navigate('/calling/dashboard');
    } else if (role === 'channel_partner') {
      navigate('/channel-partner/dashboard');
    }
  };

  const updateCallingLead = (
    leadId: string,
    updates: {
      project?: string;
      unitType: string;
      budget: string;
      expectedDate: string;
      status: Lead['status'];
      visitDate?: string;
      followupTime?: string;
      expectedTime?: string;
      pickupRequired?: 'Yes' | 'No';
      pickupPoint?: string;
      additionalNotes?: string;
      source?: 'Website' | 'Broker' | 'Facebook' | 'Google' | 'IMPORT';
      expectedBookingDuration?: string;
    }
  ) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        if (lead.status === 'Visit Scheduled') return lead;
        return {
          ...lead,
          ...updates,
          lastActivity: new Date().toISOString().split('T')[0],
        };
      }
      return lead;
    }));
  };

  // Sync pathname to activeScreen and currentRole
  useEffect(() => {
    let pathname = location.pathname;
    if (pathname.startsWith('/channel-partner/brokers/') && pathname.endsWith('/leads')) {
      pathname = '/channel-partner/leads';
    }

    const match = pathToScreen[pathname];
    if (match) {
      if (activeScreen !== match.screen) {
        setActiveScreenState(match.screen);
      }
      if (pathname === '/broker/commission' || pathname === '/sales/commission') {
        if (currentRole !== 'broker' && currentRole !== 'sales') {
          setCurrentRoleState(match.role);
        }
      } else if (currentRole !== match.role) {
        setCurrentRoleState(match.role);
      }
    }
  }, [location.pathname, activeScreen, currentRole]);

  // Actions
  const registerLead = (leadData: Omit<Lead, 'id' | 'otp' | 'visitCode' | 'registeredOn' | 'ownershipValidTill' | 'status'>) => {
    // Check if customer mobile is already registered by another broker (trigger dispute simulation)
    const existingActiveLead = leads.find(l => l.mobile.replace(/\s+/g, '') === leadData.mobile.replace(/\s+/g, '') && l.status !== 'Booked');

    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const newId = `L-${Date.now().toString().slice(-4)}`;
    const newVisitCode = `VIS-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);
    const expiryStr = expiry.toISOString().split('T')[0];

    const currentBroker = brokers.find(b => b.id === leadData.brokerId) || brokers[0];

    let disputeRaised = false;

    if (existingActiveLead && existingActiveLead.brokerId !== leadData.brokerId) {
      // Create a dispute
      const newDispute: Dispute = {
        id: `DSP-2026-000${Math.floor(10 + Math.random() * 90)}`,
        customerName: leadData.name,
        mobile: leadData.mobile,
        brokerAId: existingActiveLead.brokerId,
        brokerAName: existingActiveLead.brokerName,
        brokerBId: currentBroker.id,
        brokerBName: currentBroker.name,
        raisedOn: today,
        status: 'Under Review',
        otpVerified: true,
        registrationTime: `${today}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        visitHistory: 0,
        customerConsent: true,
      };
      setDisputes(prev => [newDispute, ...prev]);
      disputeRaised = true;
    }

    const newLead: Lead = {
      ...leadData,
      id: newId,
      status: 'OTP Pending',
      otp: randomOtp,
      visitCode: newVisitCode,
      registeredOn: today,
      ownershipValidTill: expiryStr,
      brokerName: currentBroker.name,
      lastActivity: today,
    };

    setLeads(prev => [newLead, ...prev]);

    return { leadId: newId, otp: randomOtp, disputeRaised };
  };

  const verifyLeadOTP = (leadId: string, enteredOtp: string) => {
    let success = false;
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId && (lead.otp === enteredOtp || enteredOtp === '1234')) { // Bypass for easy demo
        success = true;
        return {
          ...lead,
          status: 'OTP Verified',
          lastActivity: new Date().toISOString().split('T')[0],
        };
      }
      return lead;
    }));
    return success;
  };

  const checkInVisitor = (leadId: string, details: { address: string; occupation: string; company: string; panUploaded: boolean; aadhaarUploaded: boolean; selfieCaptured: boolean }) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          status: 'Checked In',
          address: details.address,
          occupation: details.occupation,
          company: details.company,
          documents: { pan: details.panUploaded, aadhaar: details.aadhaarUploaded },
          selfieUrl: details.selfieCaptured ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' : undefined,
          lastActivity: new Date().toISOString().split('T')[0],
        };
      }
      return lead;
    }));
  };

  const autoAllocateSales = (leadId: string) => {
    const allocatedExec = salesExecutives[roundRobinIndex];

    // Increment Round Robin Executive Index
    setRoundRobinIndex(prev => (prev + 1) % salesExecutives.length);

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          status: 'Allocated',
          assignedExecutive: allocatedExec,
          allocationTime: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
          lastActivity: new Date().toISOString().split('T')[0],
        };
      }
      return lead;
    }));

    return allocatedExec;
  };

  const reallocateSales = (leadId: string, executive: string) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          assignedExecutive: executive,
          allocationTime: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
          lastActivity: new Date().toISOString().split('T')[0],
        };
      }
      return lead;
    }));
  };

  const updateLeadStage = (leadId: string, stage: Lead['status']) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          status: stage,
          lastActivity: new Date().toISOString().split('T')[0],
        };
      }
      return lead;
    }));
  };

  const createBooking = (bookingData: Omit<Booking, 'id' | 'bookingDate' | 'status'>) => {
    const newBookingId = `BK-2026-00${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];

    const newBooking: Booking = {
      ...bookingData,
      id: newBookingId,
      bookingDate: today,
      status: 'Booked',
    };

    setBookings(prev => [newBooking, ...prev]);

    // Update lead status to Booked
    updateLeadStage(bookingData.leadId, 'Booked');

    // Auto-generate commission record (e.g. 2% standard)
    const currentLead = leads.find(l => l.id === bookingData.leadId);
    const brokerName = currentLead ? currentLead.brokerName : 'Amit Patel';

    const commissionPercent = 2.0;
    const commissionAmount = (bookingData.agreementValue * commissionPercent) / 100;
    const payoutDate = new Date();
    payoutDate.setDate(payoutDate.getDate() + 30);

    const newCommission: Commission = {
      id: `COM-2026-00${Math.floor(100 + Math.random() * 900)}`,
      bookingId: newBookingId,
      customerName: bookingData.customerName,
      brokerName: brokerName,
      agreementValue: bookingData.agreementValue,
      commissionPercent: commissionPercent,
      commissionAmount: commissionAmount,
      status: 'Pending',
      expectedPayoutDate: payoutDate.toISOString().split('T')[0],
    };

    setCommissions(prev => [newCommission, ...prev]);
  };

  const approveCommission = (commissionId: string) => {
    setCommissions(prev => prev.map(com => {
      if (com.id === commissionId) {
        return { ...com, status: 'Approved' };
      }
      return com;
    }));
  };

  const payCommission = (commissionId: string) => {
    setCommissions(prev => prev.map(com => {
      if (com.id === commissionId) {
        return { ...com, status: 'Paid' };
      }
      return com;
    }));
  };

  const resolveDispute = (disputeId: string, decision: 'brokerA' | 'brokerB' | 'reject') => {
    setDisputes(prev => prev.map(disp => {
      if (disp.id === disputeId) {
        let status: Dispute['status'] = 'Under Review';
        if (decision === 'brokerA') status = 'Resolved (Broker A)';
        else if (decision === 'brokerB') status = 'Resolved (Broker B)';
        else if (decision === 'reject') status = 'Rejected';
        return { ...disp, status };
      }
      return disp;
    }));
  };

  const addBroker = (brokerData: Omit<Broker, 'id' | 'status'>) => {
    const newBrokerId = `BRK-00${brokers.length + 1}`;
    setBrokers(prev => [...prev, {
      ...brokerData,
      id: newBrokerId,
      status: 'Pending Approval',
    }]);
  };

  const approveBroker = (brokerId: string) => {
    const normId = brokerId.startsWith('BRK-') ? brokerId.slice(4).replace(/^0+/, '') : brokerId;
    setBrokers(prev => prev.map(b => {
      const bNorm = b.id.startsWith('BRK-') ? b.id.slice(4).replace(/^0+/, '') : b.id;
      return bNorm === normId ? { ...b, status: 'Active' } : b;
    }));
  };

  const toggleBrokerStatus = (brokerId: string) => {
    const normId = brokerId.startsWith('BRK-') ? brokerId.slice(4).replace(/^0+/, '') : brokerId;
    setBrokers(prev => prev.map(b => {
      const bNorm = b.id.startsWith('BRK-') ? b.id.slice(4).replace(/^0+/, '') : b.id;
      if (bNorm === normId) {
        const nextStatus: Broker['status'] = b.status === 'Active' ? 'Suspended' : 'Active';
        return { ...b, status: nextStatus };
      }
      return b;
    }));
  };

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const resetSimulation = () => {
    setBrokers(initialBrokers);
    fetchProjects();
    setLeads(initialLeads);
    setBookings(initialBookings);
    setCommissions(initialCommissions);
    setDisputes(initialDisputes);
    setRoundRobinIndex(1);
    setCurrentRole('broker');
    setActiveScreen(2);
    setSelectedProjectId(null);
  };

  return (
    <BrokerConnectContext.Provider value={{
      brokers,
      projects,
      leads,
      bookings,
      commissions,
      disputes,
      currentRole,
      setCurrentRole,
      activeScreen,
      setActiveScreen,
      deviceMode,
      setDeviceMode,

      registerLead,
      verifyLeadOTP,
      checkInVisitor,
      autoAllocateSales,
      reallocateSales,
      updateLeadStage,
      updateCallingLead,
      createBooking,
      approveCommission,
      payCommission,
      resolveDispute,
      addBroker,
      approveBroker,
      toggleBrokerStatus,
      addProject,
      setProjects,
      setLeads,
      resetSimulation,
      selectedProjectId,
      setSelectedProjectId,
    }}>
      {children}
    </BrokerConnectContext.Provider>
  );
};

export const useBrokerConnect = () => {
  const context = useContext(BrokerConnectContext);
  if (context === undefined) {
    throw new Error('useBrokerConnect must be used within a BrokerConnectProvider');
  }
  return context;
};
