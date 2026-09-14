"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CustomerSidebar from "@/components/dashboard/CustomerSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AnimatedMedicalBackground from "@/components/background/AnimatedMedicalBackground";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          const currentPath =
            typeof window !== "undefined" ? window.location.pathname : "";
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (!isCancelled && json?.success && json.data) {
          if (json.data.role === "ADMIN") {
            router.push("/admin");
          }
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return (
    <div className="relative flex min-h-screen overflow-x-hidden">
      {/* Global Authenticated Living Medical Background */}
      <AnimatedMedicalBackground />

      {/* Customer Sidebar (used across all customer application pages) */}
      <div className="relative z-20 flex shrink-0">
        <CustomerSidebar
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Column */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        <DashboardHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
