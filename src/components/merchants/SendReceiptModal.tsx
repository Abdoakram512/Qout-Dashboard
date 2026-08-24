"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Send, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { UserModel } from "@/types";

interface SendReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: UserModel | null;
  receiptAmount: number;
  setReceiptAmount: (val: number) => void;
  paymentMethod: "instapay" | "vodafone_cash" | "bank_transfer" | "cash";
  onMethodChange: (method: "instapay" | "vodafone_cash" | "bank_transfer" | "cash") => void;
  referenceNumber: string;
  setReferenceNumber: (val: string) => void;
  senderAccount: string;
  setSenderAccount: (val: string) => void;
  receiverAccount: string;
  setReceiverAccount: (val: string) => void;
  receiptImageUrl: string;
  setReceiptImageUrl: (val: string) => void;
  receiptNotes: string;
  setReceiptNotes: (val: string) => void;
  sendingReceipt: boolean;
  uploadingImg: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isAr: boolean;
}

export const SendReceiptModal: React.FC<SendReceiptModalProps> = ({
  isOpen,
  onClose,
  merchant,
  receiptAmount,
  setReceiptAmount,
  paymentMethod,
  onMethodChange,
  referenceNumber,
  setReferenceNumber,
  senderAccount,
  setSenderAccount,
  receiverAccount,
  setReceiverAccount,
  receiptImageUrl,
  setReceiptImageUrl,
  receiptNotes,
  setReceiptNotes,
  sendingReceipt,
  uploadingImg,
  onImageUpload,
  onSend,
  isAr,
}) => {
  if (!isOpen || !merchant || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200/80 relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A734D] to-[#10875C] text-white flex items-center justify-center shadow-lg shadow-emerald-900/20 flex-shrink-0">
            <Send className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {isAr ? "إرسال إشعار وإيصال تحويل للصراف" : "Send Transfer Receipt to Merchant"}
            </h3>
            <p className="text-xs font-bold text-[#0A734D] mt-0.5">
              {merchant.storeName || merchant.name} {merchant.phone ? `(${merchant.phone})` : ""}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs font-bold">
          {/* Amount Field */}
          <div>
            <label className="block text-slate-700 mb-1.5">
              {isAr ? "مبلغ الحوالة المحول (ج.م)" : "Transferred Amount (EGP)"}
            </label>
            <input
              type="number"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(Number(e.target.value))}
              className="qout-input font-mono font-black text-base text-emerald-800 focus:border-[#0A734D]"
              min={1}
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-slate-700 mb-1.5">
              {isAr ? "طريقة التحويل" : "Payment Method"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "instapay", label: isAr ? "إنستاباي (InstaPay)" : "InstaPay" },
                { id: "vodafone_cash", label: isAr ? "محفظة إلكترونية (E-Wallet)" : "E-Wallet" },
                { id: "bank_transfer", label: isAr ? "تحويل بنكي (Bank Transfer)" : "Bank Transfer" },
                { id: "cash", label: isAr ? "تسليم نقدي (Cash)" : "Cash Handover" },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onMethodChange(m.id as any)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-gradient-to-r from-[#0A734D] to-[#0E8B5E] text-white border-[#0A734D] shadow-md shadow-emerald-900/15"
                        : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-emerald-50/40 hover:border-emerald-200 hover:text-emerald-900"
                    }`}
                  >
                    <span>{m.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Code */}
          <div>
            <label className="block text-slate-700 mb-1.5">
              {isAr ? "رقم المرجع / العملية (Reference)" : "Reference Code"}
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="qout-input font-mono font-bold text-slate-900 focus:border-[#0A734D]"
              placeholder="INSTA-XXXXX"
            />
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-700 mb-1.5">
                {isAr ? "حساب المحول (الجمعية)" : "Sender Account"}
              </label>
              <input
                type="text"
                value={senderAccount}
                onChange={(e) => setSenderAccount(e.target.value)}
                className="qout-input text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5">
                {isAr ? "حساب المستلم (الصراف)" : "Receiver Account"}
              </label>
              <input
                type="text"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                className="qout-input text-xs"
              />
            </div>
          </div>

          {/* Screenshot Upload Dropzone */}
          <div>
            <label className="block text-slate-700 mb-1.5">
              {isAr ? "صورة إيصال التحويل (اختياري)" : "Receipt Screenshot (Optional)"}
            </label>
            {receiptImageUrl ? (
              <div className="relative border-2 border-emerald-500 rounded-2xl p-2.5 bg-emerald-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={receiptImageUrl}
                    alt="Receipt"
                    className="w-14 h-14 object-cover rounded-xl shadow-sm border border-emerald-200"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-emerald-900 font-black">
                      {isAr ? "تم إرفاق صورة الإيصال بنجاح" : "Receipt image attached"}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {isAr ? "اضغط على × للحذف أو تغيير الصورة" : "Click × to remove"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptImageUrl("")}
                  className="p-1.5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-emerald-200/80 hover:border-[#0A734D] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-emerald-50/20 hover:bg-emerald-50/50 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white text-[#0A734D] group-hover:scale-105 shadow-sm border border-emerald-100 flex items-center justify-center transition-transform">
                  <ImageIcon className="w-5 h-5 text-[#0A734D]" />
                </div>
                <span className="text-xs text-slate-700 font-bold group-hover:text-[#0A734D] transition-colors">
                  {uploadingImg
                    ? (isAr ? "جاري رفع الصورة..." : "Uploading image...")
                    : (isAr ? "اضغط لرفع لقطة شاشة التحويل (إيصال البنك أو المحفظة)" : "Upload Transfer Screenshot")}
                </span>
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 mb-1.5">
              {isAr ? "ملاحظات إضافية للصراف" : "Notes to Merchant"}
            </label>
            <textarea
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              rows={2}
              className="qout-input text-xs"
              placeholder={isAr ? "أي تعليمات أو تفاصيل إضافية..." : "Any additional info..."}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-5 py-2.5 font-bold"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={sendingReceipt || receiptAmount <= 0}
              onClick={onSend}
              className="btn btn-primary px-6 py-2.5 font-black flex items-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <Send className="w-4 h-4 text-amber-300" />
              <span>
                {sendingReceipt
                  ? (isAr ? "جاري الإرسال..." : "Sending...")
                  : (isAr ? "إرسال الإشعار للصراف" : "Send Receipt")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
