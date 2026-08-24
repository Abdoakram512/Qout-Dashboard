"use client";

import { compressImageFile } from "@/lib/imageCompressor";
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
import { arabicMatch } from "@/lib/arabicNormalizer";
import {
  Store, Upload, Trash2, Eye, Loader2, ImageIcon, Search, CheckCircle2, XCircle, Building2,
  MapPin, Mail, Hash, TrendingUp, CreditCard, ShieldCheck,
  PlusCircle, Send, FileText, AlertTriangle, ArrowUpRight,
  Coins, X, DollarSign, Wallet, Check, AlertCircle, Edit, Phone,
} from "lucide-react";
import Link from "next/link";
import { AllocateBudgetModal } from "@/components/merchants/AllocateBudgetModal";
import { SendReceiptModal } from "@/components/merchants/SendReceiptModal";
import { EditMerchantModal } from "@/components/merchants/EditMerchantModal";

// Helper to generate dynamic, smart reference code based on payment method
function generateReference(method: "instapay" | "vodafone_cash" | "bank_transfer" | "cash"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  switch (method) {
    case "instapay":
      return `INSTA-${dateStr}-${rand}`;
    case "vodafone_cash":
      return `VF-${dateStr}-${rand}`;
    case "bank_transfer":
      return `BANK-${dateStr}-${rand}`;
    case "cash":
      return `CASH-${dateStr}-${rand}`;
    default:
      return `REF-${dateStr}-${rand}`;
  }
}

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

  // Edit Merchant Modal State
  const [editingMerchant, setEditingMerchant] = useState<UserModel | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editInstapay, setEditInstapay] = useState("");
  const [editVodafoneCash, setEditVodafoneCash] = useState("");
  const [editCr, setEditCr] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingMerchant, setSavingMerchant] = useState(false);

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
      const nextActive = !m.isActive;
      await updateDoc(doc(db, "users", m.uid), {
        isActive: nextActive,
        isApproved: nextActive,
      });

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: nextActive ? "approve_user" : "reject_user",
          targetId: m.uid,
          targetType: "merchant",
          details: JSON.stringify({ storeName: m.storeName, name: m.name }),
        });
      }
    } catch (e) {
      console.error(e);
      alert(isAr ? "حدث خطأ أثناء تعديل الحالة" : "Error toggling status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Open Receipt Modal with full reset and dynamic ref
  const openReceiptModal = (m: UserModel) => {
    setReceiptMerchant(m);
    setReceiptAmount(5000);
    const initialMethod = "instapay";
    setPaymentMethod(initialMethod);
    setReferenceNumber(generateReference(initialMethod));
    setSenderAccount(isAr ? "حساب مؤسسة الفجر - إنستا باي" : "Al-Fajr Foundation Account");
    setReceiverAccount(m.instapayAddress || m.vodafoneCashNumber || m.phone || "");
    setReceiptImageUrl("");
    setReceiptNotes("");
  };

  // Open Edit Merchant Modal
  const openEditMerchant = (m: UserModel) => {
    setEditingMerchant(m);
    setEditStoreName(m.storeName || "");
    setEditName(m.name || "");
    setEditPhone(m.phone || "");
    setEditEmail(m.email || "");
    setEditCity(m.city || "");
    setEditInstapay(m.instapayAddress || "");
    setEditVodafoneCash(m.vodafoneCashNumber || "");
    setEditCr(m.commercialReg || "");
    setEditIsActive(m.isActive ?? true);
  };

  const handleSaveMerchant = async () => {
    if (!editingMerchant) return;
    setSavingMerchant(true);
    try {
      await updateDoc(doc(db, "users", editingMerchant.uid), {
        storeName: editStoreName.trim(),
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        city: editCity.trim(),
        instapayAddress: editInstapay.trim(),
        vodafoneCashNumber: editVodafoneCash.trim(),
        commercialReg: editCr.trim(),
        isActive: editIsActive,
        isApproved: editIsActive,
      });

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "update_user_role",
          targetId: editingMerchant.uid,
          targetType: "merchant",
          details: JSON.stringify({ storeName: editStoreName, name: editName }),
        });
      }

      showToast(isAr ? "تم تحديث بيانات الصراف بنجاح ✅" : "Merchant updated successfully ✅");
      setEditingMerchant(null);
    } catch (e: any) {
      console.error(e);
      alert(isAr ? "فشل حفظ التعديلات: " + e.message : "Failed to update merchant");
    } finally {
      setSavingMerchant(false);
    }
  };

  // Handle Image Upload for Payment Receipt
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const compressedBlob = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const storageRef = ref(storage, `payment_receipts/${Date.now()}_${cleanName}.jpg`);
      await uploadBytes(storageRef, compressedBlob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      setReceiptImageUrl(url);
    } catch (err: any) {
      console.error(err);
      alert(isAr ? "فشل رفع الصورة، يرجى المحاولة لاحقاً" : "Failed to upload image");
    } finally {
      setUploadingImg(false);
    }
  };

  // Submit Budget Allocation
  const handleConfirmAllocation = async () => {
    if (!allocatingMerchant || allocAmount <= 0) return;
    setAllocating(true);
    try {
      const allocationRef = doc(collection(db, "budget_allocations"));
      const allocData: BudgetAllocation = {
        id: allocationRef.id,
        merchantId: allocatingMerchant.uid,
        merchantStoreName: allocatingMerchant.storeName || allocatingMerchant.name || "منفذ غير مسمى",
        amount: allocAmount,
        type: allocType,
        timestamp: new Date().toISOString(),
        allocatedByAdminId: adminData?.uid || "admin",
        allocatedByAdminEmail: adminData?.email || "admin@alfajr.org",
        notes: allocNotes.trim() || null,
      };

      await setDoc(allocationRef, allocData);
      await updateDoc(doc(db, "users", allocatingMerchant.uid), {
        allocatedBudget: increment(allocAmount),
      });

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "allocate_budget",
          targetId: allocatingMerchant.uid,
          targetType: "merchant",
          details: JSON.stringify({ amount: allocAmount, type: allocType, notes: allocNotes }),
        });
      }

      showToast(isAr ? `تم تخصيص ${allocAmount.toLocaleString()} ج.م بنجاح للتاجر ${allocatingMerchant.storeName || ""}` : "Budget allocated successfully");
      setAllocatingMerchant(null);
      setAllocAmount(10000);
      setAllocNotes("");
    } catch (err: any) {
      console.error(err);
      alert(isAr ? "فشل حفظ التخصيص: " + err.message : "Failed to allocate budget");
    } finally {
      setAllocating(false);
    }
  };

  // Submit Payment Receipt
  const handleConfirmSendReceipt = async () => {
    if (!receiptMerchant || receiptAmount <= 0 || !referenceNumber.trim()) {
      alert(isAr ? "يرجى تعبئة جميع الحقول الإلزامية والرقم المرجعي" : "Please fill all required fields");
      return;
    }

    setSendingReceipt(true);
    try {
      const receiptRef = doc(collection(db, "payment_receipts"));
      const receiptData: PaymentReceipt = {
        receiptId: receiptRef.id,
        merchantId: receiptMerchant.uid,
        merchantStoreName: receiptMerchant.storeName || receiptMerchant.name || "منفذ",
        amount: receiptAmount,
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber.trim(),
        senderAccount: senderAccount.trim() || null,
        receiverAccount: receiverAccount.trim() || null,
        receiptImageUrl: receiptImageUrl.trim() || null,
        notes: receiptNotes.trim() || null,
        status: "sent",
        sentByAdminId: adminData?.uid || "admin",
        sentByAdminEmail: adminData?.email || "admin@alfajr.org",
        timestamp: new Date().toISOString(),
      };

      await setDoc(receiptRef, receiptData);

      // Dispatch Real-time Notification Document
      try {
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: receiptMerchant.uid,
          recipientRole: "merchant",
          title: "إشعار تحويل مالي جديد 💳",
          body: `تم إرسال إيصال تحويل بمبلغ ${receiptAmount.toLocaleString()} ج.م من الجمعية برقم مرجع: ${referenceNumber}`,
          type: "payment_receipt",
          referenceId: receiptRef.id,
          amount: receiptAmount,
          isRead: false,
          timestamp: new Date().toISOString(),
        });
      } catch (_) {}

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "send_payment_receipt",
          targetId: receiptMerchant.uid,
          targetType: "merchant",
          details: JSON.stringify({ amount: receiptAmount, method: paymentMethod, ref: referenceNumber }),
        });
      }

      showToast(isAr ? `تم إرسال إشعار وإيصال الدفع بقيمة ${receiptAmount.toLocaleString()} ج.م للصراف بنجاح ✅` : "Receipt sent successfully");
      setReceiptMerchant(null);
      setReceiptAmount(5000);
      setReceiptImageUrl("");
      setReceiptNotes("");
    } catch (err: any) {
      console.error(err);
      alert(isAr ? "فشل إرسال الإيصال: " + err.message : "Failed to send receipt");
    } finally {
      setSendingReceipt(false);
    }
  };

  const getBudgetStats = (m: UserModel) => {
    const allocated = m.allocatedBudget || 0;
    const spent = m.totalDisbursed || 0;
    const remaining = Math.max(0, allocated - spent);
    const spentPercentage = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
    const remainingPercentage = Math.max(0, 100 - spentPercentage);
    return { allocated, spent, remaining, spentPercentage, remainingPercentage };
  };

  // Filter Merchants using Arabic Normalizer
  const filtered = merchants.filter((m) => {
    const matchesSearch =
      !search.trim() ||
      arabicMatch(m.storeName || "", search) ||
      arabicMatch(m.name || "", search) ||
      arabicMatch(m.phone || "", search) ||
      arabicMatch(m.city || "", search) ||
      arabicMatch(m.email || "", search) ||
      arabicMatch(m.commercialReg || "", search);

    if (!matchesSearch) return false;

    if (filter === "active") return m.isActive === true;
    if (filter === "suspended") return m.isActive === false;
    if (filter === "low_liquidity") {
      const stats = getBudgetStats(m);
      return stats.allocated > 0 && stats.remaining <= 3000;
    }
    return true;
  });

  const totalAllocatedAll = merchants.reduce((acc, m) => acc + (m.allocatedBudget || 0), 0);
  const totalDisbursedAll = merchants.reduce((acc, m) => acc + (m.totalDisbursed || 0), 0);
  const totalRemainingAll = Math.max(0, totalAllocatedAll - totalDisbursedAll);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-emerald-400 font-bold text-sm animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="qout-card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">{isAr ? "إجمالي منافذ الصرف" : "Total Outlets"}</span>
            <Store className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{merchants.length}</p>
          <span className="text-[11px] text-emerald-700 font-bold mt-1 inline-block">
            {merchants.filter((m) => m.isActive).length} {isAr ? "منفذ نشط ومعتمد" : "active"}
          </span>
        </div>

        <div className="qout-card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">{isAr ? "إجمالي الميزانيات المخصصة" : "Total Allocated"}</span>
            <Wallet className="w-5 h-5 text-[#0A734D]" />
          </div>
          <p className="text-2xl font-black text-[#0A734D] font-mono">{totalAllocatedAll.toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
          <span className="text-[11px] text-slate-500 font-bold mt-1 inline-block">
            {isAr ? "تغذية نقدية من الإدارة" : "Total Admin Allocations"}
          </span>
        </div>

        <div className="qout-card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">{isAr ? "إجمالي المنصرف للمستفيدين" : "Total Disbursed"}</span>
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">{totalDisbursedAll.toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
          <span className="text-[11px] text-amber-800 font-bold mt-1 inline-block">
            {isAr ? "تم تسليمها للمستحقين" : "Redeemed by Beneficiaries"}
          </span>
        </div>

        <div className="qout-card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">{isAr ? "السيولة المتبقية لدى الصرافين" : "Remaining Liquidity"}</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 font-mono">{totalRemainingAll.toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
          <span className="text-[11px] text-blue-800 font-bold mt-1 inline-block">
            {isAr ? "جاهزة لعمليات الصرف" : "Available in Stores"}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="qout-card p-4 bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث باسم الصراف، اسم المتجر، الهاتف، المدينة أو السجل التجاري..." : "Search merchant, store, phone, city..."}
              className="qout-input qout-input-with-icon"
              style={{ paddingInlineStart: 44 }}
            />
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: isAr ? "الكل" : "All" },
              { id: "active", label: isAr ? "النشطة" : "Active" },
              { id: "suspended", label: isAr ? "المعطلة" : "Suspended" },
              { id: "low_liquidity", label: isAr ? "سيولة منخفضة (<3k)" : "Low Liquidity" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={`btn btn-sm font-black ${
                  filter === t.id
                    ? "bg-[#0A734D] text-white shadow-xs"
                    : "btn-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Merchants Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-bold">{isAr ? "جاري تحميل بيانات المنافذ..." : "Loading merchants..."}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800">{isAr ? "لم يتم العثور على منافذ مطابقة" : "No matching merchants"}</h3>
          <p className="text-xs text-slate-500 mt-1">{isAr ? "تأكد من كتابة الكلمات بشكل صحيح أو قم بمسح الفلاتر" : "Check search query or reset filters"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const bStats = getBudgetStats(m);

            return (
              <div
                key={m.uid}
                className="qout-card p-5 bg-white border border-slate-200/90 hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-xs hover:shadow-md group"
              >
                <div>
                  {/* Top Row: Store Badge + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0A734D] flex items-center justify-center border border-emerald-200 shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Store className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate leading-snug">
                          {m.storeName || m.name || (isAr ? "منفذ بدون اسم" : "Unnamed Outlet")}
                        </h4>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{m.city || (isAr ? "مصر" : "Egypt")}</span>
                          {m.name && <span className="text-slate-400">• {m.name}</span>}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`badge font-black text-[10px] ${
                        m.isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-red-100 text-red-800 border-red-300"
                      }`}
                    >
                      {m.isActive ? (isAr ? "معتمد نشط" : "Active") : (isAr ? "معطل" : "Disabled")}
                    </span>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4 text-[11px] font-bold text-slate-600">
                    {m.phone && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {m.phone}
                      </span>
                    )}
                    {m.instapayAddress && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1 font-mono">
                        <Coins className="w-3 h-3 text-emerald-600" />
                        {m.instapayAddress}
                      </span>
                    )}
                    {m.vodafoneCashNumber && (
                      <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-900 border border-red-200 flex items-center gap-1 font-mono">
                        VF: {m.vodafoneCashNumber}
                      </span>
                    )}
                  </div>

                  {/* Financial Liquidity Progress */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-600">{isAr ? "السيولة المتوفرة بالمنفذ:" : "Available Liquidity:"}</span>
                      <span className="text-[#0A734D] font-mono text-sm font-extrabold">{bStats.remaining.toLocaleString()} {isAr ? "ج.م" : "EGP"}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                        <div
                          style={{ width: `${bStats.spentPercentage}%` }}
                          className="h-full bg-amber-500 transition-all duration-500"
                          title={isAr ? `تم صرف: ${bStats.spent.toLocaleString()} ج.م (${bStats.spentPercentage}%)` : "Disbursed"}
                        />
                        <div
                          style={{ width: `${bStats.remainingPercentage}%` }}
                          className="h-full bg-emerald-600 transition-all duration-500"
                          title={isAr ? `متبقي: ${bStats.remaining.toLocaleString()} ج.م (${bStats.remainingPercentage}%)` : "Remaining"}
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
                      onClick={() => openReceiptModal(m)}
                      className="btn btn-sm bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-black flex items-center justify-center gap-1.5 py-2"
                      title={isAr ? "إرسال وصل دفع إنستا باي / فودافون كاش" : "Send Receipt"}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAr ? "إرسال وصل" : "Send Receipt"}</span>
                    </button>
                  </div>

                  {/* Profile Link, Edit & Toggle */}
                  <div className="grid grid-cols-4 gap-2">
                    <Link
                      href={`/dashboard/merchants/${m.uid}`}
                      className="btn btn-sm btn-secondary col-span-2 justify-center font-black text-xs py-2 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isAr ? "المحفظة" : "Ledger"}</span>
                    </Link>

                    {/* Edit Merchant Button */}
                    <button
                      onClick={() => openEditMerchant(m)}
                      className="btn btn-sm btn-secondary justify-center font-black text-xs py-2 text-slate-700 hover:bg-slate-100"
                      title={isAr ? "تعديل بيانات الصراف والمنفذ" : "Edit Merchant"}
                    >
                      <Edit className="w-4 h-4 text-emerald-700" />
                    </button>

                    {/* Toggle Active Button */}
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

            {/* ── MODALS (Modular Components) ── */}
      <AllocateBudgetModal
        isOpen={Boolean(allocatingMerchant && mounted)}
        onClose={() => setAllocatingMerchant(null)}
        merchant={allocatingMerchant}
        allocAmount={allocAmount}
        setAllocAmount={setAllocAmount}
        allocType={allocType}
        setAllocType={setAllocType}
        allocNotes={allocNotes}
        setAllocNotes={setAllocNotes}
        allocating={allocating}
        onConfirm={handleConfirmAllocation}
        isAr={isAr}
      />

      <SendReceiptModal
        isOpen={Boolean(receiptMerchant && mounted)}
        onClose={() => setReceiptMerchant(null)}
        merchant={receiptMerchant}
        receiptAmount={receiptAmount}
        setReceiptAmount={setReceiptAmount}
        paymentMethod={paymentMethod}
        onMethodChange={(method) => {
          setPaymentMethod(method);
          setReferenceNumber(generateReference(method));
        }}
        referenceNumber={referenceNumber}
        setReferenceNumber={setReferenceNumber}
        senderAccount={senderAccount}
        setSenderAccount={setSenderAccount}
        receiverAccount={receiverAccount}
        setReceiverAccount={setReceiverAccount}
        receiptImageUrl={receiptImageUrl}
        setReceiptImageUrl={setReceiptImageUrl}
        receiptNotes={receiptNotes}
        setReceiptNotes={setReceiptNotes}
        sendingReceipt={sendingReceipt}
        uploadingImg={uploadingImg}
        onImageUpload={handleImageUpload}
        onSend={handleConfirmSendReceipt}
        isAr={isAr}
      />

      <EditMerchantModal
        isOpen={Boolean(editingMerchant && mounted)}
        onClose={() => setEditingMerchant(null)}
        merchant={editingMerchant}
        editStoreName={editStoreName}
        setEditStoreName={setEditStoreName}
        editName={editName}
        setEditName={setEditName}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editCity={editCity}
        setEditCity={setEditCity}
        editInstapay={editInstapay}
        setEditInstapay={setEditInstapay}
        editVodafoneCash={editVodafoneCash}
        setEditVodafoneCash={setEditVodafoneCash}
        editCr={editCr}
        setEditCr={setEditCr}
        editIsActive={editIsActive}
        setEditIsActive={setEditIsActive}
        savingMerchant={savingMerchant}
        onSave={handleSaveMerchant}
        isAr={isAr}
      />
    </div>
  );
}
