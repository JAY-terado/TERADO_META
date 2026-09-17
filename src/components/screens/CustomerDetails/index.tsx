import React, { useState, useEffect } from 'react';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, Phone, Mail, MapPin, Landmark, Loader2, Send, Building, Layers, ClipboardList, UserCheck, MessageSquare, X, Calendar, Pencil, Globe, FileText } from 'lucide-react';
import { getSalesLeadDetails, addSalesLeadNote, createLeadTask, updateLeadTaskStatus } from '../../../pages/api/registercustomer';
import Swal from 'sweetalert2';
import { CreateBookingModal, type CreateBookingData } from '../../CreateBookingModal';
import { CreateTaskModal } from '../../CreateTaskModal';
import { DeadReasonModal } from '../../DeadReasonModal';
import axiosClient from '../../../../axiosinstance';
import { createRevisitOnServer } from '../../../pages/api/registercustomer';

export const CustomerDetails: React.FC = () => {
  const { leads, setActiveScreen, projects, createBooking } = useBrokerConnect();

  // Find the selected lead or default to the first lead
  const selectedLeadId = localStorage.getItem('selectedLeadId');
  const activeLead = leads.find(l => l.id === selectedLeadId) || leads[0];

  // Safe fallback if activeLead is not in context (e.g., page refresh)
  const activeLeadSafe = (activeLead || {
    id: selectedLeadId || '',
    name: 'Customer',
    mobile: 'N/A',
    email: 'N/A',
    city: '',
    project: '',
    unitType: '',
    budget: '',
    status: 'New',
    lastActivity: '',
    assignedExecutive: 'Unassigned',
    brokerName: '',
    brokerId: '',
    registeredOn: new Date().toISOString().split('T')[0],
  }) as any;

  const [activeTab, setActiveTab] = useState<'visits' | 'timeline' | 'notes' | 'activity'>('visits');
  const [newNote, setNewNote] = useState('');
  const [contactStatus, setContactStatus] = useState<number>(1);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditReqModalOpen, setIsEditReqModalOpen] = useState(false);
  const [isDeadModalOpen, setIsDeadModalOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState('');
  // Revisit states
  const [isRevisitModalOpen, setIsRevisitModalOpen] = useState(false);
  const [revisitType, setRevisitType] = useState<'SCHEDULE' | 'COMPLETED'>('SCHEDULE');
  const [revisitDate, setRevisitDate] = useState('');
  const [revisitTime, setRevisitTime] = useState('');
  const [revisitPickup, setRevisitPickup] = useState(false);
  const [revisitPickupLocation, setRevisitPickupLocation] = useState('');
  const [revisitSubmitting, setRevisitSubmitting] = useState(false);
  const [revisitError, setRevisitError] = useState('');

  const [editUnitType, setEditUnitType] = useState('2 BHK');
  const [editBudget, setEditBudget] = useState('');
  const [editCurrentResidence, setEditCurrentResidence] = useState('');
  const [editPurposeOfBuying, setEditPurposeOfBuying] = useState('');
  const [editExpectedDuration, setEditExpectedDuration] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTag, setEditTag] = useState('');



  useEffect(() => {
    const fetchLeadData = async () => {
      if (!selectedLeadId) return;
      setApiLoading(true);
      try {
        // Fetch details
        const detailsRes = await getSalesLeadDetails(selectedLeadId);
        if (detailsRes && detailsRes.success && detailsRes.data) {
          setLeadDetails(detailsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch lead data:', err);
      } finally {
        setApiLoading(false);
      }
    };

    fetchLeadData();
  }, [selectedLeadId]);

  useEffect(() => {
    if (leadDetails) {
      const logs = leadDetails.activityLogs || leadDetails.activity_logs || [];
      const mappedActivities = logs.map((l: any) => ({
        id: String(l.id),
        type: l.activityType?.replace(/_/g, ' ') || 'Activity',
        description: l.message,
        createdAt: l.createdAt || l.date || l.updatedAt
      }));
      setActivities(mappedActivities);
    }
  }, [leadDetails]);

  const handleRevisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevisitError('');
    if (!revisitDate || !revisitTime || !selectedLeadId) {
      setRevisitError('Please fill all required fields.');
      return;
    }

    setRevisitSubmitting(true);
    try {
      const payload = {
        lead_id: Number(selectedLeadId),
        date: revisitDate,
        time: revisitTime,
        pickup: revisitPickup ? 1 : 0,
        pickup_location: revisitPickupLocation,
        is_completed: revisitType === 'COMPLETED'
      };

      const res = await createRevisitOnServer(payload);
      if (res && res.success) {
        Swal.fire({
          title: 'Success',
          text: 'Revisit created successfully',
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
        setIsRevisitModalOpen(false);
        // Refresh details
        const detailsRes = await getSalesLeadDetails(selectedLeadId);
        if (detailsRes && detailsRes.success && detailsRes.data) {
          setLeadDetails(detailsRes.data);
        }
      } else {
        setRevisitError(res?.message || 'Failed to create revisit');
      }
    } catch (err: any) {
      console.error('Error creating revisit:', err);
      setRevisitError(err.message || 'An error occurred while creating revisit');
    } finally {
      setRevisitSubmitting(false);
    }
  };

  const handleConfirmBooking = (bookingData: CreateBookingData) => {
    const matchedProj = projects.find(p => p.id === bookingData.projectId);
    const resolvedProjName = matchedProj ? matchedProj.name : projectNameStr;

    createBooking({
      leadId: activeLeadSafe.id,
      customerName: customerName,
      project: resolvedProjName,
      tower: bookingData.tower || bookingData.paymentSchedule || bookingData.payment_schedule || '',
      paymentSchedule: bookingData.paymentSchedule || bookingData.payment_schedule || '',
      floor: bookingData.floor,
      unitNo: bookingData.unitNo,
      bookingAmount: bookingData.bookingAmount,
      agreementValue: bookingData.agreementValue,
    });

    setIsBookingModalOpen(false);

    Swal.fire({
      title: 'Booking Confirmed!',
      text: 'The booking has been successfully saved, stage transitioned, and commission triggers processed.',
      icon: 'success',
      confirmButtonColor: '#1A56DB',
    }).then(() => {
      setActiveScreen(9);
    });
  };

  const handleToggleTaskStatus = async (taskId: number) => {
    if (!taskId || !selectedLeadId) return;

    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to mark this task as completed?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A56DB',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, complete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await updateLeadTaskStatus(taskId, 2);
          if (res && res.success) {
            Swal.fire({
              title: 'Completed!',
              text: 'The task has been marked as completed successfully.',
              icon: 'success',
              confirmButtonColor: '#1A56DB'
            });
            // Refresh details to update the task list
            const detailsRes = await getSalesLeadDetails(selectedLeadId);
            if (detailsRes && detailsRes.success && detailsRes.data) {
              setLeadDetails(detailsRes.data);
            }
          } else {
            Swal.fire({
              title: 'Error',
              text: res?.message || 'Failed to update task status.',
              icon: 'error',
              confirmButtonColor: '#1A56DB'
            });
          }
        } catch (err) {
          console.error('Error updating task status:', err);
          Swal.fire({
            title: 'Error',
            text: 'An error occurred while updating the task status.',
            icon: 'error',
            confirmButtonColor: '#1A56DB'
          });
        }
      }
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLeadId) return;
    setSubmittingNote(true);
    try {
      const numericLeadId = Number(selectedLeadId);
      const res = await addSalesLeadNote({
        lead_id: numericLeadId,
        note: newNote,
        contact_status: contactStatus
      });
      if (res && res.success) {
        setNewNote('');

        // Refresh lead details to get the new note
        const detailsRes = await getSalesLeadDetails(selectedLeadId);
        if (detailsRes && detailsRes.success && detailsRes.data) {
          setLeadDetails(detailsRes.data);
        }
      } else {
        Swal.fire({ title: 'Error', text: res?.message || 'Failed to add note', icon: 'error', confirmButtonColor: '#1A56DB' });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ title: 'Error', text: 'An error occurred while adding note', icon: 'error', confirmButtonColor: '#1A56DB' });
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!activeLeadSafe) {
    return <div className="p-8 text-center text-slate-400">Loading customer details...</div>;
  }

  // Stage mapping helper
  const getStageStatusText = (stageNum: number) => {
    switch (stageNum) {
      case -1: return 'Not Interested';
      case 0: return 'New lead';
      case 1: return 'OTP Verified';
      case 2: return 'Checked In';
      case 3: return 'Negotiation';
      case 4: return 'Booked';
      default: return 'OTP Verified';
    }
  };

  // Helper styles for badges
  const getBadgeStyle = (statusStr: string) => {
    if (statusStr === 'Booked') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (statusStr === 'Negotiation') return 'bg-purple-50 text-purple-700 border-purple-100';
    if (['OTP Verified', 'Checked In', 'Allocated', 'Visited', 'Follow-Up', 'Registered'].includes(statusStr)) return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  const getTagBadgeStyle = (tagStr: string) => {
    const lower = tagStr.toLowerCase();
    if (lower.includes('hot')) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (lower.includes('warm')) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (lower.includes('cold')) return 'bg-sky-50 text-sky-700 border-sky-100';
    if (lower.includes('qualified')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  // Map fields from API / context
  const customerName = leadDetails?.customer_detail?.customer_name || activeLeadSafe.name || 'N/A';
  const mobileNumber = leadDetails?.customer_detail?.mobile_number || activeLeadSafe.mobile || 'N/A';
  const emailAddress = leadDetails?.customer_detail?.email || activeLeadSafe.email || 'N/A';
  const addressText = leadDetails?.city || activeLeadSafe.address || activeLeadSafe.city || 'N/A';
  const sourceText = leadDetails?.customer_detail?.source || activeLeadSafe.source || 'N/A';
  const noteText = leadDetails?.customer_detail?.note || activeLeadSafe.additionalNotes || 'N/A';
  const currentStageText = leadDetails ? getStageStatusText(leadDetails.stage) : activeLeadSafe.status;
  const tagText = leadDetails?.tag || activeLeadSafe.tag || '';
  const createdDateVal = leadDetails?.createdAt || activeLeadSafe.createdAt || '';
  const formattedCreatedDate = createdDateVal ? new Date(createdDateVal).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const handleCallSimulate = () => {
    Swal.fire({
      title: 'Connecting Call...',
      html: `Dialing masked secure gateway connection for client <strong class="text-blue-600">${customerName}</strong>.<br/><br/><small class="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Recording session active</small>`,
      icon: 'info',
      confirmButtonText: 'End Call',
      confirmButtonColor: '#EF4444',
      timer: 8000,
      timerProgressBar: true
    });
  };

  const handleWhatsAppSimulate = () => {
    const cleanPhone = mobileNumber.replace(/\s+/g, '');
    const phoneForWa = cleanPhone.startsWith('+') ? cleanPhone : '+91' + cleanPhone;

    Swal.fire({
      title: 'Send WhatsApp Message',
      input: 'textarea',
      inputLabel: `Compose message for ${customerName}`,
      inputValue: `Hello ${customerName}, `,
      inputPlaceholder: 'Type your message here...',
      inputAttributes: {
        'aria-label': 'Type your message here'
      },
      showCancelButton: true,
      confirmButtonText: 'Send',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const text = result.value;
        window.open(`https://api.whatsapp.com/send?phone=${phoneForWa}&text=${encodeURIComponent(text)}`, '_blank');
      }
    });
  };

  const handleMailClick = () => {
    if (!emailAddress || emailAddress === 'N/A') {
      Swal.fire({
        title: 'No Email Address',
        text: 'This customer does not have a registered email address.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    Swal.fire({
      title: 'Compose Email',
      html: `
        <div style="text-align: left; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Subject</div>
        <input id="swal-email-subject" class="swal2-input" placeholder="Enter subject" style="margin-top: 0; margin-bottom: 16px; width: 100%; box-sizing: border-box; font-size: 14px;">
        
        <div style="text-align: left; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Message Body</div>
        <textarea id="swal-email-body" class="swal2-textarea" placeholder="Type email body here..." style="margin-top: 0; width: 100%; box-sizing: border-box; min-height: 120px; font-size: 14px;"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Open Mail',
      confirmButtonColor: '#4F46E5',
      cancelButtonColor: '#6B7280',
      preConfirm: () => {
        const subject = (document.getElementById('swal-email-subject') as HTMLInputElement).value;
        const body = (document.getElementById('swal-email-body') as HTMLTextAreaElement).value;
        if (!subject) {
          Swal.showValidationMessage('Subject is required');
          return false;
        }
        return { subject, body };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { subject, body } = result.value;
        const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
      }
    });
  };

  const openEditReqModal = () => {
    // Current project ID
    const currentProjId = leadDetails?.project || activeLeadSafe.project || '';
    // Find the project object to populate select properly
    const matchedProj = projects.find(p => String(p.id) === String(currentProjId) || p.name === String(currentProjId));
    setEditProjectId(matchedProj?.id ? String(matchedProj.id) : '');

    setEditUnitType(leadDetails?.unit_type || activeLeadSafe.unitType || '2 BHK');

    // Budget mapping
    let mappedBudget = '';
    if (leadDetails?.budget) {
      const budgetVal = leadDetails.budget;
      if (budgetVal === 5500000) mappedBudget = '50L - 60L';
      else if (budgetVal === 7000000) mappedBudget = '60L - 80L';
      else if (budgetVal === 8500000) mappedBudget = '80L - 1Cr';
      else if (budgetVal === 11000000) mappedBudget = '1Cr - 1.2Cr';
      else if (budgetVal === 13500000) mappedBudget = '1.2Cr - 1.5Cr';
      else if (budgetVal === 17500000) mappedBudget = '1.5Cr - 2Cr';
      else if (budgetVal === 22500000) mappedBudget = '2Cr - 2.5Cr';
      else if (budgetVal === 30000000) mappedBudget = '3Cr+';
      else mappedBudget = String(budgetVal);
    } else {
      mappedBudget = activeLeadSafe.budgetRange || '';
    }
    setEditBudget(mappedBudget);

    setEditCurrentResidence(leadDetails?.current_residence || leadDetails?.customer_detail?.address || '');
    setEditPurposeOfBuying(leadDetails?.purpose_of_buying || '');
    setEditExpectedDuration(leadDetails?.expected_booking_duration || '');
    setEditTag(leadDetails?.tag || activeLeadSafe.tag || '');

    setEditCustomerName(leadDetails?.customer_detail?.customer_name || activeLeadSafe.name || '');
    setEditMobileNumber(leadDetails?.customer_detail?.mobile_number || activeLeadSafe.mobile || '');
    const rawEmail = leadDetails?.customer_detail?.email || activeLeadSafe.email || '';
    setEditEmail((rawEmail && rawEmail.trim().toUpperCase() !== 'N/A') ? rawEmail : '');

    setIsEditReqModalOpen(true);
  };

  const handleEditReqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    Swal.fire({
      title: 'Saving changes...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const isValidEmail = Boolean(
        editEmail &&
        editEmail.trim() !== '' &&
        editEmail.toUpperCase() !== 'N/A' &&
        editEmail.includes('@')
      );

      const payload: Record<string, any> = {
        unit_type: editUnitType || undefined,
        budget: editBudget || undefined,
        current_residence: editCurrentResidence || undefined,
        purpose_of_buying: editPurposeOfBuying || undefined,
        expected_booking_duration: editExpectedDuration || undefined,
        tag: editTag || undefined
      };

      if (isValidEmail) {
        payload.email = editEmail.trim();
      }

      const res = await axiosClient.put(`/leads/${selectedLeadId}/update-info`, payload);

      if (res.data && res.data.success) {
        Swal.fire({
          title: 'Saved!',
          text: 'Requirement details have been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#3B82F6'
        });
        setIsEditReqModalOpen(false);

        // Refresh details
        if (selectedLeadId) {
          const detailsRes = await getSalesLeadDetails(selectedLeadId);
          if (detailsRes && detailsRes.success && detailsRes.data) {
            setLeadDetails(detailsRes.data);
          }
        }
      } else {
        Swal.fire({
          title: 'Error',
          text: res.data?.message || 'Failed to update requirement details.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (err: any) {
      console.error('Update requirements failed:', err);
      Swal.fire({
        title: 'Error',
        text: err.message || 'An error occurred while updating requirements.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const getProjectName = () => {
    const projDetails = leadDetails?.project_details;
    if (Array.isArray(projDetails) && projDetails.length > 0) {
      return projDetails[0].project_name;
    }
    if (leadDetails?.project_detail?.project_name) return leadDetails.project_detail.project_name;
    if (leadDetails?.Project?.project_name) return leadDetails.Project.project_name;
    if (leadDetails?.Project?.name) return leadDetails.Project.name;
    if (leadDetails?.project_name) return leadDetails.project_name;

    const projId = leadDetails?.project;
    if (!projId) return activeLeadSafe.project || 'Sunrise Meadows';
    const found = projects.find(p => String(p.id) === String(projId));
    return found?.name || projId;
  };
  const projectNameStr = getProjectName();

  const unitTypeStr = leadDetails?.unit_type || activeLeadSafe.unitType || '2 BHK';

  const getBudgetLabel = () => {
    const budgetVal = leadDetails?.budget;
    if (!budgetVal) return activeLeadSafe.budget || '₹80L - ₹1Cr';

    if (typeof budgetVal === 'string') return budgetVal;
    if (budgetVal === 5500000) return '₹50L - ₹60L';
    if (budgetVal === 7000000) return '₹60L - ₹80L';
    if (budgetVal === 8500000) return '₹80L - ₹1Cr';
    if (budgetVal === 11000000) return '₹1Cr - ₹1.2Cr';
    if (budgetVal === 13500000) return '₹1.2Cr - ₹1.5Cr';
    if (budgetVal === 17500000) return '₹1.5Cr - ₹2Cr';
    if (budgetVal === 22500000) return '₹2Cr - ₹2.5Cr';
    if (budgetVal === 30000000) return '₹2.5Cr+';

    if (budgetVal >= 10000000) {
      return `₹${(budgetVal / 10000000).toFixed(1)} Cr`;
    }
    if (budgetVal >= 100000) {
      return `₹${(budgetVal / 100000).toFixed(0)} L`;
    }
    return `₹${budgetVal}`;
  };
  const budgetStr = getBudgetLabel();

  const salesAgent = activeLeadSafe.assignedExecutive || 'Unassigned';

  const getBrokerText = () => {
    const brokerObj = leadDetails?.customer_detail?.broker;
    if (brokerObj) {
      const company = brokerObj.company_name || '';
      const name = brokerObj.broker_name || '';
      const phone = brokerObj.mobile_number || '';

      const parts = [];
      if (company) parts.push(company);
      if (name) parts.push(name);
      if (phone) parts.push(phone);

      return parts.join(' - ') || '--';
    }
    if (activeLeadSafe.brokerName) {
      return activeLeadSafe.brokerName;
    }
    return '--';
  };
  const brokerText = getBrokerText();
  const brokerId = leadDetails?.customer_detail?.broker?.id ? String(leadDetails.customer_detail.broker.id) : activeLeadSafe.brokerId;

  const customerId = leadDetails?.id || activeLeadSafe.id;
  const lastActivityText = leadDetails?.scheduled_visit_date ? leadDetails.scheduled_visit_date.split('T')[0] : activeLeadSafe.lastActivity || new Date().toISOString().split('T')[0];

  const visitTimeline = [
    ...(leadDetails?.visits || []).map((v: any) => ({
      id: `visit-${v.id}`,
      title: `Visit: ${v.visit_code} (${v.status === 3 ? 'Completed' : 'Scheduled'})`,
      description: `Scheduled Date: ${v.scheduled_date} ${v.scheduled_time}. ` +
        (v.check_in_time ? `Checked in via ${v.check_in_method || 'RECEPTIONIST'}. ` : '') +
        (v.completed_at ? `Completed at ${v.completed_at.split('T')[0]}.` : ''),
      createdAt: v.completed_at || v.check_in_time || `${v.scheduled_date}T${v.scheduled_time}.000Z`,
      isVisit: true,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Latest first

  return (
    <div className="space-y-6 text-left flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveScreen(9)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Customer Details</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Sales Desk &gt; Client Profile &amp; Timeline
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsRevisitModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] cursor-pointer press"
          >
            <Calendar className="w-4 h-4" />
            <span>Create Revisit</span>
          </button>
          {currentStageText !== 'Booked' && (
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer press pulse-glow"
            >
              <Landmark className="w-4 h-4" />
              <span>Create Booking</span>
            </button>
          )}
        </div>
      </div>

      {apiLoading && !leadDetails ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[300px] flex-1">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <span className="text-xs text-slate-400 font-semibold">Loading details from API...</span>
        </div>
      ) : (
        /* Main Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">

          {/* Left Card: Customer Profile Summary */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6 flex flex-col justify-between anim-fade-up stagger-2">
            <div className="space-y-6">
              <div className="text-center space-y-3 pb-6 border-b border-slate-50">
                <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-full flex items-center justify-center text-2xl font-black shadow-inner">
                  {customerName.charAt(0)}
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#0F172A]">{customerName}</h3>
                    <button
                      type="button"
                      onClick={openEditReqModal}
                      className="p-1.5 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg border border-blue-100 hover:border-transparent transition-all cursor-pointer shadow-xs hover:shadow"
                      title="Edit Customer & Requirement Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <select
                      value={
                        tagText === 'Dead' ||
                        tagText?.toLowerCase()?.includes('dead') ||
                        tagText?.toLowerCase()?.includes('not connected')
                          ? 'Dead'
                          : (tagText || '')
                      }
                      onChange={(e) => {
                        const newTag = e.target.value;
                        if (!selectedLeadId) return;

                        if (newTag === 'Dead') {
                          setIsDeadModalOpen(true);
                          return;
                        }

                        Swal.fire({
                          title: 'Update Lead Tag?',
                          text: `Are you sure you want to change tag to "${newTag || 'None'}"?`,
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#1A56DB',
                          cancelButtonColor: '#6B7280',
                          confirmButtonText: 'Yes, update tag'
                        }).then(async (result) => {
                          if (result.isConfirmed) {
                            try {
                              const res = await axiosClient.put(`/leads/${selectedLeadId}/update-info`, {
                                tag: newTag || undefined
                              });
                              if (res.data && res.data.success) {
                                Swal.fire({
                                  title: 'Tag Updated',
                                  text: `Lead tag updated to "${newTag || 'None'}" successfully.`,
                                  icon: 'success',
                                  timer: 1500,
                                  showConfirmButton: false
                                });
                                // Refresh lead details
                                const detailsRes = await getSalesLeadDetails(selectedLeadId);
                                if (detailsRes && detailsRes.success && detailsRes.data) {
                                  setLeadDetails(detailsRes.data);
                                }
                              }
                            } catch (err: any) {
                              console.error('Failed to update tag:', err);
                              Swal.fire({ title: 'Error', text: err.message || 'Failed to update tag', icon: 'error' });
                            }
                          }
                        });
                      }}
                      className={`inline-block border px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer focus:outline-none transition-all text-center text-center-last ${getTagBadgeStyle(tagText || '')}`}
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value="" className="bg-white text-slate-700 text-center">-- Select Tag --</option>
                      <option value="Hot" className="bg-white text-slate-700 text-center">HOT</option>
                      <option value="Warm" className="bg-white text-slate-700 text-center">WARM</option>
                      <option value="Cold" className="bg-white text-slate-700 text-center">COLD</option>
                      <option value="Qualified" className="bg-white text-slate-700 text-center">QUALIFIED</option>
                      <option value="Dead" className="bg-white text-slate-700 text-center">DEAD / NOT CONNECTED</option>
                    </select>
                  </div>
                </div>

                {/* Communication Actions Button Bar */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCallSimulate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-100 hover:border-transparent cursor-pointer"
                    title="Dial Client"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsAppSimulate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-100 hover:border-transparent cursor-pointer"
                    title="Send WhatsApp Message"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMailClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-indigo-100 hover:border-transparent cursor-pointer"
                    title="Compose Email"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Mail</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-600">
                {/* Centered Customer Bio Header with Decreasing lines */}
                <div className="flex items-center gap-3 w-full my-1">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Customer Bio</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>{mobileNumber}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span className="break-all">{emailAddress}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>{addressText}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>{formattedCreatedDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>Source: {sourceText}</span>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-words leading-normal">{noteText}</span>
                </div>
              </div>

              {/* Requirement Details Header */}
              <div className="flex items-center justify-between w-full pt-4 mt-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Requirement Details</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
              </div>

              {/* Premium, Padded Requirement Details Items */}
              <div className="space-y-3 pt-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <Building className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Project</span>
                    <span className="text-xs font-bold text-slate-800">{projectNameStr || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <Layers className="w-4 h-4 text-teal-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Unit Type</span>
                    <span className="text-xs font-bold text-slate-800">{unitTypeStr || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Budget Range</span>
                    <span className="text-xs font-bold text-slate-800">{budgetStr || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <UserCheck className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Broker</span>
                    <span className="text-xs font-extrabold text-blue-600 block leading-tight">
                      {brokerText || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>


          </div>

          {/* Right Card: Tabs & Details Panel */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col justify-between anim-fade-up stagger-3">
            <div className="flex-1 flex flex-col w-full">
              {/* Tabs Selector */}
              <div className="flex border-b border-slate-100 -mx-6 px-6 overflow-x-auto gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider pb-3.5">
                <button
                  onClick={() => setActiveTab('visits')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'visits' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Visit History
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'notes' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'activity' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-1 transition whitespace-nowrap cursor-pointer ${activeTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-slate-600'}`}
                >
                  Timeline
                </button>
              </div>

              {/* Tab 1: Timeline logs */}
              {activeTab === 'visits' && (
                <div className="pt-6 space-y-5 flex-1 overflow-y-auto max-h-[420px] pr-2">
                  <div className="relative border-l border-slate-100 pl-4 space-y-6 ml-2">
                    {visitTimeline.length > 0 ? (
                      visitTimeline.map((item: any, index: number) => (
                        <div key={item.id || index} className="relative">
                          <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white shadow-xs ${item.isVisit ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-slate-800 block">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block leading-relaxed">
                              {item.description}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              {new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></div>
                          <div className="text-xs space-y-0.5">
                            <span className="font-semibold text-slate-800">Customer registered by channel partner</span>
                            <span className="text-xs text-slate-500 font-medium block">{activeLeadSafe.registeredOn}</span>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></div>
                          <div className="text-xs space-y-0.5">
                            <span className="font-semibold text-slate-800">SMS Verification OTP lock verified</span>
                            <span className="text-xs text-slate-500 font-medium block">{activeLeadSafe.registeredOn}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Timeline */}
              {activeTab === 'timeline' && (
                <div className="pt-6 space-y-5 flex-1 overflow-y-auto max-h-[420px] pr-2">
                  <div className="relative border-l border-slate-100 pl-4 space-y-6 ml-2">
                    {activities.length > 0 ? (
                      activities.map((act: any, index: number) => (
                        <div key={act.id || index} className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white shadow-xs bg-blue-500"></div>
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-slate-800 block">
                              {act.title || act.type}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block leading-relaxed">
                              {act.description}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              {new Date(act.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-400 text-sm font-medium">No activities available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Notes */}
              {activeTab === 'notes' && (
                <div className="pt-6 flex flex-col flex-1 max-h-[420px]">
                  {/* Add Note Form */}
                  <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Type a new note here..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none"
                    ></textarea>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Ringing',
                        'Made a Call with Customer',
                        'Busy / Call back later',
                        'Not Interested',
                        'Wrong Number',
                        'Interested / Visit scheduled'
                      ].map((msg) => (
                        <button
                          key={msg}
                          type="button"
                          onClick={() => setNewNote(msg)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-full text-[10px] font-bold transition cursor-pointer active:scale-95 shadow-sm"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end items-center">
                      <button
                        onClick={handleAddNote}
                        disabled={submittingNote || !newNote.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-lg font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                      >
                        {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Add Note</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes List */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {leadDetails?.notes && leadDetails.notes.length > 0 ? (
                      leadDetails.notes.map((noteItem: any, index: number) => {
                        if (!noteItem) return null;
                        return (
                          <div key={index} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex gap-3 anim-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                              {String(noteItem?.createdByName || noteItem?.created_by || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="font-bold text-xs text-slate-800">{String(noteItem?.createdByName || noteItem?.created_by || 'Unknown User')}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {new Date(noteItem?.created_at || noteItem?.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-1">{noteItem?.note}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-slate-400 text-sm font-medium">No notes available for this lead.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Activity */}
              {activeTab === 'activity' && (
                <div className="pt-6 flex flex-col flex-1 max-h-[420px]">
                  <div className="flex justify-end mb-4 pr-2">
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className="w-8 h-8 flex items-center justify-center bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-full transition-colors cursor-pointer shadow-sm text-lg font-medium leading-none pb-0.5 animate-bounce"
                      title="Create Task"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {/* Tasks List */}
                    {leadDetails?.tasks && leadDetails.tasks.length > 0 ? (
                      <div className="space-y-3">
                        {leadDetails.tasks.map((task: any, index: number) => {
                          const isCompleted = task.status === 2;
                          return (
                            <div key={task.id || index} className={`p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex gap-3 anim-fade-up ${isCompleted ? 'opacity-60' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                              {/* Checkbox */}
                              <div className="pt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  disabled={isCompleted}
                                  onChange={() => !isCompleted && handleToggleTaskStatus(task.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </div>

                              <div className="flex-1 flex flex-col gap-1.5">
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <h4 className={`font-bold text-xs text-slate-800 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                      {task.task_name}
                                    </h4>
                                    {task.note && <p className={`text-[11px] text-slate-500 mt-1 leading-relaxed ${isCompleted ? 'line-through text-slate-400' : ''}`}>{task.note}</p>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isCompleted && (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        Completed
                                      </span>
                                    )}
                                    {task.priority && (
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${task.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                        task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-650 border border-slate-100'
                                        }`}>
                                        {task.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-semibold">
                                  {task.due_date && (
                                    <span>
                                      Due: <strong className="text-slate-650">{new Date(task.due_date).toLocaleDateString([], { dateStyle: 'medium' })}</strong>
                                    </span>
                                  )}
                                  {task.repeat && task.repeat !== 'none' && (
                                    <span>
                                      Repeat: <strong className="text-slate-650 capitalize">{task.repeat}</strong>
                                    </span>
                                  )}
                                  {task.reminder_datetime && (
                                    <span>
                                      Reminder: <strong className="text-blue-600">{new Date(task.reminder_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                                    </span>
                                  )}
                                  {task.createdByName && (
                                    <span className="ml-auto">
                                      By: <strong className="text-slate-650">{task.createdByName}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50 p-8 min-h-[120px]">
                        <p className="text-slate-400 text-sm font-medium">No tasks available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-end mt-auto">
              <span>Last Updated: {lastActivityText}</span>
            </div>
          </div>

        </div>
      )}

      {isBookingModalOpen && (
        <CreateBookingModal
          isOpen={true}
          leadId={activeLeadSafe.id}
          customerName={customerName}
          projectName={projectNameStr !== '-' ? projectNameStr : undefined}
          projectId={leadDetails?.project_id || (typeof leadDetails?.project === 'number' ? leadDetails.project : (Array.isArray(leadDetails?.project) ? Number(leadDetails.project[0]) : undefined))}
          projects={projects}
          onClose={() => setIsBookingModalOpen(false)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {isTaskModalOpen && (
        <CreateTaskModal
          isOpen={true}
          onClose={() => setIsTaskModalOpen(false)}
          leadName={customerName}
          onSubmit={async (data) => {
            try {
              const numericLeadId = Number(selectedLeadId);
              if (!numericLeadId) return;

              let finalDueDate = '';
              if (data.dueDate) {
                finalDueDate = new Date(`${data.dueDate}T18:00:00.000Z`).toISOString();
              }

              let reminderDatetime = undefined;
              if (data.reminder && data.dueDate && data.reminderTime) {
                const dDate = new Date(data.dueDate);
                let daysToSubtract = 0;
                if (data.reminderUnit === 'Day(s)') {
                  daysToSubtract = Number(data.reminderCount);
                } else if (data.reminderUnit === 'Week(s)') {
                  daysToSubtract = Number(data.reminderCount) * 7;
                }
                dDate.setDate(dDate.getDate() - daysToSubtract);
                const dateStr = dDate.toISOString().split('T')[0];
                reminderDatetime = new Date(`${dateStr}T${data.reminderTime}:00.000Z`).toISOString();
              }

              const payload = {
                lead_id: numericLeadId,
                task_name: data.subject,
                note: data.description || '',
                due_date: finalDueDate,
                repeat: data.repeat ? data.repeatType.toLowerCase() : '',
                priority: data.priority,
                remindercreate: data.reminder,
                reminder_datetime: reminderDatetime
              };

              const res = await createLeadTask(payload);
              if (res && res.success) {
                Swal.fire({ title: 'Success', text: 'Task created successfully', icon: 'success', confirmButtonColor: '#1A56DB' });
                setIsTaskModalOpen(false);
              } else {
                Swal.fire({ title: 'Error', text: res?.message || 'Failed to create task', icon: 'error', confirmButtonColor: '#1A56DB' });
              }
            } catch (err) {
              console.error('Error creating task:', err);
              Swal.fire({ title: 'Error', text: 'Failed to create task', icon: 'error', confirmButtonColor: '#1A56DB' });
            }
          }}
        />
      )}
      {/* Create Revisit Modal */}
      {isRevisitModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsRevisitModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar text-emerald-600"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
              <span>Create / Log Revisit</span>
            </h3>

            {/* Customer Summary Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Details</div>
                <div className="font-bold text-base text-slate-900">{customerName}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-xs"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {mobileNumber}</span>
                  {emailAddress && emailAddress !== 'N/A' && (
                    <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-xs"><Mail className="w-3.5 h-3.5 text-blue-500" /> <span className="truncate max-w-[180px]">{emailAddress}</span></span>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex h-12 w-12 rounded-full bg-white border border-slate-100 shadow-sm items-center justify-center shrink-0">
                <span className="font-black text-lg text-blue-600">{customerName ? customerName.charAt(0).toUpperCase() : 'C'}</span>
              </div>
            </div>

            {revisitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold">
                {revisitError}
              </div>
            )}

            <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  if (revisitType !== 'SCHEDULE') {
                    setRevisitType('SCHEDULE');
                    setRevisitDate('');
                    setRevisitTime('');
                    setRevisitPickup(false);
                    setRevisitPickupLocation('');
                    setRevisitError('');
                  }
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${revisitType === 'SCHEDULE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Schedule Future Revisit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (revisitType !== 'COMPLETED') {
                    setRevisitType('COMPLETED');
                    setRevisitDate('');
                    setRevisitTime('');
                    setRevisitPickup(false);
                    setRevisitPickupLocation('');
                    setRevisitError('');
                  }
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${revisitType === 'COMPLETED' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Log Completed Revisit
              </button>
            </div>

            <form onSubmit={handleRevisitSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={revisitDate}
                    onChange={(e) => setRevisitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={revisitTime}
                    onChange={(e) => setRevisitTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revisitPickup}
                    onChange={(e) => setRevisitPickup(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span className="text-sm font-bold text-slate-700">Require Pickup Assistance</span>
                </label>
                {revisitPickup && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Pickup Location</label>
                    <input
                      type="text"
                      placeholder="Enter pickup address"
                      value={revisitPickupLocation}
                      onChange={(e) => setRevisitPickupLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRevisitModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revisitSubmitting}
                  className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all ${revisitType === 'SCHEDULE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                >
                  {revisitSubmitting ? 'Saving...' : (revisitType === 'SCHEDULE' ? 'Schedule Revisit' : 'Log Revisit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditReqModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col transition-all">

            {/* Modal Header */}
            <header className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">Edit Requirement Details</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Update project, unit type, budget and broker info
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditReqModalOpen(false)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition rounded-xl cursor-pointer border border-transparent"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Modal Body / Form */}
            <form onSubmit={handleEditReqSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left">
              {/* Customer Name input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Name (Locked)</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={editCustomerName}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              {/* Number input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Number (Locked)</label>
                <input
                  type="text"
                  placeholder="Enter mobile number"
                  value={editMobileNumber}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
                <input
                  type="email"
                  placeholder="Please enter email address"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Unit Type select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unit Type</label>
                <select
                  value={editUnitType}
                  onChange={(e) => setEditUnitType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Unit Type</option>
                  <option value="1 BHK">1 BHK</option>
                  <option value="2 BHK">2 BHK</option>
                  <option value="3 BHK">3 BHK</option>
                  <option value="4 BHK">4 BHK</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>

              {/* Budget select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Range</label>
                <select
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Budget</option>
                  <option value="50L - 60L">₹50L - ₹60L</option>
                  <option value="60L - 80L">₹60L - ₹80L</option>
                  <option value="80L - 1Cr">₹80L - ₹1Cr</option>
                  <option value="1Cr - 1.2Cr">₹1Cr - ₹1.2Cr</option>
                  <option value="1.2Cr - 1.5Cr">₹1.2Cr - ₹1.5Cr</option>
                  <option value="1.5Cr - 2Cr">₹1.5Cr - ₹2Cr</option>
                  <option value="2Cr - 2.5Cr">₹2Cr - ₹2.5Cr</option>
                  <option value="2.5 Cr - 3 Cr">₹2.5 Cr - ₹3 Cr</option>
                  <option value="3Cr+">₹3Cr+</option>
                </select>
              </div>

              {/* Current Residence input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Residence</label>
                <input
                  type="text"
                  placeholder="e.g. Andheri West, Mumbai"
                  value={editCurrentResidence}
                  onChange={(e) => setEditCurrentResidence(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Purpose of Buying select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purpose of Buying</label>
                <select
                  value={editPurposeOfBuying}
                  onChange={(e) => setEditPurposeOfBuying(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Purpose</option>
                  <option value="Investment">Investment</option>
                  <option value="Self-use">Self-use</option>
                </select>
              </div>

              {/* Expected Booking Duration select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Booking Duration</label>
                <select
                  value={editExpectedDuration}
                  onChange={(e) => setEditExpectedDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Duration</option>
                  <option value="Immediate">Immediate</option>
                  <option value="15 Days">15 Days</option>
                  <option value="1 Month">1 Month</option>
                  <option value="3 Months">3 Months</option>
                </select>
              </div>

              {/* Broker (disabled - locked by default) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Broker (Locked)</label>
                <input
                  type="text"
                  value={brokerText || '—'}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditReqModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dead / Not Connected Reason Modal */}
      <DeadReasonModal
        isOpen={isDeadModalOpen}
        onClose={() => setIsDeadModalOpen(false)}
        leadId={selectedLeadId || ''}
        leadName={customerName}
        onSuccess={async () => {
          if (selectedLeadId) {
            const detailsRes = await getSalesLeadDetails(selectedLeadId);
            if (detailsRes && detailsRes.success && detailsRes.data) {
              setLeadDetails(detailsRes.data);
            }
          }
        }}
      />
    </div>
  );
};
