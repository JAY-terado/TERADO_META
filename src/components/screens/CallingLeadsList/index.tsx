import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../CustomSelect';

import { useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import type { Lead } from '../../../context/BrokerConnectContext';
import { Phone, MessageSquare, Search, RefreshCw, ChevronRight, Mail, ChevronDown, Check, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { StatusChangeModal } from '../../StatusChangeModal';
import { getAssignedCallingLeads, updateLeadActionTaken } from '../../../pages/api/registercustomer';
import { useAssignedCallingLeadsQuery } from '../../../calling/hooks/useCallingQueries';


const mapStatusToActionTaken = (status: string): string => {
  switch (status) {
    case 'Called':
      return 'Called';
    case 'Followup':
    case 'Follow-up':
      return 'Follow-up';
    case 'Visit Scheduled':
      return 'Visit Scheduled';
    case 'Lost':
      return 'Lost';
    case 'Not Interested':
      return 'Not Interested';
    default:
      return 'Called';
  }
};

const convert12HourTo24Hour = (time12: string) => {
  if (!time12) return '';
  const clean = time12.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) return '';
  let [_, hoursStr, minutesStr, ampm] = match;
  let hours = parseInt(hoursStr, 10);
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutesStr}`;
};

export const mapApiLeadToUiLead = (item: any): Lead => {
  const reverseBudgetMap: Record<number, string> = {
    5500000: '₹50L - ₹60L',
    7000000: '₹60L - ₹80L',
    8500000: '₹80L - ₹1Cr',
    11000000: '₹1Cr - ₹1.2Cr',
    13500000: '₹1.2Cr - ₹1.5Cr',
    17500000: '₹1.5Cr - ₹2Cr',
    22500000: '₹2Cr - ₹2.5Cr',
    30000000: '₹2.5Cr+'
  };

  const budgetRaw = item.budget || item.lead_details?.budget || item.customer?.budget;
  const budgetVal = Number(budgetRaw);
  const budgetStr = isNaN(budgetVal) || !budgetRaw ? (typeof budgetRaw === 'string' ? budgetRaw : 'Any budget') : (reverseBudgetMap[budgetVal] || `₹${(budgetVal / 100000).toFixed(0)}L`);

  const createdAtRaw = item.createdAt || item.lead_details?.createdAt || item.assigned_at;
  const regDate = createdAtRaw ? createdAtRaw.split('T')[0] : '';
  const updatedAtRaw = item.updatedAt || item.lead_details?.updatedAt || item.assigned_at;
  const lastCalled = updatedAtRaw ? updatedAtRaw.split('T')[0] : 'Never';

  let mappedStatus: Lead['status'] = 'New';
  const rawStatus = item.status !== undefined ? String(item.status) : '';
  const rawStage = item.lead_details?.stage !== undefined ? String(item.lead_details.stage) : '';
  const rawActionTaken = item.action_taken !== undefined ? String(item.action_taken) : '';
  
  if (rawActionTaken === 'Called') {
    mappedStatus = 'Called';
  } else if (rawActionTaken === 'Follow-up' || rawActionTaken === 'Followup') {
    mappedStatus = 'Followup';
  } else if (rawActionTaken === 'Visit Scheduled') {
    mappedStatus = 'Visit Scheduled';
  } else if (rawActionTaken === 'Lost') {
    mappedStatus = 'Lost';
  } else if (rawActionTaken === 'Not Interested') {
    mappedStatus = 'Not Interested';
  } else if (rawStatus === 'New' || rawStage === '1' || rawStage === '-1' || item.status === 1) {
    mappedStatus = 'New';
  } else if (rawStatus === 'Called' || rawStage === '2' || item.status === 2) {
    mappedStatus = 'Called';
  } else if (rawStatus === 'Followup' || rawStatus === 'Follow-up' || rawStatus === 'Follow-Up' || rawStage === '3' || item.status === 3) {
    mappedStatus = 'Followup';
  } else if (rawStatus === 'Visit Scheduled' || rawStage === '4' || item.status === 4) {
    mappedStatus = 'Visit Scheduled';
  } else if (rawStatus === 'Lost' || rawStage === '5' || item.status === 5) {
    mappedStatus = 'Lost';
  } else if (rawStatus === 'Not Interested' || rawStage === '6' || item.status === 6) {
    mappedStatus = 'Not Interested';
  } else {
    const allowedStatuses = ['OTP Pending', 'OTP Verified', 'Checked In', 'Allocated', 'Follow-Up', 'Negotiation', 'Booked', 'New', 'Called', 'Followup', 'Visit Scheduled', 'Lost', 'Not Interested'];
    if (typeof item.status === 'string' && allowedStatuses.includes(item.status)) {
      let normalized = item.status;
      if (normalized === 'Follow-up' || normalized === 'Follow-Up') {
        normalized = 'Followup';
      }
      mappedStatus = normalized as any;
    }
  }

  const sourceVal = item.source || item.customer?.source || item.lead_details?.source || 'IMPORT';

  return {
    id: String(item.id),
    name: item.customer?.customer_name || item.Customer?.customer_name || 'N/A',
    mobile: item.customer?.mobile_number || item.Customer?.mobile_number || 'N/A',
    email: item.customer?.email || item.Customer?.email || 'N/A',
    city: item.city || item.customer?.city || item.Customer?.city || 'N/A',
    project: item.Project?.project_name || item.customer?.note || 'Sunrise Meadows',
    unitType: item.unit_type || item.lead_details?.unit_type || 'Any config',
    budget: budgetStr,
    expectedDate: item.scheduled_visit_date || item.lead_details?.scheduled_visit_date || '',
    expectedTime: item.scheduled_visit_time || item.lead_details?.scheduled_visit_time || '',
    brokerId: '',
    brokerName: '',
    status: mappedStatus,
    otp: '',
    visitCode: item.lead_details?.lead_code || '',
    registeredOn: regDate,
    ownershipValidTill: '',
    lastActivity: lastCalled,
    visitDate: item.scheduled_visit_date || item.lead_details?.scheduled_visit_date,
    followupTime: item.scheduled_visit_time || item.lead_details?.scheduled_visit_time,
    source: sourceVal as any,
    leadDetailsId: item.lead_id || item.lead_details?.id ? Number(item.lead_id || item.lead_details?.id) : undefined,
  };
};

export const CallingLeadsList: React.FC = () => {
  const { leads, setLeads, updateCallingLead, setActiveScreen, projects } = useBrokerConnect();
  const navigate = useNavigate();
  const [apiLeads, setApiLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('call_list_searchTerm') || '');
  const [openDropdownLeadId, setOpenDropdownLeadId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('call_list_searchTerm', searchTerm);
  }, [searchTerm]);

  const {
    data: assignedLeadsRes,
    isLoading: isLeadsLoading,
  } = useAssignedCallingLeadsQuery();

  useEffect(() => {
    if (assignedLeadsRes && assignedLeadsRes.success && Array.isArray(assignedLeadsRes.data)) {
      const mapped = assignedLeadsRes.data.map(mapApiLeadToUiLead);
      setApiLeads(mapped);
      setLeads(prev => {
        const filtered = prev.filter(l => !mapped.some(ml => ml.id === l.id));
        return [...filtered, ...mapped];
      });
    } else if (assignedLeadsRes) {
      const contextCallingLeads = leads.filter(l => ['New', 'Called', 'Followup', 'Visit Scheduled', 'Lost', 'Not Interested'].includes(l.status));
      setApiLeads(contextCallingLeads);
    }
  }, [assignedLeadsRes]);

  useEffect(() => {
    setLoading(isLeadsLoading);
  }, [isLeadsLoading]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownLeadId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);
  const [selectedLeadForStatusChange, setSelectedLeadForStatusChange] = useState<{
    lead: Lead;
    targetStatus: Lead['status'];
  } | null>(null);

  const handleConfirmStatusChange = (data: {
    notes: string;
    visitDate?: string;
    visitTime?: string;
    pickupRequired?: 'Yes' | 'No';
    pickupPoint?: string;
    projects?: string[];
    unitTypes?: string[];
    budget?: string;
    expectedBookingDuration?: string;
  }) => {
    if (!selectedLeadForStatusChange) return;
    const { lead, targetStatus } = selectedLeadForStatusChange;

    const updatedProject = data.projects ? data.projects.join(', ') : lead.project;
    const filteredUnitTypes = data.unitTypes ? data.unitTypes.filter((ut: string) => ut.trim().toLowerCase() !== 'any config') : [];
    const updatedUnitType = data.unitTypes ? filteredUnitTypes.join(', ') : (lead.unitType && lead.unitType.toLowerCase() !== 'any config' ? lead.unitType : '');
    const updatedBudget = data.budget || lead.budget;
    const updatedExpectedBookingDuration = data.expectedBookingDuration || lead.expectedBookingDuration;

    // 1. Update localStorage notes
    const storedNotes = localStorage.getItem(`notes_${lead.id}`);
    const existingNotes = storedNotes ? JSON.parse(storedNotes) : [];
    const newNote = {
      id: `n_${Date.now()}`,
      text: data.notes,
      timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    localStorage.setItem(`notes_${lead.id}`, JSON.stringify([newNote, ...existingNotes]));

    // 2. Update localStorage activities
    const storedActivities = localStorage.getItem(`activities_${lead.id}`);
    const existingActivities = storedActivities ? JSON.parse(storedActivities) : [];
    let actDesc = `Calling Stage updated from ${lead.status} to ${targetStatus}. Note: ${data.notes}`;
    if (targetStatus === 'Visit Scheduled') {
      actDesc += ` | Visit Date: ${data.visitDate} at ${data.visitTime} | Pickup: ${data.pickupRequired}${data.pickupRequired === 'Yes' ? ` (Point: ${data.pickupPoint})` : ''}`;
      if (data.projects) actDesc += ` | Projects: ${updatedProject}`;
      if (data.unitTypes) actDesc += ` | Unit Types: ${updatedUnitType}`;
      if (data.budget) actDesc += ` | Budget: ${updatedBudget}`;
      if (data.expectedBookingDuration) actDesc += ` | Duration: ${updatedExpectedBookingDuration}`;
    }
    const newAct = {
      id: `a_${Date.now()}`,
      type: 'Stage Update',
      description: actDesc,
      timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    localStorage.setItem(`activities_${lead.id}`, JSON.stringify([newAct, ...existingActivities]));

    // 3. Call updateCallingLead
    updateCallingLead(lead.id, {
      project: updatedProject,
      unitType: updatedUnitType,
      budget: updatedBudget,
      expectedBookingDuration: updatedExpectedBookingDuration,
      expectedDate: data.visitDate || lead.visitDate || lead.expectedDate || '',
      status: targetStatus,
      visitDate: data.visitDate || lead.visitDate,
      expectedTime: data.visitTime || lead.expectedTime,
      followupTime: data.visitTime || lead.followupTime,
      pickupRequired: data.pickupRequired,
      pickupPoint: data.pickupPoint,
      additionalNotes: data.notes,
    });

    setApiLeads(prev => prev.map(l => {
      if (l.id === lead.id) {
        return {
          ...l,
          project: updatedProject,
          unitType: updatedUnitType,
          budget: updatedBudget,
          expectedBookingDuration: updatedExpectedBookingDuration,
          status: targetStatus,
          lastActivity: new Date().toISOString().split('T')[0],
          visitDate: data.visitDate || l.visitDate,
          expectedTime: data.visitTime || l.expectedTime,
          followupTime: data.visitTime || l.followupTime,
          pickupRequired: data.pickupRequired,
          pickupPoint: data.pickupPoint,
          additionalNotes: data.notes,
        };
      }
      return l;
    }));

    const allocationId = lead.id.startsWith('L-') ? 0 : Number(lead.id);
    if (allocationId > 0) {
      const actionTaken = mapStatusToActionTaken(targetStatus);
      const payload: any = {
        action_taken: actionTaken,
        note: data.notes
      };
      if (actionTaken === 'Visit Scheduled') {
        payload.visit_date = data.visitDate || '';
        let timeVal = data.visitTime || '';
        if (timeVal) {
          if (timeVal.toUpperCase().includes('AM') || timeVal.toUpperCase().includes('PM')) {
            timeVal = convert12HourTo24Hour(timeVal);
          }
          if (timeVal.length > 5) {
            timeVal = timeVal.substring(0, 5);
          }
        }
        payload.visit_time = timeVal;
        payload.pickup = data.pickupRequired === 'Yes' ? 1 : 0;
        payload.pickup_location = data.pickupPoint || '';
        const selectedProjectIds = (data.projects || [])
          .map(name => projects.find(p => p.name === name)?.id)
          .filter(Boolean);
        payload.project = selectedProjectIds.join(', ');
        payload.unit_type = filteredUnitTypes.join(', ');
        payload.budget = data.budget || '';
        let durationVal = data.expectedBookingDuration || '';
        if (durationVal.includes(' ')) {
          durationVal = durationVal.split(' ')[0];
        }
        payload.expected_booking_duration = durationVal;
      }

      updateLeadActionTaken(allocationId, payload)
        .then((res) => {
          if (!res || !res.success) {
            console.warn("Failed to update status on server:", res?.message);
          }
        })
        .catch((err) => {
          console.error("Failed to update status on server:", err);
        });
    }

    setSelectedLeadForStatusChange(null);

    Swal.fire({
      title: 'Status Updated',
      text: `Lead status has been changed to ${targetStatus === 'Followup' ? 'Follow-up' : targetStatus}.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });
  };
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('call_list_statusFilter') || '');
  const [sourceFilter, setSourceFilter] = useState(() => localStorage.getItem('call_list_sourceFilter') || '');
  const [dateRangeOption, setDateRangeOption] = useState(() => localStorage.getItem('call_list_dateRangeOption') || 'all');
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('call_list_customStartDate') || '');
  const [customEndDate, setCustomEndDate] = useState(() => localStorage.getItem('call_list_customEndDate') || '');
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('call_list_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('call_list_itemsPerPage')) || 10);

  useEffect(() => {
    localStorage.setItem('call_list_statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('call_list_sourceFilter', sourceFilter);
  }, [sourceFilter]);

  useEffect(() => {
    localStorage.setItem('call_list_dateRangeOption', dateRangeOption);
  }, [dateRangeOption]);

  useEffect(() => {
    localStorage.setItem('call_list_customStartDate', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('call_list_customEndDate', customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    localStorage.setItem('call_list_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('call_list_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);



  // Calling stages definitions
  const stages = ['New', 'Called', 'Followup', 'Visit Scheduled', 'Lost', 'Not Interested'];
  const selectableStages = ['Called', 'Followup', 'Visit Scheduled', 'Lost', 'Not Interested'];

  // Masking helpers
  const maskMobile = (mobile?: string) => {
    if (!mobile) return 'N/A';
    const clean = mobile.replace(/\s+/g, '');
    if (clean.length < 6) return '******';
    return clean.slice(0, 2) + '******' + clean.slice(-2);
  };

  const maskEmail = (email?: string) => {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : local[0] + '***';
    const maskedDomain = domain.length > 3 ? domain[0] + '***' + domain.slice(-2) : domain;
    return `${maskedLocal}@${maskedDomain}`;
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

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSourceFilter('');
    setDateRangeOption('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const isLeadInDateRange = (lead: Lead) => {
    if (dateRangeOption === 'all') return true;

    const leadDateStr = lead.visitDate || lead.expectedDate || lead.registeredOn;
    if (!leadDateStr) return false;

    const leadDate = new Date(leadDateStr);
    leadDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    if (dateRangeOption === 'today') {
      return leadDate.getTime() === today.getTime();
    }
    
    if (dateRangeOption === 'yesterday') {
      return leadDate.getTime() === yesterday.getTime();
    }

    if (dateRangeOption === 'this-week') {
      const currentDay = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return leadDate >= startOfWeek && leadDate <= endOfWeek;
    }

    if (dateRangeOption === 'last-week') {
      const currentDay = today.getDay();
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);

      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);

      return leadDate >= startOfLastWeek && leadDate <= endOfLastWeek;
    }

    if (dateRangeOption === 'this-month') {
      return leadDate.getFullYear() === today.getFullYear() && leadDate.getMonth() === today.getMonth();
    }

    if (dateRangeOption === 'last-month') {
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      return leadDate.getFullYear() === lastMonth.getFullYear() && leadDate.getMonth() === lastMonth.getMonth();
    }

    if (dateRangeOption === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = customEndDate ? new Date(customEndDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) {
        return leadDate >= start && leadDate <= end;
      }
      if (start) {
        return leadDate >= start;
      }
      if (end) {
        return leadDate <= end;
      }
    }

    return true;
  };

  // Filter pipeline leads
  const callingLeads = apiLeads;
  
  const filteredLeads = callingLeads.filter(lead => {
    // Search filter
    const nameMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
    const projectMatch = lead.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSearch = nameMatch || projectMatch;

    // Status filter
    const matchStatus = statusFilter ? lead.status === statusFilter : true;

    // Source filter
    const matchSource = sourceFilter ? lead.source === sourceFilter : true;

    // Date range filter
    const matchDate = isLeadInDateRange(lead);

    return matchSearch && matchStatus && matchSource && matchDate;
  });

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50';
      case 'Called':
        return 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100/50';
      case 'Followup':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50';
      case 'Visit Scheduled':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50';
      case 'Lost':
        return 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50';
      case 'Not Interested':
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/50';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50';
    }
  };

  const filtersActive = searchTerm !== '' || statusFilter !== '' || sourceFilter !== '' || dateRangeOption !== 'all' || customStartDate !== '' || customEndDate !== '';

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sourceFilter, dateRangeOption, customStartDate, customEndDate]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Keep page within totalPages bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="flex-1 flex flex-col space-y-6 text-left">
      {/* Leads Workspace Unified Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col anim-fade-up flex-1 h-full min-h-[450px]">
        
        {/* Title */}
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">My Leads</h2>
        </div>
        
        {/* Unified Table Controls Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-5 border-b border-slate-100 mb-5 w-full">
          {/* Left Side: Filter Options */}
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {/* Calling Stage Select Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block shrink-0">Stage:</span>
              <CustomSelect
                options={[
                  { value: '', label: 'All Stages' },
                  ...stages.map(s => ({ value: s, label: s === 'Followup' ? 'Follow-up' : s }))
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-[140px]"
              />
            </div>

            {/* Source Select Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block shrink-0">Source:</span>
              <CustomSelect
                options={[
                  { value: '', label: 'All Sources' },
                  { value: 'Website', label: 'Website' },
                  { value: 'Broker', label: 'Broker' },
                  { value: 'Facebook', label: 'Facebook' },
                  { value: 'Google', label: 'Google' },
                  { value: 'IMPORT', label: 'IMPORT' }
                ]}
                value={sourceFilter}
                onChange={setSourceFilter}
                className="w-[140px]"
              />
            </div>

            {/* Date Range Options */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block shrink-0">Date Range:</span>
              <CustomSelect
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'this-week', label: 'This Week' },
                  { value: 'last-week', label: 'Last Week' },
                  { value: 'this-month', label: 'This Month' },
                  { value: 'last-month', label: 'Last Month' },
                  { value: 'custom', label: 'Custom Range' }
                ]}
                value={dateRangeOption}
                onChange={setDateRangeOption}
                className="w-[140px] mr-1"
              />

              {/* Conditional custom date picker fields */}
              {dateRangeOption === 'custom' && (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                  <span className="text-slate-400 text-xs font-bold">-</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              )}
            </div>

            {/* Clear Button */}
            {filtersActive && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-850 rounded-lg text-xs font-bold transition duration-150 border border-slate-200 cursor-pointer"
                title="Reset Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right Side: Shifted Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600/30 font-semibold transition-all duration-200"
            />
          </div>
        </div>

        {/* Lead Table Container */}
        <div className="overflow-x-auto -mx-6 flex-1 min-h-[250px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-y border-slate-100">
                <th className="py-3 px-6">Customer</th>
                <th className="py-3 px-4">Contact Number</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">What are they looking for</th>
                <th className="py-3 px-4">Last Contacted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLeads.map((lead, index) => (
                <tr
                  key={lead.id}
                  onClick={() => handleRowClick(lead.id)}
                  style={{ animationDelay: `${index * 0.04}s` }}
                  className={`hover:bg-slate-50/60 transition-colors cursor-pointer anim-fade-up ${
                    openDropdownLeadId === lead.id ? 'relative z-30' : ''
                  }`}
                >
                  {/* Customer Info */}
                  <td className="py-3.5 px-6 font-semibold text-slate-850">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 ring-1 ring-slate-200/50">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-900 text-sm leading-tight">{lead.name}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact Number (masked) */}
                  <td className="py-3.5 px-4 text-xs font-bold text-slate-600">
                    {maskMobile(lead.mobile)}
                  </td>

                  {/* Email (masked) */}
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-500 lowercase tracking-wide">
                    {maskEmail(lead.email)}
                  </td>

                  {/* Source */}
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-bold text-[10px] uppercase">
                      {lead.source || 'Website'}
                    </span>
                  </td>

                  {/* Project preferences */}
                  <td className="py-3.5 px-4 font-semibold text-slate-750">
                    <div className="space-y-0.5">
                      <span className="block font-bold text-slate-800">{lead.project}</span>
                      <span className="block text-[10px] text-slate-450 font-medium">
                        {lead.unitType || 'Any config'} • {lead.budget || 'Any budget'}
                      </span>
                    </div>
                  </td>

                  {/* Activity timestamps */}
                  <td className="py-3.5 px-4 font-semibold whitespace-nowrap text-slate-650">
                    <div className="space-y-0.5 text-[10px]">
                      <span className="block text-slate-400">Created: <strong className="text-slate-600 font-bold">{lead.registeredOn || 'N/A'}</strong></span>
                      <span className="block text-slate-400">Last Called: <strong className="text-slate-600 font-bold">{lead.lastActivity || 'Never'}</strong></span>
                    </div>
                  </td>

                  {/* Direct Dropdown Status Change */}
                  <td className={`py-3.5 px-4 ${openDropdownLeadId === lead.id ? 'relative z-40' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        disabled={lead.status === 'Visit Scheduled'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownLeadId(openDropdownLeadId === lead.id ? null : lead.id);
                        }}
                        className={`pl-2.5 pr-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center justify-between gap-1 w-[120px] focus:outline-none ${getStageBadgeColor(lead.status)} ${lead.status !== 'Visit Scheduled' ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                      >
                        <span className="truncate">{lead.status === 'Followup' ? 'Follow-up' : lead.status}</span>
                        <ChevronDown className="w-3 h-3 text-current opacity-70 shrink-0" />
                      </button>

                      {openDropdownLeadId === lead.id && (
                        <div className="absolute right-0 mt-1 w-[140px] bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100 text-left">
                          {selectableStages.map((s) => {
                            const isSelected = lead.status === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setSelectedLeadForStatusChange({
                                    lead,
                                    targetStatus: s as Lead['status'],
                                  });
                                  setOpenDropdownLeadId(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold transition-colors duration-150 text-left cursor-pointer ${
                                  isSelected 
                                    ? 'bg-orange-50 text-orange-650' 
                                    : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                                }`}
                              >
                                <span className="truncate">{s === 'Followup' ? 'Follow-up' : s}</span>
                                {isSelected && <Check className="w-3 h-3 text-orange-500 stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Communications / Actions */}
                  <td className="py-3.5 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => handleCallSimulate(lead.name, e)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                        title="Call Client"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleWhatsAppSimulate(lead.name, e)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                        title="Send WhatsApp Template"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleMailSimulate(lead.name, e)}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-transparent rounded-lg transition-all duration-150 cursor-pointer shrink-0"
                        title="Compose Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRowClick(lead.id)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-550 border border-slate-200 rounded-lg transition-all duration-155 cursor-pointer shrink-0"
                        title="View requirement card details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4.5 h-4.5 animate-spin text-blue-600" />
                      <span>Loading assigned leads...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No pipeline database records found matching current query.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLeads.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-2">
            {/* Left: Per-page selector */}
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

            {/* Right: Page controls + record count */}
            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
              <span className="text-slate-400 font-semibold">Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeads.length)}–{Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} records</span>
            </div>
          </div>
        )}
      </div>

      {selectedLeadForStatusChange && (
        <StatusChangeModal
          isOpen={true}
          leadId={selectedLeadForStatusChange.lead.id}
          leadName={selectedLeadForStatusChange.lead.name}
          currentStatus={selectedLeadForStatusChange.lead.status}
          targetStatus={selectedLeadForStatusChange.targetStatus}
          onClose={() => setSelectedLeadForStatusChange(null)}
          onConfirm={handleConfirmStatusChange}
          initialProjects={selectedLeadForStatusChange.lead.project ? selectedLeadForStatusChange.lead.project.split(',').map(p => p.trim()) : []}
          initialUnitTypes={selectedLeadForStatusChange.lead.unitType ? selectedLeadForStatusChange.lead.unitType.split(',').map(ut => ut.trim()) : []}
          initialBudget={selectedLeadForStatusChange.lead.budget}
          initialExpectedBookingDuration={selectedLeadForStatusChange.lead.expectedBookingDuration || ''}
        />
      )}
    </div>
  );
};

export default CallingLeadsList;
