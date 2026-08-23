"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  setDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import { logAuditEvent } from "@/lib/auditLogger";
import { UserModel, BudgetAllocation, PaymentReceipt } from "@/types";
import {
  Store, Upload, Trash2, Eye, Loader2, ImageIcon, Search, CheckCircle2, XCircle, Building2,
  MapPin, Mail, Hash, TrendingUp, CreditCard, ShieldCheck,
  PlusCircle, Send, FileText, AlertTriangle, ArrowUpRight,
  Coins, X, DollarSign, Wallet, Check, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

export default function MerchantsPage() {
  const { t, locale } = useI18n();
  const { adminData } = useAuth();
  const isAr = locale === "ar";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [merchants, setMerchants] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "low_liquidity">("all");

  // Allocation Modal State
  const [allocatingMerchant, setAllocatingMerchant] = useState<UserModel | null>(null);
  const [allocAmount, setAllocAmount] = useState<number>(10000);
  const [allocType, setAllocType] = useState<"initial" | "recharge" | "adjustment">("recharge");
  const [allocNotes, setAllocNotes] = useState("");
  const [allocating, setAllocating] = useState(false);

  // Send Receipt Modal State
  const [receiptMerchant, setReceiptMerchant] = useState<UserModel | null>(null);
  const [receiptAmount, setReceiptAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<"instapay" | "vodafone_cash" | "bank_transfer" | "cash">("instapay");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [senderAccount, setSenderAccount] = useState("حساب مؤسسة الفجر - إنستا باي");
  const [receiverAccount, setReceiverAccount] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "merchant"));
    const unsub = onSnapshot(q, (snap) => {
      const list: UserModel[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...d.data() } as UserModel));
      list.sort((a, b) => (b.totalDisbursed ?? 0) - (a.totalDisbursed ?? 0));
      setMerchants(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggle = async (m: UserModel) => {
    setUpdatingId(m.uid);
    try {
      await updateDoc(doc(db, "users", m.uid), {
        isActive: !m.isActive,
        isApproved: !m.isActive,
      });
      showToast(m.isActive ? "تم تعطيل حساب الصراف" : "تم تفعيل حساب الصراف بنجاح");
    } catch (e) {
      console.error(e);
    }
    setUpdatingId(null);
  };

  // Submit Budget Allocation
  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(allocAmount);
    if (!allocatingMerchant || isNaN(numAmount) || numAmount <= 0) {
      alert(isAr ? "يرجى إدخال مبلغ مالي صحيح أكبر من صفر" : "Please enter a valid amount greater than zero");
      return;
    }
    setAllocating(true);

    try {
      const allocId = `ALLOC-${Date.now().toString().slice(-6)}`;
      const allocRef = doc(db, "budget_allocations", allocId);
      const merchantId = allocatingMerchant.uid || (allocatingMerchant as any).id;

      const allocationData: any = {
        id: allocId,
        allocationId: allocId,
        merchantId: merchantId,
        merchantName: allocatingMerchant.name || "صراف",
        merchantStoreName: allocatingMerchant.storeName || allocatingMerchant.name || "منفذ الفجر",
        amount: numAmount,
        type: allocType,
        allocatedBy: {
          adminId: adminData?.uid || "admin",
          adminName: adminData?.name || "مشرف مؤسسة الفجر",
        },
        notes: allocNotes.trim() || "",
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(allocRef, allocationData);

      // Increment allocatedBudget on merchant doc with merge
      await setDoc(
        doc(db, "users", merchantId),
        {
          allocatedBudget: increment(numAmount),
          lastAllocationDate: serverTimestamp(),
        },
        { merge: true }
      );

      // Audit Log
      await logAuditEvent({
        action: "MERCHANT_BUDGET_ALLOCATION",
        adminName: adminData?.name || "مشرف النظام",
        details: `تخصيص وتغذية ميزانية بمبلغ ${numAmount.toLocaleString()} ج.م لمنفذ ${allocatingMerchant.storeName || allocatingMerchant.name}`,
        targetId: merchantId,
      });

      showToast(`تم تخصيص ميزانية بقيمة ${numAmount.toLocaleString()} ج.م لمنفذ ${allocatingMerchant.storeName || allocatingMerchant.name} بنجاح ✅`);
      setAllocatingMerchant(null);
      setAllocNotes("");
    } catch (err: any) {
      console.error("Allocation error:", err);
      alert((isAr ? "حدث خطأ أثناء حفظ التخصيص: " : "Error saving allocation: ") + (err?.message || ""));
    }
    setAllocating(false);
  };

  // Handle Receipt Image File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(isAr ? "حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت" : "Image size too large (max 5MB)");
      return;
    }

    setUploadingImg(true);
    try {
      const storageRef = ref(storage, `receipts/${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setReceiptImageUrl(downloadUrl);
    } catch (storageErr) {
      console.warn("Storage upload fallback to base64:", storageErr);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReceiptImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImg(false);
    }
  };

  // Submit Payment Receipt
  const handleSendPaymentReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptMerchant || receiptAmount <= 0) return;
    setSendingReceipt(true);

    try {
      const receiptId = `REC-${Date.now().toString().slice(-6)}`;
      const receiptRef = doc(db, "payment_receipts", receiptId);

      const receiptData: any = {
        id: receiptId,
        receiptId: receiptId,
        merchantId: receiptMerchant.uid || (receiptMerchant as any).id,
        merchantName: receiptMerchant.name || "صراف",
        merchantStoreName: receiptMerchant.storeName || receiptMerchant.name || "منفذ الفجر",
        amount: Number(receiptAmount),
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber.trim() || `REF-${Date.now().toString().slice(-4)}`,
        senderAccountOrPhone: senderAccount.trim() || "",
        receiverAccountOrPhone: receiverAccount.trim() || receiptMerchant.instapayAddress || receiptMerchant.vodafoneCashNumber || "",
        receiptImageUrl: receiptImageUrl.trim() || "",
        status: "sent",
        sentBy: {
          adminId: adminData?.uid || "admin",
          adminName: adminData?.name || "مشرف مؤسسة الفجر",
        },
        notes: receiptNotes.trim() || "",
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(receiptRef, receiptData);

      showToast(`تم إرسال وصل الدفع بقيمة ${receiptAmount.toLocaleString()} ج.م بنجاح إلى منفذ ${receiptMerchant.storeName || receiptMerchant.name} 📤`);
      setReceiptMerchant(null);
      setReferenceNumber("");
      setReceiptImageUrl("");
      setReceiptNotes("");
    } catch (err) {
      console.error("Receipt error:", err);
      alert("حدث خطأ أثناء إرسال الوصل");
    }
    setSendingReceipt(false);
  };

  // Helper for budget stats of a merchant
  const getMerchantBudgetStats = (m: UserModel) => {
    const allocated = m.allocatedBudget || 0;
    const disbursed = m.totalDisbursed || 0;
    const remaining = Math.max(0, allocated - disbursed);
    const spentPercentage = allocated > 0 ? Math.min(100, Math.round((disbursed / allocated) * 100)) : 0;
    const remainingPercentage = allocated > 0 ? Math.max(0, 100 - spentPercentage) : 0;
    const isLowLiquidity = allocated > 0 && remainingPercentage <= 15;

    return {
      allocated,
      disbursed,
      remaining,
      spentPercentage,
      remainingPercentage,
      isLowLiquidity,
    };
  };

  const filtered = merchants.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.storeName?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q);

    const bStats = getMerchantBudgetStats(m);

    let matchFilter = true;
    if (filter === "active") matchFilter = m.isActive;
    else if (filter === "suspended") matchFilter = !m.isActive;
    else if (filter === "low_liquidity") matchFilter = bStats.isLowLiquidity;

    return matchSearch && matchFilter;
  });

  const activeCount = merchants.filter((m) => m.isActive).length;
  const suspendedCount = merchants.filter((m) => !m.isActive).length;
  const totalAllocatedSum = merchants.reduce((a, m) => a + (m.allocatedBudget || 0), 0);
  const totalDisbursedSum = merchants.reduce((a, m) => a + (m.totalDisbursed || 0), 0);
  const totalRemainingSum = Math.max(0, totalAllocatedSum - totalDisbursedSum);
  const lowLiquidityCount = merchants.filter((m) => getMerchantBudgetStats(m).isLowLiquidity).length;
  const topMerchantId = filtered[0]?.uid;

  return (
    <div className="space-y-6 page-enter">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[120] px-4 py-3 rounded-2xl bg-[#0A734D] text-white font-black text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A734D, #063A28)" }}
          >
            <Store className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900">
              {isAr ? "المنافذ والصرافون والميزانيات المركزية" : "Merchants, Stores & Liquidity"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {isAr
                ? "مؤسسة الفجر الخيرية | تخصيص ميزانيات العهد، إرسال إيصالات إنستا باي وفودافون كاش، وتتبع المصروف والمتبقي"
                : "Al-Fajr Foundation | Manage store allocations, send payment receipts, and track remaining liquidity"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {/* Total Allocated Budgets */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-emerald-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "إجمالي الميزانيات المخصصة" : "Total Allocated Budget"}
            </p>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-0.5">
              {totalAllocatedSum.toLocaleString()} <span className="text-xs text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
            </p>
            <span className="text-[10px] text-slate-400 font-semibold">{activeCount} منافذ نشطة</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Disbursed */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-blue-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "إجمالي المصروف للمستفيدين" : "Total Disbursed"}
            </p>
            <p className="text-2xl font-black text-blue-900 font-mono mt-0.5">
              {totalDisbursedSum.toLocaleString()} <span className="text-xs text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold">
              {totalAllocatedSum > 0 ? `${Math.round((totalDisbursedSum / totalAllocatedSum) * 100)}% من الميزانية` : "—"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Remaining Liquidity */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-amber-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "السيولة المتبقية بعهد الصرافين" : "Remaining Liquidity"}
            </p>
            <p className="text-2xl font-black text-amber-700 font-mono mt-0.5">
              {totalRemainingSum.toLocaleString()} <span className="text-xs text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
            </p>
            <span className="text-[10px] text-amber-700 font-bold">جاهز للصرف فوراً</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Low Liquidity Alerts */}
        <div className="qout-card p-4 bg-white border-r-4 border-r-red-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "إنذارات السيولة المنخفضة" : "Low Liquidity Stores"}
            </p>
            <p className="text-2xl font-black text-red-600 font-mono mt-0.5">{lowLiquidityCount}</p>
            <span className="text-[10px] text-red-600 font-bold">{lowLiquidityCount > 0 ? (isAr ? "يتطلب إرسال دفعات" : "Needs recharge") : (isAr ? "السيولة مستقرة ✅" : "Optimal")}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث باسم المتجر، المدينة، المسؤول، أو السجل التجاري..." : "Search store name, city, owner, CR..."}
            className="qout-input ps-10"
          />
          <Search className="w-4 h-4 absolute start-3.5 top-3 text-slate-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { id: "all", labelAr: "الكل", labelEn: "All" },
              { id: "active", labelAr: "نشط", labelEn: "Active" },
              { id: "low_liquidity", labelAr: "⚠️ سيولة منخفضة (<15%)", labelEn: "⚠️ Low Liquidity" },
              { id: "suspended", labelAr: "موقوف", labelEn: "Suspended" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-sm ${filter === f.id ? "btn-primary" : "btn-secondary"}`}
            >
              {isAr ? f.labelAr : f.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Merchant Cards Grid ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="qout-card py-16 text-center bg-white">
          <Store className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">
            {isAr ? "لا توجد منافذ صرف مطابقة للبحث" : "No matching merchants found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const isTop = m.uid === topMerchantId && m.isActive;
            const bStats = getMerchantBudgetStats(m);

            return (
              <div
                key={m.uid}
                className={`qout-card p-5 bg-white flex flex-col justify-between transition-all relative ${
                  bStats.isLowLiquidity ? "border-2 border-red-400 bg-red-50/10 shadow-md" : ""
                } ${isTop && !bStats.isLowLiquidity ? "border-emerald-500 shadow-md" : ""} ${
                  !m.isActive ? "border-red-200 bg-red-50/20" : ""
                }`}
                style={{
                  borderRightWidth: isTop ? 4 : undefined,
                  borderRightColor: isTop ? "#0A734D" : undefined,
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {bStats.isLowLiquidity ? (
                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 flex items-center gap-1 border border-red-300 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        {isAr ? "⚠️ سيولة حرجة (أقل من 15%)" : "Low Liquidity Alert"}
                      </span>
                    ) : isTop ? (
                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        {isAr ? "المنفذ الأكثر نشاطاً" : "Top Performer"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">منفذ معتمد</span>
                    )}

                    <span className={`badge flex-shrink-0 ${m.isActive ? "badge-active" : "badge-suspended"}`}>
                      {m.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "موقوف" : "Suspended")}
                    </span>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          m.isActive ? "bg-emerald-50 text-[#0A734D] border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/merchants/${m.uid}`}
                          className="font-black text-base text-slate-900 leading-snug hover:text-[#0A734D] transition-colors flex items-center gap-1"
                        >
                          <span>{m.storeName || m.name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">{m.name} • {m.city || (isAr ? "الرياض" : "Riyadh")}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Liquidity & Budget Progress Bar (CORE FEATURE) ── */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-600 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-[#0A734D]" />
                        <span>{isAr ? "الميزانية المخصصة:" : "Allocated Budget:"}</span>
                      </span>
                      <span className="font-black text-slate-900 font-mono">
                        {bStats.allocated.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500">{isAr ? "المصروف للمستفيدين:" : "Disbursed:"}</span>
                      <span className="font-black text-blue-800 font-mono">
                        {bStats.disbursed.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
                      <span className="font-black text-slate-700">{isAr ? "الرصيد المتبقي بالعهدة:" : "Remaining Liquidity:"}</span>
                      <span className={`font-black font-mono text-sm ${bStats.isLowLiquidity ? "text-red-600" : "text-emerald-800"}`}>
                        {bStats.remaining.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all ${
                            bStats.isLowLiquidity ? "bg-red-500" : "bg-emerald-600"
                          }`}
                          style={{ width: `${bStats.spentPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold font-mono">
                        <span>تم صرف: {bStats.spentPercentage}%</span>
                        <span>المتبقي: {bStats.remainingPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4 text-center font-bold">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">{isAr ? "عمليات الصرف" : "Txns"}</span>
                      <span className="text-slate-900 font-mono font-black">{m.totalTransactions || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">{isAr ? "السجل التجاري" : "CR"}</span>
                      <span className="text-slate-800 font-mono font-bold">{m.commercialReg || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Allocate Budget Button */}
                    <button
                      onClick={() => {
                        setAllocatingMerchant(m);
                        setAllocAmount(10000);
                        setAllocType("recharge");
                      }}
                      className="btn btn-sm bg-emerald-50 hover:bg-emerald-100 text-[#0A734D] border border-emerald-200 font-black flex items-center justify-center gap-1.5 py-2"
                      title={isAr ? "تخصيص وتغذية ميزانية" : "Allocate Budget"}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isAr ? "تخصيص رصيد" : "Allocate"}</span>
                    </button>

                    {/* Send Payment Receipt Button */}
                    <button
                      onClick={() => {
                        setReceiptMerchant(m);
                        setReceiptAmount(5000);
                        setReferenceNumber(`INSTA-${Date.now().toString().slice(-6)}`);
                        setReceiverAccount(m.instapayAddress || m.vodafoneCashNumber || "");
                      }}
                      className="btn btn-sm bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-black flex items-center justify-center gap-1.5 py-2"
                      title={isAr ? "إرسال وصل دفع إنستا باي / فودافون كاش" : "Send Receipt"}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAr ? "إرسال وصل" : "Send Receipt"}</span>
                    </button>
                  </div>

                  {/* Profile Link and Toggle */}
                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      href={`/dashboard/merchants/${m.uid}`}
                      className="btn btn-sm btn-secondary col-span-2 justify-center font-black text-xs py-2 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isAr ? "بروفايل ومحفظة الصراف" : "View Ledger"}</span>
                    </Link>

                    <button
                      disabled={updatingId === m.uid}
                      onClick={() => handleToggle(m)}
                      className={`btn btn-sm font-black text-xs justify-center ${m.isActive ? "btn-danger" : "btn-primary"}`}
                      title={m.isActive ? "تعطيل الصراف" : "تفعيل الصراف"}
                    >
                      {updatingId === m.uid ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : m.isActive ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: Allocate Budget Modal ────────────────────────────── */}
      {allocatingMerchant && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setAllocatingMerchant(null)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center shadow-lg shadow-emerald-900/20 flex-shrink-0">
                <Wallet className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {isAr ? "تخصيص وتغذية ميزانية الصراف" : "Allocate Merchant Budget"}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  منفذ: {allocatingMerchant.storeName || allocatingMerchant.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "المبلغ المالي المراد إضافته للميزانية (ج.م):" : "Allocation Amount (EGP):"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    step="any"
                    required
                    placeholder="أدخل أي قيمة مطلوبة..."
                    value={allocAmount || ""}
                    onChange={(e) => setAllocAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-200 text-lg font-black font-mono text-[#0A734D] focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">ج.م</span>
                </div>
                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1000, 5000, 10000, 25000, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAllocAmount(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        allocAmount === preset
                          ? "bg-[#0A734D] text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      +{preset.toLocaleString()} ج.م
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "نوع الحركة:" : "Allocation Type:"}
                </label>
                <select
                  value={allocType}
                  onChange={(e) => setAllocType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="recharge">تغذية دورية منتظمة (Recharge)</option>
                  <option value="initial">ميزانية ابتدائية تأسيسية (Initial)</option>
                  <option value="adjustment">تسوية مالية إدارية (Adjustment)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "ملاحظات وتوثيق الحركة:" : "Notes:"}
                </label>
                <textarea
                  rows={2}
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  placeholder={isAr ? "اكتب أي تفاصيل أو سبب الإيداع (اختياري)..." : "Optional notes..."}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-semibold">
                💡 سيتم زيادة ميزانية الصراف فورياً بمبلغ <b>{allocAmount.toLocaleString()} ج.م</b> لتصبح الميزانية الكلية: <b>{((allocatingMerchant.allocatedBudget || 0) + Number(allocAmount)).toLocaleString()} ج.م</b>.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={allocating || allocAmount <= 0}
                  className="btn bg-[#0A734D] hover:bg-[#085E3E] text-white flex-1 justify-center font-black py-3 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {allocating ? "جاري الحفظ والاعتماد..." : isAr ? "اعتماد وتغذية الميزانية الآن" : "Confirm Allocation"}
                </button>
                <button
                  type="button"
                  onClick={() => setAllocatingMerchant(null)}
                  className="btn btn-secondary py-3 px-5 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: Send Payment Receipt Modal ───────────────────────── */}
      {receiptMerchant && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setReceiptMerchant(null)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {isAr ? "إرسال وصل دفع وتحويل للصراف" : "Send Payment Receipt"}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  منفذ: {receiptMerchant.storeName || receiptMerchant.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendPaymentReceipt} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "طريقة التحويل / الدفع:" : "Payment Method:"}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  {[
                    { id: "instapay", label: "⚡ إنستا باي (InstaPay)" },
                    { id: "vodafone_cash", label: "📱 فودافون كاش" },
                    { id: "bank_transfer", label: "🏛️ تحويل بنكي" },
                    { id: "cash", label: "💵 نقدي باليد" },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === pm.id
                          ? "bg-amber-50 border-amber-400 text-amber-950 font-black shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "قيمة الحوالة / الدفعة (ج.م):" : "Amount (EGP):"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    step={100}
                    required
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base font-black font-mono text-amber-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "الرقم المرجعي للحوالة (Transaction Ref):" : "Reference Number:"}
                </label>
                <input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="مثال: 94820194829"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Receiver Account / Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رقم محفظة أو حساب الصراف المستلم:" : "Receiver Account / Wallet:"}
                </label>
                <input
                  type="text"
                  value={receiverAccount}
                  onChange={(e) => setReceiverAccount(e.target.value)}
                  placeholder="مثال: 01012345678 أو username@instapay"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Receipt Image Upload & Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isAr ? "صورة إيصال التحويل / الوصل (اختياري):" : "Receipt Image (Optional):"}
                  </label>
                  {receiptImageUrl && (
                    <button
                      type="button"
                      onClick={() => setReceiptImageUrl("")}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? "حذف الصورة" : "Remove"}</span>
                    </button>
                  )}
                </div>

                {receiptImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-amber-50/50 p-2.5 flex items-center gap-3">
                    <img
                      src={receiptImageUrl}
                      alt="Receipt preview"
                      className="w-14 h-14 object-cover rounded-xl border border-amber-200 shadow-xs flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {isAr ? "تم اختيار وصورة الإيصال جاهزة ✅" : "Receipt image ready"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        {receiptImageUrl.startsWith("data:") ? (isAr ? "صورة مرفوعة من الجهاز" : "Local upload") : receiptImageUrl}
                      </p>
                    </div>
                    <a
                      href={receiptImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer flex-shrink-0"
                      title={isAr ? "معاينة بالحجم الكامل" : "View full size"}
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="relative">
                    <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-amber-50/40 transition-all cursor-pointer text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={uploadingImg}
                        className="hidden"
                      />
                      {uploadingImg ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 py-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{isAr ? "جاري معالجة ورفع الصورة..." : "Uploading image..."}</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-black text-slate-700">
                            {isAr ? "اضغط هنا لاختيار أو رفع صورة الوصل من جهازك" : "Click to select receipt image from your device"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            PNG, JPG, JPEG (بحد أقصى 5 ميجابايت)
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "ملاحظات إضافية:" : "Notes:"}
                </label>
                <textarea
                  rows={2}
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder={isAr ? "دفعة تصفية حساب الأسبوع الأول..." : "Optional notes..."}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sendingReceipt || receiptAmount <= 0}
                  className="btn bg-amber-500 hover:bg-amber-600 text-white flex-1 justify-center font-black py-3 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {sendingReceipt ? "جاري الإرسال والتوثيق..." : isAr ? "إرسال وتوثيق الوصل للصراف" : "Send Receipt"}
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptMerchant(null)}
                  className="btn btn-secondary py-3 px-5 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
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
