import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { Award, BarChart4, Calendar, Loader2, Filter, Users, CheckCircle2, Clock, AlertTriangle, ListChecks, CheckSquare, Layers, UserCheck, X, ChevronRight } from 'lucide-react';
import { CustomSelect } from '../../CustomSelect';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import {
  useSalesExecutives,
  useReportsAnalytics,
  useReportsActionCounts,
  useReportsActionLeads,
  useBrokerPerformance,
  useAdminStats,
} from '../../../admin/hooks/useReportsAnalyticsQueries';
import type {
  AdminStats,
  AnalyticsResponseData,
  ProjectStat,
  LeadListItem,
} from '../../../admin/api/reportsAnalytics';

export const ReportsAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { leads, brokers, selectedProjectId } = useBrokerConnect();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Filter States
  const [filter, setFilter] = useState<'Today' | 'This Week' | 'This Month' | 'This Year' | 'Custom'>(() => (localStorage.getItem('reports_filter') as any) || 'This Month');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('reports_startDate') || '2026-06-01');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('reports_endDate') || '2026-06-24');
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>(() => localStorage.getItem('reports_executiveId') || 'All');

  const [trendMode, setTrendMode] = useState<'daily' | 'cumulative'>('cumulative');

  // Action Taken & No Action Taken leads list modal states
  const [activeActionTab, setActiveActionTab] = useState<'taken' | 'noAction'>('taken');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionPage, setActionPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e: any) => {
      const scrollTop = e.target.scrollTop || 0;
      setIsScrolled(scrollTop > 20);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('reports_filter', filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('reports_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('reports_endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('reports_executiveId', selectedExecutiveId);
  }, [selectedExecutiveId]);

  // Memoized query filter params
  const reportsParams = useMemo(
    () => ({
      filter,
      startDate,
      endDate,
      selectedProjectId,
      selectedExecutiveId,
    }),
    [filter, startDate, endDate, selectedProjectId, selectedExecutiveId]
  );

  // 1. Sales Executives for Dropdown (Cached & deduplicated)
  const { data: executiveOptions = [] } = useSalesExecutives();

  // 2. Leads Analytics Data (Cached & deduplicated)
  const { data: analyticsData = null, isLoading: analyticsLoading } = useReportsAnalytics(reportsParams);

  // 3. Exact Action Taken & No Action Counts (Single parallel query, cached & deduplicated)
  const { data: actionCounts } = useReportsActionCounts(reportsParams);
  const correctActionTakenCount = actionCounts?.actionTakenCount ?? 0;
  const correctNoActionCount = actionCounts?.noActionCount ?? 0;

  // 4. Broker Performance Ranking (Cached & deduplicated)
  const { data: topBrokersList = [], isLoading: loadingPerformance } = useBrokerPerformance();

  // 5. Admin Stats (Cached & deduplicated)
  const { data: stats = null, isLoading: statsLoading } = useAdminStats(reportsParams);

  // 6. Action Leads for Modal (Only fetched when modal is opened, with automatic page cache)
  const {
    data: actionLeadsResult,
    isLoading: actionLeadsLoading,
    error: actionQueryError,
  } = useReportsActionLeads(reportsParams, activeActionTab, actionPage, isActionModalOpen);

  const actionTakenLeads = activeActionTab === 'taken' ? (actionLeadsResult?.list ?? []) : [];
  const noActionLeads = activeActionTab === 'noAction' ? (actionLeadsResult?.list ?? []) : [];
  const actionTotalItems = actionLeadsResult?.totalCount ?? 0;
  const actionApiError = actionQueryError
    ? ((actionQueryError as any)?.response?.data?.message || (actionQueryError as any)?.message || 'Failed to fetch action leads.')
    : null;


  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const descriptions: Record<string, string> = {
        'Reg ➜ Visit': 'Percentage of registered CP leads who completed front desk check-in.',
        'Visit ➜ Discuss': 'Percentage of checked-in visitors assigned to active sales executives.',
        'Discuss ➜ Book': 'Percentage of sales allocations successfully closed as final bookings.',
      };
      return (
        <div className="bg-slate-900 border border-slate-700/80 text-white p-3 rounded-xl shadow-2xl max-w-[220px] text-left space-y-1 z-50">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{data.name}</p>
          <p className="text-sm font-black text-blue-400">{data.ratio}% <span className="text-[10px] text-slate-300 font-bold">Conversion</span></p>
          <p className="text-[9px] text-slate-400 leading-normal font-semibold mt-1">
            {descriptions[data.name] || 'Pipeline stage conversion.'}
          </p>
        </div>
      );
    }
    return null;
  };

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

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900 border border-slate-700/80 text-white px-3.5 py-2.5 rounded-xl shadow-2xl text-left pointer-events-none z-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label || data.name}</p>
          <p className="text-sm font-black text-blue-400 mt-1">
            {data.value} <span className="text-xs font-semibold text-slate-300">Leads</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Derive metrics
  const apiActionTaken = analyticsData?.leadsSection?.LeadsOnWhichActionTaken 
    ?? analyticsData?.leadsSection?.LeadsOnwhichActionTaken 
    ?? analyticsData?.leadsSection?.leadsOnWhichActionTaken
    ?? correctActionTakenCount 
    ?? 0;

  const apiNoActionTaken = analyticsData?.leadsSection?.LeadsOnWhichActionNotTaken 
    ?? analyticsData?.leadsSection?.LeadsOnwhichActionNotTaken 
    ?? analyticsData?.leadsSection?.leadsOnWhichActionNotTaken
    ?? correctNoActionCount 
    ?? 0;

  const apiLeads = analyticsData?.leadsSection?.totalLeads 
    ?? (apiActionTaken + apiNoActionTaken);

  const apiEngagedLeads = analyticsData?.leadsSection?.engagedLeads ?? stats?.totalLeads ?? 0;

  const apiTotalTasks = analyticsData?.tasksSection?.totalTasks ?? 0;
  const apiPendingTasks = analyticsData?.tasksSection?.pendingTasks ?? 0;
  const apiOverdueTasks = analyticsData?.tasksSection?.overdueTasks ?? 0;
  const apiCompletedTasks = analyticsData?.tasksSection?.completedTasks ?? 0;

  const apiVisits = stats?.totalVisits ?? 0;
  const apiNegotiations = stats?.totalNegotiations ?? 0;
  const apiBookings = stats?.totalBookings ?? 0;

  // Trend Line Chart Data
  const trendData = useMemo(() => {
    if (!stats?.leadsList || stats.leadsList.length === 0) {
      return [];
    }

    const countsByDate: Record<string, number> = {};
    stats.leadsList.forEach((lead) => {
      if (!lead.createdAt) return;
      const dateStr = lead.createdAt.split('T')[0];
      countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
    });

    const dates = Object.keys(countsByDate).sort();
    if (dates.length === 0) return [];

    const minDate = new Date(dates[0]);
    const maxDate = new Date(dates[dates.length - 1]);
    const filledData: { name: string; dateStr: string; count: number }[] = [];

    const formatDateLabel = (date: Date) => {
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    };

    let current = new Date(minDate);
    let countSafeguard = 0;
    while (current <= maxDate && countSafeguard < 366) {
      const dateStr = current.toISOString().split('T')[0];
      const count = countsByDate[dateStr] || 0;
      filledData.push({
        dateStr,
        name: formatDateLabel(current),
        count,
      });
      current.setDate(current.getDate() + 1);
      countSafeguard++;
    }

    if (trendMode === 'daily') {
      return filledData.map((d) => ({
        name: d.name,
        Leads: d.count,
      }));
    } else {
      let cumulativeSum = 0;
      return filledData.map((d) => {
        cumulativeSum += d.count;
        return {
          name: d.name,
          Leads: cumulativeSum,
        };
      });
    }
  }, [stats, trendMode]);

  // Lead Pipeline Bar Chart Data (3 stages from LeadsPipelineStats)
  const pipelineStats = analyticsData?.LeadsPipelineStats || (analyticsData as any)?.leadsPipelineStats;
  const leadPipelineData = useMemo(() => {
    const assigned = pipelineStats?.LeadsAssigned ?? pipelineStats?.leadsAssigned ?? 0;
    const followUp = pipelineStats?.Leadsonwhichfollowupgettingtook ?? pipelineStats?.leadsOnWhichFollowUpGettingTook ?? (pipelineStats as any)?.leadsonwhichfollowupgettingtook ?? 0;
    const booked = pipelineStats?.LeadsOnwhichBookingDone ?? pipelineStats?.leadsOnWhichBookingDone ?? (pipelineStats as any)?.leadsonwhichbookingdone ?? 0;

    return [
      { stage: 'Assigned', count: assigned, color: '#3B82F6' },
      { stage: 'Follow Up', count: followUp, color: '#8B5CF6' },
      { stage: 'Booking Done', count: booked, color: '#10B981' }
    ];
  }, [pipelineStats]);

  // Donut Chart: Leads by Sources from leadsDistribution
  const leadsDist = analyticsData?.leadsDistribution || (analyticsData as any)?.LeadsDistribution;
  const brokerCount = leadsDist?.Leadsfrombroker ?? leadsDist?.leadsFromBroker ?? (leadsDist as any)?.leadsfrombroker ?? 0;
  const referralCount = leadsDist?.Leadsfromreferral ?? leadsDist?.leadsFromReferral ?? (leadsDist as any)?.leadsfromreferral ?? 0;
  const directCount = leadsDist?.leadsdirect ?? leadsDist?.leadsDirect ?? (leadsDist as any)?.LeadsDirect ?? (leadsDist as any)?.Leadsdirect ?? 0;
  const totalDist = brokerCount + referralCount + directCount;

  const sourcesData = useMemo(() => {
    if (totalDist === 0) {
      return [
        { name: 'Channel Partner', count: 0, percentage: 0, color: '#3B82F6' },
        { name: 'Direct', count: 0, percentage: 0, color: '#1D4ED8' },
        { name: 'Referral', count: 0, percentage: 0, color: '#60A5FA' }
      ];
    }
    return [
      {
        name: 'Channel Partner',
        count: brokerCount,
        percentage: parseFloat(((brokerCount / totalDist) * 100).toFixed(1)),
        color: '#3B82F6'
      },
      {
        name: 'Direct',
        count: directCount,
        percentage: parseFloat(((directCount / totalDist) * 100).toFixed(1)),
        color: '#1D4ED8'
      },
      {
        name: 'Referral',
        count: referralCount,
        percentage: parseFloat(((referralCount / totalDist) * 100).toFixed(1)),
        color: '#60A5FA'
      }
    ];
  }, [brokerCount, directCount, referralCount, totalDist]);

  // Donut Chart: Bookings by Project
  const projectStatsList = stats?.projectsStats || [];
  const totalProjBookings = projectStatsList.reduce((acc, p) => acc + (p.totalBookings || 0), 0);
  const useLeadsForPie = totalProjBookings === 0;

  const projectData = useMemo(() => {
    const rawProjectData = projectStatsList.map((p) => {
      const val = useLeadsForPie ? (p.totalLeads || 0) : (p.totalBookings || 0);
      return {
        name: p.projectName,
        value: val,
      };
    }).filter(p => p.value > 0);

    const totalPieVal = rawProjectData.reduce((acc, p) => acc + p.value, 0);
    const colors = ['#2563eb', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

    return rawProjectData.map((p, idx) => ({
      name: p.name,
      value: totalPieVal > 0 ? Math.round((p.value / totalPieVal) * 100) : 0,
      color: colors[idx % colors.length]
    }));
  }, [stats, useLeadsForPie, projectStatsList]);

  // Funnel Ratios Data
  const funnelData = useMemo(() => {
    const regToVisitRatio = apiLeads > 0 ? (apiVisits / apiLeads) * 100 : 0;
    const visitToDiscussRatio = apiVisits > 0 ? (apiNegotiations / apiVisits) * 100 : 0;
    const discussToBookRatio = apiNegotiations > 0 ? (apiBookings / apiNegotiations) * 100 : 0;

    return [
      { name: 'Reg ➜ Visit', ratio: parseFloat(regToVisitRatio.toFixed(1)), color: '#2563eb' },
      { name: 'Visit ➜ Discuss', ratio: parseFloat(visitToDiscussRatio.toFixed(1)), color: '#6366f1' },
      { name: 'Discuss ➜ Book', ratio: parseFloat(discussToBookRatio.toFixed(1)), color: '#10b981' },
    ];
  }, [apiLeads, apiVisits, apiNegotiations, apiBookings]);

  // Top Brokers Leaderboard
  const topBrokers = useMemo(() => {
    if (loadingPerformance || topBrokersList.length === 0) return [];
    const sorted = [...topBrokersList].sort((a, b) => b.bookedCount - a.bookedCount || b.totalLeads - a.totalLeads);
    return sorted.slice(0, 4).map((b, idx) => ({
      name: b.broker_name || b.email || 'Broker Account',
      count: b.totalLeads ?? 0,
      conversions: b.bookedCount ?? 0,
      rank: idx + 1
    }));
  }, [topBrokersList, loadingPerformance]);

  // Sales User Distribution list
  const salesDistribution = analyticsData?.salesUserDistribution || [];

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel with Timeframe & Sales Executive Filters */}
      <div className={`sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/95 backdrop-blur-md transition-all duration-300 ${
        isScrolled 
          ? 'py-3 px-6 rounded-xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.05)] bg-white/98 -mx-1' 
          : 'p-6 rounded-2xl border border-slate-100/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)]'
      } anim-fade-up`}>
        <div className="transition-all duration-300">
          <h2 className={`font-bold text-[#0F172A] font-sans transition-all duration-300 ${isScrolled ? 'text-sm' : 'text-lg'}`}>
            Sales Productivity Dashboard
          </h2>
          {!isScrolled && (
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5 transition-all duration-200">
              Unified view of performance metrics to track growth, engagement, and productivity
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Executive Filter Dropdown */}
          <div className="flex flex-col space-y-0.5">
            {!isScrolled && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales Executive</span>}
            <CustomSelect
              options={[
                { value: 'All', label: 'All Sales Executives' },
                ...executiveOptions.map(e => ({ value: e.id, label: e.name }))
              ]}
              value={selectedExecutiveId}
              onChange={(val) => setSelectedExecutiveId(val)}
              icon={Users}
              className={`transition-all duration-300 ${isScrolled ? 'w-40' : 'w-48'}`}
            />
          </div>

          {/* Timeframe Filter Dropdown */}
          <div className="flex flex-col space-y-0.5">
            {!isScrolled && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeframe</span>}
            <CustomSelect
              options={[
                { value: 'Today', label: 'Today' },
                { value: 'This Week', label: 'This Week' },
                { value: 'This Month', label: 'This Month' },
                { value: 'This Year', label: 'This Year' },
                { value: 'Custom', label: 'Custom Range' }
              ]}
              value={filter}
              onChange={(val) => setFilter(val as any)}
              icon={Calendar}
              className={`transition-all duration-300 ${isScrolled ? 'w-36' : 'w-40'}`}
            />
          </div>

          {filter === 'Custom' && (
            <div className={`flex items-center gap-2 border px-3 rounded-xl text-xs font-semibold text-slate-650 transition-all duration-300 ${
              isScrolled ? 'py-1 border-slate-200 bg-white' : 'py-2 border-slate-200 bg-slate-50 self-end'
            }`}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-600 focus:outline-none"
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Key Performance Indicators (Total Leads, Engaged Leads, Action Taken, No Action) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Leads</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-3xl font-black text-slate-800 block mt-2">
            {analyticsLoading ? '—' : apiLeads}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Engaged Leads</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-3xl font-black text-slate-800 block mt-2">
            {analyticsLoading ? '—' : apiEngagedLeads}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Action Taken</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-3xl font-black text-blue-600 block mt-2">
            {analyticsLoading ? '—' : apiActionTaken}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Action Not Taken</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-3xl font-black text-rose-500 block mt-2">
            {analyticsLoading ? '—' : apiNoActionTaken}
          </span>
        </div>
      </div>

      {/* Row 2: Lead Growth Chart & Lead Pipeline Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph 1: Lead Growth Line Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-6 flex flex-col justify-between min-h-[360px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Lead Growth</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Daily lead acquisition velocity</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold border border-slate-200">
              <button
                onClick={() => setTrendMode('daily')}
                className={`px-3 py-1 rounded-lg transition ${trendMode === 'daily' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >
                Daily
              </button>
              <button
                onClick={() => setTrendMode('cumulative')}
                className={`px-3 py-1 rounded-lg transition ${trendMode === 'cumulative' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >
                Cumulative
              </button>
            </div>
          </div>

          <div className="flex-1 h-60 w-full min-h-[220px]">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                No lead growth data available for this timeframe
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area type="monotone" dataKey="Leads" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGrowth)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 2: Lead Pipeline Vertical Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-6 flex flex-col justify-between min-h-[360px]">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Lead Pipeline</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Breakdown of leads by current stage</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
              3 Stages
            </span>
          </div>

          <div className="flex-1 h-60 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadPipelineData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="stage" stroke="#94A3B8" fontSize={11} interval={0} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 6 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={44}>
                  {leadPipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Task Summary Cards (Total Tasks, Pending, Overdue, Completed) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div 
          onClick={() => navigate('/admin/tasks?status=ALL')}
          className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover cursor-pointer transition-all hover:border-blue-200 hover:shadow-md group"
          title="Click to view all tasks"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-blue-600 transition">Total Tasks</span>
            <ListChecks className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-3xl font-black text-slate-800 block mt-2">
            {analyticsLoading ? '—' : apiTotalTasks}
          </span>
        </div>

        <div 
          onClick={() => navigate('/admin/tasks?status=PENDING')}
          className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover cursor-pointer transition-all hover:border-amber-200 hover:shadow-md group"
          title="Click to view pending tasks"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-amber-600 transition">Pending Tasks</span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-3xl font-black text-amber-600 block mt-2">
            {analyticsLoading ? '—' : apiPendingTasks}
          </span>
        </div>

        <div 
          onClick={() => navigate('/admin/tasks?status=OVERDUE')}
          className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover cursor-pointer transition-all hover:border-rose-200 hover:shadow-md group"
          title="Click to view overdue tasks"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-rose-600 transition">Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-3xl font-black text-rose-600 block mt-2">
            {analyticsLoading ? '—' : apiOverdueTasks}
          </span>
        </div>

        <div 
          onClick={() => navigate('/admin/tasks?status=COMPLETED')}
          className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-xs card-hover cursor-pointer transition-all hover:border-emerald-200 hover:shadow-md group"
          title="Click to view completed tasks"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-emerald-600 transition">Completed Tasks</span>
            <CheckSquare className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-3xl font-black text-emerald-600 block mt-2">
            {analyticsLoading ? '—' : apiCompletedTasks}
          </span>
        </div>
      </div>


      {/* Row 4: Leads by Sources Donut & Leads Distribution by Owner Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph 3: Leads by Sources Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-6 flex flex-col justify-between min-h-[340px]">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Leads by Sources</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Source attribution breakdown</p>
            </div>
            {totalDist > 0 && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Total: {totalDist}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[180px]">
            {totalDist === 0 ? (
              <div className="text-xs font-semibold text-slate-400">No source distribution data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-semibold pt-4 border-t border-slate-100">
            {sourcesData.map((s, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                  <span className="text-slate-600 truncate text-[11px] font-semibold">{s.name}</span>
                </div>
                <div className="flex items-baseline gap-1 pl-4">
                  <span className="text-slate-800 font-black text-sm">{s.count}</span>
                  <span className="text-slate-400 font-bold text-[10px]">({s.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table 1: Leads Distribution by Owner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-6 flex flex-col justify-between min-h-[340px]">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#0F172A]">Leads Distribution by Owner</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Unique assigned leads count per executive</p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-4">Owner Name</th>
                  <th className="py-2.5 px-4 text-right"># Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {analyticsLoading ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">Loading user distribution...</td>
                  </tr>
                ) : salesDistribution.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400">No owner data available</td>
                  </tr>
                ) : (
                  salesDistribution.map((owner) => (
                    <tr key={owner.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-slate-800">
                        <div>
                          <span className="font-bold block">{owner.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-medium block">{owner.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-blue-600">{owner.uniqueLeadsCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 5: Action Taken vs No Action Taken Leads Roster */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Action Analytics Leads List</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              Detailed lead roster fetched via action-taken &amp; no-action APIs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveActionTab('taken');
                  setActionPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeActionTab === 'taken' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
              >
                Action Taken ({apiActionTaken})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveActionTab('noAction');
                  setActionPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeActionTab === 'noAction' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
                  }`}
              >
                No Action Taken ({apiNoActionTaken})
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/admin/action-leads?tab=${activeActionTab === 'taken' ? 'taken' : 'noAction'}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition hover:shadow-md cursor-pointer animate-in fade-in"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4">Sr. No.</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Tag</th>
                <th className="py-3 px-4">Executive</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {actionLeadsLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading analytics leads list...</span>
                    </div>
                  </td>
                </tr>
              ) : (activeActionTab === 'taken' ? actionTakenLeads : noActionLeads).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No leads found for this action filter.
                  </td>
                </tr>
              ) : (
                (activeActionTab === 'taken' ? actionTakenLeads : noActionLeads).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-400 font-bold">{(actionPage - 1) * 10 + idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {item.customer_detail?.customer_name || item.customer?.customer_name || item.customer_name || item.name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.customer_detail?.mobile_number || item.customer?.mobile_number || item.mobile_number || item.mobile || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const rawTag = item.tag || item.lead_detail?.tag || '';
                        const tagVal = (!rawTag || rawTag.toLowerCase() === 'general') ? '' : rawTag;
                        return tagVal ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-bold">
                      {item.assigned_sales_person?.name || item.assignedExecutive || item.customer_detail?.createbyname || item.customer_detail?.creator?.full_name || item.AssignedSalesExecutive?.full_name || 'Sales Exec'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${activeActionTab === 'taken'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                        {activeActionTab === 'taken' ? 'Action Completed' : 'Pending Action'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 6: Existing Charts Preserved (Project Bookings Donut, Top Brokers, Conversion Ratios) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Project Bookings Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-4 flex flex-col justify-between min-h-[340px]">
          <div className="space-y-1 mb-4">
            <h3 className="text-base font-bold text-[#0F172A]">Project Bookings</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              {useLeadsForPie ? 'Lead distribution by project' : 'Booking ratios by project'}
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            {statsLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : projectData.length === 0 ? (
              <div className="text-xs font-semibold text-slate-400">No project stats available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {projectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0F172A', color: '#FFF', borderRadius: '12px', fontSize: '11px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2 text-xs font-semibold pt-4 border-t border-slate-100">
            {projectData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="text-slate-800 font-bold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Brokers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-4">
          <h3 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Top Brokers</span>
          </h3>

          <div className="space-y-3">
            {topBrokers.map((broker) => (
              <div key={broker.rank} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-semibold">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${broker.rank === 1 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                    #{broker.rank}
                  </span>
                  <span className="text-slate-800 font-bold">{broker.name}</span>
                </div>
                <div className="flex gap-4 text-slate-500 font-bold">
                  <span>Leads: <strong className="text-slate-700">{broker.count}</strong></span>
                  <span>Conversions: <strong className="text-emerald-600">{broker.conversions}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel Ratios */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-xs lg:col-span-4 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <BarChart4 className="w-5 h-5 text-[#1A56DB]" />
            <span>Conversion Ratios</span>
          </h3>

          <div className="flex-1 w-full min-h-[180px] flex items-center justify-center">
            {statsLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 15, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ratio" radius={[0, 6, 6, 0]} barSize={14}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Action Analytics Leads Roster */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  {activeActionTab === 'taken' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <span>Action Taken Leads</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-rose-500" />
                      <span>Action Not Taken Leads</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                  Fetched via {activeActionTab === 'taken' ? '/leads/analytics/action-taken' : '/leads/analytics/no-action'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Tab toggle in modal */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab('taken');
                      setActionPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeActionTab === 'taken' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Action Taken ({apiActionTaken})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab('noAction');
                      setActionPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeActionTab === 'noAction' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    No Action ({apiNoActionTaken})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-4">Sr. No.</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Tag</th>
                    <th className="py-3 px-4">Assigned Executive</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {actionLeadsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Loading analytics leads...</span>
                        </div>
                      </td>
                    </tr>
                  ) : actionApiError ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-rose-500 font-medium">
                        {actionApiError}
                      </td>
                    </tr>
                  ) : (activeActionTab === 'taken' ? actionTakenLeads : noActionLeads).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        No leads found for this action filter.
                      </td>
                    </tr>
                  ) : (
                    (activeActionTab === 'taken' ? actionTakenLeads : noActionLeads).map((item, idx) => (
                      <tr key={item.id || item.lead_id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 text-slate-400 font-bold">
                          {(actionPage - 1) * 10 + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.customer_detail?.customer_name || item.customer?.customer_name || item.customer_name || item.name || item.full_name || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {item.customer_detail?.mobile_number || item.customer?.mobile_number || item.mobile_number || item.mobile || item.phone || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-100">
                            {item.tag || item.lead_detail?.tag || item.customer_detail?.tag || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-bold">
                          {item.assignedExecutive || item.customer_detail?.createbyname || item.customer_detail?.creator?.full_name || item.AssignedSalesExecutive?.full_name || 'Sales Executive'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            activeActionTab === 'taken'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {activeActionTab === 'taken' ? 'Action Completed' : 'Pending Action'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer / Pagination */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>
                Showing page {actionPage} of {Math.max(1, Math.ceil(actionTotalItems / 10))} ({actionTotalItems} Total Leads)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionPage <= 1 || actionLeadsLoading}
                  onClick={() => setActionPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={actionPage >= Math.ceil(actionTotalItems / 10) || actionLeadsLoading}
                  onClick={() => setActionPage(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;
