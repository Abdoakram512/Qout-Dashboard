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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-bold">جاري تحميل منظومة مؤسسة الفجر الخيرية...</p>
      </div>
    </div>
  );
}
