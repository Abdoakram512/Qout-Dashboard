"use client";

import React from "react";
import { useAuth } from "@/lib/authContext";
import { Settings, Database, User } from "lucide-react";

export default function SettingsPage() {
  const { adminData } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          <span>الإعدادات والملف الإداري</span>
        </h1>
        <p className="text-slate-500 text-xs mt-1">معلومات المنظومة والاتصال السحابي</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>بيانات حساب المشرف</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">الاسم:</span>
            <span className="font-bold text-slate-800">{adminData?.name || "المشرف العام"}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">البريد:</span>
            <span className="font-mono font-bold text-slate-800">{adminData?.email}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>معلومات خادم Firebase</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">معرف المشروع:</span>
            <span className="font-mono font-bold text-slate-800">qout-f853f</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">حالة الاتصال:</span>
            <span className="font-bold text-emerald-700">متصل (Online)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
