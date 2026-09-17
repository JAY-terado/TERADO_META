import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/CustomSelect';

import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { Search, Building, Calendar, ShieldCheck, Loader2, ArrowLeft, Phone, Mail, MapPin, ClipboardList, Layers, UserCheck, ShieldAlert, Clock } from 'lucide-react';
import { getLeads, STAGE_LABELS, STAGE_COLORS } from '../services/leads.service';
import { useLeadsQuery } from '../../hooks/useLeadsQueries';


const getStageTextColor = (stage: number) => {
  switch (stage) {
    case -1: return 'text-amber-600';
    case 0: return 'text-indigo-600';
    case 1: return 'text-blue-600';
    case 2: return 'text-sky-605';
    case 3: return 'text-purple-600';
    case 4: return 'text-emerald-600';
    default: return 'text-slate-600';
  }
};

export const LeadsPage: React.FC = () => {
  const { projects } = useBrokerConnect();
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'timeline'>('status');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('broker_leads_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('broker_leads_itemsPerPage')) || 10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    localStorage.setItem('broker_leads_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('broker_leads_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  // Keep page within totalPages bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const leadParams = React.useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch,
  }), [currentPage, itemsPerPage, debouncedSearch]);

  const { data: leadsRes, isLoading: isLeadsLoading, error: leadsQueryErr, refetch: refetchLeads } = useLeadsQuery(leadParams);

  useEffect(() => {
    if (leadsRes) {
      if (leadsRes.success && leadsRes.data) {
        setLeads(leadsRes.data);
        if (leadsRes.pagination) {
          setTotalItems(leadsRes.pagination.totalItems);
          setTotalPages(leadsRes.pagination.totalPages);
        } else {
          setTotalItems(leadsRes.data.length);
          setTotalPages(Math.ceil(leadsRes.data.length / itemsPerPage));
        }
      } else {
        setError((leadsRes as any)?.message || 'Failed to fetch customer leads');
      }
    }
  }, [leadsRes, itemsPerPage]);

  useEffect(() => {
    setLoading(isLeadsLoading);
  }, [isLeadsLoading]);

  useEffect(() => {
    if (leadsQueryErr) {
      setError((leadsQueryErr as any)?.message || 'An error occurred while fetching customer leads');
    }
  }, [leadsQueryErr]);

  const fetchLeads = async () => {
    await refetchLeads();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Budget helper to parse numeric/string budgets back to text label
  const formatBudget = (budgetValue: any) => {
    if (!budgetValue) return '₹80L - ₹1Cr';
    if (typeof budgetValue === 'string') return budgetValue;
    if (budgetValue === 5500000) return '₹50L - ₹60L';
    if (budgetValue === 7000000) return '₹60L - ₹80L';
    if (budgetValue === 8500000) return '₹80L - ₹1Cr';
    if (budgetValue === 11000000) return '₹1Cr - ₹1.2Cr';
    if (budgetValue === 13500000) return '₹1.2Cr - ₹1.5Cr';
    if (budgetValue === 17500000) return '₹1.5Cr - ₹2Cr';
    if (budgetValue === 22500000) return '₹2Cr - ₹2.5Cr';
    if (budgetValue === 30000000) return '₹2.5Cr+';
    
    if (budgetValue >= 10000000) {
      return `₹${(budgetValue / 10000000).toFixed(1)} Cr`;
    }
    if (budgetValue >= 100000) {
      return `₹${(budgetValue / 100000).toFixed(0)} L`;
    }
    return `₹${budgetValue}`;
  };

  // Scheduled visit time helper (convert 24h to AM/PM)
  const formatVisitTime = (timeStr: string) => {
    if (!timeStr) return '11:00 AM';
    try {
      const [hoursStr, minutesStr] = timeStr.split(':');
      const hours = parseInt(hoursStr, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      return `${displayHours}:${minutesStr} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Ownership expiration helper (defaults to 90 days from creation if not provided)
  const formatOwnershipValidTill = (cust: any) => {
    if (cust.ownership_valid_till) {
      return cust.ownership_valid_till.split('T')[0];
    }
    // Fallback: 90 days from createdAt
    const dateSrc = cust.createdAt || cust.updatedAt || new Date();
    const dateObj = new Date(dateSrc);
    dateObj.setDate(dateObj.getDate() + 90);
    return dateObj.toISOString().split('T')[0];
  };

  const getDaysLeft = (validTillStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(validTillStr);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Expired';
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day left';
      return `${diffDays} days left`;
    } catch {
      return '';
    }
  };

  // Project lookup helper
  const getProjectName = (cust: any) => {
    if (cust.project_detail?.project_name) return cust.project_detail.project_name;
    if (cust.Project?.project_name) return cust.Project.project_name;
    if (cust.Project?.name) return cust.Project.name;
    if (cust.project_name) return cust.project_name;
    
    // Resolve from context projects
    const found = projects.find(p => (p as any).id === cust.project_id || p.name === cust.project_name || (p as any).project_name === cust.project_name);
    if (found) return found.name || (found as any).project_name;
    return 'Sunrise Meadows'; // Fallback
  };

  const renderLeadDetails = (lead: any) => {
    const custName = lead.customer_detail?.customer_name || 'Customer';
    const mobile = lead.customer_detail?.mobile_number || 'N/A';
    const email = lead.customer_detail?.email || 'N/A';
    const city = lead.city || lead.customer_detail?.city || 'Not specified';
    const source = lead.customer_detail?.source || 'Website';
    const projectName = getProjectName(lead);
    const unitType = lead.unit_type || 'Any Config';
    const budget = formatBudget(lead.budget);
    const lockedTill = formatOwnershipValidTill(lead);
    const stageColor = STAGE_COLORS[lead.stage] || 'bg-slate-50 text-slate-700 border border-slate-200';
    const stageLabel = STAGE_LABELS[lead.stage] || 'Not Interested';

    return (
      <div className="flex flex-col flex-1 gap-6 text-left relative">
        <button 
          onClick={() => setSelectedLead(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-xs cursor-pointer mb-2 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Registered Leads</span>
        </button>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
          
          {/* Left Card: Customer Profile Summary */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-3 pb-6 border-b border-slate-50">
                <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-full flex items-center justify-center text-2xl font-black shadow-inner">
                  {custName.charAt(0)}
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-[#0F172A]">{custName}</h3>
                  <span className={`inline-block border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${stageColor}`}>
                    {stageLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-600">
                {/* Centered Customer Bio Header with Decreasing lines */}
                <div className="flex items-center gap-3 w-full my-1">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Customer Bio</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>{mobile}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="break-all">{email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>{city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>Source: <strong className="text-slate-700 font-bold">{source}</strong></span>
                </div>
              </div>

              {/* Centered Requirement Details Header with Decreasing lines */}
              <div className="flex items-center gap-3 w-full pt-4 mt-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Requirement Details</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
              </div>

              {/* Premium, Padded Requirement Details Items */}
              <div className="space-y-3 pt-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <Building className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Project</span>
                    <span className="text-xs font-bold text-slate-800">{projectName || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <Layers className="w-4 h-4 text-teal-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Unit Type</span>
                    <span className="text-xs font-bold text-slate-800">{unitType || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Budget Range</span>
                    <span className="text-xs font-bold text-slate-800">{budget || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Tabs & Details Panel */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex-1 flex flex-col w-full">
              {/* Tabs Selector */}
              <div className="flex border-b border-slate-100 -mx-6 px-6 overflow-x-auto gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider pb-3.5">
                <button
                  onClick={() => setActiveTab('status')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'status' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Status & Verification
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Lead Timeline
                </button>
              </div>

              {/* Tab Contents */}
              <div className="py-6 flex-1 text-left">
                {activeTab === 'status' ? (
                  <div className="space-y-6">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Scheduled Visit</span>
                          <span className="text-xs font-bold text-slate-700">
                            {lead.scheduled_visit_date ? lead.scheduled_visit_date.split('T')[0] : 'No date scheduled'} &middot; {formatVisitTime(lead.scheduled_visit_time)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 border-t border-slate-100/50 pt-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Broker Commission Locking</span>
                          <span className="text-xs font-bold text-slate-700">
                            Ownership locked until <span className="text-emerald-700">{lockedTill}</span> <span className="text-slate-400 font-medium">({getDaysLeft(lockedTill)})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lead Status Breakdown</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Your registered client is currently in the <strong className="text-slate-700 font-semibold">"{stageLabel}"</strong> phase. 
                        Once they visit the sales office, check in with the receptionist, and verify via OTP, the lead will advance through successive stages, locking your commission reward parameters.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Dynamic Timeline Visualizer */
                  <div className="relative pl-6 border-l border-slate-100 space-y-6">
                    {/* Stage 1: Registered */}
                    <div className="relative">
                      <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center text-[8px] font-bold text-blue-600 shadow-sm">✓</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-850">Client Registered</h4>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Date: {lead.createdAt ? lead.createdAt.split('T')[0] : '—'}</span>
                        <p className="text-xs text-slate-500 mt-1">Lead submitted under broker ownership.</p>
                      </div>
                    </div>

                    {/* Stage 2: Verified */}
                    <div className="relative">
                      {lead.stage >= 1 ? (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center text-[8px] font-bold text-blue-600 shadow-sm">✓</span>
                      ) : (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-slate-200 bg-white shadow-sm" />
                      )}
                      <div>
                        <h4 className={`text-xs font-bold ${lead.stage >= 1 ? 'text-slate-850' : 'text-slate-400'}`}>OTP Verified</h4>
                        <p className="text-xs text-slate-500 mt-1">Client has completed telephone verification.</p>
                      </div>
                    </div>

                    {/* Stage 3: Checked In */}
                    <div className="relative">
                      {lead.stage >= 2 ? (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center text-[8px] font-bold text-blue-600 shadow-sm">✓</span>
                      ) : (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-slate-200 bg-white shadow-sm" />
                      )}
                      <div>
                        <h4 className={`text-xs font-bold ${lead.stage >= 2 ? 'text-slate-850' : 'text-slate-400'}`}>Visited Lounge (Checked In)</h4>
                        <p className="text-xs text-slate-500 mt-1">Customer verified check-in presence at project site.</p>
                      </div>
                    </div>

                    {/* Stage 4: Negotiation */}
                    <div className="relative">
                      {lead.stage >= 3 ? (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-blue-600 bg-white flex items-center justify-center text-[8px] font-bold text-blue-600 shadow-sm">✓</span>
                      ) : (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-slate-200 bg-white shadow-sm" />
                      )}
                      <div>
                        <h4 className={`text-xs font-bold ${lead.stage >= 3 ? 'text-slate-850' : 'text-slate-400'}`}>Active Negotiation</h4>
                        <p className="text-xs text-slate-500 mt-1">Pricing discussion initiated by Assigned Sales Executive.</p>
                      </div>
                    </div>

                    {/* Stage 5: Booked */}
                    <div className="relative">
                      {lead.stage === 4 ? (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-emerald-600 bg-white flex items-center justify-center text-[8px] font-bold text-emerald-600 shadow-sm">✓</span>
                      ) : (
                        <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-slate-200 bg-white shadow-sm" />
                      )}
                      <div>
                        <h4 className={`text-xs font-bold ${lead.stage === 4 ? 'text-emerald-700' : 'text-slate-400'}`}>Deal Completed (Booked)</h4>
                        <p className="text-xs text-slate-500 mt-1">Customer booking finalized successfully.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 gap-6 text-left">
      {selectedLead ? (
        renderLeadDetails(selectedLead)
      ) : (
        <>
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">My Registered Leads</h2>
                <p className="text-xs text-slate-400 font-medium">View and track all client registrations under your broker agency</p>
              </div>
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Client Info</th>
                    <th className="py-3.5 px-6">Requirements</th>
                    <th className="py-3.5 px-6">Scheduled Visit</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Ownership Locked Till</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold bg-white">
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Loading registered leads...</span>
                        </span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-red-500 font-semibold bg-white">
                        {error}
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold bg-white">
                        No leads registered yet.
                      </td>
                    </tr>
                  ) : (
                    leads.map(lead => (
                      <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-slate-50/50 transition cursor-pointer">
                        <td className="py-4 px-6">
                          <span className="text-sm font-bold text-slate-800 block">{lead.customer_detail?.customer_name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{lead.customer_detail?.mobile_number} &middot; {lead.customer_detail?.email}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-blue-500" />
                            <span>{getProjectName(lead)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1">{lead.unit_type} &middot; {formatBudget(lead.budget)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lead.scheduled_visit_date ? lead.scheduled_visit_date.split('T')[0] : ''}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{formatVisitTime(lead.scheduled_visit_time)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-xs font-bold ${getStageTextColor(lead.stage)}`}>
                            {STAGE_LABELS[lead.stage] || 'OTP Pending'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col text-left">
                            <div className="flex items-center gap-1 text-emerald-600 font-bold">
                              <ShieldCheck className="w-4 h-4 shrink-0" />
                              <span>{formatOwnershipValidTill(lead)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5 ml-5">
                              {getDaysLeft(formatOwnershipValidTill(lead))}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && leads.length > 0 && (
              <div className="py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <CustomSelect
                    options={['5', '10', '20']}
                    value={String(itemsPerPage)}
                    onChange={(val) => {
                      setItemsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    className="w-24"
                  />
                  <span>records per page</span>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                  <span>Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} records</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LeadsPage;
