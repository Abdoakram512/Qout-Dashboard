"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import { PaymentReceipt } from "@/types";
import {
  ReceiptText,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Eye,
  X,
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
} from "lucide-react";
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

function arabicMatch(target: string, queryText: string): boolean {
  if (!queryText.trim()) return true;
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/[ة]/g, "ه")
      .replace(/[ى]/g, "ي")
      .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
  return normalize(target).includes(normalize(queryText));
}

export default function PaymentReceiptsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Lightbox Image Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fetch Payment Receipts Realtime
  useEffect(() => {
    const q = query(
      collection(db, "payment_receipts"),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PaymentReceipt[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as PaymentReceipt);
        });
        list.sort(
          (a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime()
        );
        setReceipts(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch payment receipts:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter Logic with Multi-Date Ranges
  const filteredReceipts = useMemo(() => {
    const now = new Date();

    return receipts.filter((r) => {
      // 1. Search Query
      const matchesSearch =
        !search.trim() ||
        arabicMatch(r.merchantStoreName || "", search) ||
        arabicMatch(r.referenceNumber || "", search) ||
        arabicMatch(r.senderAccount || "", search) ||
        arabicMatch(r.receiverAccount || "", search) ||
        arabicMatch(r.notes || "", search);

      if (!matchesSearch) return false;

      // 2. Method Filter
      if (methodFilter !== "all" && r.paymentMethod !== methodFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter === "confirmed") {
        if (r.status !== "confirmed_by_merchant") return false;
      } else if (statusFilter === "pending") {
        if (r.status === "confirmed_by_merchant") return false;
      }

      // 4. Date Range Filter
      const rDate = parseDate(r.timestamp);
      if (dateRangeFilter === "month") {
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (rDate < thisMonthStart) return false;
      } else if (dateRangeFilter === "3months") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (rDate < threeMonthsAgo) return false;
      } else if (dateRangeFilter === "6months") {
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        if (rDate < sixMonthsAgo) return false;
      } else if (dateRangeFilter === "year") {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        if (rDate < yearStart) return false;
      } else if (dateRangeFilter === "custom") {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (rDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (rDate > end) return false;
        }
      }

      return true;
    });
  }, [receipts, search, methodFilter, statusFilter, dateRangeFilter, customStartDate, customEndDate]);

  // Aggregate Metrics
  const totalAmountTransferred = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredReceipts]);

  const totalAmountConfirmed = useMemo(() => {
    return filteredReceipts
      .filter((r) => r.status === "confirmed_by_merchant")
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredReceipts]);

  const totalAmountPending = useMemo(() => {
    return filteredReceipts
      .filter((r) => r.status !== "confirmed_by_merchant")
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredReceipts]);

  const getMethodBadge = (method?: string) => {
    switch (method) {
      case "instapay":
        return {
          label: isAr ? "إنستاباي (InstaPay)" : "InstaPay",
          className: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Smartphone,
        };
      case "vodafone_cash":
        return {
          label: isAr ? "محفظة إلكترونية (E-Wallet)" : "E-Wallet",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          icon: Smartphone,
        };
      case "bank_transfer":
        return {
          label: isAr ? "تحويل بنكي (Bank)" : "Bank Transfer",
          className: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Building2,
        };
      case "cash":
        return {
          label: isAr ? "تسليم نقدي (Cash)" : "Cash Handover",
          className: "bg-amber-50 text-amber-800 border-amber-300",
          icon: Banknote,
        };
      default:
        return {
          label: method || "—",
          className: "bg-slate-50 text-slate-700 border-slate-200",
          icon: CreditCard,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Transferred */}
        <div className="qout-card p-5 bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              {isAr ? "إجمالي الحوالات المرسلة" : "Total Transferred"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {totalAmountTransferred.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{isAr ? "ج.م" : "EGP"}</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 mt-2">
            {filteredReceipts.length} {isAr ? "إيصال محول" : "receipts"}
          </span>
        </div>

        {/* KPI 2: Confirmed by Merchant */}
        <div className="qout-card p-5 bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              {isAr ? "المبالغ المؤكدة من الصرافين" : "Confirmed by Merchants"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-700">
              {totalAmountConfirmed.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{isAr ? "ج.م" : "EGP"}</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 mt-2">
            {filteredReceipts.filter((r) => r.status === "confirmed_by_merchant").length} {isAr ? "إيصال تم تأكيده" : "confirmed"}
          </span>
        </div>

        {/* KPI 3: Pending Confirmation */}
        <div className="qout-card p-5 bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              {isAr ? "بانتظار تأكيد الاستلام" : "Pending Confirmation"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-700">
              {totalAmountPending.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{isAr ? "ج.م" : "EGP"}</span>
          </div>
          <span className="text-[11px] font-bold text-amber-600 mt-2">
            {filteredReceipts.filter((r) => r.status !== "confirmed_by_merchant").length} {isAr ? "بانتظار المراجعة" : "pending"}
          </span>
        </div>

        {/* KPI 4: Confirmation Rate */}
        <div className="qout-card p-5 bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              {isAr ? "نسبة التأكيد الميداني" : "Confirmation Rate"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {filteredReceipts.length > 0
                ? Math.round(
                    (filteredReceipts.filter((r) => r.status === "confirmed_by_merchant").length /
                      filteredReceipts.length) *
                      100
                  )
                : 100}
              %
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 mt-2">
            {isAr ? "معدل استجابة الصرافين" : "Merchant responsiveness"}
          </span>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="qout-card p-4 bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث بالصراف، المرجع، الحساب، الملاحظات..." : "Search merchant, reference, account..."}
              className="qout-input qout-input-with-icon text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="qout-select text-xs font-bold"
            >
              <option value="all">{isAr ? "كافة الحالات" : "All Statuses"}</option>
              <option value="confirmed">{isAr ? "✅ تم التأكيد فقط" : "Confirmed Only"}</option>
              <option value="pending">{isAr ? "⏳ بانتظار التأكيد" : "Pending Confirmation"}</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="qout-select text-xs font-bold"
            >
              <option value="all">{isAr ? "كافة الطرق" : "All Methods"}</option>
              <option value="instapay">{isAr ? "إنستاباي" : "InstaPay"}</option>
              <option value="vodafone_cash">{isAr ? "محفظة إلكترونية" : "E-Wallet"}</option>
              <option value="bank_transfer">{isAr ? "تحويل بنكي" : "Bank Transfer"}</option>
              <option value="cash">{isAr ? "تسليم نقدي" : "Cash"}</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="qout-select text-xs font-bold"
            >
              <option value="all">{isAr ? "كافة الفترات (All Time)" : "All Time"}</option>
              <option value="month">{isAr ? "هذا الشهر (This Month)" : "This Month"}</option>
              <option value="3months">{isAr ? "آخر 3 أشهر (90 يوماً)" : "Last 3 Months"}</option>
              <option value="6months">{isAr ? "آخر 6 أشهر (180 يوماً)" : "Last 6 Months"}</option>
              <option value="year">{isAr ? "هذا العام (Current Year)" : "Current Year"}</option>
              <option value="custom">{isAr ? "نطاق تاريخ مخصص..." : "Custom Date Range"}</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {dateRangeFilter === "custom" && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 flex-wrap animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{isAr ? "من تاريخ:" : "From:"}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="qout-input text-xs py-1.5 px-2.5 font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{isAr ? "إلى تاريخ:" : "To:"}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="qout-input text-xs py-1.5 px-2.5 font-mono"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="btn btn-sm btn-secondary text-xs"
              >
                {isAr ? "مسح التواريخ" : "Clear Dates"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Receipts Table ── */}
      <div className="qout-card bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <ReceiptText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-black text-slate-800 mb-1">
              {isAr ? "لا توجد وصولات تحويل مطابقة" : "No matching payment receipts"}
            </h4>
            <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
              {isAr
                ? "لم يتم العثور على أي وصولات مرسلة تطابق خيارات الفلترة المحددة."
                : "No sent receipts matched your current filter criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-black">
                  <th className="py-3 px-4 text-start">{isAr ? "التاريخ والوقت" : "Date & Time"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المنفذ / الصراف" : "Merchant / Store"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "طريقة التحويل" : "Method"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "رقم المرجع" : "Reference"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "المبلغ المحول" : "Amount"}</th>
                  <th className="py-3 px-4 text-center">{isAr ? "حالة التأكيد" : "Status"}</th>
                  <th className="py-3 px-4 text-center">{isAr ? "صورة الإيصال" : "Receipt Image"}</th>
                  <th className="py-3 px-4 text-start">{isAr ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((r) => {
                  const mBadge = getMethodBadge(r.paymentMethod);
                  const IconComp = mBadge.icon;
                  const isConfirmed = r.status === "confirmed_by_merchant";

                  return (
                    <tr key={r.receiptId || r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block font-mono text-[11px]">
                          {parseDate(r.timestamp).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {parseDate(r.timestamp).toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Merchant */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900 block">
                          {r.merchantStoreName || r.merchantName || "—"}
                        </span>
                        {r.receiverAccount && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {r.receiverAccount}
                          </span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black ${mBadge.className}`}
                        >
                          <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{mBadge.label}</span>
                        </span>
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="id-display font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {r.referenceNumber || r.receiptId || "—"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-sm text-[#0A734D]">
                          {(r.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ms-1">{isAr ? "ج.م" : "EGP"}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAr ? "تم التأكيد والاستلام" : "Confirmed"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isAr ? "بانتظار تأكيد الصراف" : "Pending"}</span>
                          </span>
                        )}
                      </td>

                      {/* Image Preview Thumbnail */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {r.receiptImageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(r.receiptImageUrl!)}
                            className="relative group inline-block rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-500 shadow-xs transition-all cursor-pointer"
                            title={isAr ? "اضغط لعرض الإيصال بالحجم الكامل" : "Click to view full image"}
                          >
                            <img
                              src={r.receiptImageUrl}
                              alt="Receipt"
                              className="w-10 h-10 object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">{isAr ? "بدون صورة" : "No image"}</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 text-[11px] font-semibold">
                        {r.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── LIGHTBOX: Full-Screen Image Viewer Modal ── */}
      {previewImageUrl && mounted && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center bg-white p-3 rounded-3xl shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -end-3 w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-slate-700 flex items-center justify-center shadow-lg transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Full Receipt"
              className="max-h-[82vh] w-auto object-contain rounded-2xl"
            />
            <div className="w-full pt-2.5 flex items-center justify-between text-xs px-2">
              <span className="font-bold text-slate-600">{isAr ? "صورة إيصال التحويل المعتمدة" : "Payment Transfer Receipt"}</span>
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isAr ? "فتح في نافذة جديدة" : "Open Original"}</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
