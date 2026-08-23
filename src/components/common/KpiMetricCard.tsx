import React from 'react';

interface KpiMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  theme?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'slate';
  subtitle?: string;
  badgeText?: string;
  onClick?: () => void;
}

const themeStyles = {
  emerald: {
    bg: 'bg-emerald-50/60 hover:bg-emerald-50',
    border: 'border-emerald-100/80',
    iconBg: 'bg-emerald-500 text-white shadow-emerald-200',
    valColor: 'text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50/60 hover:bg-amber-50',
    border: 'border-amber-100/80',
    iconBg: 'bg-amber-500 text-white shadow-amber-200',
    valColor: 'text-amber-700',
  },
  blue: {
    bg: 'bg-blue-50/60 hover:bg-blue-50',
    border: 'border-blue-100/80',
    iconBg: 'bg-blue-600 text-white shadow-blue-200',
    valColor: 'text-blue-700',
  },
  purple: {
    bg: 'bg-purple-50/60 hover:bg-purple-50',
    border: 'border-purple-100/80',
    iconBg: 'bg-purple-600 text-white shadow-purple-200',
    valColor: 'text-purple-700',
  },
  rose: {
    bg: 'bg-rose-50/60 hover:bg-rose-50',
    border: 'border-rose-100/80',
    iconBg: 'bg-rose-500 text-white shadow-rose-200',
    valColor: 'text-rose-700',
  },
  slate: {
    bg: 'bg-slate-50/60 hover:bg-slate-100/60',
    border: 'border-slate-200/80',
    iconBg: 'bg-slate-700 text-white shadow-slate-200',
    valColor: 'text-slate-800',
  },
};

export const KpiMetricCard: React.FC<KpiMetricCardProps> = ({
  title,
  value,
  icon,
  theme = 'emerald',
  subtitle,
  badgeText,
  onClick,
}) => {
  const currentTheme = themeStyles[theme];

  return (
    <div
      onClick={onClick}
      className={`p-5 sm:p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.bg} transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`p-3.5 rounded-2xl shadow-md ${currentTheme.iconBg}`}>
          {icon}
        </div>
        {badgeText && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200/60 text-slate-600 shadow-sm">
            {badgeText}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
        <h4 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 ${currentTheme.valColor}`}>
          {value}
        </h4>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
