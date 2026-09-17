import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Cookies from 'js-cookie';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import {
  ArrowLeft, Share2, Download, Clock, Calendar,
  ShieldCheck, MapPin, Ticket, ChevronRight, Loader2, Search
} from 'lucide-react';
import { getLeads, STAGE_LABELS, STAGE_COLORS } from '../../../broker/services/leads.service';
import type { Lead } from '../../../broker/services/leads.service';
import Swal from 'sweetalert2';
import { getMyVisits } from '../../../pages/api/registercustomer';

interface ExtendedLead extends Lead {
  user?: {
    id: number;
    full_name: string;
    contact_number: string;
    email: string;
    role?: string;
  } | null;
  rawVisit?: any;
}

const mapMyVisitToLead = (v: any): ExtendedLead => {
  return {
    id: v.id,
    customer_id: v.customer_id,
    lead_id: v.visit_code || `VISIT-${v.id}`,
    city: v.customer?.city || '',
    project: v.project_id || 0,
    unit_type: '',
    budget: 0,
    scheduled_visit_date: v.scheduled_date ? `${v.scheduled_date}T${v.scheduled_time || '00:00:00'}` : '',
    scheduled_visit_time: v.scheduled_time ? `${v.scheduled_date || new Date().toISOString().split('T')[0]}T${v.scheduled_time}` : '',
    stage: v.status || 1,
    status: v.status || 1,
    created_by: v.created_by,
    updated_by: v.updated_by,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    customer_detail: {
      id: v.customer?.id || v.customer_id,
      broker_id: v.broker_id,
      customer_name: v.customer?.customer_name || 'N/A',
      mobile_number: v.customer?.mobile_number || 'N/A',
      email: v.customer?.email || 'N/A',
      status: 1,
      created_by: v.created_by,
      updated_by: v.updated_by,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    },
    project_detail: {
      id: v.project?.id || 0,
      project_name: v.project?.project_name || v.customer?.note || 'Sunrise Meadows',
      project_type_id: 1,
      project_status_id: 1,
      launch_date: '',
      possession_date: '',
      country: 'India',
      state: v.project?.state || 'Maharashtra',
      city: v.project?.city || 'Mumbai',
      area_locality: '',
      landmark: '',
      full_address: '',
      pincode: '',
      rera_registration_number: '',
      rera_registration_date: '',
      rera_expiry_date: '',
      towers: 1,
      units: 1,
      status: 1,
      createdAt: '',
      updatedAt: '',
    },
    user: v.user ? {
      id: v.user.id,
      full_name: v.user.full_name,
      contact_number: v.user.contact_number,
      email: v.user.email,
      role: v.user.role
    } : null,
    rawVisit: v
  };
};

const formatDate = (iso: string) => {
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

const formatTime = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const VisitPass: React.FC = () => {
  const { setActiveScreen } = useBrokerConnect();
  const [leads, setLeads] = useState<ExtendedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const brokerName = Cookies.get('full_name') || 'Broker';
  const isCallingRole = typeof window !== 'undefined' && window.location.pathname.includes('/calling');

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        if (isCallingRole) {
          const res = await getMyVisits();
          if (res.success && res.data.length > 0) {
            const mapped = res.data.map(mapMyVisitToLead);
            setLeads(mapped);
            setSelectedId(mapped[0].id);
          }
        } else {
          const res = await getLeads(1, 50);
          if (res.success && res.data.length > 0) {
            setLeads(res.data);
            setSelectedId(res.data[0].id);
          }
        }
      } catch {
        // silently fail — show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    const name = lead.customer_detail?.customer_name?.toLowerCase() || '';
    const id = lead.lead_id?.toLowerCase() || '';
    const proj = lead.project_detail?.project_name?.toLowerCase() || '';
    return name.includes(q) || id.includes(q) || proj.includes(q);
  });

  const activeLead = leads.find(l => l.id === selectedId) ?? filteredLeads[0] ?? null;

  const handleDownloadPass = () => {
    if (!activeLead) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire({
        title: 'Error',
        text: 'Popup blocker prevented the download. Please allow popups for this site.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;
    const docTitle = `${activeLead.customer_detail?.customer_name || 'Customer'} - ${activeLead.lead_id}`;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${docTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket {
      width: 400px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      margin: 20px;
      page-break-inside: avoid;
    }
    .header {
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      padding: 24px;
      color: white;
      text-align: left;
      position: relative;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 11px;
      color: #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .pass-type {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 750;
      float: right;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .visit-code {
      font-size: 11px;
      color: #dbeafe;
      float: right;
      font-weight: bold;
    }
    .body {
      padding: 24px;
      text-align: center;
    }
    .qr-container {
      margin: 0 auto 24px auto;
      width: 160px;
      height: 160px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    .qr-container img {
      width: 100%;
      height: 100%;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: left;
      border-top: 1px dashed #e2e8f0;
      border-bottom: 1px dashed #e2e8f0;
      padding: 16px 0;
      margin-bottom: 16px;
    }
    .grid-item {
      font-size: 12px;
    }
    .label {
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 2px;
      font-weight: bold;
    }
    .value {
      color: #1e293b;
      font-weight: 700;
    }
    .footer {
      font-size: 10px;
      color: #059669;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    @page {
      size: auto;
      margin: 0;
    }
    @media print {
      html, body {
        height: auto !important;
        min-height: 0 !important;
      }
      body {
        background-color: white;
        padding: 40px;
        display: block !important;
      }
      .ticket {
        box-shadow: none;
        border: 1px solid #cbd5e1;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <span class="pass-type">Premium Pass</span>
      <span class="visit-code">${activeLead.lead_id}</span>
      <div style="clear:both;"></div>
      <h1 style="margin-top: 12px;">${activeLead.project_detail?.project_name || 'Sunrise Meadows'}</h1>
      <p>${activeLead.project_detail?.city || 'Mumbai'}, ${activeLead.project_detail?.state || 'Maharashtra'}</p>
    </div>
    <div class="body">
      <div class="qr-container">
        <img src="${qrCodeUrl}" alt="QR Code" />
      </div>
      <div class="grid">
        <div class="grid-item">
          <span class="label">Customer Name</span>
          <span class="value">${activeLead.customer_detail?.customer_name || '—'}</span>
        </div>
        <div class="grid-item">
          <span class="label">Broker Name</span>
          <span class="value">${brokerName}</span>
        </div>
        <div class="grid-item">
          <span class="label">Visited Date</span>
          <span class="value">${formatDate(activeLead.scheduled_visit_date)}</span>
        </div>
        <div class="grid-item">
          <span class="label">Expected Time</span>
          <span class="value">${formatTime(activeLead.scheduled_visit_time)}</span>
        </div>
        <div class="grid-item">
          <span class="label">Phone Number</span>
          <span class="value">${activeLead.customer_detail?.mobile_number || '—'}</span>
        </div>
        <div class="grid-item" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span class="label">Email</span>
          <span class="value">${activeLead.customer_detail?.email || '—'}</span>
        </div>
      </div>
      <div class="footer">
        <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>Lead protected & verification lock active</span>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 500);
    }
  </script>
</body>
</html>
    `);
    printWindow.document.close();
  };

  // Build QR JSON payload
  const getQrPayload = () => {
    if (!activeLead) return '';

    if (activeLead.rawVisit) {
      const v = activeLead.rawVisit;
      return JSON.stringify({
        id: v.lead_id,
        customer_id: v.customer_id,
        visit_id: v.id,
        visit_code: v.visit_code,
        customer_name: activeLead.customer_detail?.customer_name || 'N/A',
        broker_name: brokerName,
        visit_date: v.scheduled_date,
        expected_time: v.scheduled_time,
        mobile: activeLead.customer_detail?.mobile_number || 'N/A'
      });
    }

    return JSON.stringify({
      id: activeLead.id,
      customer_id: activeLead.customer_id,
      visit_id: null,
      visit_code: activeLead.lead_id,
      customer_name: activeLead.customer_detail?.customer_name || 'N/A',
      broker_name: brokerName,
      visit_date: activeLead.scheduled_visit_date ? activeLead.scheduled_visit_date.split('T')[0] : '',
      expected_time: activeLead.scheduled_visit_time ? activeLead.scheduled_visit_time.split('T')[1]?.slice(0, 8) || '' : '',
      mobile: activeLead.customer_detail?.mobile_number || 'N/A'
    });
  };

  const qrPayload = getQrPayload();

  // ── Header ──────────────────────────────────────────────────────────────────
  const Header = (
    <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveScreen(2)}
          className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Visit Pass</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            {isCallingRole ? 'Calling Desk' : 'Broker Portal'} &gt; Registration Ticket Generated
          </p>
        </div>
      </div>
      <button
        onClick={() => setActiveScreen(2)}
        className="text-xs font-bold text-[#1A56DB] hover:text-[#1648C0] transition-colors cursor-pointer"
      >
        Go back to Dashboard
      </button>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        {Header}
        <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] p-16 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading visit passes…</p>
        </div>
      </div>
    );
  }

  // ── Empty State ──────────────────────────────────────────────────────────────
  if (leads.length === 0) {
    return (
      <div className="space-y-6">
        {Header}
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto anim-scale-in">
          <Ticket className="w-8 h-8 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-[#0F172A] mb-1">No active visit passes found</h3>
          <p className="text-slate-400 text-sm font-medium mb-4">
            Register a customer and verify their mobile OTP to generate an active digital entry pass.
          </p>
          <button
            onClick={() => setActiveScreen(3)}
            className="px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] cursor-pointer"
          >
            Register Customer
          </button>
        </div>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-left">
      {Header}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* ── Left: Pass Selector ─────────────────────────────────────────── */}
        <div className="md:col-span-5 lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-up stagger-2">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#0F172A]">Select Visit Pass</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {filteredLeads.length} active digital ticket{filteredLeads.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, ID, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredLeads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              const stageLabel = STAGE_LABELS[lead.stage] ?? `Stage ${lead.stage}`;
              const stageColor = STAGE_COLORS[lead.stage] ?? 'bg-slate-50 text-slate-600 border border-slate-200';

              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-100 shadow-sm translate-x-1'
                      : 'bg-slate-50/30 hover:bg-slate-50/80 border-slate-100/80'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`} />
                      <span className={`text-xs font-bold block truncate ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                        {lead.customer_detail?.customer_name || 'N/A'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block truncate">
                      {lead.project_detail?.project_name || 'N/A'}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block tracking-tight uppercase">
                      {lead.lead_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stageColor}`}>
                      {stageLabel}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Ticket Card ───────────────────────────────────────────── */}
        {activeLead && (
          <div className="md:col-span-7 lg:col-span-8 flex justify-center items-center p-2 anim-fade-up stagger-3">
            <div className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_24px_rgba(15,23,42,0.08)] overflow-hidden relative">

              {/* Shimmer sweep */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]" style={{ zIndex: 1 }}>
                <div
                  className="absolute inset-0 -skew-x-12"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                    animation: 'shimmerSweep 1.2s ease 0.3s both',
                    backgroundSize: '200% 100%',
                  }}
                />
              </div>

              {/* Top Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white space-y-2 relative">
                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner" />

                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded border border-white/10 uppercase tracking-widest">
                    Premium Pass
                  </span>
                  <span className="text-xs font-extrabold text-blue-100 tracking-wide uppercase">
                    {activeLead.lead_id}
                  </span>
                </div>

                <div className="space-y-1 text-left">
                  <h3 className="text-xl font-black tracking-tight">{activeLead.project_detail?.project_name || 'N/A'}</h3>
                  <p className="text-[10px] text-blue-100/80 font-bold uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-200" />
                    <span>{activeLead.project_detail?.city || 'N/A'}, {activeLead.project_detail?.state || 'N/A'}</span>
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8 space-y-6 text-center">

                {/* QR Code — real data */}
                <div className="mx-auto w-44 h-44 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-3 shadow-inner">
                  <QRCodeSVG
                    value={qrPayload}
                    size={152}
                    bgColor="#f8fafc"
                    fgColor="#1e293b"
                    level="M"
                  />
                </div>

                {/* Details grid */}
                <div className="space-y-4 text-left border-y border-dashed border-slate-200 py-5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs font-semibold">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Customer Name</span>
                      <span className="text-slate-800 font-extrabold">{activeLead.customer_detail?.customer_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Broker Name</span>
                      <span className="text-slate-800 font-extrabold">{brokerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Visited Date</span>
                      <span className="text-slate-800 font-extrabold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {formatDate(activeLead.scheduled_visit_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Expected Time</span>
                      <span className="text-slate-800 font-extrabold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {formatTime(activeLead.scheduled_visit_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Phone Number</span>
                      <span className="text-slate-800 font-extrabold">{activeLead.customer_detail?.mobile_number || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Email</span>
                      <span className="text-slate-800 font-extrabold truncate block">{activeLead.customer_detail?.email || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-1">
                  <button
                    onClick={() =>
                      Swal.fire({
                        title: 'Share Visit Pass',
                        text: `Sharing visit pass for ${activeLead.customer_detail?.customer_name || '—'} on WhatsApp!`,
                        icon: 'success',
                        confirmButtonColor: '#10B981'
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share on WhatsApp</span>
                  </button>
                  <button
                    onClick={handleDownloadPass}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-medium text-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Pass</span>
                  </button>
                </div>

                <div className="pt-1 text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1 animate-pulse">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Lead protected &amp; verification lock active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
