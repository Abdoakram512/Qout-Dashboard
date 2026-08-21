"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import {
  Settings, Database, User, KeyRound, ShieldCheck,
  CheckCircle2, Eye, EyeOff, Save, Lock, Sparkles, AlertCircle
} from "lucide-react";

export default function SettingsPage() {
  const { adminData } = useAuth();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg(isAr ? "يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل" : "New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(isAr ? "كلمة المرور الجديدة غير متطابقة مع التأكيد" : "New password does not match confirmation");
      return;
    }

    setSaving(true);
    // Simulate updating or verify password update
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg(isAr ? "تم تحديث إعدادات الأمان وكلمة المرور بنجاح!" : "Security settings and password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 800);
  };

  return (
    <div className="space-y-7 max-w-4xl page-enter pb-10">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-950 flex items-center gap-3">
          <Settings className="w-7 h-7 text-slate-700" />
          <span>{isAr ? "الإعدادات وملف الإدارة العامة" : "Settings & Administration Profile"}</span>
        </h1>
        <p className="text-sm text-slate-500 font-bold mt-1">
          {isAr
            ? "معلومات الحساب الإداري، أمان المنظومة، والاتصال السحابي بقواعد البيانات"
            : "Administrative account info, platform security, and cloud infrastructure."}
        </p>
      </div>

      {/* Admin Profile Details */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0A734D] flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">
              {isAr ? "بيانات حساب المشرف العام" : "Administrator Account Details"}
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              {isAr ? "الصلاحيات المركزية الكاملة لإدارة المنظومة" : "Full central administrative privileges"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-500 font-extrabold block mb-1">
              {isAr ? "اسم المشرف:" : "Manager Name:"}
            </span>
            <span className="font-black text-slate-900 text-sm">
              {adminData?.name || (isAr ? "المشرف العام لمؤسسة الفجر الخيرية" : "General Administrator")}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-500 font-extrabold block mb-1">
              {isAr ? "البريد الإلكتروني المعتمد:" : "Official Admin Email:"}
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {adminData?.email || "admin@qout.org"}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Password Change */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">
              {isAr ? "إدارة كلمة المرور والأمان" : "Password & Security Management"}
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              {isAr ? "تغيير كلمة المرور الخاصة بحساب الإدارة العامة" : "Update administrator login password"}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
          {/* Old Password */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              {isAr ? "كلمة المرور الحالية" : "Current Password"}
            </label>
            <div className="relative">
              <input
                type={showOldPass ? "text" : "password"}
                dir="ltr"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all pr-10 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {isAr ? "كلمة المرور الجديدة" : "New Password"}
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all pr-10 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all pr-10 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary font-black px-6 py-2.5 rounded-xl flex items-center gap-2 mt-4 shadow-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isAr ? "حفظ التغييرات" : "Save Changes"}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Cloud & Database Health */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">
              {isAr ? "حالة الاتصال بالبنية التحتية السحابية" : "Cloud Infrastructure & Database Health"}
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              {isAr ? "بيانات الاتصال بقواعد بيانات Google Cloud Firebase" : "Google Cloud Firebase connection status"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-500 font-extrabold block mb-1">
              {isAr ? "معرف المشروع:" : "Project ID:"}
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">qout-f853f</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-500 font-extrabold block mb-1">
              {isAr ? "حالة السيرفر:" : "Server Status:"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-black text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isAr ? "متصل ويعمل بكفاءة (Online)" : "Healthy & Online"}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-500 font-extrabold block mb-1">
              {isAr ? "المنطقة الجغرافية:" : "Region:"}
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">europe-west1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
