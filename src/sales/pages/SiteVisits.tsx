import React from 'react';
import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { Calendar, User, Clock, CheckCircle, Clock3 } from 'lucide-react';

export const SiteVisitsPage: React.FC = () => {
  const { leads } = useBrokerConnect();

  // Filter leads that are Checked In or OTP Verified (meaning they are undergoing site visits)
  const activeVisits = leads.filter(l => l.status === 'Checked In' || l.status === 'OTP Verified' || l.status === 'Booked');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-bold text-[#0F172A]">Site Visits Planner</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Manage schedules, status checks, and customer visits on site</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Project Context</th>
                <th className="py-3.5 px-6">Visit Schedule</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {activeVisits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold bg-white">
                    No active site visits scheduled.
                  </td>
                </tr>
              ) : (
                activeVisits.map(visit => (
                  <tr key={visit.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">{visit.name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{visit.mobile}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 block">{visit.project}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{visit.unitType}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{visit.expectedDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{visit.expectedTime}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        visit.status === 'Booked' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        visit.status === 'Checked In' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {visit.status === 'Booked' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Clock3 className="w-3.5 h-3.5 text-blue-600" />}
                        <span>{visit.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
