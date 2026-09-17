import React from 'react';
import { LogOut } from 'lucide-react';
import Swal from 'sweetalert2';
import { logoutUser } from '../pages/api/login';

interface ProfilePopoverProps {
  fullName: string;
  roleLabel: string;
  /** Tailwind bg class for avatar, e.g. 'bg-rose-600' */
  avatarColor: string;
  /** Whether popover is visible */
  open: boolean;
  onClose: () => void;
}

export const ProfilePopover: React.FC<ProfilePopoverProps> = ({
  fullName,
  roleLabel,
  avatarColor,
  open,
  onClose,
}) => {
  if (!open) return null;

  const initials = fullName ? fullName.charAt(0).toUpperCase() : '?';

  const handleLogout = () => {
    onClose();
    Swal.fire({
      title: 'Sign out?',
      text: 'You will be returned to the login screen.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Stay logged in',
      confirmButtonColor: '#EC3237',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        logoutUser();
      }
    });
  };

  return (
    <div
      className="absolute top-[calc(100%+10px)] right-0 z-50 animate-fade-in"
      style={{ width: '232px' }}
    >
      {/* Light-theme card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden">

        {/* User info section */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-xl ${avatarColor} text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate leading-tight">{fullName}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{roleLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mx-3" />

        {/* Sign Out button */}
        <div className="p-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#EC3237] hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 transition-all duration-150 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors shrink-0">
              <LogOut className="w-3.5 h-3.5 text-[#EC3237]" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight">Sign Out</span>
              <span className="block text-[10px] text-red-400 font-medium">End your session</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
