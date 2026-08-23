"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import { AidCardModel } from "@/types";
import { arabicMatch } from "@/lib/arabicNormalizer";
import { logAuditEvent } from "@/lib/auditLogger";
import { QRCodeCanvas } from "qrcode.react";
import * as XLSX from "xlsx";
import {
  Users, Search, Globe, Download, FileSpreadsheet, Printer,
  QrCode, Edit, Edit3, X, PackageCheck, MapPin, CheckCircle2,
  AlertCircle, ChevronDown, Sparkles, Filter, Home,
  Package, FileText, Plus, Minus, CreditCard, ShieldCheck, Coins,
  Clock, Layers, Gift, Phone, HeartHandshake,
} from "lucide-react";
import Link from "next/link";

function formatId(raw?: string): string {
  if (!raw) return "-";
  return String(raw).replace(/\s+/g, "").toUpperCase();
}

function parseDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw.toDate) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
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

export default function BeneficiariesPage() {
  const { t, locale } = useI18n();
  const { adminData } = useAuth();
  const isAr = locale === "ar";

  const [cards, setCards] = useState<AidCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNationality, setSelectedNationality] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Recipient Filters
  const now = new Date();
  const [selectedRecipientFilter, setSelectedRecipientFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // QR Modal
  const [activeCard, setActiveCard] = useState<AidCardModel | null>(null);
  const qrCanvasContainerRef = useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [editingCard, setEditingCard] = useState<AidCardModel | null>(null);
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

  // Bulk Allocation Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState<"balance" | "baskets">("balance");
  const [bulkTarget, setBulkTarget] = useState<"all" | string>("all");
  const [bulkAmount, setBulkAmount] = useState<number>(500);
  const [bulkReason, setBulkReason] = useState<string>("منحة مساعدة معتمدة");
  const [bulkAllocating, setBulkAllocating] = useState(false);

  // Distribute Basket Modal (Admin Distribution)
  const [distributeCard, setDistributeCard] = useState<AidCardModel | null>(null);
  const [distributeCount, setDistributeCount] = useState<number>(1);
  const [distributionCenter, setDistributionCenter] = useState<string>("المقر الرئيسي - مركز توزيع الفجر");
  const [distributeNotes, setDistributeNotes] = useState<string>("");
  const [distributing, setDistributing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Mounted for Portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "aid_cards"), (snap) => {
      const list: AidCardModel[] = [];
      snap.forEach((docSnap) => {
        list.push({ cardId: docSnap.id, ...docSnap.data() } as AidCardModel);
      });
      list.sort((a, b) => {
        const numA = parseInt(a.cardId.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.cardId.replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      setCards(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Helper to check receipt status in a specific month
  const getCardRecipientDetails = (card: AidCardModel, targetMonth = selectedMonth, targetYear = selectedYear) => {
    const cashDate = parseDate(card.lastCashRedemptionDate);
    const basketDate = parseDate(card.lastBasketDistributionDate);

    const receivedCashInTarget = cashDate && cashDate.getMonth() === targetMonth && cashDate.getFullYear() === targetYear;
    const receivedBasketInTarget = basketDate && basketDate.getMonth() === targetMonth && basketDate.getFullYear() === targetYear;

    const hasReceived = !!(receivedCashInTarget || receivedBasketInTarget);
    
    let latestDate: Date | null = null;
    if (cashDate && basketDate) {
      latestDate = cashDate > basketDate ? cashDate : basketDate;
    } else {
      latestDate = cashDate || basketDate;
    }

    let daysSinceLast: number | null = null;
    if (latestDate) {
      daysSinceLast = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      hasReceived,
      receivedCashInTarget,
      receivedBasketInTarget,
      latestDate,
      daysSinceLast,
      cashDate,
      basketDate,
    };
  };

  // Filter Cards using Arabic Normalization
  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      arabicMatch(c.beneficiaryName || "", search) ||
      arabicMatch(c.cardId || "", search) ||
      arabicMatch(c.nationalId || "", search) ||
      arabicMatch(c.residence || "", search) ||
      arabicMatch(c.nationality || "", search) ||
      arabicMatch(c.phone || "", search);

    if (!matchesSearch) return false;

    // Nationality filter
    if (selectedNationality !== "all") {
      const normCardNat = normalizeNationality(c.nationality);
      const normSelectedNat = normalizeNationality(selectedNationality);
      if (normCardNat !== normSelectedNat) return false;
    }

    // Status filter
    if (selectedStatus !== "all") {
      if (c.status !== selectedStatus) return false;
    }

    // Recipient Status Filter
    const details = getCardRecipientDetails(c);
    if (selectedRecipientFilter === "received_this_month") {
      if (!details.hasReceived) return false;
    } else if (selectedRecipientFilter === "not_received_this_month") {
      if (details.hasReceived) return false;
    } else if (selectedRecipientFilter === "received_last_month") {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const prevDetails = getCardRecipientDetails(c, prevMonth, prevYear);
      if (!prevDetails.hasReceived) return false;
    } else if (selectedRecipientFilter === "dormant") {
      if (details.daysSinceLast === null || details.daysSinceLast < 60) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
  const paginatedCards = filteredCards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openEditModal = (card: AidCardModel) => {
    setEditingCard(card);
    setEditName(card.beneficiaryName || "");
    setEditNationalId(card.nationalId || "");
    setEditPhone(card.phone || "");
    setEditNationality(normalizeNationality(card.nationality || "مصري"));
    setEditSocialStatus(card.socialStatus || "");
    setEditBalance(card.balance || 0);
    setEditQuota(card.foodBasketsQuota || 0);
    setEditFamilyCount(card.familyCount || 4);
    setEditResidence(card.residence || "");
    setEditStatus(card.status || "active");
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "aid_cards", editingCard.cardId), {
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

      // Also sync user doc if exists
      if (editingCard.beneficiaryId) {
        try {
          await updateDoc(doc(db, "users", editingCard.beneficiaryId), {
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
          targetId: editingCard.cardId,
          targetType: "aid_card",
          details: JSON.stringify({ name: editName, balance: editBalance, quota: editQuota, status: editStatus }),
        });
      }

      setEditingCard(null);
      setSuccessToast(isAr ? "تم تحديث بيانات المستفيد والكارت بنجاح ✅" : "Beneficiary updated successfully");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (e: any) {
      console.error(e);
      alert(isAr ? "فشل حفظ التعديلات: " + e.message : "Failed to update beneficiary");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDistributeModal = (card: AidCardModel) => {
    setDistributeCard(card);
    setDistributeCount(1);
    setDistributionCenter(isAr ? "المقر الرئيسي - مركز توزيع الفجر" : "Main Distribution Center");
    setDistributeNotes("");
  };

  const handleConfirmDistribution = async () => {
    if (!distributeCard || distributeCount <= 0) return;
    setDistributing(true);
    try {
      const currentQuota = distributeCard.foodBasketsQuota || 0;
      const newQuota = Math.max(0, currentQuota - distributeCount);
      const nowIso = new Date().toISOString();

      const distRef = doc(collection(db, "basket_distributions"));
      await setDoc(distRef, {
        distributionId: distRef.id,
        cardId: distributeCard.cardId,
        beneficiaryName: distributeCard.beneficiaryName || "مستفيد",
        nationalId: distributeCard.nationalId || "",
        basketsCount: distributeCount,
        distributionCenter: distributionCenter.trim(),
        notes: distributeNotes.trim() || undefined,
        timestamp: nowIso,
        administeredByAdminId: adminData?.uid || "admin",
        administeredByAdminEmail: adminData?.email || "admin@alfajr.org",
      });

      await updateDoc(doc(db, "aid_cards", distributeCard.cardId), {
        foodBasketsQuota: newQuota,
        lastBasketDistributionDate: nowIso,
      });

      if (adminData) {
        await logAuditEvent({
          adminId: adminData.uid,
          adminEmail: adminData.email,
          action: "distribute_basket",
          targetId: distributeCard.cardId,
          targetType: "aid_card",
          details: JSON.stringify({ count: distributeCount, center: distributionCenter }),
        });
      }

      setDistributeCard(null);
      setSuccessToast(isAr ? `تم تسليم ${distributeCount} سلة غذائية للمستفيد ${distributeCard.beneficiaryName || ""} بنجاح ✅` : "Baskets delivered successfully");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e: any) {
      console.error(e);
      alert(isAr ? "فشل تسجيل التسليم: " + e.message : "Failed to record distribution");
    } finally {
      setDistributing(false);
    }
  };

  // Export to Excel with Al-Fajr Naming
  const handleExportExcel = () => {
    const rows = filteredCards.map((c, idx) => ({
      "م": idx + 1,
      "كود كارت المنظومة": c.cardId,
      "اسم المستفيد": c.beneficiaryName || "—",
      "رقم الهوية / الجواز": c.nationalId || "—",
      "رقم الهاتف": c.phone || "—",
      "الجنسية": normalizeNationality(c.nationality),
      "الحالة الاجتماعية": c.socialStatus || "—",
      "عدد الأفراد": c.familyCount || 1,
      "محل الإقامة": c.residence || "—",
      "الرصيد المالي (ج.م)": c.balance || 0,
      "حصة السلال": c.foodBasketsQuota || 0,
      "حالة الكارت": c.status === "active" ? "نشط" : c.status === "frozen" ? "مجمد" : "منتهي",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المستفيدين");
    XLSX.writeFile(wb, `ALFAJR_Beneficiaries_${Date.now()}.xlsx`);
  };

  const monthNames = isAr
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-emerald-400 font-bold text-sm animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            {isAr ? "إدارة المستفيدين والكروت الإغاثية" : "Beneficiaries & Aid Cards"}
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            {isAr ? "سجل شامل للمستفيدين المعتمدين، متابعة الأرصدة والسلال، وتسليم المساعدات" : "Manage beneficiary aid cards, balances and basket handovers"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="btn btn-sm btn-secondary font-bold text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{isAr ? "تصدير إكسيل" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="qout-card p-4 bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? "بحث باسم المستفيد، كود الكارت، رقم الهوية، المدينة أو الهاتف..." : "Search beneficiary, card ID, national ID..."}
              className="qout-input ps-10"
            />
            <Search className="w-4 h-4 absolute start-3.5 top-3 text-slate-400" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Recipient Filter */}
            <select
              value={selectedRecipientFilter}
              onChange={(e) => {
                setSelectedRecipientFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="qout-select text-xs font-bold py-2 bg-emerald-50/70 border-emerald-300 text-emerald-950"
            >
              <option value="all">{isAr ? "📋 كل حالات الاستلام" : "All Receipts"}</option>
              <option value="received_this_month">{isAr ? `✅ استلموا شهر (${monthNames[selectedMonth]})` : "Received This Month"}</option>
              <option value="not_received_this_month">{isAr ? `❌ لم يستلموا شهر (${monthNames[selectedMonth]})` : "Not Received"}</option>
              <option value="received_last_month">{isAr ? "🗓️ استلموا الشهر السابق" : "Received Last Month"}</option>
              <option value="dormant">{isAr ? "⚠️ متخلفون عن الاستلام (+60 يوم)" : "Dormant (+60d)"}</option>
            </select>

            {/* Masculine Nationality Filter */}
            <select
              value={selectedNationality}
              onChange={(e) => {
                setSelectedNationality(e.target.value);
                setCurrentPage(1);
              }}
              className="qout-select text-xs font-bold py-2"
            >
              <option value="all">{isAr ? "🌐 جميع الجنسيات" : "All Nationalities"}</option>
              <option value="مصري">{isAr ? "🇪🇬 مصري" : "Egyptian"}</option>
              <option value="سوري">{isAr ? "🇸🇾 سوري" : "Syrian"}</option>
              <option value="سوداني">{isAr ? "🇸🇩 سوداني" : "Sudanese"}</option>
              <option value="يمني">{isAr ? "🇾🇪 يمني" : "Yemeni"}</option>
              <option value="فلسطيني">{isAr ? "🇵🇸 فلسطيني" : "Palestinian"}</option>
              <option value="أردني">{isAr ? "🇯🇴 أردني" : "Jordanian"}</option>
              <option value="عراقي">{isAr ? "🇮🇶 عراقي" : "Iraqi"}</option>
              <option value="لبناني">{isAr ? "🇱🇧 لبناني" : "Lebanese"}</option>
              <option value="أخرى">{isAr ? "🏳️ أخرى" : "Other"}</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="qout-select text-xs font-bold py-2"
            >
              <option value="all">{isAr ? "⚡ جميع الحالات" : "All Statuses"}</option>
              <option value="active">{isAr ? "🟢 نشط" : "Active"}</option>
              <option value="frozen">{isAr ? "🔵 مجمد" : "Frozen"}</option>
              <option value="expired">{isAr ? "⚪ منتهي" : "Expired"}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 font-bold pt-2 border-t border-slate-100">
          <span>{isAr ? `إجمالي الحالات المطابقة: ${filteredCards.length} كارت` : `Matching: ${filteredCards.length} cases`}</span>
          <span>{isAr ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
        </div>
      </div>

      {/* Main Beneficiaries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-bold text-slate-800 text-start">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-start">{isAr ? "كود الكارت" : "Card Code"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "المستفيد" : "Beneficiary"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "رقم الهوية" : "National ID"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "الجنسية" : "Nationality"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "الرصيد المالي" : "Balance"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "حصة السلال" : "Baskets Quota"}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3.5 px-4 text-end">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400 font-bold">
                    <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>{isAr ? "جاري تحميل بيانات المستفيدين..." : "Loading..."}</span>
                  </td>
                </tr>
              ) : paginatedCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-bold">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <span>{isAr ? "لا توجد نتائج مطابقة للبحث أو الفلتر" : "No matching beneficiaries"}</span>
                  </td>
                </tr>
              ) : (
                paginatedCards.map((c) => (
                  <tr key={c.cardId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Card ID */}
                    <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-800">
                      <Link href={`/dashboard/beneficiaries/${c.cardId}`} className="hover:underline flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{c.cardId}</span>
                      </Link>
                    </td>

                    {/* Beneficiary Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {c.beneficiaryName || "—"}
                      </div>
                      {c.socialStatus && (
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                          {c.socialStatus} {c.familyCount ? `• ${c.familyCount} أفراد` : ""}
                        </span>
                      )}
                    </td>

                    {/* National ID */}
                    <td className="py-3.5 px-4 font-mono text-slate-700 font-bold">
                      {formatId(c.nationalId)}
                    </td>

                    {/* Masculine Nationality */}
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {normalizeNationality(c.nationality)}
                    </td>

                    {/* Financial Balance */}
                    <td className="py-3.5 px-4 font-mono font-extrabold text-[#0A734D]">
                      {(c.balance || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}
                    </td>

                    {/* Food Baskets Quota */}
                    <td className="py-3.5 px-4 font-bold">
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs">
                        {c.foodBasketsQuota || 0} {isAr ? "سلة" : "bsk"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`badge font-bold text-[10px] ${
                          c.status === "active"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : c.status === "frozen"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {c.status === "active" ? (isAr ? "نشط" : "Active") : c.status === "frozen" ? (isAr ? "مجمد" : "Frozen") : (isAr ? "منتهي" : "Expired")}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Handover Basket Button */}
                        <button
                          onClick={() => handleOpenDistributeModal(c)}
                          className="btn btn-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold p-1.5 rounded-lg"
                          title={isAr ? "تسليم سلال غذائية من الإدارة" : "Handover Baskets"}
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(c)}
                          className="btn btn-xs btn-secondary p-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
                          title={isAr ? "تعديل بيانات المستفيد" : "Edit Beneficiary"}
                        >
                          <Edit className="w-3.5 h-3.5 text-emerald-700" />
                        </button>

                        {/* QR Code Button */}
                        <button
                          onClick={() => setActiveCard(c)}
                          className="btn btn-xs btn-secondary p-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
                          title={isAr ? "عرض رمز QR" : "Show QR"}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="btn btn-sm btn-secondary"
            >
              {isAr ? "السابق" : "Previous"}
            </button>
            <span className="font-mono text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="btn btn-sm btn-secondary"
            >
              {isAr ? "التالي" : "Next"}
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Distribute Basket Modal (Fixed Mobile UI & Sticky Action Footer) ── */}
      {distributeCard && mounted && createPortal(
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
                    {distributeCard.beneficiaryName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDistributeCard(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-4 text-xs font-bold">
              {/* Beneficiary Badge Card (Responsive wrap for mobile screen) */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-emerald-800 font-black">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{distributeCard.cardId}</span>
                  </div>
                  <div className="font-mono text-slate-600">
                    {isAr ? "الهوية:" : "ID:"} {formatId(distributeCard.nationalId)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-600">{isAr ? "الحصة المتاحة حالياً:" : "Available Quota:"}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-black text-xs font-mono border border-amber-300">
                    {distributeCard.foodBasketsQuota || 0} {isAr ? "سلة" : "baskets"}
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
                    onClick={() => setDistributeCount(distributeCard.foodBasketsQuota || 1)}
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

            {/* Sticky Action Footer (Always Visible on Small/Mobile Screens) */}
            <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t-2 border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 z-10">
              <button
                type="button"
                onClick={() => setDistributeCard(null)}
                className="btn btn-secondary px-4 py-2.5 text-xs font-bold"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={distributing || distributeCount <= 0}
                onClick={handleConfirmDistribution}
                className="btn btn-primary px-5 py-2.5 text-xs font-black flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4 text-amber-300" />
                <span>{distributing ? (isAr ? "جاري التسليم..." : "Delivering...") : (isAr ? "تأكيد تسليم السلال" : "Confirm Handover")}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: Full Edit Beneficiary Details ─────────────────────── */}
      {editingCard && mounted && createPortal(
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
                    {editingCard.cardId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCard(null)}
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
                onClick={() => setEditingCard(null)}
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

      {/* ── MODAL 3: QR Code Modal ────────────────────────────────────── */}
      {activeCard && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border-2 border-slate-200 text-center relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveCard(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0A734D] flex items-center justify-center mx-auto mb-3 border border-emerald-200">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-slate-900">{activeCard.beneficiaryName || "مستفيد معتمد"}</h3>
            <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">{activeCard.cardId}</p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block my-4">
              <QRCodeCanvas
                value={activeCard.cardId}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-slate-500 font-bold mb-4 leading-relaxed">
              {isAr ? "امسح الرمز من خلال تطبيق الصراف للتحقق وصرف المساعدات" : "Scan QR code via Merchant App"}
            </p>

            <button
              onClick={() => setActiveCard(null)}
              className="btn btn-secondary w-full justify-center text-xs font-bold"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
