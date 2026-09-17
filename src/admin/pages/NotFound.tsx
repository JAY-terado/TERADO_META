import React from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { HelpCircle, ArrowLeft, LayoutDashboard } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // Resolve user role to direct them back to their specific dashboard
  const handleGoHome = () => {
    const userRole = Cookies.get('userRole');
    if (userRole === 'admin') {
      navigate('/admin/dashboard');
    } else if (userRole === 'sales') {
      navigate('/sales/dashboard');
    } else if (userRole === 'calling') {
      navigate('/calling/dashboard');
    } else if (userRole === 'receptionist') {
      navigate('/receptionist/dashboard');
    } else if (userRole === 'channel_partner') {
      navigate('/channel-partner/dashboard');
    } else {
      navigate('/broker/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans relative overflow-hidden">
      {/* Background decoration grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(#000 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Blurred background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-100/50 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 bg-white border border-slate-200/60 rounded-3xl p-8 sm:p-10 shadow-[0_10px_30px_-10px_rgba(148,163,184,0.2)]">
        {/* Help Circle Icon */}
        <div className="mx-auto w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
          <HelpCircle className="w-6 h-6 animate-pulse" />
        </div>

        {/* 404 Status Text */}
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Error 404
        </div>
        
        {/* Title & Desc */}
        <div className="space-y-3 mt-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Page not found
          </h1>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-sm mx-auto">
            The page you are looking for doesn't exist or has been moved. Check the URL in the address bar or return to your dashboard.
          </p>
        </div>

        {/* Separator line */}
        <div className="my-6 border-t border-slate-100" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleGoHome}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Go to Dashboard</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
