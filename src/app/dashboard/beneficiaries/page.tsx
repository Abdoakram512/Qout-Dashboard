"use client";

import React, { useState, useEffect, useRef } from "react";
import { DistributeBasketModal } from "@/components/beneficiaries/DistributeBasketModal";
import { EditBeneficiaryModal } from "@/components/beneficiaries/EditBeneficiaryModal";
import { BeneficiaryQrModal } from "@/components/beneficiaries/BeneficiaryQrModal";
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
  AlertCircle, ChevronDown, ChevronLeft, Sparkles, Filter, Home,
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
        {/* ── DESKTOP VIEW: Full Data Table (Hidden on Mobile) ── */}
        <div className="hidden md:block overflow-x-auto">
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
                paginatedCards.map((c) => {
                  const quota = c.foodBasketsQuota || 0;
                  const hasQuota = quota > 0;
                  return (
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
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-bold">
                          {quota} {isAr ? "سلة" : "bsk"}
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
                          {/* Restored Prominent Basket Handover Button */}
                          <button
                            onClick={() => handleOpenDistributeModal(c)}
                            disabled={!hasQuota}
                            className="btn btn-xs bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-35 disabled:hover:bg-amber-500 text-white font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:cursor-not-allowed cursor-pointer"
                            title={
                              !hasQuota
                                ? (isAr ? "لا توجد حصص سلال متبقية للتسليم" : "No basket quota remaining")
                                : (isAr ? "تسليم سلة غذائية (الإدارة)" : "Handover Food Basket")
                            }
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{isAr ? "تسليم سلة" : "Deliver"}</span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE VIEW: Dedicated Beneficiary Cards (No Horizontal Scrolling) ── */}
        <div className="block md:hidden p-3.5 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
              <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>{isAr ? "جاري تحميل بيانات المستفيدين..." : "Loading..."}</span>
            </div>
          ) : paginatedCards.length === 0 ? (
            <div className="py-14 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 p-4">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <span>{isAr ? "لا توجد نتائج مطابقة للبحث أو الفلتر" : "No matching beneficiaries"}</span>
            </div>
          ) : (
            paginatedCards.map((c) => {
              const quota = c.foodBasketsQuota || 0;
              const hasQuota = quota > 0;
              return (
                <div
                  key={c.cardId}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                >
                  {/* Top Row: Name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/beneficiaries/${c.cardId}`}
                        className="text-sm font-extrabold text-slate-900 hover:text-emerald-700 transition-colors line-clamp-1 flex items-center gap-1.5"
                      >
                        <span>{c.beneficiaryName || "—"}</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0 rtl:rotate-0 ltr:rotate-180" />
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-500 flex-wrap">
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-extrabold">
                          {c.cardId}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">{formatId(c.nationalId)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`badge font-bold text-[10px] shrink-0 ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : c.status === "frozen"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {c.status === "active" ? (isAr ? "نشط" : "Active") : c.status === "frozen" ? (isAr ? "مجمد" : "Frozen") : (isAr ? "منتهي" : "Expired")}
                    </span>
                  </div>

                  {/* Sub-info Row: Nationality & Residence & Family */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{normalizeNationality(c.nationality)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.residence || (isAr ? "غير محدد" : "N/A")}</span>
                    </div>
                    {c.socialStatus && (
                      <div className="col-span-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/70 font-bold">
                        <span>{c.socialStatus}</span>
                        <span>{c.familyCount || 1} {isAr ? "أفراد" : "members"}</span>
                      </div>
                    )}
                  </div>

                  {/* Balances Grid: Cash Balance & Baskets Quota */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Cash Balance */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-600" />
                        <span>{isAr ? "الرصيد المالي" : "Cash Balance"}</span>
                      </span>
                      <p className="text-base font-black text-[#0A734D] font-mono mt-1">
                        {(c.balance || 0).toLocaleString()} <span className="text-xs font-sans font-bold">{isAr ? "ج.م" : "EGP"}</span>
                      </p>
                    </div>

                    {/* Baskets Quota */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-600" />
                        <span>{isAr ? "حصة السلال" : "Baskets Quota"}</span>
                      </span>
                      <p className="text-base font-black text-amber-900 font-mono mt-1">
                        {quota} <span className="text-xs font-sans font-bold">{isAr ? "سلة" : "bsk"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Mobile Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    {/* Prominent Golden Basket Button */}
                    <button
                      onClick={() => handleOpenDistributeModal(c)}
                      disabled={!hasQuota}
                      className="flex-1 btn btn-sm bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-35 disabled:hover:bg-amber-500 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:cursor-not-allowed cursor-pointer text-xs"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>{isAr ? "تسليم سلة" : "Deliver Basket"}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(c)}
                      className="btn btn-sm btn-secondary p-2.5 rounded-xl text-emerald-800 hover:bg-emerald-50 border-slate-200"
                      title={isAr ? "تعديل البيانات" : "Edit"}
                    >
                      <Edit className="w-4 h-4 text-emerald-700" />
                    </button>

                    {/* QR Code Button */}
                    <button
                      onClick={() => setActiveCard(c)}
                      className="btn btn-sm btn-secondary p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 border-slate-200"
                      title={isAr ? "عرض رمز QR" : "QR Code"}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
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

      {/* ── MODALS (Modular Components) ── */}
      <DistributeBasketModal
        isOpen={Boolean(distributeCard && mounted)}
        onClose={() => setDistributeCard(null)}
        card={distributeCard}
        distributeCount={distributeCount}
        setDistributeCount={setDistributeCount}
        distributionCenter={distributionCenter}
        setDistributionCenter={setDistributionCenter}
        distributeNotes={distributeNotes}
        setDistributeNotes={setDistributeNotes}
        distributing={distributing}
        onConfirm={handleConfirmDistribution}
        formatId={formatId}
        isAr={isAr}
      />

      <EditBeneficiaryModal
        isOpen={Boolean(editingCard && mounted)}
        onClose={() => setEditingCard(null)}
        card={editingCard}
        editName={editName}
        setEditName={setEditName}
        editNationalId={editNationalId}
        setEditNationalId={setEditNationalId}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editNationality={editNationality}
        setEditNationality={setEditNationality}
        editSocialStatus={editSocialStatus}
        setEditSocialStatus={setEditSocialStatus}
        editFamilyCount={editFamilyCount}
        setEditFamilyCount={setEditFamilyCount}
        editResidence={editResidence}
        setEditResidence={setEditResidence}
        editBalance={editBalance}
        setEditBalance={setEditBalance}
        editQuota={editQuota}
        setEditQuota={setEditQuota}
        editStatus={editStatus}
        setEditStatus={setEditStatus}
        saving={saving}
        onSave={handleSaveEdit}
        isAr={isAr}
      />

      <BeneficiaryQrModal
        isOpen={Boolean(activeCard && mounted)}
        onClose={() => setActiveCard(null)}
        card={activeCard}
        isAr={isAr}
      />
    </div>
  );
}
