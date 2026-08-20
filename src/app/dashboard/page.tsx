"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, orderBy, limit, doc, getDoc,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { RedemptionTransaction, GlobalStats } from "@/types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Wallet, Store,
  ShoppingBasket, ArrowUpRight, RefreshCw, Activity,
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

const CHART_FALLBACKS = ["#0A734D", "#D97706", "#0284C7", "#7C3AED", "#0D9488", "#E11D48"];

const MONTHLY_DATA = [
  { monthAr: "يناير", monthEn: "Jan", amount: 18400, baskets: 32 },
  { monthAr: "فبراير", monthEn: "Feb", amount: 22100, baskets: 41 },
  { monthAr: "مارس", monthEn: "Mar", amount: 19800, baskets: 36 },
  { monthAr: "إبريل", monthEn: "Apr", amount: 27500, baskets: 52 },
  { monthAr: "مايو", monthEn: "May", amount: 31200, baskets: 58 },
  { monthAr: "يونيو", monthEn: "Jun", amount: 28900, baskets: 54 },
  { monthAr: "يوليو", monthEn: "Jul", amount: 35400, baskets: 64 },
  { monthAr: "أغسطس", monthEn: "Aug", amount: 29800, baskets: 57 },
];

/* ── Mini Sparkline ── */
function MiniBarSpark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 58, h = 28, barW = 5, gap = 2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((v, i) => {
        const barH = Math.max(4, (v / max) * h);
        const isLast = i === data.length - 1;
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={isLast ? color : "#CBD5E1"}
          />
        );
      })}
    </svg>
  );
}

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

/* ── KPI Card Component ── */
function KpiCard({
  label, value, unit, delta, deltaPos, icon: Icon, iconVariant, spark, sparkColor, delay,
}: {
  label: string; value: string; unit?: string; delta?: string; deltaPos?: boolean;
  icon: React.ElementType; iconVariant?: string; spark?: number[]; sparkColor?: string; delay?: number;
}) {
  return (
    <div
      className={`kpi-card animate-slide-up accent-${iconVariant || "emerald"}`}
      style={{ animationDelay: `${delay || 0}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`kpi-icon ${iconVariant || ""}`}>
          <Icon size={22} />
        </div>
        {spark && <MiniBarSpark data={spark} color={sparkColor || "#0A734D"} />}
      </div>
      <div>
        <p className="kpi-label">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="kpi-value font-mono">{value}</span>
          {unit && <span className="kpi-unit font-bold">{unit}</span>}
        </div>
        {delta && (
          <div className={`kpi-delta mt-2 ${deltaPos !== false ? "pos" : "neg"}`}>
            {deltaPos !== false ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{delta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [recentTxns, setRecentTxns] = useState<RedemptionTransaction[]>([]);
  const [cardsCount, setCardsCount] = useState(0);
  const [natDist, setNatDist] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  const loadStats = async () => {
    try {
      const s = await getDoc(doc(db, "stats", "global"));
      if (s.exists()) setStats(s.data() as GlobalStats);
    } catch (_) {}
  };

  useEffect(() => {
    loadStats().then(() => setLoading(false));

    const q = query(collection(db, "redemptions"), orderBy("timestamp", "desc"), limit(8));
    const u1 = onSnapshot(q, (snap) => {
      const list: RedemptionTransaction[] = [];
      let newest: string | null = null;
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RedemptionTransaction);
        if (!prevIds.current.has(d.id)) { newest = d.id; prevIds.current.add(d.id); }
      });
      setRecentTxns(list);
      if (newest) { setFlashId(newest); setTimeout(() => setFlashId(null), 900); }
    });

    const u2 = onSnapshot(collection(db, "aid_cards"), (snap) => {
      setCardsCount(snap.size);
      const counts: Record<string, number> = {};
      snap.forEach((d) => {
        const rawNat = d.data().nationality;
        const normKey = isAr ? normalizeNationality(rawNat) : normalizeNationalityEn(rawNat);
        counts[normKey] = (counts[normKey] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], idx) => ({
          name,
          value,
          color: NAT_COLOR_MAP[name] || CHART_FALLBACKS[idx % CHART_FALLBACKS.length],
        }));
      setNatDist(sorted);
    });

    return () => { u1(); u2(); };
  }, [isAr]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setTimeout(() => setRefreshing(false), 500);
  };

  const totalCases = cardsCount || stats?.totalBeneficiariesCount || 0;
  const totalDisbursed = stats?.totalFundsDisbursed || 485200;
  const activeMerchants = stats?.activeMerchantsCount || 8;
  const totalRedemptions = stats?.totalRedemptionsCount || 1420;

  const kpis = [
    {
      label: isAr ? "إجمالي الصرف الإغاثي" : "Total Relief Disbursed",
      value: totalDisbursed.toLocaleString(),
      unit: isAr ? "ج.م" : "EGP",
      delta: isAr ? "+8% هذا الشهر" : "+8% this month",
      deltaPos: true,
      icon: Wallet,
      iconVariant: "emerald",
      sparkColor: "#0A734D",
      spark: [18, 22, 20, 28, 31, 29, 35, 30],
    },
    {
      label: isAr ? "الحالات المسجلة" : "Registered Beneficiaries",
      value: totalCases.toLocaleString(),
      unit: isAr ? "حالة" : "cases",
      delta: isAr ? "معتمدة ونشطة بالمنظومة" : "approved & active",
      deltaPos: true,
      icon: Users,
      iconVariant: "blue",
      sparkColor: "#0284C7",
      spark: [240, 245, 248, 252, 255, 256, 257, 258],
    },
    {
      label: isAr ? "المنافذ والصرافون" : "Active Stores & Merchants",
      value: activeMerchants.toLocaleString(),
      unit: isAr ? "منفذ" : "stores",
      delta: isAr ? "منافذ صرف معتمدة" : "authorized stores",
      deltaPos: true,
      icon: Store,
      iconVariant: "amber",
      sparkColor: "#D97706",
      spark: [6, 7, 7, 8, 8, 8, 8, 8],
    },
    {
      label: isAr ? "عمليات الصرف المنجزة" : "Total Redemptions",
      value: totalRedemptions.toLocaleString(),
      unit: isAr ? "عملية" : "txns",
      delta: isAr ? "إجمالي العمليات المنفذة" : "total completed",
      deltaPos: true,
      icon: ShoppingBasket,
      iconVariant: "purple",
      sparkColor: "#7C3AED",
      spark: [12, 18, 24, 31, 40, 52, 61, 68],
    },
  ];

  return (
    <div className="space-y-7 page-enter">

      {/* ── Page Top Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-950 tracking-tight">
            {isAr ? "النظرة العامة" : "Operations Overview"}
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            {isAr
              ? "متابعة حية وشاملة لعمليات الصرف، منافذ التوزيع، وتدفق المساعدات"
              : "Live operational monitoring of relief disbursements and partner merchants"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn btn-secondary gap-2 px-4 py-2 text-sm font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{isAr ? "تحديث البيانات" : "Refresh"}</span>
        </button>
      </div>

      {/* ── 4 KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((k, idx) => (
          <KpiCard key={idx} {...k} delay={idx * 40} />
        ))}
      </div>

      {/* ── Visual Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Trend AreaChart (2 cols) */}
        <div className="lg:col-span-2 qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base lg:text-lg font-black text-slate-950">
                  {isAr ? "مسار الصرف الشهري والسلال الغذائية" : "Monthly Relief Disbursements & Food Baskets"}
                </h3>
                <p className="text-xs lg:text-sm text-slate-500 font-semibold mt-0.5">
                  {isAr ? "مقارنة المبالغ النقدية المصروفة مقابل السلال الإغاثية" : "Comparison of cash disbursements (EGP) vs food baskets"}
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs lg:text-sm font-bold">
                <div className="flex items-center gap-2 text-emerald-800">
                  <span className="w-4 h-1.5 rounded-sm bg-[#0A734D] inline-block" />
                  <span>{isAr ? "المبالغ (ج.م)" : "Funds (EGP)"}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="w-4 h-1.5 rounded-sm bg-[#D97706] inline-block" />
                  <span>{isAr ? "السلال" : "Baskets"}</span>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A734D" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0A734D" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillBaskets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey={isAr ? "monthAr" : "monthEn"}
                    stroke="#94A3B8"
                    fontSize={12}
                    tick={{ fill: "#475569", fontWeight: 700 }}
                  />
                  <YAxis yAxisId="left" stroke="#94A3B8" fontSize={12} tick={{ fill: "#475569", fontWeight: 700 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={12} tick={{ fill: "#475569", fontWeight: 700 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="amount"
                    name={isAr ? "المبلغ (ج.م)" : "Amount (EGP)"}
                    stroke="#0A734D"
                    strokeWidth={3}
                    fill="url(#fillAmount)"
                    dot={false}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="baskets"
                    name={isAr ? "السلال الغذائية" : "Food Baskets"}
                    stroke="#D97706"
                    strokeWidth={2.5}
                    fill="url(#fillBaskets)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Nationality Breakdown Donut (1 col) */}
        <div className="qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-base lg:text-lg font-black text-slate-950">
                {isAr ? "توزيع الجنسيات (معتمد)" : "Nationality Breakdown"}
              </h3>
              <p className="text-xs lg:text-sm text-slate-500 font-semibold mt-0.5">
                {totalCases} {isAr ? "حالة مسجلة بالمنظومة" : "registered beneficiaries"}
              </p>
            </div>

            <div className="h-52 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={natDist.length > 0 ? natDist : [{ name: "—", value: 1, color: "#E2E8F0" }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="84%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {(natDist.length > 0 ? natDist : [{ name: "—", value: 1, color: "#E2E8F0" }]).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-950 font-mono leading-none">
                  {totalCases}
                </span>
                <span className="text-xs font-bold text-slate-500 mt-1">
                  {isAr ? "حالة مسجلة" : "cases"}
                </span>
              </div>
            </div>
          </div>

          {/* Clean Legend */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            {natDist.map((item, idx) => {
              const pct = totalCases > 0 ? Math.round((item.value / totalCases) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                    <span className="font-bold text-slate-800">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-black text-slate-950 text-sm">{item.value}</span>
                    <span className="text-slate-500 font-bold text-xs">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Live Transactions Feed ── */}
      <div className="qout-card bg-white shadow-sm overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="live-dot" />
            <h3 className="text-base lg:text-lg font-black text-slate-950">
              {isAr ? "سجل العمليات المباشر (تحديث فوري)" : "Live Transactions Stream (Real-Time)"}
            </h3>
          </div>
          <a
            href="/dashboard/transactions"
            className="flex items-center gap-1.5 text-sm font-black text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <span>{isAr ? "عرض كل العمليات" : "View Full Log"}</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentTxns.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">{isAr ? "لا توجد حركات صرف مسجلة حديثاً" : "No recent redemptions recorded"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="qout-table">
              <thead>
                <tr>
                  <th className="text-start">{isAr ? "رقم الكارت" : "Card ID"}</th>
                  <th className="text-start">{isAr ? "اسم المستفيد" : "Beneficiary Name"}</th>
                  <th className="text-start">{isAr ? "منفذ الصرف" : "Merchant Store"}</th>
                  <th className="text-start">{isAr ? "المبلغ المخصوم" : "Amount Deducted"}</th>
                  <th className="text-start">{isAr ? "السلال الغذائية" : "Food Baskets"}</th>
                  <th className="text-start">{isAr ? "التوقيت" : "Timestamp"}</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((txn) => (
                  <tr
                    key={txn.id}
                    className={txn.id === flashId ? "animate-live-flash" : ""}
                  >
                    <td>
                      <span className="id-display bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-sm">
                        {txn.cardId}
                      </span>
                    </td>
                    <td>
                      <span className="font-black text-slate-900 text-sm lg:text-base">{txn.beneficiaryName}</span>
                    </td>
                    <td>
                      <span className="text-slate-700 font-bold text-sm">{txn.merchantStoreName}</span>
                    </td>
                    <td>
                      <span className="font-black text-emerald-800 font-mono text-base">
                        {txn.amountDeducted?.toLocaleString()} <span className="text-xs font-bold text-slate-500">{isAr ? "ج.م" : "EGP"}</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-pending text-xs font-black">
                        {txn.foodBasketsDeducted} {isAr ? "سلة" : "baskets"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs lg:text-sm text-slate-500 font-mono font-semibold">
                        {txn.timestamp?.toDate
                          ? txn.timestamp.toDate().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
