import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useBrokerConnect } from '../context/BrokerConnectContext';
import { Mail, ShieldCheck, ArrowRight, UserPlus, CheckCircle, Smartphone, ChevronLeft, Users } from 'lucide-react';
import Cookies from 'js-cookie';
import { requestLoginOtp, verifyLoginOtp, fetchAndStoreUserProfile } from './api/login';
import { LockIllustration } from '../components/ui/LockIllustration';
import { BrandLogo } from '../components/BrandLogo';

export const Login: React.FC = () => {
  const { setCurrentRole } = useBrokerConnect();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if already logged in with active session
  useEffect(() => {
    const token = sessionStorage.getItem('token') || Cookies.get('token') || localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token');
    const role = Cookies.get('userRole') || 'broker';

    if (token && (refreshToken || !token.includes('mock'))) {
      if (role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (role === 'receptionist') navigate('/receptionist/dashboard', { replace: true });
      else if (role === 'sales') navigate('/sales/dashboard', { replace: true });
      else if (role === 'calling') navigate('/calling/dashboard', { replace: true });
      else if (role === 'channel_partner') navigate('/channel-partner/dashboard', { replace: true });
      else navigate('/broker/dashboard', { replace: true });
    }
  }, [navigate]);

  // Route state notifications (e.g. registration success)
  const redirectSuccess = (location.state?.success as string) || '';
  const redirectError = (location.state?.error as string) || '';

  // Form States
  const [emailOrPhone, setEmailOrPhone] = useState(() => Cookies.get('remember_me_email_or_phone') || '');
  const [rememberMe, setRememberMe] = useState(() => Cookies.get('remember_me_checked') === 'true');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const savedEmailOrPhone = Cookies.get('remember_me_email_or_phone');
  const [otpStep, setOtpStep] = useState(false);
  const [pin, setPin] = useState('');
  const [pinKey, setPinKey] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const [loginError, setLoginError] = useState(redirectError);
  const [loginSuccess, setLoginSuccess] = useState(redirectSuccess);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-dismiss loginSuccess after 5 seconds
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess]);

  // Check URL query parameters for redirect errors
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err === 'session_expired') {
      setLoginError('Your session has expired. Please log in again.');
      navigate('/login', { replace: true, state: {} });
    } else if (err === 'unauthorized') {
      setLoginError('Authorization token is missing. Please log in to continue.');
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.search, navigate]);

  // Check cooldown on mount
  useEffect(() => {
    const expiresAtStr = localStorage.getItem('resend_otp_cooldown_expires_at');
    if (expiresAtStr) {
      const expiresAt = parseInt(expiresAtStr, 10);
      const now = Date.now();
      if (expiresAt > now) {
        setResendCooldown(Math.ceil((expiresAt - now) / 1000));
      }
    }
  }, []);

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      const expiresAtStr = localStorage.getItem('resend_otp_cooldown_expires_at');
      if (expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr, 10);
        const now = Date.now();
        if (expiresAt > now) {
          setResendCooldown(Math.ceil((expiresAt - now) / 1000));
        } else {
          setResendCooldown(0);
          localStorage.removeItem('resend_otp_cooldown_expires_at');
        }
      } else {
        setResendCooldown(0);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const startResendCooldown = () => {
    const expiresAt = Date.now() + 30000;
    localStorage.setItem('resend_otp_cooldown_expires_at', String(expiresAt));
    setResendCooldown(30);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otpStep && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [otpStep, pinKey]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = emailOrPhone.trim();
    if (!identifier) {
      setLoginError('Please enter your Email or Phone');
      return;
    }
    setLoginError('');
    setLoading(true);

    try {
      const res = await requestLoginOtp(identifier);
      if (res.success) {
        setOtpStep(true);
        setPin('');
        setLoginSuccess(res.message || 'OTP sent successfully');
        startResendCooldown();

        if (rememberMe) {
          Cookies.set('remember_me_email_or_phone', identifier, { expires: 30 });
          Cookies.set('remember_me_checked', 'true', { expires: 30 });
        } else {
          Cookies.remove('remember_me_email_or_phone');
          Cookies.remove('remember_me_checked');
        }
      } else {
        setLoginError(res.message || 'Failed to send OTP. Please check your credentials.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || err.message || 'An error occurred while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoginError('');
    setLoginSuccess('');
    setLoading(true);

    try {
      const res = await requestLoginOtp(emailOrPhone.trim());
      if (res.success) {
        setLoginSuccess(res.message || 'OTP resent successfully');
        startResendCooldown();
      } else {
        setLoginError(res.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || err.message || 'An error occurred while resending OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    const finalCode = codeOverride || pin;
    if (!finalCode || finalCode.length < 6) {
      setLoginError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    setLoginError('');

    try {
      const res = await verifyLoginOtp(emailOrPhone.trim(), Number(finalCode));
      if (res.success) {
        setIsVerified(true);
        await new Promise((resolve) => setTimeout(resolve, 800));

        const cookieToken = Cookies.get('token') || Cookies.get('userToken');
        const userToken = res.token || cookieToken || '';
        Cookies.set('token', userToken, { expires: 7 });
        Cookies.set('is_profile_completed', '1', { expires: 7 });
        sessionStorage.setItem('token', userToken);
        localStorage.setItem('token', userToken);

        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token);
        }

        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          if (res.user.permissions) {
            localStorage.setItem('user_permissions', JSON.stringify(res.user.permissions));
            Cookies.set('user_permissions', JSON.stringify(res.user.permissions), { expires: 7 });
          }
        }

        try {
          await fetchAndStoreUserProfile();
        } catch (profileErr) {
          console.warn('Profile fetch after login failed:', profileErr);
        }

        const backendRole = res.user?.role?.toLowerCase() || 'broker';

        if (res.user?.full_name) {
          Cookies.set('full_name', res.user.full_name, { expires: 7 });
        } else {
          let fallbackName = 'Broker Account';
          if (backendRole.includes('admin')) fallbackName = 'Admin Account';
          else if (backendRole.includes('receptionist') || backendRole.includes('receiptionist') || backendRole.includes('reception')) fallbackName = 'Receptionist Staff';
          else if (backendRole.includes('sales')) fallbackName = 'Sales Executive';
          else if (backendRole.includes('calling')) fallbackName = 'Calling Agent';
          else if (backendRole.includes('channel') || backendRole.includes('partner') || backendRole.includes('cp')) fallbackName = 'Channel Partner';
          Cookies.set('full_name', fallbackName, { expires: 7 });
        }

        let assignedRole: 'broker' | 'receptionist' | 'sales' | 'admin' | 'calling' | 'channel_partner' = 'broker';
        if (backendRole.includes('admin')) assignedRole = 'admin';
        else if (
          backendRole.includes('receptionist') ||
          backendRole.includes('receiptionist') ||
          backendRole.includes('reception')
        ) assignedRole = 'receptionist';
        else if (backendRole.includes('sales')) assignedRole = 'sales';
        else if (backendRole.includes('calling')) assignedRole = 'calling';
        else if (
          backendRole.includes('channel') ||
          backendRole.includes('partner') ||
          backendRole.includes('cp')
        ) assignedRole = 'channel_partner';
        else if (backendRole.includes('broker')) assignedRole = 'broker';

        Cookies.set('userRole', assignedRole, { expires: 7 });
        setCurrentRole(assignedRole);

        if (assignedRole === 'admin') navigate('/admin/dashboard', { replace: true });
        else if (assignedRole === 'receptionist') navigate('/receptionist/dashboard', { replace: true });
        else if (assignedRole === 'sales') navigate('/sales/dashboard', { replace: true });
        else if (assignedRole === 'calling') navigate('/calling/dashboard', { replace: true });
        else if (assignedRole === 'channel_partner') navigate('/channel-partner/dashboard', { replace: true });
        else navigate('/broker/dashboard', { replace: true });
      } else {
        setLoginError(res.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setPin(val);
      if (val.length === 6) {
        handleLoginSubmit(undefined, val);
      } else {
        setLoginError('');
      }
    }
  };

  const handleCircleClick = () => {
    inputRef.current?.focus();
  };

  const handleBackToEmail = () => {
    setOtpStep(false);
    setPin('');
    setPinKey((prev) => prev + 1);
    setLoginError('');
    setIsVerified(false);
  };

  const maskContact = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('@')) {
      const [local, domain] = trimmed.split('@');
      const maskedLocal = local.length <= 2
        ? local[0] + '•'.repeat(local.length - 1)
        : local[0] + '•'.repeat(Math.min(Math.max(local.length - 2, 2), 5)) + local[local.length - 1];
      const dotIdx = domain.lastIndexOf('.');
      const domainName = domain.slice(0, dotIdx);
      const tld = domain.slice(dotIdx);
      const maskedDomain = domainName.length <= 2
        ? domainName[0] + '•'.repeat(domainName.length - 1)
        : domainName[0] + '•'.repeat(Math.min(Math.max(domainName.length - 2, 3), 5)) + domainName[domainName.length - 1];
      return `${maskedLocal}@${maskedDomain}${tld}`;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 6) {
      return digits.slice(0, 2) + '•'.repeat(Math.min(digits.length - 5, 5)) + digits.slice(-3);
    }
    return trimmed[0] + '•'.repeat(Math.min(Math.max(trimmed.length - 2, 2), 5)) + trimmed[trimmed.length - 1];
  };

  return (
    <div className="flex h-screen min-h-screen lg:h-screen lg:overflow-hidden flex-col lg:flex-row bg-[#F8FAFC] text-slate-800 text-left font-sans">
      {/* Mobile Branding Header */}
      <div className="flex lg:hidden w-full bg-[#0B1528] py-4 px-6 items-center justify-center border-b border-white/8 shadow-md relative overflow-hidden">
        <div className="absolute w-24 h-6 bg-[#1062AC]/30 rounded-full blur-md"></div>
        <BrandLogo subtitle="Portal Access" size="md" />
      </div>

      {/* Left side: Premium Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1528] text-white p-10 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-white/8">
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[#1062AC]/18 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 z-0 anim-orb"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#EC3237]/12 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 z-0 anim-orb-slow"></div>

        <div className="relative z-20 self-start hover:opacity-90 transition-opacity anim-fade-in">
          <BrandLogo subtitle="Enterprise Lead Protection & CRM" size="lg" />
        </div>

        {/* Main Content Group */}
        <div className="relative z-10 my-auto py-2 xl:py-6 flex flex-col justify-center space-y-4 xl:space-y-6">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-white/8 text-sky-300 border border-white/10 backdrop-blur-sm text-[9px] font-extrabold rounded-full uppercase tracking-widest anim-fade-up">
              Enterprise Lead Protection
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl xl:text-3xl font-black tracking-tight leading-[1.2] bg-gradient-to-br from-white via-white to-blue-200 bg-clip-text text-transparent anim-fade-up">
                Terado CRM &amp; Lead Management
              </h1>
              <div className="w-16 h-[2.5px] bg-gradient-to-r from-[#1062AC] via-[#38A3F8] to-[#EC3237] rounded-full"></div>
            </div>
            <p className="text-[11px] text-blue-200 leading-relaxed max-w-sm anim-fade-up">
              Enterprise lead management, Meta Lead Ads ingestion, transparent round-robin sales distribution, and customer OTP protection.
            </p>
          </div>

          {/* Features list */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5 text-xs font-semibold text-blue-200">
              <div className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#38A3F8] shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Automated Lead Ownership Lock</span>
                <span className="text-[9px] text-blue-300/70 font-semibold block">Protected audit trails &amp; fraud prevention</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 text-xs font-semibold text-blue-200">
              <div className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#38A3F8] shrink-0 shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Intelligent Round-Robin Allocation</span>
                <span className="text-[9px] text-blue-300/70 font-semibold block">Automatic assignment for Meta Lead Ads</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center max-w-[160px] w-full mx-auto anim-fade-up">
            <LockIllustration />
          </div>
        </div>

        <div className="relative z-10 self-start">
          <p className="text-[9px] text-blue-300/60 font-bold tracking-wide">
            © 2026 Terado CRM Systems. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side: Forms Canvas */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-8 xl:p-16 lg:bg-[#F8FAFC] bg-[#0A1628] relative overflow-hidden min-h-[calc(100vh-68px)] lg:h-screen lg:overflow-y-auto">
        <div className="w-full max-w-[460px] lg:bg-white bg-white/5 lg:border-slate-100 border-white/10 lg:shadow-[0_4px_32px_rgba(15,23,42,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.37)] rounded-3xl lg:border border p-6 sm:p-8 lg:p-8 xl:p-10 space-y-5 backdrop-blur-md anim-scale-in relative z-10">

          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight lg:text-[#0F172A] text-white font-['Plus_Jakarta_Sans']">
                Welcome Back
              </h2>
              <p className="text-[10px] lg:text-slate-400 text-blue-300/80 font-bold uppercase tracking-wider block">
                {otpStep ? 'Verify your identity' : 'Access Dashboard & Leads Management'}
              </p>
            </div>

            {loginSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{loginSuccess}</span>
              </div>
            )}

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                {loginError}
              </div>
            )}

            {/* STEP 1: ENTER EMAIL OR PHONE */}
            {!otpStep ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold lg:text-slate-500 text-white/50 uppercase block tracking-wider">
                    Email or Phone <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none lg:text-slate-400 text-white/40">
                      <Mail className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Enter registered email or phone"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="block w-full pl-10 pr-4 py-3 lg:bg-white bg-white/5 lg:border-slate-200 border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 lg:text-slate-800 text-white placeholder-slate-400 font-semibold"
                      required
                      autoComplete="off"
                    />

                    {/* Autocomplete suggestion dropdown */}
                    {showSuggestions && savedEmailOrPhone && savedEmailOrPhone.toLowerCase().includes(emailOrPhone.toLowerCase()) && (
                      <div className="absolute z-20 left-0 right-0 mt-1.5 lg:bg-white bg-slate-900 lg:border-slate-200 border-white/10 rounded-xl shadow-lg border overflow-hidden py-1 max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onMouseDown={() => {
                            setEmailOrPhone(savedEmailOrPhone);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold lg:text-slate-700 text-slate-200 lg:hover:bg-slate-50 hover:bg-white/5 transition flex items-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5 lg:text-slate-400 text-white/40" />
                          <span>{savedEmailOrPhone}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold lg:text-slate-600 text-white/70">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Remember Me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#1062AC] hover:bg-[#0D4E8C] disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Send OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: VERIFY OTP CODE */
              <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-5">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl lg:bg-blue-50/70 bg-white/5 border lg:border-blue-100 border-white/10">
                  <div className="w-7 h-7 rounded-lg lg:bg-blue-100 bg-white/10 flex items-center justify-center shrink-0">
                    {emailOrPhone.includes('@') ? (
                      <Mail className="w-3.5 h-3.5 lg:text-blue-500 text-sky-400" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 lg:text-blue-500 text-sky-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold lg:text-slate-400 text-white/40 uppercase tracking-wider">OTP sent to</p>
                    <p className="text-sm font-black lg:text-slate-800 text-white tracking-widest mt-0.5 truncate">
                      {maskContact(emailOrPhone)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="flex items-center gap-1 text-[10px] font-bold lg:text-blue-500 text-sky-400 hover:underline cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold lg:text-slate-500 text-white/50 uppercase block tracking-wider">
                      OTP Security PIN <span className="text-red-500 ml-0.5">*</span>
                    </label>
                  </div>

                  <div className="relative py-4 flex justify-center overflow-hidden min-h-[80px]">
                    <input
                      ref={inputRef}
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={handleInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ zIndex: 10 }}
                    />

                    {/* Verified Badge */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${
                        isVerified ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                      }`}
                      style={{ zIndex: 5 }}
                    >
                      <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-full shadow-lg">
                        <ShieldCheck className="w-4 h-4 stroke-[3]" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Verified</span>
                      </div>
                    </div>

                    {/* OTP Circles */}
                    <div
                      className="flex gap-2.5 justify-center relative select-none w-full"
                      onClick={handleCircleClick}
                      style={{ zIndex: 1 }}
                    >
                      {Array.from({ length: 6 }).map((_, index) => {
                        const char = pin[index] || '';
                        const isFocused = pin.length === index;
                        const isComplete = pin.length === 6;
                        return (
                          <div
                            key={index}
                            className={`w-11 h-11 rounded-full border-2 lg:bg-white bg-white/5 flex items-center justify-center text-base font-black relative transition-all ${
                              char
                                ? 'border-orange-500'
                                : isFocused
                                ? 'border-blue-500 scale-105'
                                : 'lg:border-slate-200 border-white/10 text-slate-800'
                            }`}
                          >
                            {char ? <span>{char}</span> : <span className="text-slate-300">•</span>}

                            {isComplete && !isVerified && (
                              <div
                                className="absolute inset-0 rounded-full animate-spin"
                                style={{ animationDuration: '1.5s' }}
                              >
                                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-orange-500 rounded-full shadow-sm" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold px-1">
                  <span className="lg:text-slate-400 text-white/50">Didn't receive the OTP?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="lg:text-blue-600 text-sky-400 hover:underline font-bold disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#1062AC] hover:bg-[#0D4E8C] disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Verify &amp; Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Looking for Broker Portal?</span>
              <Link to="/register" className="flex items-center gap-1.5 text-blue-600 font-bold hover:underline">
                <UserPlus className="w-4 h-4" />
                <span>Partner Registration</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
