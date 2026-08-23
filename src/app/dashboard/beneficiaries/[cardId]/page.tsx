"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, query, where, onSnapshot, orderBy, updateDoc,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import {
  AidCardModel, UserModel, RedemptionTransaction, BasketDistribution,
} from "@/types";
import { QRCodeCanvas } from "qrcode.react";
import { logAuditEvent } from "@/lib/auditLogger";
import {
  Users, ArrowLeft, ArrowRight, Printer, QrCode, FileText, CheckCircle2,
  AlertCircle, Clock, Calendar, MapPin, CreditCard, Coins, PackageCheck, Store,
  Sparkles, ShieldCheck, Download, TrendingUp, Phone, Mail, FileCheck,
  HeartHandshake, ChevronRight, Activity, Hash, Edit, X,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

function formatId(raw?: string): string {
  if (!raw) return "-";
  return String(raw).replace(/\s+/g, "").toUpperCase();
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

const normalizeNationality = (nat?: string) => {
  if (!nat) return "—";
  if (nat === "مصرية") return "مصري";
  if (nat === "سورية") return "سوري";
  if (nat === "سودانية") return "سوداني";
  if (nat === "يمنية") return "يمني";
  if (nat === "فلسطينية") return "فلسطيني";
  if (nat === "أردنية") return "أردني";
  if (nat === "عراقية") return "عراقي";
  if (nat === "لبنانية") return "لبناني";
  return nat;
};

export default function BeneficiaryProfilePage() {
  const params = useParams();
  const cardIdParam = Array.isArray(params?.cardId) ? params.cardId[0] : (params?.cardId as string);
  const router = useRouter();
  const { locale, t } = useI18n();
  const { adminData } = useAuth();
  const isAr = locale === "ar";

  const [card, setCard] = useState<AidCardModel | null>(null);
  const [beneficiaryUser, setBeneficiaryUser] = useState<UserModel | null>(null);
  const [cashTxns, setCashTxns] = useState<RedemptionTransaction[]>([]);
  const [basketDists, setBasketDists] = useState<BasketDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "calendar" | "profile">("ledger");

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState<string>("");
  const [editNationalId, setEditNationalId] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editNationality, setEditNationality] = useState<string>("مصري");
  const [editSocialStatus, setEditSocialStatus] = useState<string>("");
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editQuota, setEditQuota] = useState<number>(0);
  const [editFamilyCount, setEditFamilyCount] = useState<number>(4);
  const [editResidence, setEditResidence] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Aid Card Document
  useEffect(() => {
    if (!cardIdParam) return;
    const cleanId = decodeURIComponent(cardIdParam).trim();

    const unsubCard = onSnapshot(doc(db, "aid_cards", cleanId), async (snap) => {
      if (snap.exists()) {
        const cData = { cardId: snap.id, ...snap.data() } as AidCardModel;
        setCard(cData);
        setEditName(cData.beneficiaryName || "");
        setEditNationalId(cData.nationalId || "");
        setEditPhone(cData.phone || "");
        setEditNationality(normalizeNationality(cData.nationality || "مصري"));
        setEditSocialStatus(cData.socialStatus || "");
        setEditBalance(cData.balance || 0);
        setEditQuota(cData.foodBasketsQuota || 0);
        setEditFamilyCount(cData.familyCount || 4);
        setEditResidence(cData.residence || "");
        setEditStatus(cData.status || "active");

        if (cData.beneficiaryId) {
          try {
            const uSnap = await getDoc(doc(db, "users", cData.beneficiaryId));
            if (uSnap.exists()) {
              setBeneficiaryUser({ uid: uSnap.id, ...uSnap.data() } as UserModel);
            }
          } catch (_) {}
        }
      }
      setLoading(false);
    });

    // 2. Fetch Cash Redemptions
    const qCash = query(
      collection(db, "redemptions"),
      where("cardId", "==", cleanId)
    );
    const unsubCash = onSnapshot(qCash, (snap) => {
      const list: RedemptionTransaction[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RedemptionTransaction));
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setCashTxns(list);
    });

    // 3. Fetch Basket Distributions
    const qBaskets = query(
      collection(db, "basket_distributions"),
      where("cardId", "==", cleanId)
    );
    const unsubBaskets = onSnapshot(qBaskets, (snap) => {
      const list: BasketDistribution[] = [];
      snap.forEach((d) => list.push({ distributionId: d.id, ...d.data() } as BasketDistribution));
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setBasketDists(list);
    });

    return () => {
      unsubCard();
      unsubCash();
      unsubBaskets();
    };
  }, [cardIdParam]);

  const handleSaveEdit = async () => {
    if (!card) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "aid_cards", card.cardId), {
        beneficiaryName: editName.trim(),
        nationalId: editNationalId.trim(),
        phone: editPhone.trim(),
        nationality: editNationality,
        socialStatus: editSocialStatus.trim() || undefined,
        balance: editBalance,
        foodBasketsQuota: editQuota,
        familyCount: editFamilyCount,
        residence: editResidence.trim() || undefined,
        status: editStatus,
        isActive: editStatus === "active",
      });

      if (card.beneficiaryId) {
        try {
          await updateDoc(doc(db, "users", card.beneficiaryId), {
            name: editName.trim(),
            nationalId: editNationalId.trim(),
            phone: editPhone.trim(),
            nationality: editNationality,
            socialStatus: editSocialStatus.trim() || undefined,
            city: editResidence.trim() || undefined,
          });
        } catch (_) {}
      }

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "update_card_balance",
          targetId: card.cardId,
          targetType: "aid_card",
          details: JSON.stringify({ name: editName, balance: editBalance, quota: editQuota, status: editStatus }),
        });
      }

      setShowEditModal(false);
      showToast(isAr ? "تم حفظ وتحديث بيانات المستفيد بنجاح ✅" : "Beneficiary updated successfully ✅");
    } catch (e: any) {
      console.error(e);
      alert(isAr ? "فشل الحفظ: " + e.message : "Failed to update beneficiary");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-800">{isAr ? "الكارت غير موجود" : "Card not found"}</h3>
        <Link href="/dashboard/beneficiaries" className="btn btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          <span>{isAr ? "العودة للمستفيدين" : "Back to Beneficiaries"}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-emerald-400 font-bold text-sm animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/dashboard/beneficiaries"
          className="btn btn-sm btn-secondary font-bold inline-flex items-center gap-2 text-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{isAr ? "العودة لقائمة المستفيدين" : "Back to Beneficiaries"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-sm btn-secondary font-bold text-xs flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isAr ? "تعديل بيانات المستفيد" : "Edit Beneficiary"}</span>
          </button>
        </div>
      </div>

      {/* Hero Beneficiary 360 Card */}
      <div className="qout-card p-6 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#0A734D] flex items-center justify-center border-2 border-emerald-200 flex-shrink-0 shadow-xs">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900">
                  {card.beneficiaryName || "مستفيد معتمد"}
                </h2>
                <span
                  className={`badge font-bold text-xs ${
                    card.status === "active"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : card.status === "frozen"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  {card.status === "active" ? (isAr ? "نشط" : "Active") : card.status === "frozen" ? (isAr ? "مجمد" : "Frozen") : (isAr ? "منتهي" : "Expired")}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                <span>{card.socialStatus || "—"}</span>
                <span>•</span>
                <span>{normalizeNationality(card.nationality)}</span>
                <span>•</span>
                <span>{card.residence || "—"}</span>
                {card.familyCount && <span>• {card.familyCount} أفراد</span>}
              </p>
            </div>
          </div>

          {/* Identification Chips - Explicit System Card vs National ID Clarification */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col">
              <span className="text-[10px] text-emerald-700 font-bold">{isAr ? "كود كارت المنظومة (الفجر)" : "System Card Code"}</span>
              <span className="font-mono font-black text-sm text-[#0A734D]">{card.cardId}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold">{isAr ? "رقم الهوية الوطنية / الجواز" : "National ID / Passport"}</span>
              <span className="font-mono font-black text-sm">{formatId(card.nationalId)}</span>
            </div>
          </div>
        </div>

        {/* Balances Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">{isAr ? "الرصيد المالي المتاح للصرف" : "Available Cash Balance"}</span>
              <p className="text-2xl font-black text-[#0A734D] font-mono">{(card.balance || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</p>
            </div>
            <Coins className="w-8 h-8 text-emerald-600 opacity-60" />
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">{isAr ? "حصة السلال الغذائية المتبقية" : "Remaining Food Baskets"}</span>
              <p className="text-2xl font-black text-amber-800 font-mono">{card.foodBasketsQuota || 0} {isAr ? "سلة" : "baskets"}</p>
            </div>
            <PackageCheck className="w-8 h-8 text-amber-600 opacity-60" />
          </div>
        </div>
      </div>

      {/* History Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Redemptions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? `عمليات الصرف النقدي (${cashTxns.length})` : `Cash Redemptions (${cashTxns.length})`}</span>
            </h3>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {cashTxns.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-8">{isAr ? "لا توجد عمليات صرف مسجلة" : "No redemptions"}</p>
            ) : (
              cashTxns.map((tx) => (
                <div key={tx.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{tx.merchantStoreName || "منفذ صرف"}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{parseDate(tx.timestamp).toLocaleString(isAr ? "ar-EG" : "en-US")}</span>
                  </div>
                  <span className="font-mono font-extrabold text-[#0A734D]">
                    -{tx.amountDeducted?.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Basket Distributions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-600" />
              <span>{isAr ? `عمليات تسليم السلال الغذائية (${basketDists.length})` : `Basket Distributions (${basketDists.length})`}</span>
            </h3>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {basketDists.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-8">{isAr ? "لا توجد حركات تسليم سلال مسجلة" : "No distributions"}</p>
            ) : (
              basketDists.map((bd) => (
                <div key={bd.distributionId} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{bd.distributionCenter || "مركز التوزيع"}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{parseDate(bd.timestamp).toLocaleString(isAr ? "ar-EG" : "en-US")}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-xs border border-amber-300">
                    {bd.basketsCount} {isAr ? "سلة" : "baskets"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: Edit Beneficiary ── */}
      {showEditModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
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
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "اسم المستفيد الرباعي" : "Full Name"}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="qout-input"
                />
              </div>

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
                    className="qout-input"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1.5">{isAr ? "الرصيد المالي (ج.م)" : "Balance"}</label>
                  <input
                    type="number"
                    min={0}
                    value={editBalance}
                    onChange={(e) => setEditBalance(Number(e.target.value))}
                    className="qout-input font-mono font-bold text-sm text-[#0A734D]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1.5">{isAr ? "حصة السلال" : "Quota"}</label>
                  <input
                    type="number"
                    min={0}
                    value={editQuota}
                    onChange={(e) => setEditQuota(Number(e.target.value))}
                    className="qout-input font-mono font-bold text-sm text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5">{isAr ? "حالة الكارت" : "Status"}</label>
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

            <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t-2 border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 z-10">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn btn-secondary px-5 py-2.5 text-xs font-bold"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEdit}
                className="btn btn-primary px-6 py-2.5 text-xs font-bold"
              >
                {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
