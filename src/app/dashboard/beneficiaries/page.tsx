"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import { AidCardModel } from "@/types";
import { arabicMatch } from "@/lib/arabicNormalizer";
import { QRCodeCanvas } from "qrcode.react";
import * as XLSX from "xlsx";
import {
  Users, Search, Globe, Download, FileSpreadsheet, Printer,
  QrCode, Edit, Edit3, X, PackageCheck, MapPin, CheckCircle2,
  AlertCircle, ChevronDown, Sparkles, Filter, Home,
  Package, FileText, Plus, Minus, CreditCard, ShieldCheck, Coins,
  Clock,
} from "lucide-react";

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

  // Edit Modal
  const [editingCard, setEditingCard] = useState<AidCardModel | null>(null);
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editQuota, setEditQuota] = useState<number>(0);
  const [editFamilyCount, setEditFamilyCount] = useState<number>(4);
  const [editResidence, setEditResidence] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [saving, setSaving] = useState(false);

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
    
    // Latest date overall
    let latestDate: Date | null = null;
    if (cashDate && basketDate) {
      latestDate = cashDate > basketDate ? cashDate : basketDate;
    } else {
      latestDate = cashDate || basketDate;
    }

    // Days since last receive
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

  const filteredCards = cards.filter((c) => {
    const cleanNatId = formatId(c.nationalId);
    const cleanQuery = search.trim().toLowerCase();

    const matchesSearch =
      c.beneficiaryName?.toLowerCase().includes(cleanQuery) ||
      c.cardId?.toLowerCase().includes(cleanQuery) ||
      cleanNatId.toLowerCase().includes(cleanQuery) ||
      c.nationalId?.toLowerCase().includes(cleanQuery) ||
      c.nationality?.toLowerCase().includes(cleanQuery) ||
      c.residence?.toLowerCase().includes(cleanQuery);

    const matchesNat = selectedNationality === "all" || c.nationality === selectedNationality;
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;

    // Recipient Status Filter Evaluation
    const statusDetails = getCardRecipientDetails(c, selectedMonth, selectedYear);
    let matchesRecipient = true;

    if (selectedRecipientFilter === "received_this_month") {
      matchesRecipient = statusDetails.hasReceived;
    } else if (selectedRecipientFilter === "not_received_this_month") {
      matchesRecipient = !statusDetails.hasReceived;
    } else if (selectedRecipientFilter === "received_last_month") {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      matchesRecipient = getCardRecipientDetails(c, prevMonth, prevYear).hasReceived;
    } else if (selectedRecipientFilter === "dormant") {
      matchesRecipient = statusDetails.daysSinceLast === null || statusDetails.daysSinceLast >= 60;
    }

    return matchesSearch && matchesNat && matchesStatus && matchesRecipient;
  });

  // Calculate quick stats for the currently selected month
  const totalCardsCount = cards.length;
  const receivedThisMonthCount = cards.filter((c) => getCardRecipientDetails(c, selectedMonth, selectedYear).hasReceived).length;
  const notReceivedThisMonthCount = totalCardsCount - receivedThisMonthCount;
  const coverageRate = totalCardsCount > 0 ? Math.round((receivedThisMonthCount / totalCardsCount) * 100) : 0;

  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
  const paginatedCards = filteredCards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Pure Canvas Export
  const handleDownloadQrPng = () => {
    if (!activeCard || !qrCanvasContainerRef.current) return;
    const srcCanvas = qrCanvasContainerRef.current.querySelector("canvas");
    if (!srcCanvas) return;

    try {
      const outCanvas = document.createElement("canvas");
      outCanvas.width = 440;
      outCanvas.height = 540;
      const ctx = outCanvas.getContext("2d");
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 440, 540);

      // Draw decorative top banner
      ctx.fillStyle = "#0A734D";
      ctx.fillRect(0, 0, 440, 70);

      // Header Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px 'Cairo', 'Segoe UI', Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("مؤسسة الفجر الخيرية", 220, 42);

      // Beneficiary Name
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px 'Cairo', 'Segoe UI', Tahoma, sans-serif";
      ctx.fillText(activeCard.beneficiaryName || "مستفيد", 220, 105);

      // Info line
      ctx.fillStyle = "#64748b";
      ctx.font = "12px 'Cairo', 'Segoe UI', Tahoma, sans-serif";
      const infoSub = `${activeCard.nationality || ""} • ${activeCard.familyCount || 4} أفراد • ${activeCard.residence || ""}`.trim();
      ctx.fillText(infoSub, 220, 128);

      // Draw QR Canvas centered
      ctx.drawImage(srcCanvas, 120, 150, 200, 200);

      // Card ID & National ID
      ctx.fillStyle = "#0A734D";
      ctx.font = "bold 18px monospace";
      ctx.fillText(activeCard.cardId, 220, 390);

      ctx.fillStyle = "#334155";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`ID: ${formatId(activeCard.nationalId)}`, 220, 420);

      // Balances
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px 'Cairo', 'Segoe UI', Tahoma, sans-serif";
      ctx.fillText(`رصيد المشتريات: ${(activeCard.totalBalance || 0).toLocaleString()} ج.م  |  السلال: ${activeCard.foodBasketsQuota || 0} سلة`, 220, 460);

      // Footer
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px 'Cairo', 'Segoe UI', Tahoma, sans-serif";
      ctx.fillText("البطاقة الرقمية المعتمدة - مؤسسة الفجر الخيرية", 220, 500);

      const link = document.createElement("a");
      link.download = `ALFAJR-CARD-${activeCard.cardId}.png`;
      link.href = outCanvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Canvas export error:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "aid_cards", editingCard.cardId), {
        totalBalance: Number(editBalance),
        foodBasketsQuota: Number(editQuota),
        familyCount: Number(editFamilyCount),
        residence: editResidence.trim(),
        status: editStatus,
      });
      setEditingCard(null);
      showToast(isAr ? "تم حفظ وتحديث بيانات البطاقة بنجاح" : "Card updated successfully");
    } catch (err) {
      console.error(err);
      alert(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDistribution = async () => {
    if (!distributeCard) return;
    if (distributeCount <= 0) {
      alert(isAr ? "يرجى تحديد عدد سلال صحيح" : "Please specify valid baskets count");
      return;
    }
    if (distributeCount > (distributeCard.foodBasketsQuota || 0)) {
      alert(isAr ? "العدد المطلوب أكبر من الحصص المتاحة في الكارت" : "Count exceeds available quota");
      return;
    }

    setDistributing(true);
    try {
      const remainingAfter = (distributeCard.foodBasketsQuota || 0) - distributeCount;
      const totalDelivered = (distributeCard.totalBasketsDelivered || 0) + distributeCount;
      const distId = `DIST-BSK-${Date.now().toString().slice(-6)}`;
      const now = new Date();

      // 1. Update aid_cards
      await updateDoc(doc(db, "aid_cards", distributeCard.cardId), {
        foodBasketsQuota: remainingAfter,
        totalBasketsDelivered: totalDelivered,
        lastBasketDistributionDate: Timestamp.fromDate(now),
      });

      // 2. Add record in basket_distributions
      await setDoc(doc(db, "basket_distributions", distId), {
        distributionId: distId,
        cardId: distributeCard.cardId,
        beneficiaryId: distributeCard.beneficiaryId || "",
        beneficiaryName: distributeCard.beneficiaryName || "مستفيد",
        familyCount: distributeCard.familyCount || 4,
        residence: distributeCard.residence || "",
        basketsCount: distributeCount,
        remainingBasketsAfter: remainingAfter,
        distributedBy: {
          adminId: adminData?.uid || "usr_admin_01",
          adminName: adminData?.name || "المشرف العام لمؤسسة الفجر الخيرية",
        },
        distributionCenter: distributionCenter,
        notes: distributeNotes.trim() || (isAr ? "تسليم سلال غذائية من مركز التوزيع الإداري" : "Admin food basket distribution"),
        timestamp: Timestamp.fromDate(now),
        createdAt: now.toISOString(),
      });

      setDistributeCard(null);
      setDistributeNotes("");
      setDistributeCount(1);
      showToast(isAr ? `تم توثيق تسليم ${distributeCount} سلة غذائية بنجاح!` : `Delivered ${distributeCount} baskets successfully!`);
    } catch (err) {
      console.error(err);
      alert(isAr ? "حدث خطأ أثناء تسجيل عملية التسليم" : "Error recording distribution");
    } finally {
      setDistributing(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleExportExcel = () => {
    const rows = filteredCards.map((c, idx) => ({
      "م": idx + 1,
      "رقم الكارت": c.cardId,
      "اسم المستفيد": c.beneficiaryName,
      "رقم البطاقة": formatId(c.nationalId),
      "الجنسية": c.nationality || "-",
      "أفراد الأسرة": c.familyCount || 4,
      "محل الإقامة": c.residence || "-",
      "الرصيد المتاح (ج.م)": c.totalBalance,
      "حصص السلال المتاحة": c.foodBasketsQuota,
      "الحالة الاجتماعية": c.socialStatus || "-",
      "حالة الكارت": c.status === "active" ? "نشط" : c.status === "frozen" ? "مجمد" : "منتهي",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المستفيدون والكروت");
    XLSX.writeFile(wb, `QOUT_Beneficiaries_${Date.now()}.xlsx`);
  };

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalBalanceSum = filteredCards.reduce((acc, curr) => acc + (curr.totalBalance || 0), 0);
    const totalBasketsSum = filteredCards.reduce((acc, curr) => acc + (curr.foodBasketsQuota || 0), 0);

    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    const rowsHtml = filteredCards
      .map(
        (c, idx) => {
          const st = getCardRecipientDetails(c, selectedMonth, selectedYear);
          const stText = st.hasReceived 
            ? `استلم ${st.latestDate ? `(يوم ${st.latestDate.getDate()})` : ""}`
            : "لم يستلم";

          return `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold;">${c.cardId}</td>
        <td style="font-weight: 800; color: #0f172a;">${c.beneficiaryName}</td>
        <td style="font-family: monospace; direction: ltr; text-align: right;">${formatId(c.nationalId)}</td>
        <td>${c.nationality || "-"}</td>
        <td style="text-align: center; font-weight: bold;">${c.familyCount || 4} أفراد</td>
        <td>${c.residence || "-"}</td>
        <td style="font-weight: 800; color: #0A734D;">${(c.totalBalance || 0).toLocaleString()} ج.م</td>
        <td style="font-weight: 800; color: #b45309; text-align: center;">${c.foodBasketsQuota}</td>
        <td style="text-align: center; font-weight: 800; color: ${st.hasReceived ? "#0A734D" : "#dc2626"};">${stText}</td>
        <td style="text-align: center;">${c.status === "active" ? "نشط" : "غير نشط"}</td>
      </tr>
    `;
        }
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف المستفيدين وحالة الاستلام الشهري - مؤسسة الفجر الخيرية</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #0f172a; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0A734D; padding-bottom: 12px; margin-bottom: 16px; }
          .brand-title { font-size: 20px; font-weight: 900; color: #0A734D; margin: 0; }
          .brand-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
          .meta-box { text-align: left; font-size: 11px; color: #475569; }
          .meta-box span { font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background-color: #0A734D; color: #ffffff; padding: 7px 5px; text-align: right; border: 1px solid #064E3B; font-weight: 700; }
          td { padding: 5px; border: 1px solid #e2e8f0; text-align: right; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .summary-bar { margin-top: 14px; display: flex; justify-content: space-between; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 14px; font-size: 11.5px; font-weight: bold; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">مؤسسة الفجر الخيرية (Al-Fajr Foundation)</h1>
            <p class="brand-sub">كشف المستفيدين المعتمدين وتتبع الاستلام لشهر (${monthNamesAr[selectedMonth]} ${selectedYear})</p>
          </div>
          <div class="meta-box">
            <div>تاريخ التقرير: <span>${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div>الحالات المدرجة: <span>${filteredCards.length} مستفيد</span></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>رقم الكارت</th>
              <th>اسم المستفيد</th>
              <th>رقم البطاقة</th>
              <th>الجنسية</th>
              <th>أفراد الأسرة</th>
              <th>محل الإقامة</th>
              <th>الرصيد النقدي</th>
              <th>حصص السلال</th>
              <th style="text-align: center;">حالة الاستلام</th>
              <th style="text-align: center;">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="summary-bar">
          <div>إجمالي الحالات: <span>${filteredCards.length} حالة</span></div>
          <div>المستلمون لشهر ${monthNamesAr[selectedMonth]}: <span style="color: #0A734D;">${receivedThisMonthCount} حالة (${coverageRate}%)</span></div>
          <div>إجمالي الأرصدة المتاحة: <span style="color: #0A734D;">${totalBalanceSum.toLocaleString()} ج.م</span></div>
          <div>إجمالي السلال: <span style="color: #b45309;">${totalBasketsSum.toLocaleString()} سلة</span></div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const monthNames = isAr
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 left-6 z-[120] px-4 py-3 rounded-2xl bg-[#0A734D] text-white font-black text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 tracking-tight flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#0A734D]" />
            <span>{isAr ? "المستفيدون والكروت الإغاثية" : "Beneficiaries & Aid Cards"}</span>
            <span className="text-xs sm:text-sm font-black px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {cards.length} {isAr ? "حالة مسجلة" : "cases"}
            </span>
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            {isAr
              ? "مؤسسة الفجر الخيرية | إدارة الحالات المعتمدة، تتبع الاستلام الشهري، وملفات المستفيدين 360°"
              : "Al-Fajr Foundation | Beneficiary cases, monthly receipt tracking, and 360° profiles"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="btn btn-sm btn-secondary font-black flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{t("export_excel")}</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="btn btn-sm bg-[#0A734D] hover:bg-[#085E3E] text-white font-black flex items-center gap-2 shadow-md shadow-emerald-950/15"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>{isAr ? "طباعة / تصدير PDF رسمي" : "Export Official PDF"}</span>
          </button>
        </div>
      </div>

      {/* ── Monthly Receipt Summary Strip (New Smart Feature) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-500 block">
              {isAr ? `المستلمون لشهر (${monthNames[selectedMonth]})` : `Received (${monthNames[selectedMonth]})`}
            </span>
            <span className="text-2xl font-black text-emerald-800 font-mono mt-0.5 inline-block">
              {receivedThisMonthCount}
            </span>
            <span className="text-xs text-slate-400 font-bold ms-1.5 font-mono">
              / {totalCardsCount} {isAr ? "حالة" : "cases"}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-500 block">
              {isAr ? `لم يستلموا بعد (${monthNames[selectedMonth]})` : `Not Received (${monthNames[selectedMonth]})`}
            </span>
            <span className="text-2xl font-black text-red-600 font-mono mt-0.5 inline-block">
              {notReceivedThisMonthCount}
            </span>
            <span className="text-xs text-slate-400 font-bold ms-1.5">
              {isAr ? "بانتظار الصرف" : "pending"}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-500 block">
              {isAr ? "نسبة تغطية الصرف الشهري" : "Monthly Coverage Rate"}
            </span>
            <span className="text-2xl font-black text-emerald-800 font-mono mt-0.5 inline-block">
              {coverageRate}%
            </span>
            <span className="text-xs text-emerald-700 font-bold ms-1.5">
              {coverageRate >= 75 ? (isAr ? "🟢 ممتاز" : "Optimal") : (isAr ? "🟡 قيد المتابعة" : "In Progress")}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold font-mono text-sm">
            {coverageRate}%
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-500 block">
              {isAr ? "الحالات المتخلفة (+60 يوم)" : "Dormant Cases (+60d)"}
            </span>
            <span className="text-2xl font-black text-amber-700 font-mono mt-0.5 inline-block">
              {cards.filter((c) => {
                const st = getCardRecipientDetails(c);
                return st.daysSinceLast === null || st.daysSinceLast >= 60;
              }).length}
            </span>
            <span className="text-xs text-slate-400 font-bold ms-1.5">
              {isAr ? "حالة حرجة" : "dormant"}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? "بحث باسم المستفيد، رقم الكارت، رقم البطاقة، أو محل السكن..." : "Search by name, card, ID, residence..."}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>

          {/* Month & Year Picker */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative min-w-[130px] flex-1 lg:flex-initial">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="qout-select text-xs font-black py-2.5 pl-9 pr-3.5 w-full"
              >
                {monthNames.map((mName, idx) => (
                  <option key={idx} value={idx}>
                    📅 {mName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[100px] flex-1 lg:flex-initial">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="qout-select text-xs font-black py-2.5 pl-9 pr-3.5 w-full font-mono"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Second Filter Row */}
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-100">
          {/* Recipient Status Filter Dropdown (CORE NEW FEATURE) */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <select
              value={selectedRecipientFilter}
              onChange={(e) => {
                setSelectedRecipientFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="qout-select text-xs font-black py-2.5 pl-9 pr-3.5 bg-emerald-50/60 border-emerald-300 text-emerald-950 font-bold"
            >
              <option value="all">{isAr ? "📋 كل حالات الاستلام" : "📋 All Receipt Statuses"}</option>
              <option value="received_this_month">{isAr ? `✅ استلموا شهر (${monthNames[selectedMonth]})` : `✅ Received (${monthNames[selectedMonth]})`}</option>
              <option value="not_received_this_month">{isAr ? `❌ لم يستلموا شهر (${monthNames[selectedMonth]})` : `❌ Not Received (${monthNames[selectedMonth]})`}</option>
              <option value="received_last_month">{isAr ? "📅 استلموا الشهر السابق" : "📅 Received Last Month"}</option>
              <option value="dormant">{isAr ? "⚠️ متخلفون عن الاستلام (+60 يوم)" : "⚠️ Dormant Cases (+60d)"}</option>
            </select>
          </div>

          {/* Nationality Filter */}
          <div className="relative min-w-[150px] flex-1 sm:flex-initial">
            <select
              value={selectedNationality}
              onChange={(e) => {
                setSelectedNationality(e.target.value);
                setCurrentPage(1);
              }}
              className="qout-select text-xs font-black py-2.5 pl-9 pr-3.5"
            >
              <option value="all">{isAr ? "🌍 جميع الجنسيات" : "🌍 All Nationalities"}</option>
              <option value="سورية">{isAr ? "🇸🇾 سورية" : "🇸🇾 Syrian"}</option>
              <option value="سودانية">{isAr ? "🇸🇩 سودانية" : "🇸🇩 Sudanese"}</option>
              <option value="يمنية">{isAr ? "🇾🇪 يمنية" : "🇾🇪 Yemeni"}</option>
              <option value="مصرية">{isAr ? "🇪🇬 مصرية" : "🇪🇬 Egyptian"}</option>
              <option value="فلسطينية">{isAr ? "🇵🇸 فلسطينية" : "🇵🇸 Palestinian"}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[150px] flex-1 sm:flex-initial">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="qout-select text-xs font-black py-2.5 pl-9 pr-3.5"
            >
              <option value="all">{isAr ? "⚡ جميع الحالات" : "⚡ All Statuses"}</option>
              <option value="active">{isAr ? "🟢 نشط (Active)" : "🟢 Active"}</option>
              <option value="frozen">{isAr ? "🔵 مجمّد (Frozen)" : "🔵 Frozen"}</option>
              <option value="expired">{isAr ? "⚪ منتهي (Expired)" : "⚪ Expired"}</option>
            </select>
          </div>

          {/* Active Filter Counter Chip */}
          <span className="text-xs font-bold text-slate-500 ms-auto">
            {isAr ? `مطابق للبحث والفلترة: ${filteredCards.length} حالة` : `Matching: ${filteredCards.length} cases`}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-800 text-start">
            <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
              <tr>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "رقم الكارت" : "Card ID"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "اسم المستفيد (البروفايل)" : "Beneficiary Name"}</th>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "رقم الهوية / الجواز" : "National ID"}</th>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "الجنسية" : "Nationality"}</th>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "أفراد الأسرة" : "Family Size"}</th>
                <th className="py-3.5 px-4 text-start whitespace-nowrap">{isAr ? "محل الإقامة" : "Residence"}</th>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "رصيد المشتريات" : "Cash Balance"}</th>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "حصص السلال" : "Baskets Quota"}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap bg-emerald-50/40 text-emerald-950 border-x border-emerald-100">
                  {isAr ? `استلام شهر (${monthNames[selectedMonth]})` : `Receipt Status (${monthNames[selectedMonth]})`}
                </th>
                <th className="py-3.5 px-3 text-start whitespace-nowrap">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">{isAr ? "إجراءات الإدارة" : "Admin Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-bold">
                    {isAr ? "جاري تحميل بيانات المستفيدين من مؤسسة الفجر..." : "Loading beneficiaries..."}
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-bold">
                    {isAr ? "لا توجد نتائج مطابقة للبحث والفلترة" : "No matching beneficiaries found"}
                  </td>
                </tr>
              ) : (
                paginatedCards.map((card) => {
                  const receiptStatus = getCardRecipientDetails(card, selectedMonth, selectedYear);

                  return (
                    <tr key={card.cardId} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Card ID (Clickable to Profile) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <a
                          href={`/dashboard/beneficiaries/${card.cardId}`}
                          className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 inline-block shadow-2xs hover:bg-emerald-100 transition-colors"
                          title={isAr ? "عرض ملف المستفيد الشامل (360°)" : "View 360° Profile"}
                        >
                          {card.cardId}
                        </a>
                      </td>

                      {/* 2. Beneficiary Name (Clickable link to Profile) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <a
                          href={`/dashboard/beneficiaries/${card.cardId}`}
                          className="font-black text-slate-950 text-sm hover:text-[#0A734D] transition-colors flex items-center gap-1.5 group"
                          title={isAr ? "فتح بروفايل المستفيد" : "Open Profile"}
                        >
                          <span>{card.beneficiaryName}</span>
                          <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold">↗</span>
                        </a>
                      </td>

                      {/* 3. National ID / Passport */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 inline-block shadow-2xs">
                          {formatId(card.nationalId)}
                        </span>
                      </td>

                      {/* 4. Nationality */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-black border border-slate-200 shadow-2xs">
                          {card.nationality || (isAr ? "سورية" : "Syrian")}
                        </span>
                      </td>

                      {/* 5. Family Members */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-black shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span>{card.familyCount || 4} {isAr ? "أفراد" : "members"}</span>
                        </span>
                      </td>

                      {/* 6. Residence */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{card.residence || (isAr ? "الروضة" : "Rawdah")}</span>
                        </div>
                      </td>

                      {/* 7. Cash Balance */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-black text-[#0A734D] font-mono text-sm">
                          {(card.totalBalance || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}
                        </span>
                      </td>

                      {/* 8. Food Baskets Quota */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-950 border border-amber-300 font-black text-xs font-mono shadow-2xs">
                          {card.foodBasketsQuota || 0} {isAr ? "سلة" : "baskets"}
                        </span>
                      </td>

                      {/* 9. Receipt Status for the selected month (NEW COLUMN) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap bg-emerald-50/20 border-x border-emerald-100">
                        {receiptStatus.hasReceived ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{isAr ? "تم الاستلام" : "Received"}</span>
                            </span>
                            {receiptStatus.latestDate && (
                              <span className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">
                                {receiptStatus.latestDate.getDate()} {monthNames[receiptStatus.latestDate.getMonth()]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300 text-[11px] font-black">
                              <X className="w-3 h-3 text-red-600" />
                              <span>{isAr ? "لم يستلم بعد" : "Not Received"}</span>
                            </span>
                            {receiptStatus.daysSinceLast !== null && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {isAr ? `(منذ ${receiptStatus.daysSinceLast} يوم)` : `(${receiptStatus.daysSinceLast}d ago)`}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 10. Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-xs font-black px-2.5 py-1 rounded-full shadow-2xs ${
                            card.status === "active"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : card.status === "frozen"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-red-100 text-red-900 border border-red-300"
                          }`}
                        >
                          {card.status === "active" ? (isAr ? "نشط" : "Active") : card.status === "frozen" ? (isAr ? "مجمد" : "Frozen") : (isAr ? "منتهي" : "Expired")}
                        </span>
                      </td>

                      {/* 11. Actions (Deliver, QR, Edit, and Profile) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[220px]">
                        <div className="flex items-center justify-center gap-2">
                          {/* 360° Profile Button */}
                          <a
                            href={`/dashboard/beneficiaries/${card.cardId}`}
                            title={isAr ? "عرض ملف المستفيد الشامل (360°)" : "View 360° Profile"}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0A734D] transition-all border border-emerald-200 cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-4 h-4" />
                          </a>

                          {/* Deliver Basket Button */}
                          <button
                            onClick={() => {
                              setDistributeCard(card);
                              setDistributeCount(Math.min(1, card.foodBasketsQuota || 1));
                            }}
                            disabled={(card.foodBasketsQuota || 0) <= 0}
                            title={isAr ? "تسليم سلة غذائية (الإدارة)" : "Distribute Food Basket"}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:hover:bg-amber-500 text-white transition-all shadow-xs flex items-center gap-1 text-xs font-black cursor-pointer disabled:cursor-not-allowed"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>{isAr ? "سلة" : "Deliver"}</span>
                          </button>

                          {/* View QR */}
                          <button
                            onClick={() => setActiveCard(card)}
                            title={isAr ? "عرض وتحميل الكود الرقمي" : "View QR"}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Edit Card */}
                          <button
                            onClick={() => {
                              setEditingCard(card);
                              setEditBalance(card.totalBalance);
                              setEditQuota(card.foodBasketsQuota);
                              setEditFamilyCount(card.familyCount || 4);
                              setEditResidence(card.residence || "");
                              setEditStatus(card.status);
                            }}
                            title={isAr ? "تعديل البيانات والأسرة" : "Edit Card"}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
                          >
                            <Edit className="w-4 h-4" />
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

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>
            {isAr
              ? `عرض ${(currentPage - 1) * itemsPerPage + 1} إلى ${Math.min(currentPage * itemsPerPage, filteredCards.length)} من أصل ${filteredCards.length} حالة`
              : `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredCards.length)} of ${filteredCards.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 font-black cursor-pointer"
            >
              {isAr ? "السابق" : "Prev"}
            </button>
            <span className="px-3 py-1.5 font-black text-slate-900 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 font-black cursor-pointer"
            >
              {isAr ? "التالي" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* ── PORTAL: Distribute Basket Modal ─────────────────────────────── */}
      {mounted && distributeCard && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setDistributeCard(null)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Banner */}
            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-13 h-13 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                <PackageCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
                  {isAr ? "تسليم سلة غذائية (مركز التوزيع الإداري)" : "Handover Food Basket (Admin)"}
                </h3>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  {isAr ? "صرف عيني مباشر وتوثيق فوري في المنظومة" : "Direct handover and live quota deduction"}
                </p>
              </div>
            </div>

            {/* Beneficiary Info Card (Original Clean Style with Tight Key-Value Alignment & No Spaces in ID) */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 mb-5 space-y-3">
              {/* Row 1: Beneficiary Name */}
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-slate-500 w-32 shrink-0">{isAr ? "المستفيد:" : "Beneficiary:"}</span>
                <span className="text-sm font-black text-slate-950">{distributeCard.beneficiaryName}</span>
              </div>

              {/* Row 2: Card & National ID (No spaces) */}
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-slate-500 w-32 shrink-0">{isAr ? "رقم الكارت والبطاقة:" : "Card & National ID:"}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#0A734D] bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                    {distributeCard.cardId}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {formatId(distributeCard.nationalId)}
                  </span>
                </div>
              </div>

              {/* Row 3: Family & Residence */}
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-slate-500 w-32 shrink-0">{isAr ? "الأسرة ومحل الإقامة:" : "Family & Residence:"}</span>
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="text-blue-700 font-black">{distributeCard.familyCount || 4} {isAr ? "أفراد" : "members"}</span>
                  <span className="text-slate-300">•</span>
                  <span>{distributeCard.residence || (isAr ? "الرياض" : "Riyadh")}</span>
                </div>
              </div>

              {/* Row 4: Quota Remaining */}
              <div className="flex items-center gap-4 text-xs pt-3 border-t border-slate-200">
                <span className="font-black text-slate-700 w-32 shrink-0">{isAr ? "الحصص المتاحة حالياً:" : "Available Quota:"}</span>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-950 font-black text-xs border border-amber-300">
                  {distributeCard.foodBasketsQuota || 0} {isAr ? "سلة متبقية" : "baskets left"}
                </span>
              </div>
            </div>

            {/* Form Fields (High Contrast) */}
            <div className="space-y-4 text-xs font-bold">
              {/* Basket Quantity (Clean Presets + Centered Compact Stepper) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>{isAr ? "عدد السلال المراد تسليمها" : "Quantity to Handover"}</span>
                  </label>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                    {distributeCount} {isAr ? "سلة محددة" : "selected"}
                  </span>
                </div>

                {/* Quick Presets (4 Pills) */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[1, 2, 5].map((qty) => {
                    const isAvailable = qty <= (distributeCard.foodBasketsQuota || 0);
                    return (
                      <button
                        key={qty}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setDistributeCount(qty)}
                        className={`py-2 px-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          distributeCount === qty
                            ? "bg-[#0A734D] text-white border-[#0A734D] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{qty} {isAr ? "سلة" : "bsk"}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setDistributeCount(distributeCard.foodBasketsQuota || 1)}
                    disabled={(distributeCard.foodBasketsQuota || 0) <= 0}
                    className={`py-2 px-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                      distributeCount === (distributeCard.foodBasketsQuota || 1) && distributeCount > 5
                        ? "bg-[#0A734D] text-white border-[#0A734D] shadow-sm"
                        : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAr ? "الكل" : "All"}</span>
                  </button>
                </div>

                {/* Centered Connected Stepper Control */}
                <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    {/* Minus button */}
                    <button
                      type="button"
                      onClick={() => setDistributeCount((c) => Math.max(1, c - 1))}
                      disabled={distributeCount <= 1}
                      className="w-11 h-11 rounded-xl bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-30 font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs active:scale-95"
                      title={isAr ? "إنقاص سلة" : "Decrease"}
                    >
                      <Minus className="w-5 h-5 text-slate-700" />
                    </button>

                    {/* Middle number box (Expanded & Fully Visible for Multi-Digit Numbers) */}
                    <div className="flex items-center justify-center gap-2 bg-white border-2 border-slate-300 rounded-2xl px-5 py-2 shadow-2xs focus-within:border-[#0A734D] focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all min-w-[170px]">
                      <input
                        type="number"
                        min={1}
                        max={distributeCard.foodBasketsQuota || 1}
                        value={distributeCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const max = distributeCard.foodBasketsQuota || 1;
                          setDistributeCount(Math.min(Math.max(1, val), max));
                        }}
                        className="w-24 text-center font-black text-2xl text-slate-950 font-mono focus:outline-none bg-transparent p-0"
                      />
                      <span className="text-sm font-black text-slate-700 select-none whitespace-nowrap">
                        {isAr ? "سلة" : "baskets"}
                      </span>
                    </div>

                    {/* Plus button */}
                    <button
                      type="button"
                      onClick={() => setDistributeCount((c) => Math.min((distributeCard.foodBasketsQuota || 1), c + 1))}
                      disabled={distributeCount >= (distributeCard.foodBasketsQuota || 1)}
                      className="w-11 h-11 rounded-xl bg-[#0A734D] hover:bg-[#085e3e] text-white disabled:opacity-30 font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm active:scale-95 border-2 border-emerald-700"
                      title={isAr ? "زيادة سلة" : "Increase"}
                    >
                      <Plus className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-bold mt-2">
                    {isAr ? `(الحد الأقصى المتاح للصرف: ${distributeCard.foodBasketsQuota || 0} سلة)` : `(Max available: ${distributeCard.foodBasketsQuota || 0})`}
                  </span>
                </div>
              </div>

              {/* Center */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{isAr ? "مركز / مقر التوزيع" : "Distribution Center"}</span>
                </label>
                <select
                  value={distributionCenter}
                  onChange={(e) => setDistributionCenter(e.target.value)}
                  className="qout-select text-xs lg:text-sm font-black py-3"
                >
                  <option value="المقر الرئيسي - مركز توزيع الروضة">المقر الرئيسي - مركز توزيع الروضة</option>
                  <option value="مركز التوزيع الميداني - العزيزية">مركز التوزيع الميداني - العزيزية</option>
                  <option value="مستودع الإغاثة المركزي - الملز">مستودع الإغاثة المركزي - الملز</option>
                  <option value="فرع الجمعية - جدة الصفا">فرع الجمعية - جدة الصفا</option>
                  <option value="مركز التوزيع الساحلي - الدمام">مركز التوزيع الساحلي - الدمام</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>{isAr ? "ملاحظات التسليم (اختياري)" : "Handover Notes (Optional)"}</span>
                </label>
                <input
                  type="text"
                  value={distributeNotes}
                  onChange={(e) => setDistributeNotes(e.target.value)}
                  placeholder={isAr ? "مثال: تم تسليم السلة لرب الأسرة بموجب بطاقة الهوية" : "e.g. Handed over to family head..."}
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-300 text-slate-950 font-bold text-xs lg:text-sm focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setDistributeCard(null)}
                  className="btn py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs lg:text-sm border border-slate-300 transition-all"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={distributing}
                  onClick={handleConfirmDistribution}
                  className="btn py-3 px-6 rounded-xl bg-[#0A734D] hover:bg-[#085E3E] text-white font-black text-xs lg:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
                >
                  <PackageCheck className="w-4 h-4 text-amber-300" />
                  <span>{distributing ? (isAr ? "جاري التسليم..." : "Delivering...") : (isAr ? "تأكيد تسليم السلال" : "Confirm Handover")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── PORTAL: Edit Card Modal (Ultra High Clarity & Contrast) ───────── */}
      {mounted && editingCard && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingCard(null)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Banner */}
            <div className="flex items-center gap-3.5 pb-4 border-b-2 border-slate-100 mb-5">
              <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 flex-shrink-0">
                <Edit3 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
                  {isAr ? "تعديل بيانات المستفيد والبطاقة" : "Edit Beneficiary & Card"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-black text-[#0A734D] bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                    {editingCard.cardId}
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {editingCard.beneficiaryName}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields with High Contrast & Icons */}
            <div className="space-y-4 text-xs font-bold">
              {/* Family Count */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>{isAr ? "عدد أفراد الأسرة" : "Family Members Count"}</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editFamilyCount}
                  onChange={(e) => setEditFamilyCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-300 text-slate-950 font-black text-sm focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Residence */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-1.5">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{isAr ? "محل السكن / مكان الإقامة" : "Residence / Address"}</span>
                </label>
                <input
                  type="text"
                  value={editResidence}
                  onChange={(e) => setEditResidence(e.target.value)}
                  placeholder={isAr ? "مثال: الرياض - حي الروضة" : "e.g. Riyadh - Rawdah"}
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-300 text-slate-950 font-bold text-sm focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Cash Balance */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? "الرصيد النقدي للمشتريات (ج.م)" : "Cash Balance (EGP)"}</span>
                </label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-300 text-slate-950 font-black text-sm font-mono focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Food Baskets Quota */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>{isAr ? "حصص السلال الغذائية المتاحة للتوزيع" : "Food Baskets Quota"}</span>
                </label>
                <input
                  type="number"
                  value={editQuota}
                  onChange={(e) => setEditQuota(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-slate-300 text-slate-950 font-black text-sm font-mono focus:border-[#0A734D] focus:ring-4 focus:ring-emerald-500/15 focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>{isAr ? "حالة الكارت" : "Card Status"}</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="qout-select text-sm font-black py-3"
                >
                  <option value="active">{isAr ? "نشط (Active)" : "Active"}</option>
                  <option value="frozen">{isAr ? "مجمّد مؤقتاً (Frozen)" : "Frozen"}</option>
                  <option value="expired">{isAr ? "منتهي (Expired)" : "Expired"}</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="btn py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs lg:text-sm border border-slate-300 transition-all"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="btn py-3 px-6 rounded-xl bg-[#0A734D] hover:bg-[#085E3E] text-white font-black text-xs lg:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── PORTAL: QR Code Modal ───────────────────────────────────────── */}
      {mounted && activeCard && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border-2 border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveCard(null)}
              className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-3 border-b-2 border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-950 leading-tight">{activeCard.beneficiaryName}</h3>
              <p className="text-xs text-[#0A734D] font-mono font-black mt-1 bg-emerald-50 py-0.5 px-3 rounded-full border border-emerald-200 inline-block">{activeCard.cardId}</p>
            </div>

            <div
              ref={qrCanvasContainerRef}
              className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col items-center justify-center mb-4 shadow-inner"
            >
              <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 mb-3 flex items-center justify-center">
                <QRCodeCanvas value={activeCard.cardId} size={190} level="H" includeMargin={true} />
              </div>
              <div className="font-mono text-sm font-black text-slate-950 tracking-wider mb-1">
                {activeCard.cardId}
              </div>
              <div
                dir="ltr"
                className="text-xs text-slate-900 font-mono font-bold bg-white border border-slate-200 px-3 py-1 rounded-md inline-block shadow-xs"
                style={{ unicodeBidi: "isolate" }}
              >
                {formatId(activeCard.nationalId)}
              </div>
              <div className="mt-2.5 text-[11px] text-emerald-900 font-black bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                {isAr ? "مؤسسة الفجر الخيرية المعتمدة" : "Verified Al-Fajr Foundation Aid Card"}
              </div>
            </div>

            <button
              onClick={handleDownloadQrPng}
              className="btn w-full bg-[#0A734D] hover:bg-[#085E3E] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 text-sm"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>{t("download_qr")}</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
