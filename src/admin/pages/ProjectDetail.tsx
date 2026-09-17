import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, MapPin, Calendar, Shield,
  Layers, Edit3, Trash2, CheckCircle2, Home, KeyRound,
  Grid3X3, Waves, Dumbbell, Baby, Zap, Clock, ChevronRight
} from 'lucide-react';
import { getProjectDetail, deleteProject } from '../../pages/api/projects';
import Swal from 'sweetalert2';
import { ProjectEditModal } from '../../components/ProjectEditModal';
import { DeleteProjectModal } from '../../components/DeleteProjectModal';
import { ErrorModal } from '../../components/ui/ErrorModal';

/* ── Amenity icon map ── */
const AMENITY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'Swimming Pool':     Waves,
  'Club House':        Building2,
  'Gymnasium':         Dumbbell,
  'Children Play Area':Baby,
  '24x7 Security':     Shield,
  'Power Backup':      Zap,
  'Car Parking':       Grid3X3,
  'Garden':            MapPin,
};
const getAmenityIcon = (name: string) => AMENITY_ICONS[name] ?? CheckCircle2;

/* ── Donut SVG ── */
const Donut: React.FC<{ total: number; segments: { value: number; color: string }[] }> = ({ total, segments }) => {
  const r = 38; const circ = 2 * Math.PI * r; let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
      {segments.map((s, i) => {
        const dash = (s.value / total) * circ;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none"
            stroke={s.color} strokeWidth="12"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset} strokeLinecap="round" />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getProjectDetail(id);
        if (res?.success && res.data) {
          setProject(res.data);
          localStorage.setItem('selectedProjectName', res.data.project_name || res.data.name);
        }
        else setError(res.message || 'Failed to fetch details.');
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally { setLoading(false); }
    };
    fetch_();
  }, [id]);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      const res = await deleteProject(project.id);
      if (res?.success !== false) {
        setShowDeleteModal(false);
        await Swal.fire({ title: 'Deleted!', text: 'Project has been deleted.', icon: 'success', timer: 1800, showConfirmButton: false });
        navigate('/admin/projects');
      } else {
        setErrorModalMsg(res.message || 'Failed to delete.');
      }
    } catch (err: any) {
      setErrorModalMsg(err.message || 'An error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  const fmtShort = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  /* ── Loading ── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
      <div className="relative">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <svg className="absolute -inset-1.5 animate-spin w-14 h-14 text-blue-200" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <span className="text-xs text-slate-400 font-medium">Loading project details…</span>
    </div>
  );

  /* ── Error ── */
  if (error || !project) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/admin/projects')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer hover:shadow-sm">
        <ArrowLeft className="w-3.5 h-3.5" />Back to Projects
      </button>
      <div className="p-5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-semibold">
        {error || 'Project data could not be loaded.'}
      </div>
    </div>
  );

  const typeName   = project.project_type_detail?.slug   || project.project_type   || 'Residential';
  const statusName = project.project_status_detail?.slug || project.project_status || 'Active';

  const statusCfg: Record<string, { pill: string; dot: string }> = {
    Active:    { pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
    Upcoming:  { pill: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
    'Sold Out':{ pill: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500' },
    Completed: { pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',    dot: 'bg-indigo-500' },
    'On Hold': { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  };
  const { pill, dot } = statusCfg[statusName] ?? statusCfg['Active'];

  const flatTypes = project.project_flat_type_detail || project.project_flat_types_detail || [];
  const amenities = project.amenities_detail || [];
  const totalUnits = Number(project.units) || 0;

  /* Donut segments — split equally across flat types */
  const segColors = ['#6366f1', '#a78bfa', '#818cf8', '#c4b5fd', '#ddd6fe'];
  const donutSegments = flatTypes.length > 0
    ? flatTypes.map((ft: any, i: number) => ({
        value: Math.round(totalUnits / flatTypes.length),
        color: segColors[i % segColors.length],
      }))
    : [{ value: 1, color: '#e2e8f0' }];



  const CARD = 'bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_4px_20px_rgba(15,23,42,0.06)]';
  const SH   = 'text-[10px] font-bold uppercase tracking-widest text-slate-400';

  return (
    <div className="space-y-4 text-left anim-fade-up">

      {/* ── Back ── */}
      <button onClick={() => navigate('/admin/projects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1A56DB] transition cursor-pointer group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Projects
      </button>

      {/* ══════════════════════════════
          HERO HEADER CARD
      ══════════════════════════════ */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: icon + name + badges */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-blue-50 rounded-2xl shrink-0">
              <Building2 className="w-8 h-8 text-[#1A56DB]" />
            </div>
            <div className="min-w-0">
              <p className={`${SH} mb-0.5`}>Project Profile</p>
              <h1 className="text-2xl font-black text-[#0F172A] leading-tight truncate">{project.project_name}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <Home className="w-3 h-3" />{typeName}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  {statusName}
                </span>
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A56DB] hover:bg-[#1648C0] text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-[0_2px_8px_rgba(26,86,219,0.3)]">
              <Edit3 className="w-3.5 h-3.5" />Edit Project
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-semibold transition cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />Delete Project
            </button>

          </div>
        </div>

        {/* ── Stat bar — single card row divided by borders ── */}
        <div className="border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          {[
            { label: 'Towers',      value: project.towers,               icon: Grid3X3, iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500' },
            { label: 'Total Units', value: project.units,                icon: Layers,  iconBg: 'bg-blue-50',    iconColor: 'text-blue-500' },
            { label: 'Launch Date', value: fmt(project.launch_date),     icon: Calendar,iconBg: 'bg-teal-50',    iconColor: 'text-teal-500' },
            { label: 'Possession',  value: fmt(project.possession_date), icon: Calendar,iconBg: 'bg-amber-50',   iconColor: 'text-amber-500' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="px-6 py-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${s.iconColor}`} />
                </div>
                <div>
                  <p className={`${SH}`}>{s.label}</p>
                  <p className="text-base font-extrabold text-slate-800 mt-0.5">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════
          MAIN 2-COLUMN GRID
      ══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* Location Details */}
          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <MapPin className="w-4 h-4 text-[#1A56DB]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Location Details</h3>
            </div>

            <div className="flex gap-4">
              {/* Fields */}
              <div className="flex-1 space-y-4">
                {/* Full address */}
                {project.full_address && (
                  <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3.5 py-3 border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{project.full_address}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-x-5 gap-y-4 pt-1">
                  {[
                    { label: 'Area / Locality', value: project.area_locality },
                    { label: 'Landmark',        value: project.landmark },
                    { label: 'City',            value: project.city },
                    { label: 'State',           value: project.state },
                    { label: 'Pincode',         value: project.pincode },
                    { label: 'Country',         value: project.country },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className={`${SH} block mb-0.5`}>{label}</span>
                      <span className="text-sm font-semibold text-slate-800">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Unit Configurations */}
          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-violet-50 rounded-lg">
                <Layers className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Unit Configurations</h3>
            </div>

            {Array.isArray(flatTypes) && flatTypes.length > 0 ? (
              <div className="flex items-center gap-6">
                {/* Flat type tiles */}
                <div className="flex flex-wrap gap-3 flex-1">
                  {flatTypes.map((item: any, i: number) => {
                    return (
                      <div key={item.id}
                        className="flex-1 min-w-[100px] bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center hover:border-violet-200 hover:bg-violet-50/30 transition cursor-default">
                        <p className={`text-xs font-bold mb-2`}
                          style={{ color: segColors[i % segColors.length] }}>
                          {item.slug || item.name}
                        </p>
                        {/* simple flat floor icon */}
                        <div className="flex justify-center opacity-30">
                          <svg viewBox="0 0 40 30" className="w-12 h-8 fill-slate-400">
                            <rect x="2" y="15" width="36" height="13" rx="1"/>
                            <rect x="8" y="8" width="24" height="9" rx="1"/>
                            <rect x="14" y="2" width="12" height="8" rx="1"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Donut */}
                <div className="shrink-0 w-24 h-24 relative">
                  <Donut total={Math.max(totalUnits, 1)} segments={donutSegments} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold text-slate-800 leading-none">{totalUnits}</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Total Units</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">No unit configurations defined yet.</p>
            )}
          </div>


        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* RERA Compliance */}
          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">RERA Compliance</h3>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <KeyRound className="w-3 h-3 text-emerald-500" />
                <span className={`${SH} text-emerald-600`}>Registration No.</span>
              </div>
              <span className="text-sm font-extrabold text-slate-800 font-mono tracking-wide break-all">
                {project.rera_registration_number || 'N/A'}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                { label: 'Registered On', value: fmt(project.rera_registration_date), icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Expires On',    value: fmt(project.rera_expiry_date),        icon: Calendar,     color: 'text-amber-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-xs text-slate-500 font-medium">{label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Grid3X3 className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Amenities</h3>
            </div>

            {Array.isArray(amenities) && amenities.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {amenities.slice(0, 6).map((item: any) => {
                    const Icon = getAmenityIcon(item.slug || item.name);
                    return (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="truncate">{item.slug || item.name}</span>
                      </div>
                    );
                  })}
                </div>
                {amenities.length > 6 && (
                  <button className="mt-4 w-full flex items-center justify-center gap-1 text-xs font-semibold text-[#1A56DB] hover:underline transition cursor-pointer">
                    View All Amenities <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 font-medium">No amenities defined yet.</p>
            )}
          </div>

        </div>
      </div>
      {showEditModal && (
        <ProjectEditModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            setProject(updated);
            localStorage.setItem('selectedProjectName', updated.project_name || updated.name);
          }}
        />
      )}
      {showDeleteModal && (
        <DeleteProjectModal
          project={project}
          onClose={() => setShowDeleteModal(false)}
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
