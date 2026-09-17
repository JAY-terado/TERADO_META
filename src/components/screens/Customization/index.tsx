import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Plus, Trash2, Building2, Users, UserCheck, Check, Save, Calendar, ChevronDown, CircleDot, Type, List, Loader2, Pencil, LockKeyhole, Search } from 'lucide-react';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { createMaster, getMasters, updateMasterStatus, bulkUpdateMasters } from '../../../admin/api/masters';
import type { BulkUpdateRecord } from '../../../admin/api/masters';
import Swal from 'sweetalert2';


const mapApiTypeToUiType = (apiType: string | undefined): 'dropdown' | 'multiselect' | 'radio' | 'date' | 'text' | 'checkbox' | 'date-range' | 'input' | 'number' | 'hyperlink' => {
  const t = (apiType || '').toLowerCase().trim();
  if (t === 'checkbox') return 'checkbox';
  if (t === 'date range' || t === 'date-range') return 'date-range';
  if (t === 'input') return 'input';
  if (t === 'number') return 'number';
  if (t === 'hyperlink') return 'hyperlink';
  if (t === 'date picker' || t === 'date-picker' || t === 'date') return 'date';
  if (t.includes('multi') || t.includes('checkbox')) return 'multiselect';
  if (t.includes('radio')) return 'radio';
  if (t.includes('text')) return 'text';
  return 'dropdown';
};

const mapUiTypeToApiType = (uiType: 'dropdown' | 'multiselect' | 'radio' | 'date' | 'text' | 'checkbox' | 'date-range' | 'input' | 'number' | 'hyperlink'): string => {
  switch (uiType) {
    case 'multiselect': return 'Multiselect';
    case 'radio': return 'Radio';
    case 'checkbox': return 'Checkbox';
    case 'text': return 'Text';
    case 'date-range': return 'Date Range';
    case 'input': return 'Input';
    case 'number': return 'Number';
    case 'hyperlink': return 'Hyperlink';
    case 'date': return 'Date';
    default: return 'Dropdown';
  }
};

interface CustomField {
  id: string;
  title: string;
  description: string;
  type: 'dropdown' | 'multiselect' | 'radio' | 'date' | 'text' | 'checkbox' | 'date-range' | 'input' | 'number' | 'hyperlink';
  options: string[];
  isCustom?: boolean;
  isPopulatedFromApi?: boolean;
  ismandate?: number | boolean;
  dbIds?: number[];
  optionDbIds?: { [optionName: string]: number };
}

interface MasterFieldCardProps {
  field: CustomField;
  onAddOption: (option: string, dbId?: number) => void;
  onRemoveOption: (index: number) => void;
  onRemoveField?: () => void;
  fieldTitle: string;
  tabName: string;
  fieldType: 'dropdown' | 'multiselect' | 'radio' | 'date' | 'text' | 'checkbox' | 'date-range' | 'input' | 'number' | 'hyperlink';
  onEditClick?: () => void;
}

const MasterFieldCard: React.FC<MasterFieldCardProps> = ({
  field,
  onAddOption,
  onRemoveOption,
  onRemoveField,
  fieldTitle,
  tabName,
  fieldType,
  onEditClick
}) => {
  const [newOption, setNewOption] = useState('');
  const [adding, setAdding] = useState(false);

  const isMandated = field.ismandate === 1 || field.ismandate === true;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOption.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      const res = await createMaster({
        name: fieldTitle,
        slug: trimmed,
        master: tabName,
        type: mapUiTypeToApiType(fieldType),
      });

      if (res.success !== false) {
        // Add to local state (using returned db id if present)
        const dbId = res.data?.id;
        onAddOption(trimmed, dbId);
        setNewOption('');
      } else {
        Swal.fire({
          title: 'Failed to Add',
          text: res.message || 'Could not add the master entry. Please try again.',
          icon: 'error',
          confirmButtonColor: '#EF4444',
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Error',
        text: err?.message || 'An unexpected error occurred.',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setAdding(false);
    }
  };

  const hasOptions = ['dropdown', 'multiselect', 'radio', 'checkbox'].includes(field.type);

  // Type Badges & Icons
  const getTypeBadge = () => {
    switch (field.type) {
      case 'multiselect':
        return {
          label: 'Multi-select',
          style: 'bg-indigo-50 border-indigo-100 text-indigo-700',
          icon: List
        };
      case 'checkbox':
        return {
          label: 'Checkbox',
          style: 'bg-cyan-50 border-cyan-100 text-cyan-700',
          icon: List
        };
      case 'radio':
        return {
          label: 'Radio Buttons',
          style: 'bg-purple-50 border-purple-100 text-purple-700',
          icon: CircleDot
        };
      case 'date':
        return {
          label: 'Date Picker',
          style: 'bg-amber-50 border-amber-100 text-amber-700',
          icon: Calendar
        };
      case 'date-range':
        return {
          label: 'Date Range',
          style: 'bg-orange-50 border-orange-100 text-orange-700',
          icon: Calendar
        };
      case 'text':
        return {
          label: 'Text Area',
          style: 'bg-slate-50 border-slate-100 text-slate-700',
          icon: Type
        };
      case 'input':
        return {
          label: 'Text Input',
          style: 'bg-zinc-50 border-zinc-100 text-zinc-700',
          icon: Type
        };
      case 'number':
        return {
          label: 'Number Input',
          style: 'bg-teal-50 border-teal-100 text-teal-700',
          icon: Type
        };
      case 'hyperlink':
        return {
          label: 'Hyperlink',
          style: 'bg-sky-50 border-sky-100 text-sky-700',
          icon: Type
        };
      default:
        return {
          label: 'Dropdown',
          style: 'bg-blue-50 border-blue-100 text-blue-700',
          icon: ChevronDown
        };
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isMandated || !onEditClick) return;

    // Check if the user double-clicked inside an input, button, form, or list tag close button
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('form') ||
      target.classList.contains('cursor-pointer')
    ) {
      return;
    }
    onEditClick();
  };

  const badge = getTypeBadge();
  const BadgeIcon = badge.icon;

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      className={`bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col gap-4 text-left hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)] transition-all relative group anim-scale-in ${!isMandated ? 'cursor-pointer select-none' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="pr-8 space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800 truncate">{field.title}</h4>
            {!isMandated && onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer flex-shrink-0"
                title="Edit field settings"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${badge.style}`}>
              <BadgeIcon className="w-3 h-3" />
              <span>{badge.label}</span>
            </span>
            {field.isCustom && !isMandated && (
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-100 uppercase tracking-wider">Custom</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">{field.description}</p>
        </div>
        
        {isMandated ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-200/20 text-amber-700 text-[9px] font-black uppercase tracking-wider shadow-xs flex-shrink-0 animate-pulse select-none">
            <LockKeyhole className="w-3 h-3 shrink-0" />
            <span>Locked</span>
          </div>
        ) : (
          onRemoveField && (
            <button
              type="button"
              onClick={onRemoveField}
              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer flex-shrink-0"
              title="Delete custom category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Conditional UI based on field type */}
      {hasOptions ? (
        <>
          {/* Option Badges */}
          <div className="flex flex-wrap gap-2 min-h-[5rem] p-3 border border-slate-100 rounded-xl bg-slate-50/50 max-h-40 overflow-y-auto">
            {field.options.length === 0 ? (
              <span className="text-xs text-slate-400 my-auto mx-auto font-medium">No options set. Add one below.</span>
            ) : (
              field.options.map((opt, idx) => (
                <div 
                  key={idx} 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  {(field.type === 'radio' || field.type === 'dropdown') && <span className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block bg-slate-100" />}
                  {field.type === 'checkbox' && <span className="w-2.5 h-2.5 border border-slate-300 inline-block bg-slate-100 rounded-sm" />}
                  <span>{opt}</span>
                  {!isMandated && (
                    <button 
                      type="button" 
                      onClick={() => onRemoveOption(idx)}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-100 hover:text-rose-500 text-slate-400 transition cursor-pointer text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add new option form */}
          {!isMandated && (
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                placeholder="Add value option..."
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                disabled={adding}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold placeholder:text-slate-400 text-slate-800 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={adding || !newOption.trim()}
                className="px-3 py-2 bg-[#1A56DB] hover:bg-[#1648C0] disabled:bg-blue-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer press min-w-[60px]"
              >
                {adding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </form>
          )}
        </>
      ) : (
        /* Field Control Previews */
        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/80 flex flex-col gap-2 min-h-[5rem] justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Control Preview</span>
          {field.type === 'date' || field.type === 'date-range' ? (
            <div className="relative">
              <input 
                type="text" 
                placeholder={field.type === 'date-range' ? "Select date range..." : "Select date..."}
                disabled 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none" 
              />
            </div>
          ) : field.type === 'number' ? (
            <input 
              type="number" 
              placeholder="0" 
              disabled 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none" 
            />
          ) : field.type === 'hyperlink' ? (
            <input 
              type="url" 
              placeholder="https://example.com" 
              disabled 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none" 
            />
          ) : (
            <input 
              type="text" 
              placeholder="User response text input..." 
              disabled 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none" 
            />
          )}
        </div>
      )}
    </div>
  );
};

const getFieldIdFromCategoryName = (name: string): string | null => {
  const norm = name.toLowerCase().trim();
  if (
    norm === 'property type' ||
    norm === 'property types' ||
    norm === 'project types' ||
    norm === 'project type' ||
    norm === 'property' ||
    norm === 'residential'
  ) {
    return 'project_types';
  }
  if (norm.includes('project status')) {
    return 'project_statuses';
  }
  if (norm.includes('amenit') || norm.includes('facilit')) {
    return 'project_facilities';
  }
  if (norm.includes('budget')) {
    return 'project_budgets';
  }
  if (norm.includes('broker type')) {
    return 'broker_types';
  }
  if (norm.includes('experience')) {
    return 'broker_experience';
  }
  if (norm.includes('account status')) {
    return 'broker_statuses';
  }
  if (norm.includes('document')) {
    return 'broker_documents';
  }
  if (norm.includes('purpose')) {
    return 'receptionist_purposes';
  }
  if (norm.includes('occupation')) {
    return 'receptionist_occupations';
  }
  return null;
};

export const Customization: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'project' | 'broker' | 'receptionist'>('project');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('Dropdown');
  const [newFieldTab, setNewFieldTab] = useState<'project' | 'broker' | 'receptionist'>('project');
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  useEffect(() => {
    if (showAddFieldModal) {
      setNewFieldTab(activeSubTab);
    }
  }, [showAddFieldModal, activeSubTab]);

  // --- Dynamic Master Project Fields ---
  const [projectFields, setProjectFields] = useState<CustomField[]>([]);

  // --- Dynamic Master Broker Fields ---
  const [brokerFields, setBrokerFields] = useState<CustomField[]>([]);

  // --- Dynamic Master Receptionist Fields ---
  const [receptionistFields, setReceptionistFields] = useState<CustomField[]>([]);
  const loadMasters = async (query: string) => {
    try {
      const params: any = { page: 1, limit: 10 };
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        params.search = trimmedQuery;
      }
      const res = await getMasters(params);

      if (trimmedQuery) {
        // We still fire the API request so it hits the backend on change,
        // but we do not overwrite or clear the state of other fields and options.
        return;
      }

      if (res.success && Array.isArray(res.data)) {
        const updatedProjectFields: CustomField[] = [];
        const updatedBrokerFields: CustomField[] = [];
        const updatedReceptionistFields: CustomField[] = [];

        res.data.forEach(item => {
          if (!item.name || !item.slug) return;

          const normTab = (item.master || '').toLowerCase().trim();
          const normName = item.name.toLowerCase().trim();

          let list: CustomField[];
          let defaultIdPrefix = '';

          // Map master (tab) to appropriate category list
          if (normTab === 'property' || normTab === 'project' || normTab === 'master project') {
            list = updatedProjectFields;
            defaultIdPrefix = 'project';
          } else if (normTab === 'broker' || normTab === 'master broker') {
            list = updatedBrokerFields;
            defaultIdPrefix = 'broker';
          } else if (normTab === 'receptionist' || normTab === 'master receptionist') {
            list = updatedReceptionistFields;
            defaultIdPrefix = 'receptionist';
          } else {
            // Fallback mapping based on the card name itself if master is absent
            const matchedId = getFieldIdFromCategoryName(item.name);
            if (matchedId) {
              if (matchedId.startsWith('project_')) {
                list = updatedProjectFields;
                defaultIdPrefix = 'project';
              } else if (matchedId.startsWith('broker_')) {
                list = updatedBrokerFields;
                defaultIdPrefix = 'broker';
              } else {
                list = updatedReceptionistFields;
                defaultIdPrefix = 'receptionist';
              }
            } else {
              // Final fallback
              list = updatedProjectFields;
              defaultIdPrefix = 'project';
            }
          }

          // Find matching card (either exact match or normalized match)
          let matchedField = list.find(f => f.title.toLowerCase() === normName);
          if (!matchedField) {
            matchedField = list.find(f => {
              const fTitle = f.title.toLowerCase();
              if ((normName.includes('property type') || normName.includes('project type')) &&
                  (fTitle.includes('property type') || fTitle.includes('project type') || fTitle.includes('project types'))) {
                return true;
              }
              return false;
            });
          }

          if (matchedField) {
            // Clear default list on first dynamic item population
            if (!matchedField.isPopulatedFromApi) {
              matchedField.options = [];
              matchedField.dbIds = [];
              matchedField.optionDbIds = {};
              matchedField.isPopulatedFromApi = true;
            }
            if (!matchedField.options.includes(item.slug)) {
              matchedField.options.push(item.slug);
              if (item.id) {
                if (!matchedField.dbIds) matchedField.dbIds = [];
                matchedField.dbIds.push(item.id);
                if (!matchedField.optionDbIds) matchedField.optionDbIds = {};
                matchedField.optionDbIds[item.slug] = item.id;
              }
            }
            if (item.type) {
              matchedField.type = mapApiTypeToUiType(item.type);
            }
            matchedField.ismandate = item.ismandate;
          } else {
            // Dynamically append new card configuration if not matching static templates
            const cleanId = `${defaultIdPrefix}_${normName.replace(/[^a-z0-9]/g, '_')}`;
            const newField: CustomField = {
              id: cleanId,
              title: item.name,
              description: `Configure dropdown options for ${item.name}`,
              type: mapApiTypeToUiType(item.type),
              options: [item.slug],
              isCustom: true,
              isPopulatedFromApi: true,
              ismandate: item.ismandate,
              dbIds: item.id ? [item.id] : [],
              optionDbIds: item.id ? { [item.slug]: item.id } : {}
            };
            list.push(newField);
          }
        });

        // Update states
        setProjectFields(updatedProjectFields);
        setBrokerFields(updatedBrokerFields);
        setReceptionistFields(updatedReceptionistFields);
      }
    } catch (err) {
      console.error('Failed to load master fields', err);
    }
  };

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadMasters('');
      return;
    }

    const delayDebounce = setTimeout(() => {
      loadMasters(searchQuery);
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Option actions
  const handleAddOption = (fieldId: string, option: string, dbId?: number) => {
    let setter;
    if (activeSubTab === 'project') setter = setProjectFields;
    else if (activeSubTab === 'broker') setter = setBrokerFields;
    else if (activeSubTab === 'receptionist') setter = setReceptionistFields;
    if (!setter) return;

    setter(prev => prev.map(f => {
      if (f.id === fieldId) {
        const nextDbIds = f.dbIds ? [...f.dbIds] : [];
        if (dbId && !nextDbIds.includes(dbId)) {
          nextDbIds.push(dbId);
        }
        const nextOptionDbIds = f.optionDbIds ? { ...f.optionDbIds } : {};
        if (dbId) {
          nextOptionDbIds[option] = dbId;
        }
        return {
          ...f,
          options: [...new Set([...f.options, option])],
          dbIds: nextDbIds,
          optionDbIds: nextOptionDbIds
        };
      }
      return f;
    }));
  };

  const handleRemoveOption = (fieldId: string, optionIdx: number) => {
    let setter;
    if (activeSubTab === 'project') setter = setProjectFields;
    else if (activeSubTab === 'broker') setter = setBrokerFields;
    else if (activeSubTab === 'receptionist') setter = setReceptionistFields;
    if (!setter) return;

    setter(prev => prev.map(f => {
      if (f.id === fieldId) {
        return { ...f, options: f.options.filter((_, i) => i !== optionIdx) };
      }
      return f;
    }));
  };

  const handleRemoveField = (field: CustomField) => {
    const fieldId = field.id;
    const fieldTitle = field.title;
    const dbIds = field.dbIds || [];

    Swal.fire({
      title: 'Delete Custom Field?',
      text: `Are you sure you want to permanently delete "${fieldTitle}"? All option values and configurations for this field will be removed from system forms. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Delete Field',
      cancelButtonText: 'Cancel',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          if (dbIds.length > 0) {
            await Promise.all(
              dbIds.map(id => updateMasterStatus(id, 0))
            );
          }
          return true;
        } catch (err: any) {
          Swal.showValidationMessage(`Delete failed: ${err?.message || err}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        let setter;
        if (activeSubTab === 'project') setter = setProjectFields;
        else if (activeSubTab === 'broker') setter = setBrokerFields;
        else if (activeSubTab === 'receptionist') setter = setReceptionistFields;
        if (setter) {
          setter(prev => prev.filter(f => f.id !== fieldId));
        }
        Swal.fire({
          title: 'Deleted!',
          text: `Field "${fieldTitle}" has been removed successfully from active registers.`,
          icon: 'success',
          confirmButtonColor: '#3B82F6'
        });
      }
    });
  };

  const handleSaveField = (updatedField: CustomField) => {
    let setter;
    if (activeSubTab === 'project') setter = setProjectFields;
    else if (activeSubTab === 'broker') setter = setBrokerFields;
    else if (activeSubTab === 'receptionist') setter = setReceptionistFields;
    if (!setter) return;

    setter(prev => prev.map(f => f.id === updatedField.id ? updatedField : f));
    setEditingField(null);

    // Refresh option IDs and status from server
    loadMasters('');

    Swal.fire({
      title: 'Field Settings Saved',
      text: `Configuration for "${updatedField.title}" has been updated successfully.`,
      icon: 'success',
      confirmButtonColor: '#10B981'
    });
  };

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFieldName.trim();
    if (!name) return;

    const needsOpt = ['Dropdown', 'Multiselect', 'Radio', 'Checkbox'].includes(newFieldType);
    if (needsOpt && newFieldOptions.length === 0) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please add at least one option for this custom field.',
        icon: 'warning',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    setSubmitting(true);
    try {
      const tabNameValue = newFieldTab === 'project' ? 'Property' : newFieldTab === 'broker' ? 'Broker' : 'Receptionist';
      const apiType = newFieldType; // Matches backend's format like "Dropdown", "Multiselect", etc.

      const optionsToCreate = needsOpt ? newFieldOptions : ['-'];

      const createdIds: number[] = [];
      const createdOptionDbIds: { [optionName: string]: number } = {};

      // Create entries in the database for each option
      for (const option of optionsToCreate) {
        const res = await createMaster({
          name: name,
          slug: option,
          master: tabNameValue,
          type: apiType,
        });
        if (res.success && res.data?.id) {
          createdIds.push(res.data.id);
          createdOptionDbIds[option] = res.data.id;
        }
      }

      // Add the new field to the local UI state dynamically
      const newFieldId = `${newFieldTab}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const newFieldObj: CustomField = {
        id: newFieldId,
        title: name,
        description: `Configure options for ${name}`,
        type: mapApiTypeToUiType(apiType),
        options: needsOpt ? newFieldOptions : [],
        isCustom: true,
        isPopulatedFromApi: true,
        dbIds: createdIds,
        optionDbIds: createdOptionDbIds
      };

      if (newFieldTab === 'project') {
        setProjectFields(prev => [...prev, newFieldObj]);
      } else if (newFieldTab === 'broker') {
        setBrokerFields(prev => [...prev, newFieldObj]);
      } else {
        setReceptionistFields(prev => [...prev, newFieldObj]);
      }

      // Reset form states & close modal
      setNewFieldName('');
      setNewFieldOptions([]);
      setShowAddFieldModal(false);

      Swal.fire({
        title: 'Success',
        text: `Custom field "${name}" has been created successfully.`,
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
    } catch (err: any) {
      Swal.fire({
        title: 'Error',
        text: err?.message || 'An unexpected error occurred while creating custom field.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getActiveFields = () => {
    let fields: CustomField[] = [];
    switch (activeSubTab) {
      case 'broker':
        fields = brokerFields;
        break;
      case 'receptionist':
        fields = receptionistFields;
        break;
      default:
        fields = projectFields;
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      fields = fields.filter(f => {
        const titleMatch = f.title.toLowerCase().includes(query);
        const optionsMatch = f.options.some(opt => opt.toLowerCase().includes(query));
        return titleMatch || optionsMatch;
      });
    }

    return [...fields].sort((a, b) => {
      const aMandate = a.ismandate === 1 || a.ismandate === true;
      const bMandate = b.ismandate === 1 || b.ismandate === true;

      if (aMandate && !bMandate) return -1;
      if (!aMandate && bMandate) return 1;

      return a.title.localeCompare(b.title);
    });
  };

  const activeFields = getActiveFields();

  return (
    <div className="flex flex-col min-h-full gap-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] anim-fade-up">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600 animate-pulse" />
            <span>Master Field Customization</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5 max-w-2xl">
            Configure master dropdown values, status settings, and checklists used across system forms
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAddFieldModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] cursor-pointer w-full sm:w-auto justify-center press flex-shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>

      {/* Pages Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200/60 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] anim-fade-up stagger-1 w-full">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('project')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === 'project'
                ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Master Project Fields</span>
          </button>
          <button
            onClick={() => setActiveSubTab('broker')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === 'broker'
                ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master Broker Fields</span>
          </button>
          <button
            onClick={() => setActiveSubTab('receptionist')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer ${
              activeSubTab === 'receptionist'
                ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Master Receptionist Fields</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full xl:w-72 flex-shrink-0">
          <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search fields or options..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold placeholder:text-slate-400 text-slate-800 transition-all focus:outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-405 hover:text-rose-500 text-xs font-bold transition-colors cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid of Customization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 anim-fade-up stagger-2">
        {activeFields.length === 0 ? (
          <div className="col-span-2 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-semibold text-sm">
            {searchQuery.trim()
              ? `No fields match your search query "${searchQuery}"`
              : 'No fields configured for this category. Click "Add Custom Field" to create one.'
            }
          </div>
        ) : (
          activeFields.map((field) => (
            <MasterFieldCard
              key={field.id}
              field={field}
              fieldTitle={field.title}
              onAddOption={(opt, dbId) => handleAddOption(field.id, opt, dbId)}
              onRemoveOption={(idx) => handleRemoveOption(field.id, idx)}
              onRemoveField={() => handleRemoveField(field)}
              onEditClick={() => setEditingField(field)}
              tabName={
                activeSubTab === 'project'
                  ? 'Property'
                  : activeSubTab === 'broker'
                  ? 'Broker'
                  : 'Receptionist'
              }
              fieldType={field.type}
            />
          ))
        )}
      </div>

      {/* Add Custom Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden anim-scale-in text-left">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Add Custom Master Field</h3>
              <button 
                onClick={() => setShowAddFieldModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomField} className="p-6 space-y-4">
              {/* Select Tab */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Master Tab</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['project', 'broker', 'receptionist'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setNewFieldTab(tab)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize transition cursor-pointer text-center ${
                        newFieldTab === tab
                          ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Field Name / Card Title</label>
                <input
                  type="text"
                  placeholder="e.g. Amenities, Secondary Languages"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Field Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Field Control Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => {
                    setNewFieldType(e.target.value);
                    // Clear options if shifting to a non-options type
                    const needsOpt = ['Dropdown', 'Multiselect', 'Radio', 'Checkbox'].includes(e.target.value);
                    if (!needsOpt) {
                      setNewFieldOptions([]);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
                >
                  {['Dropdown', 'Multiselect', 'Radio', 'Checkbox', 'Text', 'Date Range', 'Input', 'Number', 'Hyperlink', 'Date'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Options Section */}
              {['Dropdown', 'Multiselect', 'Radio', 'Checkbox'].includes(newFieldType) && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Field Value Options</label>
                  
                  {/* Option Tag List */}
                  <div className="flex flex-wrap gap-1.5 min-h-[3rem] p-2.5 border border-slate-100 rounded-xl bg-slate-50/50 max-h-24 overflow-y-auto">
                    {newFieldOptions.length === 0 ? (
                      <span className="text-[11px] text-slate-400 my-auto mx-auto font-medium">Add options below</span>
                    ) : (
                      newFieldOptions.map((opt, idx) => (
                        <div 
                          key={idx} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm"
                        >
                          <span>{opt}</span>
                          <button 
                            type="button" 
                            onClick={() => setNewFieldOptions(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add option mini-form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter value option..."
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = optionInput.trim();
                          if (val && !newFieldOptions.includes(val)) {
                            setNewFieldOptions(prev => [...prev, val]);
                            setOptionInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = optionInput.trim();
                        if (val && !newFieldOptions.includes(val)) {
                          setNewFieldOptions(prev => [...prev, val]);
                          setOptionInput('');
                        }
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl text-xs font-bold transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1 min-w-[80px]"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Field</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Custom Field Modal */}
      {editingField && (
        <EditFieldModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onSave={handleSaveField}
        />
      )}
    </div>
  );
};

interface EditFieldModalProps {
  field: CustomField;
  onClose: () => void;
  onSave: (updatedField: CustomField) => void;
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({ field, onClose, onSave }) => {
  const [title, setTitle] = useState(field.title);
  const [type, setType] = useState(field.type);

  interface OptionStateItem {
    slug: string;
    id?: number;
  }

  const [optionItems, setOptionItems] = useState<OptionStateItem[]>(() => {
    return field.options.map(opt => ({
      slug: opt,
      id: field.optionDbIds ? field.optionDbIds[opt] : undefined
    }));
  });

  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [newOption, setNewOption] = useState('');

  const hasOptionsList = ['dropdown', 'multiselect', 'radio', 'checkbox'].includes(type);

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOption.trim();
    if (trimmed && !optionItems.some(item => item.slug === trimmed)) {
      setOptionItems(prev => [...prev, { slug: trimmed }]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    const item = optionItems[index];
    if (item.id) {
      setDeletedIds(prev => [...prev, item.id!]);
    }
    setOptionItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    setOptionItems(prev => prev.map((item, i) => i === index ? { ...item, slug: val } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Field title cannot be empty.',
        icon: 'warning',
        confirmButtonColor: '#EF4444'
      });
      return;
    }
    if (hasOptionsList && optionItems.length === 0) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Option-based fields must have at least one value option.',
        icon: 'warning',
        confirmButtonColor: '#EF4444'
      });
      return;
    }

    const masterName = field.id.startsWith('project_') 
      ? 'Property' 
      : field.id.startsWith('broker_') 
      ? 'Broker' 
      : 'Receptionist';

    const records: BulkUpdateRecord[] = [];

    if (hasOptionsList) {
      optionItems.forEach(item => {
        records.push({
          id: item.id,
          name: title.trim(),
          slug: item.slug,
          master: masterName,
          type: mapUiTypeToApiType(type)
        });
      });
      deletedIds.forEach(id => {
        records.push({
          id,
          name: title.trim(),
          slug: '-',
          master: masterName,
          type: mapUiTypeToApiType(type),
          status: 0
        });
      });
    } else {
      const existingId = field.dbIds && field.dbIds[0];
      records.push({
        id: existingId,
        name: title.trim(),
        slug: '-',
        master: masterName,
        type: mapUiTypeToApiType(type)
      });
      
      if (field.dbIds) {
        field.dbIds.forEach(id => {
          if (id !== existingId) {
            records.push({
              id,
              name: title.trim(),
              slug: '-',
              master: masterName,
              type: mapUiTypeToApiType(type),
              status: 0
            });
          }
        });
      }
    }

    // Ask for consent
    Swal.fire({
      title: 'Confirm Configuration Changes?',
      text: "Modifying a master field's name, type, or options will update all dynamic forms referencing this master. Do you want to proceed?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10B981', // emerald-600
      cancelButtonColor: '#6B7280', // slate-500
      confirmButtonText: 'Yes, Apply Changes',
      cancelButtonText: 'Cancel',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const res = await bulkUpdateMasters({ records });
          if (res.success === false) {
            throw new Error(res.message || 'Failed to bulk update');
          }
          return res;
        } catch (err: any) {
          Swal.showValidationMessage(`Update failed: ${err?.message || err}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        onSave({
          ...field,
          title: title.trim(),
          type,
          options: hasOptionsList ? optionItems.map(item => item.slug) : []
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden anim-scale-in text-left flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>Edit Field Settings</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Modify custom field title, control type, and preset options
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition rounded-xl cursor-pointer border border-transparent"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Field Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Field Name / Label <span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Budget Ranges"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold placeholder:text-slate-400 text-slate-800"
              required
            />
          </div>

          {/* Field Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Control Type <span className="text-red-500 ml-0.5">*</span></label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-850 appearance-none cursor-pointer"
              >
                <option value="dropdown">Dropdown Select</option>
                <option value="multiselect">Multi-select Dropdown</option>
                <option value="radio">Radio Buttons List</option>
                <option value="checkbox">Checkbox Checkbox</option>
                <option value="date">Date Picker</option>
                <option value="date-range">Date Range Picker</option>
                <option value="text">Text Area Input</option>
                <option value="input">Text Input Line</option>
                <option value="number">Number Input Field</option>
                <option value="hyperlink">URL / Hyperlink Field</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Options List */}
          {hasOptionsList && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Preset Value Options <span className="text-red-500 ml-0.5">*</span></label>
              
              {/* List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {optionItems.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium text-center py-2">No options added yet.</p>
                ) : (
                  optionItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.slug}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        required
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-slate-350 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent"
                        title="Remove option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Option Form */}
              <div className="flex gap-2 pt-1.5">
                <input
                  type="text"
                  placeholder="New option name..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-blue-500 font-semibold placeholder:text-slate-400 text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  disabled={!newOption.trim() || optionItems.some(item => item.slug === newOption.trim())}
                  className="px-4 py-2 bg-[#1A56DB] hover:bg-[#1648C0] disabled:bg-blue-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>
            </div>
          )}

          {!hasOptionsList && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-450 font-semibold leading-relaxed">
              Standard inputs, dates, and hyperlink text fields do not require preset options.
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer press"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] cursor-pointer press"
          >
            Save Configurations
          </button>
        </div>
      </div>
    </div>
  );
};
