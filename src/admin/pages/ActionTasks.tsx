import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Search, Loader2, Users, SlidersHorizontal, Info,
  ArrowUpRight, X, FileText, Activity, Send, CheckSquare, Plus
} from 'lucide-react';
import axiosClient from '../../../axiosinstance';
import { CustomSelect } from '../../components/CustomSelect';
import { useSalesUsersQuery } from '../../hooks/useSharedQueries';
import { useActionTasksQuery } from '../hooks/useAdminQueries';
import {
  getSalesLeadDetails,
  addSalesLeadNote,
  createLeadTask,
  updateLeadTaskStatus
} from '../../pages/api/registercustomer';
import Swal from 'sweetalert2';

type TaskStatusTab = 'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETED';

export const ActionTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSales = location.pathname.startsWith('/sales');
  const [salesUserId, setSalesUserId] = useState<string | null>(() => localStorage.getItem('sales_user_id') || null);

  // Active Tab from query param (matching ActionLeads)
  const rawStatus = searchParams.get('status')?.toUpperCase() || 'ALL';
  const activeTab: TaskStatusTab = ['ALL', 'PENDING', 'OVERDUE', 'COMPLETED'].includes(rawStatus) 
    ? (rawStatus as TaskStatusTab) 
    : 'ALL';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // List States
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action Modal State (2 Tabs: Notes and Activity)
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<any | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalTab, setActionModalTab] = useState<'notes' | 'activity'>('notes');
  const [leadDetails, setLeadDetails] = useState<any | null>(null);
  const [leadDetailsLoading, setLeadDetailsLoading] = useState(false);

  // Note form state
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Task form state
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('High');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Fetch sales user ID if in sales role
  useEffect(() => {
    if (isSales && !salesUserId) {
      const fetchProfileId = async () => {
        try {
          const profileRes = await axiosClient.get('/users/profile');
          if (profileRes.data && profileRes.data.success && profileRes.data.data) {
            const uid = String(profileRes.data.data.id);
            setSalesUserId(uid);
            localStorage.setItem('sales_user_id', uid);
          }
        } catch (profileErr) {
          console.error('Failed to fetch user profile for sales ID:', profileErr);
        }
      };
      fetchProfileId();
    }
  }, [isSales, salesUserId]);

  // Debounce search term (300ms timeout)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Sales Executives (only for Admin role) from shared query
  const { data: salesUsersData } = useSalesUsersQuery();
  const executiveOptions = React.useMemo(() => {
    if (isSales) return [];
    return (salesUsersData || []).map((u: any) => ({
      id: String(u.id),
      name: u.name,
    }));
  }, [salesUsersData, isSales]);

  // Tasks Query
  const tasksParams = React.useMemo(() => {
    let salesUserParam: string | undefined = undefined;
    if (isSales) {
      if (salesUserId) salesUserParam = salesUserId;
    } else if (selectedExecutive !== 'All') {
      salesUserParam = selectedExecutive;
    }

    return {
      page: currentPage,
      limit: itemsPerPage,
      status: activeTab,
      search: debouncedSearch || undefined,
      salesUser: salesUserParam,
      priority: selectedPriority !== 'All' ? selectedPriority : undefined,
    };
  }, [currentPage, itemsPerPage, activeTab, debouncedSearch, isSales, salesUserId, selectedExecutive, selectedPriority]);

  const { data: tasksRes, isLoading: isTasksLoading, error: tasksQueryError, refetch: refetchTasks } = useActionTasksQuery(tasksParams);

  useEffect(() => {
    if (tasksRes) {
      const resData = tasksRes;
      let list: any[] = [];
      if (Array.isArray(resData)) {
        list = resData;
      } else if (resData?.data && Array.isArray(resData.data)) {
        list = resData.data;
      } else if (resData?.tasks && Array.isArray(resData.tasks)) {
        list = resData.tasks;
      } else if (resData?.rows && Array.isArray(resData.rows)) {
        list = resData.rows;
      } else if (resData?.result && Array.isArray(resData.result)) {
        list = resData.result;
      }

      const count = resData?.pagination?.totalItems 
        ?? resData?.pagination?.total 
        ?? resData?.count 
        ?? resData?.totalItems 
        ?? resData?.total 
        ?? list.length;

      setTasks(list);
      setTotalItems(count);
      setError(null);
    }
  }, [tasksRes]);

  useEffect(() => {
    setLoading(isTasksLoading);
  }, [isTasksLoading]);

  useEffect(() => {
    if (tasksQueryError) {
      console.error('Failed to fetch tasks details:', tasksQueryError);
      setError((tasksQueryError as any)?.response?.data?.message || (tasksQueryError as any)?.message || 'Failed to load task details.');
    }
  }, [tasksQueryError]);

  const fetchTasks = async () => {
    await refetchTasks();
  };

  const handleTabChange = (tab: TaskStatusTab) => {
    setSearchParams({ status: tab });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const priorityOptions = [
    { value: 'All', label: 'All Priorities' },
    { value: 'HIGH', label: 'High Priority' },
    { value: 'MEDIUM', label: 'Medium Priority' },
    { value: 'LOW', label: 'Low Priority' }
  ];

  // Fetch lead details for Action Modal
  const fetchLeadDetails = async (leadId: string | number) => {
    setLeadDetailsLoading(true);
    try {
      const res = await getSalesLeadDetails(leadId);
      if (res && res.success && res.data) {
        setLeadDetails(res.data);
      } else {
        setLeadDetails(null);
      }
    } catch (err) {
      console.error('Failed to fetch lead details:', err);
      setLeadDetails(null);
    } finally {
      setLeadDetailsLoading(false);
    }
  };

  const handleOpenActionModal = (task: any) => {
    setSelectedTaskForAction(task);
    setIsActionModalOpen(true);
    setActionModalTab('notes');
    setNewNote('');
    setIsCreatingTask(false);

    const leadId = task.lead_id || task.leadId || task.lead?.id || task.id;
    if (leadId) {
      fetchLeadDetails(leadId);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedTaskForAction) return;
    const leadId = selectedTaskForAction.lead_id || selectedTaskForAction.leadId || selectedTaskForAction.lead?.id || selectedTaskForAction.id;
    if (!leadId) return;

    setSubmittingNote(true);
    try {
      const res = await addSalesLeadNote({
        lead_id: Number(leadId),
        note: newNote.trim(),
        contact_status: 1
      });
      if (res && (res.success || res.status)) {
        setNewNote('');
        await fetchLeadDetails(leadId);
        fetchTasks();
      } else {
        Swal.fire({ title: 'Error', text: res?.message || 'Failed to add note', icon: 'error', confirmButtonColor: '#1A56DB' });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({ title: 'Error', text: e.message || 'Failed to add note', icon: 'error', confirmButtonColor: '#1A56DB' });
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskSubject.trim() || !newTaskDueDate || !selectedTaskForAction) return;
    const leadId = selectedTaskForAction.lead_id || selectedTaskForAction.leadId || selectedTaskForAction.lead?.id || selectedTaskForAction.id;
    if (!leadId) return;

    setSubmittingTask(true);
    try {
      const res = await createLeadTask({
        lead_id: Number(leadId),
        task_name: newTaskSubject.trim(),
        note: newTaskNote.trim(),
        due_date: newTaskDueDate,
        repeat: 'none',
        priority: newTaskPriority.toUpperCase(),
        remindercreate: false
      });
      if (res && (res.success || res.status)) {
        setNewTaskSubject('');
        setNewTaskDueDate('');
        setNewTaskNote('');
        setNewTaskPriority('High');
        setIsCreatingTask(false);
        await fetchLeadDetails(leadId);
        fetchTasks();
      } else {
        Swal.fire({ title: 'Error', text: res?.message || 'Failed to create task', icon: 'error', confirmButtonColor: '#1A56DB' });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({ title: 'Error', text: e.message || 'Failed to create task', icon: 'error', confirmButtonColor: '#1A56DB' });
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: number) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await updateLeadTaskStatus(taskId, 2);
      if (res && (res.success || res.status)) {
        const leadId = selectedTaskForAction?.lead_id || selectedTaskForAction?.leadId || selectedTaskForAction?.lead?.id || selectedTaskForAction?.id;
        if (leadId) {
          await fetchLeadDetails(leadId);
        }
        fetchTasks();
      } else {
        Swal.fire({ title: 'Error', text: res?.message || 'Failed to update task status', icon: 'error', confirmButtonColor: '#1A56DB' });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({ title: 'Error', text: 'Failed to update task status', icon: 'error', confirmButtonColor: '#1A56DB' });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(isSales ? '/sales/dashboard' : '/admin/dashboard')}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Action Analytics Tasks List</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span
                onClick={() => navigate(isSales ? '/sales/dashboard' : '/admin/dashboard')}
                className="cursor-pointer hover:underline"
              >
                Dashboard
              </span>
              <span>/</span>
              <span className="font-semibold text-blue-600">Task Analytics Detail</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 self-stretch md:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange('ALL')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            All Tasks
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('PENDING')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'PENDING' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('OVERDUE')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'OVERDUE' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('COMPLETED')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              activeTab === 'COMPLETED' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Filter Options Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span>Filters &amp; Search</span>
        </div>

        <div className={`grid grid-cols-1 ${isSales ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by customer name, mobile, or task..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Sales Executive Filter (Admin only) */}
          {!isSales && (
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
          )}

          {/* Priority Filter */}
          <CustomSelect
            options={priorityOptions}
            value={selectedPriority}
            onChange={(val) => {
              setSelectedPriority(val);
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
                <th className="py-4 px-6">Task Name</th>
                {!isSales && <th className="py-4 px-6">Sales Executive</th>}
                <th className="py-4 px-6">Lead/Customer Name</th>
                <th className="py-4 px-6">Lead/Customer Contact Number</th>
                <th className="py-4 px-6 text-center">Priority</th>
                <th className="py-4 px-6">Created On</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={isSales ? 8 : 9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="font-bold text-slate-500">Fetching task detailed roster...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={isSales ? 8 : 9} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="w-6 h-6 text-rose-400" />
                      <span className="font-bold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={isSales ? 8 : 9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal className="w-8 h-8 text-slate-300" />
                      <span className="font-bold">No matching tasks found.</span>
                      <span className="text-[10px] text-slate-400">Try adjusting your filters or search keywords.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => {
                  const taskTitle = task.task_name || task.name || task.title || 'Follow-up Task';
                  const taskNote = task.task_note || task.note || task.notes;
                  const customerName = task.customer_name || task.customer?.customer_name || task.customer?.name || 'N/A';
                  const mobileNumber = task.customer_mobile_number || task.mobile_number || task.customer?.mobile_number || 'N/A';
                  const executiveVal = task.creator_sales_person_name || task.creator?.full_name || task.created_by_name || task.sales_person_name || 'Sales Executive';
                  const statusLabel = (task.task_status_label || task.status_label || task.status || '').toString().toUpperCase();
                  const statusCode = task.task_status_code ?? task.status_code;
                  const dueDate = task.due_date || task.dueDate;
                  const rawPriority = (task.priority || task.task_priority || '').toString().toUpperCase();
                  const createdDate = task.task_created_at || task.createdAt || task.created_at;

                  let isOverdue = false;
                  if (dueDate) {
                    const due = new Date(dueDate).getTime();
                    if (!isNaN(due) && due < Date.now() && statusLabel !== 'COMPLETED' && statusCode !== 2) {
                      isOverdue = true;
                    }
                  }

                  let badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-100';
                  let badgeText = 'Pending Task';

                  if (statusLabel === 'COMPLETED' || statusCode === 2) {
                    badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                    badgeText = 'Task Completed';
                  } else if (statusLabel === 'OVERDUE' || isOverdue) {
                    badgeStyle = 'bg-rose-50 text-rose-700 border border-rose-100';
                    badgeText = 'Task Overdue';
                  } else if (statusLabel === 'CANCELLED' || statusCode === 0) {
                    badgeStyle = 'bg-slate-100 text-slate-700 border border-slate-200';
                    badgeText = 'Task Cancelled';
                  }

                  return (
                    <tr key={task.task_id || task.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 text-slate-400 font-bold">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{taskTitle}</div>
                        {taskNote && (
                          <div className="text-[11px] font-normal text-slate-500 line-clamp-2 mt-0.5">
                            <span className="font-semibold text-slate-400">Note: </span>
                            {taskNote}
                          </div>
                        )}
                      </td>
                      {!isSales && (
                        <td className="py-4 px-6 text-slate-700 font-bold">
                          {executiveVal}
                        </td>
                      )}
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {customerName}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {mobileNumber}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {rawPriority ? (
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rawPriority === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : rawPriority === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {rawPriority}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">
                        {formatDate(createdDate)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeStyle}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="relative group inline-block">
                          <button
                            type="button"
                            onClick={() => handleOpenActionModal(task)}
                            className="p-2 rounded-xl bg-blue-50/80 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200/80 hover:border-blue-600 transition-all shadow-2xs hover:shadow-xs cursor-pointer inline-flex items-center justify-center"
                            aria-label="Take Action on Task"
                          >
                            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </button>

                          {/* Instant Hover Tooltip */}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 hidden group-hover:flex items-center pointer-events-none z-50 transition-all duration-150 animate-in fade-in zoom-in-95">
                            <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                              Take Action (Notes &amp; Activity)
                            </div>
                            <div className="w-2 h-2 bg-slate-900 rotate-45 -ml-1"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {tasks.length > 0 && (
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
                <span className="px-2 font-bold text-slate-600">
                  Page {currentPage} of {Math.max(1, Math.ceil(totalItems / itemsPerPage))}
                </span>
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

      {/* Modal: Lead Actions with Notes and Activity Tabs */}
      {isActionModalOpen && selectedTaskForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {selectedTaskForAction.customer_name || selectedTaskForAction.customer?.customer_name || selectedTaskForAction.customer?.name || 'Customer Action'}
                  </h3>
                  {selectedTaskForAction.priority && (
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedTaskForAction.priority.toString().toUpperCase() === 'HIGH'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : selectedTaskForAction.priority.toString().toUpperCase() === 'MEDIUM'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {selectedTaskForAction.priority}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
                  <span>📱 {selectedTaskForAction.customer_mobile_number || selectedTaskForAction.mobile_number || selectedTaskForAction.customer?.mobile_number || 'N/A'}</span>
                  <span>•</span>
                  <span>📋 {selectedTaskForAction.task_name || selectedTaskForAction.name || selectedTaskForAction.title || 'Follow-up Task'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-100 px-6 pt-3 gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white">
              <button
                type="button"
                onClick={() => setActionModalTab('notes')}
                className={`pb-3 flex items-center gap-2 transition cursor-pointer border-b-2 ${
                  actionModalTab === 'notes'
                    ? 'text-blue-600 border-blue-600 font-black'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Notes ({leadDetails?.notes?.length ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActionModalTab('activity')}
                className={`pb-3 flex items-center gap-2 transition cursor-pointer border-b-2 ${
                  actionModalTab === 'activity'
                    ? 'text-blue-600 border-blue-600 font-black'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Activity &amp; Tasks ({leadDetails?.tasks?.length ?? 0})</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {leadDetailsLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="font-bold text-xs">Loading lead details...</p>
                </div>
              ) : actionModalTab === 'notes' ? (
                /* Notes Tab */
                <div className="space-y-4">
                  {/* Add Note Form */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 shadow-2xs">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Type action notes or discussion summary here..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[75px] resize-none"
                    ></textarea>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Ringing',
                        'Made a Call with Customer',
                        'Busy / Call back later',
                        'Not Interested',
                        'Wrong Number',
                        'Interested / Visit scheduled'
                      ].map((msg) => (
                        <button
                          key={msg}
                          type="button"
                          onClick={() => setNewNote(msg)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end items-center pt-1">
                      <button
                        type="button"
                        onClick={handleAddNote}
                        disabled={submittingNote || !newNote.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                      >
                        {submittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Add Note</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note History</h4>
                    {leadDetails?.notes && leadDetails.notes.length > 0 ? (
                      leadDetails.notes.map((noteItem: any, index: number) => (
                        <div key={noteItem.id || index} className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0">
                            {String(noteItem?.createdByName || noteItem?.created_by || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="font-bold text-xs text-slate-800">
                                {String(noteItem?.createdByName || noteItem?.created_by || 'Sales User')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {new Date(noteItem?.created_at || noteItem?.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{noteItem?.note}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <p className="text-slate-400 text-xs font-medium">No notes recorded yet for this lead.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Activity / Tasks Tab */
                <div className="space-y-4">
                  {/* Create Task Toggle / Form */}
                  {!isCreatingTask ? (
                    <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Lead Action Tasks</span>
                        <span className="text-[10px] text-slate-400 font-medium">Create follow-ups or manage existing tasks</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreatingTask(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Task</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateTask} className="p-4 bg-slate-50 border border-blue-100 rounded-2xl space-y-3 shadow-2xs">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-blue-700">New Task</span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingTask(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subject / Task Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Call for site visit"
                            value={newTaskSubject}
                            onChange={(e) => setNewTaskSubject(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Due Date *</label>
                          <input
                            type="date"
                            required
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes / Description</label>
                          <input
                            type="text"
                            placeholder="Add brief note..."
                            value={newTaskNote}
                            onChange={(e) => setNewTaskNote(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingTask(false)}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingTask || !newTaskSubject.trim() || !newTaskDueDate}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {submittingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Save Task</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active &amp; Past Tasks</h4>
                    {leadDetails?.tasks && leadDetails.tasks.length > 0 ? (
                      leadDetails.tasks.map((task: any, index: number) => {
                        const isCompleted = task.status === 2 || task.task_status_code === 2 || task.status_code === 2;
                        const isTaskUpdating = updatingTaskId === (task.task_id || task.id);
                        return (
                          <div
                            key={task.task_id || task.id || index}
                            className={`p-3.5 rounded-xl border border-slate-100 bg-white shadow-2xs flex items-start gap-3 transition-all ${
                              isCompleted ? 'opacity-65 bg-slate-50/50' : 'hover:border-slate-200'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {isTaskUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  disabled={isCompleted}
                                  onChange={() => !isCompleted && handleToggleTaskStatus(task.task_id || task.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                  title={isCompleted ? 'Completed' : 'Mark as Completed'}
                                />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h5 className={`text-xs font-bold text-slate-800 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                  {task.task_name || task.name || task.title}
                                </h5>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCompleted ? (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-100">
                                      Pending
                                    </span>
                                  )}
                                  {task.priority && (
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      task.priority.toString().toUpperCase() === 'HIGH'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                        : task.priority.toString().toUpperCase() === 'MEDIUM'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                                    }`}>
                                      {task.priority}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {task.note && (
                                <p className={`text-[11px] text-slate-500 mt-0.5 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                  {task.note}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-semibold mt-1.5">
                                {task.due_date && (
                                  <span>Due: <strong className="text-slate-600">{new Date(task.due_date).toLocaleDateString([], { dateStyle: 'medium' })}</strong></span>
                                )}
                                {task.createdByName && (
                                  <span>By: <strong className="text-slate-600">{task.createdByName}</strong></span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <p className="text-slate-400 text-xs font-medium">No tasks recorded yet for this lead.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionTasksPage;
