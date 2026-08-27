import React from "react";

export function BrandLoading({ message = "جاري تحميل البيانات..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-3.5">
        <img
          src="/app_icon.png"
          alt="Al-Fajr Logo"
          className="w-14 h-14 rounded-2xl shadow-lg shadow-emerald-950/20 object-contain animate-bounce"
        />
        <div className="absolute -inset-1 rounded-2xl border border-emerald-500/30 animate-ping pointer-events-none" />
      </div>
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-4 py-1.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="w-3.5 h-3.5 border-2 border-[#0A734D] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-xs font-bold text-slate-700">{message}</span>
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <BrandLoading message="جاري تجهيز الصفحة..." />
    </div>
  );
}
