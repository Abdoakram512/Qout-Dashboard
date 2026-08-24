"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  PackageCheck,
  Store,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Lock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { AidCardModel, RedemptionTransaction, BasketDistribution } from "@/types";

interface BeneficiaryMonthlyMatrixProps {
  card: AidCardModel;
  cashTxns: RedemptionTransaction[];
  basketDists: BasketDistribution[];
  isAr: boolean;
}

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

const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const BeneficiaryMonthlyMatrix: React.FC<BeneficiaryMonthlyMatrixProps> = ({
  card,
  cashTxns,
  basketDists,
  isAr,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0 to 11

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<number | null>(null);

  // Expected monthly allowance estimate (default 600 EGP or balance based)
  const estimatedMonthlyCash = 600;
  const estimatedMonthlyBaskets = 2;

  // Process 12 Months Matrix
  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      // 1. Filter cash redemptions for this month & year
      const txnsInMonth = cashTxns.filter((tx) => {
        const d = parseDate(tx.timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });

      // 2. Filter basket distributions for this month & year
      const basketsInMonth = basketDists.filter((bd) => {
        const d = parseDate(bd.timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });

      const totalCashSpent = txnsInMonth.reduce((sum, tx) => sum + (tx.amountDeducted || 0), 0);
      const totalBasketsDeducted =
        basketsInMonth.reduce((sum, bd) => sum + (bd.basketsCount || 0), 0) +
        txnsInMonth.reduce((sum, tx) => sum + (tx.foodBasketsDeducted || 0), 0);

      // Latest transaction merchant & date
      const latestTx = txnsInMonth[0];
      const latestDist = basketsInMonth[0];
      const merchantName = latestTx?.merchantStoreName || latestDist?.distributionCenter || null;
      const latestDate = latestTx ? parseDate(latestTx.timestamp) : (latestDist ? parseDate(latestDist.timestamp) : null);

      // Status Calculation
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && monthIdx < currentMonthIdx);
      const isCurrent = selectedYear === currentYear && monthIdx === currentMonthIdx;
      const isFuture = selectedYear > currentYear || (selectedYear === currentYear && monthIdx > currentMonthIdx);

      let status: "disbursed" | "partial" | "available" | "upcoming" | "unclaimed";
      let statusLabel: string;
      let badgeClass: string;

      if (isFuture) {
        status = "upcoming";
        statusLabel = isAr ? "مستحق قادم" : "Upcoming";
        badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
      } else if (isCurrent) {
        if (totalCashSpent > 0 || totalBasketsDeducted > 0) {
          if (totalCashSpent >= estimatedMonthlyCash || totalBasketsDeducted >= estimatedMonthlyBaskets) {
            status = "disbursed";
            statusLabel = isAr ? "تم الصرف بالكامل" : "Fully Disbursed";
            badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
          } else {
            status = "partial";
            statusLabel = isAr ? "صرف جزئي" : "Partial";
            badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
          }
        } else {
          status = "available";
          statusLabel = isAr ? "متاح للصرف الآن" : "Available Now";
          badgeClass = "bg-blue-100 text-blue-800 border-blue-300 animate-pulse";
        }
      } else {
        // Past Month
        if (totalCashSpent > 0 || totalBasketsDeducted > 0) {
          if (totalCashSpent >= estimatedMonthlyCash || totalBasketsDeducted >= estimatedMonthlyBaskets) {
            status = "disbursed";
            statusLabel = isAr ? "تم الصرف" : "Disbursed";
            badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
          } else {
            status = "partial";
            statusLabel = isAr ? "صرف جزئي" : "Partial";
            badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
          }
        } else {
          status = "unclaimed";
          statusLabel = isAr ? "لم يُصرف" : "Unclaimed";
          badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
        }
      }

      return {
        monthIdx,
        monthName: isAr ? MONTH_NAMES_AR[monthIdx] : MONTH_NAMES_EN[monthIdx],
        totalCashSpent,
        totalBasketsDeducted,
        txnsCount: txnsInMonth.length + basketsInMonth.length,
        txnsList: txnsInMonth,
        basketsList: basketsInMonth,
        merchantName,
        latestDate,
        status,
        statusLabel,
        badgeClass,
        isCurrent,
      };
    });
  }, [cashTxns, basketDists, selectedYear, currentYear, currentMonthIdx, isAr]);

  // Year Aggregate Totals
  const yearTotalSpent = useMemo(() => {
    return monthsData.reduce((sum, m) => sum + m.totalCashSpent, 0);
  }, [monthsData]);

  const yearTotalBaskets = useMemo(() => {
    return monthsData.reduce((sum, m) => sum + m.totalBasketsDeducted, 0);
  }, [monthsData]);

  const disbursedMonthsCount = useMemo(() => {
    return monthsData.filter((m) => m.status === "disbursed" || m.status === "partial").length;
  }, [monthsData]);

  return (
    <div className="qout-card p-6 bg-white border border-slate-200 shadow-xs space-y-6">
      {/* ── Section Header & Year Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0A734D] to-[#10875C] text-white flex items-center justify-center shadow-md shadow-emerald-900/20 flex-shrink-0">
            <Calendar className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>{isAr ? "مصفوفة الاستحقاق والصرف الشهري (12 شهراً)" : "12-Month Entitlement & Disbursement Matrix"}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#0A734D] font-mono font-bold text-xs border border-emerald-200">
                {selectedYear}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-bold">
              {isAr
                ? "تتبع تفصيلي لحالة الصرف لكل شهر من شهور العام وتاريخ المنفذ والحصص المستلمة"
                : "Detailed month-by-month aid disbursement status, merchants, and quota history"}
            </p>
          </div>
        </div>

        {/* Year Toggle */}
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                selectedYear === yr
                  ? "bg-[#0A734D] text-white border-[#0A734D] shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* ── Annual Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Year Disbursed Cash */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
          <span className="text-[11px] font-bold text-emerald-800 block mb-1">
            {isAr ? "إجمالي المنصرف النقدي" : "Total Cash Disbursed"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-[#0A734D]">
              {yearTotalSpent.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-700">{isAr ? "ج.م" : "EGP"}</span>
          </div>
        </div>

        {/* KPI 2: Year Food Baskets */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
          <span className="text-[11px] font-bold text-amber-800 block mb-1">
            {isAr ? "إجمالي السلال المستلمة" : "Total Baskets Handed"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-amber-700">
              {yearTotalBaskets}
            </span>
            <span className="text-[10px] font-bold text-amber-700">{isAr ? "سلة غذائية" : "baskets"}</span>
          </div>
        </div>

        {/* KPI 3: Current Available Balance */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80">
          <span className="text-[11px] font-bold text-blue-800 block mb-1">
            {isAr ? "رصيد الكارت المتاح حالياً" : "Current Card Balance"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-blue-700">
              {(card.totalBalance || card.balance || 0).toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-blue-700">{isAr ? "ج.م" : "EGP"}</span>
          </div>
        </div>

        {/* KPI 4: Disbursed Months Count */}
        <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80">
          <span className="text-[11px] font-bold text-purple-800 block mb-1">
            {isAr ? "الشهور المنصرفة" : "Disbursed Months"}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-purple-700">
              {disbursedMonthsCount} / 12
            </span>
            <span className="text-[10px] font-bold text-purple-700">{isAr ? "شهراً" : "months"}</span>
          </div>
        </div>
      </div>

      {/* ── 12-Month Visual Matrix Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {monthsData.map((m) => (
          <div
            key={m.monthIdx}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              m.isCurrent
                ? "bg-gradient-to-b from-emerald-50/40 to-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                : m.status === "disbursed"
                ? "bg-emerald-50/20 border-emerald-200/70 hover:border-emerald-300"
                : m.status === "partial"
                ? "bg-amber-50/20 border-amber-200/70 hover:border-amber-300"
                : m.status === "upcoming"
                ? "bg-slate-50/60 border-slate-200/60 opacity-80"
                : "bg-rose-50/20 border-rose-200/70"
            }`}
          >
            <div>
              {/* Card Header: Month Name + Status Badge */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-sm">{m.monthName}</span>
                  {m.isCurrent && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-emerald-600 text-white">
                      {isAr ? "الشهر الحالي" : "Current"}
                    </span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${m.badgeClass}`}>
                  {m.statusLabel}
                </span>
              </div>

              {/* Disbursement Amounts */}
              <div className="space-y-1.5 my-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-bold">{isAr ? "المصروف النقدي:" : "Cash Spent:"}</span>
                  <span className="font-mono font-black text-slate-900">
                    {m.totalCashSpent > 0 ? (
                      <span className="text-[#0A734D]">
                        {m.totalCashSpent.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </span>
                    ) : (
                      <span className="text-slate-400">0 {isAr ? "ج.م" : "EGP"}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-bold">{isAr ? "السلال المستلمة:" : "Food Baskets:"}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {m.totalBasketsDeducted > 0 ? (
                      <span className="text-amber-700 font-black">
                        {m.totalBasketsDeducted} {isAr ? "سلة" : "baskets"}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Merchant / Outlet & Date Info */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
              {m.merchantName ? (
                <div className="flex items-center gap-1 truncate max-w-[170px]" title={m.merchantName}>
                  <Store className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                  <span className="truncate text-slate-800">{m.merchantName}</span>
                </div>
              ) : (
                <span className="text-slate-400">
                  {m.status === "upcoming" ? (isAr ? "حصة مبرمجة" : "Projected") : (isAr ? "لم يتم الصرف" : "No outlet")}
                </span>
              )}

              {m.latestDate ? (
                <span className="font-mono text-slate-400">
                  {m.latestDate.toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "numeric", day: "numeric" })}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
