// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { ArrowLeft, Building, User, Phone, Mail, Calendar, Clock, Grid, ShieldCheck, FileText, CheckCircle2, PlusCircle } from 'lucide-react';
// import { getProjectBookings } from '../../pages/api/projects';
// import { getSalesDashboard } from '../../pages/api/registercustomer';
// import { useBrokerConnect } from '../../context/BrokerConnectContext';
// import { CreateBookingModal } from '../../components/CreateBookingModal';
// 
// export const ProjectBookingsDetail: React.FC = () => {
//   const { id } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   
//   const { projects, createBooking } = useBrokerConnect();
//   
//   const [bookings, setBookings] = useState<any[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
// 
//   // Lead Search & Booking Modal States
//   const [isLeadSearchOpen, setIsLeadSearchOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedLeadForBooking, setSelectedLeadForBooking] = useState<any | null>(null);
//   const [leadsList, setLeadsList] = useState<any[]>([]);
//   const [loadingLeads, setLoadingLeads] = useState(false);
// 
//   const fetchBookings = async () => {
//     if (!id) return;
//     try {
//       setLoading(true);
//       const res = await getProjectBookings(id);
//       if (res && res.success && Array.isArray(res.data)) {
//         setBookings(res.data);
//       } else {
//         setError('Failed to fetch bookings for this project.');
//       }
//     } catch (err: any) {
//       console.error('Error fetching project bookings:', err);
//       setError(err.message || 'An error occurred while loading bookings.');
//     } finally {
//       setLoading(false);
//     }
//   };
// 
//   useEffect(() => {
//     fetchBookings();
//   }, [id]);
// 
//   const loadLeads = async () => {
//     try {
//       setLoadingLeads(true);
//       const res = await getSalesDashboard({ filter: 'This Year' });
//       if (res && res.success && res.data) {
//         const mappedAlloted = (res.data.alloted_visits || []).map((item: any) => ({
//           id: String(item.lead_id || item.allocation_id),
//           name: item.customer?.customer_name || 'N/A',
//           mobile: item.customer?.mobile_number || 'N/A',
//           email: item.customer?.email || '',
//           project: item.Project?.project_name || 'N/A',
//           status: 'Registered',
//         }));
//         const mappedVisited = (res.data.visit_completed || []).map((item: any) => ({
//           id: String(item.lead_id || item.allocation_id),
//           name: item.customer?.customer_name || 'N/A',
//           mobile: item.customer?.mobile_number || 'N/A',
//           email: item.customer?.email || '',
//           project: item.Project?.project_name || 'N/A',
//           status: 'Visited',
//         }));
//         const mappedNegotiation = (res.data.negotiation || []).map((item: any) => ({
//           id: String(item.lead_id || item.allocation_id),
//           name: item.customer?.customer_name || 'N/A',
//           mobile: item.customer?.mobile_number || 'N/A',
//           email: item.customer?.email || '',
//           project: item.Project?.project_name || 'N/A',
//           status: 'Negotiation',
//         }));
//         const mappedBooking = (res.data.booking || []).map((item: any) => ({
//           id: String(item.lead_id || item.allocation_id),
//           name: item.customer?.customer_name || 'N/A',
//           mobile: item.customer?.mobile_number || 'N/A',
//           email: item.customer?.email || '',
//           project: item.Project?.project_name || 'N/A',
//           status: 'Booked',
//         }));
//         
//         const combined = [...mappedAlloted, ...mappedVisited, ...mappedNegotiation, ...mappedBooking];
//         const unique: any[] = [];
//         const seen = new Set();
//         for (let i = combined.length - 1; i >= 0; i--) {
//           const uid = combined[i].id;
//           if (!seen.has(uid)) {
//             seen.add(uid);
//             unique.unshift(combined[i]);
//           }
//         }
//         setLeadsList(unique);
//       }
//     } catch (err) {
//       console.error('Error fetching leads:', err);
//     } finally {
//       setLoadingLeads(false);
//     }
//   };
// 
//   const handleOpenLeadSearch = () => {
//     setIsLeadSearchOpen(true);
//     setSearchQuery('');
//     loadLeads();
//   };
// 
//   const handleConfirmBooking = (bookingData: {
//     projectId: number;
//     tower: string;
//     floor: string;
//     unitNo: string;
//     bookingAmount: number;
//     agreementValue: number;
//   }) => {
//     if (!selectedLeadForBooking) return;
// 
//     const matchedProj = projects.find(p => p.id === bookingData.projectId);
//     const resolvedProjName = matchedProj ? matchedProj.name : projectName;
// 
//     createBooking({
//       leadId: selectedLeadForBooking.id,
//       customerName: selectedLeadForBooking.name,
//       project: resolvedProjName,
//       tower: bookingData.tower,
//       floor: bookingData.floor,
//       unitNo: bookingData.unitNo,
//       bookingAmount: bookingData.bookingAmount,
//       agreementValue: bookingData.agreementValue,
//     });
// 
//     setSelectedLeadForBooking(null);
// 
//     // Refresh the bookings list for this project so the newly added booking shows up instantly!
//     fetchBookings();
//   };
// 
//   const formatCurrency = (val: string | number) => {
//     const num = typeof val === 'string' ? parseFloat(val) : val;
//     if (isNaN(num)) return 'N/A';
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//       maximumFractionDigits: 0
//     }).format(num);
//   };
// 
//   const formatDate = (dateString: string) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-IN', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric'
//     });
//   };
// 
//   const formatDateTime = (dateString: string) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleString('en-IN', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true
//     });
//   };
// 
//   // Compute summary values
//   const totalBookingAmount = bookings.reduce((sum, item) => sum + (parseFloat(item.booking_amount) || 0), 0);
//   const totalAgreementValue = bookings.reduce((sum, item) => sum + (parseFloat(item.agreement_value) || 0), 0);
//   
//   const currentProject = projects.find(p => String(p.id) === String(id));
//   const currentProjectName = currentProject ? currentProject.name : 'Project Bookings';
//   const projectName = bookings.length > 0 ? bookings[0].project?.project_name : currentProjectName;
// 
//   // Filter leads based on query
//   const filteredLeads = leadsList.filter(lead => {
//     const query = searchQuery.toLowerCase();
//     return (
//       lead.name.toLowerCase().includes(query) ||
//       lead.mobile.includes(query) ||
//       lead.email.toLowerCase().includes(query) ||
//       lead.project.toLowerCase().includes(query)
//     );
//   });
// 
//   return (
//     <div className="space-y-6 text-left">
//       {/* Header with Navigation and Summary Cards */}
//       <div className="flex flex-col gap-4">
//         {/* Back Button */}
//         <div>
//           <button
//             onClick={() => navigate('/sales/inventory')}
//             className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer hover:shadow-sm"
//           >
//             <ArrowLeft className="w-4 h-4" />
//             <span>Back to Inventory</span>
//           </button>
//         </div>
// 
//         {/* Project Profile Summary Banner */}
//         <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-6">
//           <div className="flex items-start gap-4">
//             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
//               <Building className="w-8 h-8" />
//             </div>
//             <div>
//               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Real-time Bookings Summary</span>
//               <h2 className="text-xl font-black text-[#0F172A] mt-0.5">{projectName}</h2>
//               <div className="flex items-center gap-2 mt-2">
//                 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
//                   {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
//                 </span>
//                 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
//                   <CheckCircle2 className="w-3.5 h-3.5" />
//                   Active Sales Target
//                 </span>
//               </div>
//             </div>
//           </div>
// 
//           <div className="flex items-center gap-4 flex-wrap md:flex-nowrap ml-auto md:ml-0">
//             {/* Financial summary blocks */}
//             {!loading && !error && bookings.length > 0 && (
//               <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 mr-2">
//                 <div className="bg-slate-50/50 px-4 py-3 rounded-xl border border-slate-100 min-w-[140px]">
//                   <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Total Booked Value</span>
//                   <span className="text-base font-black text-slate-800 mt-1 block">{formatCurrency(totalBookingAmount)}</span>
//                 </div>
//                 <div className="bg-indigo-50/20 px-4 py-3 rounded-xl border border-indigo-100/30 min-w-[140px]">
//                   <span className="text-[10px] text-indigo-500 font-bold block uppercase tracking-wide">Total Agreement Value</span>
//                   <span className="text-base font-black text-indigo-600 mt-1 block">{formatCurrency(totalAgreementValue)}</span>
//                 </div>
//               </div>
//             )}
// 
//             {/* Create Booking Button */}
//             {!loading && !error && (
//               <button
//                 onClick={handleOpenLeadSearch}
//                 className="flex items-center gap-2 px-5 py-3 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.2)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.3)] cursor-pointer press"
//               >
//                 <PlusCircle className="w-4.5 h-4.5" />
//                 <span>Create Booking</span>
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
// 
//       {/* Main Content Area */}
//       {loading ? (
//         <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
//           <svg className="animate-spin h-8 w-8 text-[#1A56DB] mb-3" fill="none" viewBox="0 0 24 24">
//             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//           </svg>
//           <span className="text-sm text-slate-500 font-semibold">Fetching project bookings records...</span>
//         </div>
//       ) : error ? (
//         <div className="p-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-semibold text-sm">
//           <span>{error}</span>
//         </div>
//       ) : bookings.length === 0 ? (
//         <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-medium shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
//           <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
//             <FileText className="w-7 h-7" />
//           </div>
//           <h3 className="text-sm font-bold text-slate-700">No Booking Records</h3>
//           <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">There are no bookings recorded by your account for this project yet.</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//           {bookings.map((booking, idx) => (
//             <div key={booking.id || idx} className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col justify-between">
//               
//               {/* Card Banner / Header Info */}
//               <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
//                   <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Booking ID #{booking.id}</span>
//                 </div>
//                 <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
//                   {booking.status === 1 ? 'Confirmed' : 'Pending'}
//                 </span>
//               </div>
// 
//               <div className="p-6 space-y-6">
//                 {/* 1. Unit Info Grid */}
//                 <div className="grid grid-cols-3 gap-3">
//                   <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-center">
//                     <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Tower</span>
//                     <span className="text-xs font-extrabold text-slate-800 mt-1 block">{booking.tower || 'N/A'}</span>
//                   </div>
//                   <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-center">
//                     <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Floor</span>
//                     <span className="text-xs font-extrabold text-slate-800 mt-1 block">{booking.floor || 'N/A'}</span>
//                   </div>
//                   <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/30 text-center">
//                     <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wide">Unit No.</span>
//                     <span className="text-xs font-extrabold text-indigo-700 mt-1 block">{booking.unit_number || 'N/A'}</span>
//                   </div>
//                 </div>
// 
//                 {/* 2. Financial Summary row */}
//                 <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
//                   <div>
//                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Booking Amount</span>
//                     <span className="text-base font-extrabold text-slate-800 mt-0.5 block">{formatCurrency(booking.booking_amount)}</span>
//                   </div>
//                   <div>
//                     <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block">Agreement Value</span>
//                     <span className="text-base font-extrabold text-indigo-600 mt-0.5 block">{formatCurrency(booking.agreement_value)}</span>
//                   </div>
//                 </div>
// 
//                 {/* 3. Customer and Created By details */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   {/* Lead / Customer details */}
//                   <div className="space-y-3">
//                     <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
//                       <User className="w-3.5 h-3.5 text-slate-400" />
//                       <span>Customer Details</span>
//                     </h4>
//                     {booking.lead?.customer_detail ? (
//                       <div className="space-y-2">
//                         <span className="text-xs font-bold text-slate-800 block">
//                           {booking.lead.customer_detail.customer_name}
//                         </span>
//                         {booking.lead.customer_detail.mobile_number && (
//                           <a
//                             href={`tel:${booking.lead.customer_detail.mobile_number}`}
//                             className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold"
//                           >
//                             <Phone className="w-3.5 h-3.5 text-slate-400" />
//                             <span>{booking.lead.customer_detail.mobile_number}</span>
//                           </a>
//                         )}
//                         {booking.lead.customer_detail.email && (
//                           <a
//                             href={`mailto:${booking.lead.customer_detail.email}`}
//                             className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold truncate block"
//                           >
//                             <Mail className="w-3.5 h-3.5 text-slate-400" />
//                             <span className="truncate">{booking.lead.customer_detail.email}</span>
//                           </a>
//                         )}
//                       </div>
//                     ) : (
//                       <span className="text-xs font-semibold text-slate-400 block">No customer info</span>
//                     )}
//                   </div>
// 
//                   {/* Created By details */}
//                   <div className="space-y-3">
//                     <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
//                       <BriefcaseIcon className="w-3.5 h-3.5 text-slate-400" />
//                       <span>Sales Executive</span>
//                     </h4>
//                     {booking.createdBy ? (
//                       <div className="space-y-2">
//                         <span className="text-xs font-bold text-slate-800 block">
//                           {booking.createdBy.full_name}
//                         </span>
//                         {booking.createdBy.contact_number && (
//                           <a
//                             href={`tel:${booking.createdBy.contact_number}`}
//                             className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold"
//                           >
//                             <Phone className="w-3.5 h-3.5 text-slate-400" />
//                             <span>{booking.createdBy.contact_number}</span>
//                           </a>
//                         )}
//                         {booking.createdBy.email && (
//                           <a
//                             href={`mailto:${booking.createdBy.email}`}
//                             className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold truncate block"
//                           >
//                             <Mail className="w-3.5 h-3.5 text-slate-400" />
//                             <span className="truncate">{booking.createdBy.email}</span>
//                           </a>
//                         )}
//                       </div>
//                     ) : (
//                       <span className="text-xs font-semibold text-slate-400 block">No agent info</span>
//                     )}
//                   </div>
//                 </div>
//               </div>
// 
//               {/* Footer Timestamps */}
//               <div className="bg-slate-50/50 p-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
//                 <div className="flex items-center gap-1.5">
//                   <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
//                   <span>Booked: {formatDate(booking.booking_date)}</span>
//                 </div>
//                 <div className="flex items-center gap-1.5 justify-end">
//                   <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
//                   <span>Created: {formatDateTime(booking.createdAt)}</span>
//                 </div>
//               </div>
// 
//             </div>
//           ))}
//         </div>
//       )}
// 
//       {/* Search Leads Modal */}
//       {isLeadSearchOpen && (
//         <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
//           <div
//             className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-hidden max-h-[90vh] flex flex-col p-6 relative transform transition-all animate-in fade-in zoom-in-95 duration-200 text-left"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Close Button */}
//             <button
//               type="button"
//               onClick={() => setIsLeadSearchOpen(false)}
//               className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
//             >
//               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//             </button>
// 
//             {/* Title Block */}
//             <div className="space-y-1 col-span-12">
//               <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
//                 <User className="w-5 h-5 text-indigo-600 shrink-0" />
//                 <span>Select Client for Booking</span>
//               </h3>
//               <p className="text-xs text-slate-400 font-semibold">
//                 Search and select an active lead to add booking for <strong className="text-indigo-600">{projectName}</strong>
//               </p>
//             </div>
// 
//             {/* Search Input */}
//             <div className="mt-4 relative">
//               <input
//                 type="text"
//                 placeholder="Search by client name, mobile, email..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
//                 autoFocus
//               />
//               <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
//                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
//               </span>
//             </div>
// 
//             {/* Leads List */}
//             <div className="mt-4 flex-1 overflow-y-auto max-h-[50vh] divide-y divide-slate-100 pr-1 -mr-2">
//               {loadingLeads ? (
//                 <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-semibold text-xs">
//                   <svg className="animate-spin h-6 w-6 text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                   </svg>
//                   <span>Loading pipeline leads...</span>
//                 </div>
//               ) : filteredLeads.length === 0 ? (
//                 <div className="py-12 text-center text-slate-400 text-xs font-medium">
//                   No active leads found matching "{searchQuery}".
//                 </div>
//               ) : (
//                 filteredLeads.map((lead: any) => (
//                   <div
//                     key={lead.id}
//                     onClick={() => {
//                       if (lead.status !== 'Booked') {
//                         setSelectedLeadForBooking(lead);
//                         setIsLeadSearchOpen(false);
//                       }
//                     }}
//                     className={`flex items-center justify-between py-3 px-2 rounded-xl transition duration-150 ${
//                       lead.status === 'Booked'
//                         ? 'opacity-60 cursor-not-allowed'
//                         : 'hover:bg-slate-50 cursor-pointer'
//                     }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
//                         {lead.name.charAt(0)}
//                       </div>
//                       <div>
//                         <span className="text-xs font-bold text-slate-800 block">{lead.name}</span>
//                         <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
//                           {lead.mobile} • Interested in: {lead.project}
//                         </span>
//                       </div>
//                     </div>
//                     <div>
//                       {lead.status === 'Booked' ? (
//                         <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
//                           Booked
//                         </span>
//                       ) : (
//                         <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
//                           Select
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       )}
// 
//       {selectedLeadForBooking && (
//         <CreateBookingModal
//           isOpen={true}
//           leadId={selectedLeadForBooking.id}
//           customerName={selectedLeadForBooking.name}
//           projectName={projectName}
//           projects={projects}
//           onClose={() => setSelectedLeadForBooking(null)}
//           onConfirm={handleConfirmBooking}
//         />
//       )}
//     </div>
//   );
// };
// 
// const BriefcaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="24"
//     height="24"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     {...props}
//   >
//     <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
//     <rect width="20" height="14" x="2" y="6" rx="2" />
//   </svg>
// );

export {};
