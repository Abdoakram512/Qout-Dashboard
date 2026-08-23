"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, PackageCheck, CreditCard, Minus, Plus } from "lucide-react";
import { AidCardModel } from "@/types";

interface DistributeBasketModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: AidCardModel | null;
  distributeCount: number;
  setDistributeCount: React.Dispatch<React.SetStateAction<number>>;
  distributionCenter: string;
  setDistributionCenter: (val: string) => void;
  distributeNotes: string;
  setDistributeNotes: (val: string) => void;
  distributing: boolean;
  onConfirm: () => void;
  formatId: (id?: string) => string;
  isAr: boolean;
}

export const DistributeBasketModal: React.FC<DistributeBasketModalProps> = ({
  isOpen,
  onClose,
  card,
  distributeCount,
  setDistributeCount,
  distributionCenter,
  setDistributionCenter,
  distributeNotes,
  setDistributeNotes,
  distributing,
  onConfirm,
  formatId,
  isAr,
}) => {
  if (!isOpen || !card || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-900/20 flex-shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isAr ? "تسليم سلال غذائية (صرف إداري)" : "Handover Food Baskets"}
              </h3>
              <p className="text-xs font-bold text-amber-700">
                {card.beneficiaryName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4 text-xs font-bold">
          {/* Beneficiary Badge Card */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 font-mono text-emerald-800 font-black">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>{card.cardId}</span>
              </div>
              <div className="font-mono text-slate-600">
                {isAr ? "الهوية:" : "ID:"} {formatId(card.nationalId)}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-600">{isAr ? "الحصة المتاحة حالياً:" : "Available Quota:"}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-black text-xs font-mono border border-amber-300">
                {card.foodBasketsQuota || 0} {isAr ? "سلة" : "baskets"}
              </span>
            </div>
          </div>

          {/* Stepper / Count Selector */}
          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "عدد السلال المراد تسليمها" : "Quantity"}</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 2, 5].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setDistributeCount(qty)}
                  className={`py-2 px-1 rounded-xl border text-xs font-black ${
                    distributeCount === qty
                      ? "bg-[#0A734D] text-white border-[#0A734D]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {qty} {isAr ? "سلة" : "bsk"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDistributeCount(card.foodBasketsQuota || 1)}
                className="py-2 px-1 rounded-xl border text-xs font-black bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
              >
                {isAr ? "الكل" : "All"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <button
                type="button"
                onClick={() => setDistributeCount((c) => Math.max(1, c - 1))}
                disabled={distributeCount <= 1}
                className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-black disabled:opacity-30 shadow-xs"
              >
                <Minus className="w-4 h-4 text-slate-700" />
              </button>
              <div className="flex items-center justify-center gap-2 bg-white border border-slate-300 rounded-xl px-4 py-1.5 min-w-[120px]">
                <input
                  type="number"
                  min={1}
                  value={distributeCount}
                  onChange={(e) => setDistributeCount(Number(e.target.value) || 1)}
                  className="w-16 text-center font-black text-xl text-slate-950 font-mono focus:outline-none bg-transparent p-0"
                />
                <span className="text-xs font-bold text-slate-600">{isAr ? "سلة" : "baskets"}</span>
              </div>
              <button
                type="button"
                onClick={() => setDistributeCount((c) => c + 1)}
                className="w-10 h-10 rounded-xl bg-[#0A734D] text-white flex items-center justify-center font-black shadow-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Distribution Center */}
          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "مركز / مقر التوزيع" : "Distribution Center"}</label>
            <input
              type="text"
              value={distributionCenter}
              onChange={(e) => setDistributionCenter(e.target.value)}
              className="qout-input"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "ملاحظات التسليم (اختياري)" : "Notes"}</label>
            <input
              type="text"
              value={distributeNotes}
              onChange={(e) => setDistributeNotes(e.target.value)}
              placeholder={isAr ? "ملاحظات السند..." : "Handover notes..."}
              className="qout-input"
            />
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t-2 border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary px-4 py-2.5 text-xs font-bold"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={distributing || distributeCount <= 0}
            onClick={onConfirm}
            className="btn btn-primary px-5 py-2.5 text-xs font-black flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4 text-amber-300" />
            <span>{distributing ? (isAr ? "جاري التسليم..." : "Delivering...") : (isAr ? "تأكيد تسليم السلال" : "Confirm Handover")}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
