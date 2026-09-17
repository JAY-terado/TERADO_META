import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CustomSelect } from '../../CustomSelect';

import { useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { Search, ChevronRight, User, Calendar, Tag, FileText, CheckCircle2, Clock, GripVertical, Plus, X, Layers, Send, Loader2, CheckSquare, Filter, Download, AlertTriangle, ListChecks, UserCheck, UserPlus, Users } from 'lucide-react';
import { getSalesDashboard, putCompleteVisit, createLeadTask, addSalesLeadNote } from '../../../pages/api/registercustomer';
import axiosClient from '../../../../axiosinstance';
import Swal from 'sweetalert2';
import { CreateBookingModal, type CreateBookingData } from '../../CreateBookingModal';
import { AddLeadModal } from '../../AddLeadModal';
import { AddCpModal } from '../../AddCpModal';
import { getUserPermissions, saveUserPermissions } from '../../../pages/api/login';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useUserProfileQuery } from '../../../hooks/useSharedQueries';
import { useSalesAnalyticsQuery } from '../../../sales/hooks/useSalesQueries';


export interface SalesCRMProps {
  viewMode?: 'dashboard' | 'activity' | 'pendingActions';
}

export const SalesCRM: React.FC<SalesCRMProps> = ({ viewMode = 'dashboard' }) => {
  const { updateLeadStage, setActiveScreen, projects, leads, createBooking } = useBrokerConnect();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('sales_searchTerm') || '');
  const [selectedFilterStage, setSelectedFilterStage] = useState<string>(() => localStorage.getItem('sales_selectedFilterStage') || 'All');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(() => localStorage.getItem('sales_selectedProjectFilter') || 'All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'pipeline' | 'activity' | 'noAction'>(() => {
    if (viewMode === 'activity') return 'activity';
    if (viewMode === 'pendingActions') return 'noAction';
    return 'pipeline';
  });

  useEffect(() => {
    if (viewMode === 'activity') {
      setActiveTab('activity');
    } else if (viewMode === 'pendingActions') {
      setActiveTab('noAction');
    } else {
      setActiveTab('pipeline');
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'dashboard') {
      localStorage.setItem('sales_activeTab', activeTab);
    }
  }, [activeTab, viewMode]);

  // Drag & Drop Kanban States
  const [draggedLead, setDraggedLead] = useState<any | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Move to Follow Up Modal States (Tag mandatory; Task & Note optional)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [targetLeadForFollowUp, setTargetLeadForFollowUp] = useState<any | null>(null);
  const [followUpTag, setFollowUpTag] = useState('');
  const [enableTaskCreation, setEnableTaskCreation] = useState(false);
  const [followUpTaskName, setFollowUpTaskName] = useState('');
  const [followUpDueDate, setFollowUpDueDate] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState('High');
  const [followUpTaskStatus, setFollowUpTaskStatus] = useState('Not Started');
  const [followUpTaskDescription, setFollowUpTaskDescription] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [showFollowUpTag, setShowFollowUpTag] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedLeadForBooking, setSelectedLeadForBooking] = useState<any | null>(null);

  // API States
  const [timeFilter, setTimeFilter] = useState(() => localStorage.getItem('sales_timeFilter') || 'This Year');
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('sales_customStartDate') || '');
  const [customEndDate, setCustomEndDate] = useState(() => localStorage.getItem('sales_customEndDate') || '');

  // Tag & Source Filter Popover States
  const [tagFilter, setTagFilter] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tag') || localStorage.getItem('sales_tagFilter') || 'All';
  });
  const [sourceFilter, setSourceFilter] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('source') || localStorage.getItem('sales_sourceFilter') || 'All';
  });

  // Sync state from URL query params if they change
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTag = urlParams.get('tag');
    const urlSource = urlParams.get('source');
    const urlFilter = urlParams.get('filter');
    const urlStart = urlParams.get('startDate');
    const urlEnd = urlParams.get('endDate');

    if (urlTag) setTagFilter(urlTag);
    if (urlSource) setSourceFilter(urlSource);
    if (urlFilter) setTimeFilter(urlFilter);
    if (urlStart) setCustomStartDate(urlStart);
    if (urlEnd) setCustomEndDate(urlEnd);
  }, []);

  // Persist filters to localStorage & update URL query parameters
  useEffect(() => {
    localStorage.setItem('sales_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('sales_selectedFilterStage', selectedFilterStage);
  }, [selectedFilterStage]);

  useEffect(() => {
    localStorage.setItem('sales_selectedProjectFilter', selectedProjectFilter);
  }, [selectedProjectFilter]);

  useEffect(() => {
    localStorage.setItem('sales_timeFilter', timeFilter);
  }, [timeFilter]);

  useEffect(() => {
    localStorage.setItem('sales_customStartDate', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('sales_customEndDate', customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    localStorage.setItem('sales_tagFilter', tagFilter);
  }, [tagFilter]);

  useEffect(() => {
    localStorage.setItem('sales_sourceFilter', sourceFilter);
  }, [sourceFilter]);

  // Keep URL in sync with filters: /sales/dashboard?filter=...&startDate=...&endDate=...&tag=...&source=...
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const leadId = currentParams.get('leadId');

    const searchParams = new URLSearchParams();
    if (leadId) searchParams.set('leadId', leadId);
    if (timeFilter) searchParams.set('filter', timeFilter);
    if (timeFilter === 'Custom' && customStartDate) searchParams.set('startDate', customStartDate);
    if (timeFilter === 'Custom' && customEndDate) searchParams.set('endDate', customEndDate);
    if (tagFilter && tagFilter !== 'All') searchParams.set('tag', tagFilter);
    if (sourceFilter && sourceFilter !== 'All') searchParams.set('source', sourceFilter);

    const newQuery = searchParams.toString();
    const newPath = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
    window.history.replaceState(null, '', newPath);
  }, [timeFilter, customStartDate, customEndDate, tagFilter, sourceFilter]);

  const [stats, setStats] = useState({
    alloted_visits_count: 0,
    visit_completed_count: 0,
    negotiation_count: 0,
    booking_count: 0
  });
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [apiLoading, setApiLoading] = useState(true);

  // No Action Taken states
  const [noActionLeadsList, setNoActionLeadsList] = useState<any[]>([]);
  const [noActionTotalItems, setNoActionTotalItems] = useState(0);
  const [noActionLoading, setNoActionLoading] = useState(false);
  const [salesUserId, setSalesUserId] = useState<string | null>(null);
  const [salesUserName, setSalesUserName] = useState<string>('');

  // Add Lead Modal state & role-based permissions check
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isAddCpModalOpen, setIsAddCpModalOpen] = useState(false);
  const [permissionsState, setPermissionsState] = useState(() => getUserPermissions());

  // Strict check: only show add lead button when can_create_lead === 1
  const canCreateLead = useMemo(() => {
    const perms = permissionsState || getUserPermissions();
    if (!perms) return false;
    return Number(perms.can_create_lead) === 1;
  }, [permissionsState]);

  // Hide Add Lead button on Activity and Pending Actions pages for sales role
  const isActivityOrPendingActions = useMemo(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    return (
      viewMode === 'activity' ||
      viewMode === 'pendingActions' ||
      activeTab === 'activity' ||
      activeTab === 'noAction' ||
      path.includes('/sales/activity') ||
      path.includes('/sales/pending-actions')
    );
  }, [viewMode, activeTab]);

  const showAddLead = canCreateLead && !isActivityOrPendingActions;

  // Strict check: only show add CP button when can_update_broker === 1
  const canUpdateBroker = useMemo(() => {
    const perms = permissionsState || getUserPermissions();
    if (!perms) return false;
    return Number(perms.can_update_broker) === 1;
  }, [permissionsState]);

  const showAddCp = canUpdateBroker && !isActivityOrPendingActions;

  // Mandatory OTP check when is_otp_mandatory_on_lead_creation === 1
  const isOtpMandatory = useMemo(() => {
    const perms = permissionsState || getUserPermissions();
    if (!perms) return false;
    return Number(perms.is_otp_mandatory_on_lead_creation) === 1;
  }, [permissionsState]);

  // Mandatory OTP check when is_otp_mandatory_on_broker_creation === 1
  const isBrokerOtpMandatory = useMemo(() => {
    const perms = permissionsState || getUserPermissions();
    if (!perms) return false;
    return Number(perms.is_otp_mandatory_on_broker_creation) === 1;
  }, [permissionsState]);

  // Kanban Board States
  const [boardLeads, setBoardLeads] = useState<any[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  // Sales Executive Analytics State (/leads/analytics/sales-executive)
  const [salesAnalyticsData, setSalesAnalyticsData] = useState<any>(null);
  const [salesAnalyticsLoading, setSalesAnalyticsLoading] = useState(false);

  // User profile & permissions from shared query
  const { data: userProfileData } = useUserProfileQuery();

  useEffect(() => {
    if (userProfileData) {
      if (userProfileData.id) {
        const uid = String(userProfileData.id);
        setSalesUserId(uid);
        setSalesUserName(userProfileData.full_name || userProfileData.name || '');
      }
      const perms = userProfileData.permissions || userProfileData.user?.permissions;
      if (perms && typeof perms === 'object') {
        saveUserPermissions(perms);
        setPermissionsState(perms);
      }
    }
  }, [userProfileData]);

  // Sales Executive Analytics Query
  const analyticsParams = useMemo(() => ({
    salesUserId,
    timeFilter,
    customStartDate,
    customEndDate,
  }), [salesUserId, timeFilter, customStartDate, customEndDate]);

  const {
    data: salesAnalyticsQueryData,
    isLoading: isSalesAnalyticsLoading,
    refetch: refetchSalesAnalytics,
  } = useSalesAnalyticsQuery(analyticsParams);

  useEffect(() => {
    if (salesAnalyticsQueryData) {
      setSalesAnalyticsData(salesAnalyticsQueryData);
    }
  }, [salesAnalyticsQueryData]);

  useEffect(() => {
    setSalesAnalyticsLoading(isSalesAnalyticsLoading);
  }, [isSalesAnalyticsLoading]);

  const fetchSalesExecutiveAnalytics = async () => {
    await refetchSalesAnalytics();
  };

  // Process Lead Pipeline 3 Stages for Bar Chart
  const execPipelineStats = salesAnalyticsData?.LeadsPipelineStats || salesAnalyticsData?.leadsPipelineStats;
  const execPipelineData = useMemo(() => {
    const assigned = execPipelineStats?.LeadsAssigned ?? execPipelineStats?.leadsAssigned ?? 0;
    const followUp = execPipelineStats?.Leadsonwhichfollowupgettingtook ?? execPipelineStats?.leadsOnWhichFollowUpGettingTook ?? (execPipelineStats as any)?.leadsonwhichfollowupgettingtook ?? 0;
    const booked = execPipelineStats?.LeadsOnwhichBookingDone ?? execPipelineStats?.leadsOnWhichBookingDone ?? (execPipelineStats as any)?.leadsonwhichbookingdone ?? 0;

    return [
      { stage: 'Assigned', count: assigned, color: '#3B82F6' },
      { stage: 'Follow Up', count: followUp, color: '#8B5CF6' },
      { stage: 'Booking Done', count: booked, color: '#10B981' }
    ];
  }, [execPipelineStats]);

  // Process Leads by Sources for Pie/Donut Chart
  const execLeadsDist = salesAnalyticsData?.leadsDistribution || salesAnalyticsData?.LeadsDistribution;
  const execBrokerCount = execLeadsDist?.Leadsfrombroker ?? execLeadsDist?.leadsFromBroker ?? (execLeadsDist as any)?.leadsfrombroker ?? 0;
  const execReferralCount = execLeadsDist?.Leadsfromreferral ?? execLeadsDist?.leadsFromReferral ?? (execLeadsDist as any)?.leadsfromreferral ?? 0;
  const execDirectCount = execLeadsDist?.leadsdirect ?? execLeadsDist?.leadsDirect ?? (execLeadsDist as any)?.LeadsDirect ?? (execLeadsDist as any)?.Leadsdirect ?? 0;
  const execTotalDist = execBrokerCount + execReferralCount + execDirectCount;

  const execSourcesData = useMemo(() => {
    if (execTotalDist === 0) {
      return [
        { name: 'Channel Partner', count: 0, percentage: 0, color: '#3B82F6' },
        { name: 'Direct', count: 0, percentage: 0, color: '#1D4ED8' },
        { name: 'Referral', count: 0, percentage: 0, color: '#60A5FA' }
      ];
    }
    return [
      {
        name: 'Channel Partner',
        count: execBrokerCount,
        percentage: parseFloat(((execBrokerCount / execTotalDist) * 100).toFixed(1)),
        color: '#3B82F6'
      },
      {
        name: 'Direct',
        count: execDirectCount,
        percentage: parseFloat(((execDirectCount / execTotalDist) * 100).toFixed(1)),
        color: '#1D4ED8'
      },
      {
        name: 'Referral',
        count: execReferralCount,
        percentage: parseFloat(((execReferralCount / execTotalDist) * 100).toFixed(1)),
        color: '#60A5FA'
      }
    ];
  }, [execBrokerCount, execDirectCount, execReferralCount, execTotalDist]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900 border border-slate-700/80 text-white px-3.5 py-2.5 rounded-xl shadow-2xl text-left pointer-events-none z-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label || data.name}</p>
          <p className="text-sm font-black text-white mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.payload?.color || '#3B82F6' }}></span>
            <span>{data.value} <span className="text-xs font-semibold text-slate-300">Leads</span></span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900 border border-slate-700/80 text-white px-3.5 py-2.5 rounded-xl shadow-2xl text-left pointer-events-none z-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{data.name}</p>
          <p className="text-sm font-black text-white mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.payload?.color || '#3B82F6' }}></span>
            <span>{data.value} <span className="text-xs font-semibold text-slate-300">Leads ({data.payload?.percentage ?? 0}%)</span></span>
          </p>
        </div>
      );
    }
    return null;
  };

  const fetchBoardData = async () => {
    if (timeFilter === 'Custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    setBoardLoading(true);
    try {
      const params: any = {
        filter: timeFilter,
        page: 1,
        limit: 600,
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (timeFilter === 'Custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      if (tagFilter && tagFilter !== 'All') {
        params.tag = tagFilter;
      }
      if (sourceFilter && sourceFilter !== 'All') {
        params.source = sourceFilter;
      }

      const res = await getSalesDashboard(params);
      if (res && res.success && res.data) {
        setBoardLeads(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sales board data:', err);
    } finally {
      setBoardLoading(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('sales_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('sales_itemsPerPage')) || 10);

  useEffect(() => {
    localStorage.setItem('sales_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('sales_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    Swal.fire({
      title: 'Exporting Leads',
      text: 'Requesting download from the server, please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const typeParam = format === 'xlsx' ? 'excel' : 'csv';
      let url = `/leads?type=${typeParam}`;
      if (searchTerm) {
        url += `&Search=${encodeURIComponent(searchTerm)}`;
      }
      if (timeFilter) {
        url += `&filter=${encodeURIComponent(timeFilter)}`;
        if (timeFilter === 'Custom') {
          if (customStartDate) url += `&start_date=${customStartDate}`;
          if (customEndDate) url += `&end_date=${customEndDate}`;
        }
      }
      if (tagFilter && tagFilter !== 'All') {
        url += `&tag=${encodeURIComponent(tagFilter)}`;
      }
      if (sourceFilter && sourceFilter !== 'All') {
        url += `&source=${encodeURIComponent(sourceFilter)}`;
      }

      const response = await axiosClient.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;'
      });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `sales_leads_export_${new Date().toISOString().split('T')[0]}.${format}`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      Swal.fire({
        title: 'Export Completed',
        text: 'Successfully downloaded lead records from server.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      Swal.fire({
        title: 'Export Failed',
        text: err.message || 'An error occurred during lead export.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportClick = () => {
    Swal.fire({
      title: 'Export Leads Data',
      text: 'Select your preferred format to export leads matching current search/filters.',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'CSV Format',
      denyButtonText: 'Excel Spreadsheet',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3B82F6',
      denyButtonColor: '#10B981',
      cancelButtonColor: '#6B7280'
    }).then((result) => {
      if (result.isConfirmed) {
        handleExport('csv');
      } else if (result.isDenied) {
        handleExport('xlsx');
      }
    });
  };

  const fetchNoActionLeads = async () => {
    setNoActionLoading(true);
    try {
      let currentSalesUserId = salesUserId;
      if (!currentSalesUserId) {
        try {
          const profileRes = await axiosClient.get('/users/profile');
          if (profileRes.data && profileRes.data.success && profileRes.data.data) {
            const uid = String(profileRes.data.data.id);
            setSalesUserId(uid);
            currentSalesUserId = uid;
          }
        } catch (profileErr) {
          console.error('Failed to fetch user profile for ID:', profileErr);
        }
      }

      const params: any = {
        page: currentPage,
        limit: itemsPerPage
      };
      if (currentSalesUserId) {
        params.sales_executive_id = currentSalesUserId;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (selectedProjectFilter && selectedProjectFilter !== 'All') {
        params.project_id = selectedProjectFilter;
      }
      if (tagFilter && tagFilter !== 'All') {
        params.tag = tagFilter;
      }
      const res = await axiosClient.get('/leads/analytics/no-action', { params });
      const resData = res.data;
      let list: any[] = [];
      if (Array.isArray(resData)) {
        list = resData;
      } else if (resData?.data && Array.isArray(resData.data)) {
        list = resData.data;
      } else if (resData?.data?.data && Array.isArray(resData.data.data)) {
        list = resData.data.data;
      } else if (resData?.leads && Array.isArray(resData.leads)) {
        list = resData.leads;
      } else if (resData?.rows && Array.isArray(resData.rows)) {
        list = resData.rows;
      } else if (resData?.result && Array.isArray(resData.result)) {
        list = resData.result;
      }

      const count = resData?.data?.pagination?.totalItems
        ?? resData?.pagination?.totalItems 
        ?? resData?.pagination?.total 
        ?? resData?.count 
        ?? resData?.totalItems 
        ?? list.length;

      setNoActionLeadsList(list);
      setNoActionTotalItems(count);
    } catch (err) {
      console.error('Failed to fetch salesperson no-action leads:', err);
    } finally {
      setNoActionLoading(false);
    }
  };

  const fetchSalesData = async () => {
    if (timeFilter === 'Custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    setApiLoading(true);
    try {
      const params: any = {
        filter: timeFilter,
      };
      if (viewMode !== 'activity') {
        params.page = currentPage;
        params.limit = itemsPerPage;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (timeFilter === 'Custom') {
        params.startDate = customStartDate;
      }
      if (timeFilter === 'Custom') {
        params.endDate = customEndDate;
      }
      if (tagFilter && tagFilter !== 'All') {
        params.tag = tagFilter;
      }
      if (sourceFilter && sourceFilter !== 'All') {
        params.source = sourceFilter;
      }

      const res = await getSalesDashboard(params);
      if (res && res.success && res.data) {
        const resolvedStats = res.data.stats ? {
          alloted_visits_count: res.data.stats.alloted_visits_count ?? 0,
          visit_completed_count: res.data.stats.visit_completed_count ?? 0,
          negotiation_count: res.data.stats.negotiationLeads ?? res.data.stats.negotiation_count ?? 0,
          booking_count: res.data.stats.bookedLeads ?? res.data.stats.booking_count ?? 0
        } : {
          alloted_visits_count: 0,
          visit_completed_count: 0,
          negotiation_count: 0,
          booking_count: 0
        };
        setStats(resolvedStats);

        setRawLeads(res.data.data || []);
        if (res.data.pagination) {
          setTotalItems(res.data.pagination.totalItems);
        } else {
          setTotalItems(res.data.data?.length || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sales dashboard data:', err);
    } finally {
      setApiLoading(false);
    }

    // Trigger board data refresh
    if (activeTab === 'activity' || viewMode === 'activity') {
      fetchBoardData();
    }
  };

  useEffect(() => {
    fetchSalesData();
    if (viewMode === 'activity' || activeTab === 'activity') {
      fetchBoardData();
    }
    if (activeTab === 'noAction') {
      fetchNoActionLeads();
    }
  }, [viewMode, activeTab, timeFilter, customStartDate, customEndDate, tagFilter, sourceFilter, currentPage, itemsPerPage, searchTerm, selectedProjectFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilterStage, searchTerm, timeFilter, customStartDate, customEndDate, activeTab, selectedProjectFilter]);

  const getStageBadgeColor = (status: string) => {
    switch (status) {
      case 'Booked':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Negotiation':
        return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'Assigned':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Not Interested':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-100';
    }
  };

  const getTagBadgeColor = (tag: string | null) => {
    if (!tag) return 'bg-slate-50 text-slate-600 border border-slate-200';
    const normalizedTag = tag.trim().toLowerCase();
    switch (normalizedTag) {
      case 'hot':
        return 'bg-rose-50 text-rose-700 border border-rose-200/80';
      case 'warm':
        return 'bg-amber-50 text-amber-700 border border-amber-200/80';
      case 'cold':
        return 'bg-sky-50 text-sky-700 border border-sky-200/80';
      case 'qualified':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
      case 'dead':
        return 'bg-slate-100 text-slate-600 border border-slate-300/80';
      default:
        return 'bg-purple-50 text-purple-700 border border-purple-100';
    }
  };

  // Map API lead to unified UI structure
  const mapLeadItem = (item: any) => {
    let projIdStr = '';
    if (item.lead_detail?.project) {
      projIdStr = Array.isArray(item.lead_detail.project)
        ? String(item.lead_detail.project[0] || '')
        : String(item.lead_detail.project);
    }
    const matchedProj = projects.find(p => String(p.id) === projIdStr);

    // Status text mapping
    let statusText = 'Registered';
    if (item.lead_status === 1) statusText = 'Assigned';
    else if (item.lead_status === 2) statusText = 'Assigned';
    else if (item.lead_status === 3) statusText = 'Negotiation';
    else if (item.lead_status === 4) statusText = 'Booked';
    else if (item.lead_status === 0) statusText = 'Not Interested';

    const rawSource = item.customer?.source || item.customer_detail?.source || item.source || '-';
    const rawTag = item.tag || item.lead_detail?.tag || item.customer_detail?.tag || null;
    const rawNote = item.note || item.lead_detail?.note || item.customer?.note || null;
    const hasTag = Boolean(rawTag && String(rawTag).trim() !== '' && rawTag !== 'null');
    const hasNote = Boolean(rawNote && String(rawNote).trim() !== '' && rawNote !== '-' && rawNote !== 'null');
    const hasTask = Boolean((Array.isArray(item.tasks) && item.tasks.length > 0) || (Array.isArray(item.lead_detail?.tasks) && item.lead_detail.tasks.length > 0) || item.task);
    const isFollowUpQualified = Boolean(item.lead_status === 3 && hasTag && (hasNote || hasTask));

    return {
      id: String(
        (typeof item.lead_id === 'number' && item.lead_id) ||
        item.visitAllocations?.[0]?.lead_id ||
        (item.id && !isNaN(Number(item.id)) ? item.id : null) ||
        item.lead_id
      ),
      visitId: item.visit_detail?.id || item.visit_details?.[0]?.id || item.visit_id || item.visitId || item.visitAllocations?.[0]?.visit_id,
      name: item.customer?.customer_name || item.customer_detail?.customer_name || 'N/A',
      mobile: item.customer?.mobile_number || item.customer_detail?.mobile_number || 'N/A',
      project: (Array.isArray(item.project_details) && item.project_details[0]?.project_name) ||
        (Array.isArray(item.lead_detail?.project_details) && item.lead_detail.project_details[0]?.project_name) ||
        matchedProj?.name || item.Project?.project_name || item.lead_detail?.Project?.project_name || '-',
      note: item.customer?.note || item.lead_detail?.note || '-',
      source: rawSource,
      tag: rawTag,
      isFollowUpQualified,
      assignedExecutive: item.assignedExecutive || 'Executive',
      status: statusText,
      lead_status: item.lead_status,
      stage: item.lead_detail?.stage ?? item.stage ?? item.lead_status,
      lastActivity: item.timestamp ? item.timestamp.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : 'N/A'),
      rawItem: item
    };
  };

  const mappedLeads = rawLeads.map(mapLeadItem);
  const mappedNoActionLeads = noActionLeadsList.map(mapLeadItem);

  // Filter based on selected stage tab
  const activeStageLeads = (() => {
    if (selectedFilterStage === 'All') return mappedLeads;
    if (selectedFilterStage === 'Registered') return mappedLeads.filter(l => l.lead_status === 1);
    if (selectedFilterStage === 'Visited') return mappedLeads.filter(l => l.lead_status === 2);
    if (selectedFilterStage === 'Negotiation') return mappedLeads.filter(l => l.lead_status === 3);
    if (selectedFilterStage === 'Booked') return mappedLeads.filter(l => l.lead_status === 4);
    return mappedLeads;
  })();

  // Filter based on search term and project
  const filteredLeads = activeStageLeads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.mobile.includes(searchTerm) ||
      lead.assignedExecutive?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProjectFilter === 'All' || lead.project === selectedProjectFilter;
    return matchesSearch && matchesProject;
  });

  // Map boardLeads to unified UI structure for Kanban Board
  const boardMappedLeads = boardLeads.map((item: any) => {
    let projIdStr = '';
    if (item.lead_detail?.project) {
      projIdStr = Array.isArray(item.lead_detail.project)
        ? String(item.lead_detail.project[0] || '')
        : String(item.lead_detail.project);
    }
    const matchedProj = projects.find(p => String(p.id) === projIdStr);

    // Status text mapping
    let statusText = 'Registered';
    if (item.lead_status === 1) statusText = 'Assigned';
    else if (item.lead_status === 2) statusText = 'Assigned';
    else if (item.lead_status === 3) statusText = 'Negotiation';
    else if (item.lead_status === 4) statusText = 'Booked';
    else if (item.lead_status === 0) statusText = 'Not Interested';

    const rawSource = item.customer?.source || item.customer_detail?.source || item.source || '-';
    const rawTag = item.tag || item.lead_detail?.tag || item.customer_detail?.tag || null;
    const rawNote = item.note || item.lead_detail?.note || item.customer?.note || null;
    const hasTag = Boolean(rawTag && String(rawTag).trim() !== '' && rawTag !== 'null');
    const hasNote = Boolean(rawNote && String(rawNote).trim() !== '' && rawNote !== '-' && rawNote !== 'null');
    const hasTask = Boolean((Array.isArray(item.tasks) && item.tasks.length > 0) || (Array.isArray(item.lead_detail?.tasks) && item.lead_detail.tasks.length > 0) || item.task);
    const isFollowUpQualified = Boolean(item.lead_status === 3 && hasTag && (hasNote || hasTask));

    return {
      id: String(item.lead_id || item.id),
      visitId: item.visit_detail?.id,
      name: item.customer?.customer_name || item.customer_detail?.customer_name || 'N/A',
      mobile: item.customer?.mobile_number || item.customer_detail?.mobile_number || 'N/A',
      project: (Array.isArray(item.project_details) && item.project_details[0]?.project_name) ||
        (Array.isArray(item.lead_detail?.project_details) && item.lead_detail.project_details[0]?.project_name) ||
        matchedProj?.name || item.Project?.project_name || item.lead_detail?.Project?.project_name || '-',
      note: item.customer?.note || item.lead_detail?.note || '-',
      source: rawSource,
      tag: rawTag,
      isFollowUpQualified,
      assignedExecutive: item.assignedExecutive || 'Executive',
      status: statusText,
      lead_status: item.lead_status,
      stage: item.lead_detail?.stage ?? item.stage ?? item.lead_status,
      lastActivity: item.timestamp ? item.timestamp.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : 'N/A'),
      rawItem: item
    };
  });

  // Categorize leads for Kanban Activity Board
  const boardSearchLeads = boardMappedLeads.filter(lead => {
    if (!searchTerm) return true;
    return lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.mobile.includes(searchTerm) ||
      lead.assignedExecutive?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const assignedBoardLeads = boardSearchLeads.filter(l => !l.isFollowUpQualified && l.lead_status !== 4 && l.status !== 'Booked');
  const followUpBoardLeads = boardSearchLeads.filter(l => l.isFollowUpQualified && l.lead_status !== 4 && l.status !== 'Booked');
  const bookedBoardLeads = boardSearchLeads.filter(l => l.lead_status === 4 || l.status === 'Booked');

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, lead: any) => {
    setDraggedLead(lead);
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom clean drag image to guarantee curved borders in Chrome/Brave/Safari
    const originalNode = e.currentTarget as HTMLElement;
    const dragNode = originalNode.cloneNode(true) as HTMLElement;

    dragNode.style.position = 'absolute';
    dragNode.style.top = '-9999px';
    dragNode.style.left = '-9999px';
    dragNode.style.width = `${originalNode.offsetWidth}px`;
    dragNode.style.height = `${originalNode.offsetHeight}px`;
    dragNode.style.boxShadow = 'none';
    dragNode.style.borderRadius = '16px';
    dragNode.style.overflow = 'hidden';
    dragNode.style.opacity = '0.95';
    dragNode.style.pointerEvents = 'none';

    // Ensure the clone has clean borders and background
    dragNode.style.backgroundColor = '#ffffff';
    dragNode.style.border = '1px solid #cbd5e1';

    document.body.appendChild(dragNode);

    // Set the drag image with mouse offset
    e.dataTransfer.setDragImage(dragNode, e.nativeEvent.offsetX || 20, e.nativeEvent.offsetY || 20);

    setTimeout(() => {
      if (document.body.contains(dragNode)) {
        document.body.removeChild(dragNode);
      }
    }, 0);

    // Style the original card left on the board as a placeholder
    setTimeout(() => {
      originalNode.classList.add('dragging-source');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging-active', 'dragging-source');
    setDraggedLead(null);
  };

  const handleDragOver = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colName) {
      setDragOverColumn(colName);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: 'assigned' | 'followUp' | 'booked') => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedLead) return;

    if (targetStage === 'followUp') {
      if (draggedLead.lead_status === 4 || draggedLead.status === 'Booked') {
        Swal.fire({ title: 'Already Booked', text: 'This lead is already booked.', icon: 'info' });
        return;
      }
      setTargetLeadForFollowUp(draggedLead);
      const existingTag = draggedLead.tag || draggedLead.rawItem?.lead_detail?.tag || draggedLead.rawItem?.tag || '';
      const normalizedTag = ['Hot', 'Warm', 'Cold', 'Qualified', 'Dead'].find(
        t => t.toLowerCase() === existingTag.trim().toLowerCase()
      ) || existingTag;
      setFollowUpTag(normalizedTag);
      setEnableTaskCreation(true);
      setShowFollowUpTag(true);
      setFollowUpTaskName(`Follow up call with ${draggedLead.name}`);
      setFollowUpPriority('High');
      setFollowUpTaskStatus('Not Started');
      setFollowUpTaskDescription('');
      setFollowUpNotes('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUpDueDate(tomorrow.toISOString().split('T')[0]);
      setIsFollowUpModalOpen(true);
    } else if (targetStage === 'booked') {
      if (draggedLead.lead_status === 4 || draggedLead.status === 'Booked') {
        Swal.fire({ title: 'Already Booked', text: 'This lead is already booked.', icon: 'info' });
        return;
      }
      setSelectedLeadForBooking(draggedLead);
      setIsBookingModalOpen(true);
    }
    setDraggedLead(null);
  };

  const handleFollowUpModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLeadForFollowUp || (showFollowUpTag && !followUpTag)) {
      Swal.fire({ title: 'Tag Required', text: 'Please select a Tag before moving to Follow Up.', icon: 'warning' });
      return;
    }

    if (enableTaskCreation && !followUpTaskName.trim()) {
      Swal.fire({ title: 'Task Subject Required', text: 'Please enter a Subject for the Task.', icon: 'warning' });
      return;
    }

    setIsSubmittingFollowUp(true);
    try {
      const numericLeadId = Number(targetLeadForFollowUp.id);

      // Complete visit only if stage is 2 (Visited / Checked-In) and visitId exists
      const leadStage = Number(
        targetLeadForFollowUp.stage ??
        targetLeadForFollowUp.rawItem?.lead_detail?.stage ??
        targetLeadForFollowUp.rawItem?.stage ??
        targetLeadForFollowUp.lead_status ??
        targetLeadForFollowUp.rawItem?.lead_status
      );

      if (leadStage === 2 && targetLeadForFollowUp.visitId) {
        const visitRes = await putCompleteVisit(targetLeadForFollowUp.visitId);
        if (visitRes && visitRes.success === false) {
          Swal.fire({
            title: 'Action Failed',
            text: visitRes.message || 'Only checked-in visits can be marked as completed',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
          setIsSubmittingFollowUp(false);
          return;
        }
      }

      // 1. Tag & Stage Update API (/v1/leads/:id/update-info)
      const updatePayload: any = {
        stage: 3,
        note: followUpNotes.trim() || undefined
      };
      if (followUpTag) {
        updatePayload.tag = followUpTag;
      }
      await axiosClient.put(`/leads/${targetLeadForFollowUp.id}/update-info`, updatePayload);

      // 2. Optional Note Creation API Call (/v1/leads/notes/create)
      if (followUpNotes.trim()) {
        await addSalesLeadNote({
          lead_id: numericLeadId,
          note: followUpNotes.trim(),
          contact_status: 1
        });
      }

      // 3. Optional Task Creation API Call (/v1/leads/tasks/create)
      if (enableTaskCreation && followUpTaskName.trim()) {
        const taskPayload = {
          lead_id: numericLeadId,
          task_name: followUpTaskName.trim(),
          note: followUpTaskDescription.trim() || followUpNotes.trim() || 'Follow up task created',
          due_date: new Date(followUpDueDate || Date.now() + 86400000).toISOString(),
          repeat: 'none',
          priority: followUpPriority || 'High',
          status: followUpTaskStatus === 'Completed' ? 2 : 1,
          remindercreate: false,
          reminder_datetime: new Date(followUpDueDate || Date.now() + 86400000).toISOString()
        };
        await createLeadTask(taskPayload);
      }

      Swal.fire({
        title: 'Moved to Follow Up!',
        text: `Lead "${targetLeadForFollowUp.name}" tag updated to ${followUpTag} and moved to Follow Up.`,
        icon: 'success',
        confirmButtonColor: '#1A56DB'
      });

      setIsFollowUpModalOpen(false);
      setTargetLeadForFollowUp(null);
      setFollowUpTag('');
      setFollowUpTaskName('');
      setFollowUpNotes('');
      setEnableTaskCreation(false);
      fetchSalesData();
      if (activeTab === 'noAction') {
        fetchNoActionLeads();
      }
      if (viewMode === 'activity' || activeTab === 'activity') {
        fetchBoardData();
      }
    } catch (err: any) {
      console.error('Failed to move lead to follow up:', err);
      Swal.fire({ title: 'Error', text: err.response?.data?.message || 'Failed to update lead status.', icon: 'error' });
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const activeTotalItems = activeTab === 'noAction' ? noActionTotalItems : totalItems;
  const totalPages = Math.max(1, Math.ceil(activeTotalItems / itemsPerPage));
  const paginatedLeads = activeTab === 'noAction' ? mappedNoActionLeads : filteredLeads;

  // Keep page within totalPages bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleRowClick = (leadId: string) => {
    localStorage.setItem('selectedLeadId', leadId);
    navigate(`${window.location.pathname}?leadId=${leadId}`);
  };

  const handleOpenBooking = (lead: any) => {
    setSelectedLeadForBooking(lead);
    setIsBookingModalOpen(true);
  };

  const handleCompleteVisit = (lead: any) => {
    if (lead.lead_status === 4 || lead.status === 'Booked') {
      Swal.fire({ title: 'Already Booked', text: 'This lead is already booked.', icon: 'info' });
      return;
    }
    setTargetLeadForFollowUp(lead);
    const existingTag = lead.tag || lead.rawItem?.lead_detail?.tag || lead.rawItem?.tag || '';
    const normalizedTag = ['Hot', 'Warm', 'Cold', 'Qualified', 'Dead'].find(
      t => t.toLowerCase() === existingTag.trim().toLowerCase()
    ) || existingTag;
    setFollowUpTag(normalizedTag);
    setEnableTaskCreation(true);
    setShowFollowUpTag(true);
    setFollowUpTaskName(`Follow up call with ${lead.name}`);
    setFollowUpPriority('High');
    setFollowUpTaskStatus('Not Started');
    setFollowUpTaskDescription('');
    setFollowUpNotes('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDueDate(tomorrow.toISOString().split('T')[0]);
    setIsFollowUpModalOpen(true);
  };

  const handleOpenFollowUpWithoutTag = (lead: any) => {
    if (lead.lead_status === 4 || lead.status === 'Booked') {
      Swal.fire({ title: 'Already Booked', text: 'This lead is already booked.', icon: 'info' });
      return;
    }
    setTargetLeadForFollowUp(lead);
    const existingTag = lead.tag || lead.rawItem?.lead_detail?.tag || lead.rawItem?.tag || '';
    const normalizedTag = ['Hot', 'Warm', 'Cold', 'Qualified', 'Dead'].find(
      t => t.toLowerCase() === existingTag.trim().toLowerCase()
    ) || existingTag;
    setFollowUpTag(normalizedTag);
    setEnableTaskCreation(true);
    setShowFollowUpTag(true);
    setFollowUpTaskName(`Follow up call with ${lead.name}`);
    setFollowUpPriority('High');
    setFollowUpTaskStatus('Not Started');
    setFollowUpTaskDescription('');
    setFollowUpNotes('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDueDate(tomorrow.toISOString().split('T')[0]);
    setIsFollowUpModalOpen(true);
  };

  const handleConfirmBooking = (bookingData: CreateBookingData) => {
    if (!selectedLeadForBooking) return;

    const matchedProj = projects.find(p => p.id === bookingData.projectId);
    const resolvedProjName = matchedProj ? matchedProj.name : selectedLeadForBooking.project;

    createBooking({
      leadId: selectedLeadForBooking.id,
      customerName: selectedLeadForBooking.name,
      project: resolvedProjName,
      tower: bookingData.tower || bookingData.paymentSchedule || bookingData.payment_schedule || '',
      paymentSchedule: bookingData.paymentSchedule || bookingData.payment_schedule || '',
      floor: bookingData.floor,
      unitNo: bookingData.unitNo,
      bookingAmount: bookingData.bookingAmount,
      agreementValue: bookingData.agreementValue,
    });

    setIsBookingModalOpen(false);
    setSelectedLeadForBooking(null);

    Swal.fire({
      title: 'Booking Confirmed!',
      text: 'The booking has been successfully saved, stage transitioned, and commission triggers processed.',
      icon: 'success',
      confirmButtonColor: '#1A56DB',
    });

    // Re-fetch sales data
    fetchSalesData();
  };

  return (
    <div className="space-y-6 text-left flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Sales Pipeline</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            Monitor client discussions, meetings, negotiation stages, and conversions
          </p>
        </div>

        {/* Filters Controls & Add Lead / Add CP */}
        <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
          {/* Add CP Action Button - only shown when can_update_broker === 1 */}
          {showAddCp && (
            <button
              type="button"
              onClick={() => setIsAddCpModalOpen(true)}
              className="relative group overflow-hidden h-[38px] flex items-center gap-2 px-4.5 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 anim-glow-pulse"
              title="Add New Channel Partner"
            >
              <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              <Users className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform duration-200" />
              <span className="tracking-wide">ADD CP</span>
            </button>
          )}

          {/* Add Lead Glowing Action Button */}
          {showAddLead && (
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(true)}
              className="relative group overflow-hidden h-[38px] flex items-center gap-2 px-4.5 bg-linear-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/30 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 anim-glow-pulse"
            >
              {/* Shimmer sweep effect */}
              <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              <UserPlus className="w-4 h-4 text-blue-100 group-hover:scale-110 transition-transform duration-200" />
              <span className="tracking-wide">Add Lead</span>
            </button>
          )}

          <div className="flex flex-col space-y-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeframe</span>
            <CustomSelect
              value={timeFilter}
              onChange={(val) => {
                setTimeFilter(val);
                if (val !== 'Custom') {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }
              }}
              options={[
                { value: 'Today', label: 'Today' },
                { value: 'This Week', label: 'This Week' },
                { value: 'This Month', label: 'This Month' },
                { value: 'This Year', label: 'This Year' },
                { value: 'Custom', label: 'Custom Range' }
              ]}
              className="w-full sm:w-40"
            />
          </div>

          {timeFilter === 'Custom' && (
            <>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none min-h-[38px]"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none min-h-[38px]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pipeline Progress Stages (Responsive counts) - Only on Dashboard view */}
      {viewMode === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 anim-fade-up stagger-1">
          {/* Card 1 */}
          <div className="p-4 rounded-xl border border-slate-100/80 bg-white text-slate-800 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Leads</span>
            <span className="text-xl font-black block mt-1">
              {salesAnalyticsData?.leadsSection?.totalLeads ?? stats.alloted_visits_count}
            </span>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl border border-slate-100/80 bg-white text-slate-800 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Action Taken</span>
            <span className="text-xl font-black text-blue-600 block mt-1">
              {salesAnalyticsData?.leadsSection?.LeadsOnWhichActionTaken ?? salesAnalyticsData?.leadsSection?.LeadsOnwhichActionTaken ?? stats.visit_completed_count}
            </span>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl border border-slate-100/80 bg-white text-slate-800 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Action</span>
            <span className="text-xl font-black text-rose-500 block mt-1">
              {salesAnalyticsData?.leadsSection?.LeadsOnWhichActionNotTaken ?? salesAnalyticsData?.leadsSection?.LeadsOnwhichActionNotTaken ?? stats.negotiation_count}
            </span>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-xl border border-slate-100/80 bg-white text-slate-800 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bookings</span>
            <span className="text-xl font-black text-emerald-600 block mt-1">
              {execPipelineStats?.LeadsOnwhichBookingDone ?? stats.booking_count}
            </span>
          </div>
        </div>
      )}

      {/* Visual Analytics Charts: Lead Pipeline (3-stage Bar Chart) & Leads by Sources (Donut Chart) */}
      {viewMode === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 anim-fade-up stagger-1.5">
          {/* Chart 1: Lead Pipeline Vertical Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-6 flex flex-col justify-between min-h-[300px]">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Lead Pipeline</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Breakdown by active stage</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-lg">
                3 Stages
              </span>
            </div>

            <div className="flex-1 h-52 w-full min-h-[190px]">
              {salesAnalyticsLoading ? (
                <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                  <span>Loading pipeline data...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execPipelineData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="stage" stroke="#94A3B8" fontSize={11} interval={0} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 6 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                      {execPipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Leads by Sources Donut Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-6 flex flex-col justify-between min-h-[300px]">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Leads by Sources</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Source attribution breakdown</p>
              </div>
              {execTotalDist > 0 && (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  Total: {execTotalDist}
                </span>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[160px]">
              {salesAnalyticsLoading ? (
                <div className="flex items-center justify-center text-xs font-semibold text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                  <span>Loading source distribution...</span>
                </div>
              ) : execTotalDist === 0 ? (
                <div className="text-xs font-semibold text-slate-400">No source distribution data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={execSourcesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {execSourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-semibold pt-3 border-t border-slate-100">
              {execSourcesData.map((s, idx) => (
                <div key={idx} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                    <span className="text-slate-600 truncate text-[11px] font-semibold">{s.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 pl-3.5">
                    <span className="text-slate-800 font-black text-sm">{s.count}</span>
                    <span className="text-slate-400 font-bold text-[10px]">({s.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Overview Strip (if tasksSection exists in API) */}
      {viewMode === 'dashboard' && salesAnalyticsData?.tasksSection && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-fade-up stagger-2">
          <div 
            onClick={() => navigate('/sales/tasks?status=ALL')}
            className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
            title="Click to view all tasks"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-blue-600 transition">Total Tasks</span>
              <span className="text-lg font-black text-slate-800 block mt-0.5">{salesAnalyticsData.tasksSection.totalTasks ?? 0}</span>
            </div>
            <ListChecks className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div 
            onClick={() => navigate('/sales/tasks?status=PENDING')}
            className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-200 hover:shadow-md transition-all group"
            title="Click to view pending tasks"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-amber-600 transition">Pending Tasks</span>
              <span className="text-lg font-black text-amber-500 block mt-0.5">{salesAnalyticsData.tasksSection.pendingTasks ?? 0}</span>
            </div>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div 
            onClick={() => navigate('/sales/tasks?status=OVERDUE')}
            className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-200 hover:shadow-md transition-all group"
            title="Click to view overdue tasks"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-rose-600 transition">Overdue Tasks</span>
              <span className="text-lg font-black text-rose-500 block mt-0.5">{salesAnalyticsData.tasksSection.overdueTasks ?? 0}</span>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div 
            onClick={() => navigate('/sales/tasks?status=COMPLETED')}
            className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group"
            title="Click to view completed tasks"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-emerald-600 transition">Completed Tasks</span>
              <span className="text-lg font-black text-emerald-600 block mt-0.5">{salesAnalyticsData.tasksSection.completedTasks ?? 0}</span>
            </div>
            <CheckSquare className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      )}

      {/* Recent Leads Section / Activity Kanban Board */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-up stagger-2 flex-1 flex flex-col min-h-[450px]">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-3">
              {viewMode === 'activity' ? (
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Activity Board</h3>
                </div>
              ) : viewMode === 'pendingActions' ? (
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Pending Actions</h3>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Pipeline Leads</h3>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-all text-slate-700"
              />
            </div>

            {/* Filter Popover Dropdown Button */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${(tagFilter !== 'All' || sourceFilter !== 'All')
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                title="Filter Leads"
              >
                <Filter className="w-4 h-4 text-slate-500" />
                <span>Filters</span>
                {(tagFilter !== 'All' || sourceFilter !== 'All') && (
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                )}
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-2xl z-40 p-4 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filter Leads</h4>
                    {(tagFilter !== 'All' || sourceFilter !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setTagFilter('All');
                          setSourceFilter('All');
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Filter Option 1: Tag */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      Tag
                    </label>
                    <select
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="All">All Tags</option>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Dead">DEAD / NOT CONNECTED</option>
                    </select>
                  </div>

                  {/* Filter Option 2: Source */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      Source
                    </label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="All">All Sources</option>
                      <option value="Walk-In">Walk-In</option>
                      <option value="Direct">Direct</option>
                      <option value="Channel Partner">Channel Partner</option>
                      <option value="Call">Call</option>
                      <option value="Digital / Website">Digital / Website</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen(false)}
                      className="px-3 py-1.5 bg-[#1A56DB] text-white rounded-lg text-xs font-bold hover:bg-[#1648C0] transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add Lead Button in Leads Table Bar with glow */}
            {showAddLead && (
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(true)}
                className="relative group overflow-hidden flex items-center gap-1.5 px-3.5 py-2.5 bg-linear-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer shrink-0 anim-glow-pulse"
                title="Add New Lead"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Lead</span>
              </button>
            )}


          </div>
        </div>

        {activeTab === 'activity' ? (
          /* Kanban Activity Board View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Column 1: Assigned */}
            <div
              onDragOver={(e) => handleDragOver(e, 'assigned')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'assigned')}
              className={`bg-slate-50/70 border rounded-2xl p-4 flex flex-col min-h-[500px] transition-all ${dragOverColumn === 'assigned' ? 'border-blue-400 bg-blue-50/30 ring-2 ring-blue-400/20' : 'border-slate-200/80'
                }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Assigned</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-black">
                  {assignedBoardLeads.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {assignedBoardLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-xl bg-white/50">
                    <User className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-slate-400 text-xs font-semibold">No assigned leads</p>
                  </div>
                ) : (
                  assignedBoardLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleRowClick(lead.id)}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group hover:border-blue-300 space-y-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0" />
                          <h5 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{lead.name}</h5>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                          Assigned
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 font-medium pl-6">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>{lead.mobile}</span>
                        </div>
                        {lead.note && lead.note !== '-' && (
                          <div className="flex items-center gap-2 text-slate-500 truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{lead.note}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{lead.lastActivity}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Drag to Follow Up &rarr;</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Follow Up */}
            <div
              onDragOver={(e) => handleDragOver(e, 'followUp')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'followUp')}
              className={`bg-slate-50/70 border rounded-2xl p-4 flex flex-col min-h-[500px] transition-all ${dragOverColumn === 'followUp' ? 'border-purple-400 bg-purple-50/30 ring-2 ring-purple-400/20' : 'border-slate-200/80'
                }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Follow Up</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100/80 text-purple-700 text-xs font-black">
                  {followUpBoardLeads.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {followUpBoardLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-xl bg-white/50">
                    <Clock className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-slate-400 text-xs font-semibold">Drag leads here to schedule follow-up</p>
                  </div>
                ) : (
                  followUpBoardLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleRowClick(lead.id)}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group hover:border-purple-300 space-y-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0" />
                          <h5 className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">{lead.name}</h5>
                        </div>
                        {lead.tag && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getTagBadgeColor(lead.tag)}`}>
                            {lead.tag === 'Dead' || lead.tag?.toLowerCase()?.includes('dead') ? 'DEAD / NOT CONNECTED' : lead.tag}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 font-medium pl-6">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>{lead.mobile}</span>
                        </div>
                        {lead.note && lead.note !== '-' && (
                          <div className="flex items-center gap-2 text-slate-500 truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{lead.note}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{lead.lastActivity}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Drag to Booked &rarr;</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Booking Confirmed */}
            <div
              onDragOver={(e) => handleDragOver(e, 'booked')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'booked')}
              className={`bg-slate-50/70 border rounded-2xl p-4 flex flex-col min-h-[500px] transition-all ${dragOverColumn === 'booked' ? 'border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-400/20' : 'border-slate-200/80'
                }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Booking Confirmed</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-black">
                  {bookedBoardLeads.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {bookedBoardLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-xl bg-white/50">
                    <CheckCircle2 className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-slate-400 text-xs font-semibold">Drag leads here to confirm booking</p>
                  </div>
                ) : (
                  bookedBoardLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleRowClick(lead.id)}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs transition-all cursor-pointer group hover:border-emerald-300 space-y-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{lead.name}</h5>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                          Booked
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>{lead.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{lead.lastActivity}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Pipeline Leads List View Table */
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6 text-left">Sr. No.</th>
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Customer Name</th>
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Mobile</th>
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Source</th>
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Tag</th>
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6">Last Activity</th>
                    <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(activeTab === 'noAction' ? noActionLoading : apiLoading) ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading leads data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8">
                        <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                          <User className="w-8 h-8 text-slate-300 mb-3" />
                          <p className="text-slate-400 text-sm font-medium">No leads found matching current search/filter.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        onClick={() => handleRowClick(lead.id)}
                        style={{ animationDelay: `${index * 0.04}s` }}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer anim-fade-up"
                      >
                        <td className="py-4 px-6 text-xs font-semibold text-slate-500 text-left">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="py-4 px-6 text-sm font-semibold text-slate-800">
                          <span>{lead.name}</span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 font-medium">{lead.mobile}</td>
                        <td className="py-4 px-6 text-slate-500 text-xs font-medium truncate max-w-[150px]" title={lead.source}>{lead.source}</td>
                        <td className="py-4 px-6 text-xs font-medium">
                          {lead.tag ? (
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getTagBadgeColor(lead.tag)}`}>
                              {lead.tag === 'Dead' || lead.tag?.toLowerCase()?.includes('dead') ? 'DEAD / NOT CONNECTED' : lead.tag}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">&mdash;</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 font-medium">{lead.lastActivity}</td>
                        <td className="py-3 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          {activeTab === 'noAction' ? (
                            (Number(lead.rawItem?.lead_detail?.stage) === 2 || Number(lead.lead_status) === 2 || Number(lead.rawItem?.stage) === 2 || Number(lead.rawItem?.lead_status) === 2) ? (
                              <button
                                type="button"
                                onClick={() => handleCompleteVisit(lead)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Complete Visit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenFollowUpWithoutTag(lead)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Follow Up
                              </button>
                            )
                          ) : (
                            <>
                              {lead.lead_status === 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteVisit(lead)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Complete Visit
                                </button>
                              )}
                              {lead.lead_status === 3 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(lead)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Create Booking
                                </button>
                              )}
                              {lead.lead_status === 4 && (
                                <span className="text-emerald-600 font-bold text-xs">Booked</span>
                              )}
                              {lead.lead_status !== 2 && lead.lead_status !== 3 && lead.lead_status !== 4 && (
                                <span className="text-slate-400 font-medium">&mdash;</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!(activeTab === 'noAction' ? noActionLoading : apiLoading) && paginatedLeads.length > 0 && (
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
                  <span>Showing {activeTotalItems > 0 ? Math.min((currentPage - 1) * itemsPerPage + 1, activeTotalItems) : 0}&ndash;{Math.min(currentPage * itemsPerPage, activeTotalItems)} of {activeTotalItems} records</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Move to Follow Up Modal (3 fields: Create Task, Tag, Notes) */}
      {isFollowUpModalOpen && targetLeadForFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Move to Follow Up</h3>
                <p className="text-xs text-slate-400 font-medium">Create task & update tag for {targetLeadForFollowUp.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFollowUpModalOpen(false);
                  setTargetLeadForFollowUp(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFollowUpModalSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Field 1: Tag (AT THE TOP - MANDATORY) */}
              {showFollowUpTag && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tag <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={followUpTag}
                    onChange={(e) => setFollowUpTag(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    required={showFollowUpTag}
                  >
                    <option value="">-- Select Tag (Required) --</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Dead">DEAD / NOT CONNECTED</option>
                  </select>
                </div>
              )}

              {/* Field 2: Optional Task Creation Fields */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 font-bold text-xs text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableTaskCreation}
                      onChange={(e) => setEnableTaskCreation(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300 cursor-pointer transition-all duration-150"
                    />
                    <span>Create Task for this Lead</span>
                  </label>
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${enableTaskCreation ? 'text-blue-600' : 'text-slate-400'}`}>
                    {enableTaskCreation ? 'Enabled' : 'Optional'}
                  </span>
                </div>

                {enableTaskCreation && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/60 text-left animate-fade-in">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Subject *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Schedule follow up call with customer"
                        value={followUpTaskName}
                        onChange={(e) => setFollowUpTaskName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date *</label>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={followUpDueDate}
                          onChange={(e) => setFollowUpDueDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all duration-150"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Description</label>
                      <textarea
                        rows={2}
                        placeholder="Add more task details..."
                        value={followUpTaskDescription}
                        onChange={(e) => setFollowUpTaskDescription(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3: Create Note (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Create Note <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Add note details for this lead..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Ringing',
                    'Made a Call with Customer',
                    'Busy / Call back later',
                    'Not Interested',
                    'Wrong Number',
                    'Interested / Visit scheduled'
                  ].map((noteOption) => (
                    <button
                      key={noteOption}
                      type="button"
                      onClick={() => setFollowUpNotes(noteOption)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 transition cursor-pointer select-none"
                    >
                      {noteOption}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFollowUpModalOpen(false);
                    setTargetLeadForFollowUp(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFollowUp || (showFollowUpTag && !followUpTag) || (enableTaskCreation && !followUpTaskName.trim())}
                  className="px-5 py-2.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingFollowUp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Move to Follow Up</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBookingModalOpen && selectedLeadForBooking && (
        <CreateBookingModal
          isOpen={true}
          leadId={selectedLeadForBooking.id}
          customerName={selectedLeadForBooking.name}
          projectName={selectedLeadForBooking.project !== '-' ? selectedLeadForBooking.project : undefined}
          projectId={selectedLeadForBooking.rawItem?.project_id || selectedLeadForBooking.rawItem?.project_detail?.id || (typeof selectedLeadForBooking.rawItem?.lead_detail?.project === 'number' ? selectedLeadForBooking.rawItem.lead_detail.project : undefined)}
          projects={projects}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedLeadForBooking(null);
          }}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        onSuccess={() => {
          fetchSalesData();
          fetchSalesExecutiveAnalytics();
        }}
        defaultProjectId={selectedProjectFilter !== 'All' ? selectedProjectFilter : undefined}
        currentSalesExecutiveId={salesUserId}
        currentSalesExecutiveName={salesUserName}
        projects={projects}
        isOtpMandatory={isOtpMandatory}
      />

      {/* Add CP Modal */}
      <AddCpModal
        isOpen={isAddCpModalOpen}
        onClose={() => setIsAddCpModalOpen(false)}
        isOtpMandatory={isBrokerOtpMandatory}
        onSuccess={() => {
          fetchSalesData();
        }}
      />
    </div>
  );
};
