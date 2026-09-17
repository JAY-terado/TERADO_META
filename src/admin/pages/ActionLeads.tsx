import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, ChevronLeft, ChevronRight, Users, Building2, SlidersHorizontal, Info } from 'lucide-react';
import axiosClient from '../../../axiosinstance';
import { CustomSelect } from '../../components/CustomSelect';
import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { useSalesUsersQuery } from '../../hooks/useSharedQueries';
import { useActionLeadsQuery } from '../hooks/useAdminQueries';

export const ActionLeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, selectedProjectId } = useBrokerConnect();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab from query param
  const activeTab = searchParams.get('tab') === 'noAction' ? 'noAction' : 'taken';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // List States
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter lists from cached query
  const { data: salesUsersData } = useSalesUsersQuery();
  const executiveOptions = useMemo(() => {
    return (salesUsersData || []).map((u: any) => ({
      id: String(u.id),
      name: u.name,
    }));
  }, [salesUsersData]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Action Leads Query
  const queryParams = useMemo(() => ({
    tab: activeTab as 'taken' | 'noAction',
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch || undefined,
    salesExecutiveId: selectedExecutive,
    projectId: selectedProject !== 'All' ? selectedProject : (selectedProjectId ? String(selectedProjectId) : undefined),
    tag: selectedTag,
  }), [activeTab, currentPage, itemsPerPage, debouncedSearch, selectedExecutive, selectedProject, selectedProjectId, selectedTag]);

  const { data: actionLeadsRes, isLoading: isLeadsLoading, error: leadsQueryError } = useActionLeadsQuery(queryParams);

  useEffect(() => {
    if (actionLeadsRes) {
      const resData = actionLeadsRes;
      let list: any[] = [];
      if (Array.isArray(resData)) {
        list = resData;
      } else if (resData?.data && Array.isArray(resData.data)) {
        list = resData.data;
      } else if (resData?.leads && Array.isArray(resData.leads)) {
        list = resData.leads;
      } else if (resData?.rows && Array.isArray(resData.rows)) {
        list = resData.rows;
      } else if (resData?.result && Array.isArray(resData.result)) {
        list = resData.result;
      }

      const count = resData?.pagination?.totalItems 
        ?? resData?.pagination?.total 
        ?? resData?.count 
        ?? resData?.totalItems 
        ?? list.length;

      setLeads(list);
      setTotalItems(count);
      setError(null);
    }
  }, [actionLeadsRes]);

  useEffect(() => {
    setLoading(isLeadsLoading);
  }, [isLeadsLoading]);

  useEffect(() => {
    if (leadsQueryError) {
      console.error('Failed to fetch action leads details:', leadsQueryError);
      setError((leadsQueryError as any)?.response?.data?.message || (leadsQueryError as any)?.message || 'Failed to load lead details.');
    }
  }, [leadsQueryError]);

  const handleTabChange = (tab: 'taken' | 'noAction') => {
    setSearchParams({ tab });
    setCurrentPage(1);
  };

  // Static tags list
  const tagOptions = [
    { value: 'All', label: 'All Tags' },
    { value: 'Cold', label: 'Cold' },
    { value: 'Warm', label: 'Warm' },
    { value: 'Hot', label: 'Hot' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Dead', label: 'Dead' }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Action Analytics Leads List</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="font-semibold text-blue-600">Action Analytics Detail</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 self-stretch md:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange('taken')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'taken' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            Action Taken
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('noAction')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'noAction' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            No Action Taken
          </button>
        </div>
      </div>

      {/* Filter Options Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span>Filters &amp; Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by customer name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Sales Executive Filter */}
          <CustomSelect
            options={[
              { value: 'All', label: 'All Executives' },
              ...executiveOptions.map(e => ({ value: e.id, label: e.name }))
            ]}
            value={selectedExecutive}
            onChange={(val) => {
              setSelectedExecutive(val);
              setCurrentPage(1);
            }}
            icon={Users}
            className="w-full"
          />

          {/* Tag Filter */}
          <CustomSelect
            options={tagOptions}
            value={selectedTag}
            onChange={(val) => {
              setSelectedTag(val);
              setCurrentPage(1);
            }}
            icon={SlidersHorizontal}
            className="w-full"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="py-4 px-6">Sr. No.</th>
                <th className="py-4 px-6">Customer Name</th>
                <th className="py-4 px-6">Mobile Number</th>
                <th className="py-4 px-6">Tag</th>
                <th className="py-4 px-6">Assigned Executive</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="font-bold text-slate-500">Fetching lead detailed roster...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="w-6 h-6 text-rose-400" />
                      <span className="font-bold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal className="w-8 h-8 text-slate-300" />
                      <span className="font-bold">No matching leads found.</span>
                      <span className="text-[10px] text-slate-400">Try adjusting your filters or search keywords.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((item, idx) => {
                  const customerName = item.customer_detail?.customer_name || item.customer?.customer_name || item.customer_name || item.name || item.full_name || 'N/A';
                  const mobileNumber = item.customer_detail?.mobile_number || item.customer?.mobile_number || item.mobile_number || item.mobile || item.phone || 'N/A';
                  const rawTag = item.tag || item.lead_detail?.tag || item.customer_detail?.tag || '';
                  const tagVal = (!rawTag || rawTag.toLowerCase() === 'general') ? '' : rawTag;
                  const executiveVal = item.assigned_sales_person?.name || item.assignedExecutive || item.customer_detail?.createbyname || item.customer_detail?.creator?.full_name || item.AssignedSalesExecutive?.full_name || 'Sales Executive';

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 text-slate-400 font-bold">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {customerName}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {mobileNumber}
                      </td>
                      <td className="py-4 px-6">
                        {tagVal ? (
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tagVal.toLowerCase() === 'warm' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : tagVal.toLowerCase() === 'cold'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : tagVal.toLowerCase() === 'hot'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : tagVal.toLowerCase() === 'qualified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : tagVal.toLowerCase() === 'dead'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {tagVal}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-bold">
                        {executiveVal}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          activeTab === 'taken'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {activeTab === 'taken' ? 'Action Completed' : 'Pending Action'}
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
        {leads.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 pb-4 bg-slate-50/50">
            {/* Left: per-page selector */}
            <div className="flex items-center gap-2">
              <span>Show</span>
              <CustomSelect
                options={['10', '20', '50', '100']}
                value={String(itemsPerPage)}
                onChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
                className="w-24"
              />
              <span>records per page</span>
            </div>

            {/* Right: page nav + record count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-slate-600">Page {currentPage} of {Math.max(1, Math.ceil(totalItems / itemsPerPage))}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(1, Math.ceil(totalItems / itemsPerPage))))}
                  disabled={currentPage === Math.max(1, Math.ceil(totalItems / itemsPerPage)) || loading}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                >
                  Next
                </button>
              </div>
              <span className="text-slate-400 font-semibold">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} records
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
