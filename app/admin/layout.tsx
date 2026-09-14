import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { verifyToken } from "@/lib/auth";

function AdminAccessDenied() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-[#fbfdfc] dark:bg-zinc-950">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/40 p-8 text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Admin Access Denied
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          You do not have staff administrative privileges to view this portal. PharmaLoop operations and order fulfillment are restricted to verified administrators.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1b5e3b] text-white font-medium text-sm hover:bg-[#154a2e] transition-colors shadow-xs"
          >
            Return to Customer Dashboard
          </Link>
          <Link
            href="/orders"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login?redirect=/admin");
  }

  const payload = verifyToken(token);
  if (!payload) {
    redirect("/login?redirect=/admin");
  }

  if (payload.role !== "ADMIN") {
    return <AdminAccessDenied />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row bg-[#fbfdfc] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <Sidebar />
      <main
        id="admin-main-content"
        aria-label="Admin console content"
        className="flex-1 overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
