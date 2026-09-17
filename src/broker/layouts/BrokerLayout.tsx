import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { LogOut } from 'lucide-react';
import { brokerNavigation } from '../navigation/broker.navigation';
import { logoutUser } from '../../pages/api/login';
import Swal from 'sweetalert2';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { NotificationBell } from '../../components/NotificationBell';
import { ProfilePopover } from '../../components/ProfilePopover';
import { BrandLogo } from '../../components/BrandLogo';

export const BrokerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fullName = Cookies.get('full_name') || 'Broker Account';
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile popover on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Close profile popover on click outside & listen to close-dropdowns events
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    const handleClose = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.except !== 'profile') {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('close-dropdowns', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('close-dropdowns', handleClose);
    };
  }, []);

  const handleLogout = () => {
    setShowMobileMenu(false);
    Swal.fire({
      title: 'Sign out?',
      text: 'You will be returned to the login screen.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Stay logged in',
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) logoutUser();
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] text-slate-800 w-full overflow-x-hidden text-left">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0B1528] text-blue-200 p-6 flex-col justify-between gap-2 shrink-0 h-screen border-r border-white/6 fixed top-0 bottom-0 left-0 z-20 shadow-xl">
        <div className="space-y-8">
          {/* Branding Logo */}
          <div className="mb-2 flex items-center justify-start pl-1">
            <BrandLogo subtitle="Partner Broker" size="md" />
          </div>



          {/* Navigation links */}
          <nav className="space-y-0.5">
            <span className="text-[9px] text-white/25 font-bold uppercase tracking-[0.12em] block mb-2 px-3">Navigation</span>
            {brokerNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group w-full flex items-center py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                      isActive
                        ? 'bg-white/10 text-white border-white/10 shadow-none'
                        : 'text-white/50 hover:text-white/90 hover:bg-white/6 border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span className="relative flex items-center gap-3 w-full pl-3">
                      <Icon className={`w-4.5 h-4.5 transition-all duration-200 ${
                        isActive 
                          ? 'text-sky-400 scale-110' 
                          : 'text-white/50 group-hover:text-white/80 group-hover:scale-105'
                      }`} />
                      <span className={`transition-colors duration-200 ${isActive ? 'text-white font-bold' : 'group-hover:text-white/90'}`}>
                        {item.name}
                      </span>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Log Out */}
        <div>
          <div className="border-t border-white/6 mx-1 mb-2"></div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2.5 px-3 text-white/30 hover:text-red-400 hover:bg-red-500/8 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer border border-transparent hover:border-red-500/10 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Main Core Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative pb-20 lg:pb-0 lg:pl-64">
        {/* Header Bar */}
        <header className="bg-[#0B1528] lg:bg-white border-b border-white/8 lg:border-slate-100 px-6 h-16 flex justify-between items-center shrink-0 relative z-40 shadow-sm">
          {/* Left side Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex lg:hidden items-center">
              <BrandLogo subtitle="Broker" size="sm" />
            </div>
            <Breadcrumbs />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3 sm:gap-4 relative" ref={profileMenuRef}>
            <NotificationBell badgeColor="bg-[#EC3237]" />

            {/* Profile details & Menu Trigger */}
            <div
              className="flex items-center gap-2.5 sm:border-l sm:border-slate-100 sm:pl-4 cursor-pointer select-none"
              onClick={() => {
                const nextOpen = !showMobileMenu;
                setShowMobileMenu(nextOpen);
                if (nextOpen) {
                  window.dispatchEvent(new CustomEvent('close-dropdowns', { detail: { except: 'profile' } }));
                }
              }}
            >
              <div className="hidden sm:block text-right space-y-0.5">
                <span className="text-xs font-black text-white lg:text-slate-800 block">{fullName}</span>
                <span className="text-[10px] text-blue-200 lg:text-slate-400 font-bold uppercase tracking-wider block">Broker Account</span>
              </div>
              <div className={`relative w-9 h-9 rounded-xl bg-[#1062AC] text-white font-black text-sm flex items-center justify-center shadow-sm select-none transition-all duration-200 ${showMobileMenu ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white scale-105' : 'hover:scale-105'}`}>
                {fullName ? fullName.charAt(0).toUpperCase() : 'B'}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
              </div>
            </div>

            <ProfilePopover
              fullName={fullName}
              roleLabel="Broker"
              avatarColor="bg-[#1062AC]"
              open={showMobileMenu}
              onClose={() => setShowMobileMenu(false)}
            />
          </div>
        </header>

        {/* Screen Content Body */}
        <div className="flex-1 flex flex-col p-6 pb-24 lg:pb-6 bg-[#F1F5F9]">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 inset-x-0 lg:hidden bg-[#0A1628] border-t border-white/8 backdrop-blur-xl shadow-[0_-4px_24px_rgba(10,22,40,0.3)] flex items-center justify-around h-16 pb-safe z-50">
          {brokerNavigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[9px] uppercase tracking-widest transition-all duration-150 ${
                  isActive ? 'text-white font-bold' : 'text-white/35 font-medium'
                }`}
              >
                {isActive && <span className="absolute top-0 inset-x-0 h-0.5 bg-sky-400 rounded-b" />}
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : ''}`} />
                <span>{item.name.split(' ')[0]}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
