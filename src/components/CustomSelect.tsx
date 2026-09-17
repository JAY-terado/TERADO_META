import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: (SelectOption | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
  dropdownClassName = '',
  icon: Icon,
  onClick,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  /** Recalculate fixed position from trigger's bounding rect */
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH = Math.min(normalizedOptions.length * 36 + 8, 260);
    const openUpward = spaceBelow < dropdownH && rect.top > dropdownH;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      minWidth: 160,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [normalizedOptions.length]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      if (onClick) {
        onClick();
      }
    }
    setIsOpen((prev) => !prev);
  };

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

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={`bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto text-left ${dropdownClassName}`}
    >
      {normalizedOptions.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur before click
              onChange(opt.value);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors duration-150 text-left cursor-pointer ${
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
  ) : null;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-xs font-semibold transition-all min-h-[38px] ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600/30'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className={`truncate ${selectedOption ? (disabled ? 'text-slate-500' : 'text-slate-700') : 'text-slate-400/50 font-medium'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        {!disabled && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Portal dropdown — renders into document.body, always on top */}
      {createPortal(dropdown, document.body)}
    </div>
  );
};
