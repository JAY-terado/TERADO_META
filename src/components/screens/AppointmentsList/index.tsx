import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../CustomSelect';

import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Calendar, Clock, UserCheck, Phone, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { getVisitsList, type VisitsListResponse, putCompleteVisit } from '../../../pages/api/registercustomer';
import Swal from 'sweetalert2';
import { useReceptionistAppointmentsQuery } from '../../../receptionist/hooks/useReceptionistQueries';

export const AppointmentsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('appts_searchTerm') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('appts_statusFilter') || '');
  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem('appts_dateFilter') || '');
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('appts_customStartDate') || '');
  const [customEndDate, setCustomEndDate] = useState(() => localStorage.getItem('appts_customEndDate') || '');
  const [loading, setLoading] = useState(true);
  const [appointmentsData, setAppointmentsData] = useState<VisitsListResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('appts_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('appts_itemsPerPage')) || 10);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('appts_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('appts_statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('appts_dateFilter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('appts_customStartDate', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('appts_customEndDate', customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    localStorage.setItem('appts_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('appts_itemsPerPage', String(itemsPerPage));
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

  const apptsParams = React.useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
    };
    if (searchTerm) {
      params.search = searchTerm;
    }
    if (statusFilter) {
      params.status = statusFilter;
    }
    if (dateFilter) {
      params.filter = dateFilter;
      if (dateFilter === 'Custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
    }
    return params;
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate]);

  const {
    data: apptsQueryRes,
    isLoading: isApptsQueryLoading,
  } = useReceptionistAppointmentsQuery(apptsParams);

  useEffect(() => {
    if (apptsQueryRes && apptsQueryRes.success) {
      setAppointmentsData(apptsQueryRes);
      if (apptsQueryRes.pagination) {
        setTotalItems(apptsQueryRes.pagination.totalItems);
        setTotalPages(apptsQueryRes.pagination.totalPages);
      } else {
        setTotalItems(apptsQueryRes.data?.length || 0);
        setTotalPages(Math.ceil((apptsQueryRes.data?.length || 0) / itemsPerPage));
      }
    }
  }, [apptsQueryRes, itemsPerPage]);

  useEffect(() => {
    setLoading(isApptsQueryLoading);
  }, [isApptsQueryLoading]);

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

  const appointments = React.useMemo(() => {
    const rawData = appointmentsData?.data || [];
    return [...rawData].sort((a, b) => {
      const aVal = a.status_label === 'Checked-In' ? 0 : a.status_label === 'Scheduled' ? 1 : 2;
      const bVal = b.status_label === 'Checked-In' ? 0 : b.status_label === 'Scheduled' ? 1 : 2;
      return aVal - bVal;
    });
  }, [appointmentsData]);

  return (
    <div className="space-y-6 flex-1 flex flex-col text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] font-sans">Appointment Allocation</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            Reception Desk &gt; Automated Sales Executive Assignment Logs
          </p>
        </div>
        <button
          onClick={() => navigate('/receptionist/dashboard')}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-lg font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(26,86,219,0.1)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-5 anim-fade-up stagger-2 flex-1 flex flex-col min-h-[450px]">
        
        {/* Card Header (Title & Search & Filters) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Visitor Allocation Logs</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All checked-in visitor logs & assigned sales executives</p>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end relative z-30">
            {/* Search Input */}
            <div className="relative w-full sm:w-60 text-left">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search by Pass ID, Customer..."
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
                  { value: 'Checked-In', label: 'Checked-In' },
                  { value: 'Completed', label: 'Completed' },
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
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
              <span className="text-xs text-slate-500 font-semibold">Loading logs...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              No matching records found.
            </div>
          ) : (
            appointments.map((item, index) => (
              <div key={item.visit_id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col gap-3.5" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {item.visit_code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-2">{item.customer?.customer_name || 'N/A'}</h4>
                    <p className="text-xs text-slate-500 font-medium">{item.customer?.mobile_number || 'N/A'}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${
                    item.status_label === 'Checked-In'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : item.status_label === 'Completed'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {item.status_label}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs text-slate-650">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Scheduled</span>
                    <span className="font-bold text-slate-700">{item.scheduled_date} at {item.scheduled_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Check-In Time</span>
                    <span className="font-bold text-slate-700">
                      {item.check_in_time ? new Date(item.check_in_time).toLocaleString() : '—'}
                    </span>
                  </div>
                  {item.assignedExecutive && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 mt-1 space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Executive</span>
                      <div className="text-xs font-bold text-slate-800">{item.assignedExecutive.full_name}</div>
                      <div className="text-[10px] text-slate-555 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {item.assignedExecutive.contact_number}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" /> {item.assignedExecutive.email}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Expected visitors table (Desktop only) */}
        <div className="hidden md:block overflow-x-auto -mx-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-slate-400 text-sm font-semibold">Loading appointments logs...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="py-3 px-4">Visit ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Scheduled Time</th>
                  <th className="py-3 px-4">Check-In Info</th>
                  <th className="py-3 px-4">Assigned Sales Executive</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                        <UserCheck className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-slate-400 text-sm font-medium">No matching appointments found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  appointments.map((item, index) => (
                    <tr key={item.visit_id} style={{ animationDelay: `${index * 0.05}s` }} className="hover:bg-slate-50/60 transition-colors cursor-pointer even:bg-slate-50/30 anim-fade-up">
                      <td className="py-4 px-4 font-extrabold text-blue-600">{item.visit_code}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800 text-sm">{item.customer?.customer_name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{item.customer?.mobile_number || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.scheduled_date}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.scheduled_time}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                        <div className="font-semibold text-slate-700">
                          {item.check_in_time ? new Date(item.check_in_time).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                        <div className="text-[9px] text-slate-400 italic mt-0.5">
                          {item.check_in_method || ''}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {item.assignedExecutive ? (
                          <div>
                            <div className="font-semibold text-slate-800">{item.assignedExecutive.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{item.assignedExecutive.contact_number}</div>
                            <div className="text-[10px] text-slate-450">{item.assignedExecutive.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="relative group/tooltip inline-block">
                          <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            item.status_label === 'Checked-In'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                              : item.status_label === 'Completed'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                          }`}>
                            {item.status_label}
                          </span>

                          {/* Cloud Tooltip Message on Hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-50 min-w-max">
                            <div className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 relative border border-slate-700/60">
                              {item.status_label === 'Scheduled' || item.status_label === 'Expected' ? (
                                <span>Please do the check in</span>
                              ) : item.status_label === 'Checked-In' || item.status_label === 'Completed' ? (
                                <span>
                                  Assigned Sales Person: <span className="font-bold text-emerald-400">{item.assignedExecutive?.full_name || 'Not Assigned'}</span>
                                </span>
                              ) : (
                                <span>Status: {item.status_label}</span>
                              )}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && appointments.length > 0 && (
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
