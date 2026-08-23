"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Edit } from "lucide-react";
import { AidCardModel } from "@/types";

interface EditBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: AidCardModel | null;
  editName: string;
  setEditName: (val: string) => void;
  editNationalId: string;
  setEditNationalId: (val: string) => void;
  editPhone: string;
  setEditPhone: (val: string) => void;
  editNationality: string;
  setEditNationality: (val: string) => void;
  editSocialStatus: string;
  setEditSocialStatus: (val: string) => void;
  editFamilyCount: number;
  setEditFamilyCount: (val: number) => void;
  editResidence: string;
  setEditResidence: (val: string) => void;
  editBalance: number;
  setEditBalance: (val: number) => void;
  editQuota: number;
  setEditQuota: (val: number) => void;
  editStatus: string;
  setEditStatus: (val: string) => void;
  saving: boolean;
  onSave: () => void;
  isAr: boolean;
}

export const EditBeneficiaryModal: React.FC<EditBeneficiaryModalProps> = ({
  isOpen,
  onClose,
  card,
  editName,
  setEditName,
  editNationalId,
  setEditNationalId,
  editPhone,
  setEditPhone,
  editNationality,
  setEditNationality,
  editSocialStatus,
  setEditSocialStatus,
  editFamilyCount,
  setEditFamilyCount,
  editResidence,
  setEditResidence,
  editBalance,
  setEditBalance,
  editQuota,
  setEditQuota,
  editStatus,
  setEditStatus,
  saving,
  onSave,
  isAr,
}) => {
  if (!isOpen || !card || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 flex-shrink-0">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isAr ? "تعديل بيانات المستفيد والكارت" : "Edit Beneficiary & Card"}
              </h3>
              <p className="text-xs font-mono font-bold text-emerald-800">
                {card.cardId}
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
        <div className="overflow-y-auto pr-1 flex-1 space-y-3.5 text-xs font-bold">
          {/* Name */}
          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "اسم المستفيد الرباعي" : "Beneficiary Full Name"}</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="qout-input"
            />
          </div>

          {/* National ID & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "رقم الهوية الوطنية / الجواز" : "National ID / Passport"}</label>
              <input
                type="text"
                value={editNationalId}
                onChange={(e) => setEditNationalId(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "رقم الهاتف" : "Phone"}</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="qout-input font-mono"
              />
            </div>
          </div>

          {/* Nationality & Social Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "الجنسية" : "Nationality"}</label>
              <select
                value={editNationality}
                onChange={(e) => setEditNationality(e.target.value)}
                className="qout-select font-bold"
              >
                <option value="مصري">مصري</option>
                <option value="سوري">سوري</option>
                <option value="سوداني">سوداني</option>
                <option value="يمني">يمني</option>
                <option value="فلسطيني">فلسطيني</option>
                <option value="أردني">أردني</option>
                <option value="عراقي">عراقي</option>
                <option value="لبناني">لبناني</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "الحالة الاجتماعية" : "Social Status"}</label>
              <input
                type="text"
                value={editSocialStatus}
                onChange={(e) => setEditSocialStatus(e.target.value)}
                placeholder={isAr ? "مثال: متزوج، أرملة، يعول..." : "e.g. Married, Widow"}
                className="qout-input"
              />
            </div>
          </div>

          {/* Family Count & Residence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "عدد أفراد الأسرة" : "Family Members"}</label>
              <input
                type="number"
                min={1}
                value={editFamilyCount}
                onChange={(e) => setEditFamilyCount(Number(e.target.value))}
                className="qout-input font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "محل الإقامة / العنوان" : "Residence"}</label>
              <input
                type="text"
                value={editResidence}
                onChange={(e) => setEditResidence(e.target.value)}
                className="qout-input"
              />
            </div>
          </div>

          {/* Balance & Baskets Quota */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "الرصيد المالي (ج.م)" : "Cash Balance (EGP)"}</label>
              <input
                type="number"
                min={0}
                value={editBalance}
                onChange={(e) => setEditBalance(Number(e.target.value))}
                className="qout-input font-mono font-bold text-sm text-[#0A734D]"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5">{isAr ? "حصة السلال الغذائية" : "Baskets Quota"}</label>
              <input
                type="number"
                min={0}
                value={editQuota}
                onChange={(e) => setEditQuota(Number(e.target.value))}
                className="qout-input font-mono font-bold text-sm text-amber-800"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-700 mb-1.5">{isAr ? "حالة الكارت" : "Card Status"}</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="qout-select font-bold"
            >
              <option value="active">{isAr ? "نشط ومفعل (Active)" : "Active"}</option>
              <option value="frozen">{isAr ? "مجمد مؤقتاً (Frozen)" : "Frozen"}</option>
              <option value="expired">{isAr ? "منتهي الصلاحية (Expired)" : "Expired"}</option>
            </select>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t-2 border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary px-5 py-2.5 text-xs font-bold"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="btn btn-primary px-6 py-2.5 text-xs font-bold"
          >
            {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
