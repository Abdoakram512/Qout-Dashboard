"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, query, where, onSnapshot, orderBy,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import {
  AidCardModel, UserModel, RedemptionTransaction, BasketDistribution,
} from "@/types";
import { QRCodeCanvas } from "qrcode.react";
import {
  Users, ArrowLeft, ArrowRight, Printer, QrCode, FileText, CheckCircle2,
  AlertCircle, Clock, Calendar, MapPin, CreditCard, PackageCheck, Store,
  Sparkles, ShieldCheck, Download, TrendingUp, Phone, Mail, FileCheck,
  HeartHandshake, ChevronRight, Activity, Hash,
} from "lucide-react";

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

export default function BeneficiaryProfilePage() {
  const params = useParams();
  const cardIdParam = Array.isArray(params?.cardId) ? params.cardId[0] : (params?.cardId as string);
  const router = useRouter();
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  const [card, setCard] = useState<AidCardModel | null>(null);
  const [beneficiaryUser, setBeneficiaryUser] = useState<UserModel | null>(null);
  const [cashTxns, setCashTxns] = useState<RedemptionTransaction[]>([]);
  const [basketDists, setBasketDists] = useState<BasketDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "calendar" | "profile">("ledger");

  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Aid Card Document
  useEffect(() => {
    if (!cardIdParam) return;
    const cleanId = decodeURIComponent(cardIdParam).trim();

    // Check direct doc reference first, or query by cardId field
    const unsubCard = onSnapshot(doc(db, "aid_cards", cleanId), async (snap) => {
      if (snap.exists()) {
        const cData = { cardId: snap.id, ...snap.data() } as AidCardModel;
        setCard(cData);

        // Fetch user data if beneficiaryId exists
        if (cData.beneficiaryId) {
          try {
            const uSnap = await getDoc(doc(db, "users", cData.beneficiaryId));
            if (uSnap.exists()) {
              setBeneficiaryUser({ uid: uSnap.id, ...uSnap.data() } as UserModel);
            }
          } catch (e) {
            console.error("Error fetching beneficiary user:", e);
          }
        }
        setLoading(false);
      } else {
        // Try querying by cardId field
        const q = query(collection(db, "aid_cards"), where("cardId", "==", cleanId));
        const unsubQ = onSnapshot(q, async (qSnap) => {
          if (!qSnap.empty) {
            const d = qSnap.docs[0];
            const cData = { cardId: d.id, ...d.data() } as AidCardModel;
            setCard(cData);
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
        return () => unsubQ();
      }
    });

    return () => unsubCard();
  }, [cardIdParam]);

  // 2. Fetch Cash Redemptions for this card
  useEffect(() => {
    if (!cardIdParam) return;
    const cleanId = decodeURIComponent(cardIdParam).trim();

    const q = query(
      collection(db, "redemptions"),
      where("cardId", "==", cleanId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: RedemptionTransaction[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RedemptionTransaction);
      });
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setCashTxns(list);
    });

    return () => unsub();
  }, [cardIdParam]);

  // 3. Fetch Basket Distributions for this card
  useEffect(() => {
    if (!cardIdParam) return;
    const cleanId = decodeURIComponent(cardIdParam).trim();

    const q = query(
      collection(db, "basket_distributions"),
      where("cardId", "==", cleanId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: BasketDistribution[] = [];
      snap.forEach((d) => {
        list.push({ distributionId: d.id, ...d.data() } as BasketDistribution);
      });
      list.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
      setBasketDists(list);
    });

    return () => unsub();
  }, [cardIdParam]);

  // Calculations
  const totalCashRedeemed = cashTxns.reduce((sum, tx) => sum + (tx.amountDeducted || tx.amount || 0), 0);
  const totalBasketsReceived = basketDists.reduce((sum, b) => sum + (b.basketsCount || 0), 0) +
    cashTxns.reduce((sum, tx) => sum + (tx.foodBasketsDeducted || 0), 0);

  // Combine cash txns and basket dists for a unified ledger
  interface UnifiedLedgerItem {
    id: string;
    type: "cash" | "basket";
    timestamp: Date;
    title: string;
    amount?: number;
    baskets?: number;
    storeOrCenter: string;
    notes?: string;
    adminOrMerchant?: string;
  }

  const unifiedLedger: UnifiedLedgerItem[] = [
    ...cashTxns.map((tx) => ({
      id: tx.id || tx.transactionId || "",
      type: "cash" as const,
      timestamp: parseDate(tx.timestamp),
      title: isAr ? "صرف نقدي من منفذ معتمد" : "Cash Redemption",
      amount: tx.amountDeducted || tx.amount || 0,
      baskets: tx.foodBasketsDeducted || 0,
      storeOrCenter: tx.merchantStoreName || (isAr ? "منفذ معتمد" : "Merchant"),
      notes: tx.notes,
      adminOrMerchant: tx.merchantName,
    })),
    ...basketDists.map((bd) => ({
      id: bd.distributionId || "",
      type: "basket" as const,
      timestamp: parseDate(bd.timestamp),
      title: isAr ? "تسليم سلة غذائية (مركز التوزيع)" : "Food Basket Handover",
      baskets: bd.basketsCount || 1,
      storeOrCenter: bd.distributionCenter || (isAr ? "المقر الرئيسي" : "Main Center"),
      notes: bd.notes,
      adminOrMerchant: bd.distributedBy?.adminName,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // 12-Month Heatmap Data for Current Year (2026)
  const currentYear = new Date().getFullYear();
  const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthlyStatusList = Array.from({ length: 12 }, (_, monthIdx) => {
    const monthTxns = cashTxns.filter((tx) => {
      const d = parseDate(tx.timestamp);
      return d.getFullYear() === currentYear && d.getMonth() === monthIdx;
    });

    const monthBaskets = basketDists.filter((b) => {
      const d = parseDate(b.timestamp);
      return d.getFullYear() === currentYear && d.getMonth() === monthIdx;
    });

    const hasCash = monthTxns.length > 0;
    const hasBasket = monthBaskets.length > 0;
    const isPast = monthIdx < new Date().getMonth();
    const isCurrent = monthIdx === new Date().getMonth();

    const totalCash = monthTxns.reduce((acc, curr) => acc + (curr.amountDeducted || curr.amount || 0), 0);
    const totalBaskets = monthBaskets.reduce((acc, curr) => acc + (curr.basketsCount || 0), 0);

    let latestDateStr = "—";
    if (monthTxns.length > 0) {
      latestDateStr = `يوم ${parseDate(monthTxns[0].timestamp).getDate()}`;
    } else if (monthBaskets.length > 0) {
      latestDateStr = `يوم ${parseDate(monthBaskets[0].timestamp).getDate()}`;
    }

    return {
      monthIdx,
      nameAr: monthNamesAr[monthIdx],
      nameEn: monthNamesEn[monthIdx],
      hasReceived: hasCash || hasBasket,
      hasCash,
      hasBasket,
      totalCash,
      totalBaskets,
      latestDateStr,
      isPast,
      isCurrent,
    };
  });

  // Official PDF Print Export
  const handlePrintStatement = () => {
    if (!card) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = unifiedLedger
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td>${item.timestamp.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
        <td style="font-weight: bold;">${item.title}</td>
        <td>${item.storeOrCenter}</td>
        <td style="font-weight: bold; color: #0A734D; text-align: left;">${item.amount ? `${item.amount.toLocaleString()} ج.م` : "—"}</td>
        <td style="text-align: center; font-weight: bold; color: #b45309;">${item.baskets ? `${item.baskets} سلة` : "—"}</td>
        <td>${item.notes || "—"}</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف حساب مستفيد رسمي - مؤسسة الفجر الخيرية</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #0f172a; background: #fff; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0A734D; padding-bottom: 12px; margin-bottom: 16px; }
          .brand-title { font-size: 20px; font-weight: 900; color: #0A734D; margin: 0; }
          .brand-sub { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
          .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
          .profile-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
          .profile-label { color: #64748b; font-weight: 700; }
          .profile-val { color: #0f172a; font-weight: 800; font-mono; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #0A734D; color: #ffffff; padding: 8px 6px; text-align: right; border: 1px solid #064E3B; font-weight: 700; }
          td { padding: 6px; border: 1px solid #e2e8f0; text-align: right; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer-box { margin-top: 24px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; padding-top: 12px; }
          .stamp-box { border: 2px dashed #0A734D; padding: 10px 20px; border-radius: 8px; text-align: center; color: #0A734D; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">مؤسسة الفجر الخيرية (Al-Fajr Foundation)</h1>
            <p class="brand-sub">كشف حساب ومتابعة الإعانات المعتمدة للمستفيد</p>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <div>تاريخ الإصدار: <b>${new Date().toLocaleDateString("ar-EG")}</b></div>
            <div>رقم الكارت: <b>${card.cardId}</b></div>
          </div>
        </div>

        <div class="profile-grid">
          <div class="profile-item"><span class="profile-label">اسم المستفيد:</span><span class="profile-val">${card.beneficiaryName}</span></div>
          <div class="profile-item"><span class="profile-label">رقم الهوية / الجواز:</span><span class="profile-val">${formatId(card.nationalId)}</span></div>
          <div class="profile-item"><span class="profile-label">الجنسية:</span><span class="profile-val">${card.nationality || "سورية"}</span></div>
          <div class="profile-item"><span class="profile-label">أفراد الأسرة:</span><span class="profile-val">${card.familyCount || 4} أفراد</span></div>
          <div class="profile-item"><span class="profile-label">الرصيد المتاح حالياً:</span><span class="profile-val" style="color: #0A734D;">${(card.totalBalance || 0).toLocaleString()} ج.م</span></div>
          <div class="profile-item"><span class="profile-label">السلال المتبقية:</span><span class="profile-val" style="color: #b45309;">${card.foodBasketsQuota || 0} سلة</span></div>
          <div class="profile-item"><span class="profile-label">إجمالي المصروف تاريخياً:</span><span class="profile-val">${totalCashRedeemed.toLocaleString()} ج.م</span></div>
          <div class="profile-item"><span class="profile-label">إجمالي السلال المستلمة:</span><span class="profile-val">${totalBasketsReceived} سلة</span></div>
        </div>

        <h3 style="font-size: 14px; font-weight: 900; margin-bottom: 6px; color: #0A734D;">سجل المعاملات والعمليات المنفذة</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>التاريخ والوقت</th>
              <th>نوع العملية</th>
              <th>المنفذ / مركز التوزيع</th>
              <th style="text-align: left;">المبلغ المخصوم</th>
              <th style="text-align: center;">السلال</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">لا توجد عمليات مسجلة حتى الآن</td></tr>'}
          </tbody>
        </table>

        <div class="footer-box">
          <div>
            <p style="margin: 0; font-weight: bold; color: #475569;">مؤسسة الفجر الخيرية - الإدارة العامة</p>
            <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 10px;">وثيقة رسمية صادرة آلياً من المنظومة المركزية وموثقة برقم مرجعي</p>
          </div>
          <div class="stamp-box">
            ختم الاعتماد الرسمي<br>
            مؤسسة الفجر
          </div>
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0A734D] text-white flex items-center justify-center font-black animate-pulse shadow-lg">
          الفجر
        </div>
        <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">{isAr ? "جاري فتح بروفايل المستفيد 360°..." : "Loading beneficiary 360° profile..."}</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto my-12">
        <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-black text-slate-900">{isAr ? "لم يتم العثور على ملف هذا المستفيد" : "Beneficiary Card Not Found"}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6 font-semibold">
          {isAr ? `تأكد من صحة رقم الكارت المكتوب: (${cardIdParam})` : `Please check the card ID: (${cardIdParam})`}
        </p>
        <button
          onClick={() => router.push("/dashboard/beneficiaries")}
          className="btn btn-sm bg-[#0A734D] text-white font-black px-5 py-2.5 rounded-xl shadow-md"
        >
          {isAr ? "العودة لجدول المستفيدين" : "Back to Beneficiaries"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/beneficiaries")}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title={isAr ? "رجوع للقائمة" : "Back"}
          >
            {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md font-mono">
                {card.cardId}
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                ID: {formatId(card.nationalId)}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight mt-0.5">
              {card.beneficiaryName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrintStatement}
            className="btn btn-sm bg-[#0A734D] hover:bg-[#085E3E] text-white font-black flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-md shadow-emerald-950/15"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>{isAr ? "طباعة كشف حساب معتمد" : "Print Official Statement"}</span>
          </button>
        </div>
      </div>

      {/* ── 1. Hero Identity & Summary Card ──────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-slate-50/70 to-emerald-50/40 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Left / Main Profile Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A734D] to-[#064E3B] text-white flex items-center justify-center font-black text-2xl shadow-md shadow-emerald-900/20 flex-shrink-0 border-2 border-amber-400">
              {card.beneficiaryName?.[0] || "م"}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-950">{card.beneficiaryName}</h2>
                <span
                  className={`inline-block text-xs font-black px-2.5 py-0.5 rounded-full ${
                    card.status === "active"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-red-100 text-red-900 border border-red-300"
                  }`}
                >
                  {card.status === "active" ? (isAr ? "🟢 مستفيد نشط" : "🟢 Active") : (isAr ? "موقوف" : "Inactive")}
                </span>
                <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  {card.nationality || (isAr ? "سورية" : "Syrian")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {card.residence || (isAr ? "الروضة" : "Rawdah")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {card.familyCount || 4} {isAr ? "أفراد بالأسرة" : "family members"}
                </span>
                {beneficiaryUser?.phone && (
                  <span className="flex items-center gap-1.5 font-mono text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {beneficiaryUser.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Digital QR Canvas Thumbnail */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs self-stretch lg:self-auto justify-between lg:justify-start">
            <div ref={qrCanvasRef} className="p-1 bg-white rounded-lg">
              <QRCodeCanvas value={card.cardId} size={64} level="H" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isAr ? "البطاقة الرقمية" : "Digital Pass"}</span>
              <span className="text-xs font-black text-slate-900 font-mono">{card.cardId}</span>
              <span className="text-[10px] font-bold text-emerald-700 mt-0.5">مؤسسة الفجر الخيرية</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Primary 4 KPIs Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "الرصيد النقدي المتاح" : "Current Cash Balance"}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0A734D] flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#0A734D] font-mono">
            {(card.totalBalance || 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{isAr ? "ج.م" : "EGP"}</span>
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-1 block">
            {isAr ? "جاهز للشراء من المنافذ" : "Available for merchant spend"}
          </span>
        </div>

        {/* Baskets Quota */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "حصص السلال الغذائية" : "Food Baskets Quota"}</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">
            {card.foodBasketsQuota || 0} <span className="text-xs text-slate-500 font-sans">{isAr ? "سلة متاحة" : "available"}</span>
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-1 block">
            {isAr ? `تم استلام ${totalBasketsReceived} سلة سابقاً` : `${totalBasketsReceived} baskets claimed`}
          </span>
        </div>

        {/* Total Cash Disbursed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "إجمالي المنصرف تاريخياً" : "Total Cash Disbursed"}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {totalCashRedeemed.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{isAr ? "ج.م" : "EGP"}</span>
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-1 block">
            {isAr ? `خلال ${cashTxns.length} عملية صرف` : `Across ${cashTxns.length} redemptions`}
          </span>
        </div>

        {/* Last Receipt Date */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500">{isAr ? "آخر عملية استلام" : "Last Redemption Date"}</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1">
            {unifiedLedger.length > 0 ? (
              unifiedLedger[0].timestamp.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            ) : (
              <span className="text-slate-400 font-normal text-sm">{isAr ? "لم يصرف بعد" : "None"}</span>
            )}
          </p>
          <span className="text-[11px] font-bold text-emerald-700 mt-1 block">
            {unifiedLedger.length > 0 ? unifiedLedger[0].storeOrCenter : "—"}
          </span>
        </div>
      </div>

      {/* ── 3. 12-Month Calendar Receipt Heatmap (SMART FEATURE) ─── */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0A734D]" />
              <span>{isAr ? `سجل وانتظام الاستلام الشهري لعام (${currentYear})` : `Monthly Receipt Calendar (${currentYear})`}</span>
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              {isAr ? "متابعة دقيقة لاستلام المستفيد في كل شهر من شهور السنة ويوم الصرف المحدد" : "Track exact disbursement status and date for each month of the year"}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
              {isAr ? "تم الاستلام" : "Received"}
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="w-3 h-3 rounded-md bg-red-400 inline-block" />
              {isAr ? "تخلف عن الصرف" : "Missed"}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded-md bg-slate-200 inline-block" />
              {isAr ? "قادم / قيد الانتظار" : "Upcoming"}
            </span>
          </div>
        </div>

        {/* 12 Months Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          {monthlyStatusList.map((m) => {
            let bgClass = "bg-slate-50 border-slate-200 text-slate-600";
            let statusBadge = isAr ? "قادم" : "Upcoming";
            let badgeClass = "bg-slate-200 text-slate-700";

            if (m.hasReceived) {
              bgClass = "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs";
              statusBadge = isAr ? `✅ استلم (${m.latestDateStr})` : `✅ Received (${m.latestDateStr})`;
              badgeClass = "bg-emerald-100 text-emerald-900 border border-emerald-300";
            } else if (m.isPast) {
              bgClass = "bg-red-50/80 border-red-200 text-red-950";
              statusBadge = isAr ? "❌ لم يستلم" : "❌ Missed";
              badgeClass = "bg-red-100 text-red-800 border border-red-200";
            } else if (m.isCurrent) {
              bgClass = "bg-amber-50/80 border-amber-300 text-amber-950 shadow-2xs";
              statusBadge = isAr ? "⏳ الشهر الحالي" : "⏳ Current Month";
              badgeClass = "bg-amber-100 text-amber-900 border border-amber-300";
            }

            return (
              <div
                key={m.monthIdx}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${bgClass}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">{isAr ? m.nameAr : m.nameEn}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{m.monthIdx + 1}</span>
                </div>

                <div className="space-y-1 my-1">
                  {m.hasCash && (
                    <div className="text-[11px] font-bold text-[#0A734D] font-mono flex items-center justify-between">
                      <span>{isAr ? "نقدي:" : "Cash:"}</span>
                      <span>{m.totalCash.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {m.hasBasket && (
                    <div className="text-[11px] font-bold text-amber-800 flex items-center justify-between">
                      <span>{isAr ? "سلال:" : "Baskets:"}</span>
                      <span>{m.totalBaskets} سلة</span>
                    </div>
                  )}
                  {!m.hasReceived && (
                    <div className="text-[11px] text-slate-400 font-semibold py-1">
                      {m.isPast ? (isAr ? "لا توجد عمليات صرف" : "No activity recorded") : (isAr ? "قيد الانتظار" : "Pending")}
                    </div>
                  )}
                </div>

                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md text-center mt-2 ${badgeClass}`}>
                  {statusBadge}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Interactive Tabs Section ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "ledger"
                ? "bg-white text-[#0A734D] shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isAr ? "سجل العمليات المالي والعيني الكامل" : "Unified Transaction Ledger"}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              {unifiedLedger.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "bg-white text-[#0A734D] shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? "الملف الاجتماعي والبحث الميداني" : "Social & Demographics Profile"}</span>
          </button>
        </div>

        {/* Tab 1: Unified Transaction Ledger */}
        {activeTab === "ledger" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-800 text-start">
              <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "التاريخ والوقت" : "Date & Time"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "نوع العملية" : "Transaction Type"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "المنفذ / مركز التوزيع" : "Store / Center"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "المبلغ المخصوم" : "Amount Deducted"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "السلال الغذائية" : "Baskets"}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{isAr ? "ملاحظات وتوثيق" : "Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {unifiedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? "لا توجد عمليات صرف أو تسليم سلال مسجلة لهذا المستفيد" : "No transactions recorded for this beneficiary yet"}
                    </td>
                  </tr>
                ) : (
                  unifiedLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {item.timestamp.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${
                            item.type === "cash"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {item.type === "cash" ? <CreditCard className="w-3.5 h-3.5" /> : <PackageCheck className="w-3.5 h-3.5" />}
                          <span>{item.title}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{item.storeOrCenter}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-sm text-[#0A734D]">
                        {item.amount ? `${item.amount.toLocaleString()} ${isAr ? "ج.م" : "EGP"}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.baskets ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black font-mono">
                            {item.baskets} {isAr ? "سلة" : "baskets"}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {item.notes || (isAr ? "تم الصرف بنجاح" : "Completed")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Social & Demographics Profile */}
        {activeTab === "profile" && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#0A734D]" />
                <span>{isAr ? "بيانات الهوية والاستحقاق الاجتماعي" : "Official Demographic & Case Info"}</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-500">{isAr ? "الاسم الكامل:" : "Full Name:"}</span>
                  <span className="font-black text-slate-900">{card.beneficiaryName}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-500">{isAr ? "رقم الجواز / البطاقة القومية:" : "National / Passport ID:"}</span>
                  <span className="font-mono font-black text-slate-900">{formatId(card.nationalId)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-500">{isAr ? "الجنسية:" : "Nationality:"}</span>
                  <span className="font-black text-slate-900">{card.nationality || "سورية"}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-500">{isAr ? "الحالة الاجتماعية:" : "Social Status:"}</span>
                  <span className="font-black text-emerald-800">{card.socialStatus || beneficiaryUser?.socialStatus || (isAr ? "أسرة متعففة" : "Standard")}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-500">{isAr ? "حالة البحث الميداني:" : "Field Research:"}</span>
                  <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                    {card.fieldResearchStatus || beneficiaryUser?.fieldResearchStatus || (isAr ? "مكتمل ومعتمد ✅" : "Verified")}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                <span>{isAr ? "الاحتياجات العينية والملاحظات الطبية" : "In-Kind Needs & Medical Notes"}</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="font-black text-amber-900 block mb-1">{isAr ? "الاحتياجات العينية والأجهزة:" : "In-Kind Requirements:"}</span>
                  <p className="text-slate-700 font-semibold leading-relaxed">
                    {beneficiaryUser?.inKindNeeds || (isAr ? "لا توجد طلبات أجهزة عينية مسجلة حالياً." : "No in-kind equipment requests")}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <span className="font-black text-blue-950 block mb-1">{isAr ? "الملف الطبي والعمليات الجراحية:" : "Medical & Surgical Notes:"}</span>
                  <p className="text-slate-700 font-semibold leading-relaxed">
                    {beneficiaryUser?.medicalNotes || (isAr ? "الحالة مستقرة - لا توجد عمليات جراحية معلقة." : "No pending surgeries or medical treatments")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
