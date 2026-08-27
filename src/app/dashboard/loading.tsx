import React from "react";
import { BrandLoader } from "@/components/common/BrandLoader";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <BrandLoader size="md" />
    </div>
  );
}
