import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, Layers, Check, ShieldAlert, ClipboardList, History, Bell, Plus, MessageSquare, X, AlertTriangle, Loader2, Building } from 'lucide-react';
import Swal from 'sweetalert2';
import { StatusChangeModal } from '../../StatusChangeModal';
import { ComposeEmailModal } from '../../ComposeEmailModal';
import { createLeadNote, createLeadReminder, getAssignedCallingLeads, getLeadTimeline, updateLeadActionTaken } from '../../../pages/api/registercustomer';
import { mapApiLeadToUiLead } from '../CallingLeadsList';

const mapStatusToActionTaken = (status: string): string => {
  switch (status) {
    case 'Called':
      return 'Called';
    case 'Followup':
    case 'Follow-up':
      return 'Follow-up';
    case 'Visit Scheduled':
      return 'Visit Scheduled';
    case 'Lost':
      return 'Lost';
    case 'Not Interested':
      return 'Not Interested';
    default:
      return 'Called';
  }
};

const formatTimeTo12Hour = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr;
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;
  let [_, hoursStr, minutesStr] = match;
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutesStr} ${ampm}`;
};

const convert12HourTo24Hour = (time12: string) => {
  if (!time12) return '';
  const clean = time12.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) return '';
  let [_, hoursStr, minutesStr, ampm] = match;
  let hours = parseInt(hoursStr, 10);
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutesStr}`;
};

interface Note {
  id: string;
  text: string;
  timestamp: string;
  contactStatus?: 'contacted' | 'not_contacted' | 'whatsapp';
}

interface Reminder {
  id: string;
  dateTime: string;
  text: string;
  completed: boolean;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export const CallingCustomerDetails: React.FC = () => {
  const { leads, setLeads, updateCallingLead, setActiveScreen, projects } = useBrokerConnect();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await getAssignedCallingLeads();
        if (res && res.success && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiLeadToUiLead);
          setLeads(prev => {
            const filtered = prev.filter(l => !mapped.some(ml => ml.id === l.id));
            return [...filtered, ...mapped];
          });
        }
      } catch (err) {
        console.error('Failed to load calling leads in details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [setLeads]);

  // Find the selected lead or default to the first calling lead
  const selectedLeadId = searchParams.get('id');
  const activeLead = leads.find(l => l.id === selectedLeadId) || leads.find(l => ['New', 'Called', 'Followup', 'Visit Scheduled', 'Lost', 'Not Interested'].includes(l.status)) || leads[0];

  // Tab State
  const [activeTab, setActiveTab] = useState<'notes' | 'reminders' | 'activity'>('notes');

  // Form States
  const [unitType, setUnitType] = useState('');
  const [budget, setBudget] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [status, setStatus] = useState<any>('New');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [source, setSource] = useState<'Website' | 'Broker' | 'Facebook' | 'Google' | 'IMPORT'>('Website');
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);

  // Notes & Reminders local persistence states
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [noteContactStatus, setNoteContactStatus] = useState<'contacted' | 'not_contacted' | 'whatsapp'>('not_contacted');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderText, setReminderText] = useState('');
  const [reminderAssignedTo, setReminderAssignedTo] = useState('Self');
  const [reminderSendEmail, setReminderSendEmail] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivityText, setNewActivityText] = useState('');
  const [showActivityConfirm, setShowActivityConfirm] = useState(false);

  const refreshTimeline = (leadIdVal: string | number) => {
    const leadIdStr = String(leadIdVal);
    if (!leadIdStr || leadIdStr.startsWith('L-')) return;
    const numericLeadId = Number(leadIdStr);
    if (isNaN(numericLeadId)) return;

    getLeadTimeline(numericLeadId)
      .then((res) => {
        if (res && res.success && res.data) {
          const mappedNotes: Note[] = (res.data.notes || []).map((n: any) => ({
            id: String(n.id),
            text: n.note,
            timestamp: new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
            contactStatus: n.contact_status === 1 ? 'contacted' : n.contact_status === 2 ? 'whatsapp' : 'not_contacted',
          }));

          const mappedReminders: Reminder[] = (res.data.reminders || []).map((r: any) => {
            const remDate = new Date(r.reminder_datetime);
            const formatted = remDate.toLocaleDateString('en-CA') + ' at ' + remDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return {
              id: String(r.id),
              dateTime: formatted,
              text: r.note,
              completed: r.status === 0,
            };
          });

          const mappedActivities: Activity[] = (res.data.activity_logs || res.data.activityLogs || []).map((l: any) => ({
            id: String(l.id),
            type: l.activityType?.replace(/_/g, ' ') || 'Activity',
            description: l.message,
            timestamp: new Date(l.createdAt || l.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
          }));

          setNotes(mappedNotes);
          setReminders(mappedReminders);
          setActivities(mappedActivities);
        }
      })
      .catch((err) => {
        console.error("Error fetching timeline:", err);
      });
  };

  // Initialize form fields and load states on lead change
  useEffect(() => {
    if (loading || !activeLead) return;

    setUnitType(activeLead.unitType || '');
    setBudget(activeLead.budget || '');
    setVisitDate(activeLead.visitDate || activeLead.expectedDate || '');
    const rawTime = activeLead.followupTime || activeLead.expectedTime || '';
    setVisitTime(convert12HourTo24Hour(rawTime) || rawTime);
    setStatus(activeLead.status);
    setSource(activeLead.source || 'Website');

    const leadId = activeLead.id;

    if (leadId.startsWith('L-')) {
      // 1. Mock Notes load
      const storedNotes = localStorage.getItem(`notes_${leadId}`);
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      } else {
        let initNotes: Note[] = [];
        if (leadId === 'L-107') {
          initNotes = [{
            id: 'n1',
            text: 'Client wants high rise apartment. Prefers higher floor to avoid road noise.',
            timestamp: '11 Jun 2026, 02:15 PM'
          }];
        } else if (leadId === 'L-108') {
          initNotes = [{
            id: 'n2',
            text: 'Highly interested in commercial spaces. Broker Neha indicated budget is flexible.',
            timestamp: '10 Jun 2026, 03:00 PM'
          }];
        }
        setNotes(initNotes);
        localStorage.setItem(`notes_${leadId}`, JSON.stringify(initNotes));
      }

      // 2. Mock Reminders load
      const storedReminders = localStorage.getItem(`reminders_${leadId}`);
      if (storedReminders) {
        setReminders(JSON.parse(storedReminders));
      } else {
        let initReminders: Reminder[] = [];
        if (leadId === 'L-107') {
          initReminders = [{
            id: 'r1',
            dateTime: '2026-06-20 at 03:00 PM',
            text: 'Call back to confirm 3 BHK budget range choice',
            completed: false
          }];
        }
        setReminders(initReminders);
        localStorage.setItem(`reminders_${leadId}`, JSON.stringify(initReminders));
      }

      // 3. Mock Activities load
      const storedActivities = localStorage.getItem(`activities_${leadId}`);
      if (storedActivities) {
        setActivities(JSON.parse(storedActivities));
      } else {
        let initActivities: Activity[] = [];
        if (leadId === 'L-106') {
          initActivities = [
            { id: 'a1', type: 'Registration', description: 'Lead registered by Broker Amit Patel', timestamp: '10 Jun 2026, 10:00 AM' }
          ];
        } else if (leadId === 'L-107') {
          initActivities = [
            { id: 'a1', type: 'Registration', description: 'Lead registered by Broker Kiran Desai', timestamp: '09 Jun 2026, 11:30 AM' },
            { id: 'a2', type: 'Call Outcome', description: 'Contact made. Outcome: Requested callback on June 20', timestamp: '11 Jun 2026, 02:15 PM' },
            { id: 'a3', type: 'Stage Update', description: 'Calling Stage updated to Followup', timestamp: '11 Jun 2026, 02:16 PM' }
          ];
        } else if (leadId === 'L-108') {
          initActivities = [
            { id: 'a1', type: 'Registration', description: 'Lead registered by Broker Neha Gupta', timestamp: '08 Jun 2026, 09:00 AM' },
            { id: 'a2', type: 'Call Outcome', description: 'Outcome: Scheduled site visit for June 22', timestamp: '10 Jun 2026, 03:00 PM' },
            { id: 'a3', type: 'Allocation', description: 'Executive B assigned for visit accompaniment', timestamp: '10 Jun 2026, 03:05 PM' },
            { id: 'a4', type: 'Stage Update', description: 'Calling Stage updated to Visit Scheduled', timestamp: '10 Jun 2026, 03:05 PM' }
          ];
        } else {
          initActivities = [
            { id: 'a1', type: 'Registration', description: `Lead registered by Broker ${activeLead.brokerName}`, timestamp: '11 Jun 2026, 09:00 AM' }
          ];
        }
        setActivities(initActivities);
        localStorage.setItem(`activities_${leadId}`, JSON.stringify(initActivities));
      }
    } else {
      // Real API Lead: Fetch from server!
      refreshTimeline(activeLead.leadDetailsId || leadId);
    }
  }, [loading, activeLead]);

  const maskEmail = (email?: string) => {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : local[0] + '***';
    const maskedDomain = domain.length > 3 ? domain[0] + '***' + domain.slice(-2) : domain;
    return `${maskedLocal}@${maskedDomain}`;
  };

  const maskMobile = (mobile?: string) => {
    if (!mobile) return 'N/A';
    const clean = mobile.replace(/\s+/g, '');
    if (clean.length < 6) return '******';
    return clean.slice(0, 2) + '******' + clean.slice(-2);
  };

  if (!activeLead) {
    return <div className="p-8 text-center text-slate-400">Loading customer details...</div>;
  }

  const isLocked = activeLead.status === 'Visit Scheduled';

  const handleCallSimulate = () => {
    Swal.fire({
      title: 'Connecting Call...',
      html: `Dialing masked secure gateway connection for client <strong class="text-blue-600">${activeLead.name}</strong>.<br/><br/><small class="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Recording session active</small>`,
      icon: 'info',
      confirmButtonText: 'End Call',
      confirmButtonColor: '#EF4444',
      timer: 8000,
      timerProgressBar: true
    });
  };

  const handleWhatsAppSimulate = () => {
    const cleanPhone = activeLead.mobile.replace(/\s+/g, '');
    const phoneForWa = cleanPhone.startsWith('+') ? cleanPhone : '+91' + cleanPhone;

    Swal.fire({
      title: 'Send WhatsApp Message',
      input: 'textarea',
      inputLabel: `Compose message for ${activeLead.name}`,
      inputValue: `Hello ${activeLead.name}, `,
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
        
        const newAct: Activity = {
          id: `a_${Date.now()}`,
          type: 'WhatsApp Sent',
          description: `Sent WhatsApp to ${activeLead.mobile} | Message: "${text.length > 60 ? text.slice(0, 60) + '...' : text}"`,
          timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        };
        const updatedAct = [newAct, ...activities];
        setActivities(updatedAct);
        localStorage.setItem(`activities_${activeLead.id}`, JSON.stringify(updatedAct));
      }
    });
  };

  const handleMailClick = () => {
    setIsMailModalOpen(true);
  };

  const handleSendEmail = (data: { subject: string; body: string; attachments: File[] }) => {
    // 1. Create activity log
    const filesList = data.attachments.length > 0 ? ` (Attached: ${data.attachments.map(f => f.name).join(', ')})` : '';
    const newAct: Activity = {
      id: `a_${Date.now()}`,
      type: 'Email Sent',
      description: `Sent email to ${activeLead.email} | Subject: "${data.subject}"${filesList}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    const updatedAct = [newAct, ...activities];
    setActivities(updatedAct);
    localStorage.setItem(`activities_${activeLead.id}`, JSON.stringify(updatedAct));

    setIsMailModalOpen(false);

    Swal.fire({
      title: 'Email Sent!',
      text: `Your message has been dispatched to ${activeLead.name} successfully.`,
      icon: 'success',
      confirmButtonColor: '#F97316',
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    // If status has changed, open the StatusChangeModal instead of saving directly!
    if (status !== activeLead.status) {
      setIsStatusModalOpen(true);
      return;
    }

    // Save directly since status did not change
    updateCallingLead(activeLead.id, {
      unitType,
      budget,
      expectedDate: visitDate || activeLead.expectedDate || '',
      visitDate: visitDate || activeLead.visitDate,
      expectedTime: formatTimeTo12Hour(visitTime) || activeLead.expectedTime,
      followupTime: formatTimeTo12Hour(visitTime) || activeLead.followupTime,
      status,
      source,
    });

    Swal.fire({
      title: 'Lead Updated!',
      text: 'Lead interest details updated successfully.',
      icon: 'success',
      confirmButtonColor: '#F97316',
    });
  };

  const handleConfirmStatusChange = (data: {
    notes: string;
    visitDate?: string;
    visitTime?: string;
    pickupRequired?: 'Yes' | 'No';
    pickupPoint?: string;
    projects?: string[];
    unitTypes?: string[];
    budget?: string;
    expectedBookingDuration?: string;
  }) => {
    const updatedProject = data.projects ? data.projects.join(', ') : activeLead.project;
    const filteredUnitTypes = data.unitTypes ? data.unitTypes.filter((ut: string) => ut.trim().toLowerCase() !== 'any config') : [];
    const updatedUnitType = data.unitTypes ? filteredUnitTypes.join(', ') : (activeLead.unitType && activeLead.unitType.toLowerCase() !== 'any config' ? activeLead.unitType : '');
    const updatedBudget = data.budget || activeLead.budget;
    const updatedExpectedBookingDuration = data.expectedBookingDuration || activeLead.expectedBookingDuration;

    // 1. Save notes to local storage
    const newNote: Note = {
      id: `n_${Date.now()}`,
      text: data.notes,
      timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${activeLead.id}`, JSON.stringify(updatedNotes));

    // 2. Save activity to local storage
    let actDesc = `Calling Stage updated from ${activeLead.status} to ${status}. Note: ${data.notes}`;
    if (status === 'Visit Scheduled') {
      actDesc += ` | Visit Date: ${data.visitDate} at ${data.visitTime} | Pickup: ${data.pickupRequired}${data.pickupRequired === 'Yes' ? ` (Point: ${data.pickupPoint})` : ''}`;
      if (data.projects) actDesc += ` | Projects: ${updatedProject}`;
      if (data.unitTypes) actDesc += ` | Unit Types: ${updatedUnitType}`;
      if (data.budget) actDesc += ` | Budget: ${updatedBudget}`;
      if (data.expectedBookingDuration) actDesc += ` | Duration: ${updatedExpectedBookingDuration}`;
    }
    const newAct: Activity = {
      id: `a_${Date.now()}`,
      type: 'Stage Update',
      description: actDesc,
      timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    const updatedAct = [newAct, ...activities];
    setActivities(updatedAct);
    localStorage.setItem(`activities_${activeLead.id}`, JSON.stringify(updatedAct));

    // Update form local states if changed via modal (in case of 'Visit Scheduled')
    if (status === 'Visit Scheduled') {
      if (data.visitDate) setVisitDate(data.visitDate);
      if (data.visitTime) setVisitTime(convert12HourTo24Hour(data.visitTime) || data.visitTime);
      if (data.unitTypes) setUnitType(updatedUnitType);
      if (data.budget) setBudget(updatedBudget);
    }

    // 3. Save everything to context
    updateCallingLead(activeLead.id, {
      project: updatedProject,
      unitType: updatedUnitType,
      budget: updatedBudget,
      expectedBookingDuration: updatedExpectedBookingDuration,
      expectedDate: data.visitDate || visitDate || activeLead.expectedDate || '',
      visitDate: data.visitDate || visitDate || activeLead.visitDate,
      expectedTime: data.visitTime || visitTime || activeLead.expectedTime,
      followupTime: data.visitTime || visitTime || activeLead.followupTime,
      status,
      pickupRequired: data.pickupRequired,
      pickupPoint: data.pickupPoint,
      additionalNotes: data.notes,
      source,
    });

    const allocationId = activeLead.id.startsWith('L-') ? 0 : Number(activeLead.id);
    if (allocationId > 0) {
      const actionTaken = mapStatusToActionTaken(status);
      const payload: any = {
        action_taken: actionTaken,
        note: data.notes
      };
      if (actionTaken === 'Visit Scheduled') {
        payload.visit_date = data.visitDate || '';
        let timeVal = data.visitTime || '';
        if (timeVal) {
          if (timeVal.toUpperCase().includes('AM') || timeVal.toUpperCase().includes('PM')) {
            timeVal = convert12HourTo24Hour(timeVal);
          }
          if (timeVal.length > 5) {
            timeVal = timeVal.substring(0, 5);
          }
        }
        payload.visit_time = timeVal;
        payload.pickup = data.pickupRequired === 'Yes' ? 1 : 0;
        payload.pickup_location = data.pickupPoint || '';
        const selectedProjectIds = (data.projects || [])
          .map(name => projects.find(p => p.name === name)?.id)
          .filter(Boolean);
        payload.project = selectedProjectIds.join(', ');
        payload.unit_type = filteredUnitTypes.join(', ');
        payload.budget = data.budget || '';
        let durationVal = data.expectedBookingDuration || '';
        if (durationVal.includes(' ')) {
          durationVal = durationVal.split(' ')[0];
        }
        payload.expected_booking_duration = durationVal;
      }

      updateLeadActionTaken(allocationId, payload)
        .then((res) => {
          if (res && res.success) {
            refreshTimeline(activeLead.leadDetailsId || activeLead.id);
          }
        })
        .catch((err) => {
          console.error("Failed to update status on server:", err);
        });
    }

    setIsStatusModalOpen(false);

    Swal.fire({
      title: 'Lead Updated!',
      text: 'Lead status and requirements updated successfully.',
      icon: 'success',
      confirmButtonColor: '#F97316',
    });
  };

  const handleCancelStatusChange = () => {
    setStatus(activeLead.status);
    setIsStatusModalOpen(false);
  };

  const handleBack = () => {
    localStorage.removeItem('selectedLeadId');
    navigate('/calling/leads');
  };

  // Add Note Handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    Swal.fire({
      title: 'Save New Note?',
      text: 'Are you sure you want to add this note to the client log?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A56DB',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, Save Note',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        const newNote: Note = {
          id: `n_${Date.now()}`,
          text: newNoteText,
          timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
          contactStatus: noteContactStatus
        };

        const payload = {
          lead_id: activeLead.leadDetailsId || (activeLead.id.startsWith('L-') ? (Number(activeLead.id.replace(/\D/g, '')) || 0) : Number(activeLead.id)),
          note: newNoteText,
          contact_status: noteContactStatus === 'contacted' ? 1 : noteContactStatus === 'whatsapp' ? 2 : 0,
        };

        createLeadNote(payload)
          .then((res) => {
            if (res && res.success) {
              refreshTimeline(activeLead.leadDetailsId || activeLead.id);
            } else {
              console.warn("Server failed to save note. Saved locally.", res?.message);
            }
          })
          .catch((err) => {
            console.error("Error creating note on server:", err);
          });

        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        localStorage.setItem(`notes_${activeLead.id}`, JSON.stringify(updatedNotes));
        setNewNoteText('');
        setNoteContactStatus('not_contacted');
        setIsAddNoteModalOpen(false);

        // Activity Log
        const newAct: Activity = {
          id: `a_${Date.now()}`,
          type: 'Note Added',
          description: `Note added: "${newNote.text.slice(0, 30)}..."`,
          timestamp: newNote.timestamp
        };
        const updatedAct = [newAct, ...activities];
        setActivities(updatedAct);
        localStorage.setItem(`activities_${activeLead.id}`, JSON.stringify(updatedAct));

        Swal.fire({
          title: 'Note Added!',
          text: 'The note has been logged to the lead record.',
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
      }
    });
  };

  // Add Reminder Handler
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderText.trim() || !reminderDate) return;

    Swal.fire({
      title: 'Set Lead Reminder?',
      text: 'Are you sure you want to schedule this reminder?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A56DB',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, Set Reminder',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        const formattedTime = reminderTime ? ` at ${reminderTime}` : '';
        const newReminder: Reminder = {
          id: `r_${Date.now()}`,
          dateTime: `${reminderDate}${formattedTime}`,
          text: reminderText,
          completed: false
        };

        const dateTimeString = reminderTime ? `${reminderDate}T${reminderTime}:00` : `${reminderDate}T00:00:00`;
        let isoDateTime = '';
        try {
          isoDateTime = new Date(dateTimeString).toISOString();
        } catch (err) {
          isoDateTime = new Date().toISOString();
        }

        const payload = {
          lead_id: activeLead.leadDetailsId || (activeLead.id.startsWith('L-') ? (Number(activeLead.id.replace(/\D/g, '')) || 0) : Number(activeLead.id)),
          reminder_datetime: isoDateTime,
          note: reminderText,
        };

        createLeadReminder(payload)
          .then((res) => {
            if (res && res.success) {
              refreshTimeline(activeLead.leadDetailsId || activeLead.id);
            } else {
              console.warn("Server failed to save reminder. Saved locally.", res?.message);
            }
          })
          .catch((err) => {
            console.error("Error creating reminder on server:", err);
          });

        const updatedReminders = [newReminder, ...reminders];
        setReminders(updatedReminders);
        localStorage.setItem(`reminders_${activeLead.id}`, JSON.stringify(updatedReminders));
        setReminderText('');
        setReminderDate('');
        setReminderTime('');
        setIsAddReminderModalOpen(false);

        // Activity Log
        const newAct: Activity = {
          id: `a_${Date.now()}`,
          type: 'Reminder Set',
          description: `Reminder scheduled: "${newReminder.text}" for ${newReminder.dateTime}`,
          timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        };
        const updatedAct = [newAct, ...activities];
        setActivities(updatedAct);
        localStorage.setItem(`activities_${activeLead.id}`, JSON.stringify(updatedAct));

        Swal.fire({
          title: 'Reminder Set!',
          text: 'The reminder has been successfully scheduled.',
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
      }
    });
  };

  const handleToggleReminder = (id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        const nextState = !r.completed;
        if (nextState) {
          // Log Completion Activity
          const newAct: Activity = {
            id: `a_${Date.now()}`,
            type: 'Reminder Completed',
            description: `Reminder marked completed: "${r.text}"`,
            timestamp: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
          };
          setActivities(prev => [newAct, ...prev]);
        }
        return { ...r, completed: nextState };
      }
      return r;
    });
    setReminders(updated);
    localStorage.setItem(`reminders_${activeLead.id}`, JSON.stringify(updated));
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Called':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Followup':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Visit Scheduled':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Lost':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Not Interested':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[450px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-slate-500 font-semibold text-sm">Loading client CRM profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer border border-transparent"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Client CRM Requirement Card</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Calling Desk &gt; Leads Workspace &gt; Inside View
            </p>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2 anim-fade-up">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>This lead's visit has been scheduled. Further updates are locked.</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lead Information Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col gap-6 lg:h-[calc(100vh-240px)] lg:min-h-[500px] anim-fade-up stagger-1">
          <div className="text-center space-y-3 pb-6 border-b border-slate-100/60">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-400 text-white rounded-full flex items-center justify-center text-2xl font-black shadow-md">
              {activeLead.name.charAt(0)}
            </div>

            <div className="space-y-0.5">
              <h3 className="text-base font-extrabold text-[#0F172A]">{activeLead.name}</h3>
              <span className={`inline-block border px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStageBadgeColor(activeLead.status)}`}>
                {activeLead.status === 'Followup' ? 'Follow-up' : activeLead.status}
              </span>
            </div>

            {/* Communication Actions Button Bar */}
            <div className="flex items-center justify-center gap-2 pt-2.5">
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
              <span>{activeLead.mobile || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <span className="break-all">{activeLead.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <span>{activeLead.city || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-3">
              <ClipboardList className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <span>Source: <strong className="text-slate-700 font-bold">{activeLead.source || 'Website'}</strong></span>
            </div>

            {/* Centered Looking For Header with Decreasing lines */}
            <div className="flex items-center gap-3 w-full pt-4 mt-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Looking For</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200" />
            </div>

            {/* Premium, Padded Looking For Items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <Building className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Project</span>
                  <span className="text-xs font-bold text-slate-800">{activeLead.project || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <Layers className="w-4 h-4 text-teal-500 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Unit Type</span>
                  <span className="text-xs font-bold text-slate-800">{activeLead.unitType || 'Any Config'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Budget Range</span>
                  <span className="text-xs font-bold text-slate-800">{activeLead.budget || 'Any Range'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tab Panels for Requirements, Notes, Timelines */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden anim-fade-up stagger-2 lg:h-[calc(100vh-240px)] lg:min-h-[500px]">
          {/* Tab Selector Header */}
          <div className="flex bg-slate-50 border-b border-slate-100 p-1">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-transparent ${activeTab === 'notes'
                ? 'bg-white text-slate-900 shadow-sm border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Notes</span>
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-transparent ${activeTab === 'reminders'
                ? 'bg-white text-slate-900 shadow-sm border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Bell className="w-4 h-4" />
              <span>Reminders</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-transparent ${activeTab === 'activity'
                ? 'bg-white text-slate-900 shadow-sm border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <History className="w-4 h-4" />
              <span>Activity Timeline</span>
            </button>
          </div>

          {/* Tab Core Workspace */}
          <div className="p-6 sm:p-8 flex-1 flex flex-col min-h-0">

            {/* Tab 1: Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Header & Add Button */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Past Notes</span>
                  <button
                    type="button"
                    onClick={() => setIsAddNoteModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>
                </div>

                {/* Past Notes List */}
                {notes.length > 0 ? (
                  <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
                    {notes.map(note => (
                      <div key={note.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${note.contactStatus === 'contacted'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : note.contactStatus === 'whatsapp' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500'
                            }`}>
                            {note.contactStatus === 'contacted' ? 'In Touch' : note.contactStatus === 'whatsapp' ? 'Whatsapp' : 'Not Contacted'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">{note.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{note.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                    <span className="text-xs font-medium">No notes logged yet.</span>
                    <span className="text-[10px] text-slate-450 mt-1">Click the "Add Note" button to add a new record.</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Reminders */}
            {activeTab === 'reminders' && (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Header & Add Button */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Reminders</span>
                  <button
                    type="button"
                    onClick={() => setIsAddReminderModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Reminder</span>
                  </button>
                </div>

                {/* Past Reminders Table */}
                {reminders.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-12 text-center">Status</th>
                          <th className="py-2.5 px-3 w-40">Date & Time</th>
                          <th className="py-2.5 px-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-medium text-slate-700">
                        {reminders.map(rem => (
                          <tr key={rem.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={rem.completed}
                                onChange={() => handleToggleReminder(rem.id)}
                                className="w-4 h-4 rounded text-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {rem.dateTime}
                            </td>
                            <td className={`py-3 px-3 ${rem.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {rem.text}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Bell className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                    <span className="text-xs font-medium">No reminders set yet.</span>
                    <span className="text-[10px] text-slate-450 mt-1">Click the "Add Reminder" button to schedule one.</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Activity Logs */}
            {activeTab === 'activity' && (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Timeline */}
                <div className="relative pl-8 space-y-6 flex-1 overflow-y-auto pr-1 min-h-0">
                  {/* Vertical bar */}
                  <div className="absolute left-[14px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

                  {activities.length === 0 && (
                    <p className="text-xs text-slate-400 italic pl-2">No activity recorded yet for this lead.</p>
                  )}

                  {activities.map(act => (
                    <div key={act.id} className="relative flex flex-col gap-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-100 shrink-0"></span>

                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black text-slate-850">{act.type}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{act.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{act.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {isStatusModalOpen && (
        <StatusChangeModal
          isOpen={true}
          leadId={activeLead.id}
          leadName={activeLead.name}
          currentStatus={activeLead.status}
          targetStatus={status}
          onClose={handleCancelStatusChange}
          onConfirm={handleConfirmStatusChange}
          initialProjects={activeLead.project ? activeLead.project.split(',').map(p => p.trim()) : []}
          initialUnitTypes={activeLead.unitType ? activeLead.unitType.split(',').map(ut => ut.trim()) : []}
          initialBudget={activeLead.budget}
          initialExpectedBookingDuration={activeLead.expectedBookingDuration || ''}
        />
      )}

      {isMailModalOpen && (
        <ComposeEmailModal
          isOpen={true}
          leadName={activeLead.name}
          leadEmail={activeLead.email || ''}
          onClose={() => setIsMailModalOpen(false)}
          onSend={handleSendEmail}
        />
      )}

      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 anim-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-[0_24px_60px_rgba(10,22,40,0.25)] anim-scale-in overflow-hidden text-left">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0A1628] to-[#1A56DB] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <ClipboardList className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Add New Note</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddNoteModalOpen(false);
                  setNewNoteText('');
                  setNoteContactStatus('not_contacted');
                }}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNote}>
              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Note Content <span className="text-red-500 ml-0.5">*</span></label>
                  <textarea
                    placeholder="Write note details here..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none text-slate-700"
                    rows={5}
                    required
                  />
                </div>

                {/* Contact Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-650 block">Contact Status</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="modalContactStatus"
                        value="contacted"
                        checked={noteContactStatus === 'contacted'}
                        onChange={() => setNoteContactStatus('contacted')}
                        className="w-4 h-4 text-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-sm text-slate-600">I got in touch with this lead</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="modalContactStatus"
                        value="not_contacted"
                        checked={noteContactStatus === 'not_contacted'}
                        onChange={() => setNoteContactStatus('not_contacted')}
                        className="w-4 h-4 text-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-sm text-slate-600">I have not contacted this lead</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="modalContactStatus"
                        value="whatsapp"
                        checked={noteContactStatus === 'whatsapp'}
                        onChange={() => setNoteContactStatus('whatsapp')}
                        className="w-4 h-4 text-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-sm text-slate-600">Follow up through whatsapp</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 pb-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddNoteModalOpen(false);
                    setNewNoteText('');
                    setNoteContactStatus('not_contacted');
                  }}
                  className="px-5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddReminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 anim-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-[0_24px_60px_rgba(10,22,40,0.25)] anim-scale-in overflow-hidden text-left">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0A1628] to-[#1A56DB] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Set Lead Reminder</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddReminderModalOpen(false);
                  setReminderDate('');
                  setReminderTime('');
                  setReminderText('');
                  setReminderAssignedTo('Self');
                  setReminderSendEmail(false);
                }}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddReminder}>
              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Date and Time row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">
                      <span className="text-red-500 mr-0.5">*</span>Date
                    </label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Time</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                {/* Set reminder to */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    <span className="text-red-500 mr-0.5">*</span>Set reminder to
                  </label>
                  <select
                    value={reminderAssignedTo}
                    onChange={(e) => setReminderAssignedTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition cursor-pointer"
                  >
                    <option value="Self">Self</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="All Team">All Team</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">
                    <span className="text-red-500 mr-0.5">*</span>Description
                  </label>
                  <textarea
                    placeholder="Enter reminder description..."
                    value={reminderText}
                    onChange={(e) => setReminderText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none"
                    rows={4}
                    required
                  />
                </div>

                {/* Send email checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderSendEmail}
                    onChange={(e) => setReminderSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500 border-slate-350 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600">Send also an email for this reminder</span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="px-6 pb-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddReminderModalOpen(false);
                    setReminderDate('');
                    setReminderTime('');
                    setReminderText('');
                    setReminderAssignedTo('Self');
                    setReminderSendEmail(false);
                  }}
                  className="px-5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
