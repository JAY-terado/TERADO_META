import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: React.ComponentType<any>;
  error?: boolean;
  onSearchChange?: (query: string) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  error = false,
  onSearchChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  /** Recalculate portal position from the trigger's bounding rect */
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH = Math.min(filtered.length * 36 + 60, 260); // approx

    const openUpward = spaceBelow < dropdownH && rect.top > dropdownH;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [filtered.length]);

  // Open / close
  const handleToggle = () => {
    if (disabled || loading) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setQuery('');
    }
  };

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setIsOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    const update = () => updatePosition();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setQuery('');
  };

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-slate-200 rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.16)] overflow-hidden"
    >
      {/* Search input */}
      <div className="p-2 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute inset-y-0 left-2.5 my-auto w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (onSearchChange) onSearchChange(val);
            }}
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white transition text-slate-800 font-medium placeholder-slate-400"
          />
        </div>
      </div>

      {/* Options list */}
      <ul className="max-h-52 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
            No results found
          </li>
        ) : (
          filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(option);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                  option === value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{option}</span>
                {option === value && (
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl text-xs font-semibold transition-all duration-200 text-left overflow-hidden ${
          disabled || loading
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? error
              ? 'bg-white border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.12)] text-slate-800'
              : 'bg-white border-blue-500 shadow-[0_0_0_3px_rgba(26,86,219,0.12)] text-slate-800'
            : error
            ? 'bg-white border-red-300 text-slate-800'
            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-slate-300 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className={`truncate min-w-0 ${value ? 'text-slate-800' : 'text-slate-400/50'}`}>
            {loading ? 'Loading…' : value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Portal dropdown — renders into document.body, always on top */}
      {createPortal(dropdown, document.body)}
    </div>
  );
};
