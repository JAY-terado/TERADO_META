import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/CustomSelect';

import { 
  User, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Search, 
  UserPlus, 
  ArrowLeft, 
  Check, 
  Loader2, 
  X, 
  Building, 
  Users, 
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  Trash2,
  Edit3,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  requestUserCreationOtp, 
  verifyUserCreationOtp, 
  createInternalUser,
  getUsers,
  deactivateUser,
  getUserDetail,
  updateInternalUser
} from '../api/users';
import type { UserApiResponse } from '../api/users';
import { getStates, getCities, type State } from '../../pages/api/masters';
import { getProjectsDropdownList, type ProjectDropdownItem } from '../../pages/api/projects';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { useAdminUsersQuery } from '../hooks/useAdminQueries';
import { useProjectsDropdownQuery } from '../../hooks/useSharedQueries';


export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useBrokerConnect();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('admin_users_searchTerm') || '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // React State for Dynamic List Updates
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('admin_users_currentPage')) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('admin_users_itemsPerPage')) || 10);
  const [totalCount, setTotalCount] = useState(0);

  // Persist admin users filters to localStorage
  useEffect(() => {
    localStorage.setItem('admin_users_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('admin_users_currentPage', String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('admin_users_itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  // Keep page within totalPages bounds
  useEffect(() => {
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalCount, itemsPerPage, currentPage]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const {
    data: usersQueryData,
    isLoading: isUsersQueryLoading,
    refetch: refetchUsers,
  } = useAdminUsersQuery(debouncedSearch, 1, 1000, selectedProjectId);

  useEffect(() => {
    if (usersQueryData?.success && usersQueryData?.data) {
      setUsers(usersQueryData.data);
      setTotalCount(usersQueryData.count || (usersQueryData as any).total || usersQueryData.data.length);
    }
  }, [usersQueryData]);

  useEffect(() => {
    setLoadingUsers(isUsersQueryLoading);
  }, [isUsersQueryLoading]);

  const loadUsers = async () => {
    await refetchUsers();
  };

  // Reset page when project changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId]);

  // Modal & Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'receptionist' | 'sales' | 'calling' | 'none'>('none');

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // New Form Fields State
  const [formGender, setFormGender] = useState('');
  const [formAddressLine1, setFormAddressLine1] = useState('');
  const [formAddressLine2, setFormAddressLine2] = useState('');
  const [formState, setFormState] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formProjectId, setFormProjectId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formAlternateNumber, setFormAlternateNumber] = useState('');

  const { data: projectsDropdownData, isLoading: projectsLoading } = useProjectsDropdownQuery();
  const projectsList = projectsDropdownData || [];
  const isProjectsEmpty = !projectsLoading && projectsList.length === 0;

  // Real-time field validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const setFieldErr = (field: string, msg: string) =>
    setFormErrors(prev => ({ ...prev, [field]: msg }));
  const clearFieldErr = (field: string) =>
    setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // Validators
  const validateName = (v: string) => {
    if (!v.trim()) return 'Full Name is required';
    if (v.trim().length < 2) return 'Name must be at least 2 characters';
    return '';
  };
  const validateEmail = (v: string) => {
    if (!v.trim()) return 'Email Address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address';
    return '';
  };
  const validatePhone = (v: string) => {
    if (!v.trim()) return 'Phone Number is required';
    if (!/^[0-9]{10}$/.test(v.replace(/\s/g, ''))) return 'Phone must be exactly 10 digits';
    return '';
  };
  const validatePincode = (v: string) => {
    if (!v.trim()) return 'Pincode is required';
    if (!/^\d{6}$/.test(v.trim())) return 'Pincode must be exactly 6 digits';
    return '';
  };

  // State / City API Options
  const [statesList, setStatesList] = useState<State[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Verification Simulation States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isEmailVerifiedAnim, setIsEmailVerifiedAnim] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isPhoneVerifiedAnim, setIsPhoneVerifiedAnim] = useState(false);
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [phoneOtpStep, setPhoneOtpStep] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [isPhoneVerifying, setIsPhoneVerifying] = useState(false);

  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const phoneInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (emailOtpStep && emailInputRef.current) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 150);
    }
  }, [emailOtpStep]);

  useEffect(() => {
    if (phoneOtpStep && phoneInputRef.current) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 150);
    }
  }, [phoneOtpStep]);

  // Fetch all states on mount
  useEffect(() => {
    const loadStates = async () => {
      setStatesLoading(true);
      try {
        const res = await getStates();
        if (res.success) {
          setStatesList(res.data);
          setStateOptions(res.data.map(s => s.state_name));
        }
      } catch { /* silent */ } finally {
        setStatesLoading(false);
      }
    };
    loadStates();
  }, []);

  // Fetch cities when state changes
  useEffect(() => {
    if (!formState) {
      setCityOptions([]);
      return;
    }
    const selectedStateObj = statesList.find(s => s.state_name === formState);
    const stateId = selectedStateObj ? selectedStateObj.id : undefined;
    if (!stateId) return;
    const loadCities = async () => {
      setCitiesLoading(true);
      try {
        const res = await getCities(stateId);
        if (res.success) setCityOptions(res.data.map(c => c.city_name));
      } catch { /* silent */ } finally {
        setCitiesLoading(false);
      }
    };
    loadCities();
  }, [formState, statesList]);

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setEmailOtp(val);
      if (val.length === 6) {
        confirmVerifyEmail(val);
      } else {
        setEmailOtpError('');
      }
    }
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setPhoneOtp(val);
      if (val.length === 6) {
        confirmVerifyPhone(val);
      } else {
        setPhoneOtpError('');
      }
    }
  };

  // Form Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [newlyAddedUserName, setNewlyAddedUserName] = useState('');

  const getDisplayRole = (role?: string) => {
    if (!role) return 'Broker';
    if (role === 'RECEIPTIONIST' || role === 'RECEPTIONIST') return 'Receptionist';
    if (role === 'SALES') return 'Sales Agent';
    if (role === 'CALLING') return 'Calling Agent';
    if (role === 'ADMIN') return 'Administrator';
    return role;
  };

  const filteredStaff = users.map(u => ({
    id: u.id,
    name: u.broker_name || u.full_name || 'N/A',
    role: getDisplayRole(u.role),
    email: u.email,
    phone: u.mobile_number || u.contact_number || 'N/A'
  }));

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const adjustedPage = Math.min(currentPage, Math.max(totalPages, 1));

  const paginatedStaff = filteredStaff.slice(
    (adjustedPage - 1) * itemsPerPage,
    adjustedPage * itemsPerPage
  );

  const handleDeleteUser = (id: number, email: string) => {
    Swal.fire({
      title: 'Remove Staff Member?',
      text: 'Are you sure you want to remove this staff member?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, remove them'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await deactivateUser(id);
          if (res.success) {
            setUsers(prev => prev.filter(u => u.email !== email));
            Swal.fire({
              title: 'Removed!',
              text: 'Staff member has been removed.',
              icon: 'success',
              confirmButtonColor: '#3B82F6'
            });
          } else {
            Swal.fire({
              title: 'Error',
              text: res.message || 'Failed to remove staff member.',
              icon: 'error',
              confirmButtonColor: '#EF4444'
            });
          }
        } catch (err: any) {
          Swal.fire({
            title: 'Error',
            text: err.message || 'An error occurred while removing the staff member.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        }
      }
    });
  };

  const handleEditClick = async (u: any) => {
    Swal.fire({
      title: 'Loading user details...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await getUserDetail(u.id);
      Swal.close();

      if (res.success && res.data) {
        const details = res.data;
        setEditingUserId(details.id);
        setFormName(details.full_name || '');
        setFormEmail(details.email || '');
        setFormPhone(details.contact_number || '');
        
        // Populate basic_details
        const basic = details.basic_details;
        setFormGender(basic?.gender || '');
        setFormAddressLine1(basic?.address_line_1 || '');
        setFormAddressLine2(basic?.address_line_2 || '');
        setFormState(basic?.state || '');
        setFormCity(basic?.city || '');
        setFormPincode(basic?.pincode || '');
        setFormAlternateNumber(basic?.alternate_number || '');
        
        // Resolve project_id
        const projId = details.assigned_projects?.[0]?.id || null;
        setFormProjectId(projId);

        // Resolve role selection
        const role = (details.role || '').toUpperCase();
        if (role === 'RECEIPTIONIST' || role === 'RECEPTIONIST') {
          setSelectedRole('receptionist');
        } else if (role === 'SALES') {
          setSelectedRole('sales');
        } else if (role === 'CALLING') {
          setSelectedRole('calling');
        } else {
          setSelectedRole('none');
        }

        // Open the modal
        setIsAddModalOpen(true);
      } else {
        Swal.fire({
          title: 'Error',
          text: res.message || 'Failed to load user profile.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (err: any) {
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: err.message || 'Failed to load user details.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setIsEmailVerified(false);
    setIsPhoneVerified(false);
    setEmailOtpStep(false);
    setPhoneOtpStep(false);
    setEmailOtp('');
    setPhoneOtp('');
    setEmailOtpError('');
    setPhoneOtpError('');
    setSelectedRole('none');
    setIsAddModalOpen(false);
    setFormGender('');
    setFormAddressLine1('');
    setFormAddressLine2('');
    setFormState('');
    setFormCity('');
    setFormPincode('');
    setFormProjectId(null);
    setFormErrors({});
    setEditingUserId(null);
    setFormAlternateNumber('');
  };

  const handleRedirectToAddProject = () => {
    resetForm();
    navigate('/admin/projects', { state: { openAddModal: true } });
  };

  // API Integrated Verification Actions
  const handleVerifyEmailClick = async () => {
    if (!formEmail) return;
    setIsEmailVerifying(true);
    setEmailOtpError('');
    try {
      const res = await requestUserCreationOtp(formEmail);
      if (res.success) {
        setEmailOtpStep(true);
      } else {
        setEmailOtpError(res.message || 'Failed to request OTP');
      }
    } catch (err: any) {
      setEmailOtpError(err.response?.data?.message || err.message || 'Failed to request OTP');
    } finally {
      setIsEmailVerifying(false);
    }
  };

  const handleVerifyPhoneClick = () => {
    if (!formPhone) return;
    setIsPhoneVerifying(true);
    setPhoneOtpError('');
    setTimeout(() => {
      setIsPhoneVerifying(false);
      setIsPhoneVerified(true);
    }, 1000);
  };

  const confirmVerifyEmail = async (overrideOtp?: string) => {
    const finalOtp = overrideOtp || emailOtp;
    if (!finalOtp) return;
    setEmailOtpError('');
    try {
      const res = await verifyUserCreationOtp(formEmail, Number(finalOtp));
      if (res.success) {
        setIsEmailVerifiedAnim(true);
        setEmailOtpError('');
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsEmailVerified(true);
        setEmailOtpStep(false);
        setIsEmailVerifiedAnim(false);
      } else {
        setEmailOtpError(res.message || 'Invalid OTP code.');
        setEmailOtp('');
      }
    } catch (err: any) {
      setEmailOtpError(err.response?.data?.message || err.message || 'Invalid OTP code.');
      setEmailOtp('');
    }
  };

  const confirmVerifyPhone = async (overrideOtp?: string) => {
    setIsPhoneVerified(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Run full validation pass
    const errors: Record<string, string> = {};
    if (!formProjectId) errors.project = 'Please assign a project';
    const nameErr = validateName(formName);
    if (nameErr) errors.name = nameErr;
    const emailErr = validateEmail(formEmail);
    if (emailErr) errors.email = emailErr;
    const phoneErr = validatePhone(formPhone);
    if (phoneErr) errors.phone = phoneErr;
    if (!formGender) errors.gender = 'Gender is required';
    const pincodeErr = validatePincode(formPincode);
    if (pincodeErr) errors.pincode = pincodeErr;
    if (!formAddressLine1.trim()) errors.addressLine1 = 'Address Line 1 is required';
    if (!formState) errors.state = 'State is required';
    if (!formCity) errors.city = 'City is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    if (editingUserId !== null) {
      const result = await Swal.fire({
        title: 'Update User Details?',
        text: 'Are you sure you want to update this staff member\'s profile?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1A56DB',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Yes, update',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        setIsSubmitting(false);
        return;
      }

      try {
        const payload: any = {
          full_name: formName,
          contact_number: formPhone,
          email: formEmail,
          role: (selectedRole === 'receptionist' ? 'RECEIPTIONIST' : selectedRole === 'sales' ? 'SALES' : 'CALLING') as 'RECEIPTIONIST' | 'SALES' | 'CALLING',
          project_id: formProjectId,
          address_line_1: formAddressLine1 || undefined,
          address_line_2: formAddressLine2 || undefined,
          state: formState || undefined,
          city: formCity || undefined,
          pincode: formPincode || undefined,
          gender: formGender || undefined,
          alternate_number: formAlternateNumber || undefined
        };

        const res = await updateInternalUser(editingUserId, payload);
        if (res.success) {
          Swal.fire({
            title: 'Updated!',
            text: 'User profile details updated successfully.',
            icon: 'success',
            confirmButtonColor: '#1A56DB',
            timer: 2000,
            showConfirmButton: false
          });
          resetForm();
          loadUsers();
        } else {
          Swal.fire({
            title: 'Error',
            text: res.message || 'Failed to update user details.',
            icon: 'error',
            confirmButtonColor: '#EF4444'
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: 'Error',
          text: err.response?.data?.message || err.message || 'An error occurred during profile update.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    try {
      const payload: any = {
        full_name: formName,
        contact_number: formPhone,
        email: formEmail,
        role: (selectedRole === 'receptionist' ? 'RECEIPTIONIST' : selectedRole === 'sales' ? 'SALES' : 'CALLING') as 'RECEIPTIONIST' | 'SALES' | 'CALLING',
        address_line_1: formAddressLine1 || undefined,
        address_line_2: formAddressLine2 || undefined,
        state: formState || undefined,
        city: formCity || undefined,
        pincode: formPincode || undefined,
        gender: formGender || undefined,
        ...(formProjectId ? { project_id: formProjectId } : {}),
      };

      const res = await createInternalUser(payload);
      if (res.success) {
        const displayRole = selectedRole === 'receptionist' ? 'Receptionist' : selectedRole === 'sales' ? 'Sales Agent' : 'Calling Agent';
        
        // Add user to local state table and reload
        setUsers(prev => [
          ...prev,
          {
            id: res.user?.id || Date.now(),
            full_name: res.user?.full_name || formName,
            role: res.user?.role || (selectedRole === 'receptionist' ? 'RECEIPTIONIST' : selectedRole === 'sales' ? 'SALES' : 'CALLING'),
            email: res.user?.email || formEmail,
            contact_number: res.user?.contact_number || formPhone
          }
        ]);
        loadUsers();

        setNewlyAddedUserName(formName);
        setShowSuccessToast(true);
        resetForm();

        // Automatically dismiss success toast
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 4000);
      } else {
        Swal.fire({
          title: 'Error',
          text: res.message || 'Failed to create user account',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.message || err.message || 'An error occurred during account creation.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full gap-6 text-left relative">
      {/* Toast Notification for Success User Addition */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-6 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <span className="text-xs font-black block">Staff Member Created</span>
            <span className="text-[10px] text-slate-400 font-semibold block">{newlyAddedUserName} added to active rosters.</span>
          </div>
          <button 
            onClick={() => setShowSuccessToast(false)}
            className="ml-2 text-slate-500 hover:text-slate-350 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header Area */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">User &amp; Staff Management</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Control login permissions, assign staff roles, and audit user accesses</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            />
          </div>
          
          {/* Add User trigger CTA button */}
          <button
            onClick={() => {
              setEditingUserId(null);
              resetForm();
              setSelectedRole('none');
              setIsAddModalOpen(true);
            }}
            className="shrink-0 flex items-center justify-center gap-2 px-4.5 py-2.5 bg-[#1A56DB] hover:bg-[#1548C0] text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="md:hidden space-y-4">
        {loadingUsers && users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading user roster...</span>
            </span>
          </div>
        ) : filteredStaff.length > 0 ? (
          paginatedStaff.map((u, index) => (
            <div key={index} onClick={() => navigate(`/admin/users/${u.id}`)} className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition flex flex-col gap-3 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{u.name}</h4>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 rounded-full text-[10px] font-bold border ${
                      u.role === 'Administrator' 
                        ? 'bg-rose-50 border-rose-100 text-rose-700'
                        : u.role === 'Receptionist'
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        : u.role === 'Calling Agent'
                        ? 'bg-orange-50 border-orange-100 text-orange-700'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{u.role}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100/60 pt-2.5 flex flex-col gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-semibold">{u.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold">{u.phone}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 font-medium">
            No staff or users matching your search term.
          </div>
        )}
      </div>

      {/* Users and Staff List Table Card (Desktop only) */}
      <div className="hidden md:flex flex-col flex-1 bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Name</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Email Address</th>
                <th className="py-3.5 px-6">Phone Number</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {filteredStaff.length > 0 ? (
                paginatedStaff.map((u, index) => (
                  <tr key={index} onClick={() => navigate(`/admin/users/${u.id}`)} className="hover:bg-slate-50/60 transition-colors cursor-pointer even:bg-slate-50/30 anim-fade-up">
                    <td className="py-4 px-6 flex items-center gap-2.5">
                      <div className="p-2 bg-blue-550/10 text-blue-600 rounded-lg">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">{u.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === 'Administrator' 
                          ? 'bg-rose-50 border-rose-100 text-rose-700'
                          : u.role === 'Receptionist'
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                          : u.role === 'Calling Agent'
                          ? 'bg-orange-50 border-orange-100 text-orange-700'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-550">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-550">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{u.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition cursor-pointer border border-blue-100 inline-flex items-center justify-center press"
                          title="Edit user"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    {loadingUsers ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Loading user roster...</span>
                      </span>
                    ) : (
                      "No staff or users matching your search term."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loadingUsers && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-6 pb-4">
            {/* Left: per-page selector */}
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

            {/* Right: page nav + record count */}
            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={adjustedPage === 1}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-600">Page {adjustedPage} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={adjustedPage === totalPages}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-bold transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
              <span className="text-slate-400 font-semibold">
                Showing {Math.min((adjustedPage - 1) * itemsPerPage + 1, totalCount)}–{Math.min(adjustedPage * itemsPerPage, totalCount)} of {totalCount} records
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ADD USER MULTI-STEP DIALOG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <header className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                {selectedRole !== 'none' && (
                  <button 
                    onClick={() => {
                      setSelectedRole('none');
                      setIsEmailVerified(false);
                      setIsPhoneVerified(false);
                      setEmailOtpStep(false);
                      setPhoneOtpStep(false);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition mr-1 cursor-pointer"
                    title="Back to role selection"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    {selectedRole === 'none' ? 'Add System Staff Member' : selectedRole === 'receptionist' ? 'Configure Receptionist Desk' : selectedRole === 'sales' ? 'Configure Sales CRM Agent' : 'Configure Calling Agent'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                    {selectedRole === 'none' ? 'Step 1: Choose Role Category' : 'Step 2: Fill Personal Information'}
                  </p>
                </div>
              </div>
              <button 
                onClick={resetForm}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition rounded-xl cursor-pointer border border-transparent"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Modal Body / Scroll Content */}
            <div className="p-6 overflow-y-auto flex-1">
              
              {/* STEP 1: ROLE SELECTION DISPLAY CARDS */}
              {selectedRole === 'none' && (
                <div className="space-y-4 py-2">
                  {isProjectsEmpty && (
                    <div className="p-4.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex flex-col items-center text-center gap-3 mb-2 anim-fade-up shadow-xs">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-900">No Projects Registered Yet</h4>
                        <p className="text-[10.5px] text-amber-700/90 font-medium leading-relaxed max-w-[280px]">
                          Staff members must be assigned to an active real estate project. Please add a project first to enable role registration.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRedirectToAddProject}
                        className="mt-1 px-4.5 py-2.5 bg-[#B38F4F] hover:bg-[#9E7B3F] text-white text-[10.5px] font-extrabold rounded-xl transition cursor-pointer press flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Go to Add Project</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] font-bold text-slate-450 block uppercase tracking-widest text-center">
                    Select Staff Role Profile
                  </span>
                  
                  <div className="grid gap-3.5">
                    {/* Card 1: Receptionist Desk */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('receptionist')}
                      disabled={isProjectsEmpty}
                      className={`w-full flex items-start gap-4 p-5 bg-slate-50 border rounded-2xl text-left relative overflow-hidden transition-all duration-250 ${
                        isProjectsEmpty
                          ? 'opacity-40 cursor-not-allowed border-slate-200 shadow-none'
                          : 'hover:bg-indigo-50/40 border-slate-200/60 hover:border-indigo-300 card-hover press cursor-pointer'
                      }`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -translate-y-1/3 translate-x-1/3"></div>
                      <div className="p-3 bg-indigo-550/10 text-indigo-600 rounded-xl shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Receptionist Desk</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[9px] font-extrabold">Operations</span>
                        </span>
                        <span className="text-xs text-slate-500 font-medium block leading-relaxed">
                          Registers on-site clients, issues verified OTP visit passes, and manages immediate queue checks.
                        </span>
                      </div>
                    </button>

                    {/* Card 2: Sales CRM */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('sales')}
                      disabled={isProjectsEmpty}
                      className={`w-full flex items-start gap-4 p-5 bg-slate-50 border rounded-2xl text-left relative overflow-hidden transition-all duration-250 ${
                        isProjectsEmpty
                          ? 'opacity-40 cursor-not-allowed border-slate-200 shadow-none'
                          : 'hover:bg-emerald-50/40 border-slate-200/60 hover:border-emerald-300 card-hover press cursor-pointer'
                      }`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -translate-y-1/3 translate-x-1/3"></div>
                      <div className="p-3 bg-emerald-550/10 text-emerald-600 rounded-xl shrink-0">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Sales CRM Agent</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">Sales Pipe</span>
                        </span>
                        <span className="text-xs text-slate-500 font-medium block leading-relaxed">
                          Manages active pipeline allocations, logs detailed site visit status, and registers customer booking checks.
                        </span>
                      </div>
                    </button>

                    {/* Card 3: Calling Agent */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('calling')}
                      disabled={isProjectsEmpty}
                      className={`w-full flex items-start gap-4 p-5 bg-slate-50 border rounded-2xl text-left relative overflow-hidden transition-all duration-250 ${
                        isProjectsEmpty
                          ? 'opacity-40 cursor-not-allowed border-slate-200 shadow-none'
                          : 'hover:bg-orange-50/40 border-slate-200/60 hover:border-orange-350 card-hover press cursor-pointer'
                      }`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl -translate-y-1/3 translate-x-1/3"></div>
                      <div className="p-3 bg-orange-550/10 text-orange-600 rounded-xl shrink-0">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Calling Agent</span>
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[9px] font-extrabold">Tele-calling</span>
                        </span>
                        <span className="text-xs text-slate-500 font-medium block leading-relaxed">
                          Follows up with raw leads, logs budget & unit interest, schedules site visits, and updates calling stages.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS FORM */}
              {selectedRole !== 'none' && (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  
                  {/* Assign Project — FIRST, MANDATORY */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Assign Project <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      value={formProjectId ? (projectsList.find(p => p.id === formProjectId)?.project_name ?? '') : ''}
                      onChange={(val) => {
                        const found = projectsList.find(p => p.project_name === val);
                        setFormProjectId(found ? found.id : null);
                        if (found) clearFieldErr('project'); else setFieldErr('project', 'Please assign a project');
                      }}
                      options={projectsList.map(p => p.project_name)}
                      placeholder={projectsLoading ? 'Loading projects…' : 'Select project'}
                      loading={projectsLoading}
                    />
                    {formErrors.project && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.project}</p>}
                  </div>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Name <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          const err = validateName(e.target.value);
                          if (err) setFieldErr('name', err); else clearFieldErr('name');
                        }}
                        onBlur={(e) => {
                          const err = validateName(e.target.value);
                          if (err) setFieldErr('name', err); else clearFieldErr('name');
                        }}
                        placeholder="Amit Sharma"
                        className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition ${
                          formErrors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {formErrors.name && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.name}</p>}
                  </div>

                  {/* Email address field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => {
                          setFormEmail(e.target.value);
                          const err = validateEmail(e.target.value);
                          if (err) setFieldErr('email', err); else clearFieldErr('email');
                        }}
                        onBlur={(e) => {
                          const err = validateEmail(e.target.value);
                          if (err) setFieldErr('email', err); else clearFieldErr('email');
                        }}
                        placeholder="amit.sharma@brokerconnect.io"
                        className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition ${
                          formErrors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {formErrors.email && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.email}</p>}
                  </div>

                  {/* Phone number field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phone Number <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={formPhone}
                        onKeyDown={(e) => {
                          const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End',' '];
                          if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => {
                          setFormPhone(e.target.value);
                          const err = validatePhone(e.target.value);
                          if (err) setFieldErr('phone', err); else clearFieldErr('phone');
                        }}
                        onBlur={(e) => {
                          const err = validatePhone(e.target.value);
                          if (err) setFieldErr('phone', err); else clearFieldErr('phone');
                        }}
                        placeholder="9876512345"
                        className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition ${
                          formErrors.phone ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {formErrors.phone && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.phone}</p>}
                  </div>

                  {/* Additional Personal Details */}
                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Personal &amp; Address Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Gender */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gender <span className="text-rose-500">*</span></label>
                        <SearchableSelect
                          value={formGender}
                          onChange={(val) => {
                            setFormGender(val);
                            if (val) clearFieldErr('gender'); else setFieldErr('gender', 'Gender is required');
                          }}
                          options={['Male', 'Female', 'Other']}
                          placeholder="Select gender"
                        />
                        {formErrors.gender && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.gender}</p>}
                      </div>

                      {/* Pincode */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pincode <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={formPincode}
                          onKeyDown={(e) => {
                            const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
                            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                            setFormPincode(v);
                            const err = validatePincode(v);
                            if (err) setFieldErr('pincode', err); else clearFieldErr('pincode');
                          }}
                          onBlur={(e) => {
                            const err = validatePincode(e.target.value);
                            if (err) setFieldErr('pincode', err); else clearFieldErr('pincode');
                          }}
                          placeholder="411001"
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-blue-500 transition ${
                            formErrors.pincode ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                          }`}
                        />
                        {formErrors.pincode && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.pincode}</p>}
                      </div>

                      {/* Alternate Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alternate Number</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formAlternateNumber}
                          onKeyDown={(e) => {
                            const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End',' '];
                            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => setFormAlternateNumber(e.target.value)}
                          placeholder="9998887776"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Address Line 1 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address Line 1 <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={formAddressLine1}
                          onChange={(e) => {
                            setFormAddressLine1(e.target.value);
                            if (e.target.value.trim()) clearFieldErr('addressLine1');
                            else setFieldErr('addressLine1', 'Address Line 1 is required');
                          }}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) setFieldErr('addressLine1', 'Address Line 1 is required');
                            else clearFieldErr('addressLine1');
                          }}
                          placeholder="102, Blue Crest Apt"
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-blue-500 transition ${
                            formErrors.addressLine1 ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                          }`}
                        />
                        {formErrors.addressLine1 && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.addressLine1}</p>}
                      </div>

                      {/* Address Line 2 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address Line 2</label>
                        <input
                          type="text"
                          value={formAddressLine2}
                          onChange={(e) => setFormAddressLine2(e.target.value)}
                          placeholder="MG Road"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* State */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">State <span className="text-rose-500">*</span></label>
                        <SearchableSelect
                          value={formState}
                          onChange={(val) => {
                            setFormState(val);
                            setFormCity('');
                            if (val) clearFieldErr('state'); else setFieldErr('state', 'State is required');
                          }}
                          options={stateOptions}
                          placeholder="Select state"
                          loading={statesLoading}
                        />
                        {formErrors.state && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.state}</p>}
                      </div>

                      {/* City */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">City <span className="text-rose-500">*</span></label>
                        <SearchableSelect
                          value={formCity}
                          onChange={(val) => {
                            setFormCity(val);
                            if (val) clearFieldErr('city'); else setFieldErr('city', 'City is required');
                          }}
                          options={cityOptions}
                          placeholder={formState ? 'Select city' : 'Select state first'}
                          loading={citiesLoading}
                          disabled={!formState || citiesLoading}
                        />
                        {formErrors.city && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{formErrors.city}</p>}
                      </div>
                    </div>


                  </div>


                  {/* Form Footer Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 border border-slate-200 text-slate-550 hover:bg-slate-50 rounded-xl text-xs font-bold transition press cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1548C0] disabled:bg-blue-300/60 hover:shadow-lg disabled:shadow-none text-white rounded-xl text-xs font-bold transition-all duration-150 press cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{editingUserId !== null ? 'Updating...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <span>{editingUserId !== null ? 'Update User' : 'Create Account'}</span>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
