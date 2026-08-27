"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

export default function Home() {
  const router = useRouter();
  const { adminData, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (adminData) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [adminData, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAF9]">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        {/* Animated Brand Logo Icon */}
        <div className="relative">
          <img
            src="/app_icon.png"
            alt="Al-Fajr Logo"
            className="w-20 h-20 rounded-3xl shadow-2xl shadow-emerald-950/20 object-contain animate-bounce"
          />
          <div className="absolute -inset-1.5 rounded-3xl border-2 border-emerald-500/30 animate-ping pointer-events-none" />
        </div>

        {/* Loading Text */}
        <div className="flex items-center gap-2.5 mt-2 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-4 h-4 border-2 border-[#0A734D] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-xs font-black text-slate-800">
            جاري تهيئة منظومة مؤسسة الفجر الخيرية...
          </span>
        </div>
      </div>
    </div>
  );
}
