"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
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
  Store, ArrowLeft, ArrowRight, Printer, Wallet, TrendingUp,
  Coins, CheckCircle2, AlertTriangle, Building2, MapPin, Mail,
  Hash, CreditCard, Send, PlusCircle, FileText, Check, X,
  Clock, ShieldCheck, Download, Users, Phone, ExternalLink,
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

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<"instapay" | "vodafone_cash" | "bank_transfer" | "cash">("instapay");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiverAccount, setReceiverAccount] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);

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
        setMerchant({ uid: snap.id, ...snap.data() } as UserModel);
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

  // Financial calculations
  const allocatedBudget = merchant?.allocatedBudget || 0;
  const totalDisbursed = redemptions.reduce((acc, r) => acc + (r.amountDeducted || r.amount || 0), 0);
  const remainingLiquidity = Math.max(0, allocatedBudget - totalDisbursed);
  const spentPct = allocatedBudget > 0 ? Math.min(100, Math.round((totalDisbursed / allocatedBudget) * 100)) : 0;
  const remPct = allocatedBudget > 0 ? Math.max(0, 100 - spentPct) : 0;
  const isLowLiquidity = allocatedBudget > 0 && remPct <= 15;
  const totalReceiptsAmount = receipts.reduce((acc, r) => acc + (r.amount || 0), 0);

  // Submit Budget Allocation
  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(allocAmount);
    if (!merchant || isNaN(numAmount) || numAmount <= 0) {
      alert(isAr ? "يرجى إدخال مبلغ مالي صحيح أكبر من صفر" : "Please enter a valid amount greater than zero");
      return;
    }
    setAllocating(true);

    try {
      const allocId = `ALLOC-${Date.now().toString().slice(-6)}`;
      const allocRef = doc(db, "budget_allocations", allocId);
      const merchantId = merchant.uid || (merchant as any).id;

      const allocationData: any = {
        id: allocId,
        allocationId: allocId,
        merchantId: merchantId,
        merchantName: merchant.name || "صراف",
        merchantStoreName: merchant.storeName || merchant.name || "منفذ الفجر",
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
        details: `تخصيص وتغذية ميزانية بمبلغ ${numAmount.toLocaleString()} ج.م لمنفذ ${merchant.storeName || merchant.name}`,
        targetId: merchantId,
      });

      showToast(`تمت إضافة ${numAmount.toLocaleString()} ج.م إلى ميزانية الصراف بنجاح ✅`);
      setShowAllocModal(false);
      setAllocNotes("");
    } catch (err: any) {
      console.error("Allocation error:", err);
      alert((isAr ? "حدث خطأ أثناء حفظ التخصيص: " : "Error saving allocation: ") + (err?.message || ""));
    }
    setAllocating(false);
  };

  // Submit Payment Receipt
  const handleSendReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || receiptAmount <= 0) return;
    setSendingReceipt(true);

    try {
      const receiptId = `REC-${Date.now().toString().slice(-6)}`;
      const receiptRef = doc(db, "payment_receipts", receiptId);

      const receiptData: PaymentReceipt = {
        id: receiptId,
        receiptId: receiptId,
        merchantId: merchant.uid,
        merchantName: merchant.name || "صراف",
        merchantStoreName: merchant.storeName || merchant.name || "منفذ الفجر",
        amount: Number(receiptAmount),
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber.trim() || `REF-${Date.now().toString().slice(-4)}`,
        receiverAccountOrPhone: receiverAccount.trim() || merchant.instapayAddress || merchant.vodafoneCashNumber || undefined,
        receiptImageUrl: receiptImageUrl.trim() || undefined,
        status: "sent",
        sentBy: {
          adminId: adminData?.uid || "admin",
          adminName: adminData?.name || "مشرف مؤسسة الفجر",
        },
        notes: receiptNotes.trim() || undefined,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(receiptRef, receiptData);

      showToast(`تم إرسال وتوثيق وصل الدفع بقيمة ${receiptAmount.toLocaleString()} ج.م بنجاح 📤`);
      setShowReceiptModal(false);
      setReferenceNumber("");
      setReceiptImageUrl("");
      setReceiptNotes("");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إرسال الوصل");
    }
    setSendingReceipt(false);
  };

  // Official PDF Print
  const handlePrintStatement = () => {
    if (!merchant) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const redemptionsHtml = redemptions
      .map(
        (r, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${parseDate(r.timestamp).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
        <td style="font-family: monospace; font-weight: bold;">${r.cardId}</td>
        <td style="font-weight: bold;">${r.beneficiaryName || "مستفيد"}</td>
        <td style="font-weight: bold; color: #0A734D; text-align: left;">${(r.amountDeducted || r.amount || 0).toLocaleString()} ج.م</td>
        <td style="text-align: center;">${r.foodBasketsDeducted || 0}</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف حساب منفذ وصراف معتمد - مؤسسة الفجر الخيرية</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #0f172a; background: #fff; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0A734D; padding-bottom: 12px; margin-bottom: 16px; }
          .brand-title { font-size: 20px; font-weight: 900; color: #0A734D; margin: 0; }
          .brand-sub { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center; }
          .summary-card { padding: 8px; background: #fff; border-radius: 6px; border: 1px solid #cbd5e1; }
          .summary-label { font-size: 10px; color: #64748b; font-weight: bold; }
          .summary-val { font-size: 16px; font-weight: 900; margin-top: 4px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
          th { background-color: #0A734D; color: #ffffff; padding: 7px 5px; text-align: right; border: 1px solid #064E3B; font-weight: 700; }
          td { padding: 5px; border: 1px solid #e2e8f0; text-align: right; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer-box { margin-top: 24px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">مؤسسة الفجر الخيرية (Al-Fajr Foundation)</h1>
            <p class="brand-sub">كشف تسوية ومطابقة حساب الصراف والمنفذ المعتمد</p>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <div>تاريخ الكشف: <b>${new Date().toLocaleDateString("ar-EG")}</b></div>
            <div>المنفذ: <b>${merchant.storeName || merchant.name}</b></div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">إجمالي الميزانية المخصصة</div>
            <div class="summary-val" style="color: #0f172a;">${allocatedBudget.toLocaleString()} ج.م</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">إجمالي المصروف للمستفيدين</div>
            <div class="summary-val" style="color: #0A734D;">${totalDisbursed.toLocaleString()} ج.م</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">السيولة المتبقية بالعهدة</div>
            <div class="summary-val" style="color: #b45309;">${remainingLiquidity.toLocaleString()} ج.م</div>
          </div>
        </div>

        <h3 style="font-size: 13px; font-weight: 900; margin-bottom: 6px; color: #0A734D;">سجل عمليات الصرف المنفذة للمستفيدين (${redemptions.length} عملية)</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>التاريخ والوقت</th>
              <th>رقم الكارت</th>
              <th>اسم المستفيد</th>
              <th style="text-align: left;">المبلغ المصروف</th>
              <th style="text-align: center;">السلال</th>
            </tr>
          </thead>
          <tbody>
            ${redemptionsHtml || '<tr><td colspan="6" style="text-align: center; padding: 15px;">لا توجد عمليات صرف مسجلة</td></tr>'}
          </tbody>
        </table>

        <div class="footer-box">
          <div>
            <p style="margin: 0; font-weight: bold; color: #475569;">مؤسسة الفجر الخيرية - الإدارة المالية</p>
            <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 10px;">كشف حساب صادر ومعتمد من المنظومة المركزية</p>
          </div>
          <div style="border: 2px dashed #0A734D; padding: 8px 16px; border-radius: 8px; text-align: center; color: #0A734D; font-weight: 900;">
            اعتماد الإدارة المالية<br>مؤسسة الفجر
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center font-black animate-pulse shadow-lg">
          الفجر
        </div>
        <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">{isAr ? "جاري تحميل محفظة وبيانات الصراف..." : "Loading merchant wallet..."}</p>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto my-12">
        <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-black text-slate-900">{isAr ? "لم يتم العثور على هذا المنفذ" : "Merchant Not Found"}</h2>
        <button
          onClick={() => router.push("/dashboard/merchants")}
          className="btn btn-sm bg-[#0A734D] text-white font-black px-5 py-2.5 rounded-xl shadow-md mt-4"
        >
          {isAr ? "العودة لقائمة المنافذ" : "Back to Merchants"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[120] px-4 py-3 rounded-2xl bg-[#0A734D] text-white font-black text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/merchants")}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title={isAr ? "رجوع للقائمة" : "Back"}
          >
            {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                منفذ معتمد
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                CR: {merchant.commercialReg || "—"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight mt-0.5">
              {merchant.storeName || merchant.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setAllocAmount(10000);
              setShowAllocModal(true);
            }}
            className="btn btn-sm bg-[#0A734D] hover:bg-[#085E3E] text-white font-black flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span>{isAr ? "تخصيص رصيد" : "Allocate Budget"}</span>
          </button>

          <button
            onClick={() => {
              setReceiptAmount(5000);
              setReferenceNumber(`INSTA-${Date.now().toString().slice(-6)}`);
              setReceiverAccount(merchant.instapayAddress || merchant.vodafoneCashNumber || "");
              setShowReceiptModal(true);
            }}
            className="btn btn-sm bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>{isAr ? "إرسال وصل دفع" : "Send Receipt"}</span>
          </button>

          <button
            onClick={handlePrintStatement}
            className="btn btn-sm btn-secondary font-black flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>{isAr ? "طباعة كشف الحساب" : "Print Statement"}</span>
          </button>
        </div>
      </div>

      {/* ── 1. Hero Identity & Financial Health Card ──────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A734D] to-[#064E3B] text-white flex items-center justify-center font-black text-2xl shadow-md flex-shrink-0">
              <Store className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-950">{merchant.storeName || merchant.name}</h2>
                <span
                  className={`inline-block text-xs font-black px-2.5 py-0.5 rounded-full ${
                    merchant.isActive
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-red-100 text-red-900 border border-red-300"
                  }`}
                >
                  {merchant.isActive ? (isAr ? "🟢 نشط ومعتمد" : "Active") : (isAr ? "🔴 موقوف" : "Suspended")}
                </span>
                {isLowLiquidity && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300 animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    {isAr ? "⚠️ سيولة منخفضة (<15%)" : "Low Liquidity"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {merchant.city || (isAr ? "الرياض" : "Riyadh")}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {merchant.email}
                </span>
                {merchant.instapayAddress && (
                  <span className="flex items-center gap-1.5 font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ⚡ {merchant.instapayAddress}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs self-stretch lg:self-auto justify-around lg:justify-start">
            <div className="text-center">
              <span className="text-[10px] font-extrabold text-slate-400 block">{isAr ? "إجمالي الوصلات المرسلة" : "Sent Receipts"}</span>
              <span className="text-base font-black text-amber-700 font-mono">{totalReceiptsAmount.toLocaleString()} ج.م</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] font-extrabold text-slate-400 block">{isAr ? "عدد المستفيدين المخدومين" : "Served Beneficiaries"}</span>
              <span className="text-base font-black text-emerald-800 font-mono">{redemptions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Primary 4 Financial KPIs ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Allocated Budget */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "إجمالي الميزانية المخصصة" : "Allocated Budget"}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0A734D] flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {allocatedBudget.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{isAr ? "ج.م" : "EGP"}</span>
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-1 block">
            {isAr ? `عبر ${allocations.length} حركات تغذية` : `${allocations.length} allocations`}
          </span>
        </div>

        {/* Total Disbursed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "إجمالي المنصرف للمستفيدين" : "Disbursed to Beneficiaries"}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-900 font-mono">
            {totalDisbursed.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{isAr ? "ج.م" : "EGP"}</span>
          </p>
          <span className="text-[11px] font-bold text-blue-700 mt-1 block">
            {isAr ? `نسبة الصرف: ${spentPct}%` : `${spentPct}% spent`}
          </span>
        </div>

        {/* Remaining Liquidity */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "السيولة المتبقية بعهدة الصراف" : "Remaining Liquidity"}</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black font-mono ${isLowLiquidity ? "text-red-600" : "text-[#0A734D]"}`}>
            {remainingLiquidity.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{isAr ? "ج.م" : "EGP"}</span>
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-1 block">
            {isAr ? `المتبقي: ${remPct}% من الميزانية` : `${remPct}% remaining`}
          </span>
        </div>

        {/* Transactions Count */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "إجمالي عمليات الصرف" : "Total Redemptions"}</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {redemptions.length} <span className="text-xs text-slate-500 font-sans">{isAr ? "عملية" : "txns"}</span>
          </p>
          <span className="text-[11px] font-bold text-emerald-700 mt-1 block">
            {isAr ? "عمليات موثقة رقمياً" : "Verified ledger"}
          </span>
        </div>
      </div>

      {/* ── 3. Interactive Tabs Section ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab("redemptions")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "redemptions"
                ? "bg-white text-[#0A734D] shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isAr ? "سجل الصرف للمستفيدين" : "Redemptions Ledger"}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              {redemptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("allocations")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "allocations"
                ? "bg-white text-[#0A734D] shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{isAr ? "سجل حركات الميزانية والتغذية" : "Budget Allocations"}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono">
              {allocations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("receipts")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "receipts"
                ? "bg-white text-[#0A734D] shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isAr ? "وصولات الدفع وإيصالات التحويل" : "Payment Receipts"}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono">
              {receipts.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Redemptions Ledger */}
        {activeTab === "redemptions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-800 text-start">
              <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ والوقت" : "Date"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "رقم الكارت" : "Card ID"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "اسم المستفيد" : "Beneficiary"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "المبلغ المخصوم" : "Amount"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "السلال المخصومة" : "Baskets"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "الرصيد المتبقي بالكارت" : "Card Balance After"}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{isAr ? "ملف المستفيد" : "Profile"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد عمليات صرف مسجلة لهذا المنفذ بعد" : "No redemptions recorded yet"}
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {parseDate(r.timestamp).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200">
                          {r.cardId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-black text-slate-900">
                        {r.beneficiaryName || "مستفيد"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-emerald-800 text-sm">
                        {(r.amountDeducted || r.amount || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-amber-800">
                        {r.foodBasketsDeducted || 0} {isAr ? "سلة" : "baskets"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-500">
                        {r.remainingBalance !== undefined ? `${r.remainingBalance.toLocaleString()} ج.م` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/dashboard/beneficiaries/${r.cardId}`}
                          className="btn btn-sm bg-emerald-50 text-[#0A734D] hover:bg-emerald-100 font-bold text-xs py-1 px-2.5 rounded-lg border border-emerald-200"
                        >
                          عرض الملف ↗
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Budget Allocations */}
        {activeTab === "allocations" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-800 text-start">
              <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "رقم الإيداع" : "Allocation ID"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ والوقت" : "Date"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "المبلغ المضاف" : "Amount Added"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "نوع الحركة" : "Type"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "المشرف المعتمد" : "Approved By"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد حركات تغذية ميزانية مسجلة حتى الآن" : "No budget allocations recorded"}
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs font-black text-slate-900">
                        {a.allocationId || a.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {parseDate(a.timestamp).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-emerald-800 text-sm">
                        +{(a.amount || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {a.type === "recharge" ? "تغذية دورية" : a.type === "initial" ? "ابتدائية" : "تسوية"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-bold text-slate-700">
                        {a.allocatedBy?.adminName || "مشرف الإدارة"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {a.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Payment Receipts */}
        {activeTab === "receipts" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-800 text-start">
              <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "رقم الوصل" : "Receipt ID"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "طريقة الدفع" : "Method"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "الرقم المرجعي" : "Ref Number"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "حالة الاستلام" : "Status"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "صورة الإيصال" : "Image"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد وصولات دفع مرسلة لهذا المنفذ بعد" : "No payment receipts found"}
                    </td>
                  </tr>
                ) : (
                  receipts.map((rc) => (
                    <tr key={rc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs font-black text-slate-900">
                        {rc.receiptId || rc.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {parseDate(rc.timestamp).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-amber-900 text-sm">
                        {(rc.amount || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {rc.paymentMethod === "instapay"
                            ? "⚡ إنستا باي"
                            : rc.paymentMethod === "vodafone_cash"
                            ? "📱 فودافون كاش"
                            : "🏛️ تحويل بنكي"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-700 font-bold">
                        {rc.referenceNumber}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                            rc.status === "confirmed_by_merchant"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-blue-100 text-blue-900 border border-blue-300"
                          }`}
                        >
                          {rc.status === "confirmed_by_merchant" ? (isAr ? "تم التأكيد ✅" : "Confirmed") : (isAr ? "تم الإرسال 📤" : "Sent")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        {rc.receiptImageUrl ? (
                          <a
                            href={rc.receiptImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <span>معاينة</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Allocate Budget ───────────────────────────────── */}
      {showAllocModal && mounted && merchant && createPortal(
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
                <h3 className="text-lg font-black text-slate-950">
                  {isAr ? "تخصيص وتغذية ميزانية الصراف" : "Allocate Merchant Budget"}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  منفذ: {merchant.storeName || merchant.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "المبلغ المالي المراد إضافته (ج.م):" : "Allocation Amount (EGP):"}
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
                  placeholder={isAr ? "اكتب أي تفاصيل إضافية..." : "Notes..."}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={allocating || allocAmount <= 0}
                  className="btn bg-[#0A734D] hover:bg-[#085E3E] text-white flex-1 justify-center font-black py-3 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {allocating ? "جاري الحفظ..." : isAr ? "اعتماد وتغذية الميزانية" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllocModal(false)}
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

      {/* ── MODAL: Send Payment Receipt ──────────────────────────── */}
      {showReceiptModal && mounted && merchant && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowReceiptModal(false)}
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
                  منفذ: {merchant.storeName || merchant.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendReceipt} className="space-y-4">
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
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base font-black font-mono text-amber-900 focus:bg-white focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "الرقم المرجعي للحوالة:" : "Reference Number:"}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رقم محفظة أو حساب الصراف المستلم:" : "Receiver Account / Wallet:"}
                </label>
                <input
                  type="text"
                  value={receiverAccount}
                  onChange={(e) => setReceiverAccount(e.target.value)}
                  placeholder="01012345678 أو username@instapay"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رابط صورة الإيصال (اختياري):" : "Receipt Image URL:"}
                </label>
                <input
                  type="url"
                  value={receiptImageUrl}
                  onChange={(e) => setReceiptImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sendingReceipt || receiptAmount <= 0}
                  className="btn bg-amber-500 hover:bg-amber-600 text-white flex-1 justify-center font-black py-3 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {sendingReceipt ? "جاري الإرسال..." : isAr ? "إرسال وتوثيق الوصل" : "Send Receipt"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
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
