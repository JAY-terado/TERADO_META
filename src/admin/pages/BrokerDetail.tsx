import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, ShieldCheck, Mail, Phone, MapPin, Calendar, Building2,
  Loader2, CheckCircle2, Lock, Clock, AlertCircle, ShieldAlert,
  Percent, FileText, CreditCard
} from 'lucide-react';
import { getBrokerDetail, getBrokersList } from '../api/brokers';
import axiosClient from '../../../axiosinstance';
import Swal from 'sweetalert2';

export const BrokerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [broker, setBroker] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchBroker = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Attempt to fetch details directly from GET /auth/brokers/:id
        const res = await getBrokerDetail(id);
        if (res && res.success && res.data) {
          setBroker(res.data);
          localStorage.setItem('selectedBrokerName', res.data.broker_name);
        } else {
          // 2. Fallback: search within the brokers list API
          const listRes = await getBrokersList(1, 100);
          const brokerList = listRes?.data || listRes;
          if (Array.isArray(brokerList)) {
            const found = brokerList.find((b: any) => String(b.id) === String(id));
            if (found) {
              setBroker(found);
              localStorage.setItem('selectedBrokerName', found.broker_name);
            } else {
              setError('Broker details could not be found.');
            }
          } else {
            setError(res.message || 'Failed to retrieve broker details.');
          }
        }
      } catch (err: any) {
        console.error('Error fetching broker detail:', err);
        // Fallback: search within list
        try {
          const listRes = await getBrokersList(1, 100);
          const brokerList = listRes?.data || listRes;
          if (Array.isArray(brokerList)) {
            const found = brokerList.find((b: any) => String(b.id) === String(id));
            if (found) {
              setBroker(found);
              localStorage.setItem('selectedBrokerName', found.broker_name);
              return;
            }
          }
        } catch (innerErr) {
          console.error('Inner error fetching broker list:', innerErr);
        }
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch broker details.');
      } finally {
        setLoading(false);
      }
    };
    fetchBroker();
  }, [id]);

  const handleUpdateStatus = async (action: 'APPROVE' | 'SUSPEND') => {
    if (!broker) return;

    const actionText = action === 'APPROVE' ? 'Approve' : 'Suspend';
    const confirmButtonColor = action === 'APPROVE' ? '#10B981' : '#EF4444';

    const result = await Swal.fire({
      title: `${actionText} Broker?`,
      input: 'text',
      inputPlaceholder: `Enter a note for this ${actionText.toLowerCase()} action...`,
      showCancelButton: true,
      confirmButtonColor,
      cancelButtonColor: '#6B7280',
      confirmButtonText: `Yes, ${actionText.toLowerCase()}`,
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (action === 'SUSPEND' && !value.trim()) {
          return 'A note/reason is required to suspend a broker!';
        }
        return null;
      }
    });

    if (!result.isConfirmed) return;

    const note = result.value || (action === 'APPROVE' ? 'Approved from details page.' : '');

    setIsUpdatingStatus(true);
    // Show loader
    Swal.fire({
      title: `Processing...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await axiosClient.put(`/auth/brokers/${broker.id}/action`, {
        action,
        note: note.trim()
      });

      if (res.data?.success || res.status === 200) {
        Swal.fire({
          title: 'Success!',
          text: `Broker has been successfully ${action === 'APPROVE' ? 'approved' : 'suspended'}.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
          timer: 1500
        });

        // Re-fetch details
        const freshRes = await getBrokerDetail(broker.id);
        if (freshRes && freshRes.success && freshRes.data) {
          setBroker(freshRes.data);
        } else {
          // List refresh fallback
          const listRes = await getBrokersList(1, 100);
          const brokerList = listRes?.data || listRes;
          if (Array.isArray(brokerList)) {
            const found = brokerList.find((b: any) => String(b.id) === String(broker.id));
            if (found) setBroker(found);
          }
        }
      } else {
        Swal.fire({
          title: 'Error',
          text: res.data?.message || 'Failed to update broker status',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (err: any) {
      console.error('Failed to update broker status:', err);
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.message || 'An error occurred while updating status',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-500 animate-pulse" />
          </div>
          <svg className="absolute -inset-1.5 animate-spin w-14 h-14 text-blue-200" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <span className="text-xs text-slate-400 font-bold">Loading broker profile…</span>
      </div>
    );
  }

  if (error || !broker) {
    return (
      <div className="space-y-4 text-left">
        <button onClick={() => navigate('/admin/brokers')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer hover:shadow-sm">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Broker List
        </button>
        <div className="p-5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Broker profile data could not be loaded.'}</span>
        </div>
      </div>
    );
  }

  const formatBrokerId = (id: number | string) => {
    const sId = String(id);
    if (sId.startsWith('BRK-')) return sId;
    return `BRK-${sId.padStart(3, '0')}`;
  };

  const getStatusBadge = () => {
    // Determine approvedByAdmin
    const isApproved = broker.approvedByAdmin === 1;
    const isSuspended = broker.status === -1 || broker.status === 'Suspended' || broker.status === 2;

    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 border border-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>Suspended</span>
        </span>
      );
    }

    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Active</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span>Pending Approval</span>
      </span>
    );
  };

  const formattedCreated = new Date(broker.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="space-y-4 text-left anim-fade-up">
      {/* Back button */}
      <button onClick={() => navigate('/admin/brokers')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1A56DB] transition cursor-pointer group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Brokers
      </button>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Avatar and Info */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-[#1A56DB]">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Broker Profile</span>
              <h1 className="text-xl font-bold text-[#0F172A] truncate leading-tight">
                {broker.broker_name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold">{formatBrokerId(broker.id)}</span>
                <span className="text-slate-300">•</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {broker.approvedByAdmin !== 1 && (
              <button
                onClick={() => handleUpdateStatus('APPROVE')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approve Broker</span>
              </button>
            )}
            {(broker.status !== -1 && broker.status !== 'Suspended' && broker.status !== 2) && (
              <button
                onClick={() => handleUpdateStatus('SUSPEND')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Suspend Broker</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 bg-slate-50/40">
          {[
            { label: 'Projects', value: broker.totalProjects ?? 0, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Leads Generated', value: broker.totalLeads ?? 0, icon: User, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'Site Visits', value: broker.totalVisits ?? 0, icon: Calendar, color: 'text-sky-500', bg: 'bg-sky-50' },
            { label: 'Bookings Done', value: broker.totalBookings ?? 0, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' }
          ].map((s, index) => {
            const Icon = s.icon;
            return (
              <div key={index} className="px-6 py-3.5 flex items-center gap-3">
                <div className={`w-8.5 h-8.5 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{s.label}</span>
                  <span className="text-sm font-extrabold text-slate-800 block mt-0.5">{s.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left Column: Details Cards */}
        <div className="space-y-4">
          {/* Card: Personal and Contact */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-blue-50 rounded-lg text-[#1A56DB]">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Personal &amp; Contact Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Broker Name</span>
                <span className="text-xs font-semibold text-slate-700">{broker.broker_name || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Company Name</span>
                <span className="text-xs font-semibold text-slate-700">{broker.company_name || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Email Address</span>
                <span className="text-xs font-semibold text-slate-700 block truncate">{broker.email || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Mobile Number</span>
                <span className="text-xs font-semibold text-slate-700">{broker.mobile_number || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Alternate Mobile</span>
                <span className="text-xs font-semibold text-slate-700">{broker.alternate_mobile || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card: Tax and Registration */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tax &amp; Registration Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">PAN Number</span>
                <span className="text-xs font-semibold text-slate-700">{broker.pan_number || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">GST Number</span>
                <span className="text-xs font-semibold text-slate-700">{broker.gst_number || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">RERA Registration Number</span>
                <span className="text-xs font-semibold text-slate-700">{broker.rera_registration_number || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card: Address */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-violet-50 rounded-lg text-violet-600">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Address Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Address Line 1</span>
                <span className="text-xs font-semibold text-slate-700 block leading-relaxed">{broker.address_line_1 || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Address Line 2</span>
                <span className="text-xs font-semibold text-slate-700">{broker.address_line_2 || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">City / Town</span>
                <span className="text-xs font-semibold text-slate-700">{broker.city || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">State</span>
                <span className="text-xs font-semibold text-slate-700">{broker.state || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Pincode</span>
                <span className="text-xs font-semibold text-slate-700">{broker.pincode || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Timeline */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Verification Status</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Verification</span>
                {broker.mobile_verified === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                    Unverified
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Verification</span>
                {broker.email_verified === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                    Unverified
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Date</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formattedCreated}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Profile Update</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(broker.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
