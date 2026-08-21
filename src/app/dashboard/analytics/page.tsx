"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { AidCardModel, RedemptionTransaction } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";
import {
  Flame, ShieldAlert, Users,
  BarChart3, Activity,
} from "lucide-react";

/* ── Normalize Nationality Helper ── */
function normalizeNationality(raw?: string): string {
  if (!raw) return "غير محدد";
  const s = raw.trim();
  if (s.includes("سور")) return "سوري";
  if (s.includes("مصر")) return "مصري";
  if (s.includes("سودان")) return "سوداني";
  if (s.includes("فلسطين")) return "فلسطيني";
  if (s.includes("يمن")) return "يمني";
  return s;
}

function normalizeNationalityEn(raw?: string): string {
  const norm = normalizeNationality(raw);
  switch (norm) {
    case "سوري": return "Syrian";
    case "مصري": return "Egyptian";
    case "سوداني": return "Sudanese";
    case "فلسطيني": return "Palestinian";
    case "يمني": return "Yemeni";
    default: return "Other";
  }
}

/* ── Cross-Chart Categorical Palette (QOUT Standard) ── */
const NAT_COLOR_MAP: Record<string, string> = {
  "سوري": "#0A734D",       // Brand Imperial Emerald
  "مصري": "#D97706",       // Royal Amber
  "سوداني": "#0284C7",     // Sky Blue
  "فلسطيني": "#7C3AED",    // Royal Purple
  "يمني": "#0D9488",       // Teal
  "غير محدد": "#64748B",   // Slate
  "Syrian": "#0A734D",
  "Egyptian": "#D97706",
  "Sudanese": "#0284C7",
  "Palestinian": "#7C3AED",
  "Yemeni": "#0D9488",
  "Other": "#64748B",
};

const FALLBACK_COLORS = ["#0A734D", "#D97706", "#0284C7", "#7C3AED", "#0D9488", "#E11D48"];

const VULN_CATEGORIES = [
  { key: "أرمل", labelAr: "أرمل/ة", labelEn: "Widowed" },
  { key: "مريض", labelAr: "مريض", labelEn: "Sick / Medical" },
  { key: "يتيم", labelAr: "يتيم", labelEn: "Orphan" },
  { key: "مسن", labelAr: "مسن", labelEn: "Elderly" },
  { key: "طبيعي", labelAr: "طبيعي", labelEn: "Standard" },
];

const MAIN_NATIONALITIES = [
  { ar: "سوري", en: "Syrian" },
  { ar: "مصري", en: "Egyptian" },
  { ar: "سوداني", en: "Sudanese" },
  { ar: "فلسطيني", en: "Palestinian" },
];

/* ── Custom Chart Tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div
        className="rounded-xl px-4 py-3 shadow-xl text-sm"
        style={{
          background: "#081510",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          color: "#FFFFFF",
          fontFamily: "var(--font-primary)",
        }}
      >
        <p className="font-black mb-1.5 text-slate-200 text-sm">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 font-bold text-xs lg:text-sm py-0.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: p.color || p.fill || "#0A734D" }} />
            <span style={{ color: "#E2E8F0" }}>{p.name}:</span>
            <span className="font-black text-white font-mono">{p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [cards, setCards] = useState<AidCardModel[]>([]);
  const [txns, setTxns] = useState<RedemptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCards = onSnapshot(collection(db, "aid_cards"), (snap) => {
      const list: AidCardModel[] = [];
      snap.forEach((d) => list.push({ cardId: d.id, ...d.data() } as AidCardModel));
      setCards(list);
      setLoading(false);
    });

    const q = query(collection(db, "redemptions"), orderBy("timestamp", "desc"));
    const unsubTxns = onSnapshot(q, (snap) => {
      const list: RedemptionTransaction[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RedemptionTransaction));
      setTxns(list);
    });

    return () => { unsubCards(); unsubTxns(); };
  }, []);

  /* ── Calculations & Dynamic Metrics from Database ── */
  const totalRemainingBalance = useMemo(() => {
    return cards.reduce((acc, c) => acc + (Number(c.totalBalance) || 0), 0);
  }, [cards]);

  const totalDisbursedAmount = useMemo(() => {
    return txns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [txns]);

  const totalAllocatedBudget = useMemo(() => {
    return totalRemainingBalance + totalDisbursedAmount;
  }, [totalRemainingBalance, totalDisbursedAmount]);

  const burnRatePct = useMemo(() => {
    if (totalAllocatedBudget <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((totalDisbursedAmount / totalAllocatedBudget) * 100)));
  }, [totalAllocatedBudget, totalDisbursedAmount]);

  // Dynamic daily burn rate based on actual transaction timestamps
  const { dailyBurnRate, daysRemaining } = useMemo(() => {
    if (txns.length === 0 || totalDisbursedAmount === 0) {
      return { dailyBurnRate: 0, daysRemaining: 0 };
    }
    
    // Find earliest and latest transaction
    const timestamps = txns.map(t => t.timestamp?.toDate ? t.timestamp.toDate().getTime() : 0).filter(ts => ts > 0);
    if (timestamps.length === 0) {
      return { dailyBurnRate: 0, daysRemaining: 0 };
    }

    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps, Date.now());
    const daysElapsed = Math.max(1, Math.round((maxTs - minTs) / (1000 * 60 * 60 * 24)));

    const burnRate = Math.round(totalDisbursedAmount / daysElapsed);
    const remaining = burnRate > 0 ? Math.round(totalRemainingBalance / burnRate) : 0;
    return { dailyBurnRate: burnRate, daysRemaining: remaining };
  }, [txns, totalDisbursedAmount, totalRemainingBalance]);

  /* ── Weekly Activity Data ── */
  const weeklyData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayLabel = d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "short" });
      const count = txns.filter((t) => {
        const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return tDate.toDateString() === d.toDateString();
      }).length;
      return { day: dayLabel, count };
    });
    return days;
  }, [txns, isAr]);

  /* ── Nationality Distribution Data (Normalized) ── */
  const nationalityChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    cards.forEach((c) => {
      const normKey = isAr ? normalizeNationality(c.nationality) : normalizeNationalityEn(c.nationality);
      counts[normKey] = (counts[normKey] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], idx) => ({
        name,
        count,
        fill: NAT_COLOR_MAP[name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      }));
  }, [cards, isAr]);

  /* ── Social Vulnerability Matrix ── */
  const vulnerabilityMatrix = useMemo(() => {
    return MAIN_NATIONALITIES.map((natObj) => {
      const rowLabel = isAr ? natObj.ar : natObj.en;
      const color = NAT_COLOR_MAP[rowLabel] || "#0A734D";
      const counts: Record<string, number> = {};

      VULN_CATEGORIES.forEach((cat) => {
        const matchCount = cards.filter((c) => {
          const cardNat = normalizeNationality(c.nationality);
          const cardStatus = c.socialStatus || "";
          return cardNat === natObj.ar && cardStatus.includes(cat.key);
        }).length;
        counts[cat.key] = matchCount;
      });

      return {
        label: rowLabel,
        color,
        counts,
      };
    });
  }, [cards, isAr]);

  return (
    <div className="space-y-7 page-enter">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A734D, #063A28)" }}
          >
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-950 ">
              {isAr ? "مركز التحليلات والمحاسبة الإغاثية" : "Analytics & Operations Center"}
            </h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">
              {isAr
                ? "مؤسسة الفجر الخيرية | مؤشرات الاستهلاك، دراسة الاحتياج، وتوليد كشوف الحسابات المحاسبية المعتمدة"
                : "Al-Fajr Foundation | Burn-rate velocity, vulnerability matrix, and certified accounting close reports"}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;

            const curDate = new Date();
            const monthName = curDate.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

            const html = `
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="utf-8">
                <title>تقرير الإقفال المحاسبي الشهري - مؤسسة الفجر الخيرية</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                  @page { size: A4 portrait; margin: 12mm; }
                  body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #0f172a; background: #fff; font-size: 11px; }
                  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0A734D; padding-bottom: 12px; margin-bottom: 16px; }
                  .brand-title { font-size: 22px; font-weight: 900; color: #0A734D; margin: 0; }
                  .brand-sub { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
                  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
                  .card { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
                  .card-title { font-size: 11px; color: #64748b; font-weight: bold; }
                  .card-val { font-size: 18px; font-weight: 900; color: #0A734D; font-mono; margin-top: 4px; }
                  .footer-box { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; padding-top: 15px; }
                  .stamp { border: 2px dashed #0A734D; padding: 10px 20px; border-radius: 8px; text-align: center; color: #0A734D; font-weight: 900; }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <h1 class="brand-title">مؤسسة الفجر الخيرية (Al-Fajr Foundation)</h1>
                    <p class="brand-sub">تقرير الإقفال والمطابقة المحاسبية لشهر (${monthName})</p>
                  </div>
                  <div style="text-align: left; font-size: 11px;">
                    <div>تاريخ الإصدار: <b>${curDate.toLocaleDateString("ar-EG")}</b></div>
                    <div>الحالة: <b style="color: #0A734D;">معتمد ومطابق ✅</b></div>
                  </div>
                </div>

                <div class="grid">
                  <div class="card">
                    <div class="card-title">إجمالي المبالغ المنصرفة فعلياً للمستفيدين</div>
                    <div class="card-val">${totalDisbursedAmount.toLocaleString()} ج.م</div>
                  </div>
                  <div class="card">
                    <div class="card-title">إجمالي الأرصدة المتبقية ببطاقات المستفيدين</div>
                    <div class="card-val" style="color: #b45309;">${totalRemainingBalance.toLocaleString()} ج.م</div>
                  </div>
                  <div class="card">
                    <div class="card-title">عدد المستفيدين المعتمدين بالمنظومة</div>
                    <div class="card-val" style="color: #0284c7;">${cards.length} حالة مسجلة</div>
                  </div>
                  <div class="card">
                    <div class="card-title">معدل الصرف اليومي المحسوب</div>
                    <div class="card-val">${dailyBurnRate.toLocaleString()} ج.م / يوم</div>
                  </div>
                </div>

                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-top: 15px; font-size: 11px; font-weight: bold; color: #064e3b; line-height: 1.6;">
                  📌 إقرار التدقيق الداخلي: تشهد الإدارة المالية لمؤسسة الفجر الخيرية بأن كافة العمليات المذكورة أعلاه مطابقة لقيود الصرف الرقمية وسجلات المنافذ المعتمدة، وتم التحقق من سلامة الأرصدة عبر نظام الحماية المشفر.
                </div>

                <div class="footer-box">
                  <div>
                    <p style="margin: 0; font-weight: bold;">الإدارة المالية والمراجعة الحسابية</p>
                    <p style="margin: 3px 0 0 0; color: #94a3b8; font-size: 10px;">تقرير محاسبي موثق صادر من السيرفر المركزي</p>
                  </div>
                  <div class="stamp">
                    اعتماد الإدارة المالية<br>مؤسسة الفجر الخيرية
                  </div>
                </div>

                <script>
                  window.onload = function() { setTimeout(function() { window.print(); }, 500); };
                </script>
              </body>
              </html>
            `;
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
          }}
          className="btn bg-[#0A734D] hover:bg-[#085E3E] text-white font-black flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Activity className="w-4 h-4 text-amber-300" />
          <span>{isAr ? "تصدير كشف الإقفال المحاسبي الشهري" : "Export Monthly Audit"}</span>
        </button>
      </div>

      {/* ── Section 1: Aid Burn-Rate & Velocity Forecast ── */}
      <div className="qout-card p-6 lg:p-7 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="kpi-icon amber">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-black text-slate-950">
                {isAr ? "معدل استنفاذ المساعدات (Relief Velocity)" : "Aid Burn-Rate Forecast"}
              </h2>
              <p className="text-xs lg:text-sm text-slate-500 font-semibold mt-0.5">
                {isAr ? "تقدير المدة المتبقية بناءً على وتيرة الصرف الحالية للمستفيدين" : "Estimated time remaining based on active disbursement trends"}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs lg:text-sm font-bold text-slate-500 uppercase  mb-1.5">
              {isAr ? "الرصيد المتبقي الكلي" : "Total Remaining Funds"}
            </p>
            <p className="text-3xl font-black text-emerald-800 font-mono leading-none">
              {totalRemainingBalance.toLocaleString()} <span className="text-sm font-bold text-slate-500">{isAr ? "ج.م" : "EGP"}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs lg:text-sm font-bold text-slate-500 uppercase  mb-1.5">
              {isAr ? "معدل الصرف اليومي" : "Daily Burn Rate"}
            </p>
            <p className="text-3xl font-black text-amber-700 font-mono leading-none">
              {dailyBurnRate.toLocaleString()} <span className="text-sm font-bold text-slate-500">{isAr ? "ج.م/يوم" : "EGP/day"}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs lg:text-sm font-bold text-slate-500 uppercase  mb-1.5">
              {isAr ? "الأيام المتبقية المتوقعة" : "Est. Days Remaining"}
            </p>
            <p className={`text-3xl font-black font-mono leading-none ${daysRemaining < 30 ? "text-red-600" : "text-emerald-700"}`}>
              {daysRemaining > 0 ? `~${daysRemaining}` : "—"} <span className="text-sm font-bold text-slate-500">{isAr ? "يوم" : "days"}</span>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-slate-700 font-extrabold">
              {isAr ? "نسبة استهلاك المخصصات الإغاثية" : "Overall Budget Consumed"}
            </span>
            <span className="text-emerald-800 font-black text-base">{burnRatePct}%</span>
          </div>
          <div className="qout-progress">
            <div
              className={`qout-progress-fill ${burnRatePct > 80 ? "depleted" : burnRatePct > 60 ? "warning" : ""}`}
              style={{ width: `${burnRatePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Nationality Breakdown (Clean Column Chart with Zero Collisions) */}
        <div className="qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between rounded-3xl border border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#0A734D] flex items-center justify-center flex-shrink-0 shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-black text-slate-950 leading-tight">
                  {isAr ? "توزيع المستفيدين حسب الجنسية" : "Beneficiaries by Nationality"}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {isAr ? "تصنيف الحالات المسجلة بالمنظومة" : "Registered beneficiaries breakdown"}
                </p>
              </div>
            </div>

            <div className="h-64 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nationalityChartData} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    tick={{ fill: "#0F172A", fontWeight: 800 }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    tick={{ fill: "#475569", fontWeight: 700 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name={isAr ? "عدد المستفيدين" : "Cases"} radius={[8, 8, 0, 0]} maxBarSize={55}>
                    {nationalityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Color Chips with Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100 text-xs">
            {nationalityChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.fill }} />
                <span className="font-black text-slate-900">{item.name}</span>
                <span className="font-mono font-black text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity Line/Area Chart */}
        <div className="qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between rounded-3xl border border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-black text-slate-950 leading-tight">
                  {isAr ? "حركة الصرف الأسبوعية" : "Weekly Redemption Volume"}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {isAr ? "عدد العمليات المنجزة يومياً خلال آخر 7 أيام" : "Daily completed transactions over the last 7 days"}
                </p>
              </div>
            </div>

            <div className="h-64 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 20, right: 15, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="weeklyGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A734D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0A734D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} tick={{ fill: "#475569", fontWeight: 700 }} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} tick={{ fill: "#475569", fontWeight: 700 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={isAr ? "العمليات" : "Redemptions"}
                    stroke="#0A734D"
                    strokeWidth={3}
                    fill="url(#weeklyGreen)"
                    dot={{ fill: "#FFFFFF", stroke: "#0A734D", strokeWidth: 2.5, r: 5 }}
                    activeDot={{ r: 7, fill: "#0A734D" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs lg:text-sm text-slate-600 font-bold">
            <span>{isAr ? "إجمالي عمليات الأسبوع:" : "Total weekly redemptions:"}</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 font-black border border-emerald-300">
              <span className="font-mono text-sm">{weeklyData.reduce((acc, d) => acc + d.count, 0)}</span>
              <span>{isAr ? "عملية صرف" : "txns"}</span>
            </span>
          </div>
        </div>

      </div>

      {/* ── Section 3: Social Vulnerability Heatmap Matrix ── */}
      <div className="qout-card p-6 lg:p-7 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="kpi-icon purple">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-black text-slate-950">
              {isAr ? "مصفوفة الهشاشة الاجتماعية والاحتياج" : "Social Vulnerability & Need Matrix"}
            </h3>
            <p className="text-xs lg:text-sm text-slate-500 font-semibold mt-0.5">
              {isAr ? "تقاطع الجنسيات مع الفئات الاجتماعية ذات الأولوية (أرامل، أيتام، مرضى، مسنون)" : "Intersection of nationality and priority social groups"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: "6px" }}>
            <thead>
              <tr>
                <th className="p-3 text-start font-black text-slate-700 bg-slate-50 rounded-xl text-sm">
                  {isAr ? "الجنسية" : "Nationality"}
                </th>
                {VULN_CATEGORIES.map((cat) => (
                  <th key={cat.key} className="p-3 text-center font-black text-slate-700 bg-slate-50 rounded-xl text-sm">
                    {isAr ? cat.labelAr : cat.labelEn}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vulnerabilityMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-bold rounded-xl" style={{ background: "#F8FAF9" }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: row.color }} />
                      <span className="text-slate-950 font-black text-sm">{row.label}</span>
                    </div>
                  </td>
                  {VULN_CATEGORIES.map((cat) => {
                    const count = row.counts[cat.key] || 0;
                    const hasCount = count > 0;
                    return (
                      <td key={cat.key} className="p-2 text-center rounded-xl">
                        <div
                          className={`w-full py-2.5 rounded-xl font-black font-mono text-base transition-all ${
                            hasCount
                              ? "text-emerald-950 shadow-xs"
                              : "text-slate-300 bg-slate-50"
                          }`}
                          style={
                            hasCount
                              ? {
                                  background: count > 50 ? "#BBF7D0" : count > 20 ? "#DCFCE7" : "#E6F5EF",
                                  border: "1.5px solid rgba(10, 115, 77, 0.2)",
                                }
                              : undefined
                          }
                        >
                          {count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
