"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc, getDoc, collection, query, where, onSnapshot, updateDoc,
  setDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import { logAuditEvent } from "@/lib/auditLogger";
import {
  UserModel, BudgetAllocation, PaymentReceipt, RedemptionTransaction,
} from "@/types";
import {
  Store, Upload, Trash2, Eye, Loader2, ImageIcon, ArrowLeft, ArrowRight, Printer, Wallet, TrendingUp,
  Coins, CheckCircle2, AlertTriangle, Building2, MapPin, Mail,
  Hash, CreditCard, Send, PlusCircle, FileText, Check, X,
  Clock, ShieldCheck, Download, Users, Phone, ExternalLink, Edit,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

function parseDate(raw: any): Date {
  if (!raw) return new Date();
  if (raw.toDate) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

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

export default function MerchantProfilePage() {
  const params = useParams();
  const merchantIdParam = Array.isArray(params?.merchantId) ? params.merchantId[0] : (params?.merchantId as string);
  const router = useRouter();
  const { locale } = useI18n();
  const { adminData } = useAuth();
  const isAr = locale === "ar";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [merchant, setMerchant] = useState<UserModel | null>(null);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"redemptions" | "allocations" | "receipts">("redemptions");

  // Allocation Modal
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocAmount, setAllocAmount] = useState<number>(10000);
  const [allocType, setAllocType] = useState<"initial" | "recharge" | "adjustment">("recharge");
  const [allocNotes, setAllocNotes] = useState("");
  const [allocating, setAllocating] = useState(false);

  // Send Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<"instapay" | "vodafone_cash" | "bank_transfer" | "cash">("instapay");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [senderAccount, setSenderAccount] = useState("حساب مؤسسة الفجر - إنستا باي");
  const [receiverAccount, setReceiverAccount] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Edit Merchant Modal
  const [showEditModal, setShowEditModal] = useState(false);
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

  // 1. Fetch Merchant Doc
  useEffect(() => {
    if (!merchantIdParam) return;
    const unsub = onSnapshot(doc(db, "users", merchantIdParam), (snap) => {
      if (snap.exists()) {
        const mData = { uid: snap.id, ...snap.data() } as UserModel;
        setMerchant(mData);
        setEditStoreName(mData.storeName || "");
        setEditName(mData.name || "");
        setEditPhone(mData.phone || "");
        setEditEmail(mData.email || "");
        setEditCity(mData.city || "");
        setEditInstapay(mData.instapayAddress || "");
        setEditVodafoneCash(mData.vodafoneCashNumber || "");
        setEditCr(mData.commercialReg || "");
        setEditIsActive(mData.isActive ?? true);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [merchantIdParam]);

  // 2. Fetch Allocations
  useEffect(() => {
    if (!merchantIdParam) return;
    const q = query(
      collection(db, "budget_allocations"),
      where("merchantId", "==", merchantIdParam)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: BudgetAllocation[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as BudgetAllocation));
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setAllocations(list);
    });
    return () => unsub();
  }, [merchantIdParam]);

  // 3. Fetch Receipts
  useEffect(() => {
    if (!merchantIdParam) return;
    const q = query(
      collection(db, "payment_receipts"),
      where("merchantId", "==", merchantIdParam)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: PaymentReceipt[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as PaymentReceipt));
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setReceipts(list);
    });
    return () => unsub();
  }, [merchantIdParam]);

  // 4. Fetch Redemptions
  useEffect(() => {
    if (!merchantIdParam) return;
    const q = query(
      collection(db, "redemptions"),
      where("merchantId", "==", merchantIdParam)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: RedemptionTransaction[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RedemptionTransaction));
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setRedemptions(list);
    });
    return () => unsub();
  }, [merchantIdParam]);

  const handleOpenReceiptModal = () => {
    if (!merchant) return;
    setReceiptAmount(5000);
    const initialMethod = "instapay";
    setPaymentMethod(initialMethod);
    setReferenceNumber(generateReference(initialMethod));
    setSenderAccount(isAr ? "حساب مؤسسة الفجر - إنستا باي" : "Al-Fajr Foundation Account");
    setReceiverAccount(merchant.instapayAddress || merchant.vodafoneCashNumber || merchant.phone || "");
    setReceiptImageUrl("");
    setReceiptNotes("");
    setShowReceiptModal(true);
  };

  const handleSaveMerchantDetails = async () => {
    if (!merchant) return;
    setSavingMerchant(true);
    try {
      await updateDoc(doc(db, "users", merchant.uid), {
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
          targetId: merchant.uid,
          targetType: "merchant",
          details: JSON.stringify({ storeName: editStoreName, name: editName }),
        });
      }

      showToast(isAr ? "تم حفظ وتحديث بيانات الصراف بنجاح ✅" : "Merchant updated successfully ✅");
      setShowEditModal(false);
    } catch (e: any) {
      console.error(e);
      alert(isAr ? "فشل حفظ التعديلات: " + e.message : "Failed to update merchant");
    } finally {
      setSavingMerchant(false);
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const storageRef = ref(storage, `payment_receipts/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setReceiptImageUrl(url);
    } catch (err: any) {
      console.error(err);
      alert(isAr ? "فشل رفع الصورة" : "Failed to upload image");
    } finally {
      setUploadingImg(false);
    }
  };

  // Submit Budget Allocation
  const handleConfirmAllocation = async () => {
    if (!merchant || allocAmount <= 0) return;
    setAllocating(true);
    try {
      const allocationRef = doc(collection(db, "budget_allocations"));
      const allocData: BudgetAllocation = {
        id: allocationRef.id,
        merchantId: merchant.uid,
        merchantStoreName: merchant.storeName || merchant.name || "منفذ",
        amount: allocAmount,
        type: allocType,
        timestamp: new Date().toISOString(),
        allocatedByAdminId: adminData?.uid || "admin",
        allocatedByAdminEmail: adminData?.email || "admin@alfajr.org",
        notes: allocNotes.trim() || null,
      };

      await setDoc(allocationRef, allocData);
      await updateDoc(doc(db, "users", merchant.uid), {
        allocatedBudget: increment(allocAmount),
      });

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "allocate_budget",
          targetId: merchant.uid,
          targetType: "merchant",
          details: JSON.stringify({ amount: allocAmount, type: allocType }),
        });
      }

      showToast(isAr ? `تم تخصيص ${allocAmount.toLocaleString()} ج.م بنجاح` : "Budget allocated successfully");
      setShowAllocModal(false);
      setAllocAmount(10000);
      setAllocNotes("");
    } catch (err: any) {
      console.error(err);
      alert(isAr ? "فشل حفظ التخصيص" : "Failed to allocate");
    } finally {
      setAllocating(false);
    }
  };

  // Submit Payment Receipt
  const handleConfirmSendReceipt = async () => {
    if (!merchant || receiptAmount <= 0 || !referenceNumber.trim()) {
      alert(isAr ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all fields");
      return;
    }

    setSendingReceipt(true);
    try {
      const receiptRef = doc(collection(db, "payment_receipts"));
      const receiptData: PaymentReceipt = {
        receiptId: receiptRef.id,
        merchantId: merchant.uid,
        merchantStoreName: merchant.storeName || merchant.name || "منفذ",
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

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "send_payment_receipt",
          targetId: merchant.uid,
          targetType: "merchant",
          details: JSON.stringify({ amount: receiptAmount, method: paymentMethod, ref: referenceNumber }),
        });
      }

      showToast(isAr ? "تم إرسال إشعار وإيصال الدفع للصراف بنجاح ✅" : "Receipt sent successfully");
      setShowReceiptModal(false);
      setReceiptAmount(5000);
      setReceiptImageUrl("");
      setReceiptNotes("");
    } catch (err: any) {
      console.error(err);
      alert(isAr ? "فشل إرسال الإيصال" : "Failed to send receipt");
    } finally {
      setSendingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
        <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-800">{isAr ? "الصراف غير موجود" : "Merchant not found"}</h3>
        <Link href="/dashboard/merchants" className="btn btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          <span>{isAr ? "العودة لقائمة الصرافين" : "Back to Merchants"}</span>
        </Link>
      </div>
    );
  }

  const allocated = merchant.allocatedBudget || 0;
  const spent = merchant.totalDisbursed || 0;
  const remaining = Math.max(0, allocated - spent);
  const spentPercentage = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
  const remainingPercentage = Math.max(0, 100 - spentPercentage);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-emerald-400 font-bold text-sm animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Button & Top Action Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/dashboard/merchants"
          className="btn btn-sm btn-secondary font-bold inline-flex items-center gap-2 text-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{isAr ? "العودة لقائمة الصرافين والمنافذ" : "Back to Merchants"}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Edit Merchant Button */}
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-sm btn-secondary font-bold text-xs flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isAr ? "تعديل البيانات" : "Edit Profile"}</span>
          </button>

          {/* Send Receipt Button */}
          <button
            onClick={handleOpenReceiptModal}
            className="btn btn-sm bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAr ? "إرسال وصل دفع" : "Send Receipt"}</span>
          </button>

          {/* Allocate Budget Button */}
          <button
            onClick={() => {
              setAllocAmount(10000);
              setShowAllocModal(true);
            }}
            className="btn btn-sm btn-primary font-bold text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isAr ? "تخصيص رصيد" : "Allocate Budget"}</span>
          </button>
        </div>
      </div>

      {/* Hero Merchant Card */}
      <div className="qout-card p-6 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#0A734D] flex items-center justify-center border-2 border-emerald-200 flex-shrink-0 shadow-xs">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900">
                  {merchant.storeName || merchant.name || "منفذ معتمد"}
                </h2>
                <span
                  className={`badge font-bold text-xs ${
                    merchant.isActive
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  {merchant.isActive ? (isAr ? "معتمد ونشط" : "Active") : (isAr ? "معطل" : "Suspended")}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                <span>{isAr ? "المسؤول:" : "Owner:"} {merchant.name || "—"}</span>
                <span>•</span>
                <span>{merchant.city || (isAr ? "مصر" : "Egypt")}</span>
                {merchant.commercialReg && (
                  <>
                    <span>•</span>
                    <span className="font-mono">CR: {merchant.commercialReg}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Fast Contact Chips */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {merchant.phone && (
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {merchant.phone}
              </span>
            )}
            {merchant.instapayAddress && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-1.5 font-mono">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                IPA: {merchant.instapayAddress}
              </span>
            )}
            {merchant.vodafoneCashNumber && (
              <span className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-1.5 font-mono">
                VF: {merchant.vodafoneCashNumber}
              </span>
            )}
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
            <span className="text-xs font-bold text-slate-500 block mb-1">{isAr ? "إجمالي الميزانية المخصصة" : "Total Allocated"}</span>
            <p className="text-2xl font-black text-[#0A734D] font-mono">{allocated.toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs font-bold text-slate-500 block mb-1">{isAr ? "إجمالي المصروف للمستفيدين" : "Total Disbursed"}</span>
            <p className="text-2xl font-black text-amber-700 font-mono">{spent.toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
            <span className="text-xs font-bold text-slate-500 block mb-1">{isAr ? "السيولة المتبقية الجاهزة للصرف" : "Available Balance"}</span>
            <p className="text-2xl font-black text-blue-700 font-mono">{remaining.toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: "redemptions", label: isAr ? `عمليات الصرف (${redemptions.length})` : `Redemptions (${redemptions.length})`, icon: CreditCard },
          { id: "allocations", label: isAr ? `سندات التخصيص (${allocations.length})` : `Allocations (${allocations.length})`, icon: Wallet },
          { id: "receipts", label: isAr ? `إيصالات التحويل (${receipts.length})` : `Receipts (${receipts.length})`, icon: Send },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? "border-[#0A734D] text-[#0A734D] bg-emerald-50/30"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Redemptions Table */}
      {activeTab === "redemptions" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-bold text-slate-800">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">{isAr ? "رقم العملية" : "Txn ID"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المستفيد" : "Beneficiary"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "رقم الكارت" : "Card ID"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المبلغ المصروف" : "Amount"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "التاريخ والوقت" : "Timestamp"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد عمليات صرف مسجلة لهذا الصراف حتى الآن" : "No redemptions found"}
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.id?.slice(-8) || "—"}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.beneficiaryName || "—"}</td>
                      <td className="py-3 px-4 font-mono text-emerald-800">{r.cardId}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[#0A734D]">
                        {r.amountDeducted?.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {parseDate(r.timestamp).toLocaleString(isAr ? "ar-EG" : "en-US")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Allocations Table */}
      {activeTab === "allocations" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-bold text-slate-800">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">{isAr ? "رقم السند" : "Allocation ID"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المبلغ المضاف" : "Amount"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "النوع" : "Type"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المشرف الإداري" : "Allocated By"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد سندات تخصيص مسجلة" : "No allocations found"}
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.id?.slice(-8) || "—"}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[#0A734D]">
                        +{a.amount?.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                          {a.type === "recharge" ? (isAr ? "تغذية دورية" : "Recharge") : a.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{a.allocatedByAdminEmail || "admin"}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {parseDate(a.timestamp).toLocaleString(isAr ? "ar-EG" : "en-US")}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{a.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Receipts Table */}
      {activeTab === "receipts" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-bold text-slate-800">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">{isAr ? "المرجع" : "Ref"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "طريقة التحويل" : "Method"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "حساب المستلم" : "Receiver"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد إيصالات تحويل مسجلة" : "No receipts found"}
                    </td>
                  </tr>
                ) : (
                  receipts.map((rc) => (
                    <tr key={rc.receiptId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rc.referenceNumber || rc.receiptId?.slice(-8)}</td>
                      <td className="py-3 px-4">
                        <span className="badge bg-amber-50 text-amber-900 border-amber-200 font-bold">
                          {rc.paymentMethod === "instapay" ? "إنستا باي" : rc.paymentMethod === "vodafone_cash" ? "فودافون كاش" : rc.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                        {rc.amount?.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{rc.receiverAccount || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${
                          rc.status === "confirmed_by_merchant"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}>
                          {rc.status === "confirmed_by_merchant" ? (isAr ? "تم التأكيد من الصراف ✅" : "Confirmed") : (isAr ? "بانتظار التأكيد" : "Pending")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {parseDate(rc.timestamp).toLocaleString(isAr ? "ar-EG" : "en-US")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: Allocate Budget Modal ────────────────────────────── */}
      {showAllocModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAllocModal(false)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center shadow-lg shadow-emerald-900/20 flex-shrink-0">
                <Wallet className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isAr ? "تخصيص ميزانية وتغذية سيولة" : "Allocate Merchant Budget"}
                </h3>
                <p className="text-xs font-bold text-[#0A734D]">
                  {merchant.storeName || merchant.name}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "المبلغ المراد إضافته (ج.م)" : "Amount to Allocate (EGP)"}</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAllocAmount(amt)}
                      className={`py-2 px-1 rounded-xl border text-xs font-black ${
                        allocAmount === amt
                          ? "bg-[#0A734D] text-white border-[#0A734D]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(Number(e.target.value))}
                  className="qout-input font-mono font-bold text-sm"
                  min={100}
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "نوع العملية" : "Allocation Type"}</label>
                <select
                  value={allocType}
                  onChange={(e) => setAllocType(e.target.value as any)}
                  className="qout-select font-bold"
                >
                  <option value="recharge">{isAr ? "تغذية دورية (Recharge)" : "Periodic Recharge"}</option>
                  <option value="initial">{isAr ? "تخصيص مبدئي (Initial)" : "Initial Budget"}</option>
                  <option value="adjustment">{isAr ? "تسوية إدارية (Adjustment)" : "Administrative Adjustment"}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "ملاحظات السند المالي (اختياري)" : "Notes (Optional)"}</label>
                <input
                  type="text"
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  placeholder={isAr ? "مثال: حوالة بنكية لشهر رمضان" : "e.g. Bank transfer for Ramadan"}
                  className="qout-input"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllocModal(false)}
                  className="btn btn-secondary px-5"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={allocating || allocAmount <= 0}
                  onClick={handleConfirmAllocation}
                  className="btn btn-primary px-6"
                >
                  {allocating ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "تأكيد إضافة الرصيد" : "Confirm Allocation")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: Send Payment Receipt Modal (Smart Ref) ──────────────── */}
      {showReceiptModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-900/20 flex-shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isAr ? "إرسال إشعار وإيصال تحويل للصراف" : "Send Transfer Receipt"}
                </h3>
                <p className="text-xs font-bold text-amber-700">
                  {merchant.storeName || merchant.name}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "طريقة التحويل" : "Payment Method"}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const pm = e.target.value as any;
                    setPaymentMethod(pm);
                    setReferenceNumber(generateReference(pm));
                    if (pm === "instapay") setReceiverAccount(merchant.instapayAddress || merchant.phone || "");
                    else if (pm === "vodafone_cash") setReceiverAccount(merchant.vodafoneCashNumber || merchant.phone || "");
                    else setReceiverAccount("");
                  }}
                  className="qout-select font-bold"
                >
                  <option value="instapay">إنستا باي (InstaPay)</option>
                  <option value="vodafone_cash">محفظة فودافون كاش (Vodafone Cash)</option>
                  <option value="bank_transfer">تحويل بنكي رسمي (Bank Transfer)</option>
                  <option value="cash">تسليم نقدي مباشر (Cash Handover)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "مبلغ الحوالة (ج.م)" : "Transfer Amount (EGP)"}</label>
                <input
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(Number(e.target.value))}
                  className="qout-input font-mono font-bold text-sm"
                  min={1}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700">{isAr ? "الرقم المرجعي التلقائي للحوالة" : "Reference Number"}</label>
                  <button
                    type="button"
                    onClick={() => setReferenceNumber(generateReference(paymentMethod))}
                    className="text-[11px] text-emerald-700 hover:underline font-bold"
                  >
                    {isAr ? "توليد جديد 🔄" : "Regenerate 🔄"}
                  </button>
                </div>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="qout-input font-mono font-bold text-sm bg-amber-50/50 border-amber-300"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "حساب / هاتف المستلم (الصراف)" : "Receiver Account / Phone"}</label>
                <input
                  type="text"
                  value={receiverAccount}
                  onChange={(e) => setReceiverAccount(e.target.value)}
                  className="qout-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "صورة إيصال التحويل (اختياري)" : "Receipt Screenshot"}</label>
                <div className="flex items-center gap-3">
                  <label className="btn btn-secondary cursor-pointer flex items-center gap-2 py-2 px-3 text-xs">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImg ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "اختيار صورة الوصل" : "Select Image")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImg}
                    />
                  </label>
                  {receiptImageUrl && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? "تم إرفاق الصورة" : "Image Attached"}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "ملاحظات إضافية" : "Notes"}</label>
                <input
                  type="text"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="qout-input"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="btn btn-secondary px-5"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={sendingReceipt || receiptAmount <= 0 || !referenceNumber.trim()}
                  onClick={handleConfirmSendReceipt}
                  className="btn bg-amber-600 hover:bg-amber-700 text-white px-6 font-bold"
                >
                  {sendingReceipt ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الإيصال للتطبيق" : "Send Receipt")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 3: Edit Full Merchant Details ────────────────────────── */}
      {showEditModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/20 flex-shrink-0">
                <Edit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isAr ? "تعديل بيانات الصراف والمنفذ" : "Edit Merchant Profile"}
                </h3>
                <p className="text-xs font-bold text-emerald-700">
                  {merchant.storeName || merchant.name}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "اسم المتجر / المنفذ الرسمي" : "Store Name"}</label>
                <input
                  type="text"
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  className="qout-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "اسم المسؤول / التاجر" : "Owner Name"}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="qout-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1.5">{isAr ? "رقم الهاتف" : "Phone"}</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="qout-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1.5">{isAr ? "البريد الإلكتروني" : "Email"}</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="qout-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "المدينة / المحافظة / العنوان" : "City / Location"}</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="qout-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1.5">{isAr ? "عنوان إنستا باي (IPA)" : "InstaPay Address"}</label>
                  <input
                    type="text"
                    value={editInstapay}
                    onChange={(e) => setEditInstapay(e.target.value)}
                    placeholder="user@instapay"
                    className="qout-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1.5">{isAr ? "رقم فودافون كاش" : "Vodafone Cash No."}</label>
                  <input
                    type="text"
                    value={editVodafoneCash}
                    onChange={(e) => setEditVodafoneCash(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="qout-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "رقم السجل التجاري / الهوية" : "Commercial Reg / Tax ID"}</label>
                <input
                  type="text"
                  value={editCr}
                  onChange={(e) => setEditCr(e.target.value)}
                  className="qout-input font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "حالة اعتماد المنفذ" : "Outlet Status"}</label>
                <select
                  value={editIsActive ? "active" : "suspended"}
                  onChange={(e) => setEditIsActive(e.target.value === "active")}
                  className="qout-select font-bold"
                >
                  <option value="active">{isAr ? "معتمد ونشط (Active)" : "Active & Approved"}</option>
                  <option value="suspended">{isAr ? "معطل / موقوف (Suspended)" : "Suspended"}</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary px-5"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={savingMerchant}
                  onClick={handleSaveMerchantDetails}
                  className="btn btn-primary px-6"
                >
                  {savingMerchant ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
