import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../CustomSelect';

import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Phone, Calendar, CheckCircle2, UserCheck, Search, Users, Clock, MessageSquare, Mail, Eye, Loader2, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import { getCallingDashboard } from '../../../pages/api/registercustomer';
import type { CallingDashboardData } from '../../../pages/api/registercustomer';
import { useCallingDashboardQuery } from '../../../calling/hooks/useCallingQueries';

const mapDashboardLead = (item: any) => {
  const customer = item.customer || {};
  const leadDetails = item.lead || {};

  // Format dates/times
  const regDate = item.assigned_at ? item.assigned_at.split('T')[0] : '';
  const lastCalled = item.contacted_at ? item.contacted_at.split('T')[0] : 'Never';

  // Resolve project name smartly
  const projectName = (() => {
    if (item.project?.project_name) return item.project.project_name;
    if (item.Project?.project_name) return item.Project.project_name;
    if (leadDetails.Project?.project_name) return leadDetails.Project.project_name;
    if (customer.Project?.project_name) return customer.Project.project_name;

    // Check if the note matches a project name
    const noteText = (customer.note || '').toLowerCase();
    if (noteText.includes('green heights')) return 'Green Heights';
    if (noteText.includes('ocean view')) return 'Ocean View';
    if (noteText.includes('skyline')) return 'Skyline Residences';
    if (noteText.includes('riverfront')) return 'Riverfront Apartments';
    if (noteText.includes('sunrise') || noteText.includes('meadow')) return 'Sunrise Meadows';

    // Fallback if the note itself is a short string, otherwise default
    if (customer.note && customer.note.length < 30) return customer.note;
    return 'Sunrise Meadows';
  })();

  // Resolve source
  const sourceVal = item.source || customer.source || leadDetails.source || 'IMPORT';
  let formattedSource = String(sourceVal);
  if (formattedSource.toLowerCase() === 'facebook') formattedSource = 'Facebook';
  else if (formattedSource.toLowerCase() === 'google') formattedSource = 'Google';
  else if (formattedSource.toLowerCase() === 'broker') formattedSource = 'Broker';
  else if (formattedSource.toLowerCase() === 'website') formattedSource = 'Website';
  else if (formattedSource.toLowerCase() === 'import') formattedSource = 'IMPORT';

  return {
    id: String(item.allocation_id || item.id),
    name: customer.customer_name || 'N/A',
    mobile: customer.mobile_number || 'N/A',
    email: customer.email || 'N/A',
    city: customer.city || 'N/A',
    project: projectName,
    unitType: leadDetails.unit_type || 'Any config',
    budget: leadDetails.budget || 'Any budget',
    registeredOn: regDate,
    lastActivity: lastCalled,
    followupTime: item.scheduled_time || leadDetails.scheduled_visit_time || 'N/A',
    expectedTime: item.scheduled_time || leadDetails.scheduled_visit_time || 'N/A',
    visitDate: item.scheduled_date || leadDetails.scheduled_visit_date || 'N/A',
    expectedDate: item.scheduled_date || leadDetails.scheduled_visit_date || 'N/A',
    status: item.action_taken || 'New',
    assignedExecutive: item.user?.full_name || item.executive?.full_name || '',
    source: formattedSource,
    note: customer.note || '',
  };
};

export const CallingCRM: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('calling_searchTerm') || '');
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem('calling_dateFilter') || '');
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('calling_customStartDate') || '');
  const [customEndDate, setCustomEndDate] = useState(() => localStorage.getItem('calling_customEndDate') || '');
  const [dashboardData, setDashboardData] = useState<CallingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('calling_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('calling_dateFilter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('calling_customStartDate', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('calling_customEndDate', customEndDate);
  }, [customEndDate]);

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const dashboardParams = React.useMemo(() => {
    const params: any = {};
    if (dateFilter) {
      params.filter = dateFilter;
      if (dateFilter === 'Custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
    }
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    return params;
  }, [dateFilter, customStartDate, customEndDate, debouncedSearch]);

  const { data: dashboardRes, isLoading: isDashboardLoading } = useCallingDashboardQuery(dashboardParams);

  useEffect(() => {
    if (dashboardRes?.success && dashboardRes.data) {
      setDashboardData(dashboardRes.data);
    }
  }, [dashboardRes]);

  useEffect(() => {
    setLoading(isDashboardLoading);
  }, [isDashboardLoading]);

  // Masking helpers
  const maskMobile = (mobile?: string) => {
    if (!mobile) return 'N/A';
    const clean = mobile.replace(/\s+/g, '');
    if (clean.length < 6) return '******';
    return clean.slice(0, 2) + '******' + clean.slice(-2);
  };

  const handleRowClick = (leadId: string) => {
    localStorage.setItem('selectedLeadId', leadId);
    navigate(`/calling/leads?id=${leadId}`);
  };

  const handleCallSimulate = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Connecting Call...',
      html: `Dialing masked secure gateway connection for client <strong class="text-blue-600">${name}</strong>.<br/><br/><small class="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Recording session active</small>`,
      icon: 'info',
      confirmButtonText: 'End Call',
      confirmButtonColor: '#EF4444',
      timer: 8000,
      timerProgressBar: true
    });
  };

  const handleWhatsAppSimulate = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Open WhatsApp Gateway',
      html: `Redirecting to WhatsApp web template chat with client <strong class="text-emerald-600">${name}</strong>.<br/><br/><div class="text-left bg-slate-50 p-3 rounded-lg border text-xs text-slate-500 font-medium">"Hello ${name}, regarding your interest logged at BrokerConnect..."</div>`,
      icon: 'success',
      confirmButtonText: 'Launch Chat',
      confirmButtonColor: '#10B981',
      showCancelButton: true
    });
  };

  const handleMailSimulate = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Compose Email Template',
      html: `Preparing secure mail compose draft for client <strong class="text-blue-600">${name}</strong>.<br/><br/><div class="text-left bg-slate-50 p-3 rounded-lg border text-xs text-slate-500 font-medium">"Subject: Update on BrokerConnect Projects<br/>Dear ${name}, following up on your requested unit configuration..."</div>`,
      icon: 'question',
      confirmButtonText: 'Send Email',
      confirmButtonColor: '#1062AC',
      showCancelButton: true
    });
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[450px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-slate-500 font-semibold text-sm">Loading calling desk dashboard...</span>
        </div>
      </div>
    );
  }

  const stats = (dashboardData?.stats || {}) as Record<string, number>;

  const totalNew = stats.new_leads ?? 0;
  const totalCalled = stats.called ?? 0;
  const totalFollowup = stats.follow_up ?? 0;
  const totalVisits = stats["Visit Scheduled"] ?? stats.visit_scheduled ?? 0;

  const filteredFollowupList = (dashboardData?.follow_up?.list || []).map(mapDashboardLead);
  const filteredNonContactedList = (dashboardData?.new_leads?.list || []).map(mapDashboardLead);
  const filteredVisitsTodayList = (dashboardData?.visits_today?.list || []).map(mapDashboardLead);

  return (
    <div className="flex-1 flex flex-col space-y-6 text-left">
      {/* Top Banner with Action */}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row gap-4 items-center justify-between anim-fade-up relative z-30">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-650/30 font-semibold transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-start sm:justify-end">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
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
              className="w-[160px]"
            />
          </div>

          {/* Conditional Date Pickers */}
          {dateFilter === 'Custom' && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-bold">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* KPI 1 — New Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start group anim-fade-up stagger-1 card-hover overflow-hidden">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">New Leads</span>
            <span className="text-3xl font-black text-[#0F172A] tabular-nums tracking-tight block anim-number stagger-1">
              {totalNew}
            </span>
          </div>
          <div className="p-3 bg-blue-50 ring-1 ring-blue-100 group-hover:ring-blue-200 rounded-2xl text-blue-600 transition-all duration-300 group-hover:scale-110 shrink-0 ml-2">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 — Called Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start group anim-fade-up stagger-2 card-hover overflow-hidden">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Called Leads</span>
            <span className="text-3xl font-black text-[#0F172A] tabular-nums tracking-tight block anim-number stagger-2">
              {totalCalled}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 ring-1 ring-emerald-100 group-hover:ring-emerald-200 rounded-2xl text-emerald-600 transition-all duration-300 group-hover:scale-110 shrink-0 ml-2">
            <Phone className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 — Follow-ups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start group anim-fade-up stagger-3 card-hover overflow-hidden">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Follow-ups</span>
            <span className="text-3xl font-black text-[#0F172A] tabular-nums tracking-tight block anim-number stagger-3">
              {totalFollowup}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 ring-1 ring-indigo-100 group-hover:ring-indigo-200 rounded-2xl text-indigo-600 transition-all duration-300 group-hover:scale-110 shrink-0 ml-2">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 — Visits Scheduled */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start group anim-fade-up stagger-4 card-hover overflow-hidden">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Visits Scheduled</span>
            <span className="text-3xl font-black text-[#0F172A] tabular-nums tracking-tight block anim-number stagger-4">
              {totalVisits}
            </span>
          </div>
          <div className="p-3 bg-amber-50 ring-1 ring-amber-100 group-hover:ring-amber-200 rounded-2xl text-amber-600 transition-all duration-300 group-hover:scale-110 shrink-0 ml-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Bottom 3 Cards Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Card 1 — Follow Up Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col anim-fade-up stagger-2 card-hover flex-1 h-full min-h-[400px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/60 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Follow Up</h3>
            </div>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100">
              {filteredFollowupList.length} Leads
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[200px]">
            {filteredFollowupList.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleRowClick(lead.id)}
                className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-xl transition-all duration-200 cursor-pointer flex flex-col gap-2.5 group shadow-xs hover:shadow-sm"
              >
                <div className="flex justify-between items-start gap-2 w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-amber-100/50">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-amber-700 transition-colors">{lead.name}</span>
                      {((lead.project && lead.project !== 'Sunrise Meadows' && lead.project !== 'Sunrise Meadow') ||
                        (lead.unitType && lead.unitType !== 'Any config')) && (
                          <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                            {[
                              lead.project !== 'Sunrise Meadows' && lead.project !== 'Sunrise Meadow' ? lead.project : null,
                              lead.unitType !== 'Any config' ? lead.unitType : null
                            ].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-medium">
                        <span>Created: <strong className="text-slate-500 font-bold">{lead.registeredOn || 'N/A'}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                        <span>Last Called: <strong className="text-slate-500 font-bold">{lead.lastActivity || 'Never'}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-bold border border-amber-100">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{lead.followupTime || lead.expectedTime || 'N/A'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100/70 pt-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleCallSimulate(lead.name, e)}
                      className="p-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleWhatsAppSimulate(lead.name, e)}
                      className="p-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Send WhatsApp Template"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleMailSimulate(lead.name, e)}
                      className="p-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Compose Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleRowClick(lead.id); }}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-[9px] font-bold transition-all duration-155 border border-slate-200/50"
                    title="View Lead Details"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
            {filteredFollowupList.length === 0 && (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">No followups scheduled for today.</div>
            )}
          </div>
        </div>

        {/* Card 2 — Non Registered Leads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col anim-fade-up stagger-3 card-hover flex-1 h-full min-h-[400px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/60 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Phone className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Non registered</h3>
            </div>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100">
              {filteredNonContactedList.length} Leads
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[200px]">
            {filteredNonContactedList.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleRowClick(lead.id)}
                className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-xl transition-all duration-200 cursor-pointer flex flex-col gap-2.5 group shadow-xs hover:shadow-sm"
              >
                <div className="flex justify-between items-start gap-2 w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-blue-100/50">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{lead.name}</span>
                      {((lead.project && lead.project !== 'Sunrise Meadows' && lead.project !== 'Sunrise Meadow') ||
                        (lead.unitType && lead.unitType !== 'Any config')) && (
                          <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                            {[
                              lead.project !== 'Sunrise Meadows' && lead.project !== 'Sunrise Meadow' ? lead.project : null,
                              lead.unitType !== 'Any config' ? lead.unitType : null
                            ].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-medium">
                        <span>Created: <strong className="text-slate-500 font-bold">{lead.registeredOn || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-bold border border-blue-100">
                      {lead.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100/70 pt-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleCallSimulate(lead.name, e)}
                      className="p-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleWhatsAppSimulate(lead.name, e)}
                      className="p-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Send WhatsApp Template"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleMailSimulate(lead.name, e)}
                      className="p-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Compose Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleRowClick(lead.id); }}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-[9px] font-bold transition-all duration-155 border border-slate-200/50"
                    title="View Lead Details"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
            {filteredNonContactedList.length === 0 && (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">All leads have been contacted!</div>
            )}
          </div>
        </div>

        {/* Card 3 — Visit Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col anim-fade-up stagger-4 card-hover flex-1 h-full min-h-[400px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/60 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Visit </h3>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-100">
              {filteredVisitsTodayList.length} Leads
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[200px]">
            {filteredVisitsTodayList.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleRowClick(lead.id)}
                className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-xl transition-all duration-200 cursor-pointer flex flex-col gap-2.5 group shadow-xs hover:shadow-sm"
              >
                <div className="flex justify-between items-start gap-2 w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-emerald-100/50">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{lead.name}</span>
                      {((lead.project && lead.project !== 'Sunrise Meadows' && lead.project !== 'Sunrise Meadow') ||
                        (lead.unitType && lead.unitType !== 'Any config')) && (
                          <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                            {[
                              lead.project !== 'Sunrise Meadows' && lead.project !== 'Sunrise Meadow' ? lead.project : null,
                              lead.unitType !== 'Any config' ? lead.unitType : null
                            ].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-medium">
                        <span>Created: <strong className="text-slate-500 font-bold">{lead.registeredOn || 'N/A'}</strong></span>
                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                        <span>Last Called: <strong className="text-slate-500 font-bold">{lead.lastActivity || 'Never'}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col gap-1 items-end">
                    {lead.assignedExecutive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-bold border border-emerald-100">
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>{lead.assignedExecutive}</span>
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 font-bold">{lead.visitDate || lead.expectedDate || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100/70 pt-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleCallSimulate(lead.name, e)}
                      className="p-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleWhatsAppSimulate(lead.name, e)}
                      className="p-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Send WhatsApp Template"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleMailSimulate(lead.name, e)}
                      className="p-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                      title="Compose Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleRowClick(lead.id); }}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-[9px] font-bold transition-all duration-155 border border-slate-200/50"
                    title="View Lead Details"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
            {filteredVisitsTodayList.length === 0 && (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">No site visits scheduled for today.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


