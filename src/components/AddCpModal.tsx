import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  User,
  Building,
  Phone,
  MapPin,
  CreditCard,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { createBroker, type CreateBrokerPayload } from '../admin/api/brokers';
import { requestMobileOtp, verifyMobileOtp } from '../pages/api/register';
import { getStates, getCities, type State, type City } from '../pages/api/masters';
import { getUserPermissions } from '../pages/api/login';
import { SearchableSelect } from './ui/SearchableSelect';

export interface AddCpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOtpMandatory?: boolean;
  onSuccess?: (createdBroker?: any) => void;
}

export const AddCpModal: React.FC<AddCpModalProps> = ({
  isOpen,
  onClose,
  isOtpMandatory: propIsOtpMandatory,
  onSuccess,
}) => {
  // Mandatory form fields
  const [brokerName, setBrokerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Primary optional fields
  const [companyName, setCompanyName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Additional optional fields (collapsible)
  const [email, setEmail] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // OTP Verification States
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');

  // Dropdown states for State & City
  const [statesList, setStatesList] = useState<State[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Status & Validation
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Resolved isOtpMandatory from prop or userPermissions
  const resolvedIsOtpMandatory = useMemo(() => {
    if (propIsOtpMandatory !== undefined) return Boolean(propIsOtpMandatory);
    const perms = getUserPermissions();
    if (perms) {
      return Number(perms.is_otp_mandatory_on_broker_creation) === 1;
    }
    return false;
  }, [propIsOtpMandatory, isOpen]);

  // Reset form
  const resetForm = () => {
    setBrokerName('');
    setCompanyName('');
    setMobileNumber('');
    setAlternateMobile('');
    setEmail('');
    setPanNumber('');
    setGstNumber('');
    setReraNumber('');
    setAddressLine1('');
    setAddressLine2('');
    setState('');
    setCity('');
    setPincode('');
    setShowMoreDetails(false);
    setIsMobileVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpCooldown(0);
    setOtpError('');
    setCitiesList([]);
    setErrors({});
    setTouched({});
    setGeneralError('');
  };

  // Close handler
  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting]);

  // Cooldown countdown effect
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Fetch states when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const res = await getStates();
        if (isMounted && res && res.success && Array.isArray(res.data)) {
          setStatesList(res.data);
        }
      } catch (err) {
        console.error('Failed to load states for Add CP:', err);
      } finally {
        if (isMounted) setLoadingStates(false);
      }
    };

    loadStates();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle state change & load cities
  const handleStateChange = async (selectedStateName: string) => {
    setState(selectedStateName);
    setCity('');
    setCitiesList([]);

    if (!selectedStateName) return;

    const matchedState = statesList.find((s) => s.state_name === selectedStateName);
    if (matchedState) {
      setLoadingCities(true);
      try {
        const res = await getCities(matchedState.id);
        if (res && res.success && Array.isArray(res.data)) {
          setCitiesList(res.data);
        }
      } catch (err) {
        console.error('Failed to load cities for Add CP:', err);
      } finally {
        setLoadingCities(false);
      }
    }
  };

  // Handle mobile number input
  const handleMobileChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 10);
    setMobileNumber(cleaned);
    if (isMobileVerified || otpSent) {
      setIsMobileVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
    }
    if (touched.mobileNumber) {
      setErrors((prev) => ({
        ...prev,
        mobileNumber: validateField('mobileNumber', cleaned),
      }));
    }
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10) {
      setGeneralError('Please enter a valid 10-digit mobile number before sending OTP.');
      return;
    }
    setGeneralError('');
    setOtpError('');
    setIsSendingOtp(true);
    try {
      const res = await requestMobileOtp(mobileNumber);
      if (res && res.success) {
        setOtpSent(true);
        setOtpCooldown(30);
        setOtpCode('');
        Swal.fire({
          title: 'OTP Sent!',
          text: `Verification OTP has been sent to +91 ${mobileNumber}`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 2000,
          timerProgressBar: true,
        });
      } else {
        setOtpError(res?.message || 'Failed to send OTP to this number.');
      }
    } catch (err: any) {
      console.error('Error sending broker OTP:', err);
      setOtpError(err?.response?.data?.message || err.message || 'Failed to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP code.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await verifyMobileOtp(mobileNumber, otpCode);
      if (res && res.success) {
        setIsMobileVerified(true);
        setOtpSent(false);
        setOtpError('');
        Swal.fire({
          title: 'Mobile Verified!',
          text: `Broker mobile number +91 ${mobileNumber} verified successfully.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 1800,
          timerProgressBar: true,
        });
      } else {
        setOtpError(res?.message || 'Invalid OTP code. Please try again.');
      }
    } catch (err: any) {
      console.error('Error verifying broker OTP:', err);
      setOtpError(err?.response?.data?.message || err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Validate single field
  const validateField = (field: string, val: string): string => {
    switch (field) {
      case 'brokerName':
        if (!val.trim()) return 'Broker / CP name is required';
        if (val.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'mobileNumber':
        if (!val.trim()) return 'Mobile number is required';
        if (!/^[6-9]\d{9}$/.test(val.trim())) return 'Enter a valid 10-digit mobile number';
        return '';
      case 'alternateMobile':
        if (val.trim() && !/^[6-9]\d{9}$/.test(val.trim())) return 'Enter a valid 10-digit mobile number';
        return '';
      case 'email':
        if (val.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Enter a valid email address';
        return '';
      case 'panNumber':
        if (val.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.trim().toUpperCase())) {
          return 'Enter a valid 10-character PAN (e.g. ABCDE1234F)';
        }
        return '';
      case 'gstNumber':
        if (val.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.trim().toUpperCase())) {
          return 'Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5)';
        }
        return '';
      case 'pincode':
        if (val.trim() && !/^\d{6}$/.test(val.trim())) return 'Enter a valid 6-digit pincode';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    const newErrors: Record<string, string> = {
      brokerName: validateField('brokerName', brokerName),
      mobileNumber: validateField('mobileNumber', mobileNumber),
      alternateMobile: validateField('alternateMobile', alternateMobile),
      email: validateField('email', email),
      panNumber: validateField('panNumber', panNumber),
      gstNumber: validateField('gstNumber', gstNumber),
      pincode: validateField('pincode', pincode),
    };

    setTouched({
      brokerName: true,
      mobileNumber: true,
      alternateMobile: true,
      email: true,
      panNumber: true,
      gstNumber: true,
      pincode: true,
    });

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((msg) => !!msg);
    if (hasErrors) {
      setGeneralError('Please correct the highlighted fields before submitting.');
      return;
    }

    if (resolvedIsOtpMandatory && !isMobileVerified) {
      setGeneralError('Please verify the broker mobile number with OTP first.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateBrokerPayload = {
        broker_name: brokerName.trim(),
        mobile_number: mobileNumber.trim(),
      };

      if (companyName.trim()) payload.company_name = companyName.trim();
      if (alternateMobile.trim()) payload.alternate_mobile = alternateMobile.trim();
      if (email.trim()) payload.email = email.trim();
      if (panNumber.trim()) payload.pan_number = panNumber.trim().toUpperCase();
      if (gstNumber.trim()) payload.gst_number = gstNumber.trim().toUpperCase();
      if (reraNumber.trim()) payload.rera_registration_number = reraNumber.trim();
      if (addressLine1.trim()) payload.address_line_1 = addressLine1.trim();
      if (addressLine2.trim()) payload.address_line_2 = addressLine2.trim();
      if (city.trim()) payload.city = city.trim();
      if (state.trim()) payload.state = state.trim();
      if (pincode.trim()) payload.pincode = pincode.trim();

      const res = await createBroker(payload);

      if (res && res.success) {
        await Swal.fire({
          title: 'Channel Partner Registered!',
          text: res.message || `Channel Partner "${brokerName.trim()}" has been successfully added.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Done',
          timer: 2500,
          timerProgressBar: true,
        });

        resetForm();
        onSuccess?.(res.data || res);
        onClose();
      } else {
        setGeneralError(res?.message || 'Failed to register Channel Partner. Please try again.');
      }
    } catch (err: any) {
      console.error('Error registering CP:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'An error occurred while registering the Channel Partner.';
      setGeneralError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-xl flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left animate-scale-in border border-slate-100"
        style={{ maxHeight: 'min(92vh, 760px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B1528] via-[#0F2847] to-[#047857] px-6 py-5 relative overflow-hidden shrink-0 text-white">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 text-emerald-300">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">Add Channel Partner</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 tracking-wider">
                    CP Desk
                  </span>
                </div>
                <p className="text-xs text-emerald-100/70 font-medium mt-0.5">
                  Register a new broker / CP into your channel partner network
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* General Error Alert */}
            {generalError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="flex-1">{generalError}</span>
              </div>
            )}

            {/* CP Name & Company Name Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Broker / CP Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  Broker / CP Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={brokerName}
                    onChange={(e) => {
                      setBrokerName(e.target.value);
                      if (touched.brokerName) {
                        setErrors((prev) => ({
                          ...prev,
                          brokerName: validateField('brokerName', e.target.value),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('brokerName', brokerName)}
                    className={`block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold ${
                      touched.brokerName && errors.brokerName
                        ? 'border-rose-500 bg-rose-50/15'
                        : 'border-slate-200'
                    }`}
                    required
                  />
                </div>
                {touched.brokerName && errors.brokerName && (
                  <p className="text-rose-500 text-[10px] font-semibold">{errors.brokerName}</p>
                )}
              </div>

              {/* Company / Firm Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  Company / Firm Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Apex Real Estate"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Number & PAN Number Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mobile Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Mobile Number</span>
                    <span className="text-rose-500">*</span>
                    {resolvedIsOtpMandatory && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          isMobileVerified
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isMobileVerified ? 'Verified' : 'OTP Required'}
                      </span>
                    )}
                  </label>
                  <span className={`text-[10px] font-bold ${mobileNumber.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {mobileNumber.length}/10
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    maxLength={10}
                    disabled={isMobileVerified}
                    placeholder="10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    onBlur={() => handleBlur('mobileNumber', mobileNumber)}
                    className={`block w-full pl-9 ${
                      resolvedIsOtpMandatory ? 'pr-24' : 'pr-9'
                    } py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold ${
                      isMobileVerified
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-900'
                        : touched.mobileNumber && errors.mobileNumber
                        ? 'border-rose-500 bg-rose-50/15'
                        : 'border-slate-200'
                    }`}
                    required
                  />

                  {/* Verification action button / verified badge inside input */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isMobileVerified ? (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
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
                        disabled={mobileNumber.length !== 10 || isSendingOtp || otpCooldown > 0}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer ${
                          mobileNumber.length !== 10 || otpCooldown > 0 || isSendingOtp
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
                      mobileNumber.length === 10 && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 pointer-events-none" />
                      )
                    )}
                  </div>
                </div>

                {touched.mobileNumber && errors.mobileNumber && (
                  <p className="text-rose-500 text-[10px] font-semibold">{errors.mobileNumber}</p>
                )}

                {/* OTP Verification Sub-Card when OTP is sent */}
                {resolvedIsOtpMandatory && otpSent && !isMobileVerified && (
                  <div className="mt-2 p-3 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2 animate-fade-in text-left">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        Enter 6-digit OTP code sent to +91 {mobileNumber}
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
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verify OTP</span>
                          </>
                        )}
                      </button>
                    </div>
                    {otpError && (
                      <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{otpError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* PAN Number */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  PAN Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setPanNumber(val);
                      if (touched.panNumber) {
                        setErrors((prev) => ({
                          ...prev,
                          panNumber: validateField('panNumber', val),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('panNumber', panNumber)}
                    className={`block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold uppercase ${
                      touched.panNumber && errors.panNumber
                        ? 'border-rose-500 bg-rose-50/15'
                        : 'border-slate-200'
                    }`}
                  />
                </div>
                {touched.panNumber && errors.panNumber && (
                  <p className="text-rose-500 text-[10px] font-semibold">{errors.panNumber}</p>
                )}
              </div>
            </div>

            {/* Address Line 1 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                Office / Residential Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <textarea
                  rows={2}
                  placeholder="House/Office No., Street, Locality"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="block w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold resize-none"
                />
              </div>
            </div>

            {/* State, City, Pincode Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* State */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                  State <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                {loadingStates ? (
                  <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-xl bg-slate-50">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span className="text-[11px] text-slate-400 font-medium">Loading states...</span>
                  </div>
                ) : statesList.length > 0 ? (
                  <SearchableSelect
                    options={statesList.map((s) => s.state_name)}
                    value={state}
                    onChange={handleStateChange}
                    placeholder="Select State"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Enter state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                )}
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                  City <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                {loadingCities ? (
                  <div className="flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-xl bg-slate-50">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span className="text-[11px] text-slate-400 font-medium">Loading cities...</span>
                  </div>
                ) : citiesList.length > 0 ? (
                  <SearchableSelect
                    options={citiesList.map((c) => c.city_name)}
                    value={city}
                    onChange={(val) => setCity(val)}
                    placeholder={!state ? 'Select State first' : 'Select City'}
                    disabled={!state}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Pincode */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                  Pincode <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit pincode"
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setPincode(val);
                    if (touched.pincode) {
                      setErrors((prev) => ({
                        ...prev,
                        pincode: validateField('pincode', val),
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('pincode', pincode)}
                  className={`block w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold ${
                    touched.pincode && errors.pincode
                      ? 'border-rose-500 bg-rose-50/15'
                      : 'border-slate-200'
                  }`}
                />
                {touched.pincode && errors.pincode && (
                  <p className="text-rose-500 text-[10px] font-semibold">{errors.pincode}</p>
                )}
              </div>
            </div>

            {/* Toggle More Details (Email, Alt Mobile, GST, RERA, Address 2) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                {showMoreDetails ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide Additional Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>+ Add More Details (Email, Alt Mobile, GST, RERA)</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Additional Details */}
            {showMoreDetails && (
              <div className="space-y-4 pt-2 border-t border-slate-200/60 animate-fade-in">
                {/* Email & Alternate Mobile Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="e.g. rajesh@apexrealestate.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (touched.email) {
                            setErrors((prev) => ({
                              ...prev,
                              email: validateField('email', e.target.value),
                            }));
                          }
                        }}
                        onBlur={() => handleBlur('email', email)}
                        className={`block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold ${
                          touched.email && errors.email
                            ? 'border-rose-500 bg-rose-50/15'
                            : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {touched.email && errors.email && (
                      <p className="text-rose-500 text-[10px] font-semibold">{errors.email}</p>
                    )}
                  </div>

                  {/* Alternate Mobile */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                      Alternate Mobile <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Secondary 10-digit mobile"
                        value={alternateMobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setAlternateMobile(val);
                          if (touched.alternateMobile) {
                            setErrors((prev) => ({
                              ...prev,
                              alternateMobile: validateField('alternateMobile', val),
                            }));
                          }
                        }}
                        onBlur={() => handleBlur('alternateMobile', alternateMobile)}
                        className={`block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold ${
                          touched.alternateMobile && errors.alternateMobile
                            ? 'border-rose-500 bg-rose-50/15'
                            : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {touched.alternateMobile && errors.alternateMobile && (
                      <p className="text-rose-500 text-[10px] font-semibold">{errors.alternateMobile}</p>
                    )}
                  </div>
                </div>

                {/* Address Line 2 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    Address Line 2 <span className="text-slate-400 font-normal">(Near Station / Landmark)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Near Station, Opposite Mall"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                {/* GST & RERA Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* GST Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                      GST Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        value={gstNumber}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setGstNumber(val);
                          if (touched.gstNumber) {
                            setErrors((prev) => ({
                              ...prev,
                              gstNumber: validateField('gstNumber', val),
                            }));
                          }
                        }}
                        onBlur={() => handleBlur('gstNumber', gstNumber)}
                        className={`block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold uppercase ${
                          touched.gstNumber && errors.gstNumber
                            ? 'border-rose-500 bg-rose-50/15'
                            : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {touched.gstNumber && errors.gstNumber && (
                      <p className="text-rose-500 text-[10px] font-semibold">{errors.gstNumber}</p>
                    )}
                  </div>

                  {/* RERA Registration Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                      RERA Registration Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. A51800012345"
                        value={reraNumber}
                        onChange={(e) => setReraNumber(e.target.value)}
                        className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition text-slate-800 font-semibold uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (resolvedIsOtpMandatory && !isMobileVerified)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering CP...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Register CP</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
