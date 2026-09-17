import React, { useState } from 'react';
import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { Phone, Calendar, Clock, CheckCircle2, UserCheck, AlertCircle, BarChart3, ChevronRight, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

export const ReportsPage: React.FC = () => {
  const { leads } = useBrokerConnect();
  const [activeTab, setActiveTab] = useState<'calls' | 'visits' | 'reminders'>('calls');

  // Today's Date
  const todayStr = '2026-06-11'; // Fixed system time representation matching metadata

  // Helper: Mask mobile
  const maskMobile = (mobile?: string) => {
    if (!mobile) return 'N/A';
    const clean = mobile.replace(/\s+/g, '');
    if (clean.length < 6) return '******';
    return clean.slice(0, 2) + '******' + clean.slice(-2);
  };

  // Today's Call Logs
  const mockCallLogs: any[] = [];

  // Site visits scheduled for today or upcoming
  const visitLeads = leads.filter(l => l.status === 'Visit Scheduled' || l.visitDate);

  // Active Reminders across leads
  const mockReminders: any[] = [];

  return (
    <div className="space-y-6 text-left">
      {/* Removed Title Header Banner */}

      {/* KPI Stats Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start anim-fade-up card-hover">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calls Made Today</span>
            <span className="text-2xl font-black text-slate-900">14</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold ring-1 ring-emerald-100 mt-1">
              <span>92% Connection</span>
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start anim-fade-up card-hover">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connect Rate</span>
            <span className="text-2xl font-black text-slate-900">84%</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold ring-1 ring-emerald-100 mt-1">
              <span>High Performance</span>
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start anim-fade-up card-hover">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visits Scheduled</span>
            <span className="text-2xl font-black text-slate-900">{visitLeads.length}</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-bold ring-1 ring-indigo-100 mt-1">
              <span>Next 7 Days</span>
            </span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex justify-between items-start anim-fade-up card-hover">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reminders Due</span>
            <span className="text-2xl font-black text-slate-900">{mockReminders.length}</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[9px] font-bold ring-1 ring-amber-100 mt-1">
              <span>Action Required</span>
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Select Header */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-md">
        <button
          onClick={() => setActiveTab('calls')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'calls'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Call Logs
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'visits'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Scheduled Visits
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'reminders'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Reminders
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        {activeTab === 'calls' && (
          <div>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Today's Call Log Sheet</span>
              </h3>
              <span className="text-xs text-slate-450 font-semibold">{mockCallLogs.length} calls logged today</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="py-3 px-5">Client</th>
                    <th className="py-3 px-5">Mobile</th>
                    <th className="py-3 px-5">Logged Time</th>
                    <th className="py-3 px-5">Duration</th>
                    <th className="py-3 px-5">Outcome Stage</th>
                    <th className="py-3 px-5">Activity Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                  {mockCallLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900">{log.name}</td>
                      <td className="py-3.5 px-5 text-slate-500">{maskMobile(log.phone)}</td>
                      <td className="py-3.5 px-5 text-slate-500">{log.time}</td>
                      <td className="py-3.5 px-5 text-slate-500">{log.duration}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          log.status === 'Booked' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-medium">{log.outcome}</td>
                    </tr>
                  ))}
                  {mockCallLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No calls logged today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Scheduled Site Visits</span>
              </h3>
              <span className="text-xs text-slate-450 font-semibold">{visitLeads.length} visits scheduled</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="py-3 px-5">Client</th>
                    <th className="py-3 px-5">Project</th>
                    <th className="py-3 px-5">Visit Date</th>
                    <th className="py-3 px-5">Accompanying Agent</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                  {visitLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900">{lead.name}</td>
                      <td className="py-3.5 px-5 text-slate-600">{lead.project}</td>
                      <td className="py-3.5 px-5 text-slate-500">{lead.visitDate || lead.expectedDate || 'N/A'}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-slate-800 font-bold">{lead.assignedExecutive || 'Not assigned'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Scheduled
                        </span>
                      </td>
                    </tr>
                  ))}
                  {visitLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No visits scheduled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Active Task Reminders</span>
              </h3>
              <span className="text-xs text-slate-450 font-semibold">{mockReminders.length} pending reminders</span>
            </div>
            <div className="p-5 space-y-3.5">
              {mockReminders.map((rem) => (
                <div key={rem.id} className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all">
                  <div className="flex gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg h-9 w-9 flex items-center justify-center shrink-0">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{rem.name}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{rem.task}</p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded-md mt-2 border border-amber-100">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>Due: {rem.time}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => Swal.fire({
                      title: 'Complete Reminder?',
                      text: 'Do you want to mark this reminder as completed?',
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonText: 'Yes, Complete',
                      confirmButtonColor: '#3B82F6',
                    })}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-transparent rounded-lg text-xs font-bold transition cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    Mark Complete
                  </button>
                </div>
              ))}
              {mockReminders.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
                  No pending reminders found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
