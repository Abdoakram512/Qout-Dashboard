"use client";

import React from "react";

interface BrandLoaderProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function BrandLoader({ size = "md", fullScreen = false }: BrandLoaderProps) {
  const iconSize = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-20 h-20" : "w-14 h-14";
  const glowSize = size === "sm" ? "w-14 h-14" : size === "lg" ? "w-28 h-28" : "w-20 h-20";
  const barWidth = size === "sm" ? "w-12" : size === "lg" ? "w-24" : "w-16";

  const content = (
    <div className="flex flex-col items-center justify-center relative select-none animate-in fade-in duration-300">
      {/* Soft Ambient Radial Glow */}
      <div className={`absolute ${glowSize} bg-emerald-500/20 rounded-full blur-xl animate-pulse pointer-events-none`} />

      {/* Floating Logo Emblem with Smooth Breathing Effect */}
      <div className="relative z-10">
        <img
          src="/app_icon.png"
          alt="Al-Fajr"
          className={`${iconSize} rounded-2xl shadow-xl shadow-emerald-950/15 object-contain transition-transform duration-700 animate-pulse`}
        />
      </div>

      {/* Minimalist Micro Progress Bar (Sleek Apple/SaaS Style) */}
      <div className={`${barWidth} h-1 bg-slate-200/90 rounded-full overflow-hidden mt-4 relative z-10`}>
        <div className="w-full h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-green-500 rounded-full animate-progress" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#F8FAF9]/90 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

export default BrandLoader;
