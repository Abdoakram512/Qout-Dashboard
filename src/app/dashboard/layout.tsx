"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, Users, Store, UserCheck, ReceiptText,
  Settings, LogOut, Bell, BarChart3, Activity, X, Menu,
  ShieldCheck, HeartHandshake, Sparkles, CreditCard,
  Clock, ArrowUpRight, CheckCircle2, UserPlus, AlertCircle,
  PackageCheck, Volume2,
} from "lucide-react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notificationService } from "@/lib/notificationSound";

// ─── Al-Fajr Foundation Brand Logo (Vector Insignia) ──────────────────
function AlFajrLogo({ isAr }: { isAr: boolean }) {
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
            {/* Sunrise / Crescent Foundation Emblem */}
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#F59E0B" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Brand Text Lockup */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-slate-900 tracking-tight leading-tight">
            {isAr ? "مؤسسة الفجر" : "Al-Fajr Relief"}
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-mono">
            PRO
          </span>
        </div>
        <span className="text-xs font-bold text-[#0A734D] tracking-wide mt-0.5 leading-none">
          {isAr ? "المؤسسة الخيرية المركزية" : "Humanitarian Foundation"}
        </span>
      </div>
    </div>
  );
}

// ─── Activity Item Type ───────────────────────────────────────────────
interface ActivityEvent {
  id: string;
  type: "redemption" | "basket" | "user" | "card" | "receipt";
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

// ─── Real-Time Live Activity Feed Drawer ──────────────────────────────
function ActivityDrawer({ onClose }: { onClose: () => void }) {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "redemptions" | "baskets" | "accounts" | "cards">("all");

  const formatTimeAgo = (ts: number) => {
    const diff = Math.max(0, Date.now() - ts);
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return isAr ? "الآن" : "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return isAr ? `منذ ${mins} د` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return isAr ? `منذ ${hours} س` : `${hours}h ago`;
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
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : e.type === "user"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  {e.type === "redemption" && <CreditCard className="w-5 h-5" />}
                  {e.type === "basket" && <PackageCheck className="w-5 h-5" />}
                  {e.type === "user" && <UserPlus className="w-5 h-5" />}
                  {e.type === "card" && <Sparkles className="w-5 h-5" />}
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {e.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {e.time}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-semibold leading-relaxed line-clamp-2">
                    {e.subtitle}
                  </p>

                  {/* Financial / Basket Metadata */}
                  {e.amount !== undefined && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] font-mono font-black">
                      <span className="text-[#0A734D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {e.amount.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </span>
                      <span className="text-[10px] font-sans font-bold text-slate-500">
                        {isAr ? "صرف نقدي" : "Cash Redemption"}
                      </span>
                    </div>
                  )}

                  {e.baskets !== undefined && (
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

// ─── Sidebar Navigation Item (Guaranteed Pure White Active State) ──────
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
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Icon
          className="nav-icon flex-shrink-0"
          style={{
            width: 19,
            height: 19,
            color: isActive ? "#FFFFFF" : "#64748B",
            stroke: isActive ? "#FFFFFF" : "currentColor",
          }}
        />
        <span
          className="text-[13.5px] leading-tight font-extrabold truncate"
          style={{ color: isActive ? "#FFFFFF" : "#334155" }}
          title={label}
        >
          {label}
        </span>
      </div>

      {badge !== undefined && badge > 0 && (
        <span
          className={`sidebar-badge flex-shrink-0 ms-2 ${
            badgeColor === "amber" ? "amber" : "emerald"
          }`}
        >
          {badge}
        </span>
      )}
    </a>
  );
}

// ─── Dashboard Main Shell Layout ──────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { adminData, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const isAr = locale === "ar";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);
  const [merchantCount, setMerchantCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [lastSync, setLastSync] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Live Toast State for Real-Time Confirmation Alerts
  const [liveToast, setLiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: "receipt" | "alert";
  } | null>(null);

  const initialReceiptsLoaded = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

  // ─── Live Listeners for Real-Time Badges & Receipts ───────────────
  useEffect(() => {
    // 1. Pending accounts
    const qPend = query(collection(db, "users"), where("isApproved", "==", false));
    const u1 = onSnapshot(qPend, (s) => {
      setPendingCount(s.size);
      setLastSync(new Date().toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }));
    });

    // 2. Beneficiaries (aid_cards)
    const u2 = onSnapshot(collection(db, "aid_cards"), (s) => setBeneficiaryCount(s.size));

    // 3. Approved Merchants
    const qMerch = query(collection(db, "users"), where("role", "==", "merchant"), where("isActive", "==", true));
    const u3 = onSnapshot(qMerch, (s) => setMerchantCount(s.size));

    // 4. Pending Extra Disbursement Requests
    const qReq = query(collection(db, "extra_disbursement_requests"), where("status", "==", "pending"));
    const u4 = onSnapshot(qReq, (s) => setPendingRequestsCount(s.size));

    // 5. Live Payment Receipts Confirmation Listener with Audio Alert & Notification
    const qReceipts = query(collection(db, "payment_receipts"), orderBy("timestamp", "desc"), limit(10));
    const u5 = onSnapshot(qReceipts, (snap) => {
      if (!initialReceiptsLoaded.current) {
        initialReceiptsLoaded.current = true;
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const rData = change.doc.data();
          if (rData.status === "confirmed_by_merchant" || rData.status === "confirmed" || rData.isConfirmed === true) {
            // Trigger audio sound and browser desktop notification
            notificationService.notify(
              isAr ? "تأكيد استلام حوالة من الصراف ✅" : "Merchant Confirmed Receipt ✅",
              {
                body: `${rData.merchantStoreName || "الصراف"} أكد استلام مبلغ ${rData.amount?.toLocaleString() || 0} ج.م (مرجع: ${rData.referenceNumber || rData.receiptId || "—"})`,
              },
              "receipt"
            );

            // Trigger floating Toast
            setLiveToast({
              id: change.doc.id,
              title: isAr ? "تأكيد حوالة من الصراف ✅" : "Receipt Confirmed ✅",
              message: isAr
                ? `قام الصراف "${rData.merchantStoreName || "المنفذ"}" بتأكيد استلام حوالة بقيمة ${rData.amount?.toLocaleString() || 0} ج.م بنجاح.`
                : `Merchant "${rData.merchantStoreName || "Store"}" confirmed payment receipt of ${rData.amount?.toLocaleString() || 0} EGP.`,
              type: "receipt",
            });

            setTimeout(() => setLiveToast(null), 6000);
          }
        }
      });
    });

    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [isAr]);

  const navSections = [
    {
      label: isAr ? "التشغيل والمتابعة" : "Operations",
      items: [
        { href: "/dashboard",           icon: LayoutDashboard, label: isAr ? "النظرة العامة"     : "Overview" },
        { href: "/dashboard/analytics", icon: BarChart3,       label: isAr ? "التقارير والتحليلات" : "Reports & Analytics" },
      ],
    },
    {
      label: isAr ? "إدارة البيانات والعمليات" : "Data & Operations",
      items: [
        { href: "/dashboard/beneficiaries",         icon: Users,       label: isAr ? "المستفيدون والكروت" : "Beneficiaries", badge: beneficiaryCount, badgeColor: "emerald" as const },
        { href: "/dashboard/merchants", icon: Store, label: isAr ? "المنافذ والميزانيات" : "Merchants & Budgets", badge: merchantCount, badgeColor: "emerald" as const },
        { href: "/dashboard/receipts", icon: ReceiptText, label: isAr ? "وصولات التحويلات" : "Payment Receipts" },
        { href: "/dashboard/disbursement-requests", icon: AlertCircle, label: isAr ? "طلبات الصرف الإضافي" : "Extra Disbursements", badge: pendingRequestsCount, badgeColor: "amber" as const },
        { href: "/dashboard/accounts",              icon: UserCheck,   label: isAr ? "الحسابات والاعتمادات" : "Accounts",      badge: pendingCount,     badgeColor: "amber" as const },
        { href: "/dashboard/transactions",          icon: ReceiptText, label: isAr ? "سجل العمليات"      : "Transactions" },
      ],
    },
    {
      label: isAr ? "النظام الإداري" : "System",
      items: [
        { href: "/dashboard/settings", icon: Settings, label: isAr ? "الإعدادات العامة" : "Settings" },
      ],
    },
  ];

  const getPageTitle = (path: string) => {
    if (path === "/dashboard") return isAr ? "النظرة العامة" : "Overview";
    if (path === "/dashboard/analytics") return isAr ? "مركز التحليلات والإقفال المالي" : "Analytics & Financial Close";
    if (path === "/dashboard/beneficiaries") return isAr ? "المستفيدون والكروت الإغاثية" : "Beneficiaries & Aid Cards";
    if (path.startsWith("/dashboard/beneficiaries/")) return isAr ? "ملف المستفيد الشامل (360°)" : "Beneficiary 360° Profile";
    if (path === "/dashboard/receipts") return isAr ? "وصولات التحويلات وإشعارات الدفع" : "Payment Transfer Receipts";
    if (path === "/dashboard/merchants") return isAr ? "المنافذ والصرافون والميزانيات" : "Merchants & Liquidity";
    if (path.startsWith("/dashboard/merchants/")) return isAr ? "بروفايل الصراف والمحفظة المالية" : "Merchant Ledger & Profile";
    if (path === "/dashboard/disbursement-requests") return isAr ? "طلبات الصرف الإضافي والاستثنائي" : "Extra Disbursement Requests";
    if (path === "/dashboard/accounts") return isAr ? "إدارة الحسابات" : "Accounts Management";
    if (path === "/dashboard/transactions") return isAr ? "سجل العمليات" : "Redemption Transactions";
    if (path === "/dashboard/settings") return isAr ? "الإعدادات" : "Settings";
    return isAr ? "لوحة التحكم" : "Dashboard";
  };

  const pageTitle = getPageTitle(pathname);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAF9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0A734D] border-2 border-amber-400 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-950/20">
            الفجر
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
        <AlFajrLogo isAr={isAr} />
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
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  badge={item.badge}
                  badgeColor={item.badgeColor}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Card & Signout Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/80 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0A734D] flex items-center justify-center font-black text-sm border border-emerald-300">
            {adminData?.name?.[0] || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 truncate">
              {adminData?.name || (isAr ? "مشرف المنظومة" : "Admin")}
            </p>
            <p className="text-[11px] font-bold text-slate-400 truncate">
              {adminData?.email || "admin@alfajr.org"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-sm btn-secondary w-full justify-center text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAF9]" dir={isAr ? "rtl" : "ltr"}>

      {/* Floating Live Alert Toast */}
      {liveToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-md w-full px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500 shadow-2xl flex items-start gap-3 relative">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0A734D] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">{liveToast.title}</span>
                <button
                  onClick={() => setLiveToast(null)}
                  className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-600 mt-1 leading-relaxed">
                {liveToast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 bg-white border-e border-slate-200/80 shadow-xs h-screen sticky top-0 z-30">
        <SidebarInner />
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-80 bg-white flex flex-col shadow-2xl lg:hidden">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 end-4 p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all z-10"
              aria-label="Close"
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
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button
              className="lg:hidden btn btn-icon btn-secondary p-2 rounded-xl flex-shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label={isAr ? "فتح القائمة" : "Open Navigation"}
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
            {pageTitle && (
              <h2 className="text-xs sm:text-base lg:text-lg font-black text-slate-900 truncate">
                {pageTitle}
              </h2>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">

            {/* Audio Alert Activator Button */}
            <button
              onClick={async () => {
                const granted = await notificationService.requestPermission();
                notificationService.playChime("success");
              }}
              className="btn btn-sm bg-emerald-50 hover:bg-emerald-100 text-[#0A734D] border border-emerald-200 font-bold text-xs px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl shadow-xs"
              title={isAr ? "تفعيل التنبيهات الصوتية والإشعارات لعمليات الصراف" : "Enable Audio & Desktop Notifications"}
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">{isAr ? "التنبيهات الصوتية" : "Audio Alerts"}</span>
            </button>

            {/* Pending Accounts Alert */}
            {pendingCount > 0 && (
              <a
                href="/dashboard/accounts"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all shadow-xs"
                title={isAr ? `${pendingCount} حسابات معلقة للاعتماد` : `${pendingCount} pending accounts`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                <span className="hidden sm:inline">{pendingCount} {isAr ? "معلق للاعتماد" : "pending"}</span>
                <span className="sm:hidden font-mono font-black">{pendingCount}</span>
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
