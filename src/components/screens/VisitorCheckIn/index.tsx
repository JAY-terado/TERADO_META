import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, Phone, Mail, FileText, Calendar, Clock, MapPin, Loader2, UserCheck, User, Check, AlertCircle, CheckCircle } from 'lucide-react';
import { getVisitDetails, type SingleVisitResponse, postCheckInVisitor, reassignVisitor, getReceptionistProjects, putCompleteVisit } from '../../../pages/api/registercustomer';
import Swal from 'sweetalert2';
import { CustomSelect } from '../../CustomSelect';

export const VisitorCheckIn: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, checkInVisitor, autoAllocateSales, setLeads } = useBrokerConnect();

  const [loading, setLoading] = useState(true);
  const [visitDetails, setVisitDetails] = useState<SingleVisitResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal & Allotment States
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [isForcedAllotment, setIsForcedAllotment] = useState(false);
  const [allSalesPersons, setAllSalesPersons] = useState<any[]>([]);
  const [autoAllottedPerson, setAutoAllottedPerson] = useState<any>(null);
  const [changeAllotment, setChangeAllotment] = useState(false);
  const [chosenSalesPersonId, setChosenSalesPersonId] = useState('');
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [loadingSales, setLoadingSales] = useState(false);

  // Save receptionistCustomerName to localStorage for breadcrumbs
  useEffect(() => {
    if (visitDetails?.customer?.customer_name) {
      localStorage.setItem('receptionistCustomerName', visitDetails.customer.customer_name);
    }
    return () => {
      localStorage.removeItem('receptionistCustomerName');
    };
  }, [visitDetails]);

  const handleBack = () => {
    if (visitDetails && !visitDetails.assigned_sales_executive) {
      Swal.fire({
        title: 'Sales Person Not Assigned',
        text: 'This lead has not been assigned any sales person. Are you sure you want to leave this page?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Leave Page',
        cancelButtonText: 'Stay on Page',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#94A3B8',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/receptionist/dashboard');
        }
      });
    } else {
      navigate('/receptionist/dashboard');
    }
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAllotModal && !isForcedAllotment) {
        setShowAllotModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAllotModal, isForcedAllotment]);

  // Fetch unique sales persons
  useEffect(() => {
    const fetchSales = async () => {
      setLoadingSales(true);
      try {
        const res = await getReceptionistProjects();
        if (res && res.success && Array.isArray(res.data)) {
          const flatList: any[] = [];
          const seenIds = new Set<number>();
          res.data.forEach((proj: any) => {
            if (Array.isArray(proj.sales_executives)) {
              proj.sales_executives.forEach((exec: any) => {
                if (exec && exec.id && !seenIds.has(exec.id)) {
                  seenIds.add(exec.id);
                  flatList.push(exec);
                }
              });
            }
          });
          setAllSalesPersons(flatList);
        }
      } catch (err) {
        console.error('Failed to load sales executives:', err);
      } finally {
        setLoadingSales(false);
      }
    };
    fetchSales();
  }, []);

  const handleOpenAllotModal = () => {
    if (!visitDetails) return;
    
    if (visitDetails.assigned_sales_executive) {
      setAutoAllottedPerson(visitDetails.assigned_sales_executive);
      setChosenSalesPersonId(String(visitDetails.assigned_sales_executive.id));
    } else if (allSalesPersons.length > 0) {
      setAutoAllottedPerson(allSalesPersons[0]);
      setChosenSalesPersonId(String(allSalesPersons[0].id));
    } else {
      setAutoAllottedPerson(null);
      setChosenSalesPersonId('');
    }
    
    setChangeAllotment(false);
    setReason('');
    setModalError('');
    setShowAllotModal(true);
  };

  const handleAssignSalesPerson = async () => {
    if (changeAllotment && !reason.trim()) {
      setModalError('Reason for allotment is required.');
      return;
    }
    setModalError('');
    setSubmitting(true);

    const finalExecId = changeAllotment ? chosenSalesPersonId : String(autoAllottedPerson?.id);
    const finalExec = allSalesPersons.find(p => String(p.id) === finalExecId) || autoAllottedPerson;

    try {
      const res = await reassignVisitor(String(id), {
        sales_executive_id: Number(finalExecId),
        note: reason
      });
      
      if (res && res.success) {
        setSubmitting(false);
        setIsForcedAllotment(false);
        setShowAllotModal(false);

        await Swal.fire({
          title: 'Sales Person Allotted!',
          text: `Successfully assigned to ${finalExec?.full_name || 'N/A'}.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
        });

        // Refresh the visit details
        const updatedDetails = await getVisitDetails(String(id));
        if (updatedDetails && updatedDetails.success && updatedDetails.data) {
          setVisitDetails(updatedDetails.data);
        }
      } else {
        setModalError(res?.message || 'Failed to reassign the sales executive.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred during sales person assignment.';
      setModalError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const salesOptions = allSalesPersons.map((p) => ({
    value: String(p.id),
    label: `${p.full_name} (${p.contact_number})`
  }));

  useEffect(() => {
    if (!id) {
      setError("No visit ID provided.");
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await getVisitDetails(id);
        if (res && res.success && res.data) {
          const data = res.data;
          setVisitDetails(data);
          
          // Map to context leads if not already present
          const exists = leads.some(l => l.id === String(data.id));
          if (!exists) {
            const mappedLead = {
              id: String(data.id),
              name: data.customer?.customer_name || 'N/A',
              mobile: data.customer?.mobile_number || 'N/A',
              email: data.customer?.email || 'N/A',
              city: data.pickup_location || 'Mumbai',
              project: 'Sunrise Meadows',
              unitType: '2 BHK',
              budget: '₹80L - ₹1Cr',
              expectedDate: data.scheduled_date || '',
              expectedTime: data.scheduled_time || '',
              brokerId: 'BRK-001',
              brokerName: 'Amit Patel',
              status: 'OTP Verified' as const,
              otp: '1234',
              visitCode: data.visit_code || '',
              registeredOn: data.scheduled_date || '',
              ownershipValidTill: '',
            };
            setLeads(prev => [mappedLead, ...prev]);
          }

          // If assigned_sales_executive is null, auto check-in and trigger forced allotment modal
          if (!data.assigned_sales_executive) {
            setIsForcedAllotment(true);
            let checkInRes: any = null;
            if (data.status !== 2 && data.status_label !== 'Checked-In' && data.status !== 3 && data.status_label !== 'Completed') {
              try {
                checkInRes = await postCheckInVisitor({
                  visit_id: String(data.id),
                  visit_code: data.visit_code,
                  check_in_method: 'MANUAL_RECEPTIONIST'
                });
              } catch (chkErr) {
                console.error("Auto check-in error:", chkErr);
              }
            }

            const rawExec = checkInRes?.assignedExecutive || checkInRes?.data?.assignedExecutive;
            let defaultExec = null;
            if (rawExec) {
              defaultExec = {
                id: rawExec.id,
                full_name: rawExec.name || rawExec.full_name || '',
                contact_number: rawExec.contact || rawExec.contact_number || '',
                email: rawExec.email || ''
              };
              // Sync back to local details
              data.assigned_sales_executive = defaultExec;
              setVisitDetails({ ...data });
            } else if (allSalesPersons.length > 0) {
              defaultExec = allSalesPersons[0];
            }

            setAutoAllottedPerson(defaultExec);
            setChosenSalesPersonId(defaultExec ? String(defaultExec.id) : '');
            setChangeAllotment(false);
            setReason('');
            setModalError('');
            setShowAllotModal(true);
          }
        } else {
          setError("Failed to fetch visit details.");
        }
      } catch (err) {
        console.error("Error loading visit details:", err);
        setError("Error loading visit details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, leads, setLeads]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDetails || submitting) return;

    Swal.fire({
      title: 'Confirm Check-In',
      text: `Are you sure you want to check in customer ${customerName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Check In',
      cancelButtonText: 'No, Cancel',
      confirmButtonColor: '#1A56DB',
      cancelButtonColor: '#94A3B8',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setSubmitting(true);
        try {
          const payload = {
            visit_id: String(visitDetails.id),
            visit_code: visitDetails.visit_code,
            check_in_method: 'MANUAL_RECEPTIONIST'
          };
          
          const res = await postCheckInVisitor(payload);
          if (res && (res.success || res.visit_code)) {
            // Sync with local context state simulation
            checkInVisitor(payload.visit_id, {
              address: '',
              occupation: '',
              company: '',
              panUploaded: false,
              aadhaarUploaded: false,
              selfieCaptured: false,
            });

            autoAllocateSales(payload.visit_id);

            const rawExec = res?.assignedExecutive || res?.data?.assignedExecutive;
            if (rawExec) {
              const checkInExec = {
                id: rawExec.id,
                full_name: rawExec.name || rawExec.full_name || '',
                contact_number: rawExec.contact || rawExec.contact_number || '',
                email: rawExec.email || ''
              };
              setVisitDetails((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  assigned_sales_executive: checkInExec
                };
              });
            }

            await Swal.fire({
              title: 'Success',
              text: res.message || 'Visitor checked in successfully.',
              icon: 'success',
              confirmButtonColor: '#10B981'
            });

            navigate('/receptionist/appointments');
          } else {
            await Swal.fire({
              title: 'Check-In Failed',
              text: res.message || 'Failed to complete visitor check-in.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          console.error("Error during check-in API request:", err);
          await Swal.fire({
            title: 'Error',
            text: 'An error occurred while connecting to the check-in server.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleComplete = () => {
    if (!visitDetails || submitting) return;

    Swal.fire({
      title: 'Confirm Completion',
      text: `Are you sure you want to mark customer ${customerName}'s visit as completed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Complete',
      cancelButtonText: 'No, Cancel',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#94A3B8',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setSubmitting(true);
        try {
          const res = await putCompleteVisit(String(visitDetails.id));
          if (res && res.success) {
            await Swal.fire({
              title: 'Success',
              text: res.message || 'Visit marked as completed successfully.',
              icon: 'success',
              confirmButtonColor: '#10B981'
            });
            // Refresh the visit details
            const updatedDetails = await getVisitDetails(String(visitDetails.id));
            if (updatedDetails && updatedDetails.success && updatedDetails.data) {
              setVisitDetails(updatedDetails.data);
            }
          } else {
            await Swal.fire({
              title: 'Error',
              text: res.message || 'Failed to mark visit as completed.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          console.error("Error completing visit:", err);
          const errMsg = err.response?.data?.message || err.message || 'An error occurred while completing the visit.';
          await Swal.fire({
            title: 'Error',
            text: errMsg,
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[450px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <span className="text-slate-500 font-semibold text-sm">Loading visitor details...</span>
      </div>
    );
  }

  if (error || !visitDetails) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06)] text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
          <ArrowLeft className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Error</h3>
        <p className="text-sm text-slate-500">{error || "Visitor details not found."}</p>
        <button
          onClick={() => navigate('/receptionist/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const customerName = visitDetails.customer?.customer_name || 'N/A';
  const visitCode = visitDetails.visit_code || 'N/A';

  const isCompleted = visitDetails.status === 3 || visitDetails.status_label === 'Completed';
  const isCheckedIn = visitDetails.status === 2 || visitDetails.status_label === 'Checked-In';

  return (
    <>
      <div className="space-y-6 text-left animate-fade-up">
        {/* Header Panel */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Visitor Check-In</h2>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                Reception Desk &gt; Customer Details Validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
              {visitCode}
            </span>
            {isCompleted ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-750 border border-indigo-150 uppercase tracking-wider">
                Completed
              </span>
            ) : isCheckedIn ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                Checked-In
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Details Panel (Desktop 8 columns) */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-up stagger-2">
            
            {/* Customer Greeting */}
            <div className="flex items-center gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#1A56DB] to-indigo-650 text-white rounded-full flex items-center justify-center text-lg font-black shadow-md shrink-0 select-none">
                {customerName.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">{customerName}</h3>
                {isCompleted ? (
                  <span className="inline-flex px-2 py-0.5 border border-indigo-150 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-750 uppercase tracking-wider mt-1">
                    Completed
                  </span>
                ) : isCheckedIn ? (
                  <span className="inline-flex px-2 py-0.5 border border-emerald-150 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider mt-1">
                    Checked-In
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mt-0.5 block">Currently Checking In</span>
                )}
              </div>
            </div>

            {/* Customer Card */}
            <div className="space-y-4">
              {/* Centered Customer Information Header with Decreasing lines */}
              <div className="flex items-center gap-3 w-full my-1 pb-1">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Customer Information</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
              </div>

              <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 text-left">
                {/* Mobile Number */}
                <div className="flex items-center gap-3">
                  <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Mobile Number</span>
                    <span className="text-xs font-bold text-slate-800">{visitDetails.customer?.mobile_number || 'N/A'}</span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex items-center gap-3 border-t border-slate-100/55 pt-2.5">
                  <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Email Address</span>
                    <span className="text-xs font-bold text-slate-800">{visitDetails.customer?.email || 'N/A'}</span>
                  </div>
                </div>

                {/* Customer Note */}
                <div className="flex items-start gap-3 border-t border-slate-100/55 pt-2.5">
                  <FileText className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Customer Note</span>
                    <span className="text-xs font-medium text-slate-600 block mt-0.5">{visitDetails.customer?.note || 'No notes provided.'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive & Creator Details Grid */}
            {(visitDetails.created_by_detail || visitDetails.assigned_sales_executive) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 pt-4 border-t border-slate-100/60">
                
                {/* Left Column: CREATED / ASSIGNED BY */}
                {visitDetails.created_by_detail ? (
                  <div className="space-y-3">
                    {/* Centered Created By Header with Decreasing lines */}
                    <div className="flex items-center gap-3 w-full my-1 pb-1">
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Created By</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                    </div>

                    <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 text-left">
                      {/* Name & Role */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100">
                          {visitDetails.created_by_detail.full_name?.charAt(0)}
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Created By</span>
                          <span className="text-xs font-bold text-slate-800">
                            {visitDetails.created_by_detail.full_name}
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-emerald-700 uppercase bg-emerald-50 border border-emerald-100/60 px-1.5 py-0.5 rounded-md ml-auto shrink-0">
                          {visitDetails.created_by_detail.role?.toLowerCase()}
                        </span>
                      </div>

                      {/* Contact Number */}
                      <div className="flex items-center gap-3 border-t border-slate-100/50 pt-2.5">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="text-left">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">Contact Number</span>
                          <span className="text-xs font-bold text-slate-700">
                            {visitDetails.created_by_detail.contact_number || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : <div />}

                {/* Right Column: ASSIGNED SALES EXECUTIVE */}
                {visitDetails.assigned_sales_executive ? (
                  <div className="space-y-3">
                    {/* Centered Assigned Sales Executive Header with Decreasing lines */}
                    <div className="flex items-center gap-3 w-full my-1 pb-1">
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Assigned Sales Executive</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                    </div>

                    <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 text-left">
                      {/* Name & Role */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                          {visitDetails.assigned_sales_executive.full_name?.charAt(0)}
                        </div>
                        <div className="text-left">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Executive</span>
                          <span className="text-xs font-bold text-slate-800">
                            {visitDetails.assigned_sales_executive.full_name}
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-blue-700 uppercase bg-blue-50 border border-blue-100/60 px-1.5 py-0.5 rounded-md ml-auto shrink-0">
                          sales
                        </span>
                      </div>

                      {/* Contact Number */}
                      <div className="flex items-center gap-3 border-t border-slate-100/50 pt-2.5">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="text-left">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">Contact Number</span>
                          <span className="text-xs font-bold text-slate-700">
                            {visitDetails.assigned_sales_executive.contact_number || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Email Address */}
                      {visitDetails.assigned_sales_executive.email && (
                        <div className="flex items-center gap-3 border-t border-slate-100/50 pt-2.5">
                          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="text-left">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">Email Address</span>
                            <span className="text-xs font-bold text-slate-700 block truncate max-w-[150px] sm:max-w-[200px]" title={visitDetails.assigned_sales_executive.email}>
                              {visitDetails.assigned_sales_executive.email}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : <div />}

              </div>
            )}
          </div>

          {/* Visit Schedule Card (Desktop 4 columns) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6 flex flex-col justify-between anim-fade-up stagger-3">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-2">
                Scheduled Details
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Scheduled Date</span>
                  </div>
                  <span className="font-bold text-slate-700">{visitDetails.scheduled_date || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Scheduled Time</span>
                  </div>
                  <span className="font-bold text-slate-700">{visitDetails.scheduled_time || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Pickup Service</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${visitDetails.pickup === 1 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-500'}`}>
                    {visitDetails.pickup === 1 ? visitDetails.pickup_location || 'N/A' : 'No'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Registered On</span>
                  </div>
                  <span className="font-semibold text-slate-500">
                    {visitDetails.createdAt ? new Date(visitDetails.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {isCompleted ? (
              <div className="pt-4 border-t border-slate-100 text-center">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-750 font-bold text-xs flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-650" />
                  <span>Visit Already Completed</span>
                </div>
              </div>
            ) : isCheckedIn ? (
              <div className="pt-4 border-t border-slate-100 text-center space-y-2.5">
                <button
                  type="button"
                  onClick={handleOpenAllotModal}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer text-center flex items-center justify-center gap-1.5 press shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                >
                  <UserCheck className="w-4 h-4 text-white" />
                  <span>Reassign Sales Person</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <button
                  type="button"
                  onClick={handleOpenAllotModal}
                  className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer text-center flex items-center justify-center gap-1.5 press"
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reassign Sales Person</span>
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648C0] disabled:bg-slate-400 text-white font-semibold rounded-xl text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer text-center flex items-center justify-center gap-2 press pulse-glow"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking In...</span>
                    </>
                  ) : (
                    <span>Check-In Visitor & Allocate</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allotment Modal */}
      {showAllotModal && createPortal(
        <div
          onClick={() => {
            if (!isForcedAllotment) setShowAllotModal(false);
          }}
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden animate-scale-in"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#10B981] to-[#059669] px-6 py-6 text-center text-white relative">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="mx-auto w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-3">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold">Sales Person Allotment</h3>
                <p className="text-[11px] text-emerald-100/80 font-medium mt-1">
                  Allocate visitor to a Sales Executive
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-left">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Automatic Allocation Card */}
              <div className="bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    System Allotted (Visit #{id})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Auto-Allotted
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0F172A]">{autoAllottedPerson?.full_name || 'Not Allotted'}</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {autoAllottedPerson?.contact_number || 'N/A'} • {autoAllottedPerson?.email || 'No email'}
                  </p>
                </div>
              </div>

              {/* Change Assignment Toggle & Dropdown */}
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={changeAllotment}
                    onChange={(e) => setChangeAllotment(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500/20 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                    I want to change the Sales Person
                  </span>
                </label>

                {changeAllotment && (
                  <>
                    <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Select Sales Executive</label>
                      {salesOptions.length > 0 ? (
                        <CustomSelect
                          value={chosenSalesPersonId}
                          onChange={(val) => setChosenSalesPersonId(val)}
                          options={salesOptions}
                          placeholder="Choose Sales Executive"
                          icon={User}
                          className="w-full"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">
                          Loading available executives...
                        </div>
                      )}
                    </div>

                    {/* Reason for Allotment (Mandatory) */}
                    <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Reason for Allotment <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <textarea
                        rows={2.5}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason (e.g. Language compatibility, specific project query, VIP walk-in)"
                        className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold resize-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {!isForcedAllotment && (
                  <button
                    type="button"
                    onClick={() => setShowAllotModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition press cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAssignSalesPerson}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition shadow-[0_4px_12px_rgba(16,185,129,0.2)] text-center flex items-center justify-center gap-1.5 press cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Allocating...</span>
                    </>
                  ) : (
                    <span>Assign Sales Person</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
