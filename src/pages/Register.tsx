import React, { useState, useEffect, useRef } from 'react';
import { CustomSelect } from '../components/CustomSelect';
import { SearchableSelect } from '../components/ui/SearchableSelect';

import { useNavigate, Link } from 'react-router-dom';
import { useBrokerConnect } from '../context/BrokerConnectContext';
import {
  Building2, ArrowLeft, ChevronRight, ChevronLeft, MapPin,
  Smartphone, FileText, CheckCircle, Shield, Award, Mail, Info
} from 'lucide-react';
import { requestEmailOtp, verifyEmailOtp, registerBroker, requestMobileOtp, verifyMobileOtp } from './api/register';
import { getStates, getCities } from './api/masters';
import type { State, City } from './api/masters';
import { BrandLogo } from '../components/BrandLogo';


export const Register: React.FC = () => {
  const { addBroker } = useBrokerConnect();
  const navigate = useNavigate();

  // Wizard Step State
  const [wizardStep, setWizardStep] = useState(1);

  // Step 1: Basic Information
  const [brokerName, setBrokerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNum, setMobileNum] = useState('');
  const [altMobileNum, setAltMobileNum] = useState('');
  const [emailId, setEmailId] = useState('');

  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isMobileVerifiedAnim, setIsMobileVerifiedAnim] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpVerificationError, setOtpVerificationError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [pinKey, setPinKey] = useState(0);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isEmailVerifiedAnim, setIsEmailVerifiedAnim] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailResendTimer, setEmailResendTimer] = useState(30);
  const [emailPinKey, setEmailPinKey] = useState(0);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [loadingMobileOtp, setLoadingMobileOtp] = useState(false);
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);

  const mobileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileOtpSent && mobileInputRef.current) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 150);
    }
  }, [mobileOtpSent, pinKey]);

  useEffect(() => {
    if (emailOtpSent && emailInputRef.current) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 150);
    }
  }, [emailOtpSent, emailPinKey]);

  // Step 2: Verification Documents
  const [panNumber, setPANNumber] = useState('');
  const [gstNumber, setGSTNumber] = useState('');
  const [reraNumber, setRERANumber] = useState('');
  const [panError, setPanError] = useState('');
  const [gstError, setGstError] = useState('');
  const [reraError, setReraError] = useState('');

  // Step 3: Address details
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressLine1Error, setAddressLine1Error] = useState('');
  const [stateError, setStateError] = useState('');
  const [cityError, setCityError] = useState('');
  const [pincodeError, setPincodeError] = useState('');

  const [statesList, setStatesList] = useState<State[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load states on mount
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await getStates();
        if (res.success && res.data) {
          setStatesList(res.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch states:', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  const handleStateChange = async (selectedStateName: string) => {
    setState(selectedStateName);
    setStateError('');
    setCity('');
    setCityError('');
    setCitiesList([]);

    const selectedStateObj = statesList.find(s => s.state_name === selectedStateName);
    const stateId = selectedStateObj ? selectedStateObj.id : 0;
    if (stateId > 0) {
      setLoadingCities(true);
      try {
        const res = await getCities(stateId);
        if (res.success && res.data) {
          setCitiesList(res.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch cities:', err);
      } finally {
        setLoadingCities(false);
      }
    }
  };

  // Auto-generate Broker ID effect removed

  const handleVerifyMobileOtp = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setOtpVerificationError('Please enter a 6-digit OTP code');
      return;
    }
    setVerifyingMobileOtp(true);
    setOtpVerificationError('');
    try {
      const res = await verifyMobileOtp(mobileNum, Number(codeToVerify));
      if (res.success) {
        setIsMobileVerifiedAnim(true);
        setOtpVerificationError('');
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsMobileVerified(true);
        setMobileOtpSent(false);
        setIsMobileVerifiedAnim(false);
      } else {
        setOtpVerificationError(res.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setOtpVerificationError(err.message || 'An error occurred during verification.');
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handlePinChange = (val: string) => {
    setMobileOtp(val);
    if (val.length === 6) {
      handleVerifyMobileOtp(val);
    } else {
      setOtpVerificationError('');
    }
  };

  const handleVerifyEmailOtp = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setEmailOtpError('Please enter a 6-digit OTP code');
      return;
    }
    setVerifyingEmailOtp(true);
    setEmailOtpError('');
    try {
      const res = await verifyEmailOtp(emailId, Number(codeToVerify));
      if (res.success) {
        setIsEmailVerifiedAnim(true);
        setEmailOtpError('');
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsEmailVerified(true);
        setEmailOtpSent(false);
        setIsEmailVerifiedAnim(false);
      } else {
        setEmailOtpError(res.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setEmailOtpError(err.message || 'An error occurred during verification.');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleEmailPinChange = (val: string) => {
    setEmailOtp(val);
    if (val.length === 6) {
      handleVerifyEmailOtp(val);
    } else {
      setEmailOtpError('');
    }
  };

  // Resend OTP Countdown Timer
  useEffect(() => {
    let interval: any;
    if (mobileOtpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mobileOtpSent, resendTimer]);

  // Resend Email OTP Countdown Timer
  useEffect(() => {
    let interval: any;
    if (emailOtpSent && emailResendTimer > 0) {
      interval = setInterval(() => {
        setEmailResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [emailOtpSent, emailResendTimer]);

  const validateStep2 = () => {
    let isValid = true;

    // PAN Number validation - Optional
    if (panNumber.trim() !== '') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panNumber)) {
        setPanError('Enter a valid PAN number (e.g. ABCDE1234F).');
        isValid = false;
      } else {
        setPanError('');
      }
    } else {
      setPanError('');
    }

    // GST Number validation - Optional
    if (gstNumber.trim() !== '') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstNumber)) {
        setGstError('Enter a valid GST number.');
        isValid = false;
      } else {
        setGstError('');
      }
    } else {
      setGstError('');
    }

    // RERA Registration Number validation - Optional
    if (reraNumber.trim() !== '') {
      const reraRegex = /^[A-Z0-9\-\/]{5,50}$/;
      if (!reraRegex.test(reraNumber)) {
        setReraError('Enter a valid RERA registration number');
        isValid = false;
      } else {
        setReraError('');
      }
    } else {
      setReraError('');
    }

    return isValid;
  };


  const handleNextStep = () => {
    setError('');
    if (wizardStep === 1) {
      if (!brokerName || !companyName || !mobileNum) {
        setError('Please fill in all required fields (Broker Name, Company, Mobile)');
        return;
      }
      if (mobileNum.length !== 10) {
        setError('Primary Mobile Number must be exactly 10 digits');
        return;
      }
      if (!isMobileVerified) {
        setError('Please verify your primary mobile number first.');
        return;
      }
      if (altMobileNum && altMobileNum.length !== 10) {
        setError('Alternate Mobile Number must be exactly 10 digits');
        return;
      }
      if (emailId) {
        if (!emailId.includes('@')) {
          setError('Please enter a valid email address');
          return;
        }
        if (!isEmailVerified) {
          setError('Please verify your email address first.');
          return;
        }
      }
    } else if (wizardStep === 2) {
      if (!validateStep2()) {
        setError('Please fix errors in Government Verification step.');
        return;
      }
    }
    setWizardStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setWizardStep(prev => Math.max(1, prev - 1));
  };

  const validateStep3 = () => {
    let isValid = true;

    // Address Line 1
    if (!addressLine1.trim()) {
      setAddressLine1Error('Address Line 1 is required');
      isValid = false;
    } else {
      setAddressLine1Error('');
    }

    // State
    if (!state.trim()) {
      setStateError('State is required');
      isValid = false;
    } else {
      setStateError('');
    }

    // City
    if (!city.trim()) {
      setCityError('City is required');
      isValid = false;
    } else {
      setCityError('');
    }

    // Pincode validation: Required and must be exactly 6 digits
    if (!pincode.trim()) {
      setPincodeError('Pincode is required');
      isValid = false;
    } else if (!/^\d{6}$/.test(pincode.trim())) {
      setPincodeError('Enter Valid Pincode');
      isValid = false;
    } else {
      setPincodeError('');
    }

    return isValid;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const step3Ok = validateStep3();
    const step2Ok = validateStep2();

    if (!step3Ok) {
      setError('Please fix errors in Office Address Details.');
      return;
    }
    if (!step2Ok) {
      setError('Please fix errors in Government Verification step.');
      setWizardStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        broker_name: brokerName,
        company_name: companyName,
        mobile_number: mobileNum,
        alternate_mobile: altMobileNum,
        email: emailId || undefined,
        pan_number: panNumber || undefined,
        gst_number: gstNumber || undefined,
        rera_registration_number: reraNumber || undefined,
        address_line_1: addressLine1,
        address_line_2: addressLine2 || undefined,
        city: city,
        state: state,
        pincode: pincode
      };

      const res = await registerBroker(payload);

      if (res.success) {
        addBroker({
          name: brokerName,
          mobile: mobileNum,
          companyName: companyName,
          email: emailId || undefined,
          altMobile: altMobileNum || undefined,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state,
          pincode,
          reraNumber: reraNumber || undefined,
          panNumber: panNumber || undefined,
          gstNumber: gstNumber || undefined
        });

        // Redirect to login page with success state
        navigate('/login', {
          state: {
            success: res.message || `Registration submitted! Your broker account is now pending admin approval.`
          }
        });
      } else {
        setError(res.message || 'Registration failed. Please check your inputs.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-blue-100/10 text-slate-800 text-left font-sans">

      {/* Left side: Premium Document Requirement Guide (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/3 bg-[#0B1528] text-white p-12 flex-col justify-between relative overflow-hidden border-r border-white/8">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#1062AC]/18 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-[#EC3237]/10 rounded-full blur-2xl translate-y-1/3 z-0"></div>

        {/* Branding Logo */}
        <div className="relative z-20 self-start hover:opacity-90 transition-opacity anim-fade-in">
          <BrandLogo subtitle="Broker Registration" size="md" />
        </div>

        <div className="relative z-10 w-full bg-white/8 rounded-full h-1 mb-8">
          <div
            className="bg-gradient-to-r from-[#1062AC] via-[#38A3F8] to-[#EC3237] h-1 rounded-full transition-all duration-500"
            style={{ width: `${(wizardStep / 3) * 100}%` }}
          ></div>
        </div>

        {/* Dynamic Checklist Guide directly on background */}
        <div className="relative z-10 space-y-8 my-auto">
          <div className="anim-fade-up stagger-1">
            <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-widest block mb-1">Onboarding Guide</span>
            <h2 className="text-xl font-black bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent tracking-tight">Required Onboarding Steps</h2>
            <p className="text-xs text-blue-200/80 font-semibold mt-1.5 leading-relaxed">
              Verify your agency credentials to activate immediate lead protection locking.
            </p>
          </div>

          <div className="space-y-6 anim-fade-up stagger-2">
            {/* Step 1 Indicator */}
            <div className={`relative flex items-start gap-4 transition-all duration-300 ${wizardStep === 1 ? 'opacity-100 scale-102' : 'opacity-55'}`}>
              <div className="absolute left-4 top-8 w-[2px] h-10 bg-blue-900/80"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-xs z-10 ${wizardStep === 1 ? 'bg-[#1A56DB] text-white shadow-[0_0_0_4px_rgba(26,86,219,0.2)] pulse-glow' :
                wizardStep > 1 ? 'bg-emerald-500 text-white' : 'bg-white/8 text-blue-300 border border-white/10'
                }`}>
                {wizardStep > 1 ? <CheckCircle className="w-5 h-5" /> : '01'}
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Basic Information</span>
                <span className="text-[10px] text-blue-300/70 font-semibold leading-relaxed block">
                  Verify name, corporate email, and primary mobile number.
                </span>
              </div>
            </div>

            {/* Step 2 Indicator */}
            <div className={`relative flex items-start gap-4 transition-all duration-300 ${wizardStep === 2 ? 'opacity-100 scale-102' : 'opacity-55'}`}>
              <div className="absolute left-4 top-8 w-[2px] h-10 bg-blue-900/80"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-xs z-10 ${wizardStep === 2 ? 'bg-[#1A56DB] text-white shadow-[0_0_0_4px_rgba(26,86,219,0.2)] pulse-glow' :
                wizardStep > 2 ? 'bg-emerald-500 text-white' : 'bg-white/8 text-blue-300 border border-white/10'
                }`}>
                {wizardStep > 2 ? <CheckCircle className="w-5 h-5" /> : '02'}
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Government Documents</span>
                <span className="text-[10px] text-blue-300/70 font-semibold leading-relaxed block">
                  Tax registration validation (RERA &amp; PAN card details).
                </span>
              </div>
            </div>

            {/* Step 3 Indicator */}
            <div className={`relative flex items-start gap-4 transition-all duration-300 ${wizardStep === 3 ? 'opacity-100 scale-102' : 'opacity-55'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-xs z-10 ${wizardStep === 3 ? 'bg-[#1A56DB] text-white shadow-[0_0_0_4px_rgba(26,86,219,0.2)] pulse-glow' :
                wizardStep > 3 ? 'bg-emerald-500 text-white' : 'bg-white/8 text-blue-300 border border-white/10'
                }`}>
                03
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Office Address</span>
                <span className="text-[10px] text-blue-300/70 font-semibold leading-relaxed block">
                  Physical registered business address &amp; pincode validation.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="relative z-10 pt-6 border-t border-blue-950/60 flex items-center gap-3">
          <div className="p-1.5 bg-blue-900/50 rounded-lg shadow-xs border border-blue-800/50 text-blue-400 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
            Secured RERA &amp; PAN verification lock
          </span>
        </div>
      </div>

      {/* Right side: Register Multi-step Wizard */}
      <div className="w-full lg:w-2/3 flex flex-col justify-between min-h-screen p-6 sm:p-12 md:p-16">

        {/* Top Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Step {wizardStep} of 3
          </span>
        </div>

        {/* Form Container Card */}
        <div className="my-auto py-8 max-w-[540px] w-full mx-auto bg-white border border-slate-100/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-100/40 space-y-6 anim-scale-in">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Broker Registration</h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Register your partner account to secure client lead ownership
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold anim-slide-right">
              {error}
            </div>
          )}

          {/* STEP 1 FORM */}
          {wizardStep === 1 && (
            <div key={wizardStep} className="space-y-4 anim-slide-right">
              <div className="anim-fade-up">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">
                  Basic Profile Info
                </h3>
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Broker Name <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-semibold shadow-xs transition"
                  required
                />
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Company Name <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="Enter company registered name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-semibold shadow-xs transition"
                  required
                />
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Mobile Number <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    disabled={isMobileVerified}
                    placeholder="Primary Mobile Number"
                    value={mobileNum}
                    onChange={(e) => {
                      setMobileNum(e.target.value.replace(/[^0-9]/g, ''));
                      setIsMobileVerified(false);
                      setMobileOtpSent(false);
                    }}
                    className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold shadow-xs transition ${isMobileVerified ? 'border-emerald-250 bg-emerald-50/30 text-emerald-700' : 'border-slate-200 text-slate-800'
                      }`}
                    required
                  />
                  {mobileNum.length === 10 && !isMobileVerified && !mobileOtpSent && (
                    <button
                      type="button"
                      disabled={loadingMobileOtp}
                      onClick={async () => {
                        setLoadingMobileOtp(true);
                        setError('');
                        try {
                          const res = await requestMobileOtp(mobileNum);
                          if (res.success) {
                            setMobileOtpSent(true);
                            setResendTimer(30);
                            setOtpVerificationError('');
                            setMobileOtp('');
                            setPinKey(prev => prev + 1);
                          } else {
                            setError(res.message || 'Failed to send OTP to mobile.');
                          }
                        } catch (err: any) {
                          setError(err.message || 'An error occurred while sending OTP');
                        } finally {
                          setLoadingMobileOtp(false);
                        }
                      }}
                      className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      {loadingMobileOtp ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                  {isMobileVerified && (
                    <span className="flex items-center gap-1.5 px-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Alternate Mobile</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Alternate Mobile (Optional)"
                  value={altMobileNum}
                  onChange={(e) => setAltMobileNum(e.target.value.replace(/[^0-9]/g, ''))}
                  className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-semibold shadow-xs transition"
                />
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Email ID</label>
                <div className="relative flex gap-2">
                  <input
                    type="email"
                    disabled={isEmailVerified}
                    placeholder="Enter business email address (Optional)"
                    value={emailId}
                    onChange={(e) => {
                      setEmailId(e.target.value);
                      setIsEmailVerified(false);
                      setEmailOtpSent(false);
                    }}
                    className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold shadow-xs transition ${isEmailVerified ? 'border-emerald-250 bg-emerald-50/30 text-emerald-700' : 'border-slate-200 text-slate-800'
                      }`}
                  />
                  {emailId.length > 3 && emailId.includes('@') && !isEmailVerified && !emailOtpSent && (
                    <button
                      type="button"
                      disabled={loadingOtp}
                      onClick={async () => {
                        setLoadingOtp(true);
                        setError('');
                        try {
                          const res = await requestEmailOtp(emailId);
                          if (res.success) {
                            setEmailOtpSent(true);
                            setEmailResendTimer(30);
                            setEmailOtpError('');
                            setEmailOtp('');
                            setEmailPinKey(prev => prev + 1);
                          } else {
                            setError(res.message || 'Failed to send OTP');
                          }
                        } catch (err: any) {
                          setError(err.message || 'An error occurred while sending OTP');
                        } finally {
                          setLoadingOtp(false);
                        }
                      }}
                      className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      {loadingOtp ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                  {isEmailVerified && (
                    <span className="flex items-center gap-1.5 px-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 FORM */}
          {wizardStep === 2 && (
            <div key={wizardStep} className="space-y-4 anim-slide-right">
              <div className="anim-fade-up">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">
                  Government Verification
                </h3>
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">PAN Number</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={panNumber}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setPANNumber(val);
                    if (!val) {
                      setPanError('');
                    } else {
                      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                      if (panRegex.test(val)) {
                        setPanError('');
                      } else if (panError) {
                        setPanError('Enter a valid PAN number (e.g. ABCDE1234F).');
                      }
                    }
                  }}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 text-slate-800 font-semibold uppercase shadow-xs transition ${panError
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                />
                {panError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{panError}</p>
                )}
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">GST Number</label>
                <input
                  type="text"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  value={gstNumber}
                  maxLength={15}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setGSTNumber(val);
                    if (!val) {
                      setGstError('');
                    } else {
                      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                      if (gstRegex.test(val)) {
                        setGstError('');
                      } else if (gstError) {
                        setGstError('Enter a valid GST number.');
                      }
                    }
                  }}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 text-slate-800 font-semibold uppercase shadow-xs transition ${gstError
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                />
                {gstError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{gstError}</p>
                )}
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">RERA Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. PR-1234-ABCD"
                  value={reraNumber}
                  maxLength={50}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-\/]/g, '');
                    setRERANumber(val);
                    if (!val) {
                      setReraError('');
                    } else {
                      const reraRegex = /^[A-Z0-9\-\/]{5,50}$/;
                      if (reraRegex.test(val)) {
                        setReraError('');
                      } else if (reraError) {
                        setReraError('Enter a valid RERA registration number');
                      }
                    }
                  }}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 text-slate-800 font-semibold uppercase shadow-xs transition ${reraError
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                />
                {reraError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{reraError}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 FORM */}
          {wizardStep === 3 && (
            <div key={wizardStep} className="space-y-4 anim-slide-right">
              <div className="anim-fade-up">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">
                  Office Address Details
                </h3>
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Address Line 1 <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="Flat, Building name, Street address"
                  value={addressLine1}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddressLine1(val);
                    if (addressLine1Error && val.trim()) {
                      setAddressLine1Error('');
                    }
                  }}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 text-slate-800 font-semibold shadow-xs transition ${addressLine1Error
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  required
                />
                {addressLine1Error && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{addressLine1Error}</p>
                )}
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Sector, Landmark (Optional)"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-semibold shadow-xs transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 anim-fade-up stagger-3 relative z-20">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">State <span className="text-red-500 ml-0.5">*</span></label>
                  <SearchableSelect
                    value={state}
                    onChange={(val) => {
                      handleStateChange(val);
                      if (stateError && val) setStateError('');
                    }}
                    options={statesList.map(s => s.state_name)}
                    placeholder={loadingStates ? "Loading..." : "Select State"}
                    icon={MapPin}
                    error={!!stateError}
                  />
                  {stateError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{stateError}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">City <span className="text-red-500 ml-0.5">*</span></label>
                  <SearchableSelect
                    value={city}
                    onChange={(val) => {
                      setCity(val);
                      if (cityError && val) setCityError('');
                    }}
                    options={citiesList.map(c => c.city_name)}
                    placeholder={loadingCities ? "Loading..." : "Select City"}
                    icon={MapPin}
                    error={!!cityError}
                  />
                  {cityError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{cityError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 anim-fade-up stagger-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Pincode <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  placeholder="Enter 6-digit Pincode"
                  value={pincode}
                  maxLength={6}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPincode(val);
                    if (!val) {
                      setPincodeError('Pincode is required');
                    } else if (val.length < 6) {
                      setPincodeError('Enter Valid Pincode');
                    } else {
                      setPincodeError('');
                    }
                  }}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-xs focus:outline-none focus:ring-1 text-slate-800 font-semibold shadow-xs transition ${pincodeError
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  required
                />
                {pincodeError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1 anim-fade-in">{pincodeError}</p>
                )}
              </div>
            </div>
          )}

          {/* Stepper Navigation bar */}
          <div className="flex gap-4 pt-6 border-t border-slate-100">
            {wizardStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-500 font-bold rounded-xl text-xs transition cursor-pointer press"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-500 font-bold rounded-xl text-xs transition cursor-pointer text-center block press"
              >
                Cancel
              </Link>
            )}

            {wizardStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/10 cursor-pointer press"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegisterSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/10 cursor-pointer text-center block press"
              >
                {loading ? 'Submitting...' : 'Register Broker'}
              </button>
            )}
          </div>
        </div>

        {/* Footer info links */}
        <div className="text-center text-[10px] text-slate-400 font-semibold tracking-wider uppercase shrink-0 pt-4 border-t border-slate-100">
          <span>Protected Lead Registry &middot; BrokerConnect Systems v2.0</span>
        </div>
      </div>
      {/* Mobile OTP Verification Modal */}
      {mobileOtpSent && !isMobileVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 anim-fade-in">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-slate-100 space-y-6 text-center anim-scale-in">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-sans tracking-tight">Verify Mobile Number</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                We've sent a 6-digit code to <strong className="text-slate-800">{mobileNum}</strong>. Please enter it below to verify your device.
              </p>
            </div>

            {/* Custom Smooth OTP input */}
            <div className="relative py-4 flex justify-center overflow-hidden min-h-[80px] w-full bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex-col items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3.5">Verification Security PIN</span>
              <div className="relative py-2 flex justify-center overflow-hidden min-h-[60px] w-full">
                <style>{`
                  @keyframes spin-dot {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>

                {/* Hidden input to capture keyboard events */}
                <input
                  ref={mobileInputRef}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={mobileOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 6) {
                      handlePinChange(val);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ zIndex: 10 }}
                />

                {/* Verified Badge Container */}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-550 ease-out ${isMobileVerifiedAnim ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-6'
                    }`}
                  style={{ zIndex: 5 }}
                >
                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5.5 py-3 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.35)] border border-emerald-400/30 animate-pulse">
                    <div className="w-6.5 h-6.5 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Shield className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest block leading-none pr-1">Verified</span>
                  </div>
                </div>

                {/* OTP Circles Container */}
                <div
                  className="flex gap-2.5 justify-center relative select-none w-full animate-in fade-in"
                  onClick={() => mobileInputRef.current?.focus()}
                  style={{ zIndex: 1 }}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = mobileOtp[index] || '';
                    const isFocused = mobileOtp.length === index;
                    const isComplete = mobileOtp.length === 6;

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
                          isMobileVerifiedAnim
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
                        {isComplete && !isMobileVerifiedAnim && (
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
              {otpVerificationError && (
                <p className="text-[10px] text-red-600 font-bold mt-2">{otpVerificationError}</p>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={verifyingMobileOtp}
                onClick={() => handleVerifyMobileOtp(mobileOtp)}
                className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648C0] text-white font-bold rounded-xl text-xs transition shadow-[0_4px_14px_rgba(26,86,219,0.25)] cursor-pointer press disabled:bg-blue-400"
              >
                {verifyingMobileOtp ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={resendTimer > 0 || loadingMobileOtp}
                  onClick={async () => {
                    setOtpVerificationError('');
                    setMobileOtp('');
                    setLoadingMobileOtp(true);
                    try {
                      const res = await requestMobileOtp(mobileNum);
                      if (res.success) {
                        setResendTimer(30);
                        setPinKey(prev => prev + 1);
                      } else {
                        setOtpVerificationError(res.message || 'Failed to resend OTP.');
                      }
                    } catch (err: any) {
                      setOtpVerificationError(err.message || 'An error occurred while resending OTP');
                    } finally {
                      setLoadingMobileOtp(false);
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${(resendTimer > 0 || loadingMobileOtp)
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer press'
                    }`}
                >
                  {loadingMobileOtp ? 'Resending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => setMobileOtpSent(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition cursor-pointer press"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-450 font-semibold leading-normal pt-1.5 border-t border-slate-50">
              Enter the 6-digit verification code.
            </div>
          </div>
        </div>
      )}
      {/* Email OTP Verification Modal */}
      {emailOtpSent && !isEmailVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 anim-fade-in">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-slate-100 space-y-6 text-center anim-scale-in">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
              <Mail className="w-5 h-5 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-sans tracking-tight">Verify Email Address</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                We've sent a 6-digit code to <strong className="text-slate-800">{emailId}</strong>. Please enter it below to verify your email.
              </p>
            </div>

            {/* Custom Smooth OTP input */}
            <div className="relative py-4 flex justify-center overflow-hidden min-h-[80px] w-full bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex-col items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3.5">Verification Security PIN</span>
              <div className="relative py-2 flex justify-center overflow-hidden min-h-[60px] w-full">
                <style>{`
                  @keyframes spin-dot {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>

                {/* Hidden input to capture keyboard events */}
                <input
                  ref={emailInputRef}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 6) {
                      handleEmailPinChange(val);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ zIndex: 10 }}
                />

                {/* Verified Badge Container */}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-550 ease-out ${isEmailVerifiedAnim ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-6'
                    }`}
                  style={{ zIndex: 5 }}
                >
                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5.5 py-3 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.35)] border border-emerald-400/30 animate-pulse">
                    <div className="w-6.5 h-6.5 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Shield className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest block leading-none pr-1">Verified</span>
                  </div>
                </div>

                {/* OTP Circles Container */}
                <div
                  className="flex gap-2.5 justify-center relative select-none w-full animate-in fade-in"
                  onClick={() => emailInputRef.current?.focus()}
                  style={{ zIndex: 1 }}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = emailOtp[index] || '';
                    const isFocused = emailOtp.length === index;
                    const isComplete = emailOtp.length === 6;

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
                          isEmailVerifiedAnim
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
                        {isComplete && !isEmailVerifiedAnim && (
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
              {emailOtpError && (
                <p className="text-[10px] text-red-600 font-bold mt-2">{emailOtpError}</p>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={verifyingEmailOtp}
                onClick={() => handleVerifyEmailOtp(emailOtp)}
                className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648C0] text-white font-bold rounded-xl text-xs transition shadow-[0_4px_14px_rgba(26,86,219,0.25)] cursor-pointer press disabled:bg-blue-400"
              >
                {verifyingEmailOtp ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={emailResendTimer > 0}
                  onClick={async () => {
                    setEmailResendTimer(30);
                    setEmailPinKey(prev => prev + 1);
                    setEmailOtp('');
                    setEmailOtpError('');
                    try {
                      const res = await requestEmailOtp(emailId);
                      if (!res.success) {
                        setEmailOtpError(res.message || 'Failed to resend OTP');
                      }
                    } catch (err: any) {
                      setEmailOtpError(err.message || 'An error occurred while resending OTP');
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${emailResendTimer > 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer press'
                    }`}
                >
                  {emailResendTimer > 0 ? `Resend in ${emailResendTimer}s` : 'Resend OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => setEmailOtpSent(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition cursor-pointer press"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-450 font-semibold leading-normal pt-1.5 border-t border-slate-50">
              Enter the 6-digit verification code.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
