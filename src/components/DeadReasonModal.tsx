import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PhoneOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  PhoneCall,
  Radio,
} from 'lucide-react';
import Swal from 'sweetalert2';
import axiosClient from '../../axiosinstance';

export const DEAD_NOT_CONNECTED_REASONS = [
  'Did not pick',
  'Busy in another call',
  'User disconnected the call',
  'Switch off',
  'Out of Coverage area / Network issue',
  'Call not connected / can not be completed',
  'Other reason',
  'Incorrect / Invalid number',
  'Incoming calls not available',
  'Number not in use / does not exists / out of service',
];

export interface DeadReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number | string;
  leadName?: string;
  onSuccess?: () => void;
}

export const DeadReasonModal: React.FC<DeadReasonModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName = 'Customer',
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setMessage('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError('Please select a reason.');
      return;
    }

    if (!leadId) {
      setError('Lead ID is missing.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const numericLeadId = Number(leadId);

      // 1. Create activity log: POST /v1/leads/activity-logs/create
      const logPayload = {
        leadId: numericLeadId,
        reason: selectedReason,
        message: message.trim() || selectedReason,
      };
      await axiosClient.post('/leads/activity-logs/create', logPayload);

      // 2. Update lead tag to Dead: PUT /v1/leads/:id/update-info
      await axiosClient.put(`/leads/${numericLeadId}/update-info`, {
        tag: 'Dead',
      });

      await Swal.fire({
        title: 'Activity Logged!',
        text: `Lead marked as DEAD / NOT CONNECTED (${selectedReason}).`,
        icon: 'success',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Done',
        timer: 2000,
        timerProgressBar: true,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to log dead / not connected activity:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to log activity and update tag. Please try again.';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-xl flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left animate-scale-in border border-slate-100"
        style={{ maxHeight: 'min(92vh, 760px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#334155] px-6 py-5 relative overflow-hidden shrink-0 text-white">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 backdrop-blur-sm rounded-xl border border-rose-400/30 text-rose-300">
                <PhoneOff className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Dead / Not Connected
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 tracking-wider">
                    Tag Update
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Select call connection reason and log activity for {leadName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Error banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Reason selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                <span>Select Reason <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-normal text-slate-400">Required</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEAD_NOT_CONNECTED_REASONS.map((r) => {
                  const isSelected = selectedReason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setSelectedReason(r);
                        setError('');
                      }}
                      className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/60 text-rose-900 shadow-xs ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 bg-white'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="leading-snug flex-1">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Remarks / Message Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Remarks / Details</span>
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Client mentioned budget constraint and stopped responding, phone kept ringing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 transition text-slate-800 font-semibold resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedReason}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition shadow-lg shadow-rose-500/25 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging Activity...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Update Tag</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
