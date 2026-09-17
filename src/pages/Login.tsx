import React, { useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useBrokerConnect } from '../context/BrokerConnectContext';
import { Mail, Building2, ShieldCheck, ArrowRight, UserPlus, CheckCircle, Smartphone, KeyRound, ChevronLeft, Users, BarChart3 } from 'lucide-react';
import Cookies from 'js-cookie';
import { requestLoginOtp, verifyLoginOtp, fetchAndStoreUserProfile } from './api/login';
import { LockIllustration } from '../components/ui/LockIllustration';
import { BrandLogo } from '../components/BrandLogo';

export const Login: React.FC = () => {
  const { setCurrentRole, setActiveScreen } = useBrokerConnect();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if already logged in
  React.useEffect(() => {
    const token = sessionStorage.getItem('token') || Cookies.get('token') || localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token');
    const role = Cookies.get('userRole') || 'broker';
    
    if (token && refreshToken) {
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'receptionist') navigate('/receptionist/dashboard');
      else if (role === 'sales') navigate('/sales/dashboard');
      else if (role === 'calling') navigate('/calling/dashboard');
      else if (role === 'channel_partner') navigate('/channel-partner/dashboard');
      else navigate('/broker/dashboard');
    }
  }, [navigate]);

  // Route state notifications (like registration success redirects)
  const redirectSuccess = location.state?.success as string || '';
  const redirectError = location.state?.error as string || '';

  // Form States
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const savedEmailOrPhone = Cookies.get('remember_me_email_or_phone');
  const [otpStep, setOtpStep] = useState(false); // Toggle Step 1 vs Step 2
  const [pin, setPin] = useState('');
  const [pinKey, setPinKey] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const [loginError, setLoginError] = useState(redirectError);
  const [loginSuccess, setLoginSuccess] = useState(redirectSuccess);
  const [loading, setLoading] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-dismiss loginSuccess after 5 seconds
  React.useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess]);

  // Check URL query parameters for redirect errors
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err === 'session_expired') {
      setLoginError('Your session has expired. Please log in again.');
      // Clean up URL query parameters
      navigate('/login', { replace: true, state: {} });
    } else if (err === 'unauthorized') {
      setLoginError('Authorization token is missing. Please log in to continue.');
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.search, navigate]);

  // Check localStorage and Cookies on mount
  React.useEffect(() => {
    const expiresAtStr = localStorage.getItem('resend_otp_cooldown_expires_at');
    if (expiresAtStr) {
      const expiresAt = parseInt(expiresAtStr, 10);
      const now = Date.now();
      if (expiresAt > now) {
        setResendCooldown(Math.ceil((expiresAt - now) / 1000));
      }
    }

    // Load Remember Me status from cookies (do not prefill emailOrPhone to prevent flashing)
    const savedRememberMe = Cookies.get('remember_me_checked') === 'true';
    setRememberMe(savedRememberMe);
  }, []);

  // Cooldown countdown effect
  React.useEffect(() => {
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

  React.useEffect(() => {
    if (otpStep && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [otpStep, pinKey]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone) {
      setLoginError('Please enter your Email or Phone');
      return;
    }
    setLoginError('');
    setLoading(true);



    try {
      const res = await requestLoginOtp(emailOrPhone);
      if (res.success) {
        setOtpStep(true);
        setLoginSuccess(res.message || 'OTP sent successfully');
        startResendCooldown();

        // Handle Remember Me credential persistence using Cookies (expires in 30 days)
        if (rememberMe) {
          Cookies.set('remember_me_email_or_phone', emailOrPhone, { expires: 30 });
          Cookies.set('remember_me_checked', 'true', { expires: 30 });
        } else {
          Cookies.remove('remember_me_email_or_phone');
          Cookies.remove('remember_me_checked');
        }
        
        // Clean up legacy localStorage entries if they exist
        localStorage.removeItem('remember_me_email_or_phone');
        localStorage.removeItem('remember_me_checked');
      } else {
        setLoginError(res.message || 'Failed to send OTP. Please check your credentials.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred while sending OTP.');
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
      const res = await requestLoginOtp(emailOrPhone);
      if (res.success) {
        setLoginSuccess(res.message || 'OTP resent successfully');
        startResendCooldown();
      } else {
        setLoginError(res.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred while resending OTP.');
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
      const res = await verifyLoginOtp(emailOrPhone, Number(finalCode));
      if (res.success) {
        setIsVerified(true);
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Read the token cookie in case the backend set it via Set-Cookie
        const cookieToken = Cookies.get('token') || Cookies.get('userToken');
        // Use res.token if extracted from headers, fallback to cookieToken
        const userToken = res.token || cookieToken || '';
        Cookies.set('token', userToken, { expires: 7 });
        Cookies.set('is_profile_completed', '1', { expires: 7 });
        sessionStorage.setItem('token', userToken);
        
        // Store refresh token in localStorage for 60 days
        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token);
        }

        // Store user details & role permissions in localStorage
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          if (res.user.permissions) {
            localStorage.setItem('user_permissions', JSON.stringify(res.user.permissions));
            Cookies.set('user_permissions', JSON.stringify(res.user.permissions), { expires: 7 });
          }
        }

        // Fetch fresh permissions from profiles API (/users/profile)
        try {
          await fetchAndStoreUserProfile();
        } catch (profileErr) {
          console.warn('Profile fetch after login failed:', profileErr);
        }

        // Set the user role context and cookie based on the backend role response
        // Default roles map: "BROKER" -> "broker", "RECEPTIONIST" -> "receptionist", "SALES" -> "sales", "ADMIN" -> "admin", "CALLING" -> "calling"
        const backendRole = res.user?.role?.toLowerCase() || 'broker';

        // Store user's full name in a cookie if present
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
          backendRole.includes('receptionist') ||   // standard spelling
          backendRole.includes('receiptionist') ||  // backend typo: RECEIPTIONIST
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

        // Redirect to their respective dashboards
        if (assignedRole === 'admin') navigate('/admin/dashboard');
        else if (assignedRole === 'receptionist') navigate('/receptionist/dashboard');
        else if (assignedRole === 'sales') navigate('/sales/dashboard');
        else if (assignedRole === 'calling') navigate('/calling/dashboard');
        else if (assignedRole === 'channel_partner') navigate('/channel-partner/dashboard');
        else navigate('/broker/dashboard');
      } else {
        setLoginError(res.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred during verification.');
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
    setPinKey(prev => prev + 1);
    setLoginError('');
    setIsVerified(false);
  };

  /** Returns a masked version of an email or phone for privacy display */
  const maskContact = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    // Email masking: j••@example.com → j••@e•••••e.com
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
    // Phone masking: keep first 2 + last 3 digits, mask the middle
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 6) {
      const visible = digits.slice(0, 2) + '•'.repeat(Math.min(digits.length - 5, 5)) + digits.slice(-3);
      return visible;
    }
    // Short value — mask middle
    return trimmed[0] + '•'.repeat(Math.min(Math.max(trimmed.length - 2, 2), 5)) + trimmed[trimmed.length - 1];
  };


  return (
    <div className="flex h-screen min-h-screen lg:h-screen lg:overflow-hidden flex-col lg:flex-row bg-[#F8FAFC] text-slate-800 text-left font-sans">
      {/* Mobile Branding Header */}
      <div className="flex lg:hidden w-full bg-[#0B1528] py-4 px-6 items-center justify-center border-b border-white/8 shadow-md relative overflow-hidden">
        {/* Glowing aura behind logo in mobile header */}
        <div className="absolute w-24 h-6 bg-[#1062AC]/30 rounded-full blur-md"></div>
        <BrandLogo subtitle="Portal Access" size="md" />
      </div>

      {/* Left side: Premium Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1528] text-white p-10 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-white/8">
        {/* Background noise texture + grid overlay patterns */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzlIj48cGF0aCBkPSJNIDYwIDAgTCAwIDAgMCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] z-0"></div>
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[#1062AC]/18 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 z-0 anim-orb"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#EC3237]/12 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 z-0 anim-orb-slow"></div>
        <div className="absolute top-1/2 left-1/4 w-[220px] h-[220px] bg-[#1062AC]/10 rounded-full blur-2xl z-0 anim-orb" style={{ animationDelay: '4s' }}></div>

        <div className="relative z-20 self-start hover:opacity-90 transition-opacity anim-fade-in">
          <BrandLogo subtitle="Enterprise Lead Protection & CRM" size="lg" />
        </div>

        {/* Main Content Group (Centered & Spaced Nicely) */}
        <div className="relative z-10 my-auto py-2 xl:py-6 flex flex-col justify-center space-y-4 xl:space-y-6">
          {/* Branding text directly on background */}
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-white/8 text-sky-300 border border-white/10 backdrop-blur-sm text-[9px] font-extrabold rounded-full uppercase tracking-widest anim-fade-up stagger-1">
              Channel Partner Protection
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl xl:text-3xl font-black tracking-tight leading-[1.2] bg-gradient-to-br from-white via-white to-blue-200 bg-clip-text text-transparent anim-fade-up stagger-2">
                Lead Protection &amp; Sales Management
              </h1>
              <div className="w-16 h-[2.5px] bg-gradient-to-r from-[#1062AC] via-[#38A3F8] to-[#EC3237] anim-fade-up stagger-3 rounded-full"></div>
            </div>
            <p className="text-[11px] text-blue-250 leading-relaxed max-w-sm anim-fade-up stagger-4">
              Eliminating channel partner disputes through instant OTP-based customer ownership locks and transparent audit trails.
            </p>
          </div>

          {/* Features list */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5 text-xs font-semibold text-blue-250 anim-fade-up stagger-5">
              <div className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#38A3F8] shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Secure OTP-based lead locking</span>
                <span className="text-[9px] text-blue-300/70 font-semibold block">Locks active for 60 seconds</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3.5 text-xs font-semibold text-blue-250 anim-fade-up stagger-6">
              <div className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#38A3F8] shrink-0 shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Automated round-robin allocation</span>
                <span className="text-[9px] text-blue-300/70 font-semibold block">Fair &amp; intelligent lead distribution</span>
              </div>
            </div>
          </div>

          {/* Glowing animated Lock Illustration */}
          <div className="flex justify-center items-center max-w-[140px] sm:max-w-[160px] md:max-w-[180px] lg:max-w-[160px] xl:max-w-[190px] 2xl:max-w-[220px] w-full mx-auto anim-fade-up stagger-7">
            <LockIllustration />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 self-start">
          <p className="text-[9px] text-blue-300/60 font-bold tracking-wide">
            © 2026 Terado CRM Systems. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side: Forms Canvas */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-8 xl:p-16 lg:bg-[#F8FAFC] bg-[#0A1628] relative overflow-hidden min-h-[calc(100vh-68px)] lg:h-screen lg:overflow-y-auto">
        {/* Soft decorative background glows for desktop (light theme) */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none hidden lg:block"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-100/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none hidden lg:block"></div>

        {/* Rich glowing background orbs for mobile (dark theme) */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none lg:hidden anim-orb"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-500/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none lg:hidden anim-orb-slow"></div>
        <div className="absolute top-1/2 left-1/4 w-52 h-52 bg-blue-400/5 rounded-full blur-2xl lg:hidden anim-orb" style={{ animationDelay: '4s' }}></div>

        {/* Mobile-only Lock Illustration outside and above the card */}
        <div className="flex lg:hidden justify-center items-center max-w-[120px] sm:max-w-[130px] w-full mx-auto mb-4 md:mb-6 anim-fade-up relative z-10">
          <LockIllustration isMobile />
        </div>

        <div className="w-full max-w-[460px] lg:bg-white bg-white/5 lg:border-slate-100 border-white/10 lg:shadow-[0_4px_32px_rgba(15,23,42,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.37)] rounded-3xl lg:border border p-6 sm:p-8 lg:p-8 xl:p-10 space-y-4 lg:space-y-5 xl:space-y-6 backdrop-blur-md anim-scale-in relative z-10">

          <div className="space-y-6">
            <div className="space-y-2 anim-fade-up stagger-1">
              <h2 className="text-3xl font-black tracking-tight lg:text-[#0F172A] text-white font-['Plus_Jakarta_Sans']">
                Welcome Back
              </h2>
              <p className="text-[10px] lg:text-slate-400 text-blue-300/80 font-bold uppercase tracking-wider block anim-fade-up stagger-2">
                {otpStep ? 'Verify your identity' : 'Login to access your partner dashboard & leads'}
              </p>
            </div>

            {loginSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 anim-fade-up">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{loginSuccess}</span>
              </div>
            )}

            {loginError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold anim-slide-right">
                {loginError}
              </div>
            )}

            {/* STEP 1: ENTER EMAIL OR PHONE */}
            {!otpStep ? (
              <form onSubmit={handleSendOtp} className="space-y-5 anim-slide-left">
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
                      placeholder="Enter registered email or phone number"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="block w-full pl-10 pr-4 py-3 lg:bg-white bg-white/5 lg:border-slate-200 border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 lg:text-slate-800 text-white placeholder-slate-400 lg:placeholder-slate-400 placeholder-white/30 font-semibold shadow-xs transition-all duration-200"
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
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded lg:border-slate-300 border-white/15 lg:bg-white bg-white/5 text-blue-600 cursor-pointer focus:ring-0"
                      />
                    </div>
                    <span>Remember Me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#1062AC] hover:bg-[#0D4E8C] disabled:bg-blue-300 lg:disabled:bg-blue-300 disabled:bg-blue-900/50 text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_14px_rgba(16,98,172,0.35)] hover:shadow-[0_6px_20px_rgba(16,98,172,0.45)] cursor-pointer pulse-glow press"
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

                {/* Meta Verification Demo Quick Access */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailOrPhone('admin@teradocrm.com');
                      setOtpStep(true);
                      setPin('123456');
                      setLoginSuccess('Demo OTP 123456 auto-filled');
                      setTimeout(() => {
                        handleLoginSubmit(undefined, '123456');
                      }, 400);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border lg:bg-blue-50/60 lg:hover:bg-blue-100/70 lg:text-blue-700 lg:border-blue-200/80 bg-white/5 hover:bg-white/10 text-sky-300 border-white/10 shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Quick Login as Admin (Meta Review Demo)</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-white/40 mt-1.5 font-medium">
                    Pre-fills <span className="font-semibold text-slate-600 dark:text-white/70">admin@teradocrm.com</span> with code <span className="font-semibold text-slate-600 dark:text-white/70">123456</span>
                  </p>
                </div>
              </form>
            ) : (
              /* STEP 2: VERIFY OTP CODE */
              <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-5 anim-slide-right">

                {/* Masked contact info pill */}
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl lg:bg-blue-50/70 bg-white/5 border lg:border-blue-100 border-white/10">
                  <div className="w-7 h-7 rounded-lg lg:bg-blue-100 bg-white/10 flex items-center justify-center shrink-0">
                    {emailOrPhone.includes('@')
                      ? <Mail className="w-3.5 h-3.5 lg:text-blue-500 text-sky-400" />
                      : <Smartphone className="w-3.5 h-3.5 lg:text-blue-500 text-sky-400" />}
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
                    className="flex items-center gap-1 text-[10px] font-bold lg:text-blue-500 text-sky-400 hover:underline transition shrink-0 cursor-pointer"
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
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      Demo Code: 123456
                    </span>
                  </div>

                  {/* Custom Smooth OTP input */}
                  <div className="relative py-4 flex justify-center overflow-hidden min-h-[80px]">
                    <style>{`
                      @keyframes spin-dot {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                    `}</style>

                    {/* Hidden input to capture keyboard events */}
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

                    {/* Verified Badge Container */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-550 ease-out ${isVerified ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-6'
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
                            className={`w-11 h-11 rounded-full border-2 lg:bg-white bg-white/5 flex items-center justify-center text-base font-black relative transition-all duration-500 ${isComplete
                              ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.25)]'
                              : isFocused
                                ? 'lg:border-blue-500 border-sky-400 shadow-[0_0_8px_rgba(59,130,246,0.3)] scale-105'
                                : 'lg:border-slate-200 border-white/10 lg:text-slate-800 text-white'
                              }`}
                            style={
                              isVerified
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
                              <span className="lg:text-slate-350 text-white/30 font-normal text-xs">•</span>
                            )}

                            {/* Revolving Dot for complete state */}
                            {isComplete && !isVerified && (
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
                </div>

                <div className="flex justify-between items-center text-xs font-semibold px-1">
                  <span className="lg:text-slate-400 text-white/50">Didn't receive the OTP?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="lg:text-blue-600 text-sky-450 hover:lg:text-blue-700 hover:text-sky-350 transition font-bold disabled:text-slate-400 lg:disabled:text-slate-400 disabled:text-white/20 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#1062AC] hover:bg-[#0D4E8C] disabled:bg-blue-300 lg:disabled:bg-blue-300 disabled:bg-blue-900/50 text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_14px_rgba(16,98,172,0.35)] hover:shadow-[0_6px_20px_rgba(16,98,172,0.45)] cursor-pointer pulse-glow press"
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

            {/* Redirection to register */}
            <div className="pt-4 lg:border-t lg:border-slate-100/80 border-t border-white/10 flex justify-between items-center text-xs font-semibold lg:text-slate-500 text-white/60">
              <span>New channel partner?</span>
              <Link
                to="/register"
                className="flex items-center gap-1.5 lg:text-blue-600 text-sky-400 hover:lg:text-blue-700 hover:text-sky-300 transition font-bold"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register as Broker</span>
              </Link>
            </div>


          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
