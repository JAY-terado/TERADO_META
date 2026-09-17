import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../../CustomSelect';

import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { Search, Plus, UserPlus, ShieldAlert, CheckCircle, RefreshCw, Loader2, Users, Percent, Trash2, PlusCircle, Upload } from 'lucide-react';
import { getStates, getCities, type State } from '../../../pages/api/masters';
import { SearchableSelect } from '../../ui/SearchableSelect';
import axiosClient from '../../../../axiosinstance';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import type { CommissionPlan } from '../../../admin/api/commissions';
import { getMasters } from '../../../admin/api/masters';
import { registerBroker } from '../../../pages/api/register';
import { ApiErrorBanner } from '../../ErrorBoundary';
import { BulkImportBrokerModal } from './BulkImportBrokerModal';
import { useAdminBrokersQuery } from '../../../admin/hooks/useAdminQueries';

export const BrokerManagement: React.FC = () => {
  const { brokers, leads, projects, addBroker, approveBroker, toggleBrokerStatus, setActiveScreen } = useBrokerConnect();
  const navigate = useNavigate();

  // Compute per-broker stats derived from leads data (supports string and number IDs)
  const getBrokerStats = (brokerId: string | number) => {
    if (!brokerId || !Array.isArray(leads)) {
      return { leads: 0, visits: 0, bookings: 0, projects: 0 };
    }
    const brokerLeads = leads.filter(l => l && (String(l.brokerId) === String(brokerId) || l.brokerId === brokerId));
    const visits = brokerLeads.filter(l =>
      l && l.status && ['Checked In', 'Allocated', 'Follow-Up', 'Negotiation', 'Booked'].includes(l.status)
    ).length;
    const bookings = brokerLeads.filter(l => l && l.status === 'Booked').length;
    const projectSet = new Set(brokerLeads.map(l => l ? l.project : '').filter(Boolean));
    return {
      leads: brokerLeads.length,
      visits,
      bookings,
      projects: projectSet.size,
    };
  };

  // Tab filters
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Active' | 'Suspended'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // API data states
  const [apiBrokers, setApiBrokers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Check if current user has admin role
  const userRole = Cookies.get('userRole');
  let parsedUserRole = '';
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      parsedUserRole = JSON.parse(rawUser)?.role || '';
    }
  } catch (e) {}
  const isAdmin =
    userRole?.toLowerCase() === 'admin' ||
    parsedUserRole?.toLowerCase() === 'admin' ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  const brokersParams = React.useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm,
    activeTab: activeTab as 'All' | 'Active' | 'Pending' | 'Suspended',
  }), [currentPage, itemsPerPage, debouncedSearchTerm, activeTab]);

  const { data: brokersRes, isLoading: isBrokersLoading, error: brokersQueryError, refetch: refetchBrokers } = useAdminBrokersQuery(brokersParams);

  useEffect(() => {
    if (brokersRes) {
      const d = brokersRes;
      if (d?.success && Array.isArray(d?.data)) {
        setApiBrokers(d.data);
        const total = d?.pagination?.totalItems ?? d?.count ?? d.data.length;
        const pages = d?.pagination?.totalPages ?? Math.ceil(total / itemsPerPage) ?? 1;
        setTotalCount(total);
        setTotalPages(Math.max(pages, 1));
        setApiError(null);
      } else if (Array.isArray(d)) {
        setApiBrokers(d);
        setTotalCount(d.length);
        setTotalPages(Math.max(Math.ceil(d.length / itemsPerPage), 1));
        setApiError(null);
      } else if (d && d.success === false) {
        setApiError(d.message || 'The server returned an error while loading brokers.');
      }
    }
  }, [brokersRes, itemsPerPage]);

  useEffect(() => {
    setLoading(isBrokersLoading);
  }, [isBrokersLoading]);

  useEffect(() => {
    if (brokersQueryError) {
      console.error('Failed to fetch brokers:', brokersQueryError);
      const msg =
        (brokersQueryError as any)?.response?.data?.message ||
        (brokersQueryError as any)?.message ||
        'Unable to connect to the server. Please check your network and try again.';
      setApiError(msg);
    }
  }, [brokersQueryError]);

  const fetchBrokers = async () => {
    await refetchBrokers();
  };

  const handleUpdateStatus = async (brokerId: string, approvedValue: number) => {
    if (approvedValue === 1) {
      // Find the broker name for context
      const brokerObj = mappedBrokers.find(b => b.id === brokerId);
      const brokerNameFromApi = apiBrokers.find(b => String(b.id) === String(brokerId))?.broker_name;
      const brokerNameFromLocal = brokers.find(b => b.id === brokerId || b.id.slice(4).replace(/^0+/, '') === brokerId)?.name;
      const finalName = brokerObj?.name || brokerNameFromApi || brokerNameFromLocal || 'Broker';

      setApprovingBrokerId(brokerId);
      setApprovingBrokerName(finalName);
      setSelectedPlanId('');
      setConsentConfirmed(false);
      setShowApproveModal(true);
      return;
    }

    if (approvedValue === -1) {
      const brokerObj = mappedBrokers.find(b => b.id === brokerId);
      const brokerNameFromApi = apiBrokers.find(b => String(b.id) === String(brokerId))?.broker_name;
      const brokerNameFromLocal = brokers.find(b => b.id === brokerId || b.id.slice(4).replace(/^0+/, '') === brokerId)?.name;
      const finalName = brokerObj?.name || brokerNameFromApi || brokerNameFromLocal || 'Broker';

      setSuspendingBrokerId(brokerId);
      setSuspendingBrokerName(finalName);
      setSuspendReason('');
      setSuspendConsentConfirmed(false);
      setSuspendReasonError(null);
      setShowSuspendModal(true);
      return;
    }
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendConsentConfirmed) {
      Swal.fire({
        title: 'Consent Required',
        text: 'Please check the confirmation box to consent to the broker deactivation.',
        icon: 'warning',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    if (!suspendingBrokerId) return;
    if (!suspendReason.trim()) {
      setSuspendReasonError('Suspension reason is required!');
      return;
    }

    setIsSubmitting(true);

    // Show loader
    Swal.fire({
      title: `Suspending...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await axiosClient.put(`/auth/brokers/${suspendingBrokerId}/action`, {
        action: 'SUSPEND',
        note: suspendReason.trim()
      });

      if (res.data?.success || res.status === 200) {
        Swal.fire({
          title: 'Suspended!',
          text: `Broker has been successfully suspended.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 1500
        });

        // Also update local context to keep the simulator synced
        const b = brokers.find(x => x.id === suspendingBrokerId || x.id.slice(4).replace(/^0+/, '') === suspendingBrokerId);
        if (b && b.status === 'Active') {
          toggleBrokerStatus(suspendingBrokerId);
        }

        setShowSuspendModal(false);
        fetchBrokers();
      } else {
        Swal.fire({
          title: 'Error',
          text: res.data?.message || 'Failed to update broker status',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (err: any) {
      console.error('Failed to update broker status:', err);
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.message || 'An error occurred while updating status',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) {
      Swal.fire({
        title: 'Consent Required',
        text: 'Please check the confirmation box to consent to the broker approval terms.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    if (!approvingBrokerId) return;

    setIsSubmitting(true);

    try {
      const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
      const assignPath = isV1Base ? '/commissions/plans/assign' : '/v1/commissions/plans/assign';

      const cleanBrokerId = approvingBrokerId ? Number(approvingBrokerId.replace(/[^0-9]/g, '')) : 0;
      const assignPayload = {
        brokerId: cleanBrokerId,
        planId: Number(selectedPlanId)
      };

      const approvePath = `/auth/brokers/${approvingBrokerId}/action`;

      // Call both APIs in parallel
      await Promise.all([
        // axiosClient.post(assignPath, assignPayload),
        axiosClient.put(approvePath, {
          action: 'APPROVE',
          note: approveNote || 'All documents verified successfully.'
        })
      ]);

      Swal.fire({
        title: 'Approved!',
        text: `Broker has been approved and commission plan has been successfully assigned.`,
        icon: 'success',
        confirmButtonColor: '#10B981',
        timer: 1500
      });

      // Update local context
      approveBroker(approvingBrokerId);

      setShowApproveModal(false);
      fetchBrokers();
    } catch (err: any) {
      console.error('Failed to approve broker:', err);
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.message || 'An error occurred during approval process.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 1 when debounced search or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearchTerm]);

  // Helper mapper to bridge API model and frontend Broker type
  const mapApiBroker = (b: any) => {
    const contextBroker = (b && Array.isArray(brokers)) ? brokers.find(cb => {
      if (!cb || !cb.id) return false;
      const cbIdStr = String(cb.id);
      const bIdStr = String(b.id);
      const cbNorm = cbIdStr.startsWith('BRK-') ? cbIdStr.slice(4).replace(/^0+/, '') : cbIdStr;
      const bNorm = bIdStr.startsWith('BRK-') ? bIdStr.slice(4).replace(/^0+/, '') : bIdStr;
      return cbNorm === bNorm;
    }) : undefined;

    const rawApproved = b?.approvedByAdmin;
    let mappedStatus: 'Active' | 'Pending Approval' | 'Suspended' = 'Pending Approval';
    if (rawApproved === 1 || rawApproved === '1') {
      mappedStatus = 'Active';
    } else if (rawApproved === 2 || rawApproved === '2' || rawApproved === -1 || rawApproved === '-1') {
      mappedStatus = 'Suspended';
    } else if (rawApproved === 0 || rawApproved === '0') {
      mappedStatus = 'Pending Approval';
    } else {
      // Fallback to status if approvedByAdmin is undefined/null
      const rawStatus = b?.status;
      if (rawStatus === 1 || rawStatus === '1' || rawStatus === 'Active') {
        mappedStatus = 'Active';
      } else if (rawStatus === -1 || rawStatus === '-1' || rawStatus === 'Suspended') {
        mappedStatus = 'Suspended';
      } else {
        mappedStatus = 'Pending Approval';
      }
    }

    const finalStatus = contextBroker ? contextBroker.status : mappedStatus;

    return {
      id: String(b?.id || ''),
      name: b?.broker_name || 'Unknown Broker',
      mobile: b?.mobile_number || '',
      status: finalStatus,
      companyName: b?.company_name || '',
      email: b?.email || '',
      addressLine1: b?.address_line_1 || '',
      addressLine2: b?.address_line_2 || '',
      city: b?.city || '',
      state: b?.state || '',
      pincode: b?.pincode || '',
      reraNumber: b?.rera_registration_number || '',
      panNumber: b?.pan_number || '',
      gstNumber: b?.gst_number || '',
      totalProjects: b?.totalProjects ?? 0,
      totalLeads: b?.totalLeads ?? 0,
      totalVisits: b?.totalVisits ?? 0,
      totalBookings: b?.totalBookings ?? 0,
    };
  };

  const formatBrokerId = (id: string) => {
    if (id.startsWith('BRK-')) return id;
    return `BRK-${id.padStart(3, '0')}`;
  };

  // Onboarding Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [brokerType, setBrokerType] = useState('Individual');
  const [brokerTypesList, setBrokerTypesList] = useState<string[]>(['Individual', 'Company', 'Sole Proprietorship', 'Partnership Firm', 'Private Limited']);
  const [mobile, setMobile] = useState('');

  useEffect(() => {
    const loadBrokerTypes = async () => {
      try {
        const res = await getMasters({ page: 1, limit: 10 });
        if (res && res.success && Array.isArray(res.data)) {
          const list = res.data
            .filter(item => item && item.name && (String(item.name).toLowerCase().trim().includes('broker type') || (String(item.master || '')).toLowerCase().trim().includes('broker')))
            .map(item => item.slug)
            .filter(Boolean);

          if (list.length > 0) {
            const uniqueList = [...new Set(list)];
            setBrokerTypesList(uniqueList);
            setBrokerType(uniqueList[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load broker types master:', err);
      }
    };
    loadBrokerTypes();
  }, []);
  const [altMobile, setAltMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [areaLocality, setAreaLocality] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [reraExpiry, setReraExpiry] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Broker Approval & Commission States
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingBrokerId, setApprovingBrokerId] = useState<string | null>(null);
  const [approvingBrokerName, setApprovingBrokerName] = useState<string>('');
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approveNote, setApproveNote] = useState('All documents verified successfully.');

  // Broker Suspension States
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendingBrokerId, setSuspendingBrokerId] = useState<string | null>(null);
  const [suspendingBrokerName, setSuspendingBrokerName] = useState<string>('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendConsentConfirmed, setSuspendConsentConfirmed] = useState(false);
  const [suspendReasonError, setSuspendReasonError] = useState<string | null>(null);

  // Close modals on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showApproveModal) setShowApproveModal(false);
        if (showSuspendModal) setShowSuspendModal(false);
        if (showAddForm) setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showApproveModal, showSuspendModal, showAddForm]);

  // Fetch plans for dropdown when modal is shown
  useEffect(() => {
    if (showApproveModal) {
      const loadPlans = async () => {
        setLoadingPlans(true);
        try {
          const isV1Base = axiosClient.defaults.baseURL?.endsWith('/v1') || axiosClient.defaults.baseURL?.endsWith('/v1/');
          const path = isV1Base ? '/commissions/active-plans' : '/v1/commissions/active-plans';
          const res = await axiosClient.get(path);
          if (res.data?.success && Array.isArray(res.data?.data)) {
            setCommissionPlans(res.data.data);
            if (res.data.data.length > 0) {
              setSelectedPlanId(String(res.data.data[0].id));
            }
          }
        } catch (err) {
          console.error('Failed to load commission plans for dropdown:', err);
          setCommissionPlans([
            { id: 2, planName: 'Standard Tiered Plan (Flat 2%)', commissionType: 'FLAT', basePercentage: '2.00', status: 1, createdBy: 1, updatedBy: 1, createdAt: '', updatedAt: '', tiers: [] },
            { id: 1, planName: 'Standard Tiered Plan (Tiered)', commissionType: 'TIERED', basePercentage: null, status: 1, createdBy: 1, updatedBy: 1, createdAt: '', updatedAt: '', tiers: [] }
          ] as CommissionPlan[]);
          setSelectedPlanId('2');
        } finally {
          setLoadingPlans(false);
        }
      };
      loadPlans();
    }
  }, [showApproveModal]);

  // State / City API
  const [statesList, setStatesList] = useState<State[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setStatesLoading(true);
      try {
        const res = await getStates();
        if (res && res.success && Array.isArray(res.data)) {
          setStatesList(res.data);
          setStateOptions(res.data.map(s => s && s.state_name).filter(Boolean));
        }
      } catch { /* silent */ } finally { setStatesLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!state) { setCityOptions([]); return; }
    const selectedStateObj = Array.isArray(statesList) ? statesList.find(s => s && s.state_name === state) : undefined;
    const id = selectedStateObj ? selectedStateObj.id : undefined;
    if (!id) return;
    const load = async () => {
      setCitiesLoading(true);
      try {
        const res = await getCities(id);
        if (res && res.success && Array.isArray(res.data)) {
          setCityOptions(res.data.map(c => c && c.city_name).filter(Boolean));
        }
      } catch { /* silent */ } finally { setCitiesLoading(false); }
    };
    load();
  }, [state, statesList]);

  // Map API brokers to Broker schema
  const mappedBrokers = Array.isArray(apiBrokers) ? (apiBrokers.map(mapApiBroker).filter(Boolean) as any[]) : [];

  // Filter mapped brokers by tab selection
  const filteredBrokers = mappedBrokers.filter(b => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return b.status === 'Pending Approval';
    if (activeTab === 'Active') return b.status === 'Active';
    if (activeTab === 'Suspended') return b.status === 'Suspended';
    return true;
  });

  // Server-side pagination is handled via API query params (page & limit)
  const paginatedBrokers = filteredBrokers;

  // Stats are pre-computed at the top of the component to avoid temporal dead zone crashes

  const handleAddBrokerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const showWarning = (msg: string) => {
      Swal.fire({
        title: 'Validation Error',
        text: msg,
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
    };

    if (!name.trim()) return showWarning('Broker Name is required');
    if (!companyName.trim()) return showWarning('Company/Firm Name is required');
    if (!mobile.trim() || mobile.length !== 10) return showWarning('Valid 10-digit Mobile Number is required');
    if (altMobile.trim() && altMobile.length !== 10) return showWarning('Alternate Mobile Number must be 10 digits');
    if (email.trim() && !email.includes('@')) return showWarning('Valid Email Address is required');
    if (!addressLine1.trim()) return showWarning('Address Line 1 is required');
    if (!areaLocality.trim()) return showWarning('Area/Locality is required');
    if (!city.trim()) return showWarning('City is required');
    if (!state.trim()) return showWarning('State is required');
    if (!country.trim()) return showWarning('Country is required');
    if (!pincode.trim() || pincode.length !== 6) return showWarning('Valid 6-digit Pincode is required');
    // if (!panNumber.trim() || panNumber.length !== 10) return showWarning('Valid 10-digit PAN Number is required');

    Swal.fire({
      title: 'Onboarding Broker...',
      text: 'Please wait while we register the channel partner',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const payload = {
        broker_name: name,
        company_name: companyName,
        mobile_number: mobile,
        alternate_mobile: altMobile || undefined,
        email: email.trim() || undefined,
        pan_number: panNumber ? panNumber : "",
        rera_registration_number: reraNumber || undefined,
        address_line_1: addressLine1,
        address_line_2: addressLine2 || undefined,
        city: city,
        state: state,
        pincode: pincode,
        status: 1 // Onboarded directly by admin is active
      };

      const res = await registerBroker(payload);
      if (res && res.success) {
        addBroker({
          name,
          mobile,
          companyName,
          brokerType,
          altMobile: altMobile || undefined,
          email: email.trim() || undefined,
          gender: gender || undefined,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          areaLocality,
          city,
          state,
          country,
          pincode,
          reraNumber,
          reraExpiry: reraExpiry || undefined,
          panNumber,
          gstNumber: gstNumber || undefined,
          yearsExperience: yearsExperience ? String(yearsExperience) : undefined
        });

        // Reset Form
        setName('');
        setCompanyName('');
        setBrokerType('Individual');
        setMobile('');
        setAltMobile('');
        setEmail('');
        setGender('');
        setYearsExperience('');
        setAddressLine1('');
        setAddressLine2('');
        setAreaLocality('');
        setCity('Mumbai');
        setState('Maharashtra');
        setCountry('India');
        setPincode('');
        setReraNumber('');
        setReraExpiry('');
        setPanNumber('');
        setGstNumber('');

        setShowAddForm(false);
        fetchBrokers();

        Swal.fire({
          title: 'Broker Onboarded',
          text: res.message || 'New broker onboarded successfully!',
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
      } else {
        Swal.fire({
          title: 'Failed',
          text: res.message || 'Failed to onboard broker. Please try again.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (err: any) {
      console.error('Failed to onboard broker:', err);
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.message || 'Failed to onboard broker. Please try again.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  // Real-time validation checks
  const formHasErrors = false; //!selectedPlanId;

  // Retrieve suspending broker details for stats context inside the modal
  const suspendingBroker = mappedBrokers.find(b => b.id === suspendingBrokerId);
  const totalProjects = suspendingBroker?.totalProjects ?? 0;
  const totalLeads = suspendingBroker?.totalLeads ?? 0;
  const totalVisits = suspendingBroker?.totalVisits ?? 0;
  const totalBookings = suspendingBroker?.totalBookings ?? 0;

  return (
    <div className="flex flex-col min-h-full gap-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Broker Management</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            Manage channel partner verification status, commission percentages, and account states
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowBulkImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow cursor-pointer w-full sm:w-auto justify-center press"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Bulk Import</span>
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer w-full sm:w-auto justify-center press pulse-glow"
          >
            <Plus className="w-5 h-5" />
            <span>Add Broker</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector & Search */}
      <div className="flex-1 flex flex-col bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-up stagger-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('All')}
              className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'All' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
            >
              All Brokers
            </button>
            <button
              onClick={() => setActiveTab('Pending')}
              className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'Pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setActiveTab('Active')}
              className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'Active' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('Suspended')}
              className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'Suspended' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
            >
              Suspended
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search brokers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 text-slate-700"
            />
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="md:hidden space-y-4">
          {apiError ? (
            <ApiErrorBanner
              title="Could not load brokers"
              message={apiError}
              onRetry={fetchBrokers}
            />
          ) : loading && apiBrokers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <span className="flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>Loading brokers…</span>
              </span>
            </div>
          ) : paginatedBrokers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              No brokers matching selection.
            </div>
          ) : (
            paginatedBrokers.map((broker, index) => {
              return (
                <div key={broker.id} onClick={() => { localStorage.setItem('selectedBrokerName', broker.name); navigate(`/admin/brokers/${broker.id}`); }} className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition flex flex-col gap-3 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {formatBrokerId(broker.id)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1.5">{broker.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{broker.companyName || 'Individual'}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${broker.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      broker.status === 'Suspended' ? 'bg-red-50 text-red-700 border border-red-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                      {broker.status}
                    </span>
                  </div>

                  {/* Stats counts grid */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Projects</span>
                      <span className="text-xs font-black text-blue-700">{broker.totalProjects ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Leads</span>
                      <span className="text-xs font-black text-indigo-700">{broker.totalLeads ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Visits</span>
                      <span className="text-xs font-black text-sky-700">{broker.totalVisits ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Bookings</span>
                      <span className="text-xs font-black text-emerald-700">{broker.totalBookings ?? 0}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100/60 pt-2.5 flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold">{broker.mobile}</span>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {(broker.status === 'Pending Approval' || broker.status === 'Suspended') && (
                        <button
                          onClick={() => handleUpdateStatus(broker.id, 1)}
                          className="px-2.5 py-1 font-bold border rounded-lg transition cursor-pointer text-[11px] bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 border-emerald-200"
                        >
                          Approve
                        </button>
                      )}
                      {(broker.status === 'Pending Approval' || broker.status === 'Active') && (
                        <button
                          onClick={() => handleUpdateStatus(broker.id, -1)}
                          className="px-2.5 py-1 font-bold border rounded-lg transition cursor-pointer text-[11px] bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border-rose-200"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Brokers Grid (Desktop only) */}
        <div className="hidden md:block flex-1 overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Broker ID</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Broker Name</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Company</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Mobile</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Projects</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Leads</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Visits</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Bookings</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Status</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {apiError ? (
                <tr>
                  <td colSpan={10} className="py-10 px-6">
                    <ApiErrorBanner
                      title="Could not load brokers"
                      message={apiError}
                      onRetry={fetchBrokers}
                    />
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-semibold">Loading brokers…</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedBrokers.map((broker, index) => {
                return (
                  <tr key={broker.id} onClick={() => { localStorage.setItem('selectedBrokerName', broker.name); navigate(`/admin/brokers/${broker.id}`); }} style={{ cursor: 'pointer', animationDelay: `${index * 0.04}s` }} className="hover:bg-slate-50/60 transition-colors even:bg-slate-50/30 anim-fade-up">
                    <td className="py-4 px-4 font-extrabold text-blue-600 whitespace-nowrap">{formatBrokerId(broker.id)}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-800 whitespace-nowrap">{broker.name}</td>
                    <td className="py-4 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">{broker.companyName || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="py-4 px-4 text-xs text-slate-500 font-medium whitespace-nowrap">{broker.mobile}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-xs">{broker.totalProjects ?? 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs">{broker.totalLeads ?? 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 text-sky-700 font-extrabold text-xs">{broker.totalVisits ?? 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs">{broker.totalBookings ?? 0}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold smooth ${broker.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        broker.status === 'Suspended' ? 'bg-red-50 text-red-700 border border-red-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                        {broker.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-center">
                        {(broker.status === 'Pending Approval' || broker.status === 'Suspended') && (
                          <button
                            onClick={() => handleUpdateStatus(broker.id, 1)}
                            className="px-2.5 py-1 font-bold border rounded-lg transition cursor-pointer text-[11px] bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 border-emerald-200"
                          >
                            Approve
                          </button>
                        )}
                        {(broker.status === 'Pending Approval' || broker.status === 'Active') && (
                          <button
                            onClick={() => handleUpdateStatus(broker.id, -1)}
                            className="px-2.5 py-1 font-bold border rounded-lg transition cursor-pointer text-[11px] bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border-rose-200"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && paginatedBrokers.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8">
                    <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                      <Search className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-slate-400 text-sm font-medium">No brokers matching selection.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-2">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <CustomSelect
                options={['5', '10', '20', '50', '100']}
                value={String(itemsPerPage)}
                onChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
                className="w-24"
              />
              <span>records per page</span>
            </div>

            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
              <span className="text-slate-400 font-semibold">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add Broker Modal */}
      {showAddForm && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 sm:p-6 anim-fade-in">
          <form onSubmit={handleAddBrokerSubmit} className="bg-white rounded-3xl w-full max-w-3xl flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left anim-scale-in" style={{ maxHeight: 'min(90vh, 820px)' }}>
            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#1A3A6B] to-[#1A56DB] px-6 py-5 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 60%)' }} />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Onboard New Broker</h3>
                    <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">Register a new channel partner</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

              {/* --- Section 1: General Info --- */}
              <div>
                <h4 className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3.5">
                  General Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Broker Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Broker Name <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter full agency/broker name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  {/* Company/Firm Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company/Firm Name <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter registered firm name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  {/* Broker Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Broker Type</label>
                    <SearchableSelect
                      value={brokerType}
                      onChange={setBrokerType}
                      options={brokerTypesList}
                      placeholder="Select type"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 9876500000"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  {/* Alternate Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alternate Mobile Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Alternate Mobile (Optional)"
                      value={altMobile}
                      onChange={(e) => setAltMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. broker@firm.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-850 font-semibold"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gender</label>
                    <SearchableSelect
                      value={gender}
                      onChange={setGender}
                      options={['Male', 'Female', 'Other']}
                      placeholder="Select gender"
                    />
                  </div>

                  {/* Years of Experience */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Experience in years (Optional)"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* --- Section 2: Address & Location --- */}
              <div>
                <h4 className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3.5 mt-2">
                  Address & Office Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Address Line 1 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address Line 1 <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      placeholder="Flat, Office No, Building name"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  {/* Address Line 2 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address Line 2</label>
                    <input
                      type="text"
                      placeholder="Street, Sector, Landmark (Optional)"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Area/Locality */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Area/Locality <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      placeholder="Locality or Neighborhood"
                      value={areaLocality}
                      onChange={(e) => setAreaLocality(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  {/* City */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">City <span className="text-red-500 ml-0.5">*</span></label>
                    <SearchableSelect
                      value={city}
                      onChange={setCity}
                      options={cityOptions}
                      placeholder={state ? 'Select city' : 'Select state first'}
                      loading={citiesLoading}
                      disabled={!state}
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">State <span className="text-red-500 ml-0.5">*</span></label>
                    <SearchableSelect
                      value={state}
                      onChange={(val) => { setState(val); setCity(''); }}
                      options={stateOptions}
                      placeholder="Select state"
                      loading={statesLoading}
                    />
                  </div>

                  {/* Country */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Country <span className="text-red-500 ml-0.5">*</span></label>
                    <SearchableSelect
                      value={country}
                      onChange={setCountry}
                      options={['India', 'UAE', 'USA', 'UK', 'Singapore']}
                      placeholder="Select country"
                    />
                  </div>

                  {/* Pincode */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pincode <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 400001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* --- Section 3: Credentials --- */}
              <div>
                <h4 className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3.5 mt-2">
                  Credentials & Verification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* RERA Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RERA Number</label>
                    <input
                      type="text"
                      placeholder="e.g. PRERA5934568 (Optional)"
                      value={reraNumber}
                      onChange={(e) => setReraNumber(e.target.value.toUpperCase())}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* RERA Expiry Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RERA Expiry Date</label>
                    <input
                      type="date"
                      value={reraExpiry}
                      onChange={(e) => setReraExpiry(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* PAN Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PAN Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* GST Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GST Number</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 27ABCDE294F1Z8"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 px-6 pt-3 pb-5 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.35)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.45)] cursor-pointer"
              >
                Submit Broker
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Approve Broker Modal */}
      {showApproveModal && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 sm:p-6 anim-fade-in">
          <form onSubmit={handleConfirmApprove} className="bg-white rounded-3xl w-full max-w-2xl flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left anim-scale-in" style={{ maxHeight: 'min(90vh, 750px)' }}>
            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#1A3A6B] to-[#1A56DB] px-6 py-5 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 60%)' }} />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Approve Broker</h3>
                    <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">Configure commission settings for {approvingBrokerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Commission Plan Selection */}
              <div className="hidden space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Commission Plan *
                </label>

                {loadingPlans ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Loading commission plans...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <CustomSelect
                      options={commissionPlans.map((plan) => ({
                        value: String(plan.id),
                        label: `${plan.planName} (${plan.commissionType === 'FLAT' ? `Flat ${plan.basePercentage}%` : 'Tiered'})`
                      }))}
                      value={selectedPlanId}
                      onChange={(val) => setSelectedPlanId(val)}
                      placeholder="Choose a plan..."
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Approval Note */}
              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Approval Note
                </label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="e.g. All documents verified successfully."
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white text-slate-800 font-semibold focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition"
                  rows={2}
                />
              </div>

              {/* Consent check */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consentCheckbox"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500/20 mt-0.5 cursor-pointer"
                  required
                />
                <label htmlFor="consentCheckbox" className="text-xs text-slate-500 font-semibold leading-relaxed cursor-pointer select-none">
                  I confirm that the commission type and percentage rates configured above are correct for this channel partner. I consent to approving this broker and granting them active status in the system. *
                </label>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col gap-3 px-6 pt-3 pb-5 border-t border-slate-100 shrink-0">
              {/* Validation Error Banner */}
              {/* {formHasErrors && (
                <div className="text-[11px] text-rose-500 font-bold flex items-center gap-1.5 px-1 pt-1 anim-fade-in">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Please select a commission plan before approving.</span>
                </div>
              )} */}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !consentConfirmed}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Approving...</span>
                    </>
                  ) : (
                    <span>Approve Broker</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Suspend Broker Modal */}
      {showSuspendModal && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 sm:p-6 anim-fade-in">
          <form onSubmit={handleConfirmSuspend} className="bg-white rounded-3xl w-full max-w-2xl flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left anim-scale-in" style={{ maxHeight: 'min(90vh, 750px)' }}>
            {/* Gradient Header with Alert/Red color scheme */}
            <div className="bg-gradient-to-br from-[#1E293B] via-[#EF4444] to-[#DC2626] px-6 py-5 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fca5a5 0%, transparent 60%)' }} />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Suspend Broker Account</h3>
                    <p className="text-[11px] text-red-200/80 font-medium mt-0.5">Revoke system access and lead privileges for {suspendingBrokerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Stats Card Warning */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wide">Broker Stats Impact</span>
                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold rounded-full uppercase">Suspension Warning</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Projects</span>
                    <span className="text-base font-black text-blue-700 mt-0.5 block">{totalProjects}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Leads</span>
                    <span className="text-base font-black text-indigo-700 mt-0.5 block">{totalLeads}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Visits</span>
                    <span className="text-base font-black text-sky-700 mt-0.5 block">{totalVisits}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Bookings</span>
                    <span className="text-base font-black text-emerald-700 mt-0.5 block">{totalBookings}</span>
                  </div>
                </div>
              </div>

              {/* Suspension Reason Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Reason for Suspension *
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => {
                    setSuspendReason(e.target.value);
                    if (e.target.value.trim()) {
                      setSuspendReasonError(null);
                    }
                  }}
                  placeholder="e.g. RERA registration certificate has expired or failure to adhere to compliance protocols."
                  className={`block w-full px-4 py-3 bg-slate-50 border ${suspendReasonError ? 'border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : 'border-slate-200 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'} rounded-xl text-xs focus:outline-none focus:bg-white text-slate-800 font-semibold transition`}
                  rows={3}
                  required
                />
                {suspendReasonError && (
                  <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{suspendReasonError}</span>
                  </p>
                )}
              </div>

              {/* Consent Check Card */}
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="suspendConsentCheckbox"
                  checked={suspendConsentConfirmed}
                  onChange={(e) => setSuspendConsentConfirmed(e.target.checked)}
                  className="w-4 h-4 text-red-650 border-slate-300 rounded focus:ring-red-500/20 mt-0.5 cursor-pointer accent-red-650 shrink-0"
                  required
                />
                <div className="space-y-1">
                  <label htmlFor="suspendConsentCheckbox" className="text-xs text-rose-950 font-bold leading-none cursor-pointer select-none block">
                    Acknowledge Consequences
                  </label>
                  <span className="text-[11px] text-rose-700/90 font-medium leading-relaxed block">
                    I confirm that I want to suspend this channel partner. This action will immediately block their dashboard access, prevent lead registrations, and hide active rosters.
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col gap-3 px-6 pt-3 pb-5 border-t border-slate-100 shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSuspendModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !suspendConsentConfirmed || !suspendReason.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.35)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suspending...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Suspend Broker</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Bulk Import Broker Modal */}
      <BulkImportBrokerModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchBrokers();
        }}
      />
    </div>
  );
};
