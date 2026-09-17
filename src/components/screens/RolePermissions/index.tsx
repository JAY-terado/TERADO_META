import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Edit3,
  KeyRound,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  Users,
  PhoneCall,
  Briefcase,
  Building2,
  Info,
  Sparkles,
  Check,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  getRolePermissions,
  updateRolePermissions,
  type RolePermissionItem,
} from '../../../admin/api/permissions';

interface RoleMeta {
  displayName: string;
  badge: string;
  description: string;
  avatarBg: string;
  avatarText: string;
  icon: React.ComponentType<any>;
}

const ROLE_METADATA: Record<string, RoleMeta> = {
  SALES: {
    displayName: 'Sales Executive',
    badge: 'Sales Desk',
    description: 'On-site sales executives managing property walk-ins, discussions, and conversions',
    avatarBg: 'bg-blue-600',
    avatarText: 'text-white',
    icon: Users,
  },
  CALLING: {
    displayName: 'Calling Agent / Pre-Sales',
    badge: 'Calling Desk',
    description: 'Pre-sales telecallers and agents qualifying and following up on inbound inquiries',
    avatarBg: 'bg-indigo-600',
    avatarText: 'text-white',
    icon: PhoneCall,
  },
  BROKER: {
    displayName: 'Direct Broker',
    badge: 'Broker Portal',
    description: 'Independent brokers and agents registered directly on the portal',
    avatarBg: 'bg-emerald-600',
    avatarText: 'text-white',
    icon: Briefcase,
  },
  CP: {
    displayName: 'Channel Partner (CP)',
    badge: 'CP Network',
    description: 'Channel partner organizations, agencies, and associated CP brokers',
    avatarBg: 'bg-amber-600',
    avatarText: 'text-white',
    icon: Building2,
  },
};

export const RolePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermissionItem[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<RolePermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingRoles, setSavingRoles] = useState<Record<string, boolean>>({});

  const fetchPermissions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRolePermissions();
      if (res && res.success && Array.isArray(res.data)) {
        setPermissions(res.data);
        setInitialPermissions(JSON.parse(JSON.stringify(res.data)));
      } else {
        setError(res?.message || 'Failed to load role permissions.');
      }
    } catch (err: any) {
      console.error('Error fetching role permissions:', err);
      setError(err?.response?.data?.message || err.message || 'An error occurred while fetching role permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleToggle = (role: string, field: keyof Omit<RolePermissionItem, 'id' | 'role'>) => {
    setPermissions(prev =>
      prev.map(item => {
        if (item.role === role) {
          return {
            ...item,
            [field]: item[field] === 1 ? 0 : 1,
          };
        }
        return item;
      })
    );
  };

  const isRoleModified = (role: string) => {
    const current = permissions.find(p => p.role === role);
    const initial = initialPermissions.find(p => p.role === role);
    if (!current || !initial) return false;
    const currentCanUpdateBroker = current.can_update_broker === 1 ? 1 : 0;
    const initialCanUpdateBroker = initial.can_update_broker === 1 ? 1 : 0;
    const currentIsOtpBroker = current.is_otp_mandatory_on_broker_creation === 1 ? 1 : 0;
    const initialIsOtpBroker = initial.is_otp_mandatory_on_broker_creation === 1 ? 1 : 0;
    return (
      current.can_create_lead !== initial.can_create_lead ||
      current.can_update_lead !== initial.can_update_lead ||
      current.is_otp_mandatory_on_lead_creation !== initial.is_otp_mandatory_on_lead_creation ||
      currentCanUpdateBroker !== initialCanUpdateBroker ||
      currentIsOtpBroker !== initialIsOtpBroker
    );
  };

  const handleResetRole = (role: string) => {
    const initial = initialPermissions.find(p => p.role === role);
    if (!initial) return;
    setPermissions(prev =>
      prev.map(p => (p.role === role ? { ...initial } : p))
    );
  };

  const handleSaveRole = async (role: string) => {
    const current = permissions.find(p => p.role === role);
    if (!current) return;

    setSavingRoles(prev => ({ ...prev, [role]: true }));

    const payload: any = {
      can_create_lead: current.can_create_lead,
      can_update_lead: current.can_update_lead,
      is_otp_mandatory_on_lead_creation: current.is_otp_mandatory_on_lead_creation,
      can_update_broker: current.can_update_broker === 1 ? 1 : 0,
      is_otp_mandatory_on_broker_creation: current.is_otp_mandatory_on_broker_creation === 1 ? 1 : 0,
    };
    if (current.can_create_broker !== undefined) {
      payload.can_create_broker = current.can_create_broker;
    }

    try {
      const res = await updateRolePermissions(role, payload);
      if (res && (res.success || res.status === 200 || !res.error)) {
        // Update initial state snapshot for this role
        setInitialPermissions(prev =>
          prev.map(p => (p.role === role ? { ...current } : p))
        );

        const meta = ROLE_METADATA[role] || { displayName: role };
        Swal.fire({
          title: 'Permissions Updated!',
          text: `Permissions for ${meta.displayName} have been successfully updated.`,
          icon: 'success',
          confirmButtonColor: '#1A56DB',
          timer: 2000,
          timerProgressBar: true,
        });
      } else {
        Swal.fire({
          title: 'Update Failed',
          text: res?.message || `Failed to update permissions for ${role}.`,
          icon: 'error',
          confirmButtonColor: '#1A56DB',
        });
      }
    } catch (err: any) {
      console.error(`Error saving permissions for ${role}:`, err);
      Swal.fire({
        title: 'Error Occurred',
        text: err?.response?.data?.message || err.message || `An error occurred while saving ${role} permissions.`,
        icon: 'error',
        confirmButtonColor: '#1A56DB',
      });
    } finally {
      setSavingRoles(prev => ({ ...prev, [role]: false }));
    }
  };

  const filteredPermissions = permissions.filter(item => {
    const meta = ROLE_METADATA[item.role] || { displayName: item.role, description: '' };
    const query = searchTerm.toLowerCase();
    return (
      item.role.toLowerCase().includes(query) ||
      meta.displayName.toLowerCase().includes(query) ||
      meta.description.toLowerCase().includes(query)
    );
  });

  const modifiedCount = permissions.filter(p => isRoleModified(p.role)).length;

  return (
    <div className="space-y-6 text-left flex-1 flex flex-col anim-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-[#0F172A]">Role Permissions</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                System Security
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Control lead creation, editing rights, and mandatory customer OTP verification by user role
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={fetchPermissions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="Refresh Permissions"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {modifiedCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-150 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold">
              You have unsaved permission changes in {modifiedCount} role{modifiedCount > 1 ? 's' : ''}.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-700">
            Click "Save Changes" on each role card to commit
          </span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 animate-in fade-in duration-150">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="text-xs font-bold">{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-16 bg-slate-50 rounded-xl" />
                <div className="h-16 bg-slate-50 rounded-xl" />
                <div className="h-16 bg-slate-50 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPermissions.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Roles Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm ? `No roles matched your search "${searchTerm}".` : 'No role permissions configured on the server.'}
          </p>
        </div>
      ) : (
        /* Role Permissions Cards Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredPermissions.map(item => {
            const roleKey = item.role;
            const meta = ROLE_METADATA[roleKey] || {
              displayName: roleKey,
              badge: roleKey,
              description: `Permissions configuration for ${roleKey} role`,
              avatarBg: 'bg-slate-700',
              avatarText: 'text-white',
              icon: Users,
            };
            const RoleIcon = meta.icon;
            const isModified = isRoleModified(roleKey);
            const isSaving = !!savingRoles[roleKey];

            return (
              <div
                key={item.id || roleKey}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                  isModified
                    ? 'border-amber-300 ring-2 ring-amber-300/30'
                    : 'border-slate-100/90 hover:border-slate-200 hover:shadow-md'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl ${meta.avatarBg} ${meta.avatarText} flex items-center justify-center shadow-md shrink-0`}
                      >
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                            {meta.displayName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                            {meta.badge}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5 line-clamp-1">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {isModified && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                        Modified
                      </span>
                    )}
                  </div>
                </div>

                {/* Permissions Toggles List */}
                <div className="p-5 sm:p-6 space-y-3 flex-1 bg-slate-50/40">
                  {/* Permission 1: Create Leads */}
                  <div
                    onClick={() => handleToggle(roleKey, 'can_create_lead')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      item.can_create_lead === 1
                        ? 'bg-blue-50/50 border-blue-200/80 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.can_create_lead === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Create Leads</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.can_create_lead === 1
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.can_create_lead === 1 ? 'Allowed' : 'Restricted'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Enable registering and adding new client leads to the CRM pipeline
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pointer-events-none">
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          item.can_create_lead === 1 ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 left-0.5 ${
                            item.can_create_lead === 1 ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permission 2: Update Leads */}
                  <div
                    onClick={() => handleToggle(roleKey, 'can_update_lead')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      item.can_update_lead === 1
                        ? 'bg-blue-50/50 border-blue-200/80 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.can_update_lead === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Update Leads</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.can_update_lead === 1
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.can_update_lead === 1 ? 'Allowed' : 'Restricted'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Allow modifying customer profile, changing stages, and adding notes
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pointer-events-none">
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          item.can_update_lead === 1 ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 left-0.5 ${
                            item.can_update_lead === 1 ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permission 3: Mandatory OTP on Lead Creation */}
                  <div
                    onClick={() => handleToggle(roleKey, 'is_otp_mandatory_on_lead_creation')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      item.is_otp_mandatory_on_lead_creation === 1
                        ? 'bg-amber-50/60 border-amber-200/80 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.is_otp_mandatory_on_lead_creation === 1
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Mandatory OTP Verification</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.is_otp_mandatory_on_lead_creation === 1
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.is_otp_mandatory_on_lead_creation === 1 ? 'Mandatory' : 'Optional'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Require customer OTP code verification before new lead registration
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pointer-events-none">
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          item.is_otp_mandatory_on_lead_creation === 1 ? 'bg-amber-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 left-0.5 ${
                            item.is_otp_mandatory_on_lead_creation === 1 ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permission 4: Add / Update Channel Partner (CP) */}
                  {(roleKey === 'SALES' || item.can_update_broker !== undefined) && (
                    <div
                      onClick={() => handleToggle(roleKey, 'can_update_broker')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        item.can_update_broker === 1
                          ? 'bg-emerald-50/60 border-emerald-200/80 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            item.can_update_broker === 1
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Add / Update Channel Partner</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                item.can_update_broker === 1
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {item.can_update_broker === 1 ? 'Allowed' : 'Restricted'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Allow adding and updating Channel Partners (CPs) on the sales dashboard
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <div className="shrink-0 pointer-events-none">
                        <div
                          className={`w-11 h-6 rounded-full transition-colors relative ${
                            item.can_update_broker === 1 ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 left-0.5 ${
                              item.can_update_broker === 1 ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Permission 5: Mandatory OTP on Broker Creation */}
                  {(roleKey === 'SALES' || item.is_otp_mandatory_on_broker_creation !== undefined) && (
                    <div
                      onClick={() => handleToggle(roleKey, 'is_otp_mandatory_on_broker_creation')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        item.is_otp_mandatory_on_broker_creation === 1
                          ? 'bg-amber-50/60 border-amber-200/80 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            item.is_otp_mandatory_on_broker_creation === 1
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Mandatory OTP on CP Creation</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                item.is_otp_mandatory_on_broker_creation === 1
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {item.is_otp_mandatory_on_broker_creation === 1 ? 'Mandatory' : 'Optional'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Require broker mobile OTP verification before registering new Channel Partner
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <div className="shrink-0 pointer-events-none">
                        <div
                          className={`w-11 h-6 rounded-full transition-colors relative ${
                            item.is_otp_mandatory_on_broker_creation === 1 ? 'bg-amber-600' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 left-0.5 ${
                              item.is_otp_mandatory_on_broker_creation === 1 ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-white border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-3">
                  <div className="text-[11px] font-medium text-slate-400">
                    {isModified ? (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Unsaved changes
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Config synced
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => handleResetRole(roleKey)}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveRole(roleKey)}
                      disabled={!isModified || isSaving}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        !isModified || isSaving
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
