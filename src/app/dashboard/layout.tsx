"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, Users, Store, UserCheck, ReceiptText,
  Settings, LogOut, Bell, BarChart3, Activity, X, Menu,
  ShieldCheck, HeartHandshake, Sparkles, CreditCard,
  Clock, ArrowUpRight, CheckCircle2, UserPlus, AlertCircle,
  PackageCheck,
} from "lucide-react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── QOUT Official Brand Logo (Vector Insignia) ───────────────────
function QoutLogo({ isAr }: { isAr: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      {/* Brand Icon Emblem */}
      <div className="relative flex-shrink-0">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0A734D 0%, #063A28 100%)",
            border: "2px solid #F59E0B",
            boxShadow: "0 4px 14px rgba(10, 115, 77, 0.25)",
          }}
        >
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400/25 blur-xs" />
          
          <svg
            className="w-7 h-7 text-white drop-shadow-xs"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
            <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9" stroke="#FFFFFF" strokeWidth="2" />
            <path d="m14 15 2 2" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Brand Text Lockup */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-slate-900 tracking-tight leading-tight">
            {isAr ? "منظومة قُوت" : "QOUT Relief"}
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-mono">
            PRO
          </span>
        </div>
        <span className="text-xs font-bold text-[#0A734D] tracking-wide mt-0.5 leading-none">
          {isAr ? "منظومة الإغاثة الرقمية المركزية" : "Digital Humanitarian Platform"}
        </span>
      </div>
    </div>
  );
}

// ─── Activity Item Type ───────────────────────────────────────────
interface ActivityEvent {
  id: string;
  type: "redemption" | "basket" | "user" | "card";
  title: string;
  subtitle: string;
  time: string;
  timestamp: number;
  amount?: number;
  baskets?: number;
  center?: string;
  badge?: string;
  badgeType?: "emerald" | "amber" | "blue" | "purple";
}

// ─── Live Activity Drawer (Real-Time Functional Stream) ───────────
function ActivityDrawer({ onClose }: { onClose: () => void }) {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [filter, setFilter] = useState<"all" | "redemptions" | "baskets" | "accounts" | "cards">("all");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTimeAgo = (dateMillis: number) => {
    const diff = Math.floor((Date.now() - dateMillis) / 1000);
    if (diff < 60) return isAr ? "الآن" : "Just now";
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return isAr ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    }
    const hours = Math.floor(diff / 3600);
    if (hours < 24) {
      return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return isAr ? `منذ ${days} يوم` : `${days}d ago`;
  };

  useEffect(() => {
    const combined: Record<string, ActivityEvent> = {};

    // 1. Listen to live Merchant Redemptions (Cash)
    const qRed = query(collection(db, "redemptions"), orderBy("timestamp", "desc"), limit(15));
    const unsubRed = onSnapshot(qRed, (snap) => {
      snap.forEach((d) => {
        const data = d.data();
        const t = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
        combined[`red_${d.id}`] = {
          id: d.id,
          type: "redemption",
          title: data.merchantStoreName || (isAr ? "منفذ صرف معتمد" : "Merchant Store"),
          subtitle: `${isAr ? "صرف نقدي للمستفيد:" : "Cash for:"} ${data.beneficiaryName || "—"} (${data.cardId || "Card"})`,
          time: formatTimeAgo(t),
          timestamp: t,
          amount: data.amountDeducted,
          badge: isAr ? "صراف معتمد" : "Merchant",
          badgeType: "emerald",
        };
      });
      updateEventList();
    });

    // 2. Listen to live Admin Basket Distributions
    const qDist = query(collection(db, "basket_distributions"), orderBy("timestamp", "desc"), limit(15));
    const unsubDist = onSnapshot(qDist, (snap) => {
      snap.forEach((d) => {
        const data = d.data();
        const t = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
        combined[`dist_${d.id}`] = {
          id: d.id,
          type: "basket",
          title: data.distributionCenter || (isAr ? "مركز التوزيع الإداري" : "Distribution Center"),
          subtitle: `${isAr ? "تسليم سلال للمستفيد:" : "Delivered baskets to:"} ${data.beneficiaryName || "—"} (${data.cardId || "Card"})`,
          time: formatTimeAgo(t),
          timestamp: t,
          baskets: data.basketsCount,
          center: data.distributionCenter,
          badge: isAr ? "توزيع الإدارة" : "Admin Basket",
          badgeType: "amber",
        };
      });
      updateEventList();
    });

    // 3. Listen to Users / Accounts
    const qUsers = query(collection(db, "users"), limit(15));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      snap.forEach((d) => {
        const data = d.data();
        const t = data.createdAt ? new Date(data.createdAt).getTime() : Date.now() - 3600000;
        const roleLabel = data.role === "merchant"
          ? (isAr ? "صراف معتمد" : "Merchant")
          : data.role === "admin"
          ? (isAr ? "مشرف إداري" : "Admin")
          : (isAr ? "مستفيد" : "Beneficiary");
        
        combined[`usr_${d.id}`] = {
          id: d.id,
          type: "user",
          title: data.name || data.storeName || data.email,
          subtitle: data.isApproved === false
            ? (isAr ? "طلب تسجيل حساب جديد بانتظار الاعتماد" : "Pending registration approval")
            : `${isAr ? "حساب مسجل ومعتمد:" : "Registered:"} ${roleLabel} • ${data.city || (isAr ? "الرياض" : "Riyadh")}`,
          time: formatTimeAgo(t),
          timestamp: t,
          badge: data.isApproved === false ? (isAr ? "معلق" : "Pending") : roleLabel,
          badgeType: data.isApproved === false ? "amber" : "blue",
        };
      });
      updateEventList();
    });

    // 4. Listen to Aid Cards
    const qCards = query(collection(db, "aid_cards"), limit(15));
    const unsubCards = onSnapshot(qCards, (snap) => {
      snap.forEach((d) => {
        const data = d.data();
        const t = data.createdAt ? new Date(data.createdAt).getTime() : Date.now() - 7200000;
        combined[`card_${d.id}`] = {
          id: d.id,
          type: "card",
          title: `${isAr ? "كارت إغاثي:" : "Aid Card:"} ${d.id}`,
          subtitle: `${data.beneficiaryName || data.name || "مستفيد"} • ${data.familyCount || 4} ${isAr ? "أفراد" : "members"} • ${data.residence || "الرياض"}`,
          time: formatTimeAgo(t),
          timestamp: t,
          badge: isAr ? "كارت نشط" : "Card",
          badgeType: "purple",
        };
      });
      updateEventList();
    });

    function updateEventList() {
      const list = Object.values(combined);
      list.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(list.slice(0, 35));
      setLoading(false);
    }

    return () => {
      unsubRed();
      unsubDist();
      unsubUsers();
      unsubCards();
    };
  }, [isAr]);

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "redemptions") return e.type === "redemption";
    if (filter === "baskets") return e.type === "basket";
    if (filter === "accounts") return e.type === "user";
    if (filter === "cards") return e.type === "card";
    return true;
  });

  return (
    <>
      <div className="qout-drawer-overlay" onClick={onClose} />
      <div className="qout-drawer flex flex-col bg-white">
        {/* Drawer Header */}
        <div className="sticky top-0 px-5 py-4.5 flex items-center justify-between z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="live-dot" />
            <div>
              <span className="font-black text-base text-slate-900 leading-none flex items-center gap-2">
                <span>{isAr ? "شريط النشاط المباشر" : "Live Activity Stream"}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                  LIVE
                </span>
              </span>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {isAr ? "متابعة فورية لصرف المتاجر وتوزيع السلال والاعتمادات" : "Real-time redemptions, baskets & system events"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-icon btn-secondary p-2 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex gap-2 overflow-x-auto">
          {(
            [
              { id: "all", labelAr: "الكل", labelEn: "All" },
              { id: "redemptions", labelAr: "صرف المتاجر", labelEn: "Merchants" },
              { id: "baskets", labelAr: "توزيع السلال", labelEn: "Baskets" },
              { id: "accounts", labelAr: "الحسابات", labelEn: "Accounts" },
              { id: "cards", labelAr: "الكروت", labelEn: "Cards" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`btn btn-xs font-black rounded-full px-3 py-1.5 transition-all ${
                filter === t.id
                  ? "bg-[#0A734D] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {isAr ? t.labelAr : t.labelEn}
            </button>
          ))}
        </div>

        {/* Events Feed */}
        <div className="flex-1 p-5 space-y-3 overflow-y-auto">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-bold">{isAr ? "جاري استقبال النشاط المباشر..." : "Listening to live stream..."}</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-700 mb-1">{isAr ? "لا توجد حركات مطابقة" : "No activity events"}</p>
              <p className="text-xs text-slate-500 font-semibold">{isAr ? "ستظهر العمليات الجديدة فور حدوثها في المنظومة." : "New events will appear here in real time."}</p>
            </div>
          ) : (
            filteredEvents.map((e) => (
              <div
                key={e.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex items-start gap-3 relative overflow-hidden group hover:border-emerald-300"
              >
                {/* Event Type Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold shadow-xs ${
                    e.type === "redemption"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : e.type === "basket"
                      ? "bg-amber-50 text-amber-800 border border-amber-300"
                      : e.type === "user"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  {e.type === "redemption" ? (
                    <CreditCard className="w-5 h-5" />
                  ) : e.type === "basket" ? (
                    <PackageCheck className="w-5 h-5 text-amber-700" />
                  ) : e.type === "user" ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {e.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono font-bold flex-shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {e.time}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-semibold leading-relaxed mb-2">
                    {e.subtitle}
                  </p>

                  {/* Cash Redemption Details Row */}
                  {e.type === "redemption" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] font-mono font-black">
                      {e.amount !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                          +{e.amount.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                        </span>
                      )}
                      <span className="text-[10px] font-sans font-bold text-slate-400">
                        {isAr ? "صرف مالي (صراف)" : "Cash POS"}
                      </span>
                    </div>
                  )}

                  {/* Food Basket Details Row */}
                  {e.type === "basket" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] font-mono font-black">
                      {e.baskets !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-sans font-bold">
                          {e.baskets} {isAr ? "سلة غذائية مسلمة" : "baskets"}
                        </span>
                      )}
                      <span className="text-[10px] font-sans font-bold text-amber-800">
                        {isAr ? "تسليم الإدارة" : "Admin"}
                      </span>
                    </div>
                  )}

                  {/* Badge */}
                  {e.badge && e.type !== "redemption" && e.type !== "basket" && (
                    <span
                      className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md ${
                        e.badgeType === "amber"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : e.badgeType === "blue"
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : "bg-purple-100 text-purple-900 border border-purple-300"
                      }`}
                    >
                      {e.badge}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs font-mono font-bold text-slate-600">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            {isAr ? "متصل بقاعدة البيانات الحية" : "Connected to Firestore Live Stream"}
          </span>
          <span>{filteredEvents.length} {isAr ? "حدث" : "events"}</span>
        </div>
      </div>
    </>
  );
}

// ─── Sidebar Navigation Item (Guaranteed Pure White Active State) ──
function NavItem({
  href, icon: Icon, label, isActive, badge, badgeColor,
}: {
  href: string; icon: React.ElementType; label: string;
  isActive: boolean; badge?: number; badgeColor?: "amber" | "emerald";
}) {
  return (
    <a
      href={href}
      className={`sidebar-nav-item ${isActive ? "active active-selected" : ""}`}
      style={
        isActive
          ? {
              backgroundColor: "#0A734D",
              color: "#FFFFFF",
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(10, 115, 77, 0.32)",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <Icon
          className="nav-icon flex-shrink-0"
          style={{
            width: 20,
            height: 20,
            color: isActive ? "#FFFFFF" : "#64748B",
            stroke: isActive ? "#FFFFFF" : "currentColor",
          }}
        />
        <span
          className="text-[14px] leading-tight font-extrabold whitespace-nowrap"
          style={{ color: isActive ? "#FFFFFF" : "#334155" }}
        >
          {label}
        </span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className="text-xs font-black px-2.5 py-0.5 rounded-full flex-shrink-0 min-w-[24px] text-center font-mono"
          style={
            isActive
              ? {
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255, 255, 255, 0.45)",
                }
              : badgeColor === "amber"
              ? {
                  backgroundColor: "#FEF3C7",
                  color: "#78350F",
                  border: "1px solid #FDE68A",
                }
              : {
                  backgroundColor: "#DCFCE7",
                  color: "#14532D",
                  border: "1px solid #BBF7D0",
                }
          }
        >
          {badge}
        </span>
      )}
    </a>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { adminData, logout, loading } = useAuth();
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const isAr = locale === "ar";

  const [pendingCount, setPendingCount]         = useState(0);
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);
  const [merchantCount, setMerchantCount]       = useState(0);
  const [mobileOpen, setMobileOpen]             = useState(false);
  const [activityOpen, setActivityOpen]         = useState(false);
  const [lastSync, setLastSync]                 = useState<string>("—");

  useEffect(() => {
    if (!loading && !adminData) router.push("/login");
  }, [adminData, loading, router]);

  useEffect(() => {
    const qPend = query(collection(db, "users"), where("isApproved", "==", false));
    const u1 = onSnapshot(qPend, (s) => {
      setPendingCount(s.size);
      setLastSync(new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }));
    });
    const u2 = onSnapshot(collection(db, "aid_cards"), (s) => setBeneficiaryCount(s.size));
    const qMerch = query(collection(db, "users"), where("role", "==", "merchant"), where("isActive", "==", true));
    const u3 = onSnapshot(qMerch, (s) => setMerchantCount(s.size));
    return () => { u1(); u2(); };
  }, [isAr]);

  const navSections = [
    {
      label: isAr ? "التشغيل والمتابعة" : "Operations",
      items: [
        { href: "/dashboard",           icon: LayoutDashboard, label: isAr ? "النظرة العامة"     : "Overview" },
        { href: "/dashboard/analytics", icon: BarChart3,       label: isAr ? "التحليلات والإحصاء" : "Analytics" },
      ],
    },
    {
      label: isAr ? "إدارة البيانات" : "Data Management",
      items: [
        { href: "/dashboard/beneficiaries", icon: Users,       label: isAr ? "المستفيدون والكروت" : "Beneficiaries", badge: beneficiaryCount, badgeColor: "emerald" as const },
        { href: "/dashboard/merchants",     icon: Store,       label: isAr ? "المنافذ والصرافون"  : "Merchants",     badge: merchantCount,    badgeColor: "emerald" as const },
        { href: "/dashboard/accounts",      icon: UserCheck,   label: isAr ? "الحسابات والاعتمادات" : "Accounts",      badge: pendingCount,     badgeColor: "amber" as const },
        { href: "/dashboard/transactions",  icon: ReceiptText, label: isAr ? "سجل العمليات"      : "Transactions" },
      ],
    },
    {
      label: isAr ? "النظام الإداري" : "System",
      items: [
        { href: "/dashboard/settings", icon: Settings, label: isAr ? "الإعدادات العامة" : "Settings" },
      ],
    },
  ];

  const pageTitles: Record<string, string> = {
    "/dashboard":               isAr ? "النظرة العامة"      : "Overview",
    "/dashboard/analytics":     isAr ? "مركز التحليلات"     : "Analytics",
    "/dashboard/beneficiaries": isAr ? "المستفيدون والكروت" : "Beneficiaries",
    "/dashboard/merchants":     isAr ? "المنافذ والصرافون"  : "Merchants",
    "/dashboard/accounts":      isAr ? "الحسابات"           : "Accounts",
    "/dashboard/transactions":  isAr ? "سجل العمليات"       : "Transactions",
    "/dashboard/settings":      isAr ? "الإعدادات"          : "Settings",
  };
  const pageTitle = pageTitles[pathname] || "";

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAF9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0A734D] border-2 border-amber-400 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-950/20">
            قُوت
          </div>
          <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const SidebarInner = () => (
    <>
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-slate-200/80 bg-white">
        <QoutLogo isAr={isAr} />
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto bg-white">
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="sidebar-section-label px-3">{section.label}</p>
            <div className="space-y-1 mt-1.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href}
                  badge={"badge" in item ? item.badge : undefined}
                  badgeColor={"badgeColor" in item ? item.badgeColor : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile & Logout (Full Visibility, No Ellipsis) */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/80">
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black bg-[#0A734D] text-white shadow-xs flex-shrink-0"
          >
            {adminData?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 leading-tight">
              {adminData?.name || (isAr ? "المشرف العام لمنظومة قُوت" : "Administrator")}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1 font-semibold break-all">
              {adminData?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-2.5 font-mono font-bold">
          <span>{isAr ? "المزامنة:" : "Sync:"} {lastSync}</span>
          <span className="text-emerald-700 font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Online
          </span>
        </div>

        <button
          onClick={logout}
          className="btn btn-sm w-full justify-center bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 font-black transition-all shadow-xs py-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAF9]">

      {/* Desktop Sidebar (Width 288px / w-72 for complete text visibility) */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-0 h-screen z-30 qout-sidebar bg-white border-r border-slate-200 shadow-xs">
        <SidebarInner />
      </aside>

      {/* Mobile Sidebar (Responsive Drawer with Smooth Start-Edge Docking) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 start-0 h-full w-72 z-50 flex flex-col lg:hidden qout-sidebar bg-white shadow-2xl border-inline-end border-slate-200 animate-slide-in"
          >
            <button
              className="absolute top-4 end-4 btn btn-icon bg-slate-100 text-slate-600 hover:bg-slate-200 z-10 p-2 rounded-xl"
              onClick={() => setMobileOpen(false)}
              title={isAr ? "إغلاق القائمة" : "Close Menu"}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pt-2 flex flex-col h-full overflow-hidden">
              <SidebarInner />
            </div>
          </aside>
        </>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar (Responsive for Mobile, Tablet & Desktop) */}
        <header className="qout-topbar sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-xs h-16">

          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              className="lg:hidden btn btn-icon btn-secondary p-2 rounded-xl"
              onClick={() => setMobileOpen(true)}
              aria-label={isAr ? "فتح القائمة" : "Open Navigation"}
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
            {pageTitle && (
              <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 truncate">
                {pageTitle}
              </h2>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">

            {/* Pending Accounts Alert */}
            {pendingCount > 0 && (
              <a
                href="/dashboard/accounts"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all shadow-xs"
              >
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span>{pendingCount} {isAr ? "معلق للاعتماد" : "pending"}</span>
              </a>
            )}

            {/* Activity Feed Button */}
            <button
              onClick={() => setActivityOpen(true)}
              className="btn btn-icon btn-secondary relative p-2 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
              title={isAr ? "النشاط الحي المباشر" : "Live Activity"}
            >
              <Activity className="w-4 h-4 text-slate-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLocale(isAr ? "en" : "ar")}
              className="btn btn-sm btn-secondary font-bold text-xs px-3.5 py-1.5 border border-slate-200"
            >
              {isAr ? "English" : "عربي"}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-5 lg:p-7 max-w-[1440px] w-full mx-auto page-enter">
          {children}
        </main>
      </div>

      {activityOpen && <ActivityDrawer onClose={() => setActivityOpen(false)} />}
    </div>
  );
}
