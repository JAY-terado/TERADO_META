import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import {
  Users,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import axiosClient from '../../../axiosinstance';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const fullName = Cookies.get('full_name') || 'Channel Partner';
  const firstName = fullName.split(' ')[0];

  const [stats, setStats] = useState({
    totalLeads: 0,
    visitScheduled: 0,
    checkedIn: 0,
    negotiations: 0,
    bookings: 0,
    cancelled: 0,
  });

  const [topBrokers, setTopBrokers] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<{ id: number; broker_name: string; company_name: string }[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<{ id: number | null; name: string }>(() => {
    try {
      const saved = localStorage.getItem('cp_selectedBroker');
      return saved ? JSON.parse(saved) : { id: null, name: 'All Brokers' };
    } catch {
      return { id: null, name: 'All Brokers' };
    }
  });
  const [brokerSearch, setBrokerSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dateFilter, setDateFilter] = useState(() => localStorage.getItem('cp_dateFilter') || 'This Month');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('cp_startDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('cp_endDate') || '');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('cp_selectedBroker', JSON.stringify(selectedBroker));
  }, [selectedBroker]);

  useEffect(() => {
    localStorage.setItem('cp_dateFilter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('cp_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('cp_endDate', endDate);
  }, [endDate]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch brokers list on mount
  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const res = await axiosClient.get('/brokers?page=1&limit=100');
        if (res.data?.success && res.data.data) {
          setBrokers(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch brokers for dropdown', err);
      }
    };
    fetchBrokers();
  }, []);

  // Fetch dashboard stats based on selected broker and date filter
  useEffect(() => {
    const fetchStats = async () => {
      try {
        let url = '/leads/broker-only/stats';
        const params: string[] = [];

        if (selectedBroker.id) {
          params.push(`broker_id=${selectedBroker.id}`);
        }

        if (dateFilter) {
          params.push(`filter=${encodeURIComponent(dateFilter)}`);
        }

        if (dateFilter === 'Custom' && startDate && endDate) {
          params.push(`startDate=${startDate}`);
          params.push(`endDate=${endDate}`);
        }

        if (params.length > 0) {
          url += `?${params.join('&')}`;
        }

        const res = await axiosClient.get(url);
        if (res.data?.success && res.data.data) {
          const payload = res.data.data;
          if (payload.stats) {
            setStats(payload.stats);
          }
          if (payload.topPerformingBrokers) {
            setTopBrokers(payload.topPerformingBrokers);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };
    fetchStats();
  }, [selectedBroker.id, dateFilter, startDate, endDate]);

  const funnelStages = [
    { label: 'Registered', count: stats.totalLeads, conv: '100%', time: '—', color: 'from-blue-600 to-blue-500', widthClass: 'w-[100%]' },
    { label: 'Scheduled', count: stats.visitScheduled, conv: `${stats.totalLeads ? Math.round((stats.visitScheduled / stats.totalLeads) * 100) : 0}%`, time: '2 Days', color: 'from-sky-500 to-sky-400', widthClass: 'w-[85%]' },
    { label: 'Site Visit', count: stats.checkedIn, conv: `${stats.totalLeads ? Math.round((stats.checkedIn / stats.totalLeads) * 100) : 0}%`, time: '4 Days', color: 'from-indigo-600 to-indigo-500', widthClass: 'w-[70%]' },
    { label: 'Negotiation', count: stats.negotiations, conv: `${stats.totalLeads ? Math.round((stats.negotiations / stats.totalLeads) * 100) : 0}%`, time: '8 Days', color: 'from-purple-600 to-purple-500', widthClass: 'w-[55%]' },
    { label: 'Booking', count: stats.bookings, conv: `${stats.totalLeads ? Math.round((stats.bookings / stats.totalLeads) * 100) : 0}%`, time: '5 Days', color: 'from-emerald-500 to-emerald-400', widthClass: 'w-[40%]' }
  ];

  // Dynamic leads by company source based on topBrokers or brokers
  const rawSourceData = topBrokers.map((tb, idx) => {
    const match = brokers.find((b) => b.id === tb.id);
    const company = match ? match.company_name : tb.broker_name || 'Agency';
    return {
      name: company || 'Agency',
      value: tb.totalLeads ?? 0,
      color: ['#3B82F6', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6'][idx % 5]
    };
  });

  const activeSourceData = rawSourceData.filter(d => d.value > 0);

  // Fallback to top brokers company names with their relative proportions if no leads exist yet
  const fallbackSourceData: any[] = [];

  const finalSourceData = activeSourceData.length > 0 ? activeSourceData : fallbackSourceData;
  const totalSourceLeads = finalSourceData.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const sourceData = finalSourceData.map(d => ({
    ...d,
    percent: `${Math.round((d.value / totalSourceLeads) * 100)}%`
  }));

  // Render Top Performing Brokers dynamically from API response
  const finalBrokersList = topBrokers.map((b, idx) => {
    const leadsCount = b.totalLeads ?? 0;
    const visitsCount = b.visitsCount ?? 0;
    const bookingsCount = b.bookingsCount ?? 0;
    const convRate = leadsCount ? `${Math.round((bookingsCount / leadsCount) * 100)}%` : '0%';
    
    // Use company_name directly from API, or look up in brokers list
    const match = brokers.find((br) => br.id === b.id);
    const company = b.company_name || (match && match.company_name) || '--';

    return {
      rank: idx + 1,
      name: b.broker_name || 'N/A',
      company: company,
      leads: leadsCount,
      visits: visitsCount,
      bookings: bookingsCount,
      conv: convRate,
    };
  });

  const displayBrokers = finalBrokersList.length > 0 ? finalBrokersList : [];

  return (
    <div className="space-y-6 text-left">
      {/* Header Greeting & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Good morning, {firstName} 👋</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Here's what's happening with your business today.</p>
        </div>

        {/* Datepicker & Brokers Filters dropdown */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Filter Dropdown */}
          <div className="relative w-full sm:w-48" ref={dateDropdownRef}>
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 bg-white px-3.5 py-2 border border-slate-100 rounded-xl shadow-xs text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {dateFilter === 'Custom'
                    ? `${startDate || 'Start'} to ${endDate || 'End'}`
                    : dateFilter}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2.5 space-y-1">
                {['Today', 'This Week', 'This Month', 'This Year', 'Custom'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setDateFilter(opt);
                      if (opt !== 'Custom') {
                        setDateDropdownOpen(false);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                      dateFilter === opt ? 'bg-blue-50/50 text-blue-600' : 'text-slate-600'
                    }`}
                  >
                    {opt}
                  </button>
                ))}

                {dateFilter === 'Custom' && (
                  <div className="p-2 border-t border-slate-50 space-y-2 mt-1.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setDateDropdownOpen(false)}
                      className="w-full py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Broker Searchable Dropdown */}
          <div className="relative w-full sm:w-60" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between gap-2 bg-white px-3.5 py-2 border border-slate-100 rounded-xl shadow-xs text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{selectedBroker.name}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2.5 space-y-2">
                <input
                  type="text"
                  placeholder="Search broker..."
                  value={brokerSearch}
                  onChange={(e) => setBrokerSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectedBroker({ id: null, name: 'All Brokers' });
                      setDropdownOpen(false);
                      setBrokerSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                      selectedBroker.id === null ? 'bg-blue-50/50 text-blue-600' : 'text-slate-600'
                    }`}
                  >
                    All Brokers
                  </button>
                  {brokers
                    .filter((b) => b.broker_name.toLowerCase().includes(brokerSearch.toLowerCase()))
                    .map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBroker({ id: b.id, name: b.broker_name });
                          setDropdownOpen(false);
                          setBrokerSearch('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${
                          selectedBroker.id === b.id ? 'bg-blue-50/50 text-blue-600' : 'text-slate-600'
                        }`}
                      >
                        {b.broker_name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={() => {
              setSelectedBroker({ id: null, name: 'All Brokers' });
              setDateFilter('This Month');
              setStartDate('');
              setEndDate('');
              setBrokerSearch('');
            }}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer focus:outline-none shrink-0"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Leads */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Leads</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">{stats.totalLeads}</span>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Checked-In */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checked-In</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">{stats.checkedIn}</span>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Visit Scheduled */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visit Scheduled</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">{stats.visitScheduled}</span>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Negotiation */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Negotiation</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">{stats.negotiations}</span>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 5: Booking */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Booking</span>
              <span className="text-2xl font-black text-slate-800 block mt-1">{stats.bookings}</span>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 1 Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Funnel */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Sales Funnel</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Pipeline progression and stage conversions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Funnel list */}
            <div className="md:col-span-5 flex flex-col items-center gap-1.5 w-full">
              {funnelStages.map((stage, idx) => (
                <div
                  key={idx}
                  className={`bg-gradient-to-r ${stage.color} h-7 rounded-md flex items-center justify-center text-white text-[10px] font-black shadow-xs ${stage.widthClass} transition-all duration-300`}
                >
                  {stage.label} ({stage.count})
                </div>
              ))}
            </div>
            
            {/* Conversion Table */}
            <div className="md:col-span-7 overflow-x-auto w-full">
              <table className="w-full text-left text-[11px] font-semibold text-slate-500">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-2">
                    <th className="pb-2 font-black">Stage</th>
                    <th className="pb-2 font-black text-right">Leads</th>
                    <th className="pb-2 font-black text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {funnelStages.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-700">{s.label}</td>
                      <td className="py-2.5 text-right font-bold text-slate-800">{s.count}</td>
                      <td className="py-2.5 text-right text-indigo-655 font-extrabold">{s.conv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Lead Quality */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Lead Quality</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quality metrics and intent stats</p>
          </div>
          
          <div className="flex items-center justify-center py-4">
            {/* Circle Donut representing Booking / Total Leads */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-655"
                  strokeWidth="3.2"
                  strokeDasharray={`${stats.totalLeads ? Math.round((stats.bookings / stats.totalLeads) * 100) : 0}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800">
                  {stats.totalLeads ? Math.round((stats.bookings / stats.totalLeads) * 100) : 0}
                </span>
                <span className="text-[8px] text-center font-bold text-slate-450 uppercase tracking-wider block mt-0.5">
                  /100
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center mt-2 pt-2 border-t border-slate-50">
            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">High Intent</span>
              <span className="text-xs font-black text-emerald-600 block mt-0.5">
                {Math.max(Math.round(stats.totalLeads * 0.45), 0)}
              </span>
            </div>
            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">At Risk</span>
              <span className="text-xs font-black text-rose-600 block mt-0.5">{stats.cancelled}</span>
            </div>
          </div>
        </div>

        {/* Leads by Source */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Leads by Source</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Acquisition channels distribution</p>
          </div>
          
          <div className="flex-1 flex items-center gap-4 py-2">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white p-2.5 rounded-xl shadow-xl text-left text-[10px]">
                            <p className="font-bold text-slate-400 uppercase tracking-wide">{data.name}</p>
                            <p className="font-extrabold text-blue-400 mt-0.5">{data.value} ({data.percent})</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-[13px] font-black text-slate-800 leading-none">{stats.totalLeads}</span>
                <span className="text-[7px] text-center font-bold text-slate-450 uppercase tracking-wider block mt-0.5">
                  Total
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 text-[9px] font-bold text-slate-500">
              {sourceData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-slate-800">{item.percent}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Top Performing Brokers */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Top Performing Brokers</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Leads contribution and conversion stats per broker</p>
          </div>
          <button
            onClick={() => navigate('/channel-partner/leads')}
            className="text-xs text-indigo-650 font-bold hover:underline cursor-pointer"
          >
            View All Brokers &rarr;
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-semibold text-slate-500">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-2">
                <th className="pb-2 font-black w-10">#</th>
                <th className="pb-2 font-black">Company Name</th>
                <th className="pb-2 font-black">Broker Name</th>
                <th className="pb-2 font-black text-right">Leads</th>
                <th className="pb-2 font-black text-right">Site Visits</th>
                <th className="pb-2 font-black text-right">Bookings</th>
                <th className="pb-2 font-black text-right">Conv. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayBrokers.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-bold text-slate-400">{b.rank}</td>
                  <td className="py-3 font-bold text-slate-700">{b.company}</td>
                  <td className="py-3 font-bold text-slate-700">{b.name}</td>
                  <td className="py-3 text-right font-bold text-slate-800">{b.leads}</td>
                  <td className="py-3 text-right font-bold text-slate-600">{b.visits}</td>
                  <td className="py-3 text-right font-bold text-slate-600">{b.bookings}</td>
                  <td className="py-3 text-right font-extrabold text-indigo-650">{b.conv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
