"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Wallet } from "lucide-react";
import { UserModel } from "@/types";

interface AllocateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: UserModel | null;
  allocAmount: number;
  setAllocAmount: (val: number) => void;
  allocType: "recharge" | "initial" | "adjustment";
  setAllocType: (val: "recharge" | "initial" | "adjustment") => void;
  allocNotes: string;
  setAllocNotes: (val: string) => void;
  allocating: boolean;
  onConfirm: () => void;
  isAr: boolean;
}

export const AllocateBudgetModal: React.FC<AllocateBudgetModalProps> = ({
  isOpen,
  onClose,
  merchant,
  allocAmount,
  setAllocAmount,
  allocType,
  setAllocType,
  allocNotes,
  setAllocNotes,
  allocating,
  onConfirm,
  isAr,
}) => {
  if (!isOpen || !merchant || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
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
              onClick={onClose}
              className="btn btn-secondary px-5"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={allocating || allocAmount <= 0}
              onClick={onConfirm}
              className="btn btn-primary px-6"
            >
              {allocating ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "تأكيد إضافة الرصيد" : "Confirm Allocation")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
