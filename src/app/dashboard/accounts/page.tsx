"use client";
import { exportAccountsToExcel, printAccountsReport } from "@/lib/exportUtils";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { UserModel, UserRole } from "@/types";
import { arabicMatch } from "@/lib/arabicNormalizer";
import { logAuditEvent } from "@/lib/auditLogger";
import {
  UserCheck, Search, Bell, Check, X, UserPlus, Printer, FileSpreadsheet, Eye, EyeOff,
  ShieldCheck, Store, Users, UserCog, Mail, Phone,
  MapPin, Lock, Building2, Hash, AlertCircle, CheckCircle2, Trash2, AlertTriangle, CreditCard,
} from "lucide-react";

export default function AccountsPage() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";

  const [users, setUsers] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "merchant" | "beneficiary" | "admin" | "volunteer">("all");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("merchant");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState(isAr ? "القاهرة" : "Cairo");
  const [newStoreName, setNewStoreName] = useState("");
  const [newNatId, setNewNatId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Delete State
  const [deletingUser, setDeletingUser] = useState<UserModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const uid = deletingUser.uid;
      const email = deletingUser.email ? deletingUser.email.trim().toLowerCase() : "";
      const cardId = deletingUser.activeCardId;
      const natId = deletingUser.nationalId;

      // 1. Delete user doc by uid
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch (_) {}

      // 1.1 Delete any other user docs matching email
      if (email) {
        try {
          const userQuery = await getDocs(query(collection(db, "users"), where("email", "==", email)));
          for (const d of userQuery.docs) {
            await deleteDoc(d.ref);
          }
        } catch (_) {}
      }

      // 2. Delete all aid cards by cardId, beneficiaryId, or nationalId
      if (cardId) {
        try {
          await deleteDoc(doc(db, "aid_cards", cardId));
        } catch (_) {}
      }
      try {
        const cardQuery1 = await getDocs(query(collection(db, "aid_cards"), where("beneficiaryId", "==", uid)));
        for (const d of cardQuery1.docs) {
          await deleteDoc(d.ref);
        }
      } catch (_) {}
      if (natId) {
        try {
          const cardQuery2 = await getDocs(query(collection(db, "aid_cards"), where("nationalId", "==", natId)));
          for (const d of cardQuery2.docs) {
            await deleteDoc(d.ref);
          }
        } catch (_) {}
      }

      // 3. Delete all redemptions & transactions
      try {
        if (cardId) {
          const redQuery = await getDocs(query(collection(db, "redemptions"), where("cardId", "==", cardId)));
          for (const d of redQuery.docs) {
            await deleteDoc(d.ref);
          }
        }
        const redQueryUid = await getDocs(query(collection(db, "redemptions"), where("beneficiaryId", "==", uid)));
        for (const d of redQueryUid.docs) {
          await deleteDoc(d.ref);
        }
        const redQueryMerch = await getDocs(query(collection(db, "redemptions"), where("merchantId", "==", uid)));
        for (const d of redQueryMerch.docs) {
          await deleteDoc(d.ref);
        }
      } catch (_) {}

      // 4. Delete extra disbursement requests
      try {
        if (cardId) {
          const reqQuery = await getDocs(query(collection(db, "extra_disbursement_requests"), where("cardId", "==", cardId)));
          for (const d of reqQuery.docs) {
            await deleteDoc(d.ref);
          }
        }
        const reqQueryMerch = await getDocs(query(collection(db, "extra_disbursement_requests"), where("merchantId", "==", uid)));
        for (const d of reqQueryMerch.docs) {
          await deleteDoc(d.ref);
        }
      } catch (_) {}

      // 5. Delete budget allocations & payment receipts
      try {
        const allocQuery = await getDocs(query(collection(db, "budget_allocations"), where("merchantId", "==", uid)));
        for (const d of allocQuery.docs) {
          await deleteDoc(d.ref);
        }
        const receiptQuery = await getDocs(query(collection(db, "payment_receipts"), where("merchantId", "==", uid)));
        for (const d of receiptQuery.docs) {
          await deleteDoc(d.ref);
        }
      } catch (_) {}

      // 6. Delete basket distributions
      try {
        if (cardId) {
          const distQuery = await getDocs(query(collection(db, "basket_distributions"), where("cardId", "==", cardId)));
          for (const d of distQuery.docs) {
            await deleteDoc(d.ref);
          }
        }
        const distQueryUid = await getDocs(query(collection(db, "basket_distributions"), where("beneficiaryId", "==", uid)));
        for (const d of distQueryUid.docs) {
          await deleteDoc(d.ref);
        }
      } catch (_) {}

      setDeletingUser(null);
    } catch (e) {
      console.error("Error completely deleting user and related records:", e);
    }
    setIsDeleting(false);
  };

  useEffect(() => {
    setMounted(true);
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserModel[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as UserModel);
      });
      list.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
      setUsers(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const pendingUsers = users.filter((u) => u.isApproved === false);
  const merchantUsers = users.filter((u) => u.role === "merchant");
  const beneficiaryUsers = users.filter((u) => u.role === "beneficiary");

  const handleApprove = async (userId: string) => {
    try {
      const user = users.find((u) => u.uid === userId);
      await updateDoc(doc(db, "users", userId), {
        isApproved: true,
        isActive: true,
      });
      if (user?.activeCardId) {
        try {
          await updateDoc(doc(db, "aid_cards", user.activeCardId), {
            status: "active",
          });
        } catch (_) {}
      }
    } catch (e) {
      console.error("Error approving user:", e);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const user = users.find((u) => u.uid === userId);
      await updateDoc(doc(db, "users", userId), {
        isApproved: false,
        isActive: false,
      });
      if (user?.activeCardId) {
        try {
          await updateDoc(doc(db, "aid_cards", user.activeCardId), {
            status: "frozen",
          });
        } catch (_) {}
      }
    } catch (e) {
      console.error("Error rejecting user:", e);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanPhone = newPhone ? newPhone.trim() : "";
    const cleanNatId = newNatId ? newNatId.trim().toUpperCase() : "";
    const uid = `usr_${Date.now()}`;

    try {
      // 1. Check Phone Uniqueness
      if (cleanPhone) {
        const phoneSnap = await getDocs(query(collection(db, "users"), where("phone", "==", cleanPhone)));
        if (!phoneSnap.empty) {
          setCreateError(isAr ? "رقم الهاتف مسجل بالفعل بحساب آخر" : "Phone number is already registered to another account");
          setCreating(false);
          return;
        }
      }

      // 2. Check National ID Uniqueness for Beneficiaries
      if (newRole === "beneficiary" && cleanNatId) {
        const natSnap = await getDocs(query(collection(db, "users"), where("nationalId", "==", cleanNatId)));
        if (!natSnap.empty) {
          setCreateError(isAr ? "رقم البطاقة القومية أو جواز السفر مسجل بالفعل بحساب آخر" : "National ID / Passport is already registered to another account");
          setCreating(false);
          return;
        }
      }
      const userDoc: any = {
        uid,
        email: cleanEmail,
        password: newPass,
        name: newName,
        phone: newPhone || "0500000000",
        role: newRole,
        city: newCity,
        isApproved: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      if (newRole === "merchant") {
        userDoc.storeName = newStoreName || `${newName} للتموينات`;
        userDoc.commercialReg = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
        userDoc.totalDisbursed = 0;
        userDoc.totalTransactions = 0;
      } else if (newRole === "beneficiary") {
        const cardId = `FAJR-CARD-${Date.now().toString().slice(-6)}`;
        userDoc.activeCardId = cardId;
        userDoc.nationalId = newNatId || `N${Date.now().toString().slice(-8)}`;
        userDoc.nationality = "مصرية";

        try {
          await setDoc(doc(db, "aid_cards", cardId), {
            cardId,
            beneficiaryId: uid,
            beneficiaryName: newName,
            nationalId: userDoc.nationalId,
            familyCount: 4,
            residence: newCity,
            balance: 30,
            totalBalance: 30,
            foodBasketsQuota: 2,
            status: "active",
            nationality: "مصرية",
            securityHash: Date.now().toString().slice(-6),
            activatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            fieldResearchStatus: "معتمد من الإدارة",
          });
        } catch (_) {}
        userDoc.nationalId = newNatId || `N${Date.now().toString().slice(-8)}`;
        userDoc.nationality = "سورية";
      }

      await setDoc(doc(db, "users", uid), userDoc);
      setCreateSuccess(true);
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateSuccess(false);
        setNewName("");
        setNewEmail("");
        setNewPass("");
        setNewStoreName("");
        setNewNatId("");
        setNewPhone("");
      }, 1000);
    } catch (err: any) {
      setCreateError(err.message || (isAr ? "فشل في إنشاء الحساب" : "Failed to create account"));
    }
    setCreating(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      arabicMatch(u.name, search) ||
      arabicMatch(u.email, search) ||
      arabicMatch(u.storeName, search) ||
      arabicMatch(u.phone, search) ||
      arabicMatch(u.nationalId, search) ||
      arabicMatch(u.activeCardId, search) ||
      arabicMatch(u.nationality, search) ||
      arabicMatch(u.city, search);

    if (activeTab === "pending") return matchesSearch && u.isApproved === false;
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && u.role === activeTab;
  });

  return (
    <div className="space-y-6 page-enter">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A734D, #063A28)" }}
          >
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900">
              {isAr ? "إدارة الحسابات والاعتمادات" : "Accounts & Approvals"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {isAr
                ? "إنشاء حسابات الصرافين والمشرفين واعتماد التسجيلات المعلقة بالمنظومة"
                : "Create merchant & admin accounts, manage pending registrations"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Print Filtered Accounts Statement */}
          <button
            onClick={() => {
              const tabTitle =
                activeTab === "all"
                  ? "كافة الحسابات والاعتمادات"
                  : activeTab === "beneficiary"
                  ? "كشف حسابات المستفيدين"
                  : activeTab === "merchant"
                  ? "كشف الصرافين والمنافذ المعتمدة"
                  : activeTab === "admin"
                  ? "كشف الإدارة والمشرفين"
                  : "كشف الحسابات المعلقة بانتظار الاعتماد";
              printAccountsReport(filteredUsers, `${tabTitle} ${search ? `(بحث: ${search})` : ""}`);
            }}
            className="btn btn-sm bg-gradient-to-r from-[#0A734D] to-[#064e3b] hover:from-[#085a3c] hover:to-[#043327] text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950/15 border border-emerald-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title={isAr ? "طباعة كشف الحسابات المعروضة بناءً على الفلتر الحالي" : "Print Accounts Statement"}
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "طباعة الكشف الرسمي" : "Print Statement"}</span>
          </button>

          {/* Export Filtered Accounts Excel */}
          <button
            onClick={() => {
              const tabTitle =
                activeTab === "all"
                  ? "جميع_الحسابات"
                  : activeTab === "beneficiary"
                  ? "المستفيدين"
                  : activeTab === "merchant"
                  ? "الصرافين"
                  : activeTab === "admin"
                  ? "الإدارة"
                  : "المعلقة";
              exportAccountsToExcel(filteredUsers, tabTitle);
            }}
            className="btn btn-sm bg-emerald-50 hover:bg-emerald-100 text-[#0A734D] border border-emerald-300 font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title={isAr ? "تصدير كشف الحسابات المفلترة إلى ملف إكسيل" : "Export Excel"}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0A734D]" />
            <span>{isAr ? "تصدير إكسيل" : "Export Excel"}</span>
          </button>

          {/* Create Account Modal Trigger */}
          <button
            onClick={() => {
              setCreateError(null);
              setCreateSuccess(false);
              setCreateModalOpen(true);
            }}
            className="btn btn-primary px-4 py-2.5 shadow-md flex items-center gap-2 cursor-pointer font-black text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAr ? "إنشاء حساب جديد" : "Create Account"}</span>
          </button>
        </div>
      </div>

      {/* ── Pending Alert Banner ── */}
      {pendingUsers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-between shadow-xs animate-slide-up">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                {isAr
                  ? `يوجد ${pendingUsers.length} حسابات بانتظار المراجعة والاعتماد`
                  : `${pendingUsers.length} accounts awaiting admin approval`}
              </h4>
              <p className="text-xs text-amber-800 font-semibold mt-0.5">
                {isAr
                  ? "سجل هؤلاء المستخدمين عبر المنظومة وينتظرون تفعيل الحساب للبدء."
                  : "These users registered via the portal and require approval to operate."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("pending")}
            className="btn btn-sm btn-amber font-black shadow-xs flex-shrink-0"
          >
            {isAr ? "عرض المعلقين فوراً" : "View Pending"}
          </button>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-slide-up">
        <div className="qout-card p-4 bg-white border-r-4 border-r-emerald-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "إجمالي الحسابات" : "Total Accounts"}
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{users.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="qout-card p-4 bg-white border-r-4 border-r-amber-500 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "بانتظار الاعتماد" : "Pending Approval"}
            </p>
            <p className="text-2xl font-black text-amber-700 font-mono mt-0.5">{pendingUsers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="qout-card p-4 bg-white border-r-4 border-r-blue-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "منافذ الصرافين" : "Merchants"}
            </p>
            <p className="text-2xl font-black text-blue-800 font-mono mt-0.5">{merchantUsers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="qout-card p-4 bg-white border-r-4 border-r-purple-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "المستفيدون المسجلون" : "Beneficiaries"}
            </p>
            <p className="text-2xl font-black text-purple-800 font-mono mt-0.5">{beneficiaryUsers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Tabs ── */}
      <div className="qout-card p-4 bg-white shadow-xs space-y-3 animate-slide-up">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث بالاسم، البريد، اسم المتجر، أو رقم الهاتف..." : "Search name, email, store, phone..."}
              className="qout-input qout-input-with-icon"
              style={{ paddingInlineStart: 44 }}
            />
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "all", labelAr: "الكل", labelEn: "All" },
                { id: "pending", labelAr: `معلق (${pendingUsers.length})`, labelEn: `Pending (${pendingUsers.length})` },
                { id: "merchant", labelAr: "صرافين", labelEn: "Merchants" },
                { id: "beneficiary", labelAr: "مستفيدين", labelEn: "Beneficiaries" },
                { id: "admin", labelAr: "إدارة", labelEn: "Admins" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Accounts Table (Zero Ellipsis, Full Details) ── */}
      <div className="qout-card bg-white overflow-hidden shadow-xs animate-slide-up">
        <div className="overflow-x-auto">
          <table className="qout-table w-full">
            <thead>
              <tr>
                <th className="text-start">{isAr ? "المستخدم" : "User"}</th>
                <th className="text-start">{isAr ? "البريد الإلكتروني" : "Email"}</th>
                <th className="text-start">{isAr ? "نوع الحساب" : "Role"}</th>
                <th className="text-start">{isAr ? "المدينة" : "City"}</th>
                <th className="text-start">{isAr ? "حالة الحساب" : "Status"}</th>
                <th className="text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {isAr ? "جاري تحميل الحسابات..." : "Loading accounts..."}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">
                    {isAr ? "لا توجد حسابات مطابقة للبحث" : "No matching accounts found"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="font-black text-slate-900">
                      <div>{u.name}</div>
                      {u.storeName && (
                        <div className="text-xs text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>{u.storeName}</span>
                        </div>
                      )}
                    </td>
                    <td className="font-mono font-bold text-slate-700 text-xs" dir="ltr" style={{ textAlign: "right" }}>
                      {u.email}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : u.role === "merchant"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : u.role === "volunteer"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {u.role === "merchant"
                          ? (isAr ? "صراف معتمد" : "Merchant")
                          : u.role === "admin"
                          ? (isAr ? "مشرف إداري" : "Admin")
                          : u.role === "volunteer"
                          ? (isAr ? "متطوع ميداني" : "Volunteer")
                          : (isAr ? "مستفيد" : "Beneficiary")}
                      </span>
                    </td>
                    <td className="font-bold text-slate-700 text-xs">
                      {u.city || (isAr ? "القاهرة" : "Cairo")}
                    </td>
                    <td>
                      {u.isApproved === false ? (
                        <span className="badge badge-pending">
                          {isAr ? "معلق بانتظار الاعتماد" : "Pending Approval"}
                        </span>
                      ) : u.isActive ? (
                        <span className="badge badge-active">
                          {isAr ? "مفعل ونشط" : "Active"}
                        </span>
                      ) : (
                        <span className="badge badge-suspended">
                          {isAr ? "معطل" : "Suspended"}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {u.isApproved === false ? (
                          <>
                            <button
                              onClick={() => handleApprove(u.uid)}
                              className="btn btn-xs btn-primary font-black"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isAr ? "اعتماد وتفعيل" : "Approve"}</span>
                            </button>
                            <button
                              onClick={() => handleReject(u.uid)}
                              className="btn btn-xs btn-danger font-black"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{isAr ? "رفض" : "Reject"}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={async () => {
                              await updateDoc(doc(db, "users", u.uid), {
                                isActive: !u.isActive,
                              });
                            }}
                            className={`btn btn-xs font-black ${
                              u.isActive ? "btn-danger" : "btn-primary"
                            }`}
                          >
                            {u.isActive ? (isAr ? "تعطيل" : "Suspend") : (isAr ? "تفعيل" : "Activate")}
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingUser(u)}
                          title={isAr ? "حذف الحساب نهائياً من قاعدة البيانات" : "Delete Account"}
                          className="btn btn-xs bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-all p-1.5 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Premium Delete Confirmation Modal ── */}
      {mounted && deletingUser && createPortal(
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !isDeleting && setDeletingUser(null)}
        >
          <div
            className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl border border-slate-100 relative animate-scale-in text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Warning Glow & Icon */}
            <div className="relative mb-5 flex justify-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center relative border border-red-100 shadow-sm">
                <Trash2 className="w-8 h-8 stroke-[2.2]" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              {isAr ? "تأكيد حذف الحساب" : "Confirm Deletion"}
            </h3>

            {/* Target Account Info Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4 text-center">
              <p className="font-bold text-slate-900 text-base">{deletingUser.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">{deletingUser.email}</p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {isAr 
                    ? "سيتم حذف بيانات الحساب والبطاقة نهائياً" 
                    : "Account & aid card will be permanently erased"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {isAr
                ? "هذا الإجراء نهائي ولا يمكن التراجع عنه. لن يتمكن المستخدم من تسجيل الدخول مجدداً."
                : "This action is permanent and cannot be undone. The user will lose all access."}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isAr ? "إلغاء التراجع" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>{isAr ? "جاري الحذف..." : "Deleting..."}</span>
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{isAr ? "حذف نهائي" : "Delete Account"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Create Account Modal (Rendered directly via createPortal at z-[100]) ── */}
      {mounted && createModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 relative animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 left-5 btn btn-icon bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0A734D, #063A28)" }}
              >
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isAr ? "إنشاء حساب جديد بالمنظومة" : "Create New Account"}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {isAr ? "إضافة مستخدم أو صراف جديد إلى قاعدة بيانات مؤسسة الفجر الخيرية" : "Add new user, merchant, or admin to Al-Fajr platform"}
                </p>
              </div>
            </div>

            {/* Success Alert */}
            {createSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{isAr ? "تم إنشاء وتفعيل الحساب بنجاح!" : "Account created & activated successfully!"}</span>
              </div>
            )}

            {/* Error Alert */}
            {createError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-black flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs font-bold">
              {/* Account Role Selector */}
              <div>
                <label className="block text-slate-700 mb-1 font-black">
                  {isAr ? "نوع الحساب (الدور)" : "Account Role"}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="qout-input font-bold"
                >
                  <option value="merchant">{isAr ? "صراف / منفذ معتمد (Merchant)" : "Merchant / Store"}</option>
                  <option value="admin">{isAr ? "مشرف إداري (Admin)" : "Administrator"}</option>
                  <option value="volunteer">{isAr ? "متطوع وباحث ميداني (Volunteer)" : "Volunteer"}</option>
                  <option value="beneficiary">{isAr ? "مستفيد إغاثي (Beneficiary)" : "Beneficiary"}</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-slate-700 mb-1 font-black">
                  {isAr ? "الاسم الكامل / اسم المسؤول" : "Full Name / Manager"}
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={isAr ? "مثال: أحمد عبد الله الراجحي" : "e.g. Ahmed Abdullah"}
                  className="qout-input"
                />
              </div>

              {/* Conditional: Store Name for Merchant */}
              {newRole === "merchant" && (
                <div>
                  <label className="block text-slate-700 mb-1 font-black">
                    {isAr ? "اسم المتجر / السوبرماركت المعتمد" : "Store / Market Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder={isAr ? "مثال: أسواق النور للمواد الغذائية" : "e.g. Al-Noor Supermarket"}
                    className="qout-input"
                  />
                </div>
              )}

              {/* Conditional: National ID for Beneficiary */}
              {newRole === "beneficiary" && (
                <div>
                  <label className="block text-slate-700 mb-1 font-black">
                    {isAr ? "رقم الجواز / الرقم القومي" : "Passport / National ID"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newNatId}
                    onChange={(e) => setNewNatId(e.target.value)}
                    placeholder="مثال: N01928472"
                    className="qout-input font-mono"
                  />
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-black">
                    {isAr ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@qout.org"
                    className="qout-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-black">
                    {isAr ? "رقم الهاتف" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0501234567"
                    className="qout-input font-mono"
                  />
                </div>
              </div>

              {/* City & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-black">
                    {isAr ? "المدينة" : "City"}
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder={isAr ? "القاهرة" : "Cairo"}
                    className="qout-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-black">
                    {isAr ? "كلمة المرور" : "Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      dir="ltr"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="••••••••"
                      className="qout-input font-mono pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2 top-2 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer z-10"
                      aria-label={showNewPass ? "Hide password" : "Show password"}
                      title={showNewPass ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : (isAr ? "إظهار كلمة المرور" : "Show password")}
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn btn-secondary font-black"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary font-black shadow-md"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{isAr ? "إنشاء وتفعيل الحساب" : "Create & Activate"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
