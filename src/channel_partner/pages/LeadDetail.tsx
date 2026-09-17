import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Tag,
  Briefcase,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertCircle,
  Home,
  DollarSign,
  Layers,
  UserCheck,
  Activity,
  StickyNote,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../../axiosinstance';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Broker {
  id: number;
  broker_name: string;
  company_name: string;
}

interface CustomerDetail {
  id: number;
  broker_id: number;
  customer_name: string;
  mobile_number: string;
  email: string | null;
  broker?: Broker;
}

interface VisitExecutive {
  id: number;
  name: string;
  email: string;
  mobile_number: string;
}

interface Visit {
  id: number;
  visit_code: string;
  status: number;
  scheduled_date: string;
  scheduled_time: string;
  check_in_time?: string | null;
  AssignedSalesExecutive?: VisitExecutive;
}

interface LeadNote {
  id: number;
  note: string;
  created_by: number;
  createdByName?: string;
  createdAt?: string;
}

interface ActivityLog {
  id: number;
  activityType: string;
  message: string;
  date: string;
}

interface LeadData {
  id: number;
  customer_id: number;
  project: string;
  stage: number;
  createdAt: string;
  updatedAt: string;
  customer_detail: CustomerDetail;
  visits?: Visit[];
  notes?: LeadNote[];
  activityLogs?: ActivityLog[];
  AssignedSalesExecutive?: VisitExecutive;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      const cleanStr = iso.split('T')[0];
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
    return iso.split('T')[0];
  }
};

const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return iso; }
};

const STAGE_CONFIG: Record<number, { label: string; pill: string; dot: string }> = {
  1: { label: 'Enquiry',     pill: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400' },
  2: { label: 'Site Visit',  pill: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  3: { label: 'Negotiation', pill: 'bg-purple-50 text-purple-700 border-purple-200',    dot: 'bg-purple-500' },
  4: { label: 'Booked',      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  5: { label: 'Cancelled',   pill: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-500' },
};

const PROJECT_MAP: Record<string, string> = {
  '1': 'Evara', '2': 'Evara Phase 2', '3': 'Evara Heights', '4': 'Evara Grand', '5': 'Evara',
};
const resolveProject = (id: string) => PROJECT_MAP[id] ?? `Project ${id}`;

// ─── Sidebar detail row ───────────────────────────────────────────────────────
const SideRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-start gap-2 py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">{label}</span>
    <span className="text-[11px] font-bold text-slate-800 text-right leading-snug">{value || '—'}</span>
  </div>
);

// ─── DataField chip ───────────────────────────────────────────────────────────
const DataField: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode; accent?: boolean }> = ({
  label, value, icon, accent,
}) => (
  <div className={`rounded-xl p-3.5 border ${accent ? 'bg-blue-50/60 border-blue-100' : 'bg-slate-50/60 border-slate-100'}`}>
    <div className="flex items-center gap-1.5 mb-1.5">
      {icon && <span className={accent ? 'text-blue-500' : 'text-slate-400'}>{icon}</span>}
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
    </div>
    <span className={`text-xs font-bold block leading-snug ${accent ? 'text-blue-700' : 'text-slate-800'}`}>
      {value || '—'}
    </span>
  </div>
);

// ─── Stage progress ───────────────────────────────────────────────────────────
const StageProgress: React.FC<{ stage: number }> = ({ stage }) => {
  const steps = [
    { num: 1, label: 'Enquiry' },
    { num: 2, label: 'Site Visit' },
    { num: 3, label: 'Negotiation' },
    { num: 4, label: 'Booked' },
  ];
  return (
    <div className="flex items-center w-full">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
              ${s.num < stage  ? 'bg-emerald-500 border-emerald-500 text-white'
              : s.num === stage ? 'bg-blue-600 border-blue-600 text-white ring-3 ring-blue-100'
              : 'bg-white border-slate-200 text-slate-400'}`}
            >
              {s.num < stage ? <CheckCircle className="w-3 h-3" /> : s.num}
            </div>
            <span className={`text-[8px] font-bold mt-1 whitespace-nowrap leading-tight text-center
              ${s.num === stage ? 'text-blue-600' : s.num < stage ? 'text-emerald-600' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mx-0.5 mb-4 rounded-full transition-all ${s.num < stage ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = 'visit' | 'timeline' | 'notes';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'visit',    label: 'Visit Details', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'timeline', label: 'Timeline',      icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'notes',    label: 'Notes',         icon: <StickyNote className="w-3.5 h-3.5" /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export const LeadDetailPage: React.FC = () => {
  const { brokerId, leadId } = useParams<{ brokerId: string; leadId: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('visit');

  useEffect(() => {
    if (!brokerId || !leadId) return;
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerId, leadId]);

  const fetchLead = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/leads/${leadId}`);
      if (res.data?.success) {
        const found = res.data.data;
        if (found) {
          setLead(found);
          if (found.customer_detail?.customer_name) {
            localStorage.setItem('cpLeadCustomerName', found.customer_detail.customer_name);
          }
        } else {
          setError('Lead not found.');
        }
      } else {
        setError('Failed to load lead data.');
      }
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading lead details…</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-800">{error || 'Something went wrong'}</p>
          <p className="text-xs text-slate-400">Check your connection and try again.</p>
        </div>
        <button
          onClick={() => navigate(`/channel-partner/brokers/${brokerId}/leads`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
      </div>
    );
  }

  const cust = lead.customer_detail;
  const customerName = cust?.customer_name || 'Unknown Customer';
  const initials = customerName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const stage = STAGE_CONFIG[lead.stage] ?? { label: `Stage ${lead.stage}`, pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  const notesCount = lead.notes?.length ?? 0;

  // ─── Tab renderers ──────────────────────────────────────────────────────────
  const renderVisit = () => {
    const activeVisit = lead.visits?.[0];
    if (!activeVisit) {
      return (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">No visit scheduled yet</p>
          <p className="text-xs text-slate-400 mt-1">Visit details will appear here once confirmed.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)]">
          <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block mb-2">
            Visit Code: {activeVisit.visit_code}
          </span>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-black">{formatDate(activeVisit.scheduled_date)}</p>
              <p className="text-sm font-bold text-emerald-100 mt-0.5">{activeVisit.scheduled_time}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <DataField 
            label="Visit Date" 
            value={formatDate(activeVisit.scheduled_date)} 
            icon={<Calendar className="w-3.5 h-3.5" />} 
            accent 
          />
          <DataField 
            label="Visit Time" 
            value={activeVisit.scheduled_time} 
            icon={<Clock className="w-3.5 h-3.5" />} 
          />
          {activeVisit.check_in_time && (
            <DataField 
              label="Actual Check-in" 
              value={activeVisit.check_in_time} 
              icon={<Clock className="w-3.5 h-3.5" />} 
            />
          )}
          
          {activeVisit.AssignedSalesExecutive && (
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2 font-sans">Assigned Sales Executive</span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">
                  {activeVisit.AssignedSalesExecutive.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{activeVisit.AssignedSalesExecutive.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{activeVisit.AssignedSalesExecutive.email} &middot; {activeVisit.AssignedSalesExecutive.mobile_number}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const logs = lead.activityLogs || [];
    if (logs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">No activity logged yet</p>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in duration-200 relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-100" />
        <div className="space-y-0">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 pb-6 last:pb-0 relative">
              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white bg-blue-50 border-blue-200">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <p className="text-xs font-bold text-slate-800">{log.message}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {log.activityType}
                </p>
              </div>
              <span className="shrink-0 text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg mt-0.5 whitespace-nowrap">
                {formatDate(log.date)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNotes = () => {
    const notesList = lead.notes || [];
    if (notesList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">No notes yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 animate-in fade-in duration-200">
        {notesList.map((note) => (
          <div key={note.id} className="p-4 rounded-xl border border-amber-100 bg-amber-50/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-250 text-amber-800 flex items-center justify-center text-[9px] font-black">
                {(note.createdByName || 'A')[0]}
              </div>
              <span className="text-[10px] font-black text-amber-700">{note.createdByName || 'Staff'}</span>
              {note.createdAt && <span className="text-[9px] text-slate-400 font-semibold ml-auto">{formatDate(note.createdAt)}</span>}
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">{note.note}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="text-left flex-1 flex flex-col animate-in fade-in duration-200 space-y-0">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/channel-partner/brokers/${brokerId}/leads`)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-[#0F172A]">Lead Detail</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">
              My Brokers › Broker #{brokerId} › {customerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border ${stage.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
            {stage.label}
          </span>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* ── Customer card ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
            {/* Avatar header */}
            <div className="bg-gradient-to-br from-[#1A56DB] to-[#4F46E5] px-5 pt-8 pb-6 text-center relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
              <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-xl font-black shadow-[0_8px_24px_rgba(0,0,0,0.2)] mb-3 border border-white/30 relative z-10">
                {initials}
              </div>
              <h3 className="text-base font-black text-white relative z-10">{customerName}</h3>
              <span className="text-[10px] font-semibold text-blue-200 mt-0.5 block relative z-10">Customer ID: #{cust?.id ?? '—'}</span>
            </div>

            {/* Quick-action row */}
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <a href={`tel:${cust?.mobile_number}`}
                className="flex flex-col items-center gap-1 py-3.5 hover:bg-slate-50 transition group cursor-pointer">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Call</span>
              </a>
              <a href={cust?.email ? `mailto:${cust.email}` : undefined}
                className={`flex flex-col items-center gap-1 py-3.5 hover:bg-slate-50 transition group ${cust?.email ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Email</span>
              </a>
            </div>

            {/* ── Lead ID + dates section ── */}
            <div className="px-5 pt-4 pb-1">
              <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 mb-4 shadow-[0_2px_12px_rgba(37,99,235,0.2)]">
                <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest block mb-1">Lead ID</span>
                <p className="text-sm font-black text-white tracking-wide mb-3">LEAD-#{lead.id}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest block mb-0.5">Registered</span>
                    <span className="text-[11px] font-bold text-white">{formatDate(lead.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest block mb-0.5">Last Updated</span>
                    <span className="text-[11px] font-bold text-white">{formatDate(lead.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Overview details ── */}
            <div className="px-5 pb-5 space-y-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Customer</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <SideRow label="Phone" value={cust?.mobile_number} />
              <SideRow label="Email" value={cust?.email || 'Not provided'} />

              {cust?.broker && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-3">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Broker Connection</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <SideRow label="Broker Name" value={cust.broker.broker_name} />
                  <SideRow label="Company" value={cust.broker.company_name} />
                </>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT PANEL (tabs) ───────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-slate-100 px-5 gap-0 overflow-x-auto">
              {TABS.map((tab) => {
                const badge = tab.id === 'notes' ? notesCount : null;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-4 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all cursor-pointer -mb-px
                      ${isActive
                        ? 'text-blue-600 border-blue-600'
                        : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-200'}`}
                  >
                    {tab.icon}
                    {tab.label}
                    {badge !== null && (
                      <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none
                        ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-5">
              {activeTab === 'visit'    && renderVisit()}
              {activeTab === 'timeline' && renderTimeline()}
              {activeTab === 'notes'    && renderNotes()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
