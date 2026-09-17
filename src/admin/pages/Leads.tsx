import React, { useState, useEffect, useRef } from 'react';
import { CustomSelect } from '../../components/CustomSelect';

import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { Search,
  Building,
  Calendar,
  ShieldCheck,
  Loader2,
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  FileUp,
  ChevronLeft,
  User,
  Download,
  ChevronDown,
  Check,
  Phone,
  Mail,
  Edit2,
  Clock,
  Target,
  Fingerprint,
  Share2,
  UserCheck,
  ChevronRight,
  ArrowRight,
  ClipboardList,
  SlidersHorizontal,
  Plus,
  UserPlus, Repeat, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; // XLSX helper for bulk import/export
import { getLeads, importLeadsBulk, STAGE_LABELS, STAGE_COLORS, softDeleteLead, bulkSoftDeleteLeads } from '../../broker/services/leads.service';
import { getProjectsDropdownList } from '../../pages/api/projects';
import { useNavigate, useParams } from 'react-router-dom';
import { getSalesLeadDetails, createReceptionistCustomer, createLeadWithCustomer, getReceptionistBrokers, reassignVisitor, type CreateReceptionistCustomerPayload, transferLeadVisitAllocation, addSalesLeadNote, createLeadReminder, createLeadTask } from '../../pages/api/registercustomer';
import axiosClient from '../../../axiosinstance';
import { formatDateDDMMYYYY } from '../../components/helper/dateFormatter';
import { getUsers } from '../api/users';
import Cookies from 'js-cookie';
import { BulkImportLeadsModal } from '../../components/screens/LeadsManagement/BulkImportLeadsModal';
import { useSalesUsersQuery } from '../../hooks/useSharedQueries';
import { useLeadsQuery } from '../../hooks/useLeadsQueries';

const getStageTextColor = (stage: number) => {
  switch (stage) {
    case -1: return 'text-amber-600';
    case 0: return 'text-indigo-600';
    case 1: return 'text-blue-600';
    case 2: return 'text-sky-605';
    case 3: return 'text-purple-600';
    case 4: return 'text-emerald-600';
    default: return 'text-slate-600';
  }
};

const getActivityConfig = (type: string) => {
  const t = type.toUpperCase().replace(/\s+/g, '_');
  if (t.includes('COMPLETED') || t.includes('BOOKED')) {
    return {
      Icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    };
  }
  if (t.includes('CHECK_IN') || t.includes('VISITED')) {
    return {
      Icon: UserCheck,
      color: 'text-blue-600 bg-blue-50 border-blue-100'
    };
  }
  if (t.includes('ALLOTMENT') || t.includes('ASSIGN')) {
    return {
      Icon: UserCheck,
      color: 'text-purple-600 bg-purple-50 border-purple-100'
    };
  }
  if (t.includes('CREATED') || t.includes('REGISTER')) {
    return {
      Icon: User,
      color: 'text-slate-600 bg-slate-50 border-slate-100'
    };
  }
  if (t.includes('NOTE') || t.includes('COMMENT')) {
    return {
      Icon: ClipboardList,
      color: 'text-amber-600 bg-amber-50 border-amber-100'
    };
  }
  return {
    Icon: Clock,
    color: 'text-sky-600 bg-sky-50 border-sky-100'
  };
};

const mapDateFilterToApi = (type: string): string => {
  switch (type) {
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'year': return 'This Year';
    case 'custom': return 'Custom Date';
    default: return '';
  }
};

// CSV processing helpers to map fields present in the file for successful backend de-serialization
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(cell => cell.trim().replace(/^["']|["']$/g, ''));
};

const serializeCsvLine = (cells: string[]): string => {
  return cells.map(cell => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }).join(',');
};

const processCsvFile = async (file: File): Promise<File> => {
  if (!file.name.endsWith('.csv')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        if (!text) {
          resolve(file);
          return;
        }

        const lines = text.split('\n');
        if (lines.length === 0) {
          resolve(file);
          return;
        }

        const rawHeaders = parseCsvLine(lines[0]);

        const nameIdx = rawHeaders.findIndex(h => {
          const lh = h.toLowerCase();
          return lh === 'name' || lh === 'full name' || lh === 'customer name';
        });

        const contactIdx = rawHeaders.findIndex(h => {
          const lh = h.toLowerCase();
          return lh === 'contact' || lh === 'contact number' || lh === 'mobile' || lh === 'mobile number' || lh === 'phone';
        });

        const emailIdx = rawHeaders.findIndex(h => h.toLowerCase() === 'email');

        const otherIdx = rawHeaders.findIndex(h => {
          const lh = h.toLowerCase();
          return lh === 'other details' || lh === 'other_details' || lh === 'remarks' || lh === 'notes' || lh === 'description';
        });

        const additionalHeaders: { name: string; sourceIdx: number }[] = [];

        if (nameIdx !== -1) {
          if (!rawHeaders.includes('customer_name')) additionalHeaders.push({ name: 'customer_name', sourceIdx: nameIdx });
          if (!rawHeaders.includes('name')) additionalHeaders.push({ name: 'name', sourceIdx: nameIdx });
        }

        if (contactIdx !== -1) {
          if (!rawHeaders.includes('mobile_number')) additionalHeaders.push({ name: 'mobile_number', sourceIdx: contactIdx });
          if (!rawHeaders.includes('mobile')) additionalHeaders.push({ name: 'mobile', sourceIdx: contactIdx });
          if (!rawHeaders.includes('contact')) additionalHeaders.push({ name: 'contact', sourceIdx: contactIdx });
        }

        if (emailIdx !== -1) {
          if (!rawHeaders.includes('email')) additionalHeaders.push({ name: 'email', sourceIdx: emailIdx });
        }

        if (otherIdx !== -1) {
          if (!rawHeaders.includes('other_details')) additionalHeaders.push({ name: 'other_details', sourceIdx: otherIdx });
          if (!rawHeaders.includes('remarks')) additionalHeaders.push({ name: 'remarks', sourceIdx: otherIdx });
          if (!rawHeaders.includes('description')) additionalHeaders.push({ name: 'description', sourceIdx: otherIdx });
        }

        const outputLines: string[] = [];
        const finalHeaders = [...rawHeaders, ...additionalHeaders.map(ah => ah.name)];
        outputLines.push(serializeCsvLine(finalHeaders));

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cells = parseCsvLine(line);
          while (cells.length < rawHeaders.length) {
            cells.push('');
          }

          for (const ah of additionalHeaders) {
            const val = cells[ah.sourceIdx] || '';
            cells.push(val);
          }

          outputLines.push(serializeCsvLine(cells));
        }

        const newContent = outputLines.join('\n');
        const newFile = new File([newContent], file.name, { type: file.type });
        resolve(newFile);
      } catch (e) {
        console.error('Error processing CSV headers:', e);
        resolve(file);
      }
    };
    reader.onerror = () => {
      resolve(file);
    };
    reader.readAsText(file);
  });
};

export const LeadsPage: React.FC = () => {
  const { projects, brokers, selectedProjectId, setSelectedProjectId } = useBrokerConnect();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const downloadSampleCSV = () => {
    const headers = ['Name', 'Contact', 'Email', 'Other Details'];
    const rows = [
      ['Rahul Sharma', '9999999999', 'rahul@example.com', 'Interested in Bandra West 2BHK flat'],
      ['Priya Patel', '9888877777', 'priya@example.com', 'Wants ready to move projects in Mumbai'],
      ['Amit Verma', '9777766666', 'amit@example.com', 'Looking for commercial shops']
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_enquiries.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search & Loading States
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('admin_leads_searchTerm') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => localStorage.getItem('admin_leads_searchTerm') || '');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('admin_leads_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('admin_leads_itemsPerPage')) || 10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Smart Filters states
  const [selectedProject, setSelectedProject] = useState(() => {
    const globalId = typeof window !== 'undefined' ? (localStorage.getItem('selectedProjectId') || Cookies.get('selectedProjectId')) : null;
    if (globalId && globalId !== 'null' && globalId !== 'undefined' && globalId !== '') {
      return String(globalId);
    }
    return (typeof window !== 'undefined' ? localStorage.getItem('admin_leads_selectedProject') : '') || '';
  });
  const [selectedStage, setSelectedStage] = useState(() => localStorage.getItem('admin_leads_selectedStage') || '');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const stageDropdownRef = useRef<HTMLDivElement>(null);
  const pendingNavigation = useRef<'first' | 'last' | null>(null);

  const [selectedAssigned, setSelectedAssigned] = useState('');
  const [dateFilterType, setDateFilterType] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferExecutive, setSelectedTransferExecutive] = useState<number | ''>('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Soft Delete Lead Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const handleDeleteLead = async () => {
    const leadIdToDelete = selectedLead?.id || id;
    if (!leadIdToDelete) return;

    setIsDeletingLead(true);
    try {
      const res = await softDeleteLead(leadIdToDelete);
      if (res && res.success !== false) {
        setIsDeleteModalOpen(false);

        // Optimistically remove the deleted lead from current state immediately
        setLeads((prevLeads) => prevLeads.filter((l) => String(l.id) !== String(leadIdToDelete)));
        setTotalItems((prev) => Math.max(0, prev - 1));
        setSelectedLead(null);
        localStorage.removeItem('selectedAdminLeadName');

        // Navigate back to the active leads table
        navigate('/admin/leads');

        // Immediately refetch latest leads from server
        fetchLeads(
          debouncedSearchTerm,
          currentPage,
          itemsPerPage,
          selectedProject,
          selectedStage,
          {
            source: selectedSource,
            tag: selectedTag,
            dateFilterType: dateFilterType,
            customStartDate: customStartDate,
            customEndDate: customEndDate,
            assignedExecutive: selectedAssigned,
          }
        );

        Swal.fire({
          title: 'Deleted!',
          text: res.message || 'Lead, associated visits, visit allocations, and bookings soft deleted successfully',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: 'Failed to Delete',
          text: res?.message || 'Failed to delete lead.',
          icon: 'error',
        });
      }
    } catch (err: any) {
      console.error('Failed to delete lead:', err);
      Swal.fire({
        title: 'Error',
        text: err?.response?.data?.message || err.message || 'An error occurred while deleting the lead.',
        icon: 'error',
      });
    } finally {
      setIsDeletingLead(false);
    }
  };

  // Bulk Soft Delete Leads states
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isFetchingAllLeadIds, setIsFetchingAllLeadIds] = useState(false);

  // Check if ALL matching leads across all pages are selected
  const isAllSelected = totalItems > 0 && selectedLeadIds.length >= totalItems;
  const isAllPageSelected = leads.length > 0 && leads.every(l => selectedLeadIds.includes(l.id));

  // Reset selections ONLY when search terms or filter parameters change (not when changing pagination page)
  useEffect(() => {
    setSelectedLeadIds([]);
  }, [debouncedSearchTerm, selectedStage, selectedProject, selectedAssigned, dateFilterType, customStartDate, customEndDate, selectedTag, selectedSource]);

  const handleToggleSelectLead = (leadId: number, checked: boolean) => {
    setSelectedLeadIds(prev =>
      checked ? (prev.includes(leadId) ? prev : [...prev, leadId]) : prev.filter(id => id !== leadId)
    );
  };

  const fetchAllMatchingLeadIds = async (): Promise<number[]> => {
    try {
      const filterParam = dateFilterType ? mapDateFilterToApi(dateFilterType) : undefined;
      const fetchLimit = Math.max(totalItems, 10000);
      const res = await getLeads(1, fetchLimit, debouncedSearchTerm, selectedProject, selectedStage, {
        source: selectedSource || undefined,
        tag: selectedTag || undefined,
        filter: filterParam || undefined,
        startDate: filterParam === 'Custom Date' ? customStartDate : undefined,
        endDate: filterParam === 'Custom Date' ? customEndDate : undefined,
        assignedExecutive: selectedAssigned || undefined,
      });

      if (res && res.data && Array.isArray(res.data)) {
        return res.data.map(l => l.id);
      }
    } catch (err) {
      console.error('Failed to fetch all matching lead IDs:', err);
    }
    return [];
  };

  const handleSelectAllLeads = async () => {
    if (isAllSelected) {
      setSelectedLeadIds([]);
      return;
    }

    // If all leads are already on the current page
    if (totalItems <= leads.length && totalItems > 0) {
      setSelectedLeadIds(leads.map(l => l.id));
      return;
    }

    setIsFetchingAllLeadIds(true);
    try {
      const allIds = await fetchAllMatchingLeadIds();
      if (allIds.length > 0) {
        setSelectedLeadIds(allIds);
      } else {
        setSelectedLeadIds(leads.map(l => l.id));
      }
    } finally {
      setIsFetchingAllLeadIds(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleBulkDeleteLeads = async () => {
    if (selectedLeadIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const res = await bulkSoftDeleteLeads(selectedLeadIds);
      if (res && res.success !== false) {
        setIsBulkDeleteModalOpen(false);

        const countDeleted = selectedLeadIds.length;
        const deletedSet = new Set(selectedLeadIds.map(String));

        // Optimistically remove deleted leads from current view immediately
        setLeads(prev => prev.filter(l => !deletedSet.has(String(l.id))));
        setTotalItems(prev => Math.max(0, prev - countDeleted));
        setSelectedLeadIds([]);

        // Refetch latest leads from server in background
        fetchLeads(
          debouncedSearchTerm,
          currentPage,
          itemsPerPage,
          selectedProject,
          selectedStage,
          {
            source: selectedSource,
            tag: selectedTag,
            dateFilterType: dateFilterType,
            customStartDate: customStartDate,
            customEndDate: customEndDate,
            assignedExecutive: selectedAssigned,
          }
        );

        Swal.fire({
          title: 'Deleted!',
          text: res.message || `${countDeleted} leads, associated visits, visit allocations, and bookings soft deleted successfully`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: 'Failed to Delete',
          text: res?.message || 'Failed to delete leads.',
          icon: 'error',
        });
      }
    } catch (err: any) {
      console.error('Failed to bulk soft delete leads:', err);
      Swal.fire({
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'An error occurred while deleting leads.',
        icon: 'error',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!selectedTransferExecutive || !id) return;
    
    setTransferLoading(true);
    try {
      const res = await transferLeadVisitAllocation({
        lead_id: Number(id),
        sales_executive_id: Number(selectedTransferExecutive)
      });
      
      if (res && res.success) {
        Swal.fire('Success', 'Lead successfully transferred!', 'success');
        setIsTransferModalOpen(false);
        setSelectedTransferExecutive('');
        // trigger re-fetch
        const fetchDetails = async () => {
          setLoadingActivities(true);
          try {
            const resDetails = await getSalesLeadDetails(id);
            if (resDetails && resDetails.success && resDetails.data) {
              setSelectedLead(resDetails.data);
            }
          } finally {
            setLoadingActivities(false);
          }
        };
        fetchDetails();
      } else {
        Swal.fire('Error', res?.message || 'Failed to transfer lead', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'An error occurred', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  // Modals for Add Note, Add Reminder, Add Task
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [noteInputText, setNoteInputText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);
  const [reminderNoteText, setReminderNoteText] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskNoteText, setTaskNoteText] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskRepeat, setTaskRepeat] = useState('NO_REPEAT');
  const [taskLoading, setTaskLoading] = useState(false);

  const refreshCurrentLeadDetails = async (leadId: string | number) => {
    try {
      const res = await getSalesLeadDetails(leadId);
      if (res && res.success && res.data) {
        setSelectedLead(res.data);
        setTimelineNotes(res.data.notes || []);
        setTimelineReminders(res.data.reminders || []);
        setTimelineTasks(res.data.tasks || []);

        const mappedActivities = (res.data.activity_logs || res.data.activityLogs || []).map((l: any) => ({
          id: String(l.id),
          type: l.activityType?.replace(/_/g, ' ') || 'Activity',
          description: l.message,
          createdAt: l.createdAt || l.date
        }));
        setActivities(mappedActivities);
      }
    } catch (err) {
      console.error('Failed to refresh lead details:', err);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInputText.trim() || !id) return;

    setNoteLoading(true);
    try {
      const res = await addSalesLeadNote({
        lead_id: Number(id),
        note: noteInputText.trim(),
        contact_status: 1
      });

      if (res && (res.success || res.data)) {
        Swal.fire({
          icon: 'success',
          title: 'Note Added',
          text: 'Timeline note created successfully!',
          timer: 1500,
          showConfirmButton: false
        });
        setNoteInputText('');
        setIsAddNoteModalOpen(false);
        await refreshCurrentLeadDetails(id);
      } else {
        Swal.fire('Error', res?.message || 'Failed to add note', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to add note', 'error');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleAddReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderDateTime || !id) return;

    setReminderLoading(true);
    try {
      const res = await createLeadReminder({
        lead_id: Number(id),
        reminder_datetime: reminderDateTime,
        note: reminderNoteText.trim()
      });

      if (res && (res.success || res.data)) {
        Swal.fire({
          icon: 'success',
          title: 'Reminder Set',
          text: 'Reminder created successfully!',
          timer: 1500,
          showConfirmButton: false
        });
        setReminderNoteText('');
        setReminderDateTime('');
        setIsAddReminderModalOpen(false);
        await refreshCurrentLeadDetails(id);
      } else {
        Swal.fire('Error', res?.message || 'Failed to set reminder', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to set reminder', 'error');
    } finally {
      setReminderLoading(false);
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !id) return;

    setTaskLoading(true);
    try {
      const res = await createLeadTask({
        lead_id: Number(id),
        task_name: taskName.trim(),
        note: taskNoteText.trim(),
        due_date: taskDueDate || new Date().toISOString(),
        priority: taskPriority,
        repeat: taskRepeat,
        remindercreate: false
      });

      if (res && (res.success || res.data)) {
        Swal.fire({
          icon: 'success',
          title: 'Task Created',
          text: 'Lead task assigned successfully!',
          timer: 1500,
          showConfirmButton: false
        });
        setTaskName('');
        setTaskNoteText('');
        setTaskDueDate('');
        setTaskPriority('MEDIUM');
        setTaskRepeat('NO_REPEAT');
        setIsAddTaskModalOpen(false);
        await refreshCurrentLeadDetails(id);
      } else {
        Swal.fire('Error', res?.message || 'Failed to create task', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to create task', 'error');
    } finally {
      setTaskLoading(false);
    }
  };


  // Fetch assigned person options from cached query
  const { data: salesUsersData } = useSalesUsersQuery();
  const assignedOptions = React.useMemo(() => {
    return (salesUsersData || []).map(u => ({ id: u.id, name: u.name }));
  }, [salesUsersData]);

  const tagOptions = [
    'Cold',
    'Hot',
    'Warm',
    'Qualified',
    'Dead'
  ];

  const sourceOptions = [
    'Direct / Walk-in',
    'Walk-In',
    'Channel Partner',
    'Referral',
    'Employee',
    'Print Ad',
    'Hoarding',
    'SMS'
  ];

  const budgetOptions = Array.from(
    new Set(
      leads
        .map(l => l.budget)
        .filter(Boolean)
    )
  ) as string[];

  const unitTypeOptions = Array.from(
    new Set(
      leads
        .map(l => l.unit_type)
        .filter(Boolean)
    )
  ) as string[];


  // Persist admin leads filters to localStorage
  useEffect(() => {
    localStorage.setItem('admin_leads_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('admin_leads_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('admin_leads_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  // Sync selectedProject with global selectedProjectId from context / top dropdown
  useEffect(() => {
    const currentGlobal = (selectedProjectId !== null && selectedProjectId !== undefined && selectedProjectId !== '')
      ? String(selectedProjectId)
      : '';
    if (currentGlobal !== selectedProject) {
      setSelectedProject(currentGlobal);
      setCurrentPage(1);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem('admin_leads_selectedProject', selectedProject);
    if (selectedProject && String(selectedProjectId) !== String(selectedProject)) {
      setSelectedProjectId(Number(selectedProject) || selectedProject);
    } else if (!selectedProject && selectedProjectId !== null) {
      setSelectedProjectId(null);
    }
  }, [selectedProject]);

  useEffect(() => {
    localStorage.setItem('admin_leads_selectedStage', selectedStage);
  }, [selectedStage]);

  // Keep page within totalPages bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Timeline activities states
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [timelineNotes, setTimelineNotes] = useState<any[]>([]);
  const [timelineReminders, setTimelineReminders] = useState<any[]>([]);
  const [timelineTasks, setTimelineTasks] = useState<any[]>([]);

  const getProjectNameFromId = (id: string) => {
    const found = projects.find(p => String((p as any).id) === id || p.name === id || (p as any).project_name === id);
    return found ? (found.name || (found as any).project_name) : '';
  };

  const getBrokerName = (brokerId: any, customerDetail?: any) => {
    if (customerDetail?.broker) {
      const b = customerDetail.broker;
      if (b.broker_name && b.company_name) return `${b.broker_name} (${b.company_name})`;
      return b.broker_name || b.name || b.company_name || 'Channel Partner';
    }
    if (!brokerId) {
      return customerDetail?.source || '--';
    }
    const found = brokers.find(b => String((b as any).id) === String(brokerId) || (b as any).broker_id === String(brokerId) || b.name === String(brokerId));
    return found ? found.name : `Broker ID: ${brokerId}`;
  };

  // Bulk Upload Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [userConsent, setUserConsent] = useState(false);
  const [uploadProjects, setUploadProjects] = useState<{ id: number; project_name: string }[]>([]);
  const [selectedUploadProjectId, setSelectedUploadProjectId] = useState<string>('');

  // Edit Lead Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSource, setEditSource] = useState('Walk-In');
  const [editBrokerId, setEditBrokerId] = useState('');
  const [editBrokerSearchQuery, setEditBrokerSearchQuery] = useState('');
  const [isEditBrokerDropdownOpen, setIsEditBrokerDropdownOpen] = useState(false);
  const [editPurpose, setEditPurpose] = useState('');
  const [editExpectedDuration, setEditExpectedDuration] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Lead Modal states
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [addLeadName, setAddLeadName] = useState('');
  const [addLeadMobile, setAddLeadMobile] = useState('');
  const [addLeadEmail, setAddLeadEmail] = useState('');
  const [addLeadSource, setAddLeadSource] = useState('Direct / Walk-in');
  const [addLeadBrokerId, setAddLeadBrokerId] = useState('');
  const [addLeadReferredName, setAddLeadReferredName] = useState('');
  const [addLeadReferredMobile, setAddLeadReferredMobile] = useState('');
  const [addLeadReferredEmail, setAddLeadReferredEmail] = useState('');
  const [addLeadUnitType, setAddLeadUnitType] = useState('');
  const [addLeadBudget, setAddLeadBudget] = useState('');
  const [addLeadPurposeOfBuying, setAddLeadPurposeOfBuying] = useState('');
  const [addLeadSourceOfInfo, setAddLeadSourceOfInfo] = useState('');
  const [addLeadResidentialAddress, setAddLeadResidentialAddress] = useState('');
  const [addLeadVisitDate, setAddLeadVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addLeadVisitTime, setAddLeadVisitTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [addLeadAttendedBy, setAddLeadAttendedBy] = useState('');
  const [addLeadProjectId, setAddLeadProjectId] = useState('');
  const [addLeadNotes, setAddLeadNotes] = useState('');
  const [addLeadSubmitting, setAddLeadSubmitting] = useState(false);
  const [addLeadError, setAddLeadError] = useState('');

  // Brokers list state for Add & Edit Lead Modals
  const [brokersList, setBrokersList] = useState<any[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');
  const [isAddLeadBrokerDropdownOpen, setIsAddLeadBrokerDropdownOpen] = useState(false);
  const brokerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBrokersForAddLead = async (search = '') => {
    setLoadingBrokers(true);
    try {
      const res = await getReceptionistBrokers(search);
      if (res && res.success && Array.isArray(res.data)) {
        setBrokersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch brokers for modal:', err);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleBrokerSearchChange = (query: string) => {
    setBrokerSearchQuery(query);
    if (brokerSearchTimeoutRef.current) {
      clearTimeout(brokerSearchTimeoutRef.current);
    }
    brokerSearchTimeoutRef.current = setTimeout(() => {
      fetchBrokersForAddLead(query);
    }, 300);
  };

  const handleEditBrokerSearchChange = (query: string) => {
    setEditBrokerSearchQuery(query);
    if (brokerSearchTimeoutRef.current) {
      clearTimeout(brokerSearchTimeoutRef.current);
    }
    brokerSearchTimeoutRef.current = setTimeout(() => {
      fetchBrokersForAddLead(query);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (brokerSearchTimeoutRef.current) {
        clearTimeout(brokerSearchTimeoutRef.current);
      }
    };
  }, []);

  const resetAddLeadForm = () => {
    setAddLeadName('');
    setAddLeadMobile('');
    setAddLeadEmail('');
    setAddLeadSource('Direct / Walk-in');
    setAddLeadBrokerId('');
    setAddLeadReferredName('');
    setAddLeadReferredMobile('');
    setAddLeadReferredEmail('');
    setAddLeadUnitType('');
    setAddLeadBudget('');
    setAddLeadPurposeOfBuying('');
    setAddLeadSourceOfInfo('');
    setAddLeadResidentialAddress('');
    setAddLeadVisitDate(new Date().toISOString().split('T')[0]);
    setAddLeadVisitTime(new Date().toTimeString().slice(0, 5));
    setAddLeadAttendedBy('');
    const defaultProjId = selectedProject ? String(selectedProject) : (uploadProjects.length > 0 ? String(uploadProjects[0].id) : '');
    setAddLeadProjectId(defaultProjId);
    setAddLeadNotes('');
    setAddLeadError('');
    setBrokerSearchQuery('');
  };

  const leadQueryParams = React.useMemo(() => {
    const filterParam = dateFilterType ? mapDateFilterToApi(dateFilterType) : undefined;
    return {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      projectId: selectedProject,
      stage: selectedStage,
      filters: {
        source: selectedSource || undefined,
        tag: selectedTag || undefined,
        filter: filterParam || undefined,
        startDate: filterParam === 'Custom Date' ? customStartDate : undefined,
        endDate: filterParam === 'Custom Date' ? customEndDate : undefined,
        assignedExecutive: selectedAssigned || undefined,
      },
    };
  }, [
    currentPage, itemsPerPage, debouncedSearchTerm, selectedProject, selectedStage,
    selectedSource, selectedTag, dateFilterType, customStartDate, customEndDate, selectedAssigned
  ]);

  const {
    data: leadsData,
    isLoading: isLeadsLoading,
    error: leadsQueryError,
    refetch: refetchLeads
  } = useLeadsQuery(leadQueryParams, { enabled: !id });

  useEffect(() => {
    if (leadsData) {
      if (leadsData.success && leadsData.data) {
        setLeads(leadsData.data);
        if (leadsData.pagination) {
          setTotalItems(leadsData.pagination.totalItems);
          setTotalPages(leadsData.pagination.totalPages);
        } else {
          setTotalItems(leadsData.data.length);
          setTotalPages(Math.ceil(leadsData.data.length / itemsPerPage));
        }

        if (pendingNavigation.current && leadsData.data.length > 0) {
          const targetLead = pendingNavigation.current === 'first'
            ? leadsData.data[0]
            : leadsData.data[leadsData.data.length - 1];
          pendingNavigation.current = null;
          if (targetLead) {
            navigate(`/admin/leads/${targetLead.id}`);
          }
        }
      } else {
        pendingNavigation.current = null;
        setError((leadsData as any).message || 'Failed to fetch customer leads');
      }
    }
  }, [leadsData, itemsPerPage, navigate]);

  useEffect(() => {
    if (leadsQueryError) {
      pendingNavigation.current = null;
      setError((leadsQueryError as any)?.message || 'An error occurred while fetching customer leads');
    }
  }, [leadsQueryError]);

  useEffect(() => {
    setLoading(isLeadsLoading);
  }, [isLeadsLoading]);

  const fetchLeads = async (..._args: any[]) => {
    await refetchLeads();
  };

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLeadError('');

    if (!addLeadName.trim()) {
      setAddLeadError('Customer Name is required');
      return;
    }
    if (!addLeadMobile.trim()) {
      setAddLeadError('Mobile Number is required');
      return;
    }
    if (addLeadMobile.trim().length !== 10 || isNaN(Number(addLeadMobile.trim()))) {
      setAddLeadError('Mobile Number must be a valid 10-digit number');
      return;
    }
    if (addLeadSource === 'Broker' && !addLeadBrokerId) {
      setAddLeadError('Please select a Broker / Channel Partner');
      return;
    }
    if (!addLeadVisitDate) {
      setAddLeadError('Please select When Visited (Date)');
      return;
    }
    if (!addLeadVisitTime) {
      setAddLeadError('Please select When Visited (Time)');
      return;
    }
    if (!addLeadAttendedBy) {
      setAddLeadError('Please select Who Attended (Sales Person)');
      return;
    }

    setAddLeadSubmitting(true);
    try {
      let finalNote = addLeadNotes.trim();
      if (addLeadSource === 'Broker' && addLeadBrokerId) {
        const foundBroker = brokersList.find(b => String(b.id) === String(addLeadBrokerId));
        const cpName = foundBroker ? (foundBroker.name || foundBroker.broker_name || 'Channel Partner') : 'Channel Partner';
        const cpDetails = `[Channel Partner Association] Partner: ${cpName}`;
        finalNote = finalNote ? `${finalNote}\n\n${cpDetails}` : cpDetails;
      } else if (addLeadSource === 'Referral' && addLeadReferredName.trim()) {
        const refDetails = `[Referred By] Name: ${addLeadReferredName.trim()}, Mobile: ${addLeadReferredMobile.trim()}${addLeadReferredEmail.trim() ? `, Email: ${addLeadReferredEmail.trim()}` : ''}`;
        finalNote = finalNote ? `${finalNote}\n\n${refDetails}` : refDetails;
      }

      const projIdToUse = addLeadProjectId
        ? Number(addLeadProjectId)
        : (selectedProject
          ? Number(selectedProject)
          : (uploadProjects && uploadProjects.length > 0 ? uploadProjects[0].id : undefined));

      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimeStr = new Date().toTimeString().slice(0, 5);

      const payload: any = {
        customer_name: addLeadName.trim(),
        mobile_number: addLeadMobile.trim(),
        email: addLeadEmail.trim() || undefined,
        source: addLeadSource || 'Direct / Walk-in',
        broker_id: addLeadSource === 'Broker' && addLeadBrokerId ? Number(addLeadBrokerId) : undefined,
        referredByName: addLeadSource === 'Referral' && addLeadReferredName.trim() ? addLeadReferredName.trim() : undefined,
        referredByMobileNumber: addLeadSource === 'Referral' && addLeadReferredMobile.trim() ? addLeadReferredMobile.trim() : undefined,
        referredByEmail: addLeadSource === 'Referral' && addLeadReferredEmail.trim() ? addLeadReferredEmail.trim() : undefined,
        project_id: projIdToUse,
        unit_type: addLeadUnitType || undefined,
        booking_preferences: addLeadUnitType || undefined,
        budget: addLeadBudget || undefined,
        purpose_of_buying: addLeadPurposeOfBuying || undefined,
        current_residence: addLeadResidentialAddress.trim() || undefined,
        residential_address: addLeadResidentialAddress.trim() || undefined,
        source_of_project_information: addLeadSourceOfInfo || undefined,
        note: finalNote || undefined,
        purpose: 'Site Visit',
        scheduled_visit_date: addLeadVisitDate || todayStr,
        scheduled_visit_time: addLeadVisitTime || nowTimeStr,
        sales_executive_id: addLeadAttendedBy ? Number(addLeadAttendedBy) : undefined
      };

      const res = await createLeadWithCustomer(payload);
      if (res && res.success) {
        const rAny = res as any;
        const visitIdVal =
          rAny.data?.visit?.id ||
          rAny.data?.visit_id ||
          rAny.visit?.id ||
          rAny.visit_id ||
          rAny.data?.id ||
          rAny.id;

        if (addLeadAttendedBy && visitIdVal) {
          try {
            await reassignVisitor(visitIdVal, {
              sales_executive_id: Number(addLeadAttendedBy),
              note: 'Assigned attending sales executive during lead creation'
            });
          } catch (reassignErr) {
            console.error('Failed to reassign visitor:', reassignErr);
          }
        }

        Swal.fire({
          title: 'Lead Created Successfully!',
          text: `Customer ${addLeadName.trim()} has been registered.`,
          icon: 'success',
          confirmButtonColor: '#10B981'
        });

        setIsAddLeadModalOpen(false);
        resetAddLeadForm();

        fetchLeads(searchTerm, currentPage, itemsPerPage, selectedProject, selectedStage, {
          source: selectedSource,
          tag: selectedTag,
          dateFilterType: dateFilterType,
          customStartDate: customStartDate,
          customEndDate: customEndDate,
          assignedExecutive: selectedAssigned
        });
      } else {
        setAddLeadError(res?.message || 'Failed to create lead. Please check details and try again.');
      }
    } catch (err: any) {
      console.error('Error creating lead:', err);
      setAddLeadError(err?.response?.data?.message || err.message || 'An unexpected error occurred while creating lead.');
    } finally {
      setAddLeadSubmitting(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    Swal.fire({
      title: 'Exporting Leads',
      text: 'Requesting download from the server, please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const filterParam = dateFilterType ? mapDateFilterToApi(dateFilterType) : undefined;
      const typeParam = format === 'xlsx' ? 'excel' : 'csv';

      let url = `/leads?type=${typeParam}`;
      if (searchTerm) {
        url += `&Search=${encodeURIComponent(searchTerm)}`;
      }
      if (selectedProject) {
        url += `&project_id=${selectedProject}`;
      }
      if (selectedStage) {
        url += `&stage=${selectedStage}`;
      }
      if (selectedSource) {
        url += `&source=${encodeURIComponent(selectedSource)}`;
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }
      if (filterParam) {
        url += `&filter=${encodeURIComponent(filterParam)}`;
        if (filterParam === 'Custom Date') {
          if (customStartDate) url += `&start_date=${customStartDate}`;
          if (customEndDate) url += `&end_date=${customEndDate}`;
        }
      }
      if (selectedAssigned) {
        url += `&assigned_executive=${selectedAssigned}`;
      }

      // Perform request with responseType 'blob'
      const response = await axiosClient.get(url, { responseType: 'blob' });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;'
      });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `leads_export_${new Date().toISOString().split('T')[0]}.${format}`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      Swal.fire({
        title: 'Export Completed',
        text: 'Successfully downloaded the lead records from server.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      });

    } catch (err: any) {
      console.error('Export failed:', err);
      Swal.fire({
        title: 'Export Failed',
        text: err.message || 'An error occurred during lead export.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportClick = () => {
    Swal.fire({
      title: 'Export Leads Data',
      text: 'Select your preferred format to export leads matching current search/filters.',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'CSV Format',
      denyButtonText: 'Excel Spreadsheet',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3B82F6',
      denyButtonColor: '#10B981',
      cancelButtonColor: '#6B7280'
    }).then((result) => {
      if (result.isConfirmed) {
        handleExport('csv');
      } else if (result.isDenied) {
        handleExport('xlsx');
      }
    });
  };

  const prevSearchTerm = useRef(searchTerm);
  const prevProject = useRef(selectedProject);
  const prevStage = useRef(selectedStage);
  const prevSource = useRef(selectedSource);
  const prevTag = useRef(selectedTag);
  const prevDateFilter = useRef(dateFilterType);
  const prevAssigned = useRef(selectedAssigned);

  useEffect(() => {
    if (
      prevSearchTerm.current !== searchTerm ||
      prevProject.current !== selectedProject ||
      prevStage.current !== selectedStage ||
      prevSource.current !== selectedSource ||
      prevTag.current !== selectedTag ||
      prevDateFilter.current !== dateFilterType ||
      prevAssigned.current !== selectedAssigned
    ) {
      prevSearchTerm.current = searchTerm;
      prevProject.current = selectedProject;
      prevStage.current = selectedStage;
      prevSource.current = selectedSource;
      prevTag.current = selectedTag;
      prevDateFilter.current = dateFilterType;
      prevAssigned.current = selectedAssigned;

      setCurrentPage(1);
      if (id) {
        navigate('/admin/leads');
      }
    }
  }, [searchTerm, selectedProject, selectedStage, selectedSource, selectedTag, dateFilterType, selectedAssigned, id, navigate]);

  // Sync selectedLead with URL parameter by calling getSalesLeadDetails API directly
  useEffect(() => {
    if (id) {
      const fetchDetails = async () => {
        setLoadingActivities(true);
        try {
          const res = await getSalesLeadDetails(id);
          if (res && res.success && res.data) {
            setSelectedLead(res.data);
            localStorage.setItem('selectedAdminLeadName', res.data.customer_detail?.customer_name || '—');

            // Populate all timeline data from the same API response
            setTimelineNotes(res.data.notes || []);
            setTimelineReminders(res.data.reminders || []);
            setTimelineTasks(res.data.tasks || []);

            const mappedActivities = (res.data.activity_logs || res.data.activityLogs || []).map((l: any) => ({
              id: String(l.id),
              type: l.activityType?.replace(/_/g, ' ') || 'Activity',
              description: l.message,
              createdAt: l.createdAt || l.date
            }));
            setActivities(mappedActivities);
          } else {
            navigate('/admin/leads');
          }
        } catch (err) {
          console.error('Failed to fetch lead details:', err);
          navigate('/admin/leads');
        } finally {
          setLoadingActivities(false);
        }
      };

      // Re-fetch if navigating to a different lead
      if (!selectedLead || String(selectedLead.id) !== id) {
        fetchDetails();
      }
    } else {
      setSelectedLead(null);
      setActivities([]);
      setTimelineNotes([]);
      setTimelineReminders([]);
      setTimelineTasks([]);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isHistoryDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isHistoryDrawerOpen]);

  // 300ms Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close stage dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setStageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync selectedLead when selectedAdminLeadName is removed from localStorage (e.g. from breadcrumbs Link)
  useEffect(() => {
    const checkAdminLeadSelection = () => {
      const adminName = localStorage.getItem('selectedAdminLeadName');
      if (!adminName && selectedLead) {
        setSelectedLead(null);
      }
    };
    const interval = setInterval(checkAdminLeadSelection, 200);
    return () => clearInterval(interval);
  }, [selectedLead]);

  const fetchUploadProjects = async () => {
    try {
      const res = await getProjectsDropdownList();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setUploadProjects(res.data);
        setAddLeadProjectId(prev => prev || (selectedProject ? String(selectedProject) : String(res.data[0].id)));
      }
    } catch (err) {
      console.error('Failed to fetch projects for bulk upload:', err);
    }
  };

  useEffect(() => {
    if (uploadProjects.length > 0 && !addLeadProjectId) {
      const defaultId = selectedProject ? String(selectedProject) : String(uploadProjects[0].id);
      setAddLeadProjectId(defaultId);
    }
  }, [uploadProjects, selectedProject]);

  const formatBudget = (budgetValue: any) => {
    if (!budgetValue) return '₹80L - ₹1Cr';
    if (typeof budgetValue === 'string') return budgetValue;
    if (budgetValue === 5500000) return '₹50L - ₹60L';
    if (budgetValue === 7000000) return '₹60L - ₹80L';
    if (budgetValue === 8500000) return '₹80L - ₹1Cr';
    if (budgetValue === 11000000) return '₹1Cr - ₹1.2Cr';
    if (budgetValue === 13500000) return '₹1.2Cr - ₹1.5Cr';
    if (budgetValue === 17500000) return '₹1.5Cr - ₹2Cr';
    if (budgetValue === 22500000) return '₹2Cr - ₹2.5Cr';
    if (budgetValue === 30000000) return '₹2.5Cr+';

    if (budgetValue >= 10000000) {
      return `₹${(budgetValue / 10000000).toFixed(1)} Cr`;
    }
    if (budgetValue >= 100000) {
      return `₹${(budgetValue / 100000).toFixed(0)} L`;
    }
    return `₹${budgetValue}`;
  };

  // Scheduled visit time helper (convert 24h to AM/PM)
  const formatVisitTime = (timeStr: string) => {
    if (!timeStr) return '11:00 AM';
    try {
      const [hoursStr, minutesStr] = timeStr.split(':');
      const hours = parseInt(hoursStr, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      return `${displayHours}:${minutesStr} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Project lookup helper
  const getProjectName = (cust: any) => {
    const projDetails = cust.project_details;
    if (Array.isArray(projDetails) && projDetails.length > 0) {
      return projDetails[0].project_name;
    }
    if (cust.project_detail?.project_name) return cust.project_detail.project_name;
    if (cust.Project?.project_name) return cust.Project.project_name;
    if (cust.Project?.name) return cust.Project.name;
    if (cust.project_name) return cust.project_name;

    // Resolve from context projects
    if (cust.project_id || cust.project) {
      const found = projects.find(p => String((p as any).id) === String(cust.project_id || cust.project) || p.name === cust.project_name || (p as any).project_name === cust.project_name);
      if (found) return found.name || (found as any).project_name;
    }
    return '';
  };

  // Format creation date nicely
  const formatDateRegistered = (dateStr?: string) => {
    return formatDateDDMMYYYY(dateStr);
  };

  // Bulk Upload drag-drop file handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleModalClose = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setCustomFileName('');
    setPreviewData([]);
    setUploadStep(1);
    setUserConsent(false);
    setSelectedUploadProjectId('');
  };

  const openEditModal = () => {
    if (!selectedLead) return;
    setEditCustomerName(selectedLead.customer_detail?.customer_name || '');
    setEditMobileNumber(selectedLead.customer_detail?.mobile_number || '');
    setEditEmail(selectedLead.customer_detail?.email || '');
    setEditNote(selectedLead.customer_detail?.note || '');
    let srcVal = selectedLead.customer_detail?.source || 'Direct / Walk-in';
    if (srcVal === 'Walk-In' || srcVal === 'Direct / Self') {
      srcVal = 'Direct / Walk-in';
    }
    setEditSource(srcVal);
    const bId = selectedLead.customer_detail?.broker_id;
    setEditBrokerId(bId ? String(bId) : '');
    
    if (selectedLead.customer_detail?.broker) {
      const b = selectedLead.customer_detail.broker;
      const bName = b.name || b.broker_name || `Broker #${b.id}`;
      const bFirm = b.company_name ? ` (${b.company_name})` : '';
      const bPhone = b.mobile_number || b.contact_number || '';
      setEditBrokerSearchQuery(`${bName}${bFirm}${bPhone ? ` - ${bPhone}` : ''}`);
    } else {
      setEditBrokerSearchQuery('');
    }

    if ((srcVal === 'Broker' || bId) && brokersList.length === 0) {
      fetchBrokersForAddLead();
    }
    setEditPurpose(selectedLead.customer_detail?.purpose || '');
    setEditExpectedDuration(selectedLead.expected_booking_duration || '');

    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if (editSource === 'Broker' && !editBrokerId) {
      Swal.fire({
        title: 'Broker Required',
        text: 'Please select a Broker / Channel Partner when Source is set to Broker',
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    Swal.fire({
      title: 'Confirm Changes',
      text: 'Are you sure you want to update this lead\'s information?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, update info'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Saving changes...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          const payload: any = {
            customer_name: editCustomerName,
            mobile_number: editMobileNumber.trim(),
            email: editEmail,
            note: editNote,
            source: editSource,
            broker_id: editSource === 'Broker' && editBrokerId ? Number(editBrokerId) : undefined,
            purpose: editPurpose,
            expected_booking_duration: editExpectedDuration
          };

          const res = await axiosClient.put(`/leads/${selectedLead.id}/update-info`, payload);

          if (res.data && res.data.success) {
            Swal.fire({
              title: 'Saved!',
              text: 'Lead information has been updated successfully.',
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
            setIsEditModalOpen(false);

            // Refresh lead details — all data from the single dashboard API
            if (id) {
              const detailsRes = await getSalesLeadDetails(id);
              if (detailsRes && detailsRes.success && detailsRes.data) {
                setSelectedLead(detailsRes.data);
                localStorage.setItem('selectedAdminLeadName', detailsRes.data.customer_detail?.customer_name || '—');

                // Update notes / reminders / tasks / activities from same response
                setTimelineNotes(detailsRes.data.notes || []);
                setTimelineReminders(detailsRes.data.reminders || []);
                setTimelineTasks(detailsRes.data.tasks || []);
                const mappedActivities = (detailsRes.data.activity_logs || detailsRes.data.activityLogs || []).map((l: any) => ({
                  id: String(l.id),
                  type: l.activityType?.replace(/_/g, ' ') || 'Activity',
                  description: l.message,
                  createdAt: l.createdAt || l.date
                }));
                setActivities(mappedActivities);
              }
            }
          } else {
            Swal.fire({
              title: 'Failed to update',
              text: res.data?.message || 'An error occurred.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          console.error('Error updating lead info:', err);
          Swal.fire({
            title: 'Error',
            text: err.response?.data?.message || 'Could not update lead details.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        }
      }
    });
  };

  const validateAndSetFile = (file: File) => {
    if (!selectedUploadProjectId) {
      Swal.fire({
        title: 'Project Required',
        text: 'Please select a project first before uploading the leads file.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const allowedExtensions = ['csv', 'xlsx', 'xls'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension && allowedExtensions.includes(extension)) {
      setSelectedFile(file);
      setCustomFileName(file.name);
      setUploadStep(2);

      // Parse file preview if CSV
      if (extension === 'csv') {
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          if (text) {
            const lines = text.split('\n')
              .map(line => line.split(','))
              .filter(line => line.some(cell => cell.trim() !== '')); // Skip empty lines
            setPreviewData(lines.slice(0, 4)); // Show up to 3 data rows (+1 header row)
          }
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

            // Normalize cells to strings and skip empty rows
            const cleanRows = sheetData
              .map(row => (Array.isArray(row) ? row : []).map(cell => (cell === null || cell === undefined ? '' : String(cell))))
              .filter(row => row.some(cell => cell.trim() !== ''));

            setPreviewData(cleanRows.slice(0, 4)); // Show header + 3 data rows
          } catch (err) {
            console.error('Failed to parse excel preview:', err);
            setPreviewData([]);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } else {
      Swal.fire({
        title: 'Invalid File Format',
        text: 'Please upload only CSV or Excel (.xlsx, .xls) files.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (!userConsent) {
      Swal.fire({
        title: 'Consent Required',
        text: 'Please review the file and accept the consent checkbox to proceed.',
        icon: 'warning',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    const selectedProjObj = uploadProjects.find(p => String(p.id) === selectedUploadProjectId);
    const selectedUploadProjectName = selectedProjObj ? selectedProjObj.project_name : '';

    Swal.fire({
      title: 'Confirm Bulk Import',
      text: `This Leads will get assigned to the Calling Person's of ${selectedUploadProjectName} Project!!`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, I consent & upload'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setUploading(true);
        try {
          const processedFile = await processCsvFile(selectedFile);
          const res = (await importLeadsBulk(processedFile, customFileName, selectedUploadProjectId, selectedUploadProjectName)) as any;

          if (res.success) {
            Swal.fire({
              title: 'Import Successful',
              text: res.message || `Leads imported successfully!`,
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
            handleModalClose();
            fetchLeads(searchTerm, currentPage, itemsPerPage, selectedProject, selectedStage, {
              source: selectedSource,
              tag: selectedTag,
              dateFilterType: dateFilterType,
              customStartDate: customStartDate,
              customEndDate: customEndDate,
              assignedExecutive: selectedAssigned
            }); // Refresh leads list
          } else {
            const errMsg = res.message || 'An error occurred during leads import.';
            let htmlContent = `<div class="text-left text-xs text-slate-600">
              <p class="font-bold text-sm text-slate-800 mb-2">${errMsg}</p>`;

            if (res.skipped && Array.isArray(res.skipped) && res.skipped.length > 0) {
              htmlContent += `
                <div class="mt-3 pt-3 border-t border-slate-100 max-h-40 overflow-y-auto" style="scrollbar-width: thin;">
                  <span class="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Skipped Rows & Reasons</span>
                  <ul class="space-y-1.5 list-none font-medium text-slate-500">
                    ${res.skipped.map((item: any) => `<li class="flex items-start gap-1"><span class="font-bold text-slate-700 shrink-0">Row ${item.rowIndex}:</span> <span>${item.reason}</span></li>`).join('')}
                  </ul>
                </div>
              `;
            }
            htmlContent += `</div>`;

            Swal.fire({
              title: 'Import Failed',
              html: htmlContent,
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          const resData = err?.response?.data;
          const errMsg = resData?.message || err?.message || 'An error occurred during leads import.';
          let htmlContent = `<div class="text-left text-xs text-slate-600">
            <p class="font-bold text-sm text-slate-800 mb-2">${errMsg}</p>`;

          if (resData?.skipped && Array.isArray(resData.skipped) && resData.skipped.length > 0) {
            htmlContent += `
              <div class="mt-3 pt-3 border-t border-slate-100 max-h-40 overflow-y-auto" style="scrollbar-width: thin;">
                <span class="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Skipped Rows & Reasons</span>
                <ul class="space-y-1.5 list-none font-medium text-slate-500">
                  ${resData.skipped.map((item: any) => `<li class="flex items-start gap-1"><span class="font-bold text-slate-700 shrink-0">Row ${item.rowIndex}:</span> <span>${item.reason}</span></li>`).join('')}
                </ul>
              </div>
            `;
          }
          htmlContent += `</div>`;

          Swal.fire({
            title: 'Import Failed',
            html: htmlContent,
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        } finally {
          setUploading(false);
        }
      }
    });
  };

  const currentIndex = leads.findIndex(l => String(l.id) === String(id));
  const hasPrev = !loading && currentIndex !== -1 && (currentPage > 1 || currentIndex > 0);
  const hasNext = !loading && currentIndex !== -1 && (currentPage < totalPages || currentIndex < leads.length - 1);

  // Sync page if active lead is not in current leads list (e.g. on refresh or out-of-sync)
  useEffect(() => {
    if (id && leads.length > 0 && currentIndex === -1 && !loading) {
      const findCorrectPage = async () => {
        try {
          const filterParam = dateFilterType ? mapDateFilterToApi(dateFilterType) : undefined;
          const res = await getLeads(1, 1000, searchTerm, selectedProject, selectedStage, {
            source: selectedSource || undefined,
            tag: selectedTag || undefined,
            filter: filterParam || undefined,
            startDate: filterParam === 'Custom Date' ? customStartDate : undefined,
            endDate: filterParam === 'Custom Date' ? customEndDate : undefined,
            assignedExecutive: selectedAssigned || undefined,
          });
          if (res.success && Array.isArray(res.data)) {
            const entireIndex = res.data.findIndex(l => String(l.id) === String(id));
            if (entireIndex !== -1) {
              const correctPage = Math.floor(entireIndex / itemsPerPage) + 1;
              if (correctPage !== currentPage) {
                setCurrentPage(correctPage);
              }
            }
          }
        } catch (err) {
          console.error('Failed to locate lead page:', err);
        }
      };
      findCorrectPage();
    }
  }, [id, leads, currentIndex, loading, currentPage, itemsPerPage, searchTerm, selectedProject, selectedStage, selectedSource, selectedTag, dateFilterType, customStartDate, customEndDate, selectedAssigned]);

  const handlePrevLead = () => {
    if (!hasPrev || currentIndex === -1) return;
    if (currentIndex > 0) {
      const prevLead = leads[currentIndex - 1];
      navigate(`/admin/leads/${prevLead.id}`);
    } else if (currentPage > 1) {
      pendingNavigation.current = 'last';
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextLead = () => {
    if (!hasNext || currentIndex === -1) return;
    if (currentIndex < leads.length - 1) {
      const nextLead = leads[currentIndex + 1];
      navigate(`/admin/leads/${nextLead.id}`);
    } else if (currentPage < totalPages) {
      pendingNavigation.current = 'first';
      setCurrentPage(currentPage + 1);
    }
  };

  const renderLeadDetails = (lead: any) => {
    const brokerName = getBrokerName(lead.customer_detail?.broker_id, lead.customer_detail);
    const projectName = getProjectName(lead) || 'Not Assigned';
    const callerExecutive = lead.allocations?.find((alloc: any) => alloc.callerExecutive)?.callerExecutive;

    const getInitials = (name?: string) => {
      if (!name) return '—';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
      <div className="flex flex-col flex-1 gap-6 text-left relative animate-in fade-in duration-200 bg-slate-50/30 p-2 rounded-3xl">
        {/* Navigation & Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex justify-between items-center w-full">
            <button
              onClick={() => {
                navigate('/admin/leads');
                localStorage.removeItem('selectedAdminLeadName');
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to All Leads</span>
            </button>

            {/* Next/Prev Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrev}
                onClick={handlePrevLead}
                className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-850 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs bg-white"
                title="Previous Lead"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-450">
                {leads.length > 0 && currentIndex !== -1 ? (
                  `${(currentPage - 1) * itemsPerPage + currentIndex + 1} of ${totalItems}`
                ) : (
                  '—'
                )}
              </span>
              <button
                disabled={!hasNext}
                onClick={handleNextLead}
                className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-850 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs bg-white"
                title="Next Lead"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              {/* Circular Avatar with initials */}
              <div className="w-14 h-14 rounded-full bg-[#F0EFFF] text-[#6E56CF] flex items-center justify-center text-lg font-black shrink-0 shadow-xs border border-purple-100/50">
                {getInitials(lead.customer_detail?.customer_name)}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-extrabold text-[#0F172A]">{lead.customer_detail?.customer_name || '—'}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border ${lead.stage === -1
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : lead.stage === 0
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : lead.stage === 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : lead.stage === 2
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : lead.stage === 3
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : lead.stage === 4
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                    {STAGE_LABELS[lead.stage] ?? 'Not Interested'}
                  </span>
                  {lead.city && (
                    <span className="px-2.5 py-1 bg-blue-50/50 border border-blue-100 text-blue-600 rounded-full text-[10px] font-bold">
                      {lead.city}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Lead registered on {formatDateRegistered(lead.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 justify-end">
              <button
                onClick={openEditModal}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-500 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Lead</span>
              </button>
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Transfer Lead</span>
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all duration-150 shadow-xs hover:shadow-md active:scale-[0.98] cursor-pointer"
                title="Delete Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>



              {/* Mark as Verified button removed */}
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Lead ID */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-[#6E56CF] rounded-2xl shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lead ID</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.lead_id || `L-2026-${String(lead.id).padStart(6, '0')}`}</span>
            </div>
          </div>

          {/* Card 2: Source */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Source</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.source || lead.customer_detail?.source || '--'}</span>
            </div>
          </div>

          {/* Card 3: Assigned To */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Assigned To</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.AssignedSalesExecutive?.name || '--'}</span>
            </div>
          </div>

          {/* Card 4: Lead Tag */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lead Tag</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.tag || '--'}</span>
            </div>
          </div>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Profile & Broker Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-blue-500" />
              <span>Customer Profile</span>
            </h3>

            <div className="space-y-4">
              {/* Full Name */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.customer_detail?.customer_name || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.customer_detail?.mobile_number || '—'}</span>
                  </div>
                </div>
                {lead.customer_detail?.mobile_number && (
                  <button
                    onClick={() => window.open(`tel:${lead.customer_detail.mobile_number}`)}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Email Address */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5 break-all">{lead.customer_detail?.email || '—'}</span>
                  </div>
                </div>
                {lead.customer_detail?.email && (
                  <button
                    onClick={() => window.open(`mailto:${lead.customer_detail.email}`)}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>


              {/* Assigned Caller Executive */}
              {callerExecutive && (
                <div className="pt-4 border-t border-slate-100 mt-4 space-y-4">
                  {/* Name */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                        <UserCheck className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Caller Executive</span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">{callerExecutive.full_name || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Number */}
                  {callerExecutive.contact_number && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                          <Phone className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Number</span>
                          <span className="text-xs font-bold text-slate-800 block mt-0.5">{callerExecutive.contact_number}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`tel:${callerExecutive.contact_number}`)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  {callerExecutive.email && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                          <Mail className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                          <span className="text-xs font-bold text-slate-800 block mt-0.5 break-all">{callerExecutive.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`mailto:${callerExecutive.email}`)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Sales Executive */}
              {lead.AssignedSalesExecutive && (
                <div className="pt-4 border-t border-slate-100 mt-4 space-y-4">
                  {/* Name */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                        <UserCheck className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Sales Executive</span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.AssignedSalesExecutive.name || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Number */}
                  {lead.AssignedSalesExecutive.mobile_number && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                          <Phone className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Number</span>
                          <span className="text-xs font-bold text-slate-800 block mt-0.5">{lead.AssignedSalesExecutive.mobile_number}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`tel:${lead.AssignedSalesExecutive.mobile_number}`)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  {lead.AssignedSalesExecutive.email && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl shrink-0 border border-slate-100">
                          <Mail className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                          <span className="text-xs font-bold text-slate-800 block mt-0.5 break-all">{lead.AssignedSalesExecutive.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`mailto:${lead.AssignedSalesExecutive.email}`)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lead Requirements */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-purple-500" />
              <span>Requirements</span>
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requirement Note</span>
                <span className="text-xs font-bold text-slate-850 mt-1 block leading-relaxed">{lead.customer_detail?.note || '—'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unit Type Configuration</span>
                <span className="text-xs font-bold text-slate-850 mt-1 block">{lead.unit_type || '—'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Constraint</span>
                <span className="text-xs font-bold text-slate-850 mt-1 block">{lead.budget ? formatBudget(lead.budget) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Visit & Audit Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2 shrink-0">
              <Calendar className="w-4.5 h-4.5 text-blue-500" />
              <span>Visit & Audit Trail</span>
              {lead.visits && lead.visits.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                  {lead.visits.length} visit{lead.visits.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 space-y-3 mt-4">
              {lead.visits && lead.visits.length > 0 ? (
                lead.visits.map((visit: any, idx: number) => {
                  const statusMap: Record<number, { label: string; cls: string }> = {
                    0: { label: 'Scheduled', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    1: { label: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    2: { label: 'Checked In', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
                    3: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    4: { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-200' },
                  };
                  const st = statusMap[visit.status] ?? { label: 'Unknown', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                  return (
                    <div key={visit.id ?? idx} className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2.5 hover:border-blue-200 transition-colors">
                      {/* Header row */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Visit #{idx + 1}{visit.visit_code ? ` · ${visit.visit_code}` : ''}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* Scheduled */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Date</span>
                          <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                            {formatDateDDMMYYYY(visit.scheduled_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Time</span>
                          <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                            {visit.scheduled_time ? formatVisitTime(visit.scheduled_time) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Check-in / Check-out */}
                      {(visit.check_in_time || visit.check_out_time) && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Check-In</span>
                            <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">
                              {visit.check_in_time
                                ? new Date(visit.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Check-Out</span>
                            <span className="text-xs font-semibold text-rose-600 mt-0.5 block">
                              {visit.check_out_time
                                ? new Date(visit.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Pickup location */}
                      {visit.pickup_location && (
                        <div className="pt-1.5 border-t border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pickup Location</span>
                          <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{visit.pickup_location}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Fallback: show lead-level scheduled visit */
                <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Visit #1</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Date</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {formatDateDDMMYYYY(lead.scheduled_visit_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Time</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {lead.scheduled_visit_time ? formatVisitTime(lead.scheduled_visit_time) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last Updated</span>
                    <span className="text-xs font-bold text-slate-700 mt-0.5 block">{formatDateRegistered(lead.updatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes, Reminders & Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-amber-500" />
                <span>Timeline Notes</span>
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${timelineNotes.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {timelineNotes.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddNoteModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50/80 px-2.5 py-1 rounded-lg transition cursor-pointer border border-amber-200/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 space-y-3 mt-4">
              {timelineNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                  <ClipboardList className="w-6 h-6 text-slate-300" />
                  <span className="text-xs font-semibold">No notes recorded yet</span>
                </div>
              ) : (
                timelineNotes.map((note: any) => (
                  <div key={note.id} className="flex gap-0 rounded-xl border border-slate-100 overflow-hidden hover:border-amber-200 hover:shadow-sm transition-all">
                    {/* Accent bar */}
                    <div className="w-1 bg-amber-400 shrink-0 rounded-l-xl" />
                    <div className="flex-1 p-3 space-y-2 bg-white">
                      <p className="text-xs font-medium text-slate-700 leading-relaxed">{note.note}</p>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          By {note.createdByName || '—'}
                        </span>
                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                          {new Date(note.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reminders Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-blue-500" />
                <span>Reminders</span>
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${timelineReminders.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {timelineReminders.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddReminderModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 px-2.5 py-1 rounded-lg transition cursor-pointer border border-blue-200/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reminder</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 space-y-3 mt-4">
              {timelineReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                  <Clock className="w-6 h-6 text-slate-300" />
                  <span className="text-xs font-semibold">No reminders scheduled</span>
                </div>
              ) : (
                timelineReminders.map((reminder: any) => (
                  <div key={reminder.id} className="flex gap-0 rounded-xl border border-slate-100 overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all">
                    {/* Accent bar */}
                    <div className={`w-1 shrink-0 rounded-l-xl ${reminder.status === 1 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div className="flex-1 p-3 space-y-2 bg-white">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{reminder.note}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border shrink-0 ${reminder.status === 1
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          {reminder.status === 1 ? 'Active' : 'Done'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          By {reminder.createdByName || '—'}
                        </span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                          {new Date(reminder.reminder_datetime).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tasks Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-rose-500" />
                <span>Tasks</span>
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${timelineTasks.length > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {timelineTasks.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 px-2.5 py-1 rounded-lg transition cursor-pointer border border-rose-200/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 space-y-3 mt-4">
              {timelineTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                  <Target className="w-6 h-6 text-slate-300" />
                  <span className="text-xs font-semibold">No tasks assigned</span>
                </div>
              ) : (
                timelineTasks.map((task: any) => (
                  <div key={task.id} className="flex gap-0 rounded-xl border border-slate-100 overflow-hidden hover:border-rose-200 hover:shadow-sm transition-all">
                    {/* Accent bar */}
                    <div className={`w-1 shrink-0 rounded-l-xl ${task.status === 1 ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                    <div className="flex-1 p-3 space-y-2 bg-white">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{task.task_name}</h4>
                          {task.note && <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-normal">{task.note}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border shrink-0 ${task.status === 1
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {task.status === 1 ? 'Pending' : 'Completed'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          By {task.createdByName || '—'}
                        </span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                          Due: {new Date(task.due_date || task.reminder_datetime).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lead Activity Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-blue-500" />
              <span>Lead Activity Timeline</span>
            </h3>
            <button
              onClick={() => {
                setIsHistoryDrawerOpen(true);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-750 transition cursor-pointer"
            >
              <span>View Full History</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative pt-4 overflow-x-auto">
            <div className="min-w-[760px] flex items-center justify-between relative px-4 py-2">
              {/* Connector line behind steps */}
              <div className="absolute top-7 left-10 right-10 h-0.5 bg-slate-100 z-0" />

              {loadingActivities ? (
                <div className="flex items-center justify-center w-full gap-2 text-slate-400 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Loading timeline...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center w-full text-xs font-semibold text-slate-400 py-4">
                  No activity logs available for this lead.
                </div>
              ) : (
                [...activities]
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .slice(0, 5)
                  .map((act: any, index: number) => {
                    const config = getActivityConfig(act.type);
                    const IconComponent = config.Icon;
                    return (
                      <div key={act.id || index} className="relative z-10 flex flex-col items-center text-center flex-1 animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        {/* Step Circle with Icon */}
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${config.color} shadow-xs z-10 bg-white`}>
                          <IconComponent className="w-4 h-4" />
                        </div>

                        {/* Title / Type */}
                        <span className="text-[10px] font-bold text-slate-800 mt-2 block max-w-[120px] truncate uppercase tracking-wider" title={act.type}>
                          {act.type}
                        </span>

                        {/* Date */}
                        <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                          {new Date(act.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>

                        {/* Time */}
                        <span className="text-[8px] font-black text-slate-350 uppercase tracking-widest mt-0.5">
                          {new Date(act.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filtering is now server-side via API params — leads array is already filtered by the backend
  const displayedLeads = leads;

  const isAnyFilterApplied = !!(
    searchTerm ||
    selectedProject ||
    selectedStage ||
    selectedSource ||
    selectedTag ||
    selectedAssigned ||
    dateFilterType
  );

  return (
    <div className="flex flex-col flex-1 gap-6 text-left relative">
      {selectedLead ? (
        renderLeadDetails(selectedLead)
      ) : (
        <>

          {/* Unified Sleek Header & Control Container */}
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col gap-4 text-left">
            {/* Top Bar: Title & Subtitle + Action Group */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100/80 pb-3.5">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">All Registered Leads</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Audit, filter, and bulk upload channel partner customer registrations</p>
              </div>
              
              {/* Primary & Data Actions Group */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-start sm:justify-end">
                {/* Primary CTA: Add Lead */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddLeadModalOpen(true);
                    if (uploadProjects.length === 0) fetchUploadProjects();
                    if (brokersList.length === 0) fetchBrokersForAddLead();
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Lead</span>
                </button>

                {/* Bulk Upload Action */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setIsUploadModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Bulk Upload</span>
                </button>

                {/* Export Action */}
                <button
                  type="button"
                  onClick={handleExportClick}
                  disabled={exporting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isAnyFilterApplied ? 'Export Filtered' : 'Export'}</span>
                </button>
              </div>
            </div>

            {/* Toolbar Row: Search, Stage Quick Selector, & Filter Toggle */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[240px]">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by lead name, phone, CP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white text-slate-700 placeholder-slate-400 transition-all font-medium"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Stage Smart Filter — Dropdown Selector */}
                {(() => {
                  const stageOptions = [
                    { value: '', label: 'All Stages', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50 hover:bg-slate-100' },
                    { value: '-1', label: 'Not Interested', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 hover:bg-amber-100/70' },
                    { value: '0', label: 'New lead', dot: 'bg-indigo-400', text: 'text-indigo-700', bg: 'bg-indigo-50 hover:bg-indigo-100/70' },
                    { value: '1', label: 'Verified', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50 hover:bg-emerald-100/70' },
                    { value: '2', label: 'Checked In', dot: 'bg-blue-400', text: 'text-blue-700', bg: 'bg-blue-50 hover:bg-blue-100/70' },
                    { value: '3', label: 'Negotiation', dot: 'bg-purple-400', text: 'text-purple-700', bg: 'bg-purple-50 hover:bg-purple-100/70' },
                    { value: '4', label: 'Booked', dot: 'bg-teal-400', text: 'text-teal-700', bg: 'bg-teal-50 hover:bg-teal-100/70' },
                  ];
                  const activeStage = stageOptions.find(s => s.value === selectedStage) || stageOptions[0];
                  return (
                    <div className="relative" ref={stageDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setStageDropdownOpen(o => !o)}
                        className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer hover:border-slate-300 hover:bg-slate-100/70 transition-all duration-150 w-full sm:w-44 shadow-2xs"
                      >
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${activeStage.dot}`} />
                        <span className="flex-1 text-left truncate">{activeStage.label}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${stageDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {stageDropdownOpen && (
                        <div
                          className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.12)] z-50 py-1.5 overflow-hidden"
                          style={{ animation: 'fadeSlideDown 0.15s ease-out' }}
                        >
                          <p className="px-3 pt-1 pb-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Filter by Stage</p>
                          {stageOptions.map(opt => {
                            const isActive = selectedStage === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSelectedStage(opt.value);
                                  setStageDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors duration-100 cursor-pointer text-left ${isActive ? `${opt.bg} ${opt.text}` : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                              >
                                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                                <span className="flex-1">{opt.label}</span>
                                {isActive && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Filters Toggle Button */}
              <div className="flex items-center gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFiltersExpanded(prev => !prev)}
                  className={`flex items-center justify-center gap-2 border rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs ${isFiltersExpanded
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Filters</span>
                  {[selectedAssigned, dateFilterType, selectedTag, selectedSource].filter(Boolean).length > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {[selectedAssigned, dateFilterType, selectedTag, selectedSource].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Active Filter Chips Bar */}
            {isAnyFilterApplied && (
              <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100 text-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-0.5">Active Filters:</span>
                
                {searchTerm && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200/60 rounded-lg text-xs font-medium">
                    Search: "{searchTerm}"
                    <button type="button" onClick={() => setSearchTerm('')} className="hover:text-rose-600 cursor-pointer transition"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {selectedStage && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-medium">
                    Stage: {STAGE_LABELS[Number(selectedStage)] || selectedStage}
                    <button type="button" onClick={() => setSelectedStage('')} className="hover:text-rose-600 cursor-pointer transition"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {selectedAssigned && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-medium">
                    Assigned: {assignedOptions.find(o => String(o.id) === selectedAssigned)?.name || selectedAssigned}
                    <button type="button" onClick={() => setSelectedAssigned('')} className="hover:text-rose-600 cursor-pointer transition"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {dateFilterType && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-medium">
                    Date: {dateFilterType}
                    <button type="button" onClick={() => { setDateFilterType(''); setCustomStartDate(''); setCustomEndDate(''); }} className="hover:text-rose-600 cursor-pointer transition"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {selectedTag && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-medium">
                    Tag: {selectedTag}
                    <button type="button" onClick={() => setSelectedTag('')} className="hover:text-rose-600 cursor-pointer transition"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {selectedSource && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-medium">
                    Source: {selectedSource}
                    <button type="button" onClick={() => setSelectedSource('')} className="hover:text-rose-600 cursor-pointer transition"><X className="w-3 h-3" /></button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStage('');
                    setSelectedAssigned('');
                    setDateFilterType('');
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setSelectedTag('');
                    setSelectedSource('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 transition"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Expanded Filters Panel */}
          {isFiltersExpanded && (
            <div
              className="bg-white p-5 rounded-2xl border border-slate-105 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] animate-in fade-in slide-in-from-top-3 duration-250 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="text-xs font-extrabold text-slate-450 uppercase tracking-wider block">Refine Search Results</span>
                {(selectedAssigned || dateFilterType || selectedTag || selectedSource) && (
                  <button
                    onClick={() => {
                      setSelectedAssigned('');
                      setDateFilterType('');
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setSelectedTag('');
                      setSelectedSource('');
                    }}
                    className="text-[10px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest cursor-pointer transition"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* 1. Assigned Person Filter */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Assigned Person</label>
                  <select
                    value={selectedAssigned}
                    onChange={(e) => setSelectedAssigned(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">All Assigned</option>
                    {assignedOptions.map(opt => (
                      <option key={opt.id} value={String(opt.id)}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Registered Date Filter */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider block">Registered Date</label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    {dateFilterType === 'custom' && (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          placeholder="Start"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer w-full"
                        />
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">to</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          placeholder="End"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Tag Filter */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Tag</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">All Tags</option>
                    {tagOptions.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Source Filter */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block">Source</label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">All Sources</option>
                    {sourceOptions.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Selection Action Bar - Shown when any select box is selected */}
          {selectedLeadIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-blue-50/90 border border-blue-200/80 rounded-2xl mb-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
                  {selectedLeadIds.length}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    {isAllSelected
                      ? `All ${totalItems} leads selected across all pages`
                      : `${selectedLeadIds.length} of ${totalItems} leads selected`}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {isAllSelected
                      ? 'All matching leads are selected for bulk action'
                      : 'Choose an action or select all leads across all pages'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Select All Leads across all pages Button */}
                <button
                  type="button"
                  onClick={handleSelectAllLeads}
                  disabled={isFetchingAllLeadIds}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-100/60 border border-blue-200 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isFetchingAllLeadIds ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Selecting all...</span>
                    </>
                  ) : isAllSelected ? (
                    <span>Deselect All ({totalItems})</span>
                  ) : (
                    <span>Select All {totalItems > 0 ? `(${totalItems} Leads)` : ''}</span>
                  )}
                </button>

                {/* Clear Selection Button */}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  Clear
                </button>

                {/* Delete Selected Button */}
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedLeadIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 pl-5 pr-2 w-10 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all leads"
                        title={isAllSelected ? "Deselect all leads" : `Select all ${totalItems} leads`}
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = selectedLeadIds.length > 0 && !isAllSelected;
                          }
                        }}
                        onChange={handleSelectAllLeads}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 transition"
                      />
                    </th>
                    <th className="py-3.5 px-6">Client Info</th>
                    <th className="py-3.5 px-6">Requirements</th>
                    <th className="py-3.5 px-6">Scheduled Visit</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold bg-white">
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Loading registered leads...</span>
                        </span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-red-500 font-semibold bg-white">
                        {error}
                      </td>
                    </tr>
                  ) : displayedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold bg-white">
                        No registered leads found.
                      </td>
                    </tr>
                  ) : (
                    displayedLeads.map(lead => (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          localStorage.setItem('selectedAdminLeadName', lead.customer_detail?.customer_name || '—');
                          navigate(`/admin/leads/${lead.id}`);
                        }}
                        className={`hover:bg-slate-50/50 transition cursor-pointer ${
                          selectedLeadIds.includes(lead.id) ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td
                          className="py-4 pl-5 pr-2 w-10 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select lead ${lead.id}`}
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(e) => handleToggleSelectLead(lead.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 transition"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-bold text-slate-800 block">{lead.customer_detail?.customer_name || '—'}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{lead.customer_detail?.mobile_number || '—'} &middot; {lead.customer_detail?.email || '—'}</span>
                        </td>
                        <td className="py-4 px-6">
                          {lead.customer_detail?.note || lead.unit_type || lead.budget ? (
                            <>
                              {lead.customer_detail?.note && (
                                <div className="flex items-start gap-1 max-w-[220px]">
                                  <Building className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">{lead.customer_detail.note}</span>
                                </div>
                              )}
                              {(lead.unit_type || lead.budget) && (
                                <span className="text-[10px] text-slate-400 block mt-1">
                                  {lead.unit_type || ''}
                                  {lead.unit_type && lead.budget ? ' · ' : ''}
                                  {lead.budget ? formatBudget(lead.budget) : ''}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          {lead.scheduled_visit_date || lead.scheduled_visit_time ? (
                            <>
                              {lead.scheduled_visit_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{formatDateDDMMYYYY(lead.scheduled_visit_date)}</span>
                                </div>
                              )}
                              {lead.scheduled_visit_time && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">{formatVisitTime(lead.scheduled_visit_time)}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-xs font-bold ${getStageTextColor(lead.stage)}`}>
                            {STAGE_LABELS[lead.stage] ?? 'Not Interested'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">
                          {formatDateRegistered(lead.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && leads.length > 0 && (
              <div className="py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <CustomSelect
                    options={['5', '10', '20']}
                    value={String(itemsPerPage)}
                    onChange={(val) => {
                      setItemsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    className="w-24"
                  />
                  <span>records per page</span>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                  <span>Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} records</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ADD LEAD MODAL */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-3xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 leading-tight">Add New Lead</h3>
                  <p className="text-[11px] font-medium text-slate-400">Register a new customer lead with property preferences & visit info</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddLeadModalOpen(false);
                  resetAddLeadForm();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Modal Form Body - Compact grid layout */}
            <form onSubmit={handleAddLeadSubmit} className="p-5 space-y-3 text-left">
              
              {/* Row 1: Customer Name, Mobile Number, Email Address (3 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Customer Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={addLeadName}
                      onChange={(e) => setAddLeadName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={addLeadMobile}
                      onChange={(e) => setAddLeadMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={addLeadEmail}
                      onChange={(e) => setAddLeadEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Project & Source Selection (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Project Selection */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Project
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={addLeadProjectId}
                      onChange={(e) => setAddLeadProjectId(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                    >
                      {uploadProjects.length === 0 ? (
                        <option value="">Loading Projects...</option>
                      ) : (
                        uploadProjects.map(p => (
                          <option key={p.id} value={String(p.id)}>{p.project_name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Source Selection */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addLeadSource}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddLeadSource(val);
                      if (val === 'Broker' && brokersList.length === 0) {
                        fetchBrokersForAddLead();
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="Direct / Walk-in">Direct / Walk-in</option>
                    <option value="Broker">Broker / Channel Partner</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Unified Searchable Broker Selection for Add Lead */}
              {addLeadSource === 'Broker' && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-blue-900 block">
                      Select Broker / Channel Partner <span className="text-red-500">*</span>
                    </label>
                    {loadingBrokers && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={brokerSearchQuery}
                        onFocus={() => {
                          setIsAddLeadBrokerDropdownOpen(true);
                          if (brokersList.length === 0) fetchBrokersForAddLead('');
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleBrokerSearchChange(val);
                          setAddLeadBrokerId('');
                          setIsAddLeadBrokerDropdownOpen(true);
                        }}
                        placeholder="Search and select broker by name, firm or phone..."
                        className={`w-full pl-8 pr-8 py-1.5 bg-white border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer ${
                          addLeadBrokerId ? 'border-emerald-500 bg-emerald-50/30' : 'border-blue-200'
                        }`}
                      />
                      {addLeadBrokerId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAddLeadBrokerId('');
                            setBrokerSearchQuery('');
                            fetchBrokersForAddLead('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>

                    {/* Floating Dropdown Results */}
                    {isAddLeadBrokerDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsAddLeadBrokerDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-blue-100 rounded-2xl shadow-2xl z-20 overflow-hidden text-left">
                          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 pr-0.5">
                            {brokersList.length === 0 ? (
                              <div className="p-3 text-center text-xs font-medium text-slate-400">
                                {loadingBrokers ? 'Searching brokers...' : 'No brokers found'}
                              </div>
                            ) : (
                              brokersList.map((b) => {
                                const isSelected = String(b.id) === String(addLeadBrokerId);
                                const name = b.name || b.broker_name || `Broker #${b.id}`;
                                const firm = b.company_name ? ` (${b.company_name})` : '';
                                const phone = b.mobile_number || b.contact_number || '';
                                const label = `${name}${firm}${phone ? ` - ${phone}` : ''}`;

                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      setAddLeadBrokerId(String(b.id));
                                      setBrokerSearchQuery(label);
                                      setIsAddLeadBrokerDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between cursor-pointer hover:bg-blue-50/60 ${
                                      isSelected ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-bold text-slate-800">{name} {firm && <span className="font-normal text-slate-500">{firm}</span>}</div>
                                      {phone && <div className="text-[10px] text-slate-400">{phone}</div>}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Referral Inputs */}
              {addLeadSource === 'Referral' && (
                <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-2xl animate-in fade-in duration-150">
                  <label className="text-[11px] font-bold text-purple-900 block mb-1.5">
                    Referral Details
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={addLeadReferredName}
                      onChange={(e) => setAddLeadReferredName(e.target.value)}
                      placeholder="Referred By Name"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="tel"
                      maxLength={10}
                      value={addLeadReferredMobile}
                      onChange={(e) => setAddLeadReferredMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="Referred Mobile"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="email"
                      value={addLeadReferredEmail}
                      onChange={(e) => setAddLeadReferredEmail(e.target.value)}
                      placeholder="Referred Email (Optional)"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Property Requirements & Preferences Section */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 block uppercase tracking-wider">
                  Property Preferences & Info
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Unit Type */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Unit Type</label>
                    <select
                      value={addLeadUnitType}
                      onChange={(e) => setAddLeadUnitType(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Any Configuration</option>
                      <option value="1 BHK">1 BHK</option>
                      <option value="2 BHK">2 BHK</option>
                      <option value="3 BHK">3 BHK</option>
                      <option value="4 BHK">4 BHK</option>
                      <option value="Studio">Studio</option>
                      <option value="Penthouse">Penthouse</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Shop">Shop</option>
                      <option value="Office">Office</option>
                      <option value="Plot">Plot</option>
                      <option value="Villa">Villa</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Budget Range</label>
                    <select
                      value={addLeadBudget}
                      onChange={(e) => setAddLeadBudget(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Any Budget</option>
                      <option value="< ₹40L">&lt; ₹40L</option>
                      <option value="₹40L - ₹60L">₹40L - ₹60L</option>
                      <option value="₹60L - ₹80L">₹60L - ₹80L</option>
                      <option value="₹80L - ₹1 Cr">₹80L - ₹1 Cr</option>
                      <option value="₹1 Cr - ₹1.5 Cr">₹1 Cr - ₹1.5 Cr</option>
                      <option value="₹1.5 Cr - ₹2 Cr">₹1.5 Cr - ₹2 Cr</option>
                      <option value="> ₹2 Cr">&gt; ₹2 Cr</option>
                    </select>
                  </div>

                  {/* Purpose of Buying */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Buying Purpose</label>
                    <select
                      value={addLeadPurposeOfBuying}
                      onChange={(e) => setAddLeadPurposeOfBuying(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Select Purpose</option>
                      <option value="End User">End User</option>
                      <option value="Investment">Investment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  {/* Source of Info */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Source of Information</label>
                    <select
                      value={addLeadSourceOfInfo}
                      onChange={(e) => setAddLeadSourceOfInfo(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Select Info Source...</option>
                      <option value="Hoarding / Billboard">Hoarding / Billboard</option>
                      <option value="Social Media (FB/IG/Google)">Social Media (FB/IG/Google)</option>
                      <option value="Newspaper / Print">Newspaper / Print</option>
                      <option value="Radio">Radio</option>
                      <option value="Friends & Family">Friends & Family</option>
                      <option value="Website">Website</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Residential Address */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Residential Address / City</label>
                    <input
                      type="text"
                      value={addLeadResidentialAddress}
                      onChange={(e) => setAddLeadResidentialAddress(e.target.value)}
                      placeholder="e.g. Bandra West, Mumbai"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Visit Details Section (Always Open & Mandatory) */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 block uppercase tracking-wider">
                  Visit & Sales Executive Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      When Visited (Date) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={addLeadVisitDate}
                      onChange={(e) => setAddLeadVisitDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      When Visited (Time) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={addLeadVisitTime}
                      onChange={(e) => setAddLeadVisitTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Who Attended (Sales Person) <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={addLeadAttendedBy}
                      onChange={(e) => setAddLeadAttendedBy(e.target.value)}
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-xl text-xs font-semibold focus:outline-none cursor-pointer transition ${
                        !addLeadAttendedBy ? 'border-amber-400 text-amber-700 bg-amber-50/40 font-bold' : 'border-emerald-200 text-slate-800 focus:border-emerald-500'
                      }`}
                    >
                      <option value="">Select Sales Person *...</option>
                      {assignedOptions.map(opt => (
                        <option key={opt.id} value={String(opt.id)}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={addLeadNotes}
                  onChange={(e) => setAddLeadNotes(e.target.value)}
                  placeholder="Enter lead requirements or comments..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Error Banner */}
              {addLeadError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{addLeadError}</span>
                </div>
              )}

              {/* Form Footer */}
              {(() => {
                const isAddLeadFormInvalid =
                  !addLeadName.trim() ||
                  addLeadMobile.trim().length !== 10 ||
                  isNaN(Number(addLeadMobile.trim())) ||
                  (addLeadSource === 'Broker' && !addLeadBrokerId) ||
                  !addLeadVisitDate ||
                  !addLeadVisitTime ||
                  !addLeadAttendedBy;

                return (
                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddLeadModalOpen(false);
                        resetAddLeadForm();
                      }}
                      disabled={addLeadSubmitting}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addLeadSubmitting || isAddLeadFormInvalid}
                      className={`px-5 py-1.5 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer ${
                        addLeadSubmitting || isAddLeadFormInvalid
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-300/60'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {addLeadSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Create Lead</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </form>

          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      <BulkImportLeadsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchLeads(
            debouncedSearchTerm,
            currentPage,
            itemsPerPage,
            selectedProject,
            selectedStage,
            {
              source: selectedSource,
              tag: selectedTag,
              dateFilterType: dateFilterType,
              customStartDate: customStartDate,
              customEndDate: customEndDate,
              assignedExecutive: selectedAssigned,
            }
          );
        }}
      />

      {/* EDIT LEAD DETAILS MODAL */}
      
      {/* Transfer Lead Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !transferLoading && setIsTransferModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-[101]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Transfer Lead</h2>
              <button
                onClick={() => !transferLoading && setIsTransferModalOpen(false)}
                className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto bg-slate-50/30">
              <div className="space-y-6">
                
                {/* Current Assignment Info Box */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 shadow-inner">
                      {selectedLead?.AssignedSalesExecutive?.name ? selectedLead.AssignedSalesExecutive.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Currently Assigned</p>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{selectedLead?.AssignedSalesExecutive?.name || 'Unassigned'}</p>
                    </div>
                  </div>
                  
                  {/* Transfer Arrow Icon */}
                  <div className="hidden sm:flex w-8 h-8 rounded-full bg-slate-50 shadow-sm border border-slate-200 items-center justify-center text-slate-400 shrink-0 relative z-10">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="sm:hidden flex w-full justify-center relative z-10">
                     <div className="w-6 h-6 rounded-full bg-slate-50 shadow-sm border border-slate-200 flex items-center justify-center text-slate-400">
                       <ArrowRight className="w-3 h-3 rotate-90" />
                     </div>
                  </div>

                  <div className="relative z-10 w-full sm:w-auto flex-1 sm:flex-none">
                     <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 shrink-0">
                             <UserPlus className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Transfer To</p>
                            <p className="text-xs font-bold text-slate-700">New Executive</p>
                         </div>
                     </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select New Sales Executive <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500 mb-4 font-medium">Choose the executive you want to transfer this lead to. They will be notified of this new assignment.</p>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedTransferExecutive}
                      onChange={(e) => setSelectedTransferExecutive(Number(e.target.value))}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all text-sm font-semibold text-slate-700 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="">Select an executive to transfer</option>
                      {assignedOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !transferLoading && setIsTransferModalOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                disabled={transferLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransferSubmit}
                disabled={!selectedTransferExecutive || transferLoading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                {transferLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isDeletingLead && setIsDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-[101]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Delete Lead?</h2>
              </div>
              <button
                onClick={() => !isDeletingLead && setIsDeleteModalOpen(false)}
                disabled={isDeletingLead}
                className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to delete lead{' '}
                <span className="font-bold text-slate-800">
                  {selectedLead?.lead_code || selectedLead?.lead_id || (selectedLead?.id ? `L-2026-${String(selectedLead.id).padStart(6, '0')}` : '—')}
                </span>{' '}
                ({selectedLead?.customer_detail?.customer_name || selectedLead?.customer_name || '—'})?
              </p>

              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <span className="font-bold text-amber-900">Warning:</span> This action will archive this lead and soft-delete all associated site visits, visit allocations, and bookings. The lead will no longer appear in active lists or lead pipelines.
                </p>
              </div>
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !isDeletingLead && setIsDeleteModalOpen(false)}
                disabled={isDeletingLead}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLead}
                disabled={isDeletingLead}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isDeletingLead ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Lead</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Leads Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-[101]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Delete Leads?</h2>
              </div>
              <button
                onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to delete the <span className="font-bold text-slate-800">{selectedLeadIds.length}</span> selected leads?
              </p>

              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <span className="font-bold text-amber-900">Warning:</span> This action will archive these leads and soft-delete all associated site visits, visit allocations, and bookings. The leads will no longer appear in active lists or lead pipelines.
                </p>
              </div>
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteLeads}
                disabled={isBulkDeleting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Leads...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Leads</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col transition-all">

            {/* Modal Header */}
            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">Edit Lead Details</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Update customer info and requirement details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Modal Body / Form - Compact 3-column layout without vertical scrollbar */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3 text-left">
              
              {/* Row 1: Customer Name, Mobile Number, Email Address (3 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editMobileNumber}
                    onChange={(e) => setEditMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Row 2: Source, Purpose, Expected Booking Duration (3 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editSource}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditSource(val);
                      if (val === 'Broker' && brokersList.length === 0) {
                        fetchBrokersForAddLead();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="Direct / Walk-in">Direct / Walk-in</option>
                    <option value="Broker">Broker / Channel Partner</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                    {editSource === 'Walk-In' && <option value="Walk-In">Walk-In</option>}
                    {editSource === 'Direct / Self' && <option value="Direct / Self">Direct / Self</option>}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Purpose</label>
                  <input
                    type="text"
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    placeholder="e.g. End User, Investment"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expected Booking</label>
                  <input
                    type="text"
                    value={editExpectedDuration}
                    onChange={(e) => setEditExpectedDuration(e.target.value)}
                    placeholder="e.g. 2 weeks, Immediate"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Unified Searchable Broker Selection for Edit Lead */}
              {editSource === 'Broker' && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-blue-900 block">
                      Select Broker / Channel Partner <span className="text-red-500">*</span>
                    </label>
                    {loadingBrokers && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={editBrokerSearchQuery}
                        onFocus={() => {
                          setIsEditBrokerDropdownOpen(true);
                          if (brokersList.length === 0) fetchBrokersForAddLead('');
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleEditBrokerSearchChange(val);
                          setEditBrokerId('');
                          setIsEditBrokerDropdownOpen(true);
                        }}
                        placeholder="Search and select broker by name, firm or phone..."
                        className={`w-full pl-8 pr-8 py-1.5 bg-white border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer ${
                          editBrokerId ? 'border-emerald-500 bg-emerald-50/30' : 'border-blue-200'
                        }`}
                      />
                      {editBrokerId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditBrokerId('');
                            setEditBrokerSearchQuery('');
                            fetchBrokersForAddLead('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>

                    {/* Floating Dropdown Results */}
                    {isEditBrokerDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsEditBrokerDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-blue-100 rounded-2xl shadow-2xl z-20 overflow-hidden text-left">
                          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 pr-0.5">
                            {brokersList.length === 0 ? (
                              <div className="p-3 text-center text-xs font-medium text-slate-400">
                                {loadingBrokers ? 'Searching brokers...' : 'No brokers found'}
                              </div>
                            ) : (
                              brokersList.map((b) => {
                                const isSelected = String(b.id) === String(editBrokerId);
                                const name = b.name || b.broker_name || `Broker #${b.id}`;
                                const firm = b.company_name ? ` (${b.company_name})` : '';
                                const phone = b.mobile_number || b.contact_number || '';
                                const label = `${name}${firm}${phone ? ` - ${phone}` : ''}`;

                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      setEditBrokerId(String(b.id));
                                      setEditBrokerSearchQuery(label);
                                      setIsEditBrokerDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between cursor-pointer hover:bg-blue-50/60 ${
                                      isSelected ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-bold text-slate-800">{name} {firm && <span className="font-normal text-slate-500">{firm}</span>}</div>
                                      {phone && <div className="text-[10px] text-slate-400">{phone}</div>}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Requirement Note */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Requirement Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Enter lead requirements or comments..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full History Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsHistoryDrawerOpen(false)}
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out shadow-2xl bg-white flex flex-col h-full rounded-l-3xl border-l border-slate-100">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50 rounded-tl-3xl">
                  <div>
                    <h2 className="text-base font-extrabold text-[#0F172A]">Activity History</h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                      Full interaction and system logs for lead
                    </p>
                  </div>
                  <button
                    onClick={() => setIsHistoryDrawerOpen(false)}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar">
                  {loadingActivities ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                      <span className="text-xs font-semibold">Loading history...</span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-slate-400 text-xs font-semibold">No activity logs recorded yet.</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-100 pl-6 space-y-6 ml-3">
                      {[...activities]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((act: any, index: number) => {
                          const config = getActivityConfig(act.type);
                          const IconComponent = config.Icon;
                          return (
                            <div key={act.id || index} className="relative flex items-start animate-fade-up" style={{ animationDelay: `${index * 0.03}s` }}>
                              <div className={`absolute -left-[38px] w-7 h-7 rounded-full border flex items-center justify-center ${config.color} shadow-xs z-10 ring-4 ring-white`}>
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-xs space-y-1 pl-2">
                                <span className="font-bold text-slate-800 uppercase tracking-wide block">
                                  {act.type}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium block leading-relaxed">
                                  {act.description}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                  {new Date(act.createdAt).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !noteLoading && setIsAddNoteModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col z-[101]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-800">Add Timeline Note</h3>
              </div>
              <button
                type="button"
                onClick={() => !noteLoading && setIsAddNoteModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNoteSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Note / Remark</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter detailed timeline note..."
                  value={noteInputText}
                  onChange={(e) => setNoteInputText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  disabled={noteLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={noteLoading || !noteInputText.trim()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {noteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {isAddReminderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !reminderLoading && setIsAddReminderModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col z-[101]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-800">Schedule Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => !reminderLoading && setIsAddReminderModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddReminderSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reminder Details / Note</label>
                <textarea
                  rows={3}
                  placeholder="Enter what to remind about..."
                  value={reminderNoteText}
                  onChange={(e) => setReminderNoteText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddReminderModalOpen(false)}
                  disabled={reminderLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reminderLoading || !reminderDateTime}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {reminderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !taskLoading && setIsAddTaskModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-[101]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-800">Assign New Lead Task</h3>
              </div>
              <button
                type="button"
                onClick={() => !taskLoading && setIsAddTaskModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTaskSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Task Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow-up Call for Floor Plan"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Task Description / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Enter task details..."
                  value={taskNoteText}
                  onChange={(e) => setTaskNoteText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  disabled={taskLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading || !taskName.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {taskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
