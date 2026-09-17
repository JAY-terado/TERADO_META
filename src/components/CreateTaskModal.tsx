import React, { useState } from 'react';
import { X, Calendar, CheckSquare, Search, ChevronDown } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
  leadName?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  leadName = '',
}) => {
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('High');
  const [reminder, setReminder] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [status, setStatus] = useState('Not Started');
  const [description, setDescription] = useState('');

  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  const [reminderCount, setReminderCount] = useState('3');
  const [reminderUnit, setReminderUnit] = useState('Day(s)');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderAlert, setReminderAlert] = useState('Both');

  const [repeatType, setRepeatType] = useState('Weekly');
  const [repeatEnds, setRepeatEnds] = useState('Never');
  const [repeatAfterTimes, setRepeatAfterTimes] = useState('1');
  const [repeatOnDate, setRepeatOnDate] = useState('');

  const getReminderSummary = () => {
    let text = '';
    if (reminderCount === '0' || !reminderCount) {
      text = `On due date at ${reminderTime}`;
    } else {
      text = `${reminderCount} ${reminderUnit} before due date at ${reminderTime}`;
    }
    return `${text} by ${reminderAlert === 'Both' ? 'Email and Pop-up' : reminderAlert}`;
  };

  const getRepeatSummary = () => {
    if (repeatEnds === 'Never') return `${repeatType}, ends Never`;
    if (repeatEnds === 'After') return `${repeatType}, upto ${repeatAfterTimes} time(s)`;
    if (repeatEnds === 'On') return `${repeatType}, until ${repeatOnDate}`;
    return repeatType;
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        subject,
        dueDate,
        priority,
        reminder,
        reminderCount,
        reminderUnit,
        reminderTime,
        reminderAlert,
        repeat,
        repeatType,
        repeatEnds,
        repeatAfterTimes,
        repeatOnDate,
        status,
        description,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-y-auto max-h-[90vh] p-6 relative transform transition-all animate-in fade-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Create Task</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center border-b border-slate-100 py-4">
            <label className="w-32 text-sm text-slate-500 font-semibold">Subject</label>
            <div className="flex-1 flex items-center group">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-sm text-slate-800 bg-transparent border-0 outline-none ring-0 focus:ring-0 placeholder:text-slate-300 p-0"
                placeholder="Enter subject"
                required
              />
              <CheckSquare className="w-4 h-4 text-slate-300 group-focus-within:text-blue-500 shrink-0 ml-2 transition-colors" />
            </div>
          </div>

          <div className="flex items-center border-b border-slate-100 py-4">
            <label className="w-32 text-sm text-slate-500 font-semibold">Due Date</label>
            <div className="flex-1 flex items-center">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm text-slate-800 bg-transparent border-0 outline-none ring-0 focus:ring-0 p-0 uppercase"
                required
              />
            </div>
          </div>

          <div className="flex items-center border-b border-slate-100 py-4">
            <label className="w-32 text-sm text-slate-500 font-semibold">Reminder</label>
            <div className="flex-1 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={reminder}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    if (isChecked && !dueDate) {
                      alert('Please select a Due Date before setting a reminder.');
                      return;
                    }
                    setReminder(isChecked);
                    if (isChecked) {
                      setShowReminderModal(true);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              {reminder && (
                <span className="text-sm text-slate-700 font-medium">{getReminderSummary()}</span>
              )}
            </div>
          </div>

          <div className="flex items-center border-b border-slate-100 py-4">
            <label className="w-32 text-sm text-slate-500 font-semibold">Repeat</label>
            <div className="flex-1 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    if (isChecked && !dueDate) {
                      alert('Without selecting the due date, repeat cannot be turned on.');
                      return;
                    }
                    setRepeat(isChecked);
                    if (isChecked) {
                      setShowRepeatModal(true);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              {repeat && (
                <span className="text-sm text-slate-700 font-medium">{getRepeatSummary()}</span>
              )}
            </div>
          </div>

          <div className="py-2 mt-2">
            <button
              type="button"
              onClick={() => setShowMoreFields(!showMoreFields)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold cursor-pointer py-2 transition-colors px-1 uppercase tracking-wide"
            >
              More Fields
              <span className={`transform transition-transform ${showMoreFields ? 'rotate-90' : ''}`}>
                ›
              </span>
            </button>
          </div>

          {showMoreFields && (
            <div className="space-y-0 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="pt-4 flex items-start">
                <label className="w-32 text-sm text-slate-500 font-semibold pt-2">Description</label>
                <div className="flex-1">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none p-3"
                    placeholder="Add more details..."
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(26,86,219,0.15)] hover:shadow-[0_4px_16px_rgba(26,86,219,0.25)] cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>

      {showReminderModal && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-8 relative transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-slate-800 mb-6">Reminder</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input type="radio" checked readOnly className="w-4 h-4 text-[#1A56DB] focus:ring-[#1A56DB] cursor-pointer" />
                <input type="number" min="0" value={reminderCount} onChange={(e) => setReminderCount(e.target.value)} className="w-12 border border-slate-200 rounded p-1.5 text-sm focus:outline-none focus:border-blue-500 text-center" />
                <select value={reminderUnit} onChange={(e) => setReminderUnit(e.target.value)} className="border border-slate-200 rounded p-1.5 text-sm focus:outline-none cursor-pointer hover:border-slate-300">
                  <option value="Day(s)">Day(s)</option>
                  <option value="Week(s)">Week(s)</option>
                </select>
                <span className="text-sm text-slate-600 font-medium">of due date at</span>
                <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="border border-slate-200 rounded p-1.5 text-sm focus:outline-none hover:border-slate-300" />
              </div>
              <div className="flex items-center gap-8 pl-1">
                <span className="text-sm text-slate-600 font-medium w-8">Alert</span>
                <select value={reminderAlert} onChange={(e) => setReminderAlert(e.target.value)} className="border border-slate-200 rounded p-1.5 text-sm focus:outline-none cursor-pointer w-48 hover:border-slate-300">
                  <option value="Email">Email</option>
                  <option value="Notification">Notification</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setShowReminderModal(false)} className="px-6 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-full font-bold text-sm transition-colors shadow-md cursor-pointer">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRepeatModal && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-8 relative transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-slate-800 mb-6">Repeat</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-8 pl-1">
                <span className="text-sm text-slate-600 font-medium w-8">Type</span>
                <select value={repeatType} onChange={(e) => setRepeatType(e.target.value)} className="border border-blue-200 rounded-full px-3 py-1 text-sm focus:outline-none cursor-pointer text-[#1A56DB] font-semibold bg-blue-50/50">
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="flex items-start gap-8 pl-1">
                <span className="text-sm text-slate-600 font-medium w-8 mt-1">Ends</span>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="ends" value="Never" checked={repeatEnds === 'Never'} onChange={(e) => setRepeatEnds(e.target.value)} className="w-4 h-4 text-[#1A56DB] focus:ring-[#1A56DB]" />
                    <span className="text-sm text-slate-700 font-medium">Never</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="ends" value="After" checked={repeatEnds === 'After'} onChange={(e) => setRepeatEnds(e.target.value)} className="w-4 h-4 text-[#1A56DB] focus:ring-[#1A56DB]" />
                    <span className="text-sm text-slate-700 font-medium">After</span>
                    <input type="number" min="1" value={repeatAfterTimes} onChange={(e) => setRepeatAfterTimes(e.target.value)} disabled={repeatEnds !== 'After'} className="w-14 border border-slate-200 rounded p-1 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 text-center" />
                    <span className="text-sm text-slate-700 font-medium">Time(s)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="ends" value="On" checked={repeatEnds === 'On'} onChange={(e) => setRepeatEnds(e.target.value)} className="w-4 h-4 text-[#1A56DB] focus:ring-[#1A56DB]" />
                    <span className="text-sm text-slate-700 font-medium">On</span>
                    <input type="date" value={repeatOnDate} onChange={(e) => setRepeatOnDate(e.target.value)} disabled={repeatEnds !== 'On'} className="border border-slate-200 rounded p-1 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 uppercase text-blue-500 font-medium" />
                  </label>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setShowRepeatModal(false)} className="px-6 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-full font-bold text-sm transition-colors shadow-md cursor-pointer">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
