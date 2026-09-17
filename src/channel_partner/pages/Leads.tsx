import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, ShieldCheck, Mail, Phone, Calendar, Clock, Sparkles, ArrowLeft, Send } from 'lucide-react';
import Swal from 'sweetalert2';
import axiosClient from '../../../axiosinstance';
import Cookies from 'js-cookie';
import { ReceptionistRegisterBroker } from '../../components/screens/ReceptionistRegisterBroker';
import { useParams, useNavigate } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect';
import { formatDateDDMMYYYY } from '../../components/helper/dateFormatter';

interface MockLead {
  id: string;
  name: string;
  mobile: string;
  email: string;
  project: string;
  unitType: string;
  budget: string;
  status: string;
  daysRemaining: number;
  registeredDate: string;
  companyName?: string;
}

interface LeadTimelineEvent {
  date: string;
  title: string;
  description: string;
  type: 'booking' | 'visit' | 'otp' | 'negotiation' | 'registration';
}

interface BrokerBuyer {
  name: string;
  unit: string;
  status: string;
  timeline: LeadTimelineEvent[];
}

const INITIAL_MOCK_LEADS: MockLead[] = [];

const MOCK_BROKER_BUYERS: Record<string, BrokerBuyer[]> = {};

export const LeadsPage: React.FC = () => {
  const { brokerId } = useParams<{ brokerId?: string }>();
  const navigate = useNavigate();

  const [leadsList, setLeadsList] = useState<MockLead[]>(INITIAL_MOCK_LEADS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    suspended: 0
  });
  
  // Registration Form Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [brokerName, setBrokerName] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [selectedProject] = useState('Evara');
  const [selectedConfig, setSelectedConfig] = useState('2 BHK');
  const [selectedBudget, setSelectedBudget] = useState('₹80L - ₹1Cr');
  const [city, setCity] = useState('Mumbai');

  // Broker Detail Screen states
  const [selectedBroker, setSelectedBroker] = useState<MockLead | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'timeline' | 'notes'>('timeline');
  const [newBrokerNote, setNewBrokerNote] = useState('');
  const [brokerNotes, setBrokerNotes] = useState<Record<string, { author: string; date: string; content: string; }[]>>({
    "L-101": [
      { author: "Channel Partner", date: "2026-06-16", content: "Rahul is highly active. Met with him at the lounge regarding unit B-102 clearance." },
      { author: "Channel Partner", date: "2026-06-06", content: "Completed OTP lock setup. Client Anil Kapoor is interested in immediate bookings." }
    ]
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [totalPages, page]);

  const calcDaysRemaining = (regDateStr: string) => {
    try {
      const regDate = new Date(regDateStr);
      const targetDate = new Date(regDate);
      targetDate.setDate(targetDate.getDate() + 90);
      const diffTime = targetDate.getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 90;
    }
  };

  const fetchBrokers = async (currentPage: number, search: string, status: string = statusFilter) => {
    setLoading(true);
    try {
      let url = `/brokers?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(search)}`;
      if (status === 'Pending') {
        url += '&filter=pending';
      } else if (status === 'Approved') {
        url += '&approvedByAdmin=approved';
      } else if (status === 'Suspended') {
        url += '&approvedByAdmin=suspended';
      }

      const response = await axiosClient.get(url);
      if (response.data && response.data.success) {
        const brokers = response.data.data || [];
        const mapped = brokers.map((item: any) => ({
          id: item.id.toString(),
          name: item.broker_name || 'N/A',
          mobile: item.mobile_number || '',
          email: item.email || '',
          project: 'Evara',
          unitType: '2 BHK',
          budget: '₹80L - ₹1Cr',
          status: item.approvedByAdmin || (item.status === 1 ? 'Approved' : 'Pending Approval'),
          daysRemaining: calcDaysRemaining(item.registration_date || new Date().toISOString()),
          registeredDate: item.registration_date ? item.registration_date.split('T')[0] : new Date().toISOString().split('T')[0],
          companyName: item.company_name || '—',
        }));
        setLeadsList(mapped);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalItems(response.data.pagination?.totalItems || brokers.length);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch brokers from API', err);
      // Fallback to static mock data in case API fails
      let mockList = INITIAL_MOCK_LEADS;
      
      // Calculate mock stats
      const totalCount = mockList.length;
      const pendingCount = mockList.filter(l => l.status === 'Verification Pending' || l.status === 'Pending Approval' || l.status === 'PendingApproval').length;
      const approvedCount = mockList.filter(l => l.status === 'OTP Verified' || l.status === 'Approved' || l.status === 'Booked').length;
      const suspendedCount = mockList.filter(l => l.status === 'Suspended').length;
      setStats({
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        suspended: suspendedCount
      });

      // Apply status filter to mock list
      if (status === 'Pending') {
        mockList = mockList.filter(l => l.status === 'Verification Pending' || l.status === 'Pending Approval' || l.status === 'PendingApproval');
      } else if (status === 'Approved') {
        mockList = mockList.filter(l => l.status === 'OTP Verified' || l.status === 'Approved' || l.status === 'Booked');
      } else if (status === 'Suspended') {
        mockList = mockList.filter(l => l.status === 'Suspended');
      }

      // Apply search query
      if (search !== '') {
        mockList = mockList.filter(l =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.mobile.includes(search) ||
          l.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      setLeadsList(mockList);
      setTotalPages(1);
      setTotalItems(mockList.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers(page, searchTerm, statusFilter);
  }, [page, searchTerm, statusFilter, limit]);

  // Reset page to 1 on search or status change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // Broker's leads states
  const [brokerLeads, setBrokerLeads] = useState<any[]>([]);
  const [brokerLeadsPage, setBrokerLeadsPage] = useState(1);
  const [brokerLeadsTotalPages, setBrokerLeadsTotalPages] = useState(1);
  const [brokerLeadsTotalItems, setBrokerLeadsTotalItems] = useState(0);
  const [brokerLeadsSearch, setBrokerLeadsSearch] = useState('');
  const [loadingBrokerLeads, setLoadingBrokerLeads] = useState(false);

  // Sync selectedBroker state with dynamic URL path parameter
  useEffect(() => {
    if (brokerId) {
      const found = leadsList.find(b => b.id === brokerId);
      if (found) {
        setSelectedBroker(found);
      } else {
        // Placeholder while loading or if directly bookmarked
        setSelectedBroker({
          id: brokerId,
          name: `Broker #${brokerId}`,
          mobile: '',
          email: '',
          project: 'Evara',
          unitType: '2 BHK',
          budget: '₹80L - ₹1Cr',
          status: 'Approved',
          daysRemaining: 90,
          registeredDate: ''
        });
      }
    } else {
      setSelectedBroker(null);
    }
  }, [brokerId, leadsList]);

  const fetchBrokerLeads = async (id: string, currentPage: number, search: string) => {
    setLoadingBrokerLeads(true);
    try {
      const response = await axiosClient.get(`/brokers/${id}/leads?page=${currentPage}&limit=10&search=${encodeURIComponent(search)}`);
      if (response.data && response.data.success) {
        setBrokerLeads(response.data.data || []);
        setBrokerLeadsTotalPages(response.data.pagination?.totalPages || 1);
        setBrokerLeadsTotalItems(response.data.pagination?.totalItems || (response.data.data || []).length);
      }
    } catch (err) {
      console.error('Failed to fetch broker leads from API', err);
      setBrokerLeads([]);
      setBrokerLeadsTotalPages(1);
      setBrokerLeadsTotalItems(0);
    } finally {
      setLoadingBrokerLeads(false);
    }
  };

  useEffect(() => {
    if (brokerId) {
      fetchBrokerLeads(brokerId, brokerLeadsPage, brokerLeadsSearch);
    }
  }, [brokerId, brokerLeadsPage, brokerLeadsSearch]);

  // Reset broker leads page to 1 when search changes
  useEffect(() => {
    setBrokerLeadsPage(1);
  }, [brokerLeadsSearch]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerName.trim() || !brokerPhone.trim() || !brokerEmail.trim()) {
      Swal.fire('Input Error', 'Please fill in all broker details.', 'error');
      return;
    }

    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const newBrokerId = `L-${Math.floor(106 + Math.random() * 90)}`;
    const newLead: MockLead = {
      id: newBrokerId,
      name: brokerName.trim(),
      mobile: brokerPhone.trim(),
      email: brokerEmail.trim(),
      project: selectedProject,
      unitType: selectedConfig,
      budget: selectedBudget,
      status: "Verification Pending",
      daysRemaining: 90,
      registeredDate: new Date().toISOString().split('T')[0],
    };

    setLeadsList([newLead, ...leadsList]);
    setIsDrawerOpen(false);

    // Simulate OTP-based protection sequence
    Swal.fire({
      title: 'Broker Registered Successfully!',
      html: `
        <div class="text-left space-y-3 font-sans text-xs">
          <p class="font-medium text-slate-550 leading-relaxed">
            A temporary 60-day broker protection window has been activated for <strong>${brokerName}</strong>. 
          </p>
          <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between mt-1">
            <span class="font-black text-indigo-700 uppercase tracking-wider">SMS OTP Verification Code:</span>
            <span class="text-sm font-black text-slate-800 bg-white px-2 py-0.5 border border-indigo-200 rounded-md select-all">${randomOtp}</span>
          </div>
          <p class="text-[10px] text-slate-400 font-bold leading-normal">
            * Please ask the broker to share the OTP code with you to finalize verification.
          </p>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'Great, Thank You',
      confirmButtonColor: '#1A56DB',
      customClass: {
        popup: 'rounded-3xl p-6',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs shadow-md'
      }
    });

    // Reset Form Fields
    setBrokerName('');
    setBrokerPhone('');
    setBrokerEmail('');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Booked':
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Verification Pending':
      case 'Pending Approval':
      case 'PendingApproval':
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Suspended':
        return 'bg-rose-50 text-rose-705 border-rose-100';
      case 'OTP Verified':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Negotiation':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Visit Scheduled':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredLeads = leadsList;

  // Render detail view if a broker is selected
  if (selectedBroker) {
    const buyers = MOCK_BROKER_BUYERS[selectedBroker.id] || [];
    const notes = brokerNotes[selectedBroker.id] || [];

    const handleAddBrokerNoteSubmit = () => {
      if (!newBrokerNote.trim()) return;
      const noteObj = {
        author: Cookies.get('full_name') || "Channel Partner",
        date: new Date().toISOString().split('T')[0],
        content: newBrokerNote.trim()
      };
      setBrokerNotes({
        ...brokerNotes,
        [selectedBroker.id]: [noteObj, ...notes]
      });
      setNewBrokerNote('');
      Swal.fire({
        title: 'Note Added!',
        text: 'Broker interaction log has been updated.',
        icon: 'success',
        confirmButtonColor: '#1A56DB',
        customClass: {
          popup: 'rounded-3xl p-6',
          confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs'
        }
      });
    };

    return (
      <div className="space-y-6 text-left flex-1 flex flex-col relative animate-in fade-in duration-200">
        {/* Detail view header */}
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/channel-partner/leads')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Broker Leads</h2>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                My Brokers &gt; {selectedBroker.name} Leads
              </p>
            </div>
          </div>
        </div>

        {/* 2 Column Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
          {/* Profile Sidebar */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-3 pb-6 border-b border-slate-50">
                <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-full flex items-center justify-center text-2xl font-black shadow-inner">
                  {selectedBroker.name.charAt(0)}
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-[#0F172A]">{selectedBroker.name}</h3>
                  <span className={`inline-block border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(selectedBroker.status)}`}>
                    {selectedBroker.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-3">
                  <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>{selectedBroker.mobile}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="break-all">{selectedBroker.email}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between mt-6">
              <span>Broker ID: {selectedBroker.id}</span>
              <span>Designated CP</span>
            </div>
          </div>

          {/* Right Panel: Tabs, Timeline, and Notes */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex-1 flex flex-col w-full">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 -mx-6 px-6 overflow-x-auto gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider pb-3.5">
                <button
                  onClick={() => setActiveDetailTab('timeline')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeDetailTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Broker Leads List ({brokerLeadsTotalItems})
                </button>
                <button
                  onClick={() => setActiveDetailTab('notes')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeDetailTab === 'notes' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Broker Notes ({notes.length})
                </button>
              </div>

              {/* Tab Content: Timeline (Broker's Leads) */}
              {activeDetailTab === 'timeline' && (
                <div className="pt-4 flex flex-col flex-1 max-h-[460px]">
                  {/* Lead Search Bar */}
                  <div className="relative mb-4">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search leads by customer name, email..."
                      value={brokerLeadsSearch}
                      onChange={(e) => setBrokerLeadsSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Leads List */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-[220px]">
                    {loadingBrokerLeads ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : brokerLeads.length > 0 ? (
                      brokerLeads.map((lead, idx) => {
                        const cust = lead.customer_detail || {};
                        const dateStr = formatDateDDMMYYYY(lead.createdAt);
                        return (
                          <div key={lead.id || idx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3 hover:border-blue-200 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <button
                                  onClick={() => {
                                    localStorage.setItem('cpLeadCustomerName', cust.customer_name || 'Lead');
                                    navigate(`/channel-partner/brokers/${brokerId}/leads/${lead.id}`);
                                  }}
                                  className="text-xs font-black text-slate-800 hover:text-blue-600 transition-colors text-left cursor-pointer focus:outline-none"
                                >
                                  {cust.customer_name || 'Unnamed Customer'}
                                </button>
                                <span className="text-[10px] text-slate-450 font-bold block mt-0.5">Lead ID: {lead.lead_id}</span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-blue-50 text-blue-700 border-blue-100">
                                Stage {lead.stage}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100/50">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Project Choice</span>
                                <span className="text-slate-700 block mt-0.5">{lead.project === '5' ? 'Evara' : `Project ${lead.project}`} ({lead.unit_type})</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Contact Details</span>
                                <span className="text-slate-700 block mt-0.5">{cust.mobile_number}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Budget</span>
                                <span className="text-slate-700 block mt-0.5">₹{lead.budget}</span>
                              </div>
                            </div>

                            {cust.note && (
                              <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500 leading-normal">
                                <strong>Note:</strong> {cust.note}
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                Registered On: {dateStr}
                              </span>
                              <button
                                onClick={() => {
                                  localStorage.setItem('cpLeadCustomerName', cust.customer_name || 'Lead');
                                  navigate(`/channel-partner/brokers/${brokerId}/leads/${lead.id}`);
                                }}
                                className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wide cursor-pointer transition-colors"
                              >
                                View Details →
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-400 text-xs font-medium">No leads found for this broker.</p>
                      </div>
                    )}
                  </div>

                  {/* Broker Leads Pagination Controls */}
                  {brokerLeadsTotalPages > 1 && (
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Page {brokerLeadsPage} of {brokerLeadsTotalPages} ({brokerLeadsTotalItems} Leads)
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBrokerLeadsPage(p => Math.max(p - 1, 1))}
                          disabled={brokerLeadsPage === 1 || loadingBrokerLeads}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200/60 rounded-lg text-[9px] font-black text-slate-600 transition cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setBrokerLeadsPage(p => Math.min(p + 1, brokerLeadsTotalPages))}
                          disabled={brokerLeadsPage === brokerLeadsTotalPages || loadingBrokerLeads}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200/60 rounded-lg text-[9px] font-black text-slate-600 transition cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Notes */}
              {activeDetailTab === 'notes' && (
                <div className="pt-6 flex flex-col flex-1 max-h-[420px]">
                  {/* Add Note Input */}
                  <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <textarea
                      value={newBrokerNote}
                      onChange={(e) => setNewBrokerNote(e.target.value)}
                      placeholder="Add an interaction log or status update note..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[70px] resize-none"
                    ></textarea>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddBrokerNoteSubmit}
                        disabled={!newBrokerNote.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes Feed */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {notes.length > 0 ? (
                      notes.map((n, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-650 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                            {n.author.charAt(0)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-xs text-slate-800">{n.author}</span>
                              <span className="text-[9px] text-slate-400 font-bold">{n.date}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-400 text-xs font-medium">No notes recorded for this broker yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left flex-1 flex flex-col relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] animate-in fade-in duration-200">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">My Registered Brokers</h2>
          <p className="text-xs text-slate-450 font-semibold mt-0.5">
            Monitor verified broker locks, lead lifespan countdowns, and booking actions
          </p>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(26,86,219,0.15)] hover:shadow-[0_4px_16px_rgba(26,86,219,0.25)] cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Broker</span>
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center animate-in fade-in duration-200">
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Total Brokers</span>
          <span className="text-3xl font-black text-[#0F172A] block mt-1">{stats.total}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pending Approval</span>
          <span className="text-3xl font-black text-amber-600 block mt-1">{stats.pending}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Approved</span>
          <span className="text-3xl font-black text-emerald-600 block mt-1">{stats.approved}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Suspended</span>
          <span className="text-3xl font-black text-rose-600 block mt-1">{stats.suspended}</span>
        </div>
      </div>

      {/* Directory Table and Filter list */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 flex-1 flex flex-col min-h-[450px]">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by broker name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Pending', 'Approved', 'Suspended'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition border ${
                  statusFilter === status
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-500'
                } whitespace-nowrap cursor-pointer`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto -mx-6 flex-1 pt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3.5 px-6">Company Name</th>
                <th className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3.5 px-6">Broker Name</th>
                <th className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3.5 px-6">Contact details</th>
                <th className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3.5 px-6">Registered Date</th>
                <th className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3.5 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                    No brokers found matching filters/search query.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => (
                  <tr 
                    key={l.id} 
                    onClick={() => {
                      localStorage.setItem('cpBrokerName', l.name);
                      localStorage.removeItem('cpLeadCustomerName');
                      navigate(`/channel-partner/brokers/${l.id}/leads`);
                    }}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">
                      {l.companyName || '—'}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">
                      {l.name}
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{l.mobile}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500 font-semibold truncate block max-w-[180px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{l.email || '--'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{l.registeredDate}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && leadsList.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-2 mt-auto">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <CustomSelect
                options={['5', '10', '20']}
                value={String(limit)}
                onChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
                className="w-24"
              />
              <span>records per page</span>
            </div>

            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-600">Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
              <span className="text-slate-400 font-semibold">
                Showing {Math.min((page - 1) * limit + 1, totalItems)}–{Math.min(page * limit, totalItems)} of {totalItems} records
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Broker Registration */}
      {isDrawerOpen && (
        <ReceptionistRegisterBroker
          isModal={true}
          onClose={() => setIsDrawerOpen(false)}
          onSuccess={() => {
            setIsDrawerOpen(false);
            fetchBrokers(1, searchTerm);
          }}
        />
      )}
    </div>
  );
};
