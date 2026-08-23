import React from 'react';

export type GeneralStatus =
  | 'active'
  | 'frozen'
  | 'depleted'
  | 'confirmed'
  | 'pending'
  | 'rejected'
  | 'completed'
  | 'cancelled';

interface StatusBadgeProps {
  status: string | GeneralStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { bg: string; text: string; border: string; defaultLabel: string }> = {
  active: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    defaultLabel: 'نشط',
  },
  confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    defaultLabel: 'تم التأكيد',
  },
  completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    defaultLabel: 'مكتمل',
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    defaultLabel: 'قيد الانتظار',
  },
  frozen: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    defaultLabel: 'مجمد مؤقتاً',
  },
  depleted: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    defaultLabel: 'رصيد مستنفد',
  },
  rejected: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    defaultLabel: 'مرفوض',
  },
  cancelled: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    defaultLabel: 'ملغي',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const normKey = (status || '').toString().toLowerCase();
  const config = statusConfig[normKey] || {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    defaultLabel: label || status || 'غير محدد',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 ml-0.5 opacity-75" />
      {label || config.defaultLabel}
    </span>
  );
};
