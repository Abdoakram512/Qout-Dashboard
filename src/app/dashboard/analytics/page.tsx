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
  Flame, ShieldAlert, Users, AlertTriangle, CheckCircle2,
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

  /* ── Calculations & Metrics ── */
  const totalBalance = useMemo(() => {
    return cards.reduce((acc, c) => acc + (c.totalBalance ?? 0), 0);
  }, [cards]);

  const initialEstimatedBudget = useMemo(() => {
    return cards.length * 750;
  }, [cards.length]);

  const burnRatePct = useMemo(() => {
    if (initialEstimatedBudget <= 0) return 0;
    const consumed = initialEstimatedBudget - totalBalance;
    return Math.max(0, Math.min(100, Math.round((consumed / initialEstimatedBudget) * 100)));
  }, [initialEstimatedBudget, totalBalance]);

  const daysElapsed = 45;
  const dailyBurnRate = useMemo(() => {
    if (daysElapsed <= 0) return 0;
    const consumed = initialEstimatedBudget - totalBalance;
    return Math.max(0, Math.round(consumed / daysElapsed));
  }, [initialEstimatedBudget, totalBalance]);

  const daysRemaining = useMemo(() => {
    if (dailyBurnRate <= 0) return 0;
    return Math.round(totalBalance / dailyBurnRate);
  }, [totalBalance, dailyBurnRate]);

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

  /* ── Anomaly Sentinel Detection (Spikes) ── */
  const anomalies = useMemo(() => {
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    const storeCount: Record<string, number> = {};

    txns.forEach((t) => {
      const ts = t.timestamp?.toDate ? t.timestamp.toDate().getTime() : 0;
      if (ts > thirtyMinsAgo && t.merchantStoreName) {
        storeCount[t.merchantStoreName] = (storeCount[t.merchantStoreName] || 0) + 1;
      }
    });

    return Object.entries(storeCount)
      .filter(([, count]) => count >= 3)
      .map(([store, count]) => ({ store, count }));
  }, [txns]);

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
              {isAr ? "مركز التحليلات الإحصائية" : "Analytics & Operations Center"}
            </h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">
              {isAr
                ? "مؤشرات الاستهلاك، دراسة الاحتياج، وتنبؤات استدامة المساعدات"
                : "Burn-rate velocity, vulnerability insights, and operational alerts"}
            </p>
          </div>
        </div>
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
              {totalBalance.toLocaleString()} <span className="text-sm font-bold text-slate-500">{isAr ? "ج.م" : "EGP"}</span>
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

      {/* ── Section 4: Anomaly Sentinel (Security / Fraud Watch) ── */}
      <div className="qout-card p-6 lg:p-7 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className={`kpi-icon ${anomalies.length > 0 ? "amber" : ""}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base lg:text-lg font-black text-slate-950">
              {isAr ? "حارس النزاهة وكاشف الأنماط غير المعتادة (Anomaly Sentinel)" : "Integrity Guard & Anomaly Sentinel"}
            </h3>
            <p className="text-xs lg:text-sm text-slate-500 font-semibold mt-0.5">
              {isAr ? "مراقبة العمليات المتكررة أو غير الطبيعية من منافذ الصرف خلال فترات زمنية قصيرة" : "Live monitoring of high-frequency or anomalous merchant redemptions"}
            </p>
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-base font-black text-emerald-950">
                {isAr ? "المنظومة آمنة: لا توجد عمليات صرف مريبة في آخر 30 دقيقة" : "System Secure: No anomalous activity detected in the last 30 minutes"}
              </p>
              <p className="text-sm text-emerald-800 font-semibold mt-0.5">
                {isAr ? "تتم معالجة كافة حركات الصرف بوتيرة طبيعية وآمنة." : "All transactions are executing within standard operating thresholds."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-5 rounded-2xl bg-amber-50 border border-amber-200"
              >
                <div className="flex items-center gap-3.5">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-black text-amber-950">
                      {isAr
                        ? `تنبيه: تم رصد ${item.count} عمليات صرف سريعة خلال 30 دقيقة`
                        : `Alert: ${item.count} high-speed redemptions in 30 minutes`}
                    </p>
                    <p className="text-sm font-bold text-amber-800 mt-0.5">
                      {isAr ? "المتجر: " : "Store: "}{item.store}
                    </p>
                  </div>
                </div>
                <a
                  href="/dashboard/merchants"
                  className="btn btn-amber text-sm font-bold px-4 py-2"
                >
                  {isAr ? "فحص المنفذ" : "Review Store"}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
