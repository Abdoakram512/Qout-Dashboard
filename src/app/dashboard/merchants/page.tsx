"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { UserModel } from "@/types";
import {
  Store, Search, CheckCircle2, XCircle, Building2,
  MapPin, Mail, Hash, TrendingUp, CreditCard, ShieldCheck,
} from "lucide-react";

export default function MerchantsPage() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";

  const [merchants, setMerchants] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "merchant"));
    const unsub = onSnapshot(q, (snap) => {
      const list: UserModel[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...d.data() } as UserModel));
      list.sort((a, b) => (b.totalDisbursed ?? 0) - (a.totalDisbursed ?? 0));
      setMerchants(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggle = async (m: UserModel) => {
    setUpdatingId(m.uid);
    try {
      await updateDoc(doc(db, "users", m.uid), {
        isActive: !m.isActive,
        isApproved: !m.isActive,
      });
    } catch (e) {
      console.error(e);
    }
    setUpdatingId(null);
  };

  const filtered = merchants.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.storeName?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q);
    const matchFilter = filter === "all" ? true : filter === "active" ? m.isActive : !m.isActive;
    return matchSearch && matchFilter;
  });

  const activeCount = merchants.filter((m) => m.isActive).length;
  const suspendedCount = merchants.filter((m) => !m.isActive).length;
  const totalDisbursed = merchants.reduce((a, m) => a + (m.totalDisbursed ?? 0), 0);
  const topMerchantId = filtered[0]?.uid;

  return (
    <div className="space-y-6 page-enter">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0A734D, #063A28)" }}
          >
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900">
              {isAr ? "المنافذ والصرافون المعتمدون" : "Authorized Merchants & Stores"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {isAr
                ? "إدارة شبكة المتاجر ومنافذ صرف الحصص الإغاثية ومتابعة الاعتمادات"
                : "Manage disbursement network stores and monitor active status"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
        <div className="qout-card p-4 bg-white border-r-4 border-r-emerald-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "المنافذ النشطة" : "Active Stores"}
            </p>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="qout-card p-4 bg-white border-r-4 border-r-red-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "المنافذ الموقوفة" : "Suspended Stores"}
            </p>
            <p className="text-2xl font-black text-red-600 font-mono mt-0.5">{suspendedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="qout-card p-4 bg-white border-r-4 border-r-amber-600 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {isAr ? "إجمالي مبالغ الصرف" : "Total Disbursed"}
            </p>
            <p className="text-2xl font-black text-amber-700 font-mono mt-0.5">
              {totalDisbursed.toLocaleString()} <span className="text-xs text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث باسم المتجر، المدينة، المسؤول، أو السجل التجاري..." : "Search store name, city, owner, CR..."}
            className="qout-input ps-10"
          />
          <Search className="w-4 h-4 absolute start-3.5 top-3 text-slate-400" />
        </div>
        <div className="flex gap-2">
          {(
            [
              { id: "all", labelAr: "الكل", labelEn: "All" },
              { id: "active", labelAr: "نشط", labelEn: "Active" },
              { id: "suspended", labelAr: "موقوف", labelEn: "Suspended" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-sm ${filter === f.id ? "btn-primary" : "btn-secondary"}`}
            >
              {isAr ? f.labelAr : f.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Merchant Cards Grid (Full Text, Zero Ellipsis) ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="qout-card py-16 text-center bg-white">
          <Store className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">
            {isAr ? "لا توجد منافذ صرف مطابقة للبحث" : "No matching merchants found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((m, idx) => {
            const isTop = m.uid === topMerchantId && m.isActive;
            return (
              <div
                key={m.uid}
                className={`qout-card p-5 bg-white flex flex-col justify-between transition-all ${
                  isTop ? "border-emerald-500 shadow-md" : ""
                } ${!m.isActive ? "border-red-200 bg-red-50/20" : ""}`}
                style={{
                  borderRightWidth: isTop ? 4 : undefined,
                  borderRightColor: isTop ? "#0A734D" : undefined,
                }}
              >
                <div>
                  {/* Top Badge if top performer */}
                  {isTop && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-[11px] font-black uppercase tracking-wide px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        {isAr ? "المنفذ الأعلى صرفاً بالمنظومة" : "Top Disbursement Store"}
                      </span>
                    </div>
                  )}

                  {/* Header (Full Name, No Ellipsis) */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          m.isActive ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900 leading-snug">
                          {m.storeName || m.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">{m.name}</p>
                      </div>
                    </div>
                    <span className={`badge flex-shrink-0 ${m.isActive ? "badge-active" : "badge-suspended"}`}>
                      {m.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "موقوف" : "Suspended")}
                    </span>
                  </div>

                  {/* Info Box (Full Details, No Ellipsis) */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 mb-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold flex-shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{isAr ? "البريد:" : "Email:"}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 break-all text-end">
                        {m.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isAr ? "المدينة:" : "City:"}</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {m.city || (isAr ? "غير محدد" : "Not specified")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold flex-shrink-0">
                        <Hash className="w-3.5 h-3.5" />
                        <span>{isAr ? "السجل التجاري:" : "CR Number:"}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {m.commercialReg || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 text-slate-700 font-black">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isAr ? "إجمالي المصروف:" : "Disbursed:"}</span>
                      </div>
                      <span className="font-black text-emerald-800 font-mono text-sm">
                        {(m.totalDisbursed || 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">{isAr ? "ج.م" : "EGP"}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{isAr ? "عدد العمليات:" : "Txns Count:"}</span>
                      </div>
                      <span className="font-mono font-black text-slate-800">
                        {m.totalTransactions || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Button */}
                <button
                  disabled={updatingId === m.uid}
                  onClick={() => handleToggle(m)}
                  className={`btn w-full justify-center py-2.5 font-black ${m.isActive ? "btn-danger" : "btn-primary"}`}
                >
                  {updatingId === m.uid ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : m.isActive ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{isAr ? "تعطيل حساب الصراف" : "Suspend Merchant"}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? "تفعيل واعتماد الصراف" : "Activate Merchant"}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
