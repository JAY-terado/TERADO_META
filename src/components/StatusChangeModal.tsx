import React, { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';

import type { Lead } from '../context/BrokerConnectContext';
import { Calendar, Clock, MapPin, X, AlertTriangle, Building, Home, CreditCard } from 'lucide-react';
import { CustomMultiSelect } from './CustomMultiSelect';
import { useBrokerConnect } from '../context/BrokerConnectContext';
import { getMasters } from '../admin/api/masters';

interface StatusChangeModalProps {
  isOpen: boolean;
  leadName: string;
  leadId: string;
  currentStatus: Lead['status'];
  targetStatus: Lead['status'];
  onClose: () => void;
  onConfirm: (data: {
    notes: string;
    visitDate?: string;
    visitTime?: string;
    pickupRequired?: 'Yes' | 'No';
    pickupPoint?: string;
    projects?: string[];
    unitTypes?: string[];
    budget?: string;
    expectedBookingDuration?: string;
  }) => void;
  initialProjects?: string[];
  initialUnitTypes?: string[];
  initialBudget?: string;
  initialExpectedBookingDuration?: string;
}

const formatTimeTo12Hour = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr;
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;
  let [_, hoursStr, minutesStr] = match;
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutesStr} ${ampm}`;
};

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  leadName,
  leadId,
  currentStatus,
  targetStatus,
  onClose,
  onConfirm,
  initialProjects = [],
  initialUnitTypes = [],
  initialBudget = '',
  initialExpectedBookingDuration = '',
}) => {
  const { projects } = useBrokerConnect();
  const projectOptions = projects.map((p) => p.name);

  const [notes, setNotes] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [pickupRequired, setPickupRequired] = useState<'Yes' | 'No'>('No');
  const [pickupPoint, setPickupPoint] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [expectedBookingDuration, setExpectedBookingDuration] = useState('');
  const [error, setError] = useState('');

  // Dynamic options from backend masters
  const [unitTypeOptions, setUnitTypeOptions] = useState<string[]>(['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse']);
  const [budgetOptions, setBudgetOptions] = useState<string[]>(['₹50L - ₹60L', '₹60L - ₹80L', '₹80L - ₹1Cr', '₹1Cr - ₹1.2Cr', '₹1.2Cr - ₹1.5Cr', '₹1.5Cr - ₹2Cr', '₹2Cr - ₹2.5Cr', '₹2.5Cr+']);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const res = await getMasters({ page: 1, limit: 10 });
        if (res.success && Array.isArray(res.data)) {
          const fetchedBudgets: string[] = [];
          const fetchedUnitTypes: string[] = [];

          res.data.forEach(item => {
            if (!item.name || !item.slug) return;
            const normName = item.name.toLowerCase().trim();
            if (normName.includes('budget')) {
              if (!fetchedBudgets.includes(item.slug)) fetchedBudgets.push(item.slug);
            } else if (normName.includes('unit type') || normName.includes('unit config')) {
              if (!fetchedUnitTypes.includes(item.slug)) fetchedUnitTypes.push(item.slug);
            }
          });

          if (fetchedBudgets.length > 0) {
            setBudgetOptions(fetchedBudgets);
          }
          if (fetchedUnitTypes.length > 0) {
            setUnitTypeOptions(fetchedUnitTypes);
          }
        }
      } catch (err) {
        console.error('Failed to load masters in StatusChangeModal:', err);
      }
    };
    if (isOpen) {
      loadMasters();
    }
  }, [isOpen]);

  // Reset fields on open/change
  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setVisitDate('');
      setVisitTime('');
      setPickupRequired('No');
      setPickupPoint('');
      setError('');
      setSelectedProject(initialProjects[0] || '');
      setSelectedUnitTypes(initialUnitTypes.filter(ut => ut.trim().toLowerCase() !== 'any config'));
      setBudget(initialBudget);
      setExpectedBookingDuration(initialExpectedBookingDuration);
    }
  }, [isOpen, targetStatus, initialProjects, initialUnitTypes, initialBudget, initialExpectedBookingDuration]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!notes.trim()) {
      setError('Please add notes to proceed.');
      return;
    }

    if (targetStatus === 'Visit Scheduled') {
      if (!selectedProject) {
        setError('Please select a project.');
        return;
      }
      if (selectedUnitTypes.length === 0) {
        setError('Please select at least one unit type.');
        return;
      }
      if (!budget) {
        setError('Please select a budget.');
        return;
      }
      if (!visitDate) {
        setError('Please select a visit date.');
        return;
      }
      if (!visitTime.trim()) {
        setError('Please enter a visit time.');
        return;
      }
      if (pickupRequired === 'Yes' && !pickupPoint.trim()) {
        setError('Please specify a pickup point.');
        return;
      }
    }

    onConfirm({
      notes: notes.trim(),
      ...(targetStatus === 'Visit Scheduled' ? {
        visitDate,
        visitTime: formatTimeTo12Hour(visitTime.trim()),
        pickupRequired,
        pickupPoint: pickupRequired === 'Yes' ? pickupPoint.trim() : undefined,
        projects: selectedProject ? [selectedProject] : [],
        unitTypes: selectedUnitTypes,
        budget: budget,
        expectedBookingDuration: expectedBookingDuration || undefined,
      } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-y-auto max-h-[90vh] p-6 relative transform transition-all animate-in fade-in zoom-in-95 duration-200"
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
          <h3 className="text-lg font-bold text-slate-900">Update Lead Status</h3>
          <p className="text-xs text-slate-450 font-bold">
            {leadName} <span className="text-slate-300 font-normal">|</span> {leadId}
          </p>
        </div>

        {/* Status Transition Badges */}
        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-slate-500 bg-slate-50/50 border border-slate-150 p-2.5 rounded-2xl">
          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-650 font-extrabold">
            {currentStatus === 'Followup' ? 'Follow-up' : currentStatus}
          </span>
          <span className="text-slate-350 font-normal">➔</span>
          <span className="px-2.5 py-1 bg-orange-50 text-orange-650 rounded-lg font-extrabold">
            {targetStatus === 'Followup' ? 'Follow-up' : targetStatus}
          </span>
        </div>

        {/* Validation Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-150 rounded-2xl text-rose-700 text-xs font-bold animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Notes field - REQUIRED FOR ALL STATUS CHANGES */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
              Notes *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary of call outcome, requirements details..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-slate-700 placeholder:text-slate-400 resize-none"
              required
            />
          </div>

          {/* Section 2: Requirements - ONLY IF TARGET IS Visit Scheduled */}
          {targetStatus === 'Visit Scheduled' && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-[11px] font-bold text-[#0F172A] border-b border-slate-50 pb-1.5">
                Requirements
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Project <span className="text-red-500 ml-0.5">*</span></label>
                  <CustomSelect
                    value={selectedProject}
                    onChange={(val) => setSelectedProject(val)}
                    options={projectOptions}
                    placeholder="Select Project"
                    icon={Building}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Unit Types <span className="text-red-500 ml-0.5">*</span></label>
                  <CustomMultiSelect
                    value={selectedUnitTypes}
                    onChange={(val) => setSelectedUnitTypes(val)}
                    options={unitTypeOptions}
                    placeholder="Select Unit Types"
                    icon={Home}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Budget <span className="text-red-500 ml-0.5">*</span></label>
                  <CustomSelect
                    value={budget}
                    onChange={(val) => setBudget(val)}
                    options={budgetOptions}
                    placeholder="Select Budget"
                    icon={CreditCard}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Expected Booking Duration</label>
                  <CustomSelect
                    value={expectedBookingDuration}
                    onChange={(val) => setExpectedBookingDuration(val)}
                    options={['Immediate (Within 7 days)', '15 to 30 Days', '30 to 60 Days', '2 to 3 Months', '3+ Months']}
                    placeholder="Select Duration"
                    icon={Clock}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Visit Scheduling section - ONLY IF TARGET IS Visit Scheduled */}
          {targetStatus === 'Visit Scheduled' && (
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Visit Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                    Visit Date *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50/60 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-slate-700"
                      required
                    />
                  </div>
                </div>

                {/* Visit Time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                    Visit Time *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50/60 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-slate-700"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Required Option (Segmented Switch style) */}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-bold text-slate-500">Accompanying Pickup Required?</span>
                <div className="flex p-0.5 bg-slate-100 border border-slate-200/40 rounded-xl">
                  {(['No', 'Yes'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPickupRequired(opt)}
                      className={`px-4 py-1 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${pickupRequired === opt
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-slate-400 hover:text-slate-650'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup Point (conditional) */}
              {pickupRequired === 'Yes' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                    Pickup Point Location *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Sector 18 Metro Gate 1"
                      value={pickupPoint}
                      onChange={(e) => setPickupPoint(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50/60 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold text-slate-700 placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-450 hover:text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(249,115,22,0.15)] hover:shadow-[0_4px_16px_rgba(249,115,22,0.25)] cursor-pointer"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
