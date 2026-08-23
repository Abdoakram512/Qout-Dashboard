"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { AidCardModel } from "@/types";

interface BeneficiaryQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: AidCardModel | null;
  isAr: boolean;
}

export const BeneficiaryQrModal: React.FC<BeneficiaryQrModalProps> = ({
  isOpen,
  onClose,
  card,
  isAr,
}) => {
  if (!isOpen || !card || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border-2 border-slate-200 text-center relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0A734D] flex items-center justify-center mx-auto mb-3 border border-emerald-200">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-black text-slate-900">{card.beneficiaryName || "مستفيد معتمد"}</h3>
        <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">{card.cardId}</p>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block my-4">
          <QRCodeCanvas
            value={card.cardId}
            size={180}
            level="H"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-slate-500 font-bold mb-4 leading-relaxed">
          {isAr ? "امسح الرمز من خلال تطبيق الصراف للتحقق وصرف المساعدات" : "Scan QR code via Merchant App"}
        </p>

        <button
          onClick={onClose}
          className="btn btn-secondary w-full justify-center text-xs font-bold"
        >
          {isAr ? "إغلاق" : "Close"}
        </button>
      </div>
    </div>,
    document.body
  );
};
