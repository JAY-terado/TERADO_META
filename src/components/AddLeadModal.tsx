import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  UserPlus,
  User,
  Phone,
  Mail,
  Building,
  Tag,
  Check,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Compass,
  FileText,
  CheckCircle2,
  Users,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  createLeadWithCustomer,
  reassignVisitor,
  getReceptionistBrokers,
  getReceptionistProjects,
  requestCustomerMobileOtp,
  verifyCustomerMobileOtp,
} from '../pages/api/registercustomer';
import { getProjectsDropdownList } from '../pages/api/projects';
import { getUsers } from '../admin/api/users';
import { getUserPermissions, fetchAndStoreUserProfile } from '../pages/api/login';
import axiosClient from '../../axiosinstance';
import Cookies from 'js-cookie';

export interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdLead?: any) => void;
  defaultProjectId?: string | number;
  currentSalesExecutiveId?: string | number | null;
  currentSalesExecutiveName?: string;
  projects?: any[];
  isOtpMandatory?: boolean;
}

const SOURCE_OPTIONS = [
  { label: 'Direct / Walk-In', value: 'Direct / Walk-in', icon: '🚶' },
  { label: 'Channel Partner', value: 'Broker', icon: '🤝' },
  { label: 'Referral', value: 'Referral', icon: '👥' },
  { label: 'Digital / Web', value: 'Digital Marketing', icon: '📱' },
  { label: 'Other', value: 'Other', icon: '🌐' },
];

const UNIT_TYPE_OPTIONS = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  'Studio',
  'Penthouse',
  'Commercial',
  'Shop',
  'Office',
  'Plot',
  'Villa',
];

const BUDGET_OPTIONS = [
  '< ₹40L',
  '₹40L - ₹60L',
  '₹60L - ₹80L',
  '₹80L - ₹1 Cr',
  '₹1 Cr - ₹1.5 Cr',
  '₹1.5 Cr - ₹2 Cr',
  '> ₹2 Cr',
];

const SOURCE_OF_INFO_OPTIONS = [
  'Hoarding / Billboard',
  'Social Media (FB/IG/Google)',
  'Newspaper / Print',
  'Radio',
  'Friends & Family',
  'Website',
  'Other',
];

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
  currentSalesExecutiveId,
  currentSalesExecutiveName,
  projects: propProjects = [],
  isOtpMandatory: propIsOtpMandatory,
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Direct / Walk-in');
  const [projectId, setProjectId] = useState<string>('');
  const [unitType, setUnitType] = useState('');
  const [budget, setBudget] = useState('');
  const [purposeOfBuying, setPurposeOfBuying] = useState('');
  const [sourceOfInfo, setSourceOfInfo] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [attendedBy, setAttendedBy] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Mobile OTP Verification States
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Permissions state from /users/profile
  const [profilePermissions, setProfilePermissions] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (propIsOtpMandatory === undefined) {
      fetchAndStoreUserProfile().then((perms) => {
        if (perms) {
          setProfilePermissions(perms);
        }
      });
    }
  }, [isOpen, propIsOtpMandatory]);

  // Resolved isOtpMandatory flag from props or userPermissions from /users/profile
  const resolvedIsOtpMandatory = useMemo(() => {
    if (propIsOtpMandatory !== undefined) return Boolean(propIsOtpMandatory);
    const perms = profilePermissions || getUserPermissions();
    if (perms) {
      return Number(perms.is_otp_mandatory_on_lead_creation) === 1;
    }
    return false;
  }, [propIsOtpMandatory, profilePermissions, isOpen]);

  // Cooldown countdown effect
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const handleMobileChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setMobile(cleaned);
    if (isMobileVerified || otpSent) {
      setIsMobileVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
    }
  };

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number first.');
      return;
    }
    setErrorMessage('');
    setOtpError('');
    setIsSendingOtp(true);
    try {
      const res = await requestCustomerMobileOtp(mobile);
      if (res && res.success) {
        setOtpSent(true);
        setOtpCooldown(30);
        setOtpCode('');
        Swal.fire({
          title: 'OTP Sent!',
          text: `Verification OTP has been sent to +91 ${mobile}`,
          icon: 'success',
          confirmButtonColor: '#1A56DB',
          timer: 2000,
          timerProgressBar: true,
        });
      } else {
        setOtpError(res?.message || 'Failed to send OTP to this number.');
      }
    } catch (err: any) {
      console.error('Error sending mobile OTP:', err);
      setOtpError(err?.response?.data?.message || err.message || 'Failed to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP code.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await verifyCustomerMobileOtp(mobile, otpCode);
      if (res && res.success) {
        setIsMobileVerified(true);
        setOtpSent(false);
        setOtpError('');
        Swal.fire({
          title: 'Mobile Verified!',
          text: `Customer phone number +91 ${mobile} verified successfully.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 1800,
          timerProgressBar: true,
        });
      } else {
        setOtpError(res?.message || 'Invalid OTP code. Please try again.');
      }
    } catch (err: any) {
      console.error('Error verifying customer OTP:', err);
      setOtpError(err?.response?.data?.message || err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Channel partner (Broker) state
  const [brokerId, setBrokerId] = useState('');
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');
  const [brokersList, setBrokersList] = useState<any[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [isBrokerDropdownOpen, setIsBrokerDropdownOpen] = useState(false);
  const brokerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Referral state
  const [referredName, setReferredName] = useState('');
  const [referredMobile, setReferredMobile] = useState('');
  const [referredEmail, setReferredEmail] = useState('');

  // Dropdown lists
  const [projectOptions, setProjectOptions] = useState<{ id: number | string; name: string }[]>([]);
  const [salesExecutives, setSalesExecutives] = useState<{ id: number | string; name: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Submission & Validation
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch projects list
  useEffect(() => {
    if (!isOpen) return;

    if (propProjects && propProjects.length > 0) {
      const mapped = propProjects
        .filter(p => p && (p.id || p.project_id))
        .map(p => ({
          id: p.id || p.project_id,
          name: p.name || p.project_name || `Project #${p.id || p.project_id}`,
        }));
      setProjectOptions(mapped);
      if (!projectId && mapped.length > 0) {
        setProjectId(defaultProjectId ? String(defaultProjectId) : String(mapped[0].id));
      }
      return;
    }

    const loadProjects = async () => {
      try {
        const res = await getProjectsDropdownList();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data.map(p => ({
            id: p.id,
            name: p.project_name,
          }));
          setProjectOptions(list);
          if (!projectId) {
            setProjectId(defaultProjectId ? String(defaultProjectId) : String(list[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load projects for AddLeadModal:', err);
      }
    };

    loadProjects();
  }, [isOpen, propProjects, defaultProjectId]);

  // Load Sales Executives
  useEffect(() => {
    if (!isOpen) return;

    const loadSalesExecutives = async () => {
      setLoadingUsers(true);
      const executivesMap = new Map<string, string>();

      // Pre-seed with current logged in sales executive if provided
      if (currentSalesExecutiveId) {
        const myName = currentSalesExecutiveName ? `${currentSalesExecutiveName} (You)` : 'You (Current User)';
        executivesMap.set(String(currentSalesExecutiveId), myName);
      }

      // Try fetching from users API
      try {
        const usersRes = await getUsers('', 1, 1000);
        if (usersRes && usersRes.success && Array.isArray(usersRes.data)) {
          usersRes.data
            .filter((u: any) => u.role === 'SALES')
            .forEach((u: any) => {
              const uid = String(u.id);
              const label =
                currentSalesExecutiveId && uid === String(currentSalesExecutiveId)
                  ? `${u.full_name || u.email} (You)`
                  : u.full_name || u.email;
              executivesMap.set(uid, label);
            });
        }
      } catch (err) {
        // Sales user might have restricted access to /users, fall back gracefully
        console.warn('Users list fetch restricted or failed, falling back to projects sales team:', err);
      }

      // Populate sales executives from passed propProjects first (if any)
      if (Array.isArray(propProjects)) {
        propProjects.forEach(proj => {
          if (Array.isArray(proj?.sales_executives)) {
            proj.sales_executives.forEach((exec: any) => {
              const eid = String(exec.id);
              if (!executivesMap.has(eid)) {
                const execDisplayName = exec.full_name || exec.name || exec.email || `Executive #${exec.id}`;
                const label =
                  currentSalesExecutiveId && eid === String(currentSalesExecutiveId)
                    ? `${execDisplayName} (You)`
                    : execDisplayName;
                executivesMap.set(eid, label);
              }
            });
          }
        });
      }

      // Check if user is in sales role - do NOT call receptionist projects API in sales role (causes 403 Forbidden)
      const userRole = (Cookies.get('userRole') || '').toLowerCase();
      const isSales =
        userRole === 'sales' ||
        userRole.includes('sales') ||
        (typeof window !== 'undefined' && window.location.pathname.startsWith('/sales'));

      // Also try fetching from receptionist projects only for non-sales roles
      if (!isSales) {
        try {
          const recRes = await getReceptionistProjects();
          if (recRes && recRes.success && Array.isArray(recRes.data)) {
            recRes.data.forEach(proj => {
              if (Array.isArray(proj.sales_executives)) {
                proj.sales_executives.forEach(exec => {
                  const eid = String(exec.id);
                  if (!executivesMap.has(eid)) {
                    const execDisplayName = exec.full_name || (exec as any).name || (exec as any).email || `Executive #${exec.id}`;
                    const label =
                      currentSalesExecutiveId && eid === String(currentSalesExecutiveId)
                        ? `${execDisplayName} (You)`
                        : execDisplayName;
                    executivesMap.set(eid, label);
                  }
                });
              }
            });
          }
        } catch (projErr) {
          console.warn('Projects sales team fetch error:', projErr);
        }
      }

      // If still empty and no currentSalesExecutiveId was passed, query /users/profile
      if (executivesMap.size === 0) {
        try {
          const profileRes = await axiosClient.get('/users/profile');
          if (profileRes.data?.data?.id) {
            const pid = String(profileRes.data.data.id);
            const pname = profileRes.data.data.full_name || profileRes.data.data.name || 'Current User';
            executivesMap.set(pid, `${pname} (You)`);
          }
        } catch (profileErr) {
          console.warn('Profile fetch error for sales ID:', profileErr);
        }
      }

      const formatted = Array.from(executivesMap.entries()).map(([id, name]) => ({
        id,
        name,
      }));

      setSalesExecutives(formatted);

      // Auto-select current sales executive or first executive
      if (!attendedBy) {
        if (currentSalesExecutiveId && executivesMap.has(String(currentSalesExecutiveId))) {
          setAttendedBy(String(currentSalesExecutiveId));
        } else if (formatted.length > 0) {
          setAttendedBy(String(formatted[0].id));
        }
      }
      setLoadingUsers(false);
    };

    loadSalesExecutives();
  }, [isOpen, currentSalesExecutiveId, currentSalesExecutiveName]);

  // Keep attendedBy in sync if currentSalesExecutiveId changes
  useEffect(() => {
    if (currentSalesExecutiveId && !attendedBy) {
      setAttendedBy(String(currentSalesExecutiveId));
    }
  }, [currentSalesExecutiveId]);

  // Fetch Brokers for Channel Partner Source
  const fetchBrokers = async (searchQuery = '') => {
    setLoadingBrokers(true);
    try {
      const res = await getReceptionistBrokers(searchQuery);
      if (res && res.success && Array.isArray(res.data)) {
        setBrokersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleBrokerSearchChange = (query: string) => {
    setBrokerSearchQuery(query);
    if (brokerSearchTimeoutRef.current) {
      clearTimeout(brokerSearchTimeoutRef.current);
    }
    brokerSearchTimeoutRef.current = setTimeout(() => {
      fetchBrokers(query);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (brokerSearchTimeoutRef.current) {
        clearTimeout(brokerSearchTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmail('');
    setSource('Direct / Walk-in');
    setUnitType('');
    setBudget('');
    setPurposeOfBuying('');
    setSourceOfInfo('');
    setResidentialAddress('');
    setVisitDate(new Date().toISOString().split('T')[0]);
    setVisitTime(new Date().toTimeString().slice(0, 5));
    setAttendedBy(currentSalesExecutiveId ? String(currentSalesExecutiveId) : '');
    setBrokerId('');
    setBrokerSearchQuery('');
    setReferredName('');
    setReferredMobile('');
    setReferredEmail('');
    setNotes('');
    setErrorMessage('');
    setIsBrokerDropdownOpen(false);
    setIsMobileVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
    setOtpCooldown(0);
  };

  if (!isOpen) return null;

  const isMobileValid = mobile.trim().length === 10 && !isNaN(Number(mobile.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Customer Name is required.');
      return;
    }
    if (!mobile.trim()) {
      setErrorMessage('Mobile Number is required.');
      return;
    }
    if (!isMobileValid) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (resolvedIsOtpMandatory && !isMobileVerified) {
      setErrorMessage('Customer mobile number must be verified via OTP before creating lead.');
      return;
    }
    if (source === 'Broker' && !brokerId) {
      setErrorMessage('Please search and select a Channel Partner / Broker.');
      return;
    }
    if (!visitDate) {
      setErrorMessage('Please select Visit Date.');
      return;
    }
    if (!visitTime) {
      setErrorMessage('Please select Visit Time.');
      return;
    }
    if (!attendedBy) {
      setErrorMessage('Please select Who Attended (Sales Person).');
      return;
    }

    setSubmitting(true);

    try {
      let finalNote = notes.trim();
      if (source === 'Broker' && brokerId) {
        const foundBroker = brokersList.find(b => String(b.id) === String(brokerId));
        const cpName = foundBroker ? foundBroker.name || foundBroker.broker_name || 'Channel Partner' : 'Channel Partner';
        const cpDetails = `[Channel Partner Association] Partner: ${cpName}`;
        finalNote = finalNote ? `${finalNote}\n\n${cpDetails}` : cpDetails;
      } else if (source === 'Referral' && referredName.trim()) {
        const refDetails = `[Referred By] Name: ${referredName.trim()}, Mobile: ${referredMobile.trim()}${
          referredEmail.trim() ? `, Email: ${referredEmail.trim()}` : ''
        }`;
        finalNote = finalNote ? `${finalNote}\n\n${refDetails}` : refDetails;
      }

      const projIdToUse = projectId
        ? Number(projectId)
        : defaultProjectId
        ? Number(defaultProjectId)
        : projectOptions.length > 0
        ? Number(projectOptions[0].id)
        : undefined;

      const payload: any = {
        customer_name: name.trim(),
        mobile_number: mobile.trim(),
        email: email.trim() || undefined,
        source: source || 'Direct / Walk-in',
        broker_id: source === 'Broker' && brokerId ? Number(brokerId) : undefined,
        referredByName: source === 'Referral' && referredName.trim() ? referredName.trim() : undefined,
        referredByMobileNumber: source === 'Referral' && referredMobile.trim() ? referredMobile.trim() : undefined,
        referredByEmail: source === 'Referral' && referredEmail.trim() ? referredEmail.trim() : undefined,
        project_id: projIdToUse,
        unit_type: unitType || undefined,
        booking_preferences: unitType || undefined,
        budget: budget || undefined,
        purpose_of_buying: purposeOfBuying || undefined,
        current_residence: residentialAddress.trim() || undefined,
        residential_address: residentialAddress.trim() || undefined,
        source_of_project_information: sourceOfInfo || undefined,
        note: finalNote || undefined,
        purpose: 'Site Visit',
        scheduled_visit_date: visitDate,
        scheduled_visit_time: visitTime,
        sales_executive_id: attendedBy ? Number(attendedBy) : undefined,
      };

      const res = await createLeadWithCustomer(payload);

      if (res && res.success) {
        const rAny = res as any;
        const visitIdVal =
          rAny.data?.visit?.id ||
          rAny.data?.visit_id ||
          rAny.visit?.id ||
          rAny.visit_id ||
          rAny.data?.id ||
          rAny.id;

        if (attendedBy && visitIdVal) {
          try {
            await reassignVisitor(visitIdVal, {
              sales_executive_id: Number(attendedBy),
              note: 'Assigned attending sales executive during lead creation from Sales Desk',
            });
          } catch (reassignErr) {
            console.error('Failed to reassign visitor:', reassignErr);
          }
        }

        Swal.fire({
          title: 'Lead Added Successfully!',
          html: `<div class="text-sm text-slate-600">Customer <b>${name.trim()}</b> has been registered and added to your Sales Pipeline.</div>`,
          icon: 'success',
          confirmButtonColor: '#1A56DB',
          confirmButtonText: 'Done',
        });

        resetForm();
        onClose();
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setErrorMessage(res?.message || 'Failed to create lead. Please review the details and try again.');
      }
    } catch (err: any) {
      console.error('Error creating lead in AddLeadModal:', err);
      setErrorMessage(
        err?.response?.data?.message || err.message || 'An unexpected error occurred while creating lead.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isFormInvalid =
    !name.trim() ||
    !isMobileValid ||
    (resolvedIsOtpMandatory && !isMobileVerified) ||
    (source === 'Broker' && !brokerId) ||
    !visitDate ||
    !visitTime ||
    !attendedBy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white w-full max-w-3xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-linear-to-r from-blue-50/50 via-indigo-50/30 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">Add New Lead</h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                  Sales Desk
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Register walk-in, broker referral or client inquiry into your sales pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left custom-scrollbar">
          {/* Section 1: Customer Contact Details */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Customer Information
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Customer Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    {resolvedIsOtpMandatory && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          isMobileVerified
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isMobileVerified ? 'Verified' : 'OTP Required'}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${mobile.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {mobile.length}/10
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                    <span className="text-[11px] font-bold text-slate-500">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    disabled={isMobileVerified}
                    value={mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="10-digit mobile number"
                    className={`w-full pl-11 pr-24 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 transition ${
                      isMobileVerified
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900'
                        : mobile.length === 10
                        ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/15'
                    }`}
                  />

                  {/* Verification action button / verified badge inside input */}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isMobileVerified ? (
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Verified</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileVerified(false);
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                          className="ml-1 text-[9px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Change mobile number"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : resolvedIsOtpMandatory ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={mobile.length !== 10 || isSendingOtp || otpCooldown > 0}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer ${
                          mobile.length !== 10 || otpCooldown > 0 || isSendingOtp
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95'
                        }`}
                      >
                        {isSendingOtp ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <KeyRound className="w-3 h-3" />
                        )}
                        <span>{otpCooldown > 0 ? `${otpCooldown}s` : otpSent ? 'Resend' : 'Send OTP'}</span>
                      </button>
                    ) : (
                      mobile.length === 10 && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 pointer-events-none" />
                      )
                    )}
                  </div>
                </div>

                {/* OTP Verification Sub-Card when OTP is sent */}
                {resolvedIsOtpMandatory && otpSent && !isMobileVerified && (
                  <div className="mt-2 p-3 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        Enter 6-digit OTP code sent to +91 {mobile}
                      </span>
                      {otpCooldown > 0 && (
                        <span className="text-[10px] text-amber-700">Resend in {otpCooldown}s</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        autoFocus
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setOtpCode(val);
                          setOtpError('');
                        }}
                        placeholder="6-digit code"
                        className="w-32 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-black tracking-widest text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpCode.length !== 6 || isVerifyingOtp}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          otpCode.length !== 6 || isVerifyingOtp
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95'
                        }`}
                      >
                        {isVerifyingOtp ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Verify OTP</span>
                          </>
                        )}
                      </button>
                    </div>
                    {otpError && (
                      <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Source & Channel Partner / Referral */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Lead Source <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Tap to switch source category
              </span>
            </div>

            {/* Quick Source Pill Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {SOURCE_OPTIONS.map((opt) => {
                const isSelected = source === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSource(opt.value);
                      if (opt.value === 'Broker' && brokersList.length === 0) {
                        fetchBrokers('');
                      }
                    }}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100/80'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Channel Partner (Broker) Autocomplete Search */}
            {source === 'Broker' && (
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-blue-900 block">
                    Select Channel Partner / Broker <span className="text-red-500">*</span>
                  </label>
                  {loadingBrokers && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={brokerSearchQuery}
                      onFocus={() => {
                        setIsBrokerDropdownOpen(true);
                        if (brokersList.length === 0) fetchBrokers('');
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleBrokerSearchChange(val);
                        setBrokerId('');
                        setIsBrokerDropdownOpen(true);
                      }}
                      placeholder="Type broker name, agency, or phone number..."
                      className={`w-full pl-8 pr-8 py-2 bg-white border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer ${
                        brokerId ? 'border-emerald-500 bg-emerald-50/30' : 'border-blue-200 focus:border-blue-500'
                      }`}
                    />
                    {brokerId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBrokerId('');
                          setBrokerSearchQuery('');
                          fetchBrokers('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                  </div>

                  {/* Floating Broker Results */}
                  {isBrokerDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsBrokerDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-blue-100 rounded-2xl shadow-2xl z-30 overflow-hidden text-left max-h-48 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                        {brokersList.length === 0 ? (
                          <div className="p-3 text-center text-xs font-medium text-slate-400">
                            {loadingBrokers ? 'Searching channel partners...' : 'No channel partners found'}
                          </div>
                        ) : (
                          brokersList.map((b) => {
                            const isSelected = String(b.id) === String(brokerId);
                            const nameStr = b.name || b.broker_name || `Partner #${b.id}`;
                            const firmStr = b.company_name ? ` (${b.company_name})` : '';
                            const phoneStr = b.mobile_number || b.contact_number || '';
                            const fullLabel = `${nameStr}${firmStr}${phoneStr ? ` - ${phoneStr}` : ''}`;

                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setBrokerId(String(b.id));
                                  setBrokerSearchQuery(fullLabel);
                                  setIsBrokerDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-xs transition flex items-center justify-between cursor-pointer hover:bg-blue-50/70 ${
                                  isSelected ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-slate-800">
                                    {nameStr} {firmStr && <span className="font-normal text-slate-500">{firmStr}</span>}
                                  </div>
                                  {phoneStr && <div className="text-[10px] text-slate-400">{phoneStr}</div>}
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Referral Inputs */}
            {source === 'Referral' && (
              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-purple-900 block">
                  Referral Association Details
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={referredName}
                    onChange={(e) => setReferredName(e.target.value)}
                    placeholder="Referrer Full Name"
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    value={referredMobile}
                    onChange={(e) => setReferredMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Referrer Mobile Number"
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="email"
                    value={referredEmail}
                    onChange={(e) => setReferredEmail(e.target.value)}
                    placeholder="Referrer Email (Optional)"
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Project & Requirements */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Property & Preferences
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Project Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {projectOptions.length === 0 ? (
                      <option value="">Loading Projects...</option>
                    ) : (
                      projectOptions.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Unit Configuration */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Configuration / Unit</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Any Configuration</option>
                  {UNIT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Range */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Budget Range</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Any Budget</option>
                  {BUDGET_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
              {/* Buying Purpose */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Purpose of Buying</label>
                <select
                  value={purposeOfBuying}
                  onChange={(e) => setPurposeOfBuying(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Purpose...</option>
                  <option value="End User">End User</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>

              {/* Source of Info */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Information Source</label>
                <select
                  value={sourceOfInfo}
                  onChange={(e) => setSourceOfInfo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Info Source...</option>
                  {SOURCE_OF_INFO_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Residential City / Address */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Current Residence / City</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    placeholder="e.g. Bandra West, Mumbai"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Visit & Attending Sales Executive */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">
                  Site Visit & Executive Assignment
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-md">
                Auto-assigned to You
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Visit Date */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Visit Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Visit Time */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Visit Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Who Attended */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Who Attended (Sales Person) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={attendedBy}
                  onChange={(e) => setAttendedBy(e.target.value)}
                  className={`w-full px-3 py-1.5 bg-white border rounded-xl text-xs font-semibold focus:outline-none cursor-pointer transition ${
                    !attendedBy
                      ? 'border-amber-400 text-amber-700 bg-amber-50/50'
                      : 'border-blue-200 text-slate-800 focus:border-blue-500'
                  }`}
                >
                  <option value="">Select Sales Person *</option>
                  {salesExecutives.map((opt) => (
                    <option key={opt.id} value={String(opt.id)}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Remarks / Notes */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Discussion Notes / Requirements <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key notes, buyer requirements, unit preferences, or next steps..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition resize-none"
            />
          </div>

          {/* Error message banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
            {resolvedIsOtpMandatory && !isMobileVerified ? (
              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                Customer mobile verification via OTP is required
              </span>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                disabled={submitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || isFormInvalid}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer ${
                  submitting || isFormInvalid
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering Lead...</span>
                  </>
                ) : resolvedIsOtpMandatory && !isMobileVerified ? (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Verify Mobile to Add Lead</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Lead</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
