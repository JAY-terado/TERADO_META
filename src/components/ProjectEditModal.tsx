import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, Check, Loader2, ShieldAlert, AlertCircle,
  Info, Map, Shield, Grid, Layers, Calendar
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { SearchableSelect } from './ui/SearchableSelect';
import { getStates, getCities, type State } from '../pages/api/masters';
import { getMasters } from '../admin/api/masters';
import { updateProject, type CreateProjectPayload } from '../pages/api/projects';
import { useBrokerConnect } from '../context/BrokerConnectContext';

interface ProjectEditModalProps {
  project: any;
  onClose: () => void;
  onSave: (updatedProject: any) => void;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({ project, onClose, onSave }) => {
  const { setProjects } = useBrokerConnect();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Tab active states
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'rera' | 'units'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, msg: string) =>
    setFieldErrors(prev => ({ ...prev, [field]: msg }));
  const clearFieldError = (field: string) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // Masters local states
  const [projectTypes, setProjectTypes] = useState<string[]>(['Residential', 'Commercial', 'Mixed Use', 'Plotting', 'Retail']);
  const [projectStatuses, setProjectStatuses] = useState<('Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold')[]>(['Upcoming', 'Active', 'Sold Out', 'Completed', 'On Hold']);
  const [projectAmenities, setProjectAmenities] = useState<{ id: number; name: string }[]>([]);
  const [projectFlatTypes, setProjectFlatTypes] = useState<{ id: number; name: string }[]>([]);
  const [typeMap, setTypeMap] = useState<Record<string, number>>({
    'Residential': 1, 'Commercial': 2, 'Mixed Use': 3, 'Plotting': 4, 'Retail': 5
  });
  const [statusMap, setStatusMap] = useState<Record<string, number>>({
    'Upcoming': 1, 'Active': 2, 'Sold Out': 3, 'Completed': 4, 'On Hold': 5
  });
  const [reverseTypeMap, setReverseTypeMap] = useState<Record<number, string>>({
    1: 'Residential', 2: 'Commercial', 3: 'Mixed Use', 4: 'Plotting', 5: 'Retail'
  });
  const [reverseStatusMap, setReverseStatusMap] = useState<Record<number, string>>({
    1: 'Upcoming', 2: 'Active', 3: 'Sold Out', 4: 'Completed', 5: 'On Hold'
  });

  const [statesList, setStatesList] = useState<State[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Form Field States
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<string>('Residential');
  const [projectStatus, setProjectStatus] = useState<'Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold'>('Active');
  const [launchDate, setLaunchDate] = useState('');
  const [possessionDate, setPossessionDate] = useState('');
  const [towers, setTowers] = useState('');
  const [units, setUnits] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [areaLocality, setAreaLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [reraNum, setReraNum] = useState('');
  const [reraRegDate, setReraRegDate] = useState('');
  const [reraExpDate, setReraExpDate] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [selectedFlatTypes, setSelectedFlatTypes] = useState<number[]>([]);

  // Validation helpers
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
  const validateReraNum = (val: string) => {
    if (!val.trim()) return 'RERA Registration Number is required';
    if (!/^[A-Za-z0-9/\-]{5,}$/.test(val.trim()))
      return 'RERA number must be alphanumeric (e.g. P52100012345 or RERA-MH/12345)';
    return '';
  };

  // Load masters & prefill data when project changes
  useEffect(() => {
    const loadMastersAndPrefill = async () => {
      try {
        setStatesLoading(true);
        // Fetch states list
        const stateRes = await getStates();
        if (stateRes.success) {
          setStatesList(stateRes.data);
          setStateOptions(stateRes.data.map((s: any) => s.state_name));
        }

        // Fetch dynamic masters
        const [propTypeRes, amenityRes, statusRes, flatTypeRes] = await Promise.all([
          getMasters({ page: 1, limit: 10, search: 'Property Type' }),
          getMasters({ page: 1, limit: 10, search: 'Project Amenities' }),
          getMasters({ page: 1, limit: 10, search: 'Property Status' }),
          getMasters({ page: 1, limit: 10, search: 'Project Flat Type' }),
        ]);

        const newTypeMap: Record<string, number> = {};
        const newStatusMap: Record<string, number> = {};
        const newReverseTypeMap: Record<number, string> = {};
        const newReverseStatusMap: Record<number, string> = {};

        if (propTypeRes.success && Array.isArray(propTypeRes.data)) {
          const fetchedTypes: string[] = [];
          propTypeRes.data.forEach(item => {
            if (!item.slug) return;
            fetchedTypes.push(item.slug);
            newTypeMap[item.slug] = item.id;
            newReverseTypeMap[item.id] = item.slug;
          });
          setProjectTypes(fetchedTypes);
          setTypeMap(newTypeMap);
          setReverseTypeMap(newReverseTypeMap);
        }

        if (statusRes.success && Array.isArray(statusRes.data)) {
          const fetchedStatuses: ('Upcoming' | 'Active' | 'Sold Out' | 'Completed' | 'On Hold')[] = [];
          statusRes.data.forEach(item => {
            if (!item.slug) return;
            fetchedStatuses.push(item.slug as any);
            newStatusMap[item.slug] = item.id;
            newReverseStatusMap[item.id] = item.slug;
          });
          setProjectStatuses(fetchedStatuses);
          setStatusMap(newStatusMap);
          setReverseStatusMap(newReverseStatusMap);
        }

        if (amenityRes.success && Array.isArray(amenityRes.data)) {
          setProjectAmenities(amenityRes.data.map((item: any) => ({ id: item.id, name: item.slug })));
        }

        if (flatTypeRes.success && Array.isArray(flatTypeRes.data)) {
          setProjectFlatTypes(flatTypeRes.data.map((item: any) => ({ id: item.id, name: item.slug })));
        }

        // Prefill Form Fields using the mapping logic matching list screen
        const resolvedType = project.project_type_detail?.slug || project.project_type || newReverseTypeMap[project.project_type_id] || 'Residential';
        const resolvedStatus = project.project_status_detail?.slug || project.project_status || newReverseStatusMap[project.project_status_id] || 'Active';
        
        setProjectName(project.project_name || project.name || '');
        setProjectType(resolvedType);
        setProjectStatus(resolvedStatus as any);
        setLaunchDate(project.launch_date ? project.launch_date.substring(0, 10) : '');
        setPossessionDate(project.possession_date ? project.possession_date.substring(0, 10) : '');
        setTowers(String(project.towers || ''));
        setUnits(String(project.units || ''));
        setCountry(project.country || 'India');
        setState(project.state || '');
        setCity(project.city || '');
        setAreaLocality(project.area_locality || '');
        setLandmark(project.landmark || '');
        setFullAddress(project.full_address || '');
        setPincode(project.pincode || '');
        setReraNum(project.rera_registration_number || '');
        setReraRegDate(project.rera_registration_date ? project.rera_registration_date.substring(0, 10) : '');
        setReraExpDate(project.rera_expiry_date ? project.rera_expiry_date.substring(0, 10) : '');

        // Selected amenities/flat types
        const rawAmenities = project.amenities || project.amenities_detail || [];
        setSelectedAmenities(rawAmenities.map((a: any) => typeof a === 'number' ? a : a.id));

        const rawFlatTypes = project.project_flat_types || project.project_flat_types_detail || project.project_flat_type_detail || [];
        setSelectedFlatTypes(rawFlatTypes.map((f: any) => typeof f === 'number' ? f : f.id));

      } catch (err) {
        console.error('Failed to load masters for edit modal', err);
      } finally {
        setStatesLoading(false);
      }
    };

    if (project) {
      loadMastersAndPrefill();
    }
  }, [project]);

  // Load cities when state selection changes
  useEffect(() => {
    const loadCities = async () => {
      if (!state) {
        setCityOptions([]);
        return;
      }
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
          setCityOptions(Array.from(new Set(res.data.map((c: any) => c.city_name))));
        }
      } catch (err) {
        console.error('Failed to load cities for edit modal', err);
      } finally {
        setCitiesLoading(false);
      }
    };
    loadCities();
  }, [state, statesList]);

  // Step-by-step validations
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const res = await updateProject(project.id, payload);

      if (res.success) {
        setSuccessMsg(res.message || 'Project updated successfully');
        
        // Map names for local updates
        const mappedFacilities = selectedAmenities.map(id => {
          const item = projectAmenities.find(a => a.id === id);
          return item ? item.name : '';
        }).filter(Boolean);

        const mappedUnitConfigs = selectedFlatTypes.map(id => {
          const item = projectFlatTypes.find(f => f.id === id);
          return {
            id,
            unit_type: item ? item.name : '',
            name: item ? item.name : '',
            budgets: []
          };
        }).filter(c => c.unit_type !== '');

        const projectData = {
          ...project,
          id: project.id,
          name: projectName.trim(),
          project_name: projectName.trim(),
          location: `${areaLocality.trim()}, ${city.trim()}`,
          towers: Number(towers) || 2,
          units: Number(units) || 100,
          status: projectStatus,
          project_status: projectStatus,
          project_type: projectType,
          launch_date: launchDate,
          possession_date: possessionDate,
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
          amenities_detail: selectedAmenities.map(id => ({ id, slug: projectAmenities.find(a => a.id === id)?.name || '' })),
          project_flat_types_detail: mappedUnitConfigs,
          project_flat_type_detail: mappedUnitConfigs,
          unit_configs: mappedUnitConfigs
        };

        // Sync with global context if available
        if (setProjects) {
          setProjects((prev: any[]) => prev.map(p => p.id === project.id ? projectData : p));
        }

        // Save trigger
        onSave(projectData);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.message || 'Failed to update project');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
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
                <h3 className="text-base font-bold text-white">Edit Project Details</h3>
                <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">Modify properties and settings for {project.project_name || project.name}</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
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
                    onChange={(val) => setProjectStatus(val as any)}
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
                    min={launchDate || undefined}
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
                    min={reraRegDate || undefined}
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
              else onClose();
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
                onClick={handleSubmit}
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
                  <span>Update Project</span>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};
