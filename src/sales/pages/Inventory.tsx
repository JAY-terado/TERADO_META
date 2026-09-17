/*
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Grid, ShieldCheck } from 'lucide-react';
import { getProjectsList } from '../../pages/api/projects';

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await getProjectsList();
        if (res && res.success && Array.isArray(res.data)) {
          setProjectsList(res.data);
        } else {
          setError('Failed to load projects inventory.');
        }
      } catch (err: any) {
        console.error('Error fetching projects list:', err);
        setError(err.message || 'An error occurred while fetching projects.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getProjectStatus = (proj: any) => {
    if (proj.project_status_id === 1) return 'Upcoming';
    if (proj.project_status_id === 2) return 'Active';
    if (proj.project_status_id === 3) return 'Sold Out';
    if (proj.project_status_id === 4) return 'Completed';
    if (proj.project_status_id === 5) return 'On Hold';
    return proj.status === 1 ? 'Active' : 'Inactive';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
        <h2 className="text-lg font-bold text-[#0F172A]">Real-Time Projects Inventory</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Explore active real estate inventories, configurations, and possession timelines</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
          <svg className="animate-spin h-8 w-8 text-[#1A56DB] mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-slate-500 font-semibold">Loading real-time projects inventory...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-semibold text-sm">
          <span>{error}</span>
        </div>
      ) : projectsList.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-100 text-center text-slate-400 font-medium">
          No projects found in the inventory.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((proj, idx) => {
            const statusLabel = getProjectStatus(proj);
            return (
              <div 
                key={proj.id || idx} 
                onClick={() => navigate(`/sales/inventory/${proj.id}`)}
                className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-indigo-500/50 hover:-translate-y-1 transform transition duration-300 cursor-pointer"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Building className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      statusLabel === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      statusLabel === 'Upcoming' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{proj.project_name}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{proj.city || proj.area_locality || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Towers</span>
                      <span className="text-xs font-bold text-slate-700 mt-0.5 block">{proj.towers || 1}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Units</span>
                      <span className="text-xs font-bold text-slate-700 mt-0.5 block">{proj.units || 100}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Grid className="w-3.5 h-3.5 text-slate-400" />
                    <span>1, 2, 3 BHK</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>RERA Registered</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
*/
export {};


