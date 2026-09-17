import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Clock, User, Shield, AlertCircle, Database, Calendar, Mail, Phone
} from 'lucide-react';
import { getNotificationDetail, type NotificationItem } from './api/notifications';

export const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format event name helper
  const formatEventName = (name: string) => {
    if (!name) return 'System Event';
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getNotificationDetail(id);
        if (res.success && res.data) {
          setNotification(res.data);
          localStorage.setItem('selectedNotificationEvent', formatEventName(res.data.event_name));
        } else {
          setError('Notification not found or access denied.');
        }
      } catch (err) {
        console.error('Error fetching notification detail:', err);
        setError('Failed to load notification details. Please check connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      localStorage.removeItem('selectedNotificationEvent');
    };
  }, [id]);



  // Helper to parse message and extract JSON data if present
  const parseWhatOccurs = (text: string) => {
    if (!text) return { message: '', data: null };
    
    // Search for "Data:" or "Data: "
    const dataKey = 'Data:';
    const dataIndex = text.indexOf(dataKey);
    
    if (dataIndex !== -1) {
      const message = text.substring(0, dataIndex).trim();
      const jsonStr = text.substring(dataIndex + dataKey.length).trim();
      try {
        const data = JSON.parse(jsonStr);
        return { message, data };
      } catch (e) {
        return { message, data: jsonStr };
      }
    }
    
    return { message: text, data: null };
  };

  const getRoleBadgeClasses = (role?: string) => {
    const r = role?.toUpperCase();
    if (r === 'ADMIN') return 'bg-rose-50 border-rose-100 text-rose-700';
    if (r === 'RECEIPTIONIST' || r === 'RECEPTIONIST') return 'bg-indigo-50 border-indigo-100 text-indigo-700';
    if (r === 'CALLING') return 'bg-orange-50 border-orange-100 text-orange-700';
    if (r === 'BROKER') return 'bg-sky-50 border-sky-100 text-sky-700';
    return 'bg-emerald-50 border-emerald-100 text-emerald-700'; // SALES
  };

  const formatKeyName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-500 animate-pulse" />
          </div>
          <svg className="absolute -inset-1.5 animate-spin w-14 h-14 text-blue-200" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <span className="text-xs text-slate-400 font-bold">Loading notification…</span>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="space-y-4 text-left">
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer hover:shadow-sm">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="p-5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Notification details could not be loaded.'}</span>
        </div>
      </div>
    );
  }

  const { message, data } = parseWhatOccurs(notification.message || notification.what_occurs || '');

  return (
    <div className="space-y-4 text-left animate-fade-in">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1A56DB] transition cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* Main Details Panel */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Header Hero Section */}
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-600">
              <Bell className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Notification Event</span>
              <h1 className="text-xl font-bold text-[#0F172A] truncate leading-tight">
                {formatEventName(notification.event_name)}
              </h1>
              
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Event Category Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
                  <span>{notification.event_name}</span>
                </span>
                
                {/* ID Badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                  <span>ID: #{notification.id}</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Timestamp details */}
          <div className="flex flex-col text-left sm:text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Received At</span>
            <span className="text-xs font-semibold text-slate-700 mt-0.5">
              {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {new Date(notification.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Content grid */}
        <div className="p-6 space-y-6">
          {/* Section: Description & Trigger Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                {message || notification.message || notification.what_occurs}
              </p>
            </div>
            
            {/* Metadata right box */}
            <div className="space-y-4 bg-slate-50/40 p-4.5 border border-slate-100 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Creator Information
              </h3>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Name</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{notification.created_by_name || 'System Generated'}</span>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Role Profile</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${getRoleBadgeClasses(notification.created_by_role)}`}>
                    <Shield className="w-3 h-3" />
                    <span>{notification.created_by_role || 'System'}</span>
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Creator User ID</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{notification.created_by || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: JSON Data Payload details if present */}
          {data && (
            <div className="space-y-3.5 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" /> Event Data Payload
              </h3>
              
              {typeof data === 'object' ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider w-1/3">Property</th>
                          <th className="px-5 py-3 font-bold text-slate-600 uppercase tracking-wider">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {Object.entries(data).map(([key, value]) => {
                          const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                          return (
                            <tr key={key} className="hover:bg-slate-100/50 transition">
                              <td className="px-5 py-3.5 font-bold text-slate-500">{formatKeyName(key)}</td>
                              <td className="px-5 py-3.5 text-slate-700 font-semibold break-all leading-relaxed">{stringValue}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto shadow-inner leading-relaxed">
                  {data}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
