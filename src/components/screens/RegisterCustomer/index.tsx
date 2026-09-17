import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../../CustomSelect';

import { useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, User, Phone, Mail, MapPin, Building, Home, CreditCard, Calendar, Clock, AlertTriangle, CheckCircle, ShieldCheck, Search, Loader2, ChevronDown, Check, X, RefreshCw } from 'lucide-react';
import { CustomMultiSelect } from '../../CustomMultiSelect';
import { requestCustomerOtp, verifyCustomerOtp, createCustomer, getCustomers, createLeadForExistingCustomer, checkMobile, requestCustomerMobileOtp, verifyCustomerMobileOtp } from '../../../pages/api/registercustomer';
import { getAllProjects } from '../../../pages/api/projects';
import { getMasters } from '../../../admin/api/masters';
import { getCities } from '../../../pages/api/masters';
import { SearchableSelect } from '../../ui/SearchableSelect';

export const RegisterCustomer: React.FC = () => {
  const navigate = useNavigate();
  const { registerLead, verifyLeadOTP, setActiveScreen, projects, brokers, currentRole } = useBrokerConnect();

  const handleCancel = () => {
    if (currentRole === 'receptionist') {
      navigate('/receptionist/dashboard');
    } else {
      setActiveScreen(2);
    }
  };

  // State variables
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>(['2 BHK']);
  const [budget, setBudget] = useState('₹80L - ₹1Cr');
  const [expectedDate, setExpectedDate] = useState('');
  const [expectedTime, setExpectedTime] = useState('11:00 AM');
  const [expectedBookingDuration, setExpectedBookingDuration] = useState('Immediate (Within 7 days)');
  const [selectedBroker, setSelectedBroker] = useState('BRK-001'); // Mock current logged in broker
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Dynamic options from backend masters
  const [unitTypeOptions, setUnitTypeOptions] = useState<string[]>(['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse']);
  const [budgetOptions, setBudgetOptions] = useState<string[]>(['₹50L - ₹60L', '₹60L - ₹80L', '₹80L - ₹1Cr', '₹1Cr - ₹1.2Cr', '₹1.2Cr - ₹1.5Cr', '₹1.5Cr - ₹2Cr', '₹2Cr - ₹2.5Cr', '₹2.5Cr+']);

  React.useEffect(() => {
    const loadMasters = async () => {
      try {
        const res = await getMasters({ page: 1, limit: 10 });
        if (res.success && Array.isArray(res.data)) {
          const fetchedBudgets: string[] = [];
          const fetchedUnitTypes: string[] = [];

          res.data.forEach(item => {
            if (!item.name || !item.slug) return;
            const normName = item.name.toLowerCase().trim();
            if (normName.includes('budget')) {
              if (!fetchedBudgets.includes(item.slug)) fetchedBudgets.push(item.slug);
            } else if (normName.includes('unit type') || normName.includes('unit config')) {
              if (!fetchedUnitTypes.includes(item.slug)) fetchedUnitTypes.push(item.slug);
            }
          });

          if (fetchedBudgets.length > 0) {
            setBudgetOptions(fetchedBudgets);
            setBudget(prev => fetchedBudgets.includes(prev) ? prev : fetchedBudgets[0]);
          }
          if (fetchedUnitTypes.length > 0) {
            setUnitTypeOptions(fetchedUnitTypes);
            setSelectedUnitTypes(prev => prev.filter(ut => fetchedUnitTypes.includes(ut)).length > 0 ? prev.filter(ut => fetchedUnitTypes.includes(ut)) : [fetchedUnitTypes[0]]);
          }
        }
      } catch (err) {
        console.error('Failed to load masters in RegisterCustomer:', err);
      }
    };
    // loadMasters(); // Commented out to prevent automatic API calls on mount by default
  }, []);

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Existing Customer Search States
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const reverseBudgetMap: Record<number, string> = {
    5500000: '₹50L - ₹60L',
    7000000: '₹60L - ₹80L',
    8500000: '₹80L - ₹1Cr',
    11000000: '₹1Cr - ₹1.2Cr',
    13500000: '₹1.2Cr - ₹1.5Cr',
    17500000: '₹1.5Cr - ₹2Cr',
    22500000: '₹2Cr - ₹2.5Cr',
    30000000: '₹2.5Cr+'
  };

  React.useEffect(() => {
    const searchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const res = await getCustomers(query);
        if (res && res.success && Array.isArray(res.data)) {
          setExistingCustomers(res.data);
        }
      } catch (err) {
        console.error('Failed to search customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const timer = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectExistingCustomer = (c: any) => {
    setSelectedCustomerId(Number(c.id));
    setName(c.customer_name || '');
    setMobile(c.mobile_number || '');
    setEmail(c.email || '');
    setCity(c.city || 'Mumbai');
    if (c.Project?.project_name) {
      setSelectedProjects([c.Project.project_name]);
    } else if (c.Project?.name) {
      setSelectedProjects([c.Project.name]);
    }
    if (c.unit_type) {
      let ut = c.unit_type;
      if (ut === '1BHK') ut = '1 BHK';
      else if (ut === '2BHK') ut = '2 BHK';
      else if (ut === '3BHK') ut = '3 BHK';
      else if (ut === '4BHK') ut = '4 BHK';
      setSelectedUnitTypes([ut]);
    }
    if (c.budget) {
      const mappedBudgetRange = reverseBudgetMap[c.budget] || '₹80L - ₹1Cr';
      setBudget(mappedBudgetRange);
    }
    setIsMobileVerified(true);
    setIsEmailVerified(true);
    setIsOpen(false);
    setQuery('');
  };

  const [error, setError] = useState('');
  const [simulationAlert, setSimulationAlert] = useState<{ show: boolean; otp: string; leadId: string; dispute: boolean } | null>(null);

  // Loaded projects state from DB
  const [dbProjects, setDbProjects] = useState<any[]>([]);

  // Loaded cities list from DB
  const [citiesList, setCitiesList] = useState<string[]>(['Mumbai', 'Pune', 'Goa', 'Bangalore', 'Ahmedabad']);

  React.useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await getCities();
        if (res.success && Array.isArray(res.data)) {
          const names = res.data.map(c => c.city_name).filter(Boolean);
          if (names.length > 0) {
            setCitiesList(names);
          }
        }
      } catch (err) {
        console.error('Failed to load cities inside RegisterCustomer:', err);
      }
    };
    fetchCities();
  }, []);

  React.useEffect(() => {
    const fetchDbProjects = async () => {
      try {
        const res = await getAllProjects();
        let rawList: any[] = [];
        if (res && res.success && res.data && Array.isArray(res.data)) {
          rawList = res.data;
        } else if (Array.isArray(res)) {
          rawList = res as any;
        } else if (res && (res as any).projects && Array.isArray((res as any).projects)) {
          rawList = (res as any).projects;
        }
        setDbProjects(rawList);
      } catch (err) {
        console.error('Failed to load projects inside RegisterCustomer:', err);
      }
    };
    // fetchDbProjects(); // Commented out to prevent automatic API calls on mount by default
  }, []);

  const projectOptions = dbProjects.length > 0
    ? dbProjects.map((p) => p.project_name || p.name)
    : projects.map((p) => p.name);

  React.useEffect(() => {
    if (dbProjects.length > 0) {
      const firstProjName = dbProjects[0].project_name || dbProjects[0].name;
      if (firstProjName) {
        setSelectedProjects([firstProjName]);
      }
    }
  }, [dbProjects]);

  const budgetMap: Record<string, number> = {
    '₹50L - ₹60L': 5500000,
    '₹60L - ₹80L': 7000000,
    '₹80L - ₹1Cr': 8500000,
    '₹1Cr - ₹1.2Cr': 11000000,
    '₹1.2Cr - ₹1.5Cr': 13500000,
    '₹1.5Cr - ₹2Cr': 17500000,
    '₹2Cr - ₹2.5Cr': 22500000,
    '₹2.5Cr+': 30000000
  };

  const convertTimeTo24h = (timeStr: string): string => {
    try {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') {
        hours = '00';
      }
      if (modifier === 'PM') {
        hours = (parseInt(hours, 10) + 12).toString();
      }
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    } catch {
      return '11:00:00';
    }
  };

  // OTP Verification States
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [pin, setPin] = useState('');
  const [isOtpVerifiedAnim, setIsOtpVerifiedAnim] = useState(false);
  const [otpType, setOtpType] = useState<'mobile' | 'email'>('mobile');
  const [otpError, setOtpError] = useState('');
  const [loadingEmailOtp, setLoadingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);

  const otpInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if ((mobileOtpSent || emailOtpSent) && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [mobileOtpSent, emailOtpSent]);

  // Close modals on Esc key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileOtpSent || emailOtpSent) {
          setMobileOtpSent(false);
          setEmailOtpSent(false);
        }
        if (simulationAlert?.show) {
          setSimulationAlert(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOtpSent, emailOtpSent, simulationAlert]);

  const handleSendMobileOtp = async () => {
    if (!mobile || mobile.replace(/\s+/g, '').length !== 10) {
      setError('Please enter a valid 10-digit mobile number first.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid Indian mobile number starting with 6-9.');
      return;
    }

    setError('');
    setVerifyingMobileOtp(true);
    setOtpError('');
    setOtpType('mobile');

    try {
      const res = await requestCustomerMobileOtp(mobile);
      if (res.success) {
        setPin('');
        setMobileOtpSent(true);
      } else {
        setError(res.message || 'Mobile number OTP failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending mobile OTP.');
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handleVerifyMobileOtp = async (codeOverride?: string) => {
    const finalCode = codeOverride || pin;
    if (finalCode.length < 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setVerifyingMobileOtp(true);
    setOtpError('');

    try {
      const response = await verifyCustomerMobileOtp(mobile, finalCode);
      if (response.success) {
        setIsOtpVerifiedAnim(true);
        setOtpError('');
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsMobileVerified(true);
        setMobileOtpSent(false);
        setIsOtpVerifiedAnim(false);
      } else {
        setOtpError(response.message || 'Invalid OTP code. Please try again.');
        setPin('');
      }
    } catch (err: any) {
      setOtpError(err.message || 'An error occurred during verification.');
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoadingEmailOtp(true);
    setOtpError('');
    setOtpType('email');

    try {
      const response = await requestCustomerOtp(email);
      if (response.success) {
        setPin('');
        setEmailOtpSent(true);
      } else {
        setError(response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending OTP.');
    } finally {
      setLoadingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (codeOverride?: string) => {
    const finalCode = codeOverride || pin;
    if (finalCode.length < 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setVerifyingEmailOtp(true);
    setOtpError('');

    try {
      const response = await verifyCustomerOtp(email, Number(finalCode));
      if (response.success) {
        setIsOtpVerifiedAnim(true);
        setOtpError('');
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsEmailVerified(true);
        setEmailOtpSent(false);
        setIsOtpVerifiedAnim(false);
      } else {
        setOtpError(response.message || 'Invalid OTP code. Please try again.');
        setPin('');
      }
    } catch (err: any) {
      setOtpError(err.message || 'An error occurred during verification.');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setPin(val);
      if (val.length === 6) {
        if (otpType === 'mobile') {
          handleVerifyMobileOtp(val);
        } else {
          handleVerifyEmailOtp(val);
        }
      } else {
        setOtpError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !expectedDate) {
      setError('Please fill in all required fields (Name, Mobile, and Expected Visit Date)');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      setError('Customer Name must only contain letters and spaces.');
      return;
    }
    if (name.trim().length < 3) {
      setError('Customer Name must be at least 3 characters.');
      return;
    }

    if (mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number starting with 6-9.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(expectedDate);
    if (selected < today) {
      setError('Expected Visit Date cannot be in the past.');
      return;
    }

    if (selectedProjects.length === 0) {
      setError('Please select at least one Project');
      return;
    }

    if (selectedUnitTypes.length === 0) {
      setError('Please select at least one Unit Type');
      return;
    }

    if (!isMobileVerified) {
      setError('Please verify your mobile number first by clicking the Verify button next to the input.');
      return;
    }

    if (email && !isEmailVerified) {
      setError('Please verify your email address first by clicking the Verify button next to the input.');
      return;
    }

    setError('');

    const projectIds = selectedProjects.map(projName => {
      const match = dbProjects.find(p => p.project_name === projName || p.name === projName);
      return match ? Number(match.id) : null;
    }).filter((id): id is number => id !== null);

    const unitTypeJoined = selectedUnitTypes.join(', ');

    if (selectedCustomerId !== null) {
      const payload = {
        customer_id: selectedCustomerId,
        project_id: projectIds,
        city,
        unit_type: selectedUnitTypes.map(ut => ut.replace(/\s+/g, '')),
        budget: budget,
        scheduled_visit_date: expectedDate,
        scheduled_visit_time: convertTimeTo24h(expectedTime),
        expected_booking_duration: expectedBookingDuration
      };

      try {
        const apiRes = await createLeadForExistingCustomer(payload);
        if (apiRes.success) {
          // Call registration context action
          const currentBrokerObj = brokers.find(b => b.id === selectedBroker) || brokers[0];

          const result = registerLead({
            name,
            mobile,
            email: email || undefined,
            city,
            project: selectedProjects.join(', '),
            unitType: unitTypeJoined,
            budget,
            expectedDate,
            expectedTime,
            brokerId: selectedBroker,
            brokerName: currentBrokerObj.name,
          });

          // Mark lead as OTP Verified in context since they verified inline
          verifyLeadOTP(result.leadId, result.otp);
          localStorage.setItem('selectedLeadId', result.leadId);

          // Save simulation details to show a popup before redirection
          setSimulationAlert({
            show: true,
            otp: result.otp,
            leadId: result.leadId,
            dispute: result.disputeRaised
          });
        } else {
          setError(apiRes.message || 'Failed to create lead for existing customer. Please check your inputs.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during lead creation.');
      }
    } else {
      const payload = {
        customer_name: name,
        mobile_number: mobile,
        email: email || undefined,
        city,
        project_id: projectIds,
        unit_type: selectedUnitTypes.map(ut => ut.replace(/\s+/g, '')),
        budget: budget,
        scheduled_visit_date: expectedDate,
        scheduled_visit_time: convertTimeTo24h(expectedTime),
        expected_booking_duration: expectedBookingDuration
      };

      try {
        const apiRes = await createCustomer(payload);
        if (apiRes.success) {
          // Call registration context action
          const currentBrokerObj = brokers.find(b => b.id === selectedBroker) || brokers[0];

          const result = registerLead({
            name,
            mobile,
            email: email || undefined,
            city,
            project: selectedProjects.join(', '),
            unitType: unitTypeJoined,
            budget,
            expectedDate,
            expectedTime,
            brokerId: selectedBroker,
            brokerName: currentBrokerObj.name,
          });

          // Mark lead as OTP Verified in context since they verified inline
          verifyLeadOTP(result.leadId, result.otp);
          localStorage.setItem('selectedLeadId', result.leadId);

          // Save simulation details to show a popup before redirection
          setSimulationAlert({
            show: true,
            otp: result.otp,
            leadId: result.leadId,
            dispute: result.disputeRaised
          });
        } else {
          setError(apiRes.message || 'Failed to create customer. Please check your inputs.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during customer creation.');
      }
    }
  };

  const handleProceedToOtp = () => {
    if (simulationAlert) {
      setSimulationAlert(null);
      // Since it is already verified, redirect directly to Visit Pass
      if (currentRole === 'receptionist') {
        navigate('/receptionist/dashboard');
      } else {
        setActiveScreen(5);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <button
          onClick={handleCancel}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Register Customer</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            {currentRole === 'receptionist' ? 'Receptionist Portal > Register Customer' : 'Broker Portal > Lead Protection Registration'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-8 anim-fade-up stagger-2">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="animate-pulse">{error}</span>
              {(error.toLowerCase().includes('already') ||
                error.toLowerCase().includes('exists') ||
                error.toLowerCase().includes('registered') ||
                error.toLowerCase().includes('ownership') ||
                error.toLowerCase().includes('revisit') ||
                error.toLowerCase().includes('active') ||
                error.toLowerCase().includes('duplicate') ||
                error.toLowerCase().includes('protection')) && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('revisit_searchTerm', mobile || name || '');
                    navigate('/receptionist/customer-revisit');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 press shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Perform Revisit</span>
                </button>
              )}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Basic Information
              </h3>
              <div ref={dropdownRef} className="relative w-full sm:w-64">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  <span className="truncate flex-1 text-left">
                    Search Existing Customer
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden text-left" style={{ zIndex: 100 }}>
                    <div className="p-2.5 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute inset-y-0 left-2.5 my-auto w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Type name or phone..."
                          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition text-slate-800 font-medium placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <ul className="max-h-52 overflow-y-auto py-1">
                      {loadingCustomers ? (
                        <li className="px-4 py-3 text-xs text-slate-400 text-center font-medium flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Searching...</span>
                        </li>
                      ) : existingCustomers.length === 0 ? (
                        <li className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                          No customers found
                        </li>
                      ) : (
                        existingCustomers.map((cust) => (
                          <li key={cust.id}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectExistingCustomer(cust);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 border-b border-slate-50/50 last:border-b-0"
                            >
                              <div className="font-bold text-slate-800">{cust.customer_name}</div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {cust.mobile_number} • {cust.email || 'No Email'}
                              </div>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Customer Name <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                      setSelectedCustomerId(null);
                    }}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Mobile Number <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      disabled={isMobileVerified}
                      maxLength={10}
                      placeholder="Enter mobile number"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10));
                        setIsMobileVerified(false);
                        setMobileOtpSent(false);
                        setSelectedCustomerId(null);
                      }}
                      className={`block w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 font-semibold ${isMobileVerified ? 'border-emerald-200 bg-emerald-50/10 text-emerald-700' : 'border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                  {mobile.replace(/\s+/g, '').length === 10 && !isMobileVerified && !mobileOtpSent && (
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      className="px-4 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0 flex items-center justify-center press"
                    >
                      Verify
                    </button>
                  )}
                  {isMobileVerified && (
                    <span className="flex items-center gap-1.5 px-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-xs uppercase tracking-wider rounded-xl shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email (Optional)</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="email"
                      disabled={isEmailVerified}
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsEmailVerified(false);
                        setSelectedCustomerId(null);
                      }}
                      className={`block w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 font-semibold ${isEmailVerified ? 'border-emerald-200 bg-emerald-50/10 text-emerald-700' : 'border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                  {email && email.includes('@') && email.length > 5 && !isEmailVerified && !emailOtpSent && (
                    <button
                      type="button"
                      disabled={loadingEmailOtp}
                      onClick={handleSendEmailOtp}
                      className="px-4 bg-[#1A56DB] hover:bg-[#1648C0] disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0 flex items-center justify-center press"
                    >
                      {loadingEmailOtp ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                  {email && isEmailVerified && (
                    <span className="flex items-center gap-1.5 px-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-xs uppercase tracking-wider rounded-xl shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">City</label>
                <SearchableSelect
                  value={city}
                  onChange={(val) => {
                    setCity(val);
                    setSelectedCustomerId(null);
                  }}
                  options={citiesList}
                  placeholder="Select City"
                  icon={MapPin}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Requirements */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
              Requirements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Projects <span className="text-red-500 ml-0.5">*</span></label>
                <CustomMultiSelect
                  value={selectedProjects}
                  onChange={(val) => setSelectedProjects(val)}
                  options={projectOptions}
                  placeholder="Select Projects"
                  icon={Building}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Unit Types <span className="text-red-500 ml-0.5">*</span></label>
                <CustomMultiSelect
                  value={selectedUnitTypes}
                  onChange={(val) => setSelectedUnitTypes(val)}
                  options={unitTypeOptions}
                  placeholder="Select Unit Types"
                  icon={Home}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Budget <span className="text-red-500 ml-0.5">*</span></label>
                <CustomSelect
                  value={budget}
                  onChange={(val) => setBudget(val)}
                  options={budgetOptions}
                  placeholder="Select Budget"
                  icon={CreditCard}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Expected Booking Duration</label>
                <CustomSelect
                  value={expectedBookingDuration}
                  onChange={(val) => setExpectedBookingDuration(val)}
                  options={['Immediate (Within 7 days)', '15 to 30 Days', '30 to 60 Days', '2 to 3 Months', '3+ Months']}
                  placeholder="Select Duration"
                  icon={Clock}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Visit Schedule */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
              Scheduled Visit details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Expected Visit Date <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="date"
                    min={todayStr}
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Expected Visit Time</label>
                <CustomSelect
                  value={expectedTime}
                  onChange={(val) => setExpectedTime(val)}
                  options={[
                    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
                    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
                    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
                  ]}
                  placeholder="Select Visit Time"
                  icon={Clock}
                />
              </div>
            </div>
          </div>

          {/* Submits */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-medium text-sm transition-all text-center press smooth"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer text-center press pulse-glow"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Sidebar Info/Policy Guide (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6 anim-fade-up stagger-3">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h4 className="text-sm font-bold tracking-wider uppercase text-blue-400">Lead Protection Policy</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              BrokerConnect enforces strict lead protection rules. To register a customer:
            </p>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Customer must verify registration via a real-time OTP security pin.</li>
              <li>Once verified, lead ownership locks to your ID for <strong className="text-white">90 days</strong>.</li>
              <li>If the lead is registered by another broker within the lock period, a dispute will be generated automatically.</li>
            </ul>
          </div>

        </div>
      </form>

      {/* Verification Simulation Popup */}
      {simulationAlert?.show && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0B1528]/75 backdrop-blur-md p-4 anim-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden anim-scale-in">

            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#10B981] to-[#059669] px-6 py-6 relative overflow-hidden text-center">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #60a5fa 0%, transparent 60%)' }} />
              <div className="relative">
                <div className="mx-auto w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-white animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-white">Lead Registered Successfully</h3>
                <p className="text-[11px] text-emerald-100/80 font-medium mt-1">
                  Identity verified and ownership locked for 90 days.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-4 text-center">
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl text-left space-y-2">
                <span className="text-xs font-bold text-emerald-800 block">✓ Customer Mobile Verified</span>
                <span className="text-xs font-bold text-emerald-800 block">✓ Customer Email Verified</span>
                <span className="text-xs font-bold text-emerald-800 block">✓ Lead Lock Active</span>
              </div>

              {simulationAlert.dispute && (
                <div className="bg-amber-50 p-4 border border-amber-200 rounded-2xl flex gap-3 text-left">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-amber-800 block">Lead Conflict Detected!</span>
                    <span className="text-[10px] text-amber-700 font-medium leading-relaxed block">
                      This phone number is already active under another broker. A dispute has been filed automatically for Admin audit.
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleProceedToOtp}
                className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648C0] text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.35)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.45)] cursor-pointer"
              >
                View Visit Pass →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* OTP Verification Modal */}
      {(mobileOtpSent || emailOtpSent) && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 anim-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden anim-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#1A3A6B] to-[#1A56DB] px-6 py-6 relative overflow-hidden text-center text-white">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #60a5fa 0%, transparent 60%)' }} />
              <div className="relative">
                <div className="mx-auto w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-3">
                  {otpType === 'mobile' ? (
                    <Phone className="w-6 h-6 text-white animate-bounce" />
                  ) : (
                    <Mail className="w-6 h-6 text-white animate-bounce" />
                  )}
                </div>
                <h3 className="text-lg font-bold">
                  {otpType === 'mobile' ? 'Verify Mobile Number' : 'Verify Email Address'}
                </h3>
                <p className="text-[11px] text-blue-200/80 font-medium mt-1">
                  {otpType === 'mobile' ? (
                    <>We've sent a 6-digit OTP code to <strong className="text-white">{mobile}</strong></>
                  ) : (
                    <>We've sent a 6-digit OTP code to <strong className="text-white">{email}</strong></>
                  )}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-6 text-center">
              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold">
                  {otpError}
                </div>
              )}

              {/* Custom Smooth OTP input */}
              <div className="relative py-4 flex justify-center overflow-hidden min-h-[80px] w-full">
                <style>{`
                  @keyframes spin-dot {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>

                {/* Hidden input to capture keyboard events */}
                <input
                  ref={otpInputRef}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ zIndex: 10 }}
                />

                {/* Verified Badge Container */}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-550 ease-out ${isOtpVerifiedAnim ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-6'
                    }`}
                  style={{ zIndex: 5 }}
                >
                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5.5 py-3 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.35)] border border-emerald-400/30 animate-pulse">
                    <div className="w-6.5 h-6.5 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                      <ShieldCheck className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest block leading-none pr-1">Verified</span>
                  </div>
                </div>

                {/* OTP Circles Container */}
                <div
                  className="flex gap-2.5 justify-center relative select-none w-full animate-in fade-in"
                  onClick={() => otpInputRef.current?.focus()}
                  style={{ zIndex: 1 }}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = pin[index] || '';
                    const isFocused = pin.length === index;
                    const isComplete = pin.length === 6;

                    return (
                      <div
                        key={index}
                        className={`w-11 h-11 rounded-full border-2 bg-white flex items-center justify-center text-base font-black relative transition-all duration-500 ${isComplete
                            ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.25)]'
                            : isFocused
                              ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)] scale-105'
                              : 'border-slate-200 text-slate-800'
                          }`}
                        style={
                          isOtpVerifiedAnim
                            ? {
                              transform: `translateX(${(2.5 - index) * 50}px) scale(0.1)`,
                              opacity: 0,
                              transition: 'all 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                            }
                            : {
                              transition: 'all 0.3s ease',
                            }
                        }
                      >
                        {char ? (
                          <span className="animate-in zoom-in duration-150">{char}</span>
                        ) : (
                          <span className="text-slate-350 font-normal text-xs">•</span>
                        )}

                        {/* Revolving Dot for complete state */}
                        {isComplete && !isOtpVerifiedAnim && (
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              animation: 'spin-dot 1.2s linear infinite',
                            }}
                          >
                            <div
                              className="absolute top-0 left-1/2 w-[7px] h-[7px] bg-orange-500 rounded-full shadow-[0_0_6px_#f97316]"
                              style={{
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Use code received in {otpType === 'mobile' ? 'SMS' : 'email'}
              </span>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 w-full">
                <button
                  type="button"
                  disabled={otpType === 'mobile' ? (verifyingMobileOtp || isOtpVerifiedAnim) : (verifyingEmailOtp || isOtpVerifiedAnim)}
                  onClick={() => {
                    if (otpType === 'mobile') {
                      handleVerifyMobileOtp();
                    } else {
                      handleVerifyEmailOtp();
                    }
                  }}
                  className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648C0] text-white font-bold rounded-xl text-xs transition shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer press disabled:bg-blue-400"
                >
                  Verify Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOtpSent(false);
                    setEmailOtpSent(false);
                  }}
                  className="w-full py-2.5 border border-slate-250 text-slate-500 font-semibold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer press"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
