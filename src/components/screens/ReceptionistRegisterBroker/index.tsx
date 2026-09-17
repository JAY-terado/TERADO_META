import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, Phone, Mail, FileText, MapPin, Loader2, Info, Check, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import { registerBroker, requestMobileOtp, verifyMobileOtp, type RegisterBrokerPayload } from '../../../pages/api/register';
import { getStates, getCities, type State, type City } from '../../../pages/api/masters';
import { SearchableSelect } from '../../ui/SearchableSelect';

interface ReceptionistRegisterBrokerProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const ReceptionistRegisterBroker: React.FC<ReceptionistRegisterBrokerProps> = ({
  isModal = false,
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();

  // Form states
  const [brokerName, setBrokerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [reraRegistrationNumber, setReraRegistrationNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // OTP Verification States
  const [isMobileVerified, setIsMobileVerified] = useState(true);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [otpPin, setOtpPin] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);
  const [isOtpVerifiedAnim, setIsOtpVerifiedAnim] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Master lists states
  const [statesList, setStatesList] = useState<State[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch states on mount
  useEffect(() => {
    const fetchStatesList = async () => {
      setLoadingStates(true);
      try {
        const res = await getStates();
        if (res && res.success) {
          setStatesList(res.data);
        }
      } catch (err) {
        console.error('Error fetching states:', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStatesList();
  }, []);

  const handleStateChange = async (selectedStateName: string) => {
    handleInputChange('state', selectedStateName, setState);
    setTouched(prev => ({ ...prev, state: true }));
    // Reset city
    handleInputChange('city', '', setCity);
    setCitiesList([]);

    if (!selectedStateName) return;

    // Find the state ID
    const selectedStateObj = statesList.find(s => s.state_name === selectedStateName);
    if (selectedStateObj) {
      setLoadingCities(true);
      try {
        const res = await getCities(selectedStateObj.id);
        if (res && res.success) {
          setCitiesList(res.data);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      } finally {
        setLoadingCities(false);
      }
    }
  };

  // Focus OTP input when modal opens
  useEffect(() => {
    if (mobileOtpSent && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [mobileOtpSent]);

  // Close OTP modal on Esc key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileOtpSent) {
          setMobileOtpSent(false);
          setOtpPin('');
          setOtpError('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOtpSent]);

  // Real-time Field Validator
  const validateField = (field: string, value: string) => {
    let err = '';
    const val = value.trim();

    switch (field) {
      case 'brokerName':
        if (!val) {
          err = 'Broker Name is required';
        } else if (val.length < 3) {
          err = 'Broker Name must be at least 3 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(val)) {
          err = 'Broker Name must contain only letters and spaces';
        }
        break;
      case 'companyName':
        if (!val) {
          err = 'Company Name is required';
        } else if (val.length < 3) {
          err = 'Company Name must be at least 3 characters';
        }
        break;
      case 'mobileNumber':
        if (!val) {
          err = 'Mobile number is required';
        } else if (val.length !== 10 || isNaN(Number(val))) {
          err = 'Mobile number must be exactly 10 digits';
        }
        break;
      case 'alternateMobile':
        if (val && (val.length !== 10 || isNaN(Number(val)))) {
          err = 'Alternate mobile number must be exactly 10 digits';
        } else if (val && val === mobileNumber.trim()) {
          err = 'Alternate mobile must be different from primary mobile';
        }
        break;
      case 'email':
        if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          err = 'Please enter a valid email address';
        }
        break;
      case 'panNumber':
        if (val && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.toUpperCase())) {
          err = 'Invalid PAN format (e.g. ABCDE1234F)';
        }
        break;
      case 'gstNumber':
        if (val && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.toUpperCase())) {
          err = 'Invalid GSTIN format (e.g. 27AAAAA1111A1Z1)';
        }
        break;
      case 'addressLine1':
        if (!val) {
          err = 'Address Line 1 is required';
        }
        break;
      case 'city':
        if (!val) {
          err = 'City is required';
        }
        break;
      case 'state':
        if (!val) {
          err = 'State is required';
        }
        break;
      case 'pincode':
        if (!val) {
          err = 'Pincode is required';
        } else if (val.length !== 6 || isNaN(Number(val))) {
          err = 'Pincode must be exactly 6 digits';
        }
        break;
      default:
        break;
    }
    return err;
  };

  const handleInputChange = (field: string, val: string, setter: (v: string) => void) => {
    setter(val);
    const err = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleBlur = (field: string, val: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  // OTP triggers
  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10 || errors.mobileNumber) {
      setError('Please enter a valid 10-digit mobile number before sending OTP.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await requestMobileOtp(mobileNumber);
      if (res && res.success) {
        setOtpPin('');
        setOtpError('');
        setMobileOtpSent(true);
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred while requesting OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = codeOverride || otpPin;
    if (code.length < 6) {
      setOtpError('Please enter a 6-digit OTP code');
      return;
    }
    setVerifyingMobileOtp(true);
    setOtpError('');
    try {
      const res = await verifyMobileOtp(mobileNumber, code);
      if (res && res.success) {
        setIsOtpVerifiedAnim(true);
        setOtpError('');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsMobileVerified(true);
        setMobileOtpSent(false);
        setIsOtpVerifiedAnim(false);
        setError('');
      } else {
        setOtpError(res.message || 'Invalid OTP code. Please try again.');
        setOtpPin('');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'An error occurred during verification.');
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handleOtpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setOtpPin(val);
      if (val.length === 6) {
        handleVerifyOtp(val);
      } else {
        setOtpError('');
      }
    }
  };

  const handleCancel = () => {
    if (isModal) {
      if (onClose) onClose();
    } else {
      navigate('/receptionist/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark required fields as touched & validate
    const requiredFields = [
      'brokerName',
      'companyName',
      'mobileNumber',
      'addressLine1',
      'city',
      'state',
      'pincode'
    ];

    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    requiredFields.forEach(f => {
      newTouched[f] = true;
      let val = '';
      if (f === 'brokerName') val = brokerName;
      else if (f === 'companyName') val = companyName;
      else if (f === 'mobileNumber') val = mobileNumber;
      else if (f === 'addressLine1') val = addressLine1;
      else if (f === 'city') val = city;
      else if (f === 'state') val = state;
      else if (f === 'pincode') val = pincode;

      const err = validateField(f, val);
      if (err) newErrors[f] = err;
    });

    // Optionals verification if entered
    if (panNumber) {
      newTouched.panNumber = true;
      const err = validateField('panNumber', panNumber);
      if (err) newErrors.panNumber = err;
    }
    if (alternateMobile) {
      newTouched.alternateMobile = true;
      const err = validateField('alternateMobile', alternateMobile);
      if (err) newErrors.alternateMobile = err;
    }
    if (email) {
      newTouched.email = true;
      const err = validateField('email', email);
      if (err) newErrors.email = err;
    }
    if (gstNumber) {
      newTouched.gstNumber = true;
      const err = validateField('gstNumber', gstNumber);
      if (err) newErrors.gstNumber = err;
    }

    setTouched(prev => ({ ...prev, ...newTouched }));
    setErrors(prev => ({ ...prev, ...newErrors }));

    if (Object.values(newErrors).some(v => !!v)) {
      setError('Please resolve all real-time validation errors.');
      return;
    }

    setLoading(true);

    try {
      const payload: RegisterBrokerPayload = {
        broker_name: brokerName.trim(),
        company_name: companyName.trim() || undefined,
        mobile_number: mobileNumber.trim(),
        alternate_mobile: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        pan_number: panNumber.trim().toUpperCase() || undefined,
        gst_number: gstNumber.trim() || undefined,
        rera_registration_number: reraRegistrationNumber.trim() || undefined,
        address_line_1: addressLine1.trim(),
        address_line_2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      };

      const res = await registerBroker(payload);
      if (res && res.success) {
        await Swal.fire({
          title: 'Broker Registered!',
          text: res.message || 'Broker account has been successfully created.',
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: isModal ? 'Close' : 'Go to Dashboard'
        });
        if (isModal) {
          if (onSuccess) onSuccess();
        } else {
          navigate('/receptionist/dashboard');
        }
      } else {
        setError(res?.message || 'Failed to create broker account.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred while creating broker.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="space-y-6 text-left animate-fade-up">
      {/* Header Panel */}
      {!isModal && (
        <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer border-none outline-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Register New Broker</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Reception Desk &gt; Register new channel partner / broker
            </p>
          </div>
        </div>
      )}

      <div className="w-full">
        <form 
          onSubmit={handleSubmit} 
          className={`w-full space-y-6 ${isModal ? 'bg-transparent p-0' : 'bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]'}`}
        >
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold animate-pulse flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Broker Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-650" />
              Broker Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Company Name <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="Enter agency / company name"
                  value={companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value, setCompanyName)}
                  onBlur={() => handleBlur('companyName', companyName)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.companyName && errors.companyName ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.companyName && errors.companyName && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.companyName}</p>
                )}
              </div>

              {/* Broker Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Broker Name <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={brokerName}
                  onChange={(e) => handleInputChange('brokerName', e.target.value, setBrokerName)}
                  onBlur={() => handleBlur('brokerName', brokerName)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.brokerName && errors.brokerName ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.brokerName && errors.brokerName && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.brokerName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-655" />
              Contact Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Mobile Number */}
              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Mobile Number <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={mobileNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                        setMobileNumber(val);
                        const err = validateField('mobileNumber', val);
                        setErrors(prev => ({ ...prev, mobileNumber: err }));
                      }}
                      onBlur={() => handleBlur('mobileNumber', mobileNumber)}
                      className={`block w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-semibold ${
                        touched.mobileNumber && errors.mobileNumber ? 'border-red-500' : 'border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
                {touched.mobileNumber && errors.mobileNumber && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.mobileNumber}</p>
                )}
              </div>

              {/* Alternate Mobile */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Alternate Mobile</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Optional alternate mobile"
                  value={alternateMobile}
                  onChange={(e) => handleInputChange('alternateMobile', e.target.value.replace(/[^0-9]/g, ''), setAlternateMobile)}
                  onBlur={() => handleBlur('alternateMobile', alternateMobile)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.alternateMobile && errors.alternateMobile ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.alternateMobile && errors.alternateMobile && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.alternateMobile}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value, setEmail)}
                    onBlur={() => handleBlur('email', email)}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                      touched.email && errors.email ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Professional Credentials */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-650" />
              Professional Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* PAN Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={panNumber}
                  onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase(), setPanNumber)}
                  onBlur={() => handleBlur('panNumber', panNumber)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.panNumber && errors.panNumber ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.panNumber && errors.panNumber && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.panNumber}</p>
                )}
              </div>

              {/* GST Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">GST Number</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="15-digit GSTIN (Optional)"
                  value={gstNumber}
                  onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase(), setGstNumber)}
                  onBlur={() => handleBlur('gstNumber', gstNumber)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.gstNumber && errors.gstNumber ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.gstNumber && errors.gstNumber && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.gstNumber}</p>
                )}
              </div>

              {/* RERA Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">RERA Number</label>
                <input
                  type="text"
                  placeholder="RERA Registration Number (Optional)"
                  value={reraRegistrationNumber}
                  onChange={(e) => handleInputChange('reraRegistrationNumber', e.target.value, setReraRegistrationNumber)}
                  onBlur={() => handleBlur('reraRegistrationNumber', reraRegistrationNumber)}
                  className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-650" />
              Address Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Address Line 1 */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Address Line 1 <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="House/Office No., Building Name, Street"
                  value={addressLine1}
                  onChange={(e) => handleInputChange('addressLine1', e.target.value, setAddressLine1)}
                  onBlur={() => handleBlur('addressLine1', addressLine1)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.addressLine1 && errors.addressLine1 ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.addressLine1 && errors.addressLine1 && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.addressLine1}</p>
                )}
              </div>

              {/* Address Line 2 */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Locality, Landmark (Optional)"
                  value={addressLine2}
                  onChange={(e) => handleInputChange('addressLine2', e.target.value, setAddressLine2)}
                  onBlur={() => handleBlur('addressLine2', addressLine2)}
                  className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* State */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">State <span className="text-red-500 ml-0.5">*</span></label>
                {loadingStates ? (
                  <div className="flex items-center gap-2 h-10 px-4 border border-slate-200 rounded-xl bg-slate-50/50">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400 font-semibold">Loading states...</span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={statesList.map(s => s.state_name)}
                    value={state}
                    onChange={handleStateChange}
                    placeholder="Search/Select State"
                    className={touched.state && errors.state ? 'border-red-500' : ''}
                  />
                )}
                {touched.state && errors.state && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.state}</p>
                )}
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">City <span className="text-red-500 ml-0.5">*</span></label>
                <SearchableSelect
                  options={citiesList.map(c => c.city_name)}
                  value={city}
                  onChange={(val) => {
                    handleInputChange('city', val, setCity);
                    setTouched(prev => ({ ...prev, city: true }));
                  }}
                  placeholder={!state ? "Select state first" : loadingCities ? "Loading cities..." : "Search/Select City"}
                  disabled={loadingCities || !state}
                  className={touched.city && errors.city ? 'border-red-500' : ''}
                />
                {touched.city && errors.city && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.city}</p>
                )}
              </div>

              {/* Pincode */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Pincode <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value.replace(/[^0-9]/g, ''), setPincode)}
                  onBlur={() => handleBlur('pincode', pincode)}
                  className={`block w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold ${
                    touched.pincode && errors.pincode ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {touched.pincode && errors.pincode && (
                  <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.pincode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 border border-slate-250 text-slate-650 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_14px_rgba(79,70,229,0.2)] cursor-pointer text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm &amp; Register</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* OTP Verification Modal */}
      {mobileOtpSent && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#4F46E5] to-[#4338CA] px-6 py-6 relative overflow-hidden text-center text-white">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="mx-auto w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-3">
                  <Phone className="w-6 h-6 text-white animate-bounce" />
                </div>
                <h3 className="text-lg font-bold">Verify Mobile Number</h3>
                <p className="text-[11px] text-indigo-100/80 font-medium mt-1">
                  We've sent a 6-digit OTP code to <strong className="text-white">{mobileNumber}</strong>
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-6 text-center">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enter 6-Digit OTP Pin
                </span>
                
                {otpError && (
                  <p className="text-red-500 text-[10px] font-semibold bg-red-50 border border-red-100 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span>{otpError}</span>
                  </p>
                )}

                <div 
                  className="relative flex justify-center gap-2.5 max-w-[280px] mx-auto cursor-pointer"
                  onClick={() => otpInputRef.current?.focus()}
                >
                  <input
                    ref={otpInputRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    disabled={verifyingMobileOtp || isOtpVerifiedAnim}
                    maxLength={6}
                    value={otpPin}
                    onChange={handleOtpInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ zIndex: 10 }}
                  />
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = otpPin[index] || '';
                    const isFocused = index === otpPin.length;
                    return (
                      <div
                        key={index}
                        className={`w-10 h-12 border-2 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                          isOtpVerifiedAnim
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : isFocused
                            ? 'border-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.3)] scale-105'
                            : 'border-slate-200 text-slate-800'
                        }`}
                        style={{ transition: 'all 0.3s ease', zIndex: 1 }}
                      >
                        {char ? <span>{char}</span> : <span className="text-slate-300">•</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 w-full">
                <button
                  type="button"
                  disabled={verifyingMobileOtp || isOtpVerifiedAnim}
                  onClick={() => handleVerifyOtp()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-755 text-white font-bold rounded-xl text-xs transition shadow-[0_4px_14px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] cursor-pointer press disabled:bg-indigo-400 border-none"
                >
                  Verify Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOtpSent(false);
                    setOtpPin('');
                    setOtpError('');
                  }}
                  className="w-full py-2.5 border border-slate-250 text-slate-500 font-semibold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer press bg-white"
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

  if (isModal) {
    return createPortal(
      <div 
        onClick={() => {
          if (!mobileOtpSent) handleCancel();
        }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_rgba(10,22,40,0.35)] animate-scale-in"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-br from-[#0A1628] via-[#4F46E5] to-[#4338CA] px-6 py-6 text-center text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <h3 className="text-lg font-bold">Register New Broker</h3>
              <p className="text-[11px] text-indigo-100/80 font-medium mt-1">
                Register new channel partner / broker
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="absolute right-4 top-4 text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition border-none bg-transparent"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {content}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return content;
};
