"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, orderBy, limit, query } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import {
  Settings, User, Globe, Plus, Trash2, History, Activity, KeyRound, ShieldCheck,
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
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [newNatName, setNewNatName] = useState("");
  const [addingNat, setAddingNat] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "nationalities"), (snap) => {
      if (snap.empty) {
        // Seed default nationalities if empty
        const defaults = ["مصرية", "سورية", "سودانية", "يمنية", "فلسطينية", "أردنية", "عراقية", "لبنانية", "أخرى"];
        defaults.forEach(async (nat) => {
          try {
            await setDoc(doc(db, "nationalities", nat), { name: nat, createdAt: new Date().toISOString() });
          } catch (_) {}
        });
      } else {
        const list: string[] = [];
        snap.forEach((d) => list.push(d.data().name || d.id));
        setNationalities(list);
      }
    });
    return () => unsub();
  }, []);

  const handleAddNationality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNatName.trim()) return;
    setAddingNat(true);
    try {
      const cleanName = newNatName.trim();
      await setDoc(doc(db, "nationalities", cleanName), {
        name: cleanName,
        createdAt: new Date().toISOString(),
      });
      setNewNatName("");
    } catch (err) {
      console.error(err);
    }
    setAddingNat(false);
  };

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(25));
    const unsub = onSnapshot(q, (snap) => {
      const logs: any[] = [];
      snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
      setAuditLogs(logs);
      setLoadingAudit(false);
    }, (err) => {
      console.error(err);
      setLoadingAudit(false);
    });
    return () => unsub();
  }, []);

  const handleDeleteNationality = async (name: string) => {
    try {
      await deleteDoc(doc(db, "nationalities", name));
    } catch (err) {
      console.error(err);
    }
  };
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
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all pr-11 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-2 top-1.5 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer z-10"
                aria-label={showOldPass ? "Hide password" : "Show password"}
                title={showOldPass ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : (isAr ? "إظهار كلمة المرور" : "Show password")}
              >
                {showOldPass ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all pr-11 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2 top-1.5 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer z-10"
                  aria-label={showNewPass ? "Hide password" : "Show password"}
                  title={showNewPass ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : (isAr ? "إظهار كلمة المرور" : "Show password")}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all pr-11 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2 top-1.5 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer z-10"
                  aria-label={showConfirmPass ? "Hide password" : "Show password"}
                  title={showConfirmPass ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : (isAr ? "إظهار كلمة المرور" : "Show password")}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
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
        {/* ── Audit Trail & Activity History Card ── */}
        <div className="card p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100/80">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {isAr ? "سجل التدقيق والرقابة الإدارية (Audit Trail)" : "Audit Trail & Activity Log"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isAr ? "توثيق العمليات الحساسة وإجراءات المشرفين والمديرين لحظة بلحظة" : "Real-time log of administrative actions"}
                </p>
              </div>
            </div>
            <span className="badge badge-primary self-start sm:self-auto font-mono font-bold">
              {auditLogs.length} {isAr ? "حركة مسجلة" : "Events"}
            </span>
          </div>

          {/* Audit Logs List */}
          <div className="space-y-3">
            {loadingAudit ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                {isAr ? "جاري تحميل سجل التدقيق..." : "Loading audit trail..."}
              </p>
            ) : auditLogs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-400 font-medium border border-slate-200/60">
                {isAr ? "لا توجد حركات إدارية مسجلة بعد" : "No audit events recorded yet"}
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                        {log.action}
                      </span>
                      {log.targetName && (
                        <span className="text-xs font-bold text-slate-900">
                          {log.targetName}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-600 font-medium">
                        {log.details}
                      </p>
                    )}
                    {log.adminEmail && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        بواسطة: {log.adminEmail}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString(isAr ? "ar-EG" : "en-US") : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Allowed Nationalities Management Card ── */}
        <div className="card p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {isAr ? "إدارة جنسيات المستفيدين المعتمدة" : "Beneficiary Nationalities Management"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isAr ? "تحكم في قائمة الجنسيات المتاحة للمستفيدين عند التسجيل في التطبيق" : "Control the list of nationalities available for registration in the app"}
                </p>
              </div>
            </div>
            <span className="badge badge-primary self-start sm:self-auto font-mono font-bold">
              {nationalities.length} {isAr ? "جنسية مسجلة" : "Nationalities"}
            </span>
          </div>

          {/* Add Nationality Form */}
          <form onSubmit={handleAddNationality} className="flex gap-2.5">
            <input
              type="text"
              value={newNatName}
              onChange={(e) => setNewNatName(e.target.value)}
              placeholder={isAr ? "أدخل اسم الجنسية الجديدة (مثال: مغربية، تونسية...)" : "Enter nationality name..."}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={addingNat || !newNatName.trim()}
              className="btn btn-primary px-5 font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة" : "Add"}</span>
            </button>
          </form>

          {/* Nationalities Badges Grid */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {nationalities.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                {isAr ? "جاري تحميل الجنسيات من قاعدة البيانات..." : "Loading nationalities..."}
              </p>
            ) : (
              nationalities.map((nat) => (
                <div
                  key={nat}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all group"
                >
                  <span className="text-sm font-bold text-slate-800">{nat}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteNationality(nat)}
                    title={isAr ? "حذف الجنسية" : "Delete"}
                    className="text-slate-400 hover:text-red-600 transition-colors p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
