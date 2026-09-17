import React, { useState, useEffect, useRef } from 'react';
import { Building, ChevronDown, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';
import { useBrokerConnect } from '../context/BrokerConnectContext';
import { getProjectsDropdownList, type ProjectDropdownItem } from '../pages/api/projects';

export const ProjectsDropdown: React.FC = () => {
  // Strictly render only for admin role
  const userRole = Cookies.get('userRole');
  if (userRole !== 'admin') return null;

  const { selectedProjectId, setSelectedProjectId } = useBrokerConnect();
  const [projects, setProjects] = useState<ProjectDropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await getProjectsDropdownList();
        if (res.success && Array.isArray(res.data)) {
          setProjects(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch projects list for dropdown:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Close dropdown on click outside & listen to close-dropdowns events
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleClose = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.except !== 'projects') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('close-dropdowns', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('close-dropdowns', handleClose);
    };
  }, []);

  const cachedProjectName =
    typeof window !== 'undefined'
      ? localStorage.getItem('selectedProjectName') || Cookies.get('selectedProjectName')
      : null;
  const selectedProject = projects.find(
    (p) => p.id === selectedProjectId || String(p.id) === String(selectedProjectId)
  );

  useEffect(() => {
    if (selectedProject?.project_name) {
      localStorage.setItem('selectedProjectName', selectedProject.project_name);
      Cookies.set('selectedProjectName', selectedProject.project_name, { expires: 30 });
    }
  }, [selectedProject]);

  const displayText = selectedProject
    ? selectedProject.project_name
    : selectedProjectId && cachedProjectName
    ? cachedProjectName
    : 'All Projects';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            window.dispatchEvent(new CustomEvent('close-dropdowns', { detail: { except: 'projects' } }));
          }
        }}
        className="flex items-center gap-2 px-3 py-2 bg-white/6 hover:bg-white/10 border border-white/10 lg:bg-slate-50 lg:hover:bg-slate-100 lg:border-slate-200/60 transition cursor-pointer rounded-xl text-blue-200 lg:text-slate-600 focus:outline-none text-xs font-semibold"
      >
        <Building className="w-4 h-4 text-blue-300 lg:text-slate-400 shrink-0" />
        <span className="truncate max-w-[100px] sm:max-w-[140px] text-left text-white lg:text-slate-700">
          {displayText}
        </span>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-blue-300 lg:text-slate-400 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 lg:left-0 lg:right-auto mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden z-50 animate-fade-in text-left">
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              onClick={() => {
                setSelectedProjectId(null);
                localStorage.removeItem('selectedProjectName');
                Cookies.remove('selectedProjectName');
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between transition cursor-pointer border-none outline-none text-left ${
                selectedProjectId === null ? 'text-blue-600 bg-blue-50/40' : 'text-slate-600'
              }`}
            >
              <span>All Projects</span>
              {selectedProjectId === null && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
            </button>

            {projects.map((proj) => {
              const isSelected =
                selectedProjectId !== null &&
                (proj.id === selectedProjectId || String(proj.id) === String(selectedProjectId));
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    localStorage.setItem('selectedProjectName', proj.project_name);
                    Cookies.set('selectedProjectName', proj.project_name, { expires: 30 });
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between transition cursor-pointer border-none outline-none text-left ${
                    isSelected ? 'text-blue-600 bg-blue-50/40' : 'text-slate-600'
                  }`}
                >
                  <span className="truncate">{proj.project_name}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
