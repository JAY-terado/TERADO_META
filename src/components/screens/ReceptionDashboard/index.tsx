import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../CustomSelect';

import { useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { Search, QrCode, UserCheck, Calendar, Clock, LogIn, ChevronRight, Loader2, UserPlus, CheckCircle, History } from 'lucide-react';
import Swal from 'sweetalert2';
import { getVisitsDashboard, type VisitsDashboardResponse, putCompleteVisit } from '../../../pages/api/registercustomer';
import { useReceptionistDashboardQuery } from '../../../receptionist/hooks/useReceptionistQueries';

export const ReceptionDashboard: React.FC = () => {
  const { leads, setActiveScreen, setLeads } = useBrokerConnect();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('recep_searchTerm') || '');
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem('recep_dateFilter') || '');
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('recep_customStartDate') || '');
  const [customEndDate, setCustomEndDate] = useState(() => localStorage.getItem('recep_customEndDate') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('recep_statusFilter') || '');
  const [dashboardData, setDashboardData] = useState<VisitsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('recep_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('recep_itemsPerPage')) || 10);

  // Persist receptionist filters to localStorage
  useEffect(() => {
    localStorage.setItem('recep_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('recep_dateFilter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('recep_customStartDate', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('recep_customEndDate', customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    localStorage.setItem('recep_statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('recep_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('recep_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Keep page within totalPages bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, statusFilter]);

  const dashboardParams = React.useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
    };
    if (dateFilter) {
      params.filter = dateFilter;
      if (dateFilter === 'Custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
    }
    if (searchTerm) {
      params.search = searchTerm;
    }
    if (statusFilter) {
      params.status = statusFilter;
    }
    return params;
  }, [currentPage, itemsPerPage, dateFilter, customStartDate, customEndDate, searchTerm, statusFilter]);

  const {
    data: dashboardQueryRes,
    isLoading: isDashboardQueryLoading,
  } = useReceptionistDashboardQuery(dashboardParams);

  useEffect(() => {
    if (dashboardQueryRes && dashboardQueryRes.success) {
      setDashboardData(dashboardQueryRes);
      if (dashboardQueryRes.pagination) {
        setTotalItems(dashboardQueryRes.pagination.totalItems);
        setTotalPages(dashboardQueryRes.pagination.totalPages);
      } else {
        setTotalItems(dashboardQueryRes.visitors?.length || 0);
        setTotalPages(Math.ceil((dashboardQueryRes.visitors?.length || 0) / itemsPerPage));
      }
    }
  }, [dashboardQueryRes, itemsPerPage]);

  useEffect(() => {
    setLoading(isDashboardQueryLoading);
  }, [isDashboardQueryLoading]);

  const stats = dashboardData?.stats || {
    totalVisits: 0,
    checkedIn: 0,
    remainingCheckIn: 0,
    completed: 0,
    cancelled: 0,
  };

  const visitors = React.useMemo(() => {
    const rawData = dashboardData?.visitors || [];
    return [...rawData].sort((a, b) => {
      const aVal = a.status_label === 'Expected' || a.status_label === 'Scheduled' ? 0 : a.status_label === 'Checked-In' ? 1 : 2;
      const bVal = b.status_label === 'Expected' || b.status_label === 'Scheduled' ? 0 : b.status_label === 'Checked-In' ? 1 : 2;
      return aVal - bVal;
    });
  }, [dashboardData]);

  const handleScanQR = () => {
    // Pick the first expected visitor
    const firstExpected = visitors.find(v => v.status_label === 'Expected');
    if (firstExpected) {
      Swal.fire({
        title: 'Scan QR Success',
        text: `Simulation: QR Code scan success for customer: ${firstExpected.customer?.customer_name || 'N/A'} (Code: ${firstExpected.visit_code})`,
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
      navigate(`/receptionist/checkin/${firstExpected.visit_id}`);
    } else {
      // Fallback to local leads context
      const firstExpectedLead = leads.find(l => l.status === 'OTP Verified');
      if (firstExpectedLead) {
        Swal.fire({
          title: 'Scan QR Success',
          text: `Simulation: QR Code scan success for customer: ${firstExpectedLead.name} (Code: ${firstExpectedLead.visitCode})`,
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
        navigate(`/receptionist/checkin/${firstExpectedLead.id}`);
      } else {
        Swal.fire({
          title: 'Scan QR Error',
          text: 'Simulation: No pending expected visits found to check-in.',
          icon: 'info',
          confirmButtonColor: '#3B82F6'
        });
      }
    }
  };

  const handleStartCheckIn = (leadId: string) => {
    navigate(`/receptionist/checkin/${leadId}`);
  };

  const handleCompleteVisit = (visitId: number | string, customerName: string) => {
    Swal.fire({
      title: 'Confirm Completion',
      text: `Are you sure you want to mark customer ${customerName}'s visit as completed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Complete',
      cancelButtonText: 'No, Cancel',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#94A3B8',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await putCompleteVisit(visitId);
          if (res && res.success) {
            await Swal.fire({
              title: 'Success',
              text: res.message || 'Visit marked as completed successfully.',
              icon: 'success',
              confirmButtonColor: '#10B981'
            });
            setRefreshKey(prev => prev + 1);
          } else {
            await Swal.fire({
              title: 'Error',
              text: res.message || 'Failed to mark visit as completed.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err) {
          console.error("Error completing visit:", err);
          await Swal.fire({
            title: 'Error',
            text: 'An error occurred while completing the visit.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        }
      }
    });
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[450px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-slate-500 font-semibold text-sm">Loading receptionist dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] font-sans">Reception Dashboard</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">
            Manage visitor validation, document uploads, and sales executive allocation on arrival
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => navigate('/receptionist/register-customer')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.25)] cursor-pointer w-full sm:w-auto justify-center press"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Customer</span>
          </button>
          <button
            onClick={() => navigate('/receptionist/register-broker')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(79,70,229,0.15)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.25)] cursor-pointer w-full sm:w-auto justify-center press"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Broker</span>
          </button>
          <button
            onClick={() => navigate('/receptionist/customer-revisit')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(217,119,6,0.15)] hover:shadow-[0_4px_12px_rgba(217,119,6,0.25)] cursor-pointer w-full sm:w-auto justify-center press"
          >
            <History className="w-4 h-4" />
            <span>Customer Revisit</span>
          </button>
          <button
            onClick={handleScanQR}
            className="flex lg:hidden items-center gap-1.5 px-3.5 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-lg font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(26,86,219,0.15)] hover:shadow-[0_4px_12px_rgba(26,86,219,0.25)] cursor-pointer w-full sm:w-auto justify-center press pulse-glow"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QR Code</span>
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up stagger-1 card-hover">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Total Visits</span>
          <span className="text-3xl font-extrabold text-[#0F172A] block mt-1 anim-number stagger-1">
            {stats.totalVisits}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up stagger-2 card-hover">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Checked In</span>
          <span className="text-3xl font-extrabold text-emerald-600 block mt-1 anim-number stagger-2">
            {stats.checkedIn}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up stagger-3 card-hover">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Expected</span>
          <span className="text-3xl font-extrabold text-blue-600 block mt-1 anim-number stagger-3">
            {stats.remainingCheckIn}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up stagger-4 card-hover">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Completed</span>
          <span className="text-3xl font-extrabold text-indigo-600 block mt-1 anim-number stagger-4">
            {stats.completed}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up stagger-5 card-hover">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Cancelled</span>
          <span className="text-3xl font-extrabold text-rose-600 block mt-1 anim-number stagger-5">
            {stats.cancelled}
          </span>
        </div>
      </div>

      {/* Lists Layout */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-5 anim-fade-up stagger-2 flex-1 flex flex-col min-h-[450px]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Expected & Checked-In Visitors</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Validate visitor passes and status logs</p>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end relative z-30">
            {/* Search Input */}
            <div className="relative w-full sm:w-60 text-left">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search by Pass ID, Name, Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-semibold transition-all duration-200"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
              <CustomSelect
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'Scheduled', label: 'Scheduled' },
                  { value: 'Checked-In', label: 'Checked-In' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                className="w-[120px]"
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
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
                />
                <span className="text-slate-400 text-xs font-bold">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
                />
              </div>
            )}

            {(searchTerm || dateFilter || statusFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setStatusFilter('');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="md:hidden space-y-4">
          {visitors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              No matching visitors found for the selected range.
            </div>
          ) : (
            visitors.map((visitor, index) => (
              <div
                key={visitor.visit_id}
                onClick={() => navigate(`/receptionist/checkin/${visitor.visit_id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition flex flex-col gap-3 animate-fade-up cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {visitor.visit_code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1.5">{visitor.customer?.customer_name || 'N/A'}</h4>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{visitor.customer?.mobile_number || 'N/A'}</p>
                  </div>
                  {(() => {
                    const assignedName =
                      visitor.assigned_sales_executive?.full_name ||
                      visitor.assignedExecutive?.full_name ||
                      (typeof visitor.assigned_sales_person === 'string'
                        ? visitor.assigned_sales_person
                        : visitor.assigned_sales_person?.full_name || visitor.assigned_sales_person?.name) ||
                      'Not Assigned';

                    return (
                      <div className="relative group/tooltip inline-block">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          visitor.status_label === 'Checked-In'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                            : visitor.status_label === 'Completed'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                            : visitor.status_label === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                        }`}>
                          {visitor.status_label}
                        </span>

                        {/* Cloud Tooltip Message on Hover */}
                        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-50 min-w-max">
                          <div className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 relative border border-slate-700/60">
                            {visitor.status_label === 'Scheduled' || visitor.status_label === 'Expected' ? (
                              <span>Please do the check in</span>
                            ) : visitor.status_label === 'Checked-In' || visitor.status_label === 'Completed' ? (
                              <span>
                                Assigned Sales Person: <span className="font-bold text-emerald-400">{assignedName}</span>
                              </span>
                            ) : (
                              <span>Status: {visitor.status_label}</span>
                            )}
                            <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-xs text-slate-500">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Pickup Location</span>
                    <span className="font-bold text-slate-700 text-left">
                      {visitor.pickup === 1 ? visitor.pickup_location || 'N/A' : 'No'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Scheduled Time</span>
                    <span className="font-bold text-slate-700">{visitor.scheduled_date} at {visitor.scheduled_time}</span>
                  </div>
                </div>

                {visitor.status_label === 'Scheduled' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartCheckIn(String(visitor.visit_id));
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-xs transition-all shadow-[0_4px_14px_rgba(26,86,219,0.2)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.3)] cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Check In Visitor</span>
                  </button>
                )}


              </div>
            ))
          )}
        </div>

        {/* Expected visitors table (Desktop only) */}
        <div className="hidden md:block overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Visit ID</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Customer Name</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Contact Details</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Pickup Location</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Scheduled Time</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Status</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                      <Search className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-slate-400 text-sm font-medium">No matching visitors found for the selected range.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visitors.map((visitor, index) => (
                  <tr
                    key={visitor.visit_id}
                    onClick={() => navigate(`/receptionist/checkin/${visitor.visit_id}`)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer even:bg-slate-50/30 anim-fade-up"
                  >
                    <td className="py-4 px-4 font-extrabold text-blue-600">{visitor.visit_code}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-slate-800">{visitor.customer?.customer_name || 'N/A'}</td>
                    <td className="py-4 px-4 text-xs text-slate-500 font-medium col-span-1">
                      <div>{visitor.customer?.mobile_number || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{visitor.customer?.email || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-bold">
                      {visitor.pickup === 1 ? (
                        <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {visitor.pickup_location || 'N/A'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">No</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{visitor.scheduled_date} at {visitor.scheduled_time}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const assignedName =
                          visitor.assigned_sales_executive?.full_name ||
                          visitor.assignedExecutive?.full_name ||
                          (typeof visitor.assigned_sales_person === 'string'
                            ? visitor.assigned_sales_person
                            : visitor.assigned_sales_person?.full_name || visitor.assigned_sales_person?.name) ||
                          'Not Assigned';

                        return (
                          <div className="relative group/tooltip inline-block">
                            <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                              visitor.status_label === 'Checked-In'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                : visitor.status_label === 'Completed'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                                : visitor.status_label === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                            }`}>
                              {visitor.status_label}
                            </span>

                            {/* Cloud Tooltip Message on Hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-50 min-w-max">
                              <div className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 relative border border-slate-700/60">
                                {visitor.status_label === 'Scheduled' || visitor.status_label === 'Expected' ? (
                                  <span>Please do the check in</span>
                                ) : visitor.status_label === 'Checked-In' || visitor.status_label === 'Completed' ? (
                                  <span>
                                    Assigned Sales Person: <span className="font-bold text-emerald-400">{assignedName}</span>
                                  </span>
                                ) : (
                                  <span>Status: {visitor.status_label}</span>
                                )}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {visitor.status_label === 'Scheduled' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCheckIn(String(visitor.visit_id));
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-lg font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(26,86,219,0.15)] hover:shadow-[0_4px_12px_rgba(26,86,219,0.25)] cursor-pointer mx-auto shadow-sm"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      ) : visitor.status_label === 'Checked-In' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/receptionist/checkin/${visitor.visit_id}`);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-bold text-xs transition-all shadow-sm bg-white mx-auto cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reassign Sales Person</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && visitors.length > 0 && (
          <div className="py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 bg-slate-50/50 -mx-6 -mb-6 mt-auto">
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
    </div>
  );
};
