"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Coins, Gift, Loader2, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

interface MonthlyCycleRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCardsCount: number;
  currentCycle: string;
  cycleDisplayArabic: string;
  cycleDisplayEnglish: string;
  recharging: boolean;
  onConfirm: () => void;
  isAr: boolean;
}

export const MonthlyCycleRechargeModal: React.FC<MonthlyCycleRechargeModalProps> = ({
  isOpen,
  onClose,
  activeCardsCount,
  currentCycle,
  cycleDisplayArabic,
  cycleDisplayEnglish,
  recharging,
  onConfirm,
  isAr,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  const totalCashDeposit = activeCardsCount * 30;
  const totalBaskets = activeCardsCount * 1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-800 to-[#0A734D] text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-200 border border-white/20 shadow-inner">
              <Sparkles className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">
                {isAr ? "إيداع الحصة الشهرية الدورية" : "Deposit Monthly Cycle Quota"}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {isAr ? "منظومة الدعم الموحدة - مؤسسة الفجر" : "Unified Aid System - Al-Fajr Foundation"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={recharging}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Cycle & Eligibility Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? "دورة الصرف:" : "Disbursement Cycle:"}</span>
              </div>
              <p className="font-black text-slate-800 text-sm">
                {isAr ? cycleDisplayArabic : cycleDisplayEnglish}
              </p>
              <span className="text-[10px] text-slate-400 font-mono font-bold">{currentCycle}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? "الحالات المشمولة:" : "Beneficiaries:"}</span>
              </div>
              <p className="font-black text-emerald-700 text-base font-mono">
                {activeCardsCount}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {isAr ? "مستفيد نشط بالمنظومة" : "Active Aid Cards"}
              </span>
            </div>
          </div>

          {/* Deposit Breakdown Summary Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950 border-b border-emerald-200/60 pb-2.5">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                {isAr ? "الحصة النقدية المعتمدة لكل مستفيد:" : "Cash Quota per Beneficiary:"}
              </span>
              <span className="font-mono font-black text-sm text-emerald-800">+ 30.00 {isAr ? "ج.م" : "EGP"}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-emerald-950 border-b border-emerald-200/60 pb-2.5">
              <span className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-600" />
                {isAr ? "حصة السلال الغذائية لكل مستفيد:" : "Food Basket Quota:"}
              </span>
              <span className="font-mono font-black text-sm text-emerald-800">+ 1 {isAr ? "سلة" : "Basket"}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-slate-700">
              <span className="font-bold">{isAr ? "إجمالي السيولة المودعة:" : "Total Cash Deposit:"}</span>
              <span className="font-mono font-black text-sm text-slate-900">
                {totalCashDeposit.toLocaleString("en-US")} {isAr ? "ج.م" : "EGP"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-bold">{isAr ? "إجمالي السلال المودعة:" : "Total Baskets Deposit:"}</span>
              <span className="font-mono font-black text-sm text-slate-900">
                {totalBaskets.toLocaleString("en-US")} {isAr ? "سلة" : "Baskets"}
              </span>
            </div>
          </div>

          {/* Rollover Rule Alert */}
          <div className="flex items-start gap-2.5 bg-amber-50/80 border border-amber-200/70 p-3 rounded-xl text-amber-900 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              {isAr 
                ? "تلقائياً: يتم ترحيل أي فائض متبقي لدى المستفيد من الشهر السابق وإضافة الحصة الجديدة (30 ج.م + سلة) عليه دون أي اقتطاع."
                : "Automated: Leftover funds from previous cycles are preserved and accumulated with the newly deposited quota."}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={recharging}
            className="btn btn-sm btn-ghost text-slate-600 hover:bg-slate-200/60 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={recharging || activeCardsCount === 0}
            className="btn btn-sm bg-[#0A734D] hover:bg-[#063A28] text-white shadow-md rounded-xl px-5 py-2.5 text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {recharging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? "جاري الإيداع السحابي..." : "Depositing Quota..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? "تأكيد إيداع الحصة لكافة المستفيدين" : "Confirm Monthly Deposit"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
