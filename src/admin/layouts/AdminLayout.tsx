import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { adminNavigation } from '../navigation/admin.navigation';
import { logoutUser } from '../../pages/api/login';
import Swal from 'sweetalert2';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { NotificationBell } from '../../components/NotificationBell';
import { ProjectsDropdown } from '../../components/ProjectsDropdown';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ProfilePopover } from '../../components/ProfilePopover';
import { BrandLogo } from '../../components/BrandLogo';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fullName = Cookies.get('full_name') || 'Admin System';
  const userEmail = Cookies.get('email') || Cookies.get('user_email') || '';

  // Manage open state for dropdown menus
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
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
      cancelButtonColor: '#1e293b',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        logoutUser();
      }
    });
  };

  // Auto-expand active dropdown categories when path changes, and close inactive ones
  useEffect(() => {
    const nextDropdowns: Record<string, boolean> = {};
    adminNavigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.path);
        nextDropdowns[item.name] = hasActiveChild;
      }
    });
    setOpenDropdowns(nextDropdowns);
  }, [location.pathname]);


  return (
    <div className="flex h-screen bg-[#F1F5F9] text-slate-800 w-full overflow-hidden text-left">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0B1528] text-blue-200 p-6 flex-col justify-between gap-2 shrink-0 h-screen border-r border-white/6 fixed top-0 bottom-0 left-0 z-20 shadow-xl">
        <div className="space-y-8">
          {/* Branding Logo */}
          <div className="mb-2 flex items-center justify-start pl-1">
            <BrandLogo subtitle="Enterprise Admin" size="md" />
          </div>

          {/* Navigation links */}
          <nav className="space-y-0.5">
            <span className="text-[9px] text-white/25 font-bold uppercase tracking-[0.12em] block mb-2 px-3">Navigation</span>
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              
              if (item.children) {
                const isOpen = !!openDropdowns[item.name];
                const hasActiveChild = item.children.some(child => location.pathname === child.path);

                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                      className={`group w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                        hasActiveChild
                          ? 'bg-white/5 text-white border-white/5 shadow-none'
                          : 'text-white/50 hover:text-white/90 hover:bg-white/6 border-transparent'
                      }`}
                    >
                      <span className="relative flex items-center gap-3 pl-3">
                        <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isOpen ? 'scale-110 text-sky-400' : 'text-white/50 group-hover:text-white/80'}`} />
                        <span>{item.name}</span>
                      </span>
                      <span className="mr-2">
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="pl-3.5 ml-5.5 border-l border-white/10 space-y-1 mt-1.5 animate-fade-in">
                        {item.children.map(child => {
                          const ChildIcon = child.icon;
                          const isActive = location.pathname === child.path;
                          return (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={
                                `group w-full flex items-center py-2 px-2.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                                  isActive
                                    ? 'bg-white/8 text-white border-white/10 shadow-sm font-bold'
                                    : 'text-white/40 hover:text-white/85 hover:bg-white/5 border-transparent font-semibold'
                                }`
                              }
                            >
                              <span className="relative flex items-center gap-2.5 pl-1 w-full">
                                {ChildIcon ? (
                                  <ChildIcon className={`w-3.5 h-3.5 shrink-0 transition-all duration-200 ${
                                    isActive
                                      ? 'text-sky-400 opacity-100 scale-110'
                                      : 'text-white/40 opacity-65 group-hover:opacity-100 group-hover:text-white/80'
                                  }`} />
                                ) : (
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${
                                    isActive
                                      ? 'bg-sky-400 scale-125 shadow-[0_0_8px_#38bdf8]'
                                      : 'bg-white/20 group-hover:bg-white/50 group-hover:scale-110'
                                  }`} />
                                )}
                                <span className={`transition-colors duration-200 ${isActive ? 'text-white' : 'group-hover:text-white/95'}`}>
                                  {child.name}
                                </span>
                              </span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path!}
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
      <div className="flex-1 flex flex-col min-w-0 h-screen relative pb-20 lg:pb-0 lg:pl-64 overflow-hidden">
        {/* Header Bar */}
        <header className="bg-[#0B1528] lg:bg-white border-b border-white/8 lg:border-slate-100 px-6 h-16 flex justify-between items-center shrink-0 relative z-40 shadow-sm">
          {/* Left side Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex lg:hidden items-center">
              <BrandLogo subtitle="Admin" size="sm" />
            </div>
            <Breadcrumbs />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3 sm:gap-4 relative" ref={profileMenuRef}>
            <ProjectsDropdown />
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
                <span className="text-[10px] text-blue-200 lg:text-slate-400 font-bold uppercase tracking-wider block">Admin Account</span>
              </div>
              {/* Avatar */}
              <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white font-black text-sm flex items-center justify-center shadow-md select-none transition-all duration-200 ${showMobileMenu ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-white scale-105' : 'hover:scale-105'}`}>
                {fullName ? fullName.charAt(0).toUpperCase() : 'A'}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
              </div>
            </div>

            <ProfilePopover
              fullName={fullName}
              roleLabel="Administrator"
              avatarColor="bg-rose-600"
              open={showMobileMenu}
              onClose={() => setShowMobileMenu(false)}
            />
          </div>
        </header>

        {/* Screen Content Body */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 pb-24 lg:pb-6 bg-[#F1F5F9]">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 inset-x-0 lg:hidden bg-[#0A1628] border-t border-white/8 backdrop-blur-xl shadow-[0_-4px_24px_rgba(10,22,40,0.3)] flex items-center justify-around h-16 pb-safe z-50">
          {adminNavigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path || item.name}
                to={item.path || ''}
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
