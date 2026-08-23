"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Send, Image as ImageIcon } from "lucide-react";
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
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
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
              {isAr ? "إرسال إشعار وإيصال تحويل للصراف" : "Send Transfer Receipt to Merchant"}
            </h3>
            <p className="text-xs font-bold text-amber-600">
              {merchant.storeName || merchant.name} ({merchant.phone || "بدون هاتف"})
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs font-bold">
          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "مبلغ الحوالة المحول (ج.م)" : "Transferred Amount (EGP)"}</label>
            <input
              type="number"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(Number(e.target.value))}
              className="qout-input font-mono font-black text-base text-emerald-700"
              min={1}
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "طريقة التحويل" : "Payment Method"}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "instapay", label: isAr ? "إنستاباي (InstaPay)" : "InstaPay" },
                { id: "vodafone_cash", label: isAr ? "فودافون كاش (VF Cash)" : "Vodafone Cash" },
                { id: "bank_transfer", label: isAr ? "تحويل بنكي (Bank)" : "Bank Transfer" },
                { id: "cash", label: isAr ? "تسليم نقدي (Cash)" : "Cash Handover" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onMethodChange(m.id as any)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all ${
                    paymentMethod === m.id
                      ? "bg-slate-900 text-amber-400 border-slate-900 shadow-md"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "رقم المرجع / العملية (Reference)" : "Reference Code"}</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="qout-input font-mono font-bold"
              placeholder="INSTA-XXXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "حساب المحول (الجمعية)" : "Sender Account"}</label>
              <input
                type="text"
                value={senderAccount}
                onChange={(e) => setSenderAccount(e.target.value)}
                className="qout-input text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "حساب المستلم (الصراف)" : "Receiver Account"}</label>
              <input
                type="text"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                className="qout-input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "صورة إيصال التحويل (اختياري)" : "Receipt Screenshot (Optional)"}</label>
            {receiptImageUrl ? (
              <div className="relative border-2 border-emerald-500 rounded-2xl p-2 bg-emerald-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={receiptImageUrl} alt="Receipt" className="w-14 h-14 object-cover rounded-xl shadow border border-slate-200" />
                  <span className="text-xs text-emerald-800 font-bold">{isAr ? "تم إرفاق صورة الإيصال بنجاح" : "Receipt image attached"}</span>
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
              <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100/80 transition-all">
                <ImageIcon className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-600 font-bold">{uploadingImg ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "اضغط لرفع لقطة شاشة التحويل" : "Upload Transfer Screenshot")}</span>
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "ملاحظات إضافية للصراف" : "Notes to Merchant"}</label>
            <textarea
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              rows={2}
              className="qout-input"
              placeholder={isAr ? "أي تعليمات أو تفاصيل إضافية..." : "Any additional info..."}
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
              disabled={sendingReceipt || receiptAmount <= 0}
              onClick={onSend}
              className="btn bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6"
            >
              {sendingReceipt ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الإشعار للصراف" : "Send Receipt")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
