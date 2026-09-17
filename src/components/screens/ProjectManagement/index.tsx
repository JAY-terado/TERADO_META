import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../../CustomSelect';

import { useNavigate, useLocation } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { Search, Plus, Building2, MapPin, Grid, Layers, Calendar, Shield, Check, Edit3, PlusCircle, AlertCircle, Map, Info } from 'lucide-react';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { createProject, getAllProjects, getProjectDetail, updateProject, deleteProject, type CreateProjectPayload } from '../../../pages/api/projects';
import { DeleteProjectModal } from '../../DeleteProjectModal';
import { ErrorModal } from '../../ui/ErrorModal';
import { getMasters } from '../../../admin/api/masters';
import { getStates, getCities, type State } from '../../../pages/api/masters';
import Swal from 'sweetalert2';
import { useAdminProjectsQuery } from '../../../admin/hooks/useAdminQueries';

export const ProjectManagement: React.FC = () => {
  const { projects, leads, addProject, setProjects, setActiveScreen } = useBrokerConnect();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'rera' | 'units'>('basic');
  const [editingProjectId, setEditingProjectId] = useState<number | string | null>(null);
  const [cameFromProjectId, setCameFromProjectId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  // Close Add/Edit modal on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddForm) {
          const targetBackId = cameFromProjectId;
          setShowAddForm(false);
          resetForm();
          if (targetBackId) {
            navigate(`/admin/projects/${targetBackId}`);
          }
        }
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setProjectToDelete(null);
        }
        if (errorModalMsg) {
          setErrorModalMsg(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, cameFromProjectId, navigate, showDeleteModal, errorModalMsg]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Keep page within totalPages bounds
  useEffect(() => {
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalCount, itemsPerPage, currentPage]);

  // Debounce search → reset page to 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);
  
  // API Call States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, msg: string) =>
    setFieldErrors(prev => ({ ...prev, [field]: msg }));
  const clearFieldError = (field: string) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // --- Validation helpers ---
  const validateTowers = (val: string) => {
    if (!val.trim()) return 'Total Towers is required';
    if (!/^\d+$/.test(val.trim())) return 'Total Towers must be a whole number';
    if (Number(val) < 1) return 'Total Towers must be at least 1';
    return '';
  };
  const validateUnits = (val: string) => {
    if (!val.trim()) return 'Total Units is required';
    if (!/^\d+$/.test(val.trim())) return 'Total Units must be a whole number';
    if (Number(val) < 1) return 'Total Units must be at least 1';
    return '';
  };
  const validatePincode = (val: string) => {
    if (!val.trim()) return 'Pincode is required';
    if (!/^\d{6}$/.test(val.trim())) return 'Pincode must be exactly 6 digits';
    return '';
  };
  // RERA number: alphanumeric, hyphens/slashes allowed, min 5 chars
  const validateReraNum = (val: string) => {
    if (!val.trim()) return 'RERA Registration Number is required';
    if (!/^[A-Za-z0-9/\-]{5,}$/.test(val.trim()))
      return 'RERA number must be alphanumeric (e.g. P52100012345 or RERA-MH/12345)';
    return '';
  };

  // Dynamic options and maps from backend masters
  const [projectTypes, setProjectTypes] = useState<string[]>(['Residential', 'Commercial', 'Mixed Use', 'Plotting', 'Retail']);
  const [projectStatuses, setProjectStatuses] = useState<('Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold')[]>(['Upcoming', 'Active', 'Sold Out', 'Completed', 'On Hold']);
  const [facilitiesList, setFacilitiesList] = useState<string[]>([
    'Gymnasium', 'Swimming Pool', 'Clubhouse', '24/7 Security', 'Power Backup', 'Kids Play Area', 'Jogging Track', 'Tennis Court'
  ]);

  const [typeMap, setTypeMap] = useState<Record<string, number>>({
    'Residential': 1,
    'Commercial': 2,
    'Mixed Use': 3,
    'Plotting': 4,
    'Retail': 5
  });
  const [statusMap, setStatusMap] = useState<Record<string, number>>({
    'Upcoming': 1,
    'Active': 2,
    'Sold Out': 3,
    'Completed': 4,
    'On Hold': 5
  });
  const [reverseTypeMap, setReverseTypeMap] = useState<Record<number, string>>({
    1: 'Residential',
    2: 'Commercial',
    3: 'Mixed Use',
    4: 'Plotting',
    5: 'Retail'
  });
  const [reverseStatusMap, setReverseStatusMap] = useState<Record<number, string>>({
    1: 'Upcoming',
    2: 'Active',
    3: 'Sold Out',
    4: 'Completed',
    5: 'On Hold'
  });

  useEffect(() => {
    const loadMasters = async () => {
      setIsLoading(true);
      
      let tempReverseTypeMap: Record<number, string> = {
        1: 'Residential', 2: 'Commercial', 3: 'Mixed Use', 4: 'Plotting', 5: 'Retail'
      };
      let tempReverseStatusMap: Record<number, string> = {
        1: 'Upcoming', 2: 'Active', 3: 'Sold Out', 4: 'Completed', 5: 'On Hold'
      };

      try {
        // Fetch masters from specified dynamic searches
        const [propTypeRes, amenityRes, statusRes, flatTypeRes] = await Promise.all([
          getMasters({ page: 1, limit: 10, search: 'Property Type' }),
          getMasters({ page: 1, limit: 10, search: 'Project Amenities' }),
          getMasters({ page: 1, limit: 10, search: 'Property Status' }),
          getMasters({ page: 1, limit: 10, search: 'Project Flat Type' }),
        ]);

        const fetchedTypes: string[] = [];
        const fetchedStatuses: ('Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold')[] = [];
        const fetchedAmenities: { id: number; name: string }[] = [];
        const fetchedFlatTypes: { id: number; name: string }[] = [];

        const newTypeMap: Record<string, number> = {};
        const newStatusMap: Record<string, number> = {};
        const newReverseTypeMap: Record<number, string> = {};
        const newReverseStatusMap: Record<number, string> = {};

        if (propTypeRes.success && Array.isArray(propTypeRes.data)) {
          propTypeRes.data.forEach(item => {
            if (!item.slug) return;
            fetchedTypes.push(item.slug);
            newTypeMap[item.slug] = item.id;
            newReverseTypeMap[item.id] = item.slug;
          });
          setProjectTypes(fetchedTypes);
          setTypeMap(newTypeMap);
          setReverseTypeMap(newReverseTypeMap);
          tempReverseTypeMap = newReverseTypeMap;
        }

        if (statusRes.success && Array.isArray(statusRes.data)) {
          statusRes.data.forEach(item => {
            if (!item.slug) return;
            fetchedStatuses.push(item.slug as 'Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold');
            newStatusMap[item.slug] = item.id;
            newReverseStatusMap[item.id] = item.slug;
          });
          setProjectStatuses(fetchedStatuses);
          setStatusMap(newStatusMap);
          setReverseStatusMap(newReverseStatusMap);
          tempReverseStatusMap = newReverseStatusMap;
        }

        if (amenityRes.success && Array.isArray(amenityRes.data)) {
          amenityRes.data.forEach(item => {
            if (!item.slug) return;
            fetchedAmenities.push({ id: item.id, name: item.slug });
          });
          setProjectAmenities(fetchedAmenities);
        }

        if (flatTypeRes.success && Array.isArray(flatTypeRes.data)) {
          flatTypeRes.data.forEach(item => {
            if (!item.slug) return;
            fetchedFlatTypes.push({ id: item.id, name: item.slug });
          });
          setProjectFlatTypes(fetchedFlatTypes);
        }
      } catch (err) {
        console.error('Failed to load masters:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMasters();
  }, [setProjects]);

  // ── Server-side project fetch via TanStack Query ──
  const projectsParams = React.useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch || undefined,
  }), [currentPage, itemsPerPage, debouncedSearch]);

  const { data: projectsRes, isLoading: isProjectsQueryLoading } = useAdminProjectsQuery(projectsParams);

  useEffect(() => {
    if (projectsRes) {
      const res = projectsRes;
      const rawList: any[] = (res?.success && Array.isArray(res.data)) ? res.data : [];
      setTotalCount(res?.count ?? res?.total ?? rawList.length);

      const mapped = rawList.map((apiProj: any) => ({
        id: apiProj.id,
        name: apiProj.project_name || apiProj.name,
        location: apiProj.full_address || apiProj.location || `${apiProj.area_locality || ''}, ${apiProj.city || ''}`.trim() || 'N/A',
        towers: Number(apiProj.towers) || 2,
        units: Number(apiProj.units) || 100,
        status: apiProj.project_status || reverseStatusMap[apiProj.project_status_id] || 'Active',
        project_type: apiProj.project_type || reverseTypeMap[apiProj.project_type_id] || 'Residential',
        launch_date: apiProj.launch_date,
        possession_date: apiProj.possession_date,
        country: apiProj.country,
        state: apiProj.state,
        city: apiProj.city,
        area_locality: apiProj.area_locality,
        landmark: apiProj.landmark,
        full_address: apiProj.full_address,
        pincode: apiProj.pincode,
        rera_registration_number: apiProj.rera_registration_number,
        rera_registration_date: apiProj.rera_registration_date,
        rera_expiry_date: apiProj.rera_expiry_date,
        facilities: apiProj.facilities,
        unit_configs: apiProj.unit_configs
      }));
      setProjects(mapped);
    }
  }, [projectsRes, reverseStatusMap, reverseTypeMap, setProjects]);

  useEffect(() => {
    setIsLoading(isProjectsQueryLoading);
  }, [isProjectsQueryLoading]);

  // Handle edit or add intent coming via router state
  useEffect(() => {
    const state = location.state as any;
    if (state?.editProjectId && projects.length > 0) {
      const proj = projects.find(p => p.id === state.editProjectId);
      if (proj) {
        setCameFromProjectId(String(state.editProjectId));
        openEditForm(proj);
        // Clear the state so navigating again doesn't re-open
        navigate('/admin/projects', { replace: true, state: {} });
      }
    } else if (state?.openAddModal) {
      setShowAddForm(true);
      // Clear the state so navigating again doesn't re-open
      navigate('/admin/projects', { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, projects]);

  // Add Project Form States
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<string>('Residential');
  const [projectStatus, setProjectStatus] = useState<'Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold'>('Active');

  useEffect(() => {
    if (projectTypes.length > 0 && !projectTypes.includes(projectType)) {
      setProjectType(projectTypes[0]);
    }
  }, [projectTypes]);

  useEffect(() => {
    if (projectStatuses.length > 0 && !projectStatuses.includes(projectStatus)) {
      setProjectStatus(projectStatuses[0]);
    }
  }, [projectStatuses]);
  const [launchDate, setLaunchDate] = useState('');
  const [possessionDate, setPossessionDate] = useState('');
  const [towers, setTowers] = useState('');
  const [units, setUnits] = useState('');

  // Location States
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [areaLocality, setAreaLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // RERA & Facilities/Amenities States
  const [reraNum, setReraNum] = useState('');
  const [reraRegDate, setReraRegDate] = useState('');
  const [reraExpDate, setReraExpDate] = useState('');
  const [projectAmenities, setProjectAmenities] = useState<{ id: number; name: string }[]>([]);
  const [projectFlatTypes, setProjectFlatTypes] = useState<{ id: number; name: string }[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [selectedFlatTypes, setSelectedFlatTypes] = useState<number[]>([]);

  // State & City dropdown lists & loading
  const [statesList, setStatesList] = useState<State[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // State & City dropdown fetching effects
  useEffect(() => {
    const fetchStates = async () => {
      setStatesLoading(true);
      try {
        const res = await getStates();
        if (res.success) {
          setStatesList(res.data);
          setStateOptions(res.data.map(s => s.state_name));
        }
      } catch (err) {
        console.error('Failed to load states', err);
      } finally {
        setStatesLoading(false);
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      setCitiesLoading(true);
      try {
        const selectedStateObj = statesList.find(s => s.state_name === state);
        const stateId = selectedStateObj ? selectedStateObj.id : undefined;
        if (state && !stateId) {
          setCityOptions([]);
          return;
        }
        const res = await getCities(stateId);
        if (res.success) {
          const uniqueCities = Array.from(new Set(res.data.map(c => c.city_name)));
          setCityOptions(uniqueCities);
        }
      } catch (err) {
        console.error('Failed to load cities', err);
      } finally {
        setCitiesLoading(false);
      }
    };
    fetchCities();
  }, [state, statesList]);

  const resetForm = () => {
    setEditingProjectId(null);
    setCameFromProjectId(null);
    setProjectName('');
    setProjectType('Residential');
    setProjectStatus('Active');
    setLaunchDate('');
    setPossessionDate('');
    setTowers('');
    setUnits('');
    setCountry('India');
    setState('');
    setCity('');
    setAreaLocality('');
    setLandmark('');
    setFullAddress('');
    setPincode('');
    setReraNum('');
    setReraRegDate('');
    setReraExpDate('');
    setSelectedAmenities([]);
    setSelectedFlatTypes([]);
    setActiveTab('basic');
    setErrorMsg('');
    setSuccessMsg('');
    setFieldErrors({});
  };

  const openEditForm = (proj: any) => {
    setEditingProjectId(proj.id);
    setProjectName(proj.name || proj.project_name || '');
    // Attempt to resolve type/status name from maps
    const resolvedType = proj.project_type || reverseTypeMap[proj.project_type_id] || 'Residential';
    const resolvedStatus = proj.status || reverseStatusMap[proj.project_status_id] || 'Active';
    setProjectType(resolvedType);
    setProjectStatus(resolvedStatus as any);
    setLaunchDate(proj.launch_date ? proj.launch_date.substring(0, 10) : '');
    setPossessionDate(proj.possession_date ? proj.possession_date.substring(0, 10) : '');
    setTowers(String(proj.towers || ''));
    setUnits(String(proj.units || ''));
    setCountry(proj.country || 'India');
    setState(proj.state || '');
    setCity(proj.city || '');
    setAreaLocality(proj.area_locality || '');
    setLandmark(proj.landmark || '');
    setFullAddress(proj.full_address || '');
    setPincode(proj.pincode || '');
    setReraNum(proj.rera_registration_number || '');
    setReraRegDate(proj.rera_registration_date ? proj.rera_registration_date.substring(0, 10) : '');
    setReraExpDate(proj.rera_expiry_date ? proj.rera_expiry_date.substring(0, 10) : '');
    // Pre-select amenities and flat types if available as ID arrays
    if (Array.isArray(proj.amenities)) setSelectedAmenities(proj.amenities.map((a: any) => typeof a === 'number' ? a : a.id));
    else setSelectedAmenities([]);
    if (Array.isArray(proj.project_flat_types)) setSelectedFlatTypes(proj.project_flat_types.map((f: any) => typeof f === 'number' ? f : f.id));
    else setSelectedFlatTypes([]);
    setActiveTab('basic');
    setErrorMsg('');
    setSuccessMsg('');
    setShowAddForm(true);
  };

  const handleDelete = (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(proj);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteProject(projectToDelete.id);
      if (res?.success !== false) {
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        setShowDeleteModal(false);
        setProjectToDelete(null);
        Swal.fire({ title: 'Deleted!', text: 'Project has been deleted.', icon: 'success', timer: 1800, showConfirmButton: false });
      } else {
        setErrorModalMsg(res.message || 'Failed to delete project.');
      }
    } catch (err: any) {
      setErrorModalMsg(err.message || 'An error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Per-project stats derived from leads
  const getProjectStats = (name: string, totalUnits: number) => {
    const booked = leads.filter(l => l.project === name && l.status === 'Booked').length;
    const available = Math.max(0, totalUnits - booked);
    return { booked, available };
  };

  // Server returns already-filtered & paginated projects
  const paginatedProjects = projects;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const adjustedPage = Math.min(currentPage, Math.max(totalPages, 1));

  // Step-by-step validation for Next button
  const validateBasicTab = (): boolean => {
    const errors: Record<string, string> = {};
    if (!projectName.trim()) errors.projectName = 'Project Name is required';
    if (!launchDate) errors.launchDate = 'Launch Date is required';
    if (!possessionDate) errors.possessionDate = 'Possession Date is required';
    if (launchDate && possessionDate && possessionDate <= launchDate)
      errors.possessionDate = 'Possession Date must be after Launch Date';
    const tErr = validateTowers(towers);
    if (tErr) errors.towers = tErr;
    const uErr = validateUnits(units);
    if (uErr) errors.units = uErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateLocationTab = (): boolean => {
    const errors: Record<string, string> = {};
    if (!state.trim()) errors.state = 'State is required';
    if (!city.trim()) errors.city = 'City is required';
    const pErr = validatePincode(pincode);
    if (pErr) errors.pincode = pErr;
    if (!areaLocality.trim()) errors.areaLocality = 'Area Locality is required';
    if (!fullAddress.trim()) errors.fullAddress = 'Full Address is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateReraTab = (): boolean => {
    const errors: Record<string, string> = {};
    const rErr = validateReraNum(reraNum);
    if (rErr) errors.reraNum = rErr;
    if (!reraRegDate) errors.reraRegDate = 'RERA Registration Date is required';
    if (!reraExpDate) errors.reraExpDate = 'RERA Expiry Date is required';
    if (reraRegDate && reraExpDate && reraExpDate <= reraRegDate)
      errors.reraExpDate = 'RERA Expiry Date must be after Registration Date';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Run all tab validations on submit
    const basicOk = validateBasicTab();
    if (!basicOk) {
      setErrorMsg('Please fix errors in Basic Info tab');
      setActiveTab('basic');
      return;
    }
    const locationOk = validateLocationTab();
    if (!locationOk) {
      setErrorMsg('Please fix errors in Location tab');
      setActiveTab('location');
      return;
    }
    const reraOk = validateReraTab();
    if (!reraOk) {
      setErrorMsg('Please fix errors in RERA & Facilities tab');
      setActiveTab('rera');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: CreateProjectPayload = {
        project_name: projectName.trim(),
        project_type_id: typeMap[projectType] || 1,
        project_status_id: statusMap[projectStatus] || 22,
        launch_date: launchDate,
        possession_date: possessionDate,
        country: "India",
        state: state.trim(),
        city: city.trim(),
        area_locality: areaLocality.trim(),
        landmark: landmark.trim(),
        full_address: fullAddress.trim(),
        pincode: pincode.trim(),
        towers: Number(towers) || 2,
        units: Number(units) || 100,
        rera_registration_number: reraNum.trim(),
        rera_registration_date: reraRegDate,
        rera_expiry_date: reraExpDate,
        status: 1,
        amenities: selectedAmenities,
        project_flat_types: selectedFlatTypes
      };

      let res: any;
      if (editingProjectId) {
        res = await updateProject(editingProjectId, payload);
      } else {
        res = await createProject(payload);
      }

      if (res.success) {
        setSuccessMsg(res.message || (editingProjectId ? 'Project updated successfully' : 'Project created successfully'));
        
        // Map the IDs back to names for local UI state compatibility
        const mappedFacilities = selectedAmenities.map(id => {
          const item = projectAmenities.find(a => a.id === id);
          return item ? item.name : '';
        }).filter(Boolean);

        const mappedUnitConfigs = selectedFlatTypes.map(id => {
          const item = projectFlatTypes.find(f => f.id === id);
          return {
            unit_type: item ? item.name : '',
            budgets: []
          };
        }).filter(c => c.unit_type !== '');

        const projectData = {
          id: editingProjectId || (res as any).data?.id || (res as any).id || Math.floor(Math.random() * 1000),
          name: projectName.trim(),
          location: `${areaLocality.trim()}, ${city.trim()}`,
          towers: Number(towers) || 2,
          units: Number(units) || 100,
          status: projectStatus,
          project_type: projectType,
          launch_date: launchDate,
          possession_date: possessionDate,
          country: "India",
          state: state.trim(),
          city: city.trim(),
          area_locality: areaLocality.trim(),
          landmark: landmark.trim(),
          full_address: fullAddress.trim(),
          pincode: pincode.trim(),
          rera_registration_number: reraNum.trim(),
          rera_registration_date: reraRegDate,
          rera_expiry_date: reraExpDate,
          facilities: mappedFacilities,
          unit_configs: mappedUnitConfigs
        };

        if (editingProjectId) {
          // Update the existing project in context
          setProjects(prev => prev.map(p => p.id === editingProjectId ? projectData : p));
        } else {
          addProject(projectData);
        }

        const targetBackId = cameFromProjectId;
        setShowAddForm(false);
        resetForm();
        if (targetBackId) {
          navigate(`/admin/projects/${targetBackId}`);
        }
      } else {
        setErrorMsg(res.message || (editingProjectId ? 'Failed to update project' : 'Failed to create project'));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full gap-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Project Management</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            Manage real estate inventories, configurations, and active project locations
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.25)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.35)] cursor-pointer w-full sm:w-auto justify-center press pulse-glow"
        >
          <Plus className="w-5 h-5" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Search and Table List */}
      <div className="flex-1 flex flex-col bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-4 anim-fade-up stagger-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">Active Inventories</h3>
          
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(26,86,219,0.08)] transition-shadow duration-200 placeholder:text-slate-400 text-slate-700"
            />
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-[#1A56DB]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading active projects...</span>
              </span>
            </div>
          ) : paginatedProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              No active projects found.
            </div>
          ) : (
            paginatedProjects.map((proj, index) => {
              const { booked, available } = getProjectStats(proj.name, proj.units);
              return (
                <div key={proj.name} className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-md transition flex flex-col gap-3 animate-fade-up" style={{ animationDelay: `${index * 0.04}s` }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => proj.id && navigate(`/admin/projects/${proj.id}`)}>
                      <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{proj.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        proj.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        proj.status === 'Upcoming' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        proj.status === 'Sold Out' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                        proj.status === 'Completed' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                        'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {proj.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditForm(proj); }}
                        className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition cursor-pointer border border-blue-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer" onClick={() => proj.id && navigate(`/admin/projects/${proj.id}`)}>
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{proj.location}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Towers</span>
                      <span className="font-bold text-slate-700">{proj.towers}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Units</span>
                      <span className="font-bold text-slate-700">{proj.units}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Projects grid (Desktop only) */}
        <div className="hidden md:block flex-1 overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Project Name</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4">Location</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Towers</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Units</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Status</th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50/70 py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold bg-white">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-[#1A56DB]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs text-slate-500 font-medium">Loading active projects...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium bg-white">
                    No active projects found.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((proj, index) => {
                  return (
                    <tr key={proj.name} onClick={() => proj.id && navigate(`/admin/projects/${proj.id}`)} style={{ animationDelay: `${index * 0.04}s` }} className="hover:bg-slate-50/60 transition-colors cursor-pointer even:bg-slate-50/30 anim-fade-up">
                      <td className="py-4 px-4 text-sm font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4.5 h-4.5 text-blue-600" />
                          <span>{proj.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{proj.location}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium text-center">{proj.towers}</td>
                      <td className="py-4 px-4 text-slate-600 font-bold text-center">{proj.units}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold smooth ${
                          proj.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          proj.status === 'Upcoming' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          proj.status === 'Sold Out' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          proj.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {proj.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEditForm(proj); }}
                            title="Edit Project"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition cursor-pointer border border-blue-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-semibold gap-3 px-2">
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

      {/* Add Project Modal */}
      {showAddForm && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 anim-fade-in">
          <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-3xl w-full max-w-2xl shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left anim-scale-in flex flex-col max-h-[90vh]">
            
            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#1A3A6B] to-[#1A56DB] px-6 py-5 relative overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #60a5fa 0%, transparent 60%)' }} />
              <div className="relative flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{editingProjectId ? 'Edit Project' : 'Add New Project'}</h3>
                    <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">{editingProjectId ? 'Update project details' : 'Launch a new real estate inventory'}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    const targetBackId = cameFromProjectId;
                    setShowAddForm(false);
                    resetForm();
                    if (targetBackId) {
                      navigate(`/admin/projects/${targetBackId}`);
                    }
                  }} 
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-100 bg-slate-50 px-4 py-2 overflow-x-auto gap-1 flex-shrink-0">
              {[
                { id: 'basic', label: 'Basic Info', icon: Info },
                { id: 'location', label: 'Location & Address', icon: Map },
                { id: 'rera', label: 'RERA & Facilities', icon: Shield },
                { id: 'units', label: 'Unit Configurations', icon: Grid }
              ].map(t => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Body Container */}
            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
              {/* API Feedback Alerts */}
              {errorMsg && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                  <Check className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Tab 1: Basic Details */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Project Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Elysium Towers"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 placeholder:text-slate-400 text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Project Type <span className="text-rose-500">*</span></label>
                      <CustomSelect
                        value={projectType}
                        onChange={(val) => setProjectType(val)}
                        options={projectTypes}
                        placeholder="Select Type"
                        icon={Building2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Status <span className="text-rose-500">*</span></label>
                      <CustomSelect
                        value={projectStatus}
                        onChange={(val) => setProjectStatus(val as 'Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold')}
                        options={projectStatuses}
                        placeholder="Select Status"
                        icon={Layers}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Launch Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={launchDate}
                        onChange={(e) => {
                          setLaunchDate(e.target.value);
                          clearFieldError('launchDate');
                          // If possession is now invalid, flag it
                          if (possessionDate && e.target.value && possessionDate <= e.target.value)
                            setFieldError('possessionDate', 'Possession Date must be after Launch Date');
                          else
                            clearFieldError('possessionDate');
                        }}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold ${
                          fieldErrors.launchDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        required
                      />
                      {fieldErrors.launchDate && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.launchDate}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Possession Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={possessionDate}
                        min={launchDate ? launchDate : undefined}
                        onChange={(e) => {
                          setPossessionDate(e.target.value);
                          if (launchDate && e.target.value && e.target.value <= launchDate)
                            setFieldError('possessionDate', 'Possession Date must be after Launch Date');
                          else
                            clearFieldError('possessionDate');
                        }}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold ${
                          fieldErrors.possessionDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        required
                      />
                      {fieldErrors.possessionDate && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.possessionDate}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Towers <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 2"
                        value={towers}
                        onKeyDown={(e) => {
                          // Allow: backspace, delete, tab, arrows, home, end
                          const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
                          if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, '');
                          setTowers(v);
                          const err = validateTowers(v);
                          if (err) setFieldError('towers', err); else clearFieldError('towers');
                        }}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 placeholder:text-slate-400 text-slate-800 font-semibold ${
                          fieldErrors.towers ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        required
                      />
                      {fieldErrors.towers && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.towers}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Units <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 100"
                        value={units}
                        onKeyDown={(e) => {
                          const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
                          if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, '');
                          setUnits(v);
                          const err = validateUnits(v);
                          if (err) setFieldError('units', err); else clearFieldError('units');
                        }}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 placeholder:text-slate-400 text-slate-800 font-semibold ${
                          fieldErrors.units ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        required
                      />
                      {fieldErrors.units && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.units}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Location Details */}
              {activeTab === 'location' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">State <span className="text-rose-500">*</span></label>
                      <SearchableSelect
                        value={state}
                        onChange={(val) => {
                          setState(val);
                          setCity('');
                        }}
                        options={stateOptions}
                        placeholder="Select State"
                        loading={statesLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">City <span className="text-rose-500">*</span></label>
                      <SearchableSelect
                        value={city}
                        onChange={(val) => setCity(val)}
                        options={cityOptions}
                        placeholder="Select City"
                        loading={citiesLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pincode <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 411006"
                      maxLength={6}
                      value={pincode}
                      onKeyDown={(e) => {
                        const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                      }}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                        setPincode(v);
                        const err = validatePincode(v);
                        if (err) setFieldError('pincode', err); else clearFieldError('pincode');
                      }}
                      className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold ${
                        fieldErrors.pincode ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                      }`}
                      required
                    />
                    {fieldErrors.pincode && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.pincode}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Area Locality <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Kalyani Nagar"
                        value={areaLocality}
                        onChange={(e) => setAreaLocality(e.target.value)}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Landmark</label>
                      <input
                        type="text"
                        placeholder="e.g. Near Jogger Park"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Full Address <span className="text-rose-500">*</span></label>
                    <textarea
                      placeholder="e.g. 123 Elite Residency, Kalyani Nagar, Pune"
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      rows={2}
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: RERA & Facilities */}
              {activeTab === 'rera' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">RERA Registration Number <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. P52100012345 or RERA-MH/12345"
                      value={reraNum}
                      onChange={(e) => {
                        setReraNum(e.target.value);
                        const err = validateReraNum(e.target.value);
                        if (err) setFieldError('reraNum', err); else clearFieldError('reraNum');
                      }}
                      className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold ${
                        fieldErrors.reraNum ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                      }`}
                      required
                    />
                    {fieldErrors.reraNum && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.reraNum}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">RERA Reg Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={reraRegDate}
                        onChange={(e) => {
                          setReraRegDate(e.target.value);
                          clearFieldError('reraRegDate');
                          if (reraExpDate && e.target.value && reraExpDate <= e.target.value)
                            setFieldError('reraExpDate', 'RERA Expiry Date must be after Registration Date');
                          else
                            clearFieldError('reraExpDate');
                        }}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold ${
                          fieldErrors.reraRegDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        required
                      />
                      {fieldErrors.reraRegDate && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.reraRegDate}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">RERA Expiry Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={reraExpDate}
                        min={reraRegDate ? reraRegDate : undefined}
                        onChange={(e) => {
                          setReraExpDate(e.target.value);
                          if (reraRegDate && e.target.value && e.target.value <= reraRegDate)
                            setFieldError('reraExpDate', 'RERA Expiry Date must be after Registration Date');
                          else
                            clearFieldError('reraExpDate');
                        }}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(26,86,219,0.12)] transition-all duration-200 text-slate-800 font-semibold ${
                          fieldErrors.reraExpDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        required
                      />
                      {fieldErrors.reraExpDate && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">{fieldErrors.reraExpDate}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Facilities / Amenities</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
                      {projectAmenities.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2 w-full">Loading amenities...</p>
                      ) : (
                        projectAmenities.map(amenity => {
                          const isSelected = selectedAmenities.includes(amenity.id);
                          return (
                            <button
                              key={amenity.id}
                              type="button"
                              onClick={() => {
                                setSelectedAmenities(prev =>
                                  prev.includes(amenity.id)
                                    ? prev.filter(id => id !== amenity.id)
                                    : [...prev, amenity.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>{amenity.name}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Unit Configurations */}
              {/* Tab 4: Unit Configurations */}
              {activeTab === 'units' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Project Flat Types</label>
                    <div className="flex flex-wrap gap-2 p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
                      {projectFlatTypes.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2 w-full">Loading flat types...</p>
                      ) : (
                        projectFlatTypes.map(ft => {
                          const isSelected = selectedFlatTypes.includes(ft.id);
                          return (
                            <button
                              key={ft.id}
                              type="button"
                              onClick={() => {
                                setSelectedFlatTypes(prev =>
                                  prev.includes(ft.id)
                                    ? prev.filter(id => id !== ft.id)
                                    : [...prev, ft.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>{ft.name}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-6 pb-6 pt-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'units') setActiveTab('rera');
                  else if (activeTab === 'rera') setActiveTab('location');
                  else if (activeTab === 'location') setActiveTab('basic');
                  else {
                    const targetBackId = cameFromProjectId;
                    setShowAddForm(false);
                    resetForm();
                    if (targetBackId) {
                      navigate(`/admin/projects/${targetBackId}`);
                    }
                  }
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all cursor-pointer min-w-[5rem]"
              >
                {activeTab === 'basic' ? 'Cancel' : 'Back'}
              </button>
              
              <div className="flex gap-2">
                {activeTab !== 'units' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'basic') {
                        if (validateBasicTab()) { setFieldErrors({}); setActiveTab('location'); }
                      } else if (activeTab === 'location') {
                        if (validateLocationTab()) { setFieldErrors({}); setActiveTab('rera'); }
                      } else if (activeTab === 'rera') {
                        if (validateReraTab()) { setFieldErrors({}); setActiveTab('units'); }
                      }
                    }}
                    className="px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-[0_4px_14px_rgba(26,86,219,0.25)]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmit(e as any);
                    }}
                    className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(26,86,219,0.35)] hover:shadow-[0_6px_20px_rgba(26,86,219,0.45)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>{editingProjectId ? 'Update Project' : 'Submit Project'}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}
      {showDeleteModal && (
        <DeleteProjectModal
          project={projectToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setProjectToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
      {errorModalMsg && (
        <ErrorModal
          title="Delete Project Failed"
          message={errorModalMsg}
          onClose={() => setErrorModalMsg(null)}
        />
      )}
    </div>
  );
};
