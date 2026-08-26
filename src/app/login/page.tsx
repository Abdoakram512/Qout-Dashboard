"use client";
import Link from "next/link";

import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import { ShieldCheck, Mail, Lock, Globe, AlertCircle, Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(locale === "ar" ? "يرجى كتابة البريد وكلمة المرور" : "Please enter email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || t("error_auth"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher Button */}
      <div className="absolute top-4 end-4 sm:top-6 sm:end-6 z-20">
        <button
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all border border-white/15 cursor-pointer shadow-sm"
        >
          <Globe className="w-4 h-4" />
          <span>{locale === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/40">
          
          {/* Header & Title */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-700/30 mb-3.5">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-emerald-800 text-[11px] font-black tracking-wider font-mono">ADMIN CONTROL</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {t("app_title")}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-bold mt-1 max-w-xs">{t("admin_portal")}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {t("email_label")}
              </label>
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@alfajr.org"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all pl-10 font-bold"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {t("password_label")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all pl-10 pr-11 font-mono font-bold"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer z-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? (locale === "ar" ? "إخفاء كلمة المرور" : "Hide password") : (locale === "ar" ? "إظهار كلمة المرور" : "Show password")}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t("login_btn")}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-slate-100 text-center space-y-2">
            <Link
              href="/download"
              className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
            >
              <span>📱 تحميل تطبيق الموبايل (Android / iOS)</span>
            </Link>
            <p className="text-[11px] text-slate-400 font-semibold">
              Al-Fajr Relief Organization © 2026 • Highly Secure Admin Infrastructure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
