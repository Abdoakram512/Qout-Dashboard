"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Edit3 } from "lucide-react";
import { UserModel } from "@/types";

interface EditMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: UserModel | null;
  editStoreName: string;
  setEditStoreName: (val: string) => void;
  editName: string;
  setEditName: (val: string) => void;
  editPhone: string;
  setEditPhone: (val: string) => void;
  editEmail: string;
  setEditEmail: (val: string) => void;
  editCity: string;
  setEditCity: (val: string) => void;
  editInstapay: string;
  setEditInstapay: (val: string) => void;
  editVodafoneCash: string;
  setEditVodafoneCash: (val: string) => void;
  editCr: string;
  setEditCr: (val: string) => void;
  editIsActive: boolean;
  setEditIsActive: (val: boolean) => void;
  savingMerchant: boolean;
  onSave: () => void;
  isAr: boolean;
}

export const EditMerchantModal: React.FC<EditMerchantModalProps> = ({
  isOpen,
  onClose,
  merchant,
  editStoreName,
  setEditStoreName,
  editName,
  setEditName,
  editPhone,
  setEditPhone,
  editEmail,
  setEditEmail,
  editCity,
  setEditCity,
  editInstapay,
  setEditInstapay,
  editVodafoneCash,
  setEditVodafoneCash,
  editCr,
  setEditCr,
  editIsActive,
  setEditIsActive,
  savingMerchant,
  onSave,
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
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20 flex-shrink-0">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {isAr ? "تعديل بيانات المنفذ المعتمد" : "Edit Merchant Details"}
            </h3>
            <p className="text-xs font-bold text-blue-600">
              {merchant.storeName || merchant.name}
            </p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs font-bold">
          <div>
            <label className="block text-slate-700 mb-1">{isAr ? "اسم المتجر / المنفذ" : "Store Name"}</label>
            <input
              type="text"
              value={editStoreName}
              onChange={(e) => setEditStoreName(e.target.value)}
              className="qout-input"
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1">{isAr ? "اسم المسؤول / التاجر" : "Contact Person Name"}</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="qout-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 mb-1">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <input
                type="text"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 mb-1">{isAr ? "المدينة / المحافظة" : "City / Region"}</label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                className="qout-input"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">{isAr ? "السجل التجاري" : "Commercial Reg"}</label>
              <input
                type="text"
                value={editCr}
                onChange={(e) => setEditCr(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 mb-1">{isAr ? "عنوان إنستاباي (InstaPay)" : "InstaPay Address"}</label>
              <input
                type="text"
                value={editInstapay}
                onChange={(e) => setEditInstapay(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">{isAr ? "رقم فودافون كاش" : "Vodafone Cash Number"}</label>
              <input
                type="text"
                value={editVodafoneCash}
                onChange={(e) => setEditVodafoneCash(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1">{isAr ? "حالة الحساب" : "Account Status"}</label>
            <select
              value={editIsActive ? "active" : "suspended"}
              onChange={(e) => setEditIsActive(e.target.value === "active")}
              className="qout-select font-bold"
            >
              <option value="active">{isAr ? "نشط ومفعل (Active)" : "Active"}</option>
              <option value="suspended">{isAr ? "موقوف مؤقتاً (Suspended)" : "Suspended"}</option>
            </select>
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
              disabled={savingMerchant}
              onClick={onSave}
              className="btn btn-primary px-6"
            >
              {savingMerchant ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
