import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, Trash2, Loader2, Building2, 
  MapPin, Grid, Layers 
} from 'lucide-react';

interface DeleteProjectModalProps {
  project: any;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ 
  project, 
  onClose, 
  onConfirm, 
  isDeleting 
}) => {
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeleting]);

  if (!project) return null;

  // Resolve details matching project schemas
  const projectName = project.project_name || project.name || 'Unnamed Project';
  const projectType = project.project_type_detail?.slug || project.project_type || 'Residential';
  const projectStatus = project.project_status_detail?.slug || project.status || 'Active';
  const towers = project.towers || '—';
  const units = project.units || '—';
  const location = project.location || 
    (project.area_locality && project.city 
      ? `${project.area_locality}, ${project.city}` 
      : project.city || 'Location N/A');

  return createPortal(
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 anim-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left anim-scale-in"
        style={{ maxHeight: 'min(90vh, 650px)' }}
      >
        {/* Gradient Header with Red Warning Theme */}
        <div className="bg-gradient-to-br from-[#1E293B] via-[#EF4444] to-[#DC2626] px-6 py-5 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fca5a5 0%, transparent 60%)' }} />
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Trash2 className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Project</h3>
                <p className="text-[11px] text-red-200/80 font-medium mt-0.5">Permanently remove project registry and assets</p>
              </div>
            </div>
            <button 
              type="button" 
              disabled={isDeleting}
              onClick={onClose} 
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Target Project Summary Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3.5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Project</span>
              <h4 className="text-sm font-black text-[#0F172A] mt-0.5">{projectName}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Type</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">{projectType}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Status</span>
                  <span className="text-xs font-bold text-slate-750 block mt-0.5">{projectStatus}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5">
                <Grid className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Towers & Units</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">{towers} Towers • {units} Units</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Location</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5 truncate max-w-[140px]">{location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Destruction Alert Banner */}
          <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 flex gap-3 text-left">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-800 block">Critical: This action cannot be undone</span>
              <span className="text-[11px] text-rose-700/90 font-medium leading-relaxed block">
                Deleting this project will permanently remove all associated towers, inventory units, and flat configurations. Active lead linkages will be disconnected.
              </span>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="deleteConsentCheckbox"
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              className="w-4 h-4 text-red-650 border-slate-350 rounded focus:ring-red-500/25 mt-0.5 cursor-pointer accent-red-600 shrink-0"
              disabled={isDeleting}
            />
            <div className="space-y-1">
              <label 
                htmlFor="deleteConsentCheckbox" 
                className="text-xs text-slate-800 font-bold leading-none cursor-pointer select-none block"
              >
                Acknowledge Permanency
              </label>
              <span className="text-[11px] text-slate-500 font-medium leading-relaxed block">
                I understand that deleting <strong>{projectName}</strong> is irreversible and all structural configurations will be lost. *
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 px-6 pt-3 pb-5 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer text-center disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting || !consentConfirmed}
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(220,38,38,0.2)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.3)] cursor-pointer flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting Project...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
