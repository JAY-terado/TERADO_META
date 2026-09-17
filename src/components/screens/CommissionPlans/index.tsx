import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../CustomSelect';

import { 
  Search, 
  Coins, 
  Calendar, 
  Eye, 
  X, 
  Loader2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Info,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Trash,
  Pencil
} from 'lucide-react';
import Swal from 'sweetalert2';

import { 
  getCommissionPlans, 
  createCommissionPlan, 
  deleteCommissionPlan,
  updateCommissionPlan
} from '../../../admin/api/commissions';
import type { 
  CommissionPlan, 
  CommissionTier, 
  CreateCommissionPlanPayload,
  UpdateCommissionPlanPayload
} from '../../../admin/api/commissions';

// Removed hardcoded fallback mock data

interface FormTierInput {
  minBookings: string;
  maxBookings: string;
  percentage: string;
  startDate: string;
  endDate: string;
}

export const CommissionPlans: React.FC = () => {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('comm_plans_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('comm_plans_itemsPerPage')) || 10);

  useEffect(() => {
    localStorage.setItem('comm_plans_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('comm_plans_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);
  
  // Selection/Modal states
  const [selectedPlan, setSelectedPlan] = useState<CommissionPlan | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Create Plan Form fields state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanType, setNewPlanType] = useState<'FLAT' | 'TIERED'>('FLAT');
  const [newBasePercentage, setNewBasePercentage] = useState('2.00');
  const [newTiers, setNewTiers] = useState<FormTierInput[]>([
    { minBookings: '', maxBookings: '', percentage: '', startDate: '', endDate: '' }
  ]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Plan Form fields state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<CommissionPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanStatus, setEditPlanStatus] = useState<number>(1);
  const [editPlanType, setEditPlanType] = useState<'FLAT' | 'TIERED'>('FLAT');
  const [editBasePercentage, setEditBasePercentage] = useState('2.00');
  const [editTiers, setEditTiers] = useState<FormTierInput[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Fetch commission plans
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await getCommissionPlans();
      if (response.success && response.data) {
        setPlans(response.data);
      } else {
        setPlans([]);
      }
    } catch (error) {
      console.error('Failed to fetch commission plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Delete Action
  const handleDeletePlan = (id: number, planName: string) => {
    Swal.fire({
      title: 'Delete Commission Plan?',
      text: `Are you sure you want to delete "${planName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await deleteCommissionPlan(id);
          if (res.success) {
            setPlans(prev => prev.filter(p => p.id !== id));
            Swal.fire({
              title: 'Deleted!',
              text: 'Commission plan has been deleted.',
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
          } else {
            Swal.fire({
              title: 'Failed to Delete',
              text: res.message || 'The server returned an error.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          Swal.fire({
            title: 'Error',
            text: err.response?.data?.message || err.message || 'An error occurred while deleting.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        }
      }
    });
  };

  // Edit actions
  const handleOpenEditModal = (plan: CommissionPlan) => {
    setEditPlan(plan);
    setEditPlanName(plan.planName);
    setEditPlanStatus(plan.active !== undefined ? plan.active : plan.status);
    setEditPlanType(plan.commissionType);
    setEditBasePercentage(plan.basePercentage || '2.00');
    setEditTiers(plan.tiers && plan.tiers.length > 0 ? [...plan.tiers]
      .sort((a, b) => a.minBookings - b.minBookings)
      .map(t => ({
        minBookings: t.minBookings.toString(),
        maxBookings: t.maxBookings === null || t.maxBookings === undefined ? '' : t.maxBookings.toString(),
        percentage: t.percentage.toString(),
        startDate: t.startDate ? t.startDate.split('T')[0] : '',
        endDate: t.endDate ? t.endDate.split('T')[0] : ''
      })) : [{ minBookings: '', maxBookings: '', percentage: '', startDate: '', endDate: '' }]);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlan) return;
    if (!editPlanName.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please enter a valid plan name.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    if (editPlanType === 'TIERED') {
      const errorMsg = validateTiersAndDates(editTiers);
      if (errorMsg) {
        Swal.fire({
          title: 'Validation Error',
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
        return;
      }
    }

    Swal.fire({
      title: 'Update Commission Plan?',
      text: `Are you sure you want to save changes to "${editPlanName}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, update plan'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const payload: UpdateCommissionPlanPayload = {
          planName: editPlanName,
          active: editPlanStatus,
          basePercentage: editPlanType === 'FLAT' ? Number(editBasePercentage) : null,
          tiers: editPlanType === 'TIERED' ? [...editTiers]
            .sort((a, b) => Number(a.minBookings) - Number(b.minBookings))
            .map(t => ({
              minBookings: Number(t.minBookings),
              maxBookings: t.maxBookings === '' || t.maxBookings === null ? null : Number(t.maxBookings),
              percentage: Number(t.percentage),
              startDate: t.startDate || null,
              endDate: t.endDate || null
            })) : []
        };

        setSubmittingEdit(true);
        try {
          const res = await updateCommissionPlan(editPlan.id, payload);
          if (res.success) {
            if (res.data) {
              setPlans(prev => prev.map(p => p.id === editPlan.id ? res.data! : p));
            } else {
              fetchPlans();
            }
            Swal.fire({
              title: 'Success!',
              text: 'Commission plan updated successfully.',
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
            setIsEditModalOpen(false);
            setEditPlan(null);
          } else {
            Swal.fire({
              title: 'Failed to Update',
              text: res.message || 'The server returned an error.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          Swal.fire({
            title: 'Error',
            text: err.response?.data?.message || err.message || 'An error occurred while updating.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        } finally {
          setSubmittingEdit(false);
        }
      }
    });
  };

  const handleTogglePlanActive = async (plan: CommissionPlan, currentActive: boolean) => {
    const nextActiveVal = currentActive ? 0 : 1;
    const actionText = nextActiveVal === 1 ? 'activate' : 'deactivate';
    
    Swal.fire({
      title: 'Change Status?',
      text: `Are you sure you want to ${actionText} the plan "${plan.planName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: `Yes, ${actionText} it`
    }).then(async (result) => {
      if (result.isConfirmed) {
        const payload: UpdateCommissionPlanPayload = {
          active: nextActiveVal
        };

        try {
          const res = await updateCommissionPlan(plan.id, payload);
          if (res.success) {
            Swal.fire({
              title: 'Success!',
              text: `Commission plan status updated successfully to ${nextActiveVal === 1 ? 'Active' : 'Inactive'}.`,
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
            if (res.data) {
              setPlans(prev => prev.map(p => p.id === plan.id ? res.data! : p));
            } else {
              fetchPlans();
            }
          } else {
            Swal.fire({
              title: 'Failed to Update Status',
              text: res.message || 'The server returned an error.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          Swal.fire({
            title: 'Error',
            text: err.response?.data?.message || err.message || 'An error occurred while updating status.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        }
      }
    });
  };

  // Form helper: dynamic tiers adjustments
  // Form helpers for dynamic tiers: auto-calculation and validation
  const getNextMinBookings = (tiersList: FormTierInput[]): string => {
    if (tiersList.length === 0) return '';
    const sorted = [...tiersList]
      .filter(t => t.minBookings !== '' && !isNaN(Number(t.minBookings)))
      .sort((a, b) => Number(a.minBookings) - Number(b.minBookings));
    
    const lastTier = sorted.length > 0 ? sorted[sorted.length - 1] : tiersList[tiersList.length - 1];
    if (lastTier && lastTier.maxBookings !== '' && !isNaN(Number(lastTier.maxBookings))) {
      return (Number(lastTier.maxBookings) + 1).toString();
    }
    return '';
  };

  const getTierErrors = (tier: FormTierInput, index: number, allTiers: FormTierInput[]): {
    minBookings?: string;
    maxBookings?: string;
    percentage?: string;
    startDate?: string;
    endDate?: string;
  } => {
    const errors: {
      minBookings?: string;
      maxBookings?: string;
      percentage?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    // 1. Min Bookings validation
    if (tier.minBookings === '') {
      errors.minBookings = 'Required';
    } else {
      const minVal = Number(tier.minBookings);
      if (isNaN(minVal) || minVal < 1 || !Number.isInteger(minVal)) {
        errors.minBookings = 'Must be integer >= 1';
      }
    }

    // 2. Max Bookings validation
    if (tier.maxBookings !== '') {
      const maxVal = Number(tier.maxBookings);
      if (isNaN(maxVal) || maxVal < 1 || !Number.isInteger(maxVal)) {
        errors.maxBookings = 'Must be positive integer';
      } else if (tier.minBookings !== '') {
        const minVal = Number(tier.minBookings);
        if (!isNaN(minVal) && maxVal <= minVal) {
          errors.maxBookings = `Must be > Min (${minVal})`;
        }
      }
    }

    // 3. Percentage Rate validation
    if (tier.percentage === '') {
      errors.percentage = 'Required';
    } else {
      const rateVal = Number(tier.percentage);
      if (isNaN(rateVal) || rateVal < 0) {
        errors.percentage = 'Must be >= 0';
      }
    }

    // 4. Start Date validation
    if (tier.startDate === '') {
      errors.startDate = 'Required';
    }

    // 5. End Date validation (optional)
    if (tier.endDate !== '' && tier.startDate !== '') {
      if (new Date(tier.startDate) > new Date(tier.endDate)) {
        errors.endDate = 'Cannot be before Start';
      }
    }

    // 6. Overlap/Transition check with previous tier
    if (index > 0) {
      const prevTier = allTiers[index - 1];
      if (prevTier && prevTier.maxBookings !== '') {
        const prevMax = Number(prevTier.maxBookings);
        const currMin = Number(tier.minBookings);
        if (!isNaN(prevMax) && !isNaN(currMin) && currMin !== prevMax + 1) {
          errors.minBookings = `Must start at ${prevMax + 1}`;
        }
      } else if (prevTier && prevTier.maxBookings === '') {
        errors.minBookings = 'Prev tier is uncapped';
      }
    }

    return errors;
  };

  const validateTiersAndDates = (tiersList: FormTierInput[]): string | null => {
    if (tiersList.length === 0) {
      return 'Please add at least one tier for a Tiered plan.';
    }

    for (let i = 0; i < tiersList.length; i++) {
      const t = tiersList[i];

      // 1. Basic field checks
      if (!t.minBookings || !t.percentage) {
        return `Please fill in Min Bookings and Rate (%) for Tier #${i + 1}.`;
      }

      const minVal = Number(t.minBookings);
      const rateVal = Number(t.percentage);

      if (isNaN(minVal) || minVal < 1 || !Number.isInteger(minVal)) {
        return `Tier #${i + 1} Min Bookings must be a positive integer starting from 1.`;
      }

      if (isNaN(rateVal) || rateVal < 0) {
        return `Tier #${i + 1} Rate (%) must be a valid non-negative percentage.`;
      }

      if (t.maxBookings !== '') {
        const maxVal = Number(t.maxBookings);
        if (isNaN(maxVal) || maxVal < 1 || !Number.isInteger(maxVal)) {
          return `Tier #${i + 1} Max Bookings must be a positive integer.`;
        }
        if (maxVal <= minVal) {
          return `Tier #${i + 1} Max Bookings must be strictly greater than Min Bookings (${minVal}).`;
        }
      }

      // 2. Date checks
      if (!t.startDate) {
        return `Please enter a Start Date for Tier #${i + 1}.`;
      }

      if (t.endDate && new Date(t.startDate) > new Date(t.endDate)) {
        return `Tier #${i + 1} Start Date cannot be after End Date.`;
      }
    }

    // 3. Overlap and sequence check (sort first to ensure correctness)
    const sorted = [...tiersList].sort((a, b) => Number(a.minBookings) - Number(b.minBookings));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (prev.maxBookings === '') {
        return `Tier with Min Bookings ${prev.minBookings} is uncapped (no Max Bookings), so no subsequent tiers can be added after it.`;
      }

      const prevMax = Number(prev.maxBookings);
      const currMin = Number(curr.minBookings);
      const expectedMin = prevMax + 1;

      if (currMin !== expectedMin) {
        return `The next tier (with Min Bookings ${currMin}) must start exactly at ${expectedMin} bookings (1 more than the previous tier's Max of ${prevMax}).`;
      }
    }

    return null;
  };

  const handleAddTierRow = () => {
    const nextMin = getNextMinBookings(newTiers);
    setNewTiers(prev => [...prev, { minBookings: nextMin, maxBookings: '', percentage: '', startDate: '', endDate: '' }]);
  };

  const handleRemoveTierRow = (index: number) => {
    setNewTiers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleTierInputChange = (index: number, field: keyof FormTierInput, value: string) => {
    setNewTiers(prev => prev.map((tier, idx) => {
      if (idx === index) {
        return { ...tier, [field]: value };
      }
      return tier;
    }));
  };

  const resetCreateForm = () => {
    setNewPlanName('');
    setNewPlanType('FLAT');
    setNewBasePercentage('2.00');
    setNewTiers([{ minBookings: '', maxBookings: '', percentage: '', startDate: '', endDate: '' }]);
    setIsCreateModalOpen(false);
  };

  // Submit creation payload
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please enter a valid plan name.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    if (newPlanType === 'TIERED') {
      const errorMsg = validateTiersAndDates(newTiers);
      if (errorMsg) {
        Swal.fire({
          title: 'Validation Error',
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
        return;
      }
    }

    // Ask for consent before hitting the API
    Swal.fire({
      title: 'Create Commission Plan?',
      text: `Are you sure you want to save and create "${newPlanName}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, create it'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const payload: CreateCommissionPlanPayload = {
          planName: newPlanName,
          commissionType: newPlanType,
          basePercentage: newPlanType === 'FLAT' ? Number(newBasePercentage) : null,
          active: 1,
          tiers: newPlanType === 'TIERED' ? [...newTiers]
            .sort((a, b) => Number(a.minBookings) - Number(b.minBookings))
            .map(t => ({
              minBookings: Number(t.minBookings),
              maxBookings: t.maxBookings === '' || t.maxBookings === null ? null : Number(t.maxBookings),
              percentage: Number(t.percentage),
              startDate: t.startDate || null,
              endDate: t.endDate || null
            })) : []
        };

        setSubmittingCreate(true);
        try {
          const res = await createCommissionPlan(payload);
          if (res.success) {
            if (res.data) {
              setPlans(prev => [res.data!, ...prev]);
            } else {
              fetchPlans();
            }
            Swal.fire({
              title: 'Success!',
              text: 'Commission plan created successfully.',
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
            resetCreateForm();
          } else {
            Swal.fire({
              title: 'Failed to Create',
              text: res.message || 'The server returned an error.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          Swal.fire({
            title: 'Error',
            text: err.response?.data?.message || err.message || 'An error occurred while creating.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        } finally {
          setSubmittingCreate(false);
        }
      }
    });
  };

  // Filter plans based on search term
  const filteredPlans = plans.filter(plan => {
    return plan.planName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           plan.id.toString().includes(searchTerm);
  });

  // Pagination logic
  const totalItems = filteredPlans.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPlans = filteredPlans.slice(indexOfFirstItem, indexOfLastItem);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Keep page within totalPages bounds
  useEffect(() => {
    const totalItems = filteredPlans.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredPlans.length, itemsPerPage, currentPage]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        const cleanStr = isoString.split('T')[0];
        const parts = cleanStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return cleanStr;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return '—';
    }
  };

  return (
    <div className="flex flex-col min-h-full gap-6 text-left relative">


      {/* Page Header Area */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <span>Manage Commission Plans</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Configure Flat rates, Tiered structures, and payout rules for channel partners</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>
      {/* Search and Plans List Container (Unified UI layout referencing project/broker screens) */}
      <div className="flex-1 flex flex-col bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-in stagger-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">Active Commission Plans</h3>
          
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search plans by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 text-slate-700"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-450 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs font-semibold">Fetching commission schemas...</span>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="py-12 text-center text-slate-450 flex flex-col items-center justify-center gap-3 border border-dashed border-slate-200 rounded-2xl">
            <Coins className="w-8 h-8 text-slate-200 mb-2" />
            <span className="text-slate-400 text-sm font-medium">No Commission Plans Found.</span>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4">
              {currentPlans.map((plan, index) => {
                const isActive = (plan.active !== undefined ? plan.active : plan.status) === 1;
                const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <div 
                    key={plan.id} 
                    className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">S.No. #{srNo}</span>
                        <h4 className="text-sm font-bold text-slate-800 mt-0.5">{plan.planName}</h4>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={isActive}
                            onChange={() => handleTogglePlanActive(plan, isActive)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                        </label>
                        <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                  <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Plan Type</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-lg text-[10px] font-bold ${
                        plan.commissionType === 'FLAT' 
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : 'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {plan.commissionType === 'FLAT' ? 'Flat rate' : 'Tiered structure'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Commission %</span>
                      <span className="text-slate-800 font-bold block mt-1">
                        {plan.commissionType === 'FLAT' ? `${plan.basePercentage}%` : 'Tiers Applied'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-450 font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Created {formatDate(plan.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.commissionType === 'TIERED' && (
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer press"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(plan)}
                        className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition rounded-lg border border-transparent hover:border-slate-150 cursor-pointer press"
                        title="Edit Plan"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id, plan.planName)}
                        className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 transition rounded-lg border border-transparent hover:border-red-100 cursor-pointer press"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout (matches styling of projects/brokers table containers) */}
            <div className="hidden md:block flex-1 overflow-x-auto -mx-6 border-t border-slate-100">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/75 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6 text-center w-16 bg-slate-50/70">S.No.</th>
                    <th className="py-4 px-6 bg-slate-50/70">Plan Details</th>
                    <th className="py-4 px-6 bg-slate-50/70">Type</th>
                    <th className="py-4 px-6 bg-slate-50/70">Base rate</th>
                    <th className="py-4 px-6 bg-slate-50/70">Status</th>
                    <th className="py-4 px-6 bg-slate-50/70">Created On</th>
                    <th className="py-4 px-6 text-right bg-slate-50/70">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                  {currentPlans.map((plan, index) => {
                    const isActive = (plan.active !== undefined ? plan.active : plan.status) === 1;
                    const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/40 transition duration-150">
                      <td className="py-4.5 px-6 text-center font-mono font-bold text-slate-400">
                        {srNo}
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="text-sm font-bold text-slate-800 block">{plan.planName}</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Author ID: {plan.createdBy}</span>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          plan.commissionType === 'FLAT' 
                            ? 'bg-sky-50 border-sky-100 text-sky-700' 
                            : 'bg-purple-50 border-purple-100 text-purple-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${plan.commissionType === 'FLAT' ? 'bg-sky-500' : 'bg-purple-500'}`} />
                          {plan.commissionType === 'FLAT' ? 'Flat rate' : 'Tiered structure'}
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        {plan.commissionType === 'FLAT' ? (
                          <span className="text-slate-855 font-black text-sm">{plan.basePercentage}%</span>
                        ) : (
                          <span className="text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            Tiered (% varies)
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={isActive}
                              onChange={() => handleTogglePlanActive(plan, isActive)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                          </label>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 text-slate-550 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(plan.createdAt)}</span>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {plan.commissionType === 'TIERED' ? (
                            <button
                              onClick={() => setSelectedPlan(plan)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-100 hover:border-purple-200 transition cursor-pointer press"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View {plan.tiers.length} Tiers</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-xl text-[10px] font-bold select-none mr-2">
                              <Info className="w-3.5 h-3.5 text-sky-500" />
                              Fixed {plan.basePercentage}% Rate
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(plan)}
                            className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition rounded-xl border border-transparent hover:border-slate-150 inline-flex items-center justify-center cursor-pointer press"
                            title="Edit Plan"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id, plan.planName)}
                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 transition rounded-xl border border-transparent hover:border-red-100 inline-flex items-center justify-center cursor-pointer press"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 pb-2">
              {/* Left: per-page selector */}
              <div className="flex items-center gap-2">
                <span>Show</span>
                <div className="relative flex items-center">
                  <CustomSelect
                options={['5', '10', '20']}
                value={String(itemsPerPage)}
                onChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
                className="w-24"
              />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
                </div>
                <span>records per page</span>
              </div>

              {/* Right: page nav + record count */}
              <div className="flex items-center gap-3">
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer text-xs"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-bold text-slate-600 text-xs">Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer text-xs"
                    >
                      Next
                    </button>
                  </div>
                )}
                <span className="text-slate-400 font-semibold">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} records
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE NEW COMMISSION PLAN DIALOG MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <header className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  Create Commission Plan
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Configure new payout guidelines
                </p>
              </div>
              <button 
                onClick={resetCreateForm}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition rounded-xl cursor-pointer border border-transparent"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Modal Body / Scroll Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                
                {/* Plan Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Plan Name <span className="text-red-500 ml-0.5">*</span></label>
                  <input
                    type="text"
                    required
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="e.g. Premium Tiered Plan"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-700 font-semibold"
                  />
                </div>

                {/* Plan Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Commission Type <span className="text-red-500 ml-0.5">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewPlanType('FLAT')}
                      className={`py-3 px-4 rounded-2xl border text-xs font-bold transition text-center cursor-pointer ${
                        newPlanType === 'FLAT'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      Flat rate
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlanType('TIERED')}
                      className={`py-3 px-4 rounded-2xl border text-xs font-bold transition text-center cursor-pointer ${
                        newPlanType === 'TIERED'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      Tiered structure
                    </button>
                  </div>
                </div>

                {/* Conditional Fields based on Plan Type */}
                {newPlanType === 'FLAT' ? (
                  <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Base Percentage (%) <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      required
                      value={newBasePercentage}
                      onChange={(e) => setNewBasePercentage(e.target.value)}
                      placeholder="e.g. 2.50"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-700 font-semibold"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configure Booking Tiers <span className="text-red-500 ml-0.5">*</span></label>
                      <button
                        type="button"
                        onClick={handleAddTierRow}
                        className="flex items-center gap-1 text-[10px] font-black text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Tier</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {newTiers.map((tier, index) => {
                        const errors = getTierErrors(tier, index, newTiers);
                        return (
                          <div key={index} className="flex gap-2.5 items-start p-3 bg-slate-50 border border-slate-200/60 rounded-2xl relative w-full">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                {/* Min Bookings */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Min Bookings</span>
                                  <input
                                    type="number"
                                    required
                                    value={tier.minBookings}
                                    onChange={(e) => handleTierInputChange(index, 'minBookings', e.target.value)}
                                    placeholder="1"
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-slate-700 font-bold transition-colors focus:border-blue-500 ${
                                      errors.minBookings ? 'border-red-500' : 'border-slate-200'
                                    }`}
                                  />
                                  {errors.minBookings && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.minBookings}</p>
                                  )}
                                </div>
                                
                                {/* Max Bookings */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Max Bookings</span>
                                  <input
                                    type="number"
                                    value={tier.maxBookings}
                                    onChange={(e) => handleTierInputChange(index, 'maxBookings', e.target.value)}
                                    placeholder="Uncapped"
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-slate-700 font-bold transition-colors focus:border-blue-500 ${
                                      errors.maxBookings ? 'border-red-500' : 'border-slate-200'
                                    }`}
                                  />
                                  {errors.maxBookings && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.maxBookings}</p>
                                  )}
                                </div>

                                {/* Rate */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Rate (%)</span>
                                  <input
                                    type="text"
                                    required
                                    value={tier.percentage}
                                    onChange={(e) => handleTierInputChange(index, 'percentage', e.target.value)}
                                    placeholder="1.50"
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-slate-700 font-bold transition-colors focus:border-blue-500 ${
                                      errors.percentage ? 'border-red-500' : 'border-slate-200'
                                    }`}
                                  />
                                  {errors.percentage && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.percentage}</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Start Date */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Start Date *</span>
                                  <input
                                    type="date"
                                    required
                                    value={tier.startDate || ''}
                                    onChange={(e) => handleTierInputChange(index, 'startDate', e.target.value)}
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold cursor-pointer transition-colors focus:border-blue-500 ${
                                      errors.startDate ? 'border-red-500' : 'border-slate-200'
                                    } ${tier.startDate ? 'text-slate-700' : 'text-slate-700/40'}`}
                                  />
                                  {errors.startDate && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.startDate}</p>
                                  )}
                                </div>

                                {/* End Date */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">End Date (Optional)</span>
                                  <input
                                    type="date"
                                    value={tier.endDate || ''}
                                    min={tier.startDate || ''}
                                    onChange={(e) => handleTierInputChange(index, 'endDate', e.target.value)}
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold cursor-pointer transition-colors focus:border-blue-500 ${
                                      errors.endDate ? 'border-red-500' : 'border-slate-200'
                                    } ${tier.endDate ? 'text-slate-700' : 'text-slate-700/40'}`}
                                  />
                                  {errors.endDate && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.endDate}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Delete tier row */}
                            {newTiers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTierRow(index)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition shrink-0 self-end mb-0.5"
                                title="Remove Tier Row"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Submit button inside form but hidden, triggered by footer */}
                <button type="submit" id="create-plan-submit-btn" className="hidden" />
              </form>
            </div>

            {/* Modal Footer */}
            <footer className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={resetCreateForm}
                disabled={submittingCreate}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingCreate}
                onClick={() => document.getElementById('create-plan-submit-btn')?.click()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 press"
              >
                {submittingCreate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Save Plan</span>
                )}
              </button>
            </footer>

          </div>
        </div>
      )}

      {/* EDIT COMMISSION PLAN DIALOG MODAL */}
      {isEditModalOpen && editPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <header className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  Edit Commission Plan
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Update payout guidelines (ID: #{editPlan.id})
                </p>
              </div>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition rounded-xl cursor-pointer border border-transparent"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Modal Body / Scroll Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                
                {/* Plan Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Plan Name <span className="text-red-500 ml-0.5">*</span></label>
                  <input
                    type="text"
                    required
                    value={editPlanName}
                    onChange={(e) => setEditPlanName(e.target.value)}
                    placeholder="e.g. Premium Tiered Plan"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-700 font-semibold"
                  />
                </div>

                {/* Status Toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Plan Status <span className="text-red-500 ml-0.5">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditPlanStatus(1)}
                      className={`py-2.5 px-4 rounded-2xl border text-xs font-bold transition text-center cursor-pointer ${
                        editPlanStatus === 1
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPlanStatus(0)}
                      className={`py-2.5 px-4 rounded-2xl border text-xs font-bold transition text-center cursor-pointer ${
                        editPlanStatus === 0
                          ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                {/* Plan Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commission Type (Cannot change type)</label>
                  <div className="px-4 py-2.5 bg-slate-105 border border-slate-200 rounded-xl text-xs text-slate-550 font-bold capitalize">
                    {editPlanType === 'FLAT' ? 'Flat rate' : 'Tiered structure'}
                  </div>
                </div>

                {/* Conditional Fields based on Plan Type */}
                {editPlanType === 'FLAT' ? (
                  <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Base Percentage (%) <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      required
                      value={editBasePercentage}
                      onChange={(e) => setEditBasePercentage(e.target.value)}
                      placeholder="e.g. 2.50"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-700 font-semibold"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configure Booking Tiers <span className="text-red-500 ml-0.5">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMin = getNextMinBookings(editTiers);
                          setEditTiers(prev => [...prev, { minBookings: nextMin, maxBookings: '', percentage: '', startDate: '', endDate: '' }]);
                        }}
                        className="flex items-center gap-1 text-[10px] font-black text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Tier</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {editTiers.map((tier, index) => {
                        const errors = getTierErrors(tier, index, editTiers);
                        return (
                          <div key={index} className="flex gap-2.5 items-start p-3 bg-slate-50 border border-slate-200/60 rounded-2xl relative w-full">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                {/* Min Bookings */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Min Bookings</span>
                                  <input
                                    type="number"
                                    required
                                    value={tier.minBookings}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTiers(prev => prev.map((t, idx) => idx === index ? { ...t, minBookings: val } : t));
                                    }}
                                    placeholder="1"
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-slate-700 font-bold transition-colors focus:border-blue-500 ${
                                      errors.minBookings ? 'border-red-500' : 'border-slate-200'
                                    }`}
                                  />
                                  {errors.minBookings && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.minBookings}</p>
                                  )}
                                </div>
                                
                                {/* Max Bookings */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Max Bookings</span>
                                  <input
                                    type="number"
                                    value={tier.maxBookings}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTiers(prev => prev.map((t, idx) => idx === index ? { ...t, maxBookings: val } : t));
                                    }}
                                    placeholder="Uncapped"
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-slate-700 font-bold transition-colors focus:border-blue-500 ${
                                      errors.maxBookings ? 'border-red-500' : 'border-slate-200'
                                    }`}
                                  />
                                  {errors.maxBookings && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.maxBookings}</p>
                                  )}
                                </div>

                                {/* Rate */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Rate (%)</span>
                                  <input
                                    type="text"
                                    required
                                    value={tier.percentage}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTiers(prev => prev.map((t, idx) => idx === index ? { ...t, percentage: val } : t));
                                    }}
                                    placeholder="1.50"
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs text-slate-700 font-bold transition-colors focus:border-blue-500 ${
                                      errors.percentage ? 'border-red-500' : 'border-slate-200'
                                    }`}
                                  />
                                  {errors.percentage && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.percentage}</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Start Date */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Start Date *</span>
                                  <input
                                    type="date"
                                    required
                                    value={tier.startDate || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTiers(prev => prev.map((t, idx) => idx === index ? { ...t, startDate: val } : t));
                                    }}
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold cursor-pointer transition-colors focus:border-blue-500 ${
                                      errors.startDate ? 'border-red-500' : 'border-slate-200'
                                    } ${tier.startDate ? 'text-slate-700' : 'text-slate-700/40'}`}
                                  />
                                  {errors.startDate && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.startDate}</p>
                                  )}
                                </div>

                                {/* End Date */}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">End Date (Optional)</span>
                                  <input
                                    type="date"
                                    value={tier.endDate || ''}
                                    min={tier.startDate || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTiers(prev => prev.map((t, idx) => idx === index ? { ...t, endDate: val } : t));
                                    }}
                                    className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold cursor-pointer transition-colors focus:border-blue-500 ${
                                      errors.endDate ? 'border-red-500' : 'border-slate-200'
                                    } ${tier.endDate ? 'text-slate-700' : 'text-slate-700/40'}`}
                                  />
                                  {errors.endDate && (
                                    <p className="text-red-500 text-[9px] font-semibold mt-0.5 leading-tight">{errors.endDate}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Delete tier row */}
                            {editTiers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setEditTiers(prev => prev.filter((_, idx) => idx !== index))}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition shrink-0 self-end mb-0.5"
                                title="Remove Tier Row"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Submit button inside form but hidden, triggered by footer */}
                <button type="submit" id="edit-plan-submit-btn" className="hidden" />
              </form>
            </div>

            {/* Modal Footer */}
            <footer className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setEditPlan(null); }}
                disabled={submittingEdit}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingEdit}
                onClick={() => document.getElementById('edit-plan-submit-btn')?.click()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 press"
              >
                {submittingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Plan</span>
                )}
              </button>
            </footer>

          </div>
        </div>
      )}

      {/* DETAILED TIERS LIST DIALOG MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <header className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-purple-600 bg-purple-550/10 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-widest block w-fit">
                  Tier structure details
                </span>
                <h3 className="text-base font-extrabold text-[#0F172A] mt-1.5">
                  {selectedPlan.planName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPlan(null)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition rounded-xl cursor-pointer border border-transparent"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                This tiered plan allocates different commission percentages depending on total broker booking completions:
              </p>

              {/* Tiers display list */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-2 bg-slate-100/60 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider py-2.5 px-4.5">
                  <span>Booking Range</span>
                  <span className="text-right">Commission Rate</span>
                </div>

                <div className="divide-y divide-slate-150/70 font-bold text-xs text-slate-700">
                  {selectedPlan.tiers
                    .sort((a, b) => a.minBookings - b.minBookings)
                    .map((tier) => (
                      <div key={tier.id} className="py-3 px-4.5 hover:bg-slate-100/20 transition flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-800">
                            {tier.maxBookings === null 
                              ? `${tier.minBookings}+ bookings` 
                              : `${tier.minBookings} – ${tier.maxBookings} bookings`
                            }
                          </span>
                          <span className="text-right text-emerald-600 font-extrabold text-sm">
                            {tier.percentage}%
                          </span>
                        </div>
                        {(tier.startDate || tier.endDate) && (
                          <div className="text-[10px] text-slate-400 font-medium flex gap-2 mt-0.5">
                            {tier.startDate && <span>Starts: {formatDate(tier.startDate)}</span>}
                            {tier.endDate && <span>Ends: {formatDate(tier.endDate)}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="p-6 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedPlan(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer press"
              >
                Close Details
              </button>
            </footer>

          </div>
        </div>
      )}
    </div>
  );
};
