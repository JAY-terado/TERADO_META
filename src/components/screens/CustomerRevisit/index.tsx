import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowLeft, Search, Loader2, Calendar, Phone, Mail, RefreshCw, MapPin, AlertCircle, Check } from 'lucide-react';
import { searchRevisitCustomers, createRevisit } from '../../../pages/api/registercustomer';
import { CustomSelect } from '../../CustomSelect';
import toast from 'react-hot-toast';

export const CustomerRevisit: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('revisit_searchTerm') || '');
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem('revisit_dateFilter') || '');
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('revisit_customStartDate') || '');
  const [customEndDate, setCustomEndDate] = useState(() => localStorage.getItem('revisit_customEndDate') || '');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('revisit_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('revisit_dateFilter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('revisit_customStartDate', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('revisit_customEndDate', customEndDate);
  }, [customEndDate]);

  // Revisit modal states
  const [showRevisitModal, setShowRevisitModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [revisitPurpose, setRevisitPurpose] = useState('Site visit and negotiation');
  const [revisitNote, setRevisitNote] = useState('');
  const [revisitDate, setRevisitDate] = useState(new Date().toISOString().split('T')[0]); // Default to today YYYY-MM-DD
  const [revisitTime, setRevisitTime] = useState('');
  const [submittingRevisit, setSubmittingRevisit] = useState(false);

  // Debounced search trigger using receptionist visits search API
  useEffect(() => {
    if (!searchTerm.trim()) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const searchCustomers = async () => {
      setLoading(true);
      try {
        const res = await searchRevisitCustomers(searchTerm);
        if (res && res.success && Array.isArray(res.data)) {
          setCustomers(res.data);
        } else {
          setCustomers([]);
        }
      } catch (err) {
        console.error('Failed to search customers:', err);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getLatestVisitDate = (customer: any) => {
    let latestDate: Date | null = null;
    if (customer.leads && Array.isArray(customer.leads)) {
      for (const lead of customer.leads) {
        if (lead.previous_visits && Array.isArray(lead.previous_visits)) {
          for (const visit of lead.previous_visits) {
            if (visit.scheduled_date) {
              const d = new Date(visit.scheduled_date);
              if (!latestDate || d > latestDate) {
                latestDate = d;
              }
            }
          }
        }
      }
    }
    return latestDate ? latestDate.toISOString().split('T')[0] : '';
  };

  const filterByDate = (dateStr: string) => {
    if (!dateStr || !dateFilter) return true;

    const itemDate = new Date(dateStr);
    itemDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'Today') {
      return itemDate.getTime() === today.getTime();
    }

    if (dateFilter === 'This Week') {
      const firstDayOfWeek = new Date(today);
      firstDayOfWeek.setDate(today.getDate() - today.getDay());
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      return itemDate >= firstDayOfWeek && itemDate <= lastDayOfWeek;
    }

    if (dateFilter === 'This Month') {
      return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter === 'This Year') {
      return itemDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter === 'Custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(0, 0, 0, 0);
        return itemDate >= start && itemDate <= end;
      }
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        return itemDate >= start;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(0, 0, 0, 0);
        return itemDate <= end;
      }
    }

    return true;
  };

  const filteredCustomers = customers.filter(cust => {
    const visitDate = getLatestVisitDate(cust);
    return filterByDate(visitDate || cust.createdAt);
  });

  const handleSelectRevisit = (customer: any) => {
    navigate('/receptionist/register-customer', {
      state: {
        revisitCustomer: {
          name: customer.customer_name,
          mobile: customer.mobile_number,
          email: customer.email,
          residential_address: customer.residential_address || '',
          current_residence: customer.current_residence || '',
          budget: customer.budget || '',
          purpose_of_buying: customer.purpose_of_buying || '',
          booking_preferences: customer.booking_preferences || '',
          possession_expectation: customer.possession_expectation || '',
          source_of_project_information: customer.source_of_project_information || '',
        }
      }
    });
  };

  const handleCreateRevisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedLead) {
      toast.error('Customer or lead selection is missing.');
      return;
    }

    setSubmittingRevisit(true);
    try {
      const payload: any = {
        customer_id: selectedCustomer.id,
        lead_id: selectedLead.id,
        project_id: selectedLead.project ? parseInt(selectedLead.project, 10) : undefined,
      };

      if (revisitDate) {
        payload.scheduled_date = revisitDate;
      }
      if (revisitTime) {
        payload.scheduled_time = revisitTime.length === 5 ? `${revisitTime}:00` : revisitTime;
      }
      if (revisitPurpose) {
        payload.purpose = revisitPurpose;
      }
      if (revisitNote.trim()) {
        payload.note = revisitNote.trim();
      }

      const res = await createRevisit(payload);
      if (res && res.success) {
        toast.success(res.message || 'Revisit registered successfully!');
        setShowRevisitModal(false);
        // Refresh the search list
        const searchRes = await searchRevisitCustomers(searchTerm);
        if (searchRes && searchRes.success && Array.isArray(searchRes.data)) {
          setCustomers(searchRes.data);
        }
      } else {
        toast.error(res.message || 'Failed to register revisit.');
      }
    } catch (err: any) {
      console.error('Revisit creation failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to register revisit.');
    } finally {
      setSubmittingRevisit(false);
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col animate-fade-up">
      <style>{`
        @keyframes border-breath {
          0%, 100% {
            border-color: rgba(16, 185, 129, 0.25);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.04);
          }
          50% {
            border-color: rgba(16, 185, 129, 0.85);
            box-shadow: 0 4px 20px 4px rgba(16, 185, 129, 0.22);
          }
        }
        .animate-border-breath {
          animation: border-breath 2s infinite ease-in-out;
        }
      `}</style>
      {/* Header Panel */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
        <button
          onClick={() => navigate('/receptionist/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Customer Revisit</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            Reception Desk &gt; Register Revisit for Existing Customer
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-5 flex flex-col min-h-[450px]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Existing Customers</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Search and select a customer to log their revisit</p>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end relative z-30">
            {/* Search Input */}
            <div className="relative w-full sm:w-[480px] text-left">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-emerald-500 animate-pulse" />
              </span>
              <input
                autoFocus
                type="text"
                placeholder="Search a existed customer name , phone, email.. "
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-emerald-50/10 border-2 rounded-2xl text-xs text-slate-800 placeholder-slate-400/80 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:bg-white font-semibold transition-all duration-200 ${
                  !searchTerm.trim()
                    ? 'animate-border-breath'
                    : 'border-emerald-500/30 hover:border-emerald-500/50 focus:border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.06)] focus:shadow-[0_8px_24px_rgba(16,185,129,0.12)]'
                }`}
              />
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Date Range:</span>
              <CustomSelect
                options={[
                  { value: '', label: 'No Filter (All Time)' },
                  { value: 'Today', label: 'Today' },
                  { value: 'This Week', label: 'This Week' },
                  { value: 'This Month', label: 'This Month' },
                  { value: 'This Year', label: 'This Year' },
                  { value: 'Custom', label: 'Custom Range' },
                ]}
                value={dateFilter}
                onChange={(val) => {
                  setDateFilter(val);
                  if (val !== 'Custom') {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className="w-[140px]"
              />
            </div>

            {/* Conditional Date Pickers */}
            {dateFilter === 'Custom' && (
              <div className="flex items-center gap-1 animate-fade-in text-left">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
                />
                <span className="text-slate-400 text-xs font-bold">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>
            )}

            {(searchTerm || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Customer List Table */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mb-2" />
              <span className="text-slate-500 font-semibold text-sm">Searching customers...</span>
            </div>
          ) : !searchTerm.trim() ? (
            <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-slate-400">
              <span className="text-sm font-bold text-slate-600">Search to retrieve customer details</span>
              <span className="text-xs mt-1 text-slate-400">Enter a customer's name, phone number, or email to begin.</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-slate-400">
              <span className="text-sm font-bold text-slate-600">No existing customers found</span>
              <span className="text-xs mt-1 text-slate-400">Try refining your search keyword or filters.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3.5 px-4 rounded-l-xl">Customer Name</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4">Last Assigned Executive</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  let latestVisit: any = null;
                  let lastExec: any = null;

                  if (cust.leads && Array.isArray(cust.leads)) {
                    for (const lead of cust.leads) {
                      if (lead.last_assigned_executive) {
                        lastExec = lead.last_assigned_executive;
                      }

                      if (lead.previous_visits && Array.isArray(lead.previous_visits)) {
                        for (const visit of lead.previous_visits) {
                          if (!latestVisit) {
                            latestVisit = visit;
                          } else {
                            const d1 = new Date(visit.scheduled_date + 'T' + (visit.scheduled_time || '00:00:00'));
                            const d2 = new Date(latestVisit.scheduled_date + 'T' + (latestVisit.scheduled_time || '00:00:00'));
                            if (d1 > d2) {
                              latestVisit = visit;
                            }
                          }
                          if (!lastExec && visit.assigned_executive) {
                            lastExec = visit.assigned_executive;
                          }
                        }
                      }
                    }
                  }

                  return (
                    <tr key={cust.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition duration-150">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black select-none">
                            {cust.customer_name?.charAt(0) || 'C'}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{cust.customer_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.mobile_number || 'N/A'}</span>
                          </div>
                          {cust.email && (
                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{cust.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {lastExec ? (
                          <div className="space-y-1 text-left">
                            <span className="text-xs font-bold text-slate-700 block">{lastExec.full_name || 'N/A'}</span>
                            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{lastExec.contact_number || 'N/A'}</span>
                            </div>
                            {lastExec.email && (
                              <div className="text-[9px] text-slate-450 font-medium flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5 text-slate-400" />
                                <span>{lastExec.email}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {latestVisit ? (
                          <div className="space-y-1 text-left">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-xs font-bold text-slate-700">
                                {latestVisit.scheduled_date || 'N/A'}
                              </span>
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500">
                              Time: {latestVisit.scheduled_time || 'N/A'}
                            </div>
                            {latestVisit.status_label && (
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                latestVisit.status_label.toLowerCase().includes('check') 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {latestVisit.status_label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No visit history</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col gap-1.5 items-end justify-end">
                          {cust.leads && cust.leads.length > 0 ? (
                            cust.leads.map((lead: any, idx: number) => (
                              <button
                                key={lead.id || idx}
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setSelectedLead(lead);
                                  setRevisitDate(new Date().toISOString().split('T')[0]);
                                  const now = new Date();
                                  const hrs = String(now.getHours()).padStart(2, '0');
                                  const mins = String(now.getMinutes()).padStart(2, '0');
                                  setRevisitTime(`${hrs}:${mins}`);
                                  setRevisitPurpose('Site visit and negotiation');
                                  setRevisitNote('');
                                  setShowRevisitModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition press shadow-xs cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Revisit Lead {lead.project ? `(Proj ${lead.project})` : `#${lead.id}`}</span>
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => handleSelectRevisit(cust)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition press shadow-xs cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Create Lead</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showRevisitModal && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#10B981] to-[#059669] px-5 py-5 text-center text-white relative">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="mx-auto w-10 h-10 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-2">
                  <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
                </div>
                <h3 className="text-base font-bold">Register Customer Revisit</h3>
                <p className="text-[10px] text-emerald-100/80 font-medium mt-0.5">
                  Log a revisit for {selectedCustomer?.customer_name}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateRevisit} className="p-5 space-y-4 text-left">
              {/* Info Card */}
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Lead Information
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  Lead ID: <span className="text-slate-900 font-extrabold">{selectedLead?.lead_id || selectedLead?.id || 'N/A'}</span>
                </div>
                {selectedLead?.project && (
                  <div className="text-xs font-semibold text-slate-700">
                    Project: <span className="text-slate-900 font-extrabold">{selectedLead.project}</span>
                  </div>
                )}
              </div>

              {/* Purpose dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Purpose of Visit
                </label>
                <div className="relative">
                  <select
                    value={revisitPurpose}
                    onChange={(e) => setRevisitPurpose(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all font-semibold text-slate-800 cursor-pointer appearance-none"
                  >
                    <option value="Site visit and negotiation">Site visit and negotiation</option>
                    <option value="Discussion & Booking">Discussion & Booking</option>
                    <option value="Document Submission">Document Submission</option>
                    <option value="Token Payment">Token Payment</option>
                    <option value="Others">Others</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Revisit Date
                  </label>
                  <input
                    type="date"
                    value={revisitDate}
                    onChange={(e) => setRevisitDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Revisit Time
                  </label>
                  <input
                    type="time"
                    value={revisitTime}
                    onChange={(e) => setRevisitTime(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Note field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Additional Notes
                </label>
                <textarea
                  rows={2.5}
                  value={revisitNote}
                  onChange={(e) => setRevisitNote(e.target.value)}
                  placeholder="Wants to check top-floor flat, budget query, etc..."
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowRevisitModal(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition press cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRevisit}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition shadow-[0_4px_12px_rgba(16,185,129,0.2)] text-center flex items-center justify-center gap-1.5 press cursor-pointer"
                >
                  {submittingRevisit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking In...</span>
                    </>
                  ) : (
                    <span>Check-in</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
