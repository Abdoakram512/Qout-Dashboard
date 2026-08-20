"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, orderBy, limit, doc, getDoc,
} from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { RedemptionTransaction, AidCardModel } from "@/types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Wallet, Store,
  ShoppingBasket, ArrowUpRight, RefreshCw, Activity, PackageCheck,
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
            <span className="font-black text-white font-mono">{Number(p.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardOverview() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [cards, setCards] = useState<AidCardModel[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionTransaction[]>([]);
  const [baskets, setBaskets] = useState<any[]>([]);
  const [merchantsCount, setMerchantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. Listen to aid_cards (Beneficiaries)
    const unsubCards = onSnapshot(collection(db, "aid_cards"), (snap) => {
      const list: AidCardModel[] = [];
      snap.forEach((d) => list.push({ cardId: d.id, ...d.data() } as AidCardModel));
      setCards(list);
      setLoading(false);
    });

    // 2. Listen to redemptions (Cash Disbursed)
    const qRedemptions = query(collection(db, "redemptions"), orderBy("timestamp", "desc"));
    const unsubRedemptions = onSnapshot(qRedemptions, (snap) => {
      const list: RedemptionTransaction[] = [];
      let newest: string | null = null;
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RedemptionTransaction);
        if (!prevIds.current.has(d.id)) { newest = d.id; prevIds.current.add(d.id); }
      });
      setRedemptions(list);
      if (newest) { setFlashId(newest); setTimeout(() => setFlashId(null), 900); }
    });

    // 3. Listen to basket_distributions
    const qBaskets = query(collection(db, "basket_distributions"), orderBy("timestamp", "desc"));
    const unsubBaskets = onSnapshot(qBaskets, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setBaskets(list);
    });

    // 4. Listen to users for approved merchants count
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      let mCount = 0;
      snap.forEach((d) => {
        const u = d.data();
        if (u.role === "merchant" && u.isApproved !== false) {
          mCount++;
        }
      });
      setMerchantsCount(mCount);
    });

    return () => {
      unsubCards();
      unsubRedemptions();
      unsubBaskets();
      unsubUsers();
    };
  }, []);

  // Compute Dynamic Metrics
  const totalBeneficiaries = cards.length;
  const totalFundsDisbursed = redemptions.reduce((sum, r) => sum + (Number(r.amountDeducted ?? r.amount) || 0), 0);
  const totalBasketsDelivered = baskets.reduce((sum, b) => sum + (Number(b.basketsDelivered || b.basketsCount) || 1), 0);
  const totalRemainingCashBalance = cards.reduce((sum, c) => sum + (Number(c.totalBalance) || 0), 0);

  // Nationality Breakdown Donut
  const natDist = useMemo(() => {
    const counts: Record<string, number> = {};
    cards.forEach((d) => {
      const rawNat = d.nationality;
      const normKey = isAr ? normalizeNationality(rawNat) : normalizeNationalityEn(rawNat);
      counts[normKey] = (counts[normKey] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], idx) => ({
        name,
        value,
        color: NAT_COLOR_MAP[name] || CHART_FALLBACKS[idx % CHART_FALLBACKS.length],
      }));
  }, [cards, isAr]);

  // Dynamic Monthly Data for the last 6 months
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const monthAr = d.toLocaleDateString("ar-EG", { month: "short" });
      const monthEn = d.toLocaleDateString("en-US", { month: "short" });

      const monthAmount = redemptions.filter((r) => {
        const tDate = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
        return tDate.getMonth() === mIdx && tDate.getFullYear() === y;
      }).reduce((sum, r) => sum + (Number(r.amountDeducted ?? r.amount) || 0), 0);

      const monthBaskets = baskets.filter((b) => {
        const tDate = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return tDate.getMonth() === mIdx && tDate.getFullYear() === y;
      }).reduce((sum, b) => sum + (Number(b.basketsDelivered || b.basketsCount) || 1), 0);

      months.push({
        monthAr,
        monthEn,
        amount: monthAmount,
        baskets: monthBaskets,
      });
    }
    return months;
  }, [redemptions, baskets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const kpis = [
    {
      label: isAr ? "إجمالي الصرف النقدي" : "Total Cash Disbursed",
      value: totalFundsDisbursed.toLocaleString(),
      unit: isAr ? "ج.م" : "EGP",
      sub: isAr ? "صرف فعلي عبر الصرافين" : "Disbursed via merchants",
      icon: Wallet,
      iconVariant: "emerald",
    },
    {
      label: isAr ? "الحالات المسجلة" : "Registered Beneficiaries",
      value: totalBeneficiaries.toLocaleString(),
      unit: isAr ? "حالة" : "cases",
      sub: isAr ? "بطاقات معتمدة بالمنظومة" : "Approved aid cards",
      icon: Users,
      iconVariant: "blue",
    },
    {
      label: isAr ? "المنافذ والصرافون" : "Active Stores & Merchants",
      value: merchantsCount.toLocaleString(),
      unit: isAr ? "منفذ" : "stores",
      sub: isAr ? "منافذ صرف معتمدة" : "Authorized merchants",
      icon: Store,
      iconVariant: "amber",
    },
    {
      label: isAr ? "السلال الغذائية الموزعة" : "Food Baskets Distributed",
      value: totalBasketsDelivered.toLocaleString(),
      unit: isAr ? "سلة" : "baskets",
      sub: isAr ? "تسليم عيني مباشر" : "Admin direct handover",
      icon: ShoppingBasket,
      iconVariant: "purple",
    },
  ];

  return (
    <div className="space-y-7 page-enter">

      {/* ── Page Top Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-950 flex items-center gap-3">
            {isAr ? "لوحة التشغيل والمتابعة المركزية" : "Central Operations & Live Monitoring"}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              {isAr ? "مباشر (Live Sync)" : "Live Sync"}
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-1">
            {isAr
              ? "متابعة العمليات الميدانية، الأرصدة المتبقية، وتوزيع السلال الغذائية لحظياً"
              : "Real-time tracking of aid disbursements, card balances, and food baskets."}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center gap-2 text-xs font-bold"
          title={isAr ? "تحديث البيانات" : "Refresh Data"}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
          <span>{isAr ? "تحديث فوري" : "Refresh"}</span>
        </button>
      </div>

      {/* ── KPI Cards Grid (4 Col) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="qout-card p-5 lg:p-6 bg-white shadow-xs rounded-3xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs lg:text-sm font-extrabold text-slate-500">{kpi.label}</span>
                <div className={`kpi-icon ${kpi.iconVariant === "emerald" ? "" : kpi.iconVariant}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl lg:text-3xl font-black text-slate-950 font-mono">
                  {kpi.value}
                </span>
                <span className="text-xs font-extrabold text-slate-500">{kpi.unit}</span>
              </div>

              <p className="text-xs font-bold text-slate-400 border-t border-slate-100 pt-2.5 mt-1">
                {kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Section 2: Charts Row (2 Cols: Monthly Area Chart + Nationality Donut) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Activity Area Chart (2 cols) */}
        <div className="lg:col-span-2 qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between rounded-3xl border border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base lg:text-lg font-black text-slate-950">
                  {isAr ? "حركة الصرف وتوزيع السلال (آخر 6 شهور)" : "Disbursement & Basket Trends (Last 6 Months)"}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {isAr ? "بيانات الصرف المالي الفعلي وحصص السلال المستلمة" : "Actual financial redemptions and food basket distributions"}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-extrabold">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-3.5 h-1.5 rounded-sm bg-[#0A734D] inline-block" />
                  <span>{isAr ? "المبالغ (ج.م)" : "Funds (EGP)"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3.5 h-1.5 rounded-sm bg-[#D97706] inline-block" />
                  <span>{isAr ? "السلال" : "Baskets"}</span>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A734D" stopOpacity="0.25" />
                      <stop offset="95%" stopColor="#0A734D" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="fillBaskets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity="0.22" />
                      <stop offset="95%" stopColor="#D97706" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey={isAr ? "monthAr" : "monthEn"}
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    tick={{ fill: "#475569", fontWeight: 700 }}
                  />
                  <YAxis yAxisId="left" stroke="#94A3B8" fontSize={12} tickLine={false} tick={{ fill: "#475569", fontWeight: 700 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={12} tickLine={false} tick={{ fill: "#475569", fontWeight: 700 }} />
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
        <div className="qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between rounded-3xl border border-slate-200">
          <div>
            <div className="mb-4">
              <h3 className="text-base lg:text-lg font-black text-slate-950">
                {isAr ? "توزيع الجنسيات (معتمد)" : "Nationality Breakdown"}
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                {totalBeneficiaries} {isAr ? "حالة مسجلة بالمنظومة" : "registered beneficiaries"}
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
                  {totalBeneficiaries}
                </span>
                <span className="text-xs font-bold text-slate-500 mt-1">
                  {isAr ? "حالة مسجلة" : "cases"}
                </span>
              </div>
            </div>

            {/* Legend Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-slate-100 text-xs font-bold mt-2">
              {natDist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-slate-800">{item.name}</span>
                  <span className="text-slate-500 font-mono font-black">({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Section 3: Live Feed & Operational Shortcuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Redemptions Table (2 cols) */}
        <div className="lg:col-span-2 qout-card p-6 lg:p-7 bg-white shadow-sm rounded-3xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-base lg:text-lg font-black text-slate-950">
                {isAr ? "أحدث عمليات الصرف الميداني" : "Recent Field Redemptions"}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {redemptions.length} {isAr ? "عمليات مسجلة" : "recorded transactions"}
            </span>
          </div>

          {redemptions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-bold text-sm bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <ShoppingBasket className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>{isAr ? "لا توجد عمليات صرف مسجلة حالياً" : "No redemption transactions recorded yet."}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? "المنظومة جاهزة لاستقبال عمليات الصرف الجديدة من الصرافين." : "System ready to process new redemptions from merchants."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs lg:text-sm text-start">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold text-xs">
                    <th className="pb-3 text-start">{isAr ? "المستفيد" : "Beneficiary"}</th>
                    <th className="pb-3 text-start">{isAr ? "المنفذ / الصراف" : "Merchant / Store"}</th>
                    <th className="pb-3 text-start">{isAr ? "المبلغ" : "Amount"}</th>
                    <th className="pb-3 text-start">{isAr ? "الوقت" : "Time"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.slice(0, 6).map((txn) => (
                    <tr
                      key={txn.id}
                      className={`hover:bg-slate-50/80 transition-colors ${flashId === txn.id ? "bg-emerald-50" : ""}`}
                    >
                      <td className="py-3 font-extrabold text-slate-900">
                        {txn.beneficiaryName || txn.cardId}
                      </td>
                      <td className="py-3 text-slate-700 font-bold">
                        {txn.merchantStoreName || txn.merchantName || "—"}
                      </td>
                      <td className="py-3 font-mono font-black text-emerald-800">
                        {txn.amountDeducted ?? txn.amount ?? 0} {isAr ? "ج.م" : "EGP"}
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs">
                        {txn.timestamp?.toDate
                          ? txn.timestamp.toDate().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Operational Info Card (1 col) */}
        <div className="qout-card p-6 lg:p-7 bg-white shadow-sm flex flex-col justify-between rounded-3xl border border-slate-200">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-950">
                {isAr ? "مخصصات الصرف الإغاثي المتبقية" : "Remaining Relief Allocations"}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500 font-extrabold block mb-1">
                  {isAr ? "إجمالي الأرصدة النقدية المتاحة بالكروت" : "Total Cash Available in Cards"}
                </span>
                <span className="text-2xl font-black text-emerald-800 font-mono">
                  {totalRemainingCashBalance.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs text-slate-500 font-extrabold block mb-1">
                  {isAr ? "إجمالي السلال الغذائية المتبقية للتسليم" : "Total Remaining Food Baskets Quota"}
                </span>
                <span className="text-2xl font-black text-amber-700 font-mono">
                  {cards.reduce((sum, c) => sum + (Number(c.foodBasketsQuota) || 0), 0).toLocaleString()} {isAr ? "سلة" : "baskets"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 font-bold flex items-center justify-between">
            <span>{isAr ? "تحديث البيانات تلقائي عبر السحابة" : "Automatic cloud synchronization"}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>

      </div>

    </div>
  );
}
