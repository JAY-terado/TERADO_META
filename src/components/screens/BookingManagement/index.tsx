import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../CustomSelect';
import { CreateBookingModal } from '../../CreateBookingModal';

import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, Landmark, CheckCircle, Building, Search, SlidersHorizontal, Layers, CreditCard, Calendar, Clock } from 'lucide-react';
import { getMyBookings } from '../../../pages/api/projects';

export const BookingManagement: React.FC = () => {
  const { setActiveScreen, projects = [] } = useBrokerConnect();

  // Bookings list states
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [filter, setFilter] = useState<string>(() => localStorage.getItem('bookings_filter') || 'All');
  const [startDate, setStartDate] = useState<string>(() => localStorage.getItem('bookings_startDate') || '');
  const [endDate, setEndDate] = useState<string>(() => localStorage.getItem('bookings_endDate') || '');
  const [searchTerm, setSearchTerm] = useState<string>(() => localStorage.getItem('bookings_searchTerm') || '');
  const [page, setPage] = useState<number>(() => Number(localStorage.getItem('bookings_page')) || 1);
  const [limit, setLimit] = useState<number>(() => Number(localStorage.getItem('bookings_limit')) || 10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Selected booking detail view state
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('bookings_filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('bookings_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('bookings_endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('bookings_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('bookings_page', String(page));
  }, [page]);

  useEffect(() => {
    localStorage.setItem('bookings_limit', String(limit));
  }, [limit]);

  // Keep page within totalPages bounds
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [totalPages, page]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit,
      };

      if (filter !== 'All') {
        params.filter = filter;
      }
      if (filter === 'Custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await getMyBookings(params);
      if (res && res.success && Array.isArray(res.data)) {
        setBookingsList(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalItems(res.pagination.totalItems || res.data.length);
        } else {
          setTotalPages(1);
          setTotalItems(res.data.length);
        }
      } else {
        setError('Failed to fetch bookings list.');
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'An error occurred while fetching bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only refetch custom when both dates are filled or filter changes
    if (filter === 'Custom' && (!startDate || !endDate)) {
      return;
    }
    fetchBookings();
  }, [filter, startDate, endDate, page, limit]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
    setPage(1);
    setStartDate('');
    setEndDate('');
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        const cleanStr = dateString.split('T')[0];
        const parts = cleanStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return cleanStr;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString.split('T')[0];
    }
  };

  // Local client side filtering for search query
  const filteredBookings = bookingsList.filter((b) => {
    const query = searchTerm.toLowerCase();
    const customerName = b.lead?.customer_detail?.customer_name || b.customerName || '';
    const projectName = b.project?.project_name || b.project || '';
    const unitNo = b.unit_number || '';
    return (
      customerName.toLowerCase().includes(query) ||
      projectName.toLowerCase().includes(query) ||
      unitNo.toLowerCase().includes(query)
    );
  });

  if (selectedBooking) {
    const customerName = selectedBooking.lead?.customer_detail?.customer_name || 'N/A';
    const projectName = selectedBooking.project?.project_name || 'N/A';

    return (
      <div className="space-y-6 text-left">
        {/* Header Panel */}
        <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
          <button
            onClick={() => setSelectedBooking(null)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Booking Management</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Sales Desk &gt; Allocate Inventory &amp; Finalize Sale
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Details Panel (Desktop 8 columns) */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6 anim-fade-up stagger-2">
            
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer &amp; Project choice</span>
                <span className="text-sm font-semibold text-slate-800">{customerName} &middot; {projectName}</span>
              </div>
            </div>

            {/* Unit details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
                Unit details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Payment Schedule</label>
                  <input
                    type="text"
                    value={selectedBooking.payment_schedule || selectedBooking.paymentSchedule || selectedBooking.tower || 'N/A'}
                    disabled
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-550 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Floor</label>
                  <input
                    type="text"
                    value={selectedBooking.floor || 'N/A'}
                    disabled
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-550 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Unit No.</label>
                  <input
                    type="text"
                    value={selectedBooking.unit_number || 'N/A'}
                    disabled
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-550 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Financial details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
                Financial details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Booking token Amount (₹)</label>
                  <input
                    type="text"
                    value={selectedBooking.booking_amount || 'N/A'}
                    disabled
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-550 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Total Agreement Value (₹)</label>
                  <input
                    type="text"
                    value={selectedBooking.agreement_value || 'N/A'}
                    disabled
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-550 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-medium text-sm transition-all text-center cursor-pointer press"
              >
                Back to Bookings
              </button>
            </div>
          </div>

          {/* Sidebar Guide Info (Desktop 4 columns) */}
          <div className="hidden lg:block lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4 h-fit anim-fade-up stagger-3">
            <h4 className="text-sm font-bold tracking-wider uppercase text-blue-400">Booking Summary</h4>
            <div className="text-xs text-slate-300 space-y-3 font-medium leading-relaxed">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Date: {formatDate(selectedBooking.booking_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Recorded: {new Date(selectedBooking.createdAt).toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Created By</span>
                <span className="font-bold text-white block mt-0.5">{selectedBooking.createdBy?.full_name || 'Sales Representative'}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{selectedBooking.createdBy?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">My Bookings</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Monitor and review bookings logged by your account
            </p>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-end gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-[0_4px_12px_rgba(26,86,219,0.15)] transition-all cursor-pointer h-[38px] flex items-center"
          >
            Create Booking
          </button>

          <div className="flex flex-col space-y-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeframe</span>
            <CustomSelect
              value={filter}
              onChange={(val) => {
                const fakeEvent = { target: { value: val } } as React.ChangeEvent<HTMLSelectElement>;
                handleFilterChange(fakeEvent);
              }}
              options={[
                { value: 'All', label: 'All Time' },
                { value: 'Today', label: 'Today' },
                { value: 'This Week', label: 'This Week' },
                { value: 'This Month', label: 'This Month' },
                { value: 'This Year', label: 'This Year' },
                { value: 'Custom', label: 'Custom Range' }
              ]}
              className="w-full sm:w-40"
            />
          </div>

          {filter === 'Custom' && (
            <>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bookings List Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-up stagger-2 flex-1 flex flex-col min-h-[450px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A]">Booking Directory</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">Click any booking record to view full inventory and financial setup details</p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Booking ID</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Customer Name</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Project</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Booking Date</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Token Amount</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Agreement Value</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading bookings directory...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-rose-600 font-bold bg-rose-50/50">
                    {error}
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                      <Building className="w-8 h-8 text-slate-300 mb-3" />
                      <p className="text-slate-400 text-sm font-medium">No bookings found matching filters/search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking, index) => {
                  const customerName = booking.lead?.customer_detail?.customer_name || booking.customerName || 'N/A';
                  const projectName = booking.project?.project_name || booking.project || 'N/A';
                  return (
                    <tr 
                      key={booking.id || index} 
                      onClick={() => setSelectedBooking(booking)}
                      style={{ animationDelay: `${index * 0.04}s` }}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer anim-fade-up"
                    >
                      <td className="py-4 px-6 text-sm font-bold text-slate-700">#{booking.id}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-slate-800">{customerName}</td>
                      <td className="py-4 px-6 text-slate-600 font-bold">{projectName}</td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{formatDate(booking.booking_date)}</td>
                      <td className="py-4 px-6 text-slate-800 font-semibold">{formatCurrency(booking.booking_amount)}</td>
                      <td className="py-4 px-6 text-indigo-600 font-bold">{formatCurrency(booking.agreement_value)}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          booking.status === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {booking.status === 1 ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {!loading && filteredBookings.length > 0 && (
          <div className="py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 bg-slate-50/50 -mx-6 -mb-6 mt-auto">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <CustomSelect
                options={['5', '10', '20']}
                value={String(limit)}
                onChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
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
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-600">Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
              <span>Showing {Math.min((page - 1) * limit + 1, totalItems)}–{Math.min(page * limit, totalItems)} of {totalItems} records</span>
            </div>
          </div>
        )}
      </div>
      {isCreateModalOpen && (
        <CreateBookingModal
          isOpen={isCreateModalOpen}
          projects={projects}
          onClose={() => setIsCreateModalOpen(false)}
          onConfirm={() => {
            setIsCreateModalOpen(false);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};
