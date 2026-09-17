import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, X } from 'lucide-react';

interface ErrorModalProps {
  title?: string;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ 
  title = 'Action Failed', 
  message, 
  onClose 
}) => {
  
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 anim-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden p-6 text-center anim-scale-in flex flex-col items-center relative border border-slate-100"
      >
        {/* Close Button in corner */}
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Large Glowing Red Error Icon */}
        <div className="mt-4 mb-2 flex justify-center">
          <div className="relative">
            {/* Pulsing Outer Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-rose-500/20 scale-125 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="w-16 h-16 rounded-full bg-rose-50 border-4 border-rose-100 flex items-center justify-center text-rose-600 relative shadow-sm">
              <XCircle className="w-9 h-9 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 mt-3 px-2">
          <h3 className="text-base font-black text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {message}
          </p>
        </div>

        {/* Error Details Context (Standardized container styling) */}
        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left text-[11px] text-slate-500 font-medium leading-relaxed mt-4">
          <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">System Notice</span>
          This action was blocked by the system to maintain database integrity. Ensure all active customer registrations, broker logs, or dependencies are cleared before repeating this request.
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-[0_4px_14px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.35)] cursor-pointer press"
        >
          Acknowledge & Close
        </button>
      </div>
    </div>,
    document.body
  );
};
