"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { BrandLoader } from "@/components/common/BrandLoader";

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

  return <BrandLoader size="lg" fullScreen />;
}
