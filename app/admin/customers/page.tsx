"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import Pagination from "@/components/admin/Pagination";
import SearchFilterBar from "@/components/admin/SearchFilterBar";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import ErrorState from "@/components/admin/ErrorState";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "CUSTOMER" | "ADMIN";
  emailVerifiedAt?: string | null;
  createdAt: string;
  _count: {
    orders: number;
    subscriptions: number;
  };
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load customers");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setCustomers(json.data.items);
        setTotalCount(json.data.pagination.totalCount);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching customers");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="Customer Directory"
        subtitle="Registered patient accounts, contact profiles, lifetime orders, and active refill subscriptions."
        breadcrumbs={[{ label: "Customers" }]}
        actions={
          <button
            type="button"
            onClick={fetchCustomers}
            disabled={loading}
            className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>
        }
      />

      {error && customers.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchCustomers}
            className="underline hover:no-underline font-bold text-rose-900 dark:text-rose-200 ml-3"
          >
            Retry
          </button>
        </div>
      )}

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Search by patient name, email address, or phone..."
        onClear={() => {
          setSearchQuery("");
          setPage(1);
        }}
      />

      {error && customers.length === 0 ? (
        <ErrorState error={error} onRetry={fetchCustomers} />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          {loading && customers.length === 0 ? (
            <LoadingSkeleton rows={8} />
          ) : customers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="👥"
              title="No Customers Found"
              description="No registered user profiles matched your search terms."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Email &amp; Phone</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-center">Subscriptions</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                      >
                        {c.name}
                      </Link>
                      {c.role === "ADMIN" && (
                        <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          Staff
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-zinc-200">{c.email}</div>
                      {c.phone && <div className="text-[11px] text-slate-400">{c.phone}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.emailVerifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-zinc-200">
                      {c._count.orders}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-zinc-200">
                      {c._count.subscriptions}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">
                      {formatDate(c.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
                      >
                        Profile &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
          disabled={loading}
        />
      </div>
      )}
    </div>
  );
}
