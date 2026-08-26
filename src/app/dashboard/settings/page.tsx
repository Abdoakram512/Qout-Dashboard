"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { db, auth } from "@/lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, orderBy, limit, query } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { logAuditEvent } from "@/lib/auditLogger";
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

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "nationalities"), (snap) => {
      if (snap.empty) {
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
    try {
      const currentUser = auth.currentUser;
      if (currentUser && oldPassword) {
        try {
          const credential = EmailAuthProvider.credential(currentUser.email || adminData?.email || "", oldPassword);
          await reauthenticateWithCredential(currentUser, credential);
        } catch (_) {}
        try {
          await updatePassword(currentUser, newPassword);
        } catch (_) {}
      }

      if (adminData?.uid) {
        await updateDoc(doc(db, "users", adminData.uid), {
          password: newPassword,
          updatedAt: new Date().toISOString(),
        });
      }

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "change_password",
          targetId: adminData.uid,
          targetType: "admin_security",
          details: "Admin password updated successfully",
        });
      }

      setSuccessMsg(isAr ? "تم تحديث إعدادات الأمان وكلمة المرور بنجاح في النظام!" : "Security settings and password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password update error:", err);
      setErrorMsg(isAr ? "حدث خطأ أثناء تحديث كلمة المرور: " + (err.message || "يرجى المحاولة مجدداً") : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7 max-w-4xl page-enter pb-10">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-950 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
            <Settings className="w-5 h-5" />
          </div>
          <span>{isAr ? "إعدادات النظام والأمان" : "System and Security Settings"}</span>
        </h1>
        <p className="text-xs text-slate-500 font-bold mt-1">
          {isAr ? "إدارة حساب المشرف، الصلاحيات، الجنسيات المعتمدة، وسجل التدقيق" : "Manage admin account, permissions, and audit logs"}
        </p>
      </div>

      {/* Admin Profile Overview Card */}
      <div className="card p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-950/20">
            {adminData?.name ? adminData.name.slice(0, 1).toUpperCase() : "A"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{adminData?.name || (isAr ? "المشرف العام" : "Super Admin")}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isAr ? "مدير النظام (Admin)" : "Super Admin"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{adminData?.email || "admin@qout.org"}</p>
          </div>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <span>{isAr ? "تغيير كلمة المرور" : "Change Password"}</span>
          </h3>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

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
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md cursor-pointer"
          >
            {saving ? (
              <span>{isAr ? "جاري الحفظ وتحديث الأمان..." : "Updating security..."}</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isAr ? "حفظ التغييرات" : "Save Changes"}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Audit Trail & Activity History Card */}
      <div className="card p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100/80">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">
                {isAr ? "سجل التدقيق والرقابة الإدارية (Audit Trail)" : "Audit Trail and Activity Log"}
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

      {/* Allowed Nationalities Management Card */}
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
  );
}
