import React from 'react';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, Landmark, IndianRupee, Calendar, ShieldCheck, Check } from 'lucide-react';
import Swal from 'sweetalert2';

export const CommissionManagement: React.FC = () => {
  const { commissions, approveCommission, payCommission, setActiveScreen } = useBrokerConnect();

  // Get the latest generated commission, fallback to default
  const activeCommission = commissions[0] || {
    id: 'COM-2026-00125',
    bookingId: 'BK-2026-00123',
    customerName: 'N/A',
    brokerName: 'Amit Patel',
    agreementValue: 8500000,
    commissionPercent: 2.0,
    commissionAmount: 170000,
    status: 'Approved',
    expectedPayoutDate: '2026-06-30',
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleApprove = () => {
    approveCommission(activeCommission.id);
  };

  const handlePay = () => {
    payCommission(activeCommission.id);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveScreen(9)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Commission details</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Finance Desk &gt; Channel Partner Payout Ledger
            </p>
          </div>
        </div>
        <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-widest">
          {activeCommission.id}
        </span>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Commission Details (Desktop 8 columns) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6 anim-fade-up stagger-2">
          
          {/* Booking details summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
              Booking details
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-xs font-semibold">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Customer Name</span>
                <span className="text-slate-800 font-bold">{activeCommission.customerName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Booking Value</span>
                <span className="text-slate-800 font-bold">{formatCurrency(activeCommission.agreementValue)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Booking Code</span>
                <span className="text-blue-600 font-extrabold uppercase">{activeCommission.bookingId}</span>
              </div>
            </div>
          </div>

          {/* Calculations worksheet */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
              Commission Calculation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-semibold">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Broker Name</span>
                <span className="text-slate-800 font-bold">{activeCommission.brokerName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Commission rate</span>
                <span className="text-slate-800 font-bold">{activeCommission.commissionPercent.toFixed(2)}%</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Calculated Payout</span>
                <span className="text-emerald-600 font-black text-sm">{formatCurrency(activeCommission.commissionAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payout details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-[#0F172A] border-b border-slate-100 pb-2">
              Payout Details
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-xs font-semibold">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Expected payout Date</span>
                <span className="text-slate-800 font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeCommission.expectedPayoutDate}</span>
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Payout Status</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold smooth ${
                  activeCommission.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  activeCommission.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {activeCommission.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payout actions sidebar (Desktop 4 columns) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6 h-fit text-center anim-fade-up stagger-3">
          <h4 className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Accounting Controls</h4>
          
          <div className="space-y-3">
            {activeCommission.status === 'Pending' && (
              <button
                onClick={handleApprove}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer press pulse-glow"
              >
                <Check className="w-4 h-4" />
                <span>Approve Commission Payout</span>
              </button>
            )}

            {activeCommission.status === 'Approved' && (
              <button
                onClick={handlePay}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] cursor-pointer press pulse-glow"
              >
                <IndianRupee className="w-4 h-4" />
                <span>Mark as Paid (Disburse)</span>
              </button>
            )}

            {activeCommission.status === 'Paid' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span>Disbursed &amp; Paid to Broker</span>
              </div>
            )}

            <button
              onClick={() => Swal.fire({
                title: 'Invoice Statement',
                text: 'Simulation: Generating bank invoice statement...',
                icon: 'info',
                confirmButtonColor: '#3B82F6'
              })}
              className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-medium text-sm transition-all cursor-pointer press smooth"
            >
              View Invoice Statement
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
