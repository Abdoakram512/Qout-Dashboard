"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import {
  Smartphone,
  Download,
  QrCode,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Apple,
  Store,
  CreditCard,
  Building2,
  Lock,
  ExternalLink,
  ChevronRight,
  Heart,
  Globe,
  Share2,
  PlusSquare,
  HelpCircle
} from "lucide-react";

export default function DownloadPage() {
  const [downloadUrl, setDownloadUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDownloadUrl(window.location.origin + "/downloads/alfajr-qout.apk");
    }
  }, []);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && downloadUrl) {
      navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-900/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-wide block leading-none">
                مؤسسة الفجر الخيرية
              </span>
              <span className="text-[11px] font-bold text-emerald-400 block mt-1">
                منظومة قُوت الإغاثية الموحدة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all hover:border-emerald-500"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>دخول لوحة التحكم</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Download Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>الإصدار الرسمي المعتمد v1.0.0</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            حمّل تطبيق <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">قُوت الإغاثي</span> على هاتفك الآن
          </h1>

          <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed">
            تطبيق متكامل لمتابعة الأرصدة النقدية، استلام السلال الغذائية، وإدارة عمليات الصرف الميداني للمستفيدين والصرافين بكل سهولة وأمان.
          </p>

          {/* OS Switcher Tabs */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 gap-1.5 shadow-xl mt-4">
            <button
              onClick={() => setActiveTab("android")}
              className={"flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all " + (
                activeTab === "android"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Smartphone className="w-4 h-4" />
              <span>نسخة أندرويد (Android APK)</span>
            </button>
            <button
              onClick={() => setActiveTab("ios")}
              className={"flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all " + (
                activeTab === "ios"
                  ? "bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg shadow-slate-950/40"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Apple className="w-4 h-4" />
              <span>نسخة آيفون (Apple iOS)</span>
            </button>
          </div>
        </div>

        {/* Tab Content: Android */}
        {activeTab === "android" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
            {/* Download CTA Card */}
            <div className="lg:col-span-7 bg-slate-900/80 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-950/30">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">تطبيق قُوت - أندرويد</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ملف APK مباشر • 38 ميجابايت • مجاني</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  متوافق مع Android 6.0+
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <a
                  href="/downloads/alfajr-qout.apk"
                  download="alfajr-qout.apk"
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>تحميل ملف APK المباشر الآن</span>
                </a>

                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>{copied ? "تم نسخ رابط التحميل بنجاح! ✅" : "نسخ رابط التحميل المباشر لمشاركته"}</span>
                </button>
              </div>

              {/* Security & Installation Guarantee */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>ملف فحص معتمد وخالٍ من الفيروسات</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>تحديثات تلقائية متزامنة مع السحابة</span>
                </div>
              </div>
            </div>

            {/* QR Code Scanner Card */}
            <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-white shadow-2xl">
                <QRCodeCanvas
                  value={downloadUrl || "https://qout-f853f.web.app/downloads/alfajr-qout.apk"}
                  size={160}
                  level="H"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-white">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>امسح الرمز بكاميرا هاتفك</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  وجّه كاميرا هاتفك الأندرويد للرمز لبدء التنزيل التلقائي فوراً
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: iOS (iPhone) */}
        {activeTab === "ios" && (
          <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-500 text-white flex items-center justify-center shadow-lg">
                <Apple className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تشغيل وتثبيت التطبيق على الآيفون (iOS)</h3>
                <p className="text-xs text-slate-400 mt-0.5">تطبيق ويب تقدمي فائق السرعة PWA دون الحاجة لمتجر App Store</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>خطوات التثبيت السريع على هاتف آيفون (خلال 10 ثوانٍ):</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-black">
                    1
                  </div>
                  <p className="font-bold text-white">افتح الموقع في Safari</p>
                  <p className="text-slate-400 text-[11px]">افتح رابط المنظومة من خلال متصفح سفاري على هاتفك.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-black">
                    2
                  </div>
                  <p className="font-bold text-white">اضغط زر المشاركة (Share)</p>
                  <p className="text-slate-400 text-[11px]">اضغط على أيقونة المشاركة في أسفل شاشة Safari.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-black">
                    3
                  </div>
                  <p className="font-bold text-white">إضافة للشاشة الرئيسية</p>
                  <p className="text-slate-400 text-[11px]">اختر Add to Home Screen وسيظهر التطبيق على شاشتك مباشرة.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-slate-400 font-bold">
                نسخة الـ App Store الرسمية قيد النشر والمراجعة حالياً.
              </span>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                دخول البوابة الآن
              </Link>
            </div>
          </div>
        )}

        {/* App Features & Value Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-16 pt-12 border-t border-slate-800/60">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white">كروت المستفيدين الذكية</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              محفظة رقمية لمعرفة رصيد الدعم النقدي المتبقي، حصص السلال الغذائية، وسجل الصرف الميداني.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white">بوابة الصرافين والمنافذ</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              ماسح باركود QR سريع لإتمام عمليات الصرف والخصم في ثوانٍ مع تتبع العهدة المالية وتأكيد الحوالات.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white">أمان وشفافية مطلقة</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              توثيق كامل لكافة الحركات المالية مع تشفير البيانات والعمل دون انقطاع عبر سحابة Firebase.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-6 px-4 sm:px-8 text-center text-xs text-slate-500 font-bold">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 مؤسسة الفجر الخيرية — جميع الحقوق محفوظة منظومة قُوت</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/login" className="hover:text-emerald-400 transition-colors">بوابة الإدارة</Link>
            <span>•</span>
            <Link href="/download" className="hover:text-emerald-400 transition-colors">تحميل التطبيق</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
