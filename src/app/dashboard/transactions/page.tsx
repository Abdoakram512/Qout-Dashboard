"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { RedemptionTransaction, BasketDistribution } from "@/types";
import {
  ReceiptText, Search, FileSpreadsheet, Printer,
  CreditCard, PackageCheck, Store, UserCheck, Calendar,
  Clock, MapPin, Users, CheckCircle2, ArrowDownRight,
  TrendingUp, Sparkles, Filter, ChevronRight, ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function TransactionsPage() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<"baskets" | "cash">("baskets");
  const [cashTxns, setCashTxns] = useState<RedemptionTransaction[]>([]);
  const [basketDists, setBasketDists] = useState<BasketDistribution[]>([]);
  const [loadingCash, setLoadingCash] = useState(true);
  const [loadingBaskets, setLoadingBaskets] = useState(true);
  const [search, setSearch] = useState("");

  // 1. Fetch Cash Redemptions
  useEffect(() => {
    const q = query(collection(db, "redemptions"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: RedemptionTransaction[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RedemptionTransaction);
      });
      setCashTxns(list);
      setLoadingCash(false);
    });
    return () => unsub();
  }, []);

  // 2. Fetch Basket Distributions
  useEffect(() => {
    const q = query(collection(db, "basket_distributions"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: BasketDistribution[] = [];
      snap.forEach((d) => {
        list.push({ distributionId: d.id, ...d.data() } as BasketDistribution);
      });
      setBasketDists(list);
      setLoadingBaskets(false);
    });
    return () => unsub();
  }, []);

  const formatTime = (ts: any) => {
    if (!ts) return "—";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // Filtered Cash Txns
  const filteredCash = cashTxns.filter(
    (x) =>
      x.beneficiaryName?.toLowerCase().includes(search.toLowerCase()) ||
      x.cardId?.toLowerCase().includes(search.toLowerCase()) ||
      x.merchantStoreName?.toLowerCase().includes(search.toLowerCase()) ||
      x.city?.toLowerCase().includes(search.toLowerCase())
  );

  // Filtered Basket Dists
  const filteredBaskets = basketDists.filter(
    (x) =>
      x.beneficiaryName?.toLowerCase().includes(search.toLowerCase()) ||
      x.cardId?.toLowerCase().includes(search.toLowerCase()) ||
      x.distributionCenter?.toLowerCase().includes(search.toLowerCase()) ||
      x.residence?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCashAmount = filteredCash.reduce((acc, curr) => acc + (curr.amountDeducted || 0), 0);
  const totalBasketsDelivered = filteredBaskets.reduce((acc, curr) => acc + (curr.basketsCount || 0), 0);

  // Export Excel
  const handleExportExcel = () => {
    if (activeTab === "cash") {
      const rows = filteredCash.map((x, idx) => ({
        "م": idx + 1,
        "رقم العملية": x.id,
        "رقم الكارت": x.cardId,
        "المستفيد": x.beneficiaryName,
        "منفذ الصرف (الصراف)": x.merchantStoreName,
        "المبلغ المخصوم (ج.م)": (x.amountDeducted ?? x.amount ?? 0),
        "المدينة / الفرع": x.city || "—",
        "التاريخ والوقت": formatTime(x.timestamp),
        "ملاحظات": x.notes || "—",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "عمليات الصرف المالي");
      XLSX.writeFile(wb, `QOUT_Cash_Redemptions_${Date.now()}.xlsx`);
    } else {
      const rows = filteredBaskets.map((x, idx) => ({
        "م": idx + 1,
        "رقم حركة التسليم": x.distributionId,
        "رقم الكارت": x.cardId,
        "المستفيد": x.beneficiaryName,
        "أفراد الأسرة": x.familyCount || 4,
        "محل الإقامة": x.residence || "—",
        "عدد السلال المسلمة": x.basketsCount,
        "الحصص المتبقية بعدها": x.remainingBasketsAfter,
        "المشرف المسؤول": x.distributedBy?.adminName || "—",
        "مركز التوزيع": x.distributionCenter,
        "التاريخ والوقت": formatTime(x.timestamp),
        "ملاحظات": x.notes || "—",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تسليم السلال الغذائية");
      XLSX.writeFile(wb, `QOUT_Basket_Distributions_${Date.now()}.xlsx`);
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    if (activeTab === "cash") {
      const rowsHtml = filteredCash
        .map(
          (x, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold;">${x.id}</td>
          <td style="font-family: monospace;">${x.cardId}</td>
          <td style="font-weight: 800; color: #0f172a;">${x.beneficiaryName}</td>
          <td style="font-weight: bold; color: #334155;">${x.merchantStoreName}</td>
          <td style="font-weight: 800; color: #0A734D; text-align: left; font-family: monospace;">${((x.amountDeducted ?? x.amount ?? 0) || 0).toLocaleString()} ج.م</td>
          <td>${x.city || "—"}</td>
          <td style="font-size: 10px; color: #64748b;">${formatTime(x.timestamp)}</td>
          <td style="text-align: center;"><span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold;">مؤكدة</span></td>
        </tr>
      `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>سجل عمليات الصرف المالي - منظومة قُوت</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0A734D; padding-bottom: 12px; margin-bottom: 16px; }
            .brand-title { font-size: 20px; font-weight: 900; color: #0A734D; margin: 0; }
            .brand-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
            .meta-box { text-align: left; font-size: 11px; color: #475569; }
            .meta-box span { font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
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
              <h1 class="brand-title">منظومة قُوت الإغاثية (QOUT)</h1>
              <p class="brand-sub">كشف سجل الصرف المالي عبر شبكة المنافذ والمتاجر المعتمدة</p>
            </div>
            <div class="meta-box">
              <div>تاريخ التقرير: <span>${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span></div>
              <div>إجمالي العمليات: <span>${filteredCash.length} عملية</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>رقم الحركة</th>
                <th>رقم الكارت</th>
                <th>اسم المستفيد</th>
                <th>منفذ الصرف (المتجر)</th>
                <th>المبلغ المنصرف</th>
                <th>المدينة / الفرع</th>
                <th>التاريخ والوقت</th>
                <th style="text-align: center;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary-bar">
            <div>إجمالي العمليات المنفذة: <span>${filteredCash.length} عملية صرف</span></div>
            <div>إجمالي المبالغ المنصرفة: <span style="color: #0A734D;">${totalCashAmount.toLocaleString()} ج.م</span></div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 500); };
          </script>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      const rowsHtml = filteredBaskets
        .map(
          (x, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold;">${x.distributionId}</td>
          <td style="font-family: monospace;">${x.cardId}</td>
          <td style="font-weight: 800; color: #0f172a;">${x.beneficiaryName}</td>
          <td style="text-align: center; font-weight: bold;">${x.familyCount || 4} أفراد</td>
          <td>${x.residence || "—"}</td>
          <td style="font-weight: 800; color: #b45309; text-align: center; font-size: 12px;">${x.basketsCount} سلة</td>
          <td style="text-align: center; font-family: monospace;">${x.remainingBasketsAfter}</td>
          <td>${x.distributionCenter}</td>
          <td style="font-size: 10px; color: #64748b;">${formatTime(x.timestamp)}</td>
          <td style="text-align: center;"><span style="background: #fef3c7; color: #78350f; padding: 2px 6px; border-radius: 4px; font-weight: bold;">تم التسليم</span></td>
        </tr>
      `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>سجل تسليم السلال الغذائية - منظومة قُوت</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #b45309; padding-bottom: 12px; margin-bottom: 16px; }
            .brand-title { font-size: 20px; font-weight: 900; color: #b45309; margin: 0; }
            .brand-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
            .meta-box { text-align: left; font-size: 11px; color: #475569; }
            .meta-box span { font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #b45309; color: #ffffff; padding: 7px 5px; text-align: right; border: 1px solid #78350f; font-weight: 700; }
            td { padding: 5px; border: 1px solid #e2e8f0; text-align: right; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .summary-bar { margin-top: 14px; display: flex; justify-content: space-between; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 8px 14px; font-size: 11.5px; font-weight: bold; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand-title">منظومة قُوت الإغاثية (QOUT)</h1>
              <p class="brand-sub">كشف سجل تسليم وتوزيع السلال الغذائية عبر الإدارة ومراكز التوزيع</p>
            </div>
            <div class="meta-box">
              <div>تاريخ التقرير: <span>${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span></div>
              <div>إجمالي الحركات: <span>${filteredBaskets.length} حركة تسليم</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>رقم التسليم</th>
                <th>رقم الكارت</th>
                <th>اسم المستفيد</th>
                <th>أفراد الأسرة</th>
                <th>محل الإقامة</th>
                <th>السلال المسلمة</th>
                <th>المتبقي</th>
                <th>مركز التوزيع</th>
                <th>التاريخ والوقت</th>
                <th style="text-align: center;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary-bar">
            <div>إجمالي عمليات التسليم: <span>${filteredBaskets.length} عملية</span></div>
            <div>إجمالي السلال المسلمة: <span style="color: #b45309;">${totalBasketsDelivered.toLocaleString()} سلة غذائية</span></div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 500); };
          </script>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center shadow-md shadow-emerald-950/20 flex-shrink-0">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                {isAr ? "سجل العمليات والتوزيع المركزي" : "Central Operations Log"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-slate-500 text-xs lg:text-sm font-bold mt-1">
              {isAr
                ? "متابعة دقيقة ومستقلة لعمليات الصرف المالي عبر المتاجر وتسليم السلال الغذائية عبر الإدارة"
                : "Independent tracking for merchant cash redemptions and admin food basket handovers"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="btn btn-sm btn-secondary font-black flex items-center gap-2 py-2.5 px-4 rounded-xl shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{t("export_excel")}</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="btn btn-sm bg-[#0A734D] hover:bg-[#085E3E] text-white font-black flex items-center gap-2 py-2.5 px-5 rounded-xl shadow-md shadow-emerald-950/15"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>{isAr ? "طباعة تقرير رسمي" : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Segmented Switcher */}
        <div className="w-full md:w-auto p-1.5 rounded-2xl bg-slate-200/90 border border-slate-300/80 flex items-center gap-1.5 shadow-inner">
          <button
            onClick={() => setActiveTab("baskets")}
            className={`flex-1 md:flex-initial py-2.5 px-5 rounded-xl text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2.5 whitespace-nowrap ${
              activeTab === "baskets"
                ? "bg-[#0A734D] text-white shadow-md shadow-emerald-950/20"
                : "text-slate-700 hover:text-slate-950 hover:bg-white/50"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>{isAr ? "سجل تسليم السلال (الإدارة والمراكز)" : "Admin Basket Distributions"}</span>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                activeTab === "baskets"
                  ? "bg-white/20 text-white"
                  : "bg-slate-300/80 text-slate-800"
              }`}
            >
              {basketDists.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("cash")}
            className={`flex-1 md:flex-initial py-2.5 px-5 rounded-xl text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2.5 whitespace-nowrap ${
              activeTab === "cash"
                ? "bg-[#0A734D] text-white shadow-md shadow-emerald-950/20"
                : "text-slate-700 hover:text-slate-950 hover:bg-white/50"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isAr ? "سجل الصرف المالي (المتاجر والصرافين)" : "Merchant Cash Redemptions"}</span>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                activeTab === "cash"
                  ? "bg-white/20 text-white"
                  : "bg-slate-300/80 text-slate-800"
              }`}
            >
              {cashTxns.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "baskets"
                ? (isAr ? "بحث باسم المستفيد، رقم الكارت، أو مركز التوزيع..." : "Search basket distributions...")
                : (isAr ? "بحث باسم المستفيد، رقم الكارت، أو منفذ الصرف..." : "Search cash redemptions...")
            }
            className="w-full pr-11 pl-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs lg:text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none shadow-xs transition-all"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeTab === "baskets" ? (
          <>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-amber-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-600/20">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-bold leading-tight">
                  {isAr ? "إجمالي السلال الموزعة" : "Total Delivered Baskets"}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-950 font-mono leading-none">
                    {totalBasketsDelivered.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    {isAr ? "سلة غذائية" : "baskets"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/20">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-bold leading-tight">
                  {isAr ? "حركات التسليم الموثقة" : "Delivered Cases"}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-950 font-mono leading-none">
                    {filteredBaskets.length}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {isAr ? "حركة تسليم" : "handovers"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-950/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-bold leading-tight">
                  {isAr ? "جهة التوزيع والرقابة" : "Authority"}
                </p>
                <h3 className="text-sm font-black text-slate-950 mt-1 leading-tight">
                  {isAr ? "إدارة الجمعية ومستودعات الإغاثة" : "Direct Admin Warehouses"}
                </h3>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-950/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-bold leading-tight">
                  {isAr ? "إجمالي المبالغ المنصرفة" : "Total Disbursed"}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-950 font-mono leading-none">
                    {totalCashAmount.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-emerald-800">
                    {isAr ? "ج.م" : "EGP"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/20">
                <ReceiptText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-bold leading-tight">
                  {isAr ? "عدد العمليات المنفذة" : "Total Transactions"}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-950 font-mono leading-none">
                    {filteredCash.length}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {isAr ? "عملية صرف" : "txns"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-purple-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-600/20">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-bold leading-tight">
                  {isAr ? "القناة التشغيلية" : "Channel"}
                </p>
                <h3 className="text-sm font-black text-slate-950 mt-1 leading-tight">
                  {isAr ? "شبكة المتاجر والصرافين المعتمدة" : "Authorized Merchants POS"}
                </h3>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Table with Guaranteed Single-Line Cells (No Multi-Line Wrapping) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {activeTab === "baskets" ? (
            /* ── Baskets Distribution Table ───────────────────────────── */
            <table className="w-full text-sm text-slate-800 text-start border-collapse min-w-[1050px]">
              <thead className="bg-slate-50/95 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "رقم الحركة" : "Distribution ID"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "رقم الكارت" : "Card ID"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "اسم المستفيد" : "Beneficiary"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "الأسرة ومحل الإقامة" : "Family & Residence"}</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">{isAr ? "السلال المسلمة" : "Delivered Baskets"}</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">{isAr ? "المتبقي بعدها" : "Remaining"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "مركز التوزيع والمشرف" : "Center & Admin"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ والوقت" : "Date & Time"}</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {loadingBaskets ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400 font-bold">
                      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      {isAr ? "جاري تحميل سجل توزيع السلال..." : "Loading basket distributions..."}
                    </td>
                  </tr>
                ) : filteredBaskets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400 font-bold">
                      <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      {isAr ? "لا توجد حركات تسليم سلال مطابقة" : "No basket distributions recorded"}
                    </td>
                  </tr>
                ) : (
                  filteredBaskets.map((x) => (
                    <tr key={x.distributionId} className="hover:bg-amber-50/30 transition-colors">
                      {/* Distribution ID */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block leading-none">
                          {x.distributionId}
                        </span>
                      </td>

                      {/* Card ID */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-slate-900 bg-emerald-50 text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block leading-none">
                          {x.cardId}
                        </span>
                      </td>

                      {/* Beneficiary Name (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-black text-slate-950 text-sm">
                          {x.beneficiaryName}
                        </span>
                      </td>

                      {/* Family & Residence (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black">
                            <Users className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            <span>{x.familyCount || 4} {isAr ? "أفراد" : "members"}</span>
                          </span>
                          <span className="text-slate-300 font-bold">•</span>
                          <div className="flex items-center gap-1 text-xs text-slate-700 font-bold">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{x.residence || (isAr ? "الرياض" : "Riyadh")}</span>
                          </div>
                        </div>
                      </td>

                      {/* Delivered Baskets (Single Line) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs shadow-xs">
                          <PackageCheck className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span className="font-mono">{x.basketsCount}</span>
                          <span>{isAr ? "سلة غذائية" : "baskets"}</span>
                        </span>
                      </td>

                      {/* Remaining Baskets (Single Line) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          <span className="font-mono font-black text-slate-900">{x.remainingBasketsAfter}</span>
                          <span>{isAr ? "متبقية" : "left"}</span>
                        </span>
                      </td>

                      {/* Center & Admin (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {x.distributionCenter}
                          </span>
                          <span className="text-slate-300 font-bold">•</span>
                          <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{x.distributedBy?.adminName || (isAr ? "المشرف العام" : "Admin")}</span>
                          </span>
                        </div>
                      </td>

                      {/* Date & Time (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{formatTime(x.timestamp)}</span>
                        </div>
                      </td>

                      {/* Status (Single Line) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100/90 text-amber-900 border border-amber-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span>{isAr ? "تم التسليم" : "Delivered"}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* ── Cash Redemptions Table ───────────────────────────────── */
            <table className="w-full text-sm text-slate-800 text-start border-collapse min-w-[1000px]">
              <thead className="bg-slate-50/95 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "رقم الحركة" : "Txn ID"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "رقم الكارت" : "Card ID"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "اسم المستفيد" : "Beneficiary"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "منفذ الصرف (الصراف)" : "Merchant Store"}</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">{isAr ? "المبلغ المخصوم" : "Deducted Amount"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "المدينة / الفرع" : "City"}</th>
                  <th className="py-4 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ والوقت" : "Date & Time"}</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {loadingCash ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 font-bold">
                      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      {isAr ? "جاري تحميل عمليات الصرف..." : "Loading transactions..."}
                    </td>
                  </tr>
                ) : filteredCash.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 font-bold">
                      <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      {isAr ? "لا توجد عمليات صرف مسجلة" : "No transactions found"}
                    </td>
                  </tr>
                ) : (
                  filteredCash.map((x) => (
                    <tr key={x.id} className="hover:bg-emerald-50/30 transition-colors">
                      {/* Txn ID */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block leading-none">
                          {x.id}
                        </span>
                      </td>

                      {/* Card ID */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-slate-900 bg-emerald-50 text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block leading-none">
                          {x.cardId}
                        </span>
                      </td>

                      {/* Beneficiary Name (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-black text-slate-950 text-sm">
                          {x.beneficiaryName}
                        </span>
                      </td>

                      {/* Merchant Store (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                          <Store className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{x.merchantStoreName}</span>
                        </div>
                      </td>

                      {/* Deducted Amount (Single Line) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-xs shadow-xs">
                          <span className="font-mono text-sm">+{((x.amountDeducted ?? x.amount ?? 0) ?? x.amount ?? 0).toLocaleString()}</span>
                          <span className="text-emerald-800 font-bold">{isAr ? "ج.م" : "EGP"}</span>
                        </span>
                      </td>

                      {/* City (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{x.city || "—"}</span>
                        </div>
                      </td>

                      {/* Date & Time (Single Line) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{formatTime(x.timestamp)}</span>
                        </div>
                      </td>

                      {/* Status (Single Line) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                          <span>{isAr ? "مكتملة ومؤكدة" : "Completed"}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
