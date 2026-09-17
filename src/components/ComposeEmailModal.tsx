import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Plus } from 'lucide-react';

interface ComposeEmailModalProps {
  isOpen: boolean;
  leadName: string;
  leadEmail: string;
  onClose: () => void;
  onSend: (data: {
    subject: string;
    body: string;
    attachments: File[];
  }) => void;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  leadName,
  leadEmail,
  onClose,
  onSend,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setBody('');
      setAttachments([]);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...fileList]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please enter a subject.');
      return;
    }
    if (!body.trim()) {
      setError('Please enter the email body.');
      return;
    }
    onSend({
      subject: subject.trim(),
      body: body.trim(),
      attachments,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 relative transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Block */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">Compose Email</h3>
          <p className="text-xs text-slate-450 font-bold">
            Drafting message for <span className="text-slate-700 font-extrabold">{leadName}</span> ({leadEmail})
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-150 rounded-2xl text-rose-750 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Subject <span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. BrokerConnect - Site Visit Schedule Update"
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-slate-700 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Message Body <span className="text-red-500 ml-0.5">*</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message details here..."
              rows={6}
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-slate-700 placeholder:text-slate-400 resize-none"
              required
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Attachments</label>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Add File</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-orange-50/40 border border-orange-100 rounded-lg text-xs font-bold text-orange-700 animate-in fade-in zoom-in-95 duration-100">
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-0.5 hover:bg-orange-100 rounded-md text-orange-500 hover:text-orange-700 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-450 hover:text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(249,115,22,0.15)] hover:shadow-[0_4px_16px_rgba(249,115,22,0.25)] cursor-pointer"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
