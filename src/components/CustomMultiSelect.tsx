import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomMultiSelectProps {
  options: (SelectOption | string)[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  icon?: React.ComponentType<any>;
}

export const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  options,
  value = [],
  onChange,
  placeholder = 'Select options',
  className = '',
  dropdownClassName = '',
  icon: Icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleOption = (optValue: string) => {
    const newValue = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };

  const handleRemoveOption = (e: React.MouseEvent, optValue: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optValue));
  };

  const selectedLabels = value
    .map((val) => normalizedOptions.find((opt) => opt.value === val)?.label)
    .filter(Boolean) as string[];

  return (
    <div className={`relative inline-block text-left w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600/30 min-h-[38px]"
      >
        <span className="flex items-center gap-2 flex-wrap max-w-[90%] text-left">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          {selectedLabels.length === 0 ? (
            <span className="text-slate-400 truncate">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 max-w-full">
              {selectedLabels.map((label, idx) => {
                const val = value[idx];
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md px-1.5 py-0.5 text-[10px] font-bold max-w-[150px] truncate"
                  >
                    <span className="truncate">{label}</span>
                    <span
                      onClick={(e) => handleRemoveOption(e, val)}
                      className="hover:bg-blue-100 p-0.5 rounded-full cursor-pointer shrink-0"
                    >
                      <X className="w-2.5 h-2.5 text-blue-600" />
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100 text-left ${dropdownClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleToggleOption(opt.value)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors duration-155 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
