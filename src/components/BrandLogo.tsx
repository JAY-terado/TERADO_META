import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
  subtitle?: string;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  theme = 'dark',
  subtitle,
  showText = true,
}) => {
  const isDark = theme === 'dark';

  const iconSizes = {
    sm: 'h-7 w-7 rounded-lg',
    md: 'h-8.5 w-8.5 rounded-xl',
    lg: 'h-10 w-10 rounded-xl',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-[15px]',
    lg: 'text-lg',
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[8.5px]',
    lg: 'text-[9.5px]',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none transition-all ${className}`}>
      {/* Brand Icon Mark with subtle glow & border */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div
          className={`absolute -inset-0.5 rounded-xl opacity-20 blur-xs transition-opacity duration-300 ${
            isDark ? 'bg-gradient-to-r from-[#1062AC] to-[#EC3237]' : 'bg-[#1062AC]'
          }`}
        />
        <img
          src="/logo-mark.png"
          alt="Brand Logo"
          className={`${iconSizes[size]} object-contain relative z-10 shadow-xs border ${
            isDark ? 'border-white/10 bg-[#0B1528]' : 'border-slate-200 bg-white'
          }`}
        />
      </div>

      {/* Brand Name Lockup */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center">
            <span
              className={`font-black tracking-tight ${textSizes[size]} ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Terado<span className="text-[#38A3F8]">CRM</span>
            </span>
            <span className="ml-1.5 px-1 py-0.2 bg-[#EC3237]/15 border border-[#EC3237]/30 text-[#EC3237] text-[7.5px] font-extrabold uppercase tracking-wider rounded">
              PRO
            </span>
          </div>
          {subtitle && (
            <span
              className={`font-bold uppercase tracking-[0.12em] mt-1 ${subtitleSizes[size]} ${
                isDark ? 'text-blue-200/50' : 'text-slate-400'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
