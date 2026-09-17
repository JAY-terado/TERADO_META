import React, { useState, useEffect, useRef } from 'react';
import { X, Layers, Landmark, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';
import { createBookingOnServer, getSalesLeads } from '../pages/api/registercustomer';
import { getProjectsDropdownList, getProjectsList } from '../pages/api/projects';
import type { CreateBookingApiPayload } from '../pages/api/registercustomer';

export interface ProjectOption {
  id: number;
  name: string;
}

export interface CreateBookingData {
  projectId: number;
  tower?: string;
  paymentSchedule?: string;
  payment_schedule?: string;
  floor: string;
  unitNo: string;
  bookingAmount: number;
  agreementValue: number;
}

interface CreateBookingModalProps {
  isOpen: boolean;
  leadId?: string;
  customerName?: string;
  projectName?: string;
  projectId?: number | string;
  projects?: any[];
  onClose: () => void;
  onConfirm: (data: CreateBookingData) => void;
}

export const PAYMENT_SCHEDULE_OPTIONS = [
  'Clp 10% - 90%',
  'Self funding',
  'Builder subvention',
  'Customize payment',
];

const normalizeProjects = (list: any[]): ProjectOption[] => {
  if (!Array.isArray(list)) return [];
  const result: ProjectOption[] = [];
  const seenIds = new Set<number>();

  for (const item of list) {
    const id = Number(item.id || item.project_id || 0);
    const name = (item.name || item.project_name || '').trim();
    if (id > 0 && !seenIds.has(id)) {
      seenIds.add(id);
      result.push({ id, name: name || `Project #${id}` });
    }
  }
  return result;
};

export const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  isOpen,
  leadId,
  customerName,
  projectName,
  projectId: initialProjectIdProp,
  projects = [],
  onClose,
  onConfirm,
}) => {
  // Form states
  const [projectId, setProjectId] = useState<number>(0);
  interface UnitPayload {
    paymentSchedule: string;
    tower?: string;
    floor: string;
    unitNo: string;
    bookingAmount: string;
    agreementValue: string;
  }
  const [units, setUnits] = useState<UnitPayload[]>([
    { paymentSchedule: '', tower: '', floor: '', unitNo: '', bookingAmount: '', agreementValue: '' }
  ]);
  const [leadIdInput, setLeadIdInput] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    try {
      return new Date().toLocaleDateString('sv').split(' ')[0]; // YYYY-MM-DD
    } catch {
      return '2026-07-13';
    }
  });
  const [error, setError] = useState('');

  // Available Projects list
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>(() =>
    normalizeProjects(projects)
  );

  // Searchable Leads states
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch project options if needed
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchProjectOptions = async () => {
      try {
        const dropRes = await getProjectsDropdownList();
        if (dropRes && dropRes.success && Array.isArray(dropRes.data) && dropRes.data.length > 0) {
          if (isMounted) {
            const normalized = normalizeProjects(dropRes.data);
            setAvailableProjects(normalized);
          }
          return;
        }
      } catch {
        // Dropdown endpoint fallback
      }

      try {
        const listRes = await getProjectsList();
        if (listRes && listRes.success && Array.isArray(listRes.data) && listRes.data.length > 0) {
          if (isMounted) {
            const normalized = normalizeProjects(listRes.data);
            setAvailableProjects(normalized);
          }
        }
      } catch {
        // Fallback to existing passed projects
      }
    };

    fetchProjectOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Keep passed projects updated
  useEffect(() => {
    if (projects && projects.length > 0) {
      setAvailableProjects(prev => {
        const normalized = normalizeProjects(projects);
        if (normalized.length === 0) return prev;
        const map = new Map<number, ProjectOption>();
        prev.forEach(p => map.set(p.id, p));
        normalized.forEach(p => map.set(p.id, p));
        return Array.from(map.values());
      });
    }
  }, [projects]);

  const fetchLeads = async (searchStr: string, pageNum: number) => {
    setLeadsLoading(true);
    try {
      const res = await getSalesLeads({
        search: searchStr,
        page: pageNum,
        limit: 5,
      });
      if (res && res.success) {
        setLeadsList(res.data || []);
        if (res.pagination) {
          setLeadsTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch leads on search or page changes
  useEffect(() => {
    if (isOpen && !leadId) {
      fetchLeads(leadsSearch, leadsPage);
    }
  }, [isOpen, leadsSearch, leadsPage, leadId]);

  // Reset fields on open and find default project choice id
  useEffect(() => {
    if (isOpen) {
      setUnits([{ paymentSchedule: '', tower: '', floor: '', unitNo: '', bookingAmount: '', agreementValue: '' }]);
      setLeadIdInput(leadId ? String(leadId) : '');
      setLeadsSearch('');
      setLeadsPage(1);
      setSelectedLead(null);
      setIsDropdownOpen(false);

      const todayStr = (() => {
        try {
          return new Date().toLocaleDateString('sv').split(' ')[0]; // YYYY-MM-DD
        } catch {
          return '2026-07-13';
        }
      })();
      setBookingDate(todayStr);
      setError('');
    }
  }, [isOpen, leadId]);

  // Automatically resolve project ID when availableProjects, initialProjectIdProp, projectName, or selectedLead change
  useEffect(() => {
    if (!isOpen) return;

    // 1. Direct project ID prop
    if (initialProjectIdProp && Number(initialProjectIdProp) > 0) {
      setProjectId(Number(initialProjectIdProp));
      return;
    }

    // 2. Project ID from selected lead
    if (selectedLead?.project_detail?.id && Number(selectedLead.project_detail.id) > 0) {
      setProjectId(Number(selectedLead.project_detail.id));
      return;
    }

    // 3. Project matched by projectName string
    const targetName = (
      projectName ||
      selectedLead?.project_detail?.project_name ||
      ''
    ).trim();

    if (targetName && targetName !== '-' && targetName !== '—' && targetName.toLowerCase() !== 'n/a') {
      // Check if targetName is a numeric ID
      if (!isNaN(Number(targetName)) && Number(targetName) > 0) {
        setProjectId(Number(targetName));
        return;
      }

      // Check exact match by name
      const exactMatch = availableProjects.find(
        p => p.name.toLowerCase() === targetName.toLowerCase()
      );
      if (exactMatch) {
        setProjectId(exactMatch.id);
        return;
      }

      // Check partial match
      const partialMatch = availableProjects.find(
        p =>
          p.name.toLowerCase().includes(targetName.toLowerCase()) ||
          targetName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (partialMatch) {
        setProjectId(partialMatch.id);
        return;
      }
    }

    // 4. Default to first available project if current projectId is invalid
    if (projectId <= 0 && availableProjects.length > 0) {
      setProjectId(availableProjects[0].id);
    }
  }, [isOpen, initialProjectIdProp, projectName, selectedLead, availableProjects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!leadIdInput.trim()) {
      setError('Please select or specify a valid Customer / Lead ID.');
      return;
    }

    if (!projectId || Number(projectId) <= 0) {
      setError('Please select a valid Project for this booking.');
      return;
    }

    if (!bookingDate.trim()) {
      setError('Please select a booking date.');
      return;
    }

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const schedule = (u.paymentSchedule || u.tower || '').trim();
      if (!schedule || !u.floor.trim() || !u.unitNo.trim() || !u.bookingAmount.trim() || !u.agreementValue.trim()) {
        setError('Please fill all fields for all units.');
        return;
      }
      const amt = Number(u.bookingAmount);
      if (isNaN(amt) || amt <= 0) {
        setError(`Please enter a valid booking token amount for unit ${u.unitNo || i+1}.`);
        return;
      }
      const val = Number(u.agreementValue);
      if (isNaN(val) || val <= 0) {
        setError(`Please enter a valid total agreement value for unit ${u.unitNo || i+1}.`);
        return;
      }
    }

    // Customer display name for alert
    const customerDisplayName =
      customerName ||
      selectedLead?.customer_detail?.customer_name ||
      `Lead #${leadIdInput}`;

    // Construct payload
    const payload: CreateBookingApiPayload[] = units.map(u => {
      const schedule = (u.paymentSchedule || u.tower || '').trim();
      return {
        lead_id: Number(leadIdInput),
        project_id: projectId,
        unit_number: u.unitNo.trim(),
        tower: schedule,
        payment_schedule: schedule,
        floor: u.floor.trim(),
        booking_amount: Number(u.bookingAmount),
        agreement_value: Number(u.agreementValue),
        booking_date: bookingDate,
      };
    });

    // Ask for customer consent using SweetAlert2 with active loading logic
    Swal.fire({
      title: 'Verify Booking Authorization',
      html: `
        <div class="text-left space-y-4 p-2 font-sans">
          <p class="text-slate-650 text-xs font-medium leading-relaxed">
            By proceeding, you verify that you have obtained explicit <strong>verbal or signed consent</strong> from the client, <strong class="text-blue-600">${customerDisplayName}</strong>, to block this unit and finalize the purchase process.
          </p>
          
          <div class="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
            <div class="flex items-center gap-2 text-amber-800 text-[10px] font-black uppercase tracking-wider">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Audit compliance alert
            </div>
            <p class="text-[11px] text-amber-700 font-medium leading-relaxed">
              This action will register the booking record on the staging servers and lock the selected inventory. An automated compliance statement will be compiled.
            </p>
          </div>

          <div class="text-slate-400 text-[9px] font-bold uppercase tracking-widest text-center pt-2">
            Do you wish to submit this booking?
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Yes, Consent Verified',
      cancelButtonText: 'No, Cancel',
      confirmButtonColor: '#1A56DB',
      cancelButtonColor: '#64748B',
      showLoaderOnConfirm: true,
      customClass: {
        popup: 'rounded-3xl p-6 font-sans',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all',
        cancelButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs transition-all border border-slate-200 text-slate-500 bg-white hover:bg-slate-50',
      },
      willOpen: () => {
        const container = Swal.getContainer();
        if (container) {
          container.style.zIndex = '10000';
        }
      },
      preConfirm: async () => {
        try {
          const res = await createBookingOnServer(payload as any);
          if (res && res.success) {
            return res;
          } else {
            Swal.showValidationMessage(res?.message || 'Server failed to save booking.');
            return false;
          }
        } catch (err: any) {
          Swal.showValidationMessage(err.message || 'Error occurred while contacting API.');
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed) {
        const firstUnit = payload[0];
        const confirmData: any = [...payload];
        confirmData.projectId = projectId;
        confirmData.tower = firstUnit?.tower || '';
        confirmData.paymentSchedule = (firstUnit as any)?.payment_schedule || firstUnit?.tower || '';
        confirmData.payment_schedule = (firstUnit as any)?.payment_schedule || firstUnit?.tower || '';
        confirmData.floor = firstUnit?.floor || '';
        confirmData.unitNo = firstUnit?.unit_number || '';
        confirmData.bookingAmount = firstUnit?.booking_amount || 0;
        confirmData.agreementValue = firstUnit?.agreement_value || 0;
        onConfirm(confirmData);

        Swal.fire({
          title: 'Booking create !',
          text: 'The booking was successfully registered on the staging server and ledger updated.',
          icon: 'success',
          confirmButtonColor: '#1A56DB',
          customClass: {
            popup: 'rounded-3xl p-6',
            confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs shadow-md',
          },
        }).then(() => {
          onClose();
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-y-auto max-h-[90vh] p-6 relative transform transition-all animate-in fade-in zoom-in-95 duration-200 text-left"
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
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Create Booking</span>
          </h3>
          <p className="text-xs text-slate-450 font-bold">
            Customer ID: {leadIdInput || '—'}
          </p>
        </div>

        {/* Validation Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-150 rounded-2xl text-rose-700 text-xs font-bold animate-in fade-in duration-200">
            <X className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Customer & Project choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
            {/* Searchable leads dropdown (if not opening with a fixed leadId) */}
            {!leadId && (
              <div className="space-y-1.5 sm:col-span-2 relative" ref={dropdownRef}>
                <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                  Select Lead / Customer <span className="text-red-500 ml-0.5">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-left flex justify-between items-center cursor-pointer min-h-[38px]"
                >
                  <span className="truncate">
                    {selectedLead
                      ? `${selectedLead.customer_detail?.customer_name} — ${selectedLead.project_detail?.project_name || 'No Project'}`
                      : 'Choose a lead to book...'}
                  </span>
                  <span className="text-slate-400 text-[10px] ml-2">▼</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2 max-h-[300px] flex flex-col">
                    {/* Search Input inside the dropdown */}
                    <input
                      type="text"
                      placeholder="Search by customer name, mobile..."
                      value={leadsSearch}
                      onChange={(e) => {
                        setLeadsSearch(e.target.value);
                        setLeadsPage(1);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                    />

                    {/* Leads List */}
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-[160px]">
                      {leadsLoading ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                          Loading leads...
                        </div>
                      ) : leadsList.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No leads found.
                        </div>
                      ) : (
                        leadsList.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedLead(item);
                              setLeadIdInput(String(item.id));
                              if (item.project_detail?.id) {
                                setProjectId(Number(item.project_detail.id));
                              }
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg text-xs transition cursor-pointer flex justify-between items-center gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">
                                {item.customer_detail?.customer_name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.customer_detail?.mobile_number}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                              {item.project_detail?.project_name || 'No Project'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {leadsTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold shrink-0">
                        <button
                          type="button"
                          disabled={leadsPage === 1}
                          onClick={() => setLeadsPage((p) => Math.max(p - 1, 1))}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer"
                        >
                          Prev
                        </button>
                        <span>
                          Page {leadsPage} of {leadsTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={leadsPage === leadsTotalPages}
                          onClick={() => setLeadsPage((p) => Math.min(p + 1, leadsTotalPages))}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customer Name display */}
            {(leadId || selectedLead) && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                  Customer Name
                </label>
                <div className="w-full px-3.5 py-2 bg-slate-200/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 h-[38px] flex items-center">
                  {leadId ? customerName || 'Lead #' + leadId : selectedLead?.customer_detail?.customer_name}
                </div>
              </div>
            )}

            {/* Selectable Project Choice */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                Project Choice <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-[38px] cursor-pointer"
                required
              >
                <option value="">Select Project...</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Date */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                Booking Date <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-[38px]"
                required
              />
            </div>
          </div>

          {/* Units details */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Unit Inventory & Financial Details</span>
              </h4>
              <button
                type="button"
                onClick={() => setUnits([...units, { paymentSchedule: '', tower: '', floor: '', unitNo: '', bookingAmount: '', agreementValue: '' }])}
                className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1"
              >
                + Add Unit
              </button>
            </div>

            {units.map((unit, index) => (
              <div key={index} className="space-y-3 bg-slate-50/40 p-4 rounded-xl border border-slate-200 relative">
                {units.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newUnits = [...units];
                      newUnits.splice(index, 1);
                      setUnits(newUnits);
                    }}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit {index + 1}</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                      Payment Schedule <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={unit.paymentSchedule || unit.tower || ''}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].paymentSchedule = e.target.value;
                        newUnits[index].tower = e.target.value;
                        setUnits(newUnits);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700 cursor-pointer h-[38px]"
                      required
                    >
                      <option value="">Select Payment Schedule...</option>
                      {PAYMENT_SCHEDULE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                      Floor <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Floor 12"
                      value={unit.floor}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].floor = e.target.value;
                        setUnits(newUnits);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700 placeholder:text-slate-450"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                      Unit No <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A-404"
                      value={unit.unitNo}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].unitNo = e.target.value;
                        setUnits(newUnits);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700 placeholder:text-slate-450"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                      Booking token Amount (₹) <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={unit.bookingAmount}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].bookingAmount = e.target.value;
                        setUnits(newUnits);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700 placeholder:text-slate-450"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">
                      Total Agreement Value (₹) <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 7500000"
                      value={unit.agreementValue}
                      onChange={(e) => {
                        const newUnits = [...units];
                        newUnits[index].agreementValue = e.target.value;
                        setUnits(newUnits);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700 placeholder:text-slate-450"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              className="px-5.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(26,86,219,0.15)] hover:shadow-[0_4px_16px_rgba(26,86,219,0.25)] cursor-pointer"
            >
              Create Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
