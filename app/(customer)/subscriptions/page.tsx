"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SummaryCard from "@/components/dashboard/SummaryCard";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  stock?: number;
  isActive?: boolean;
}

interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface Address {
  id: string;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface Subscription {
  id: string;
  userId: string;
  addressId: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  nextRefillDate: string;
  refillTime: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  pausedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  address?: Address | null;
  items: SubscriptionItem[];
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function SubscriptionsPage() {
  const router = useRouter();

  // Hydration safety mount check
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Subscription state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active filter tab: "all" | "active" | "paused"
  const [filterTab, setFilterTab] = useState<"all" | "active" | "paused">("all");

  // Modal confirmation state
  const [modalAction, setModalAction] = useState<{
    subId: string;
    action: "pause" | "resume" | "cancel" | "skip";
    title: string;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Re-fetch helper for actions or manual retry
  const handleReload = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/subscriptions")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load subscriptions");
        return res.json();
      })
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSubscriptions(json.data);
        } else {
          setSubscriptions([]);
        }
      })
      .catch((err) => {
        console.error("[Subscriptions Page Error]", err);
        setError("Unable to load subscriptions. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Initial auth and subscription fetch
  useEffect(() => {
    let isCancelled = false;

    // Check auth session
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
        }
        return res.json();
      })
      .catch(() => {});

    // Initial load
    fetch("/api/subscriptions")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load subscriptions");
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          if (json.success && Array.isArray(json.data)) {
            setSubscriptions(json.data);
          } else {
            setSubscriptions([]);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("[Subscriptions Initial Load Error]", err);
          setError("Unable to load subscriptions. Please try again.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [router]);

  // Handle action (Pause / Resume / Cancel)
  const executeSubscriptionAction = async () => {
    if (!modalAction) return;
    const { subId, action } = modalAction;
    setLoadingAction(action);

    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (data.success) {
        setModalAction(null);
        handleReload();
      } else {
        alert(data.error || "Failed to perform action");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  // Derived counts
  const totalCount = subscriptions.length;
  const activeCount = useMemo(
    () => subscriptions.filter((s) => s.status === "ACTIVE").length,
    [subscriptions]
  );
  const pausedCount = useMemo(
    () => subscriptions.filter((s) => s.status === "PAUSED").length,
    [subscriptions]
  );

  // Monthly Spend calculation from REAL subscriptions
  const monthlySpend = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === "ACTIVE")
      .reduce((total, sub) => {
        const refillCost = (sub.items || []).reduce((sum, item) => {
          const price = Number(item.product?.price ?? 0);
          const qty = item.quantity ?? 1;
          return sum + price * qty;
        }, 0);
        const multiplier =
          sub.frequency === "WEEKLY" ? 4 : sub.frequency === "BIWEEKLY" ? 2 : 1;
        return total + refillCost * multiplier;
      }, 0);
  }, [subscriptions]);

  // Filter subscriptions based on selected tab
  const filteredSubscriptions = useMemo(() => {
    if (filterTab === "active") {
      return subscriptions.filter((s) => s.status === "ACTIVE");
    }
    if (filterTab === "paused") {
      return subscriptions.filter((s) => s.status === "PAUSED");
    }
    return subscriptions;
  }, [subscriptions, filterTab]);

  // Format frequency text
  const formatFrequency = (freq: string) => {
    switch (freq) {
      case "WEEKLY":
        return "Every Week";
      case "BIWEEKLY":
        return "Every 2 Weeks";
      case "MONTHLY":
        return "Every Month";
      default:
        return freq;
    }
  };

  // Format date safely
  const formatRefillDate = (dateStr: string) => {
    if (!dateStr) return "Not set";
    if (!isMounted) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Derive Category tag from product name or description
  const deriveCategory = (name: string, description?: string | null) => {
    const combined = `${name} ${description || ""}`.toLowerCase();
    if (combined.includes("crocin") || combined.includes("paracetamol") || combined.includes("pain") || combined.includes("dolo") || combined.includes("calpol")) {
      return "Pain Relief";
    }
    if (combined.includes("vitamin") || combined.includes("d3") || combined.includes("calcium") || combined.includes("b12") || combined.includes("revital")) {
      return "Vitamins";
    }
    if (combined.includes("amoxicillin") || combined.includes("augmentin") || combined.includes("antibiotic") || combined.includes("azithromycin")) {
      return "Antibiotic";
    }
    if (combined.includes("cough") || combined.includes("cold") || combined.includes("flu") || combined.includes("vicks")) {
      return "Cold & Flu";
    }
    return "Prescription";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 page-entrance">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
          Dashboard
        </Link>
        <span>&gt;</span>
        <span className="text-slate-800">My Subscriptions</span>
      </nav>

      {/* ─── Top Page Header & Promotional Banner ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            My Subscriptions
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Manage all your active medicine refill subscriptions.
          </p>
        </div>

        {/* Center: Promotional Banner + Add Subscription CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Promotional Banner */}
          <div className="glass-card rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/80 border border-emerald-200/80 px-4 py-2.5 flex items-center justify-between gap-4 shadow-xs hover:shadow-sm transition-all">
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-[#0f3822] tracking-tight">
                Never Miss Your Medicines
              </p>
              <p className="text-[11px] font-semibold text-[#1b5e3b] mt-0.5">
                Stay consistent. Stay healthier. 💚
              </p>
            </div>

            {/* Calendar & Leaves Graphic Illustration */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 border border-emerald-200/60 shadow-xs">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="24" height="22" rx="6" fill="#ecfdf5" stroke="#10b981" strokeWidth={1.5} />
                <path d="M4 12h24" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" />
                <circle cx="10" cy="9" r="1.2" fill="#047857" />
                <circle cx="22" cy="9" r="1.2" fill="#047857" />
                <path d="M16 16c-1.5-1.5-3.5 0-3.5 1.5 0 2 3.5 4 3.5 4s3.5-2 3.5-4c0-1.5-2-1.5-3.5-1.5z" fill="#10b981" />
              </svg>
            </div>
          </div>

          {/* Primary CTA: + Add Subscription */}
          <Link
            href="/dashboard/medicines"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-sm active:scale-[0.98] transition-all shrink-0"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Add Subscription</span>
          </Link>
        </div>
      </div>

      {/* ─── Row of 4 Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Subscriptions */}
        <SummaryCard
          isLoading={loading}
          iconBg="bg-[#eff6ff]"
          icon={
            <div className="flex h-5 w-5 items-center justify-center rounded-xs bg-blue-500 text-white">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.02l.478.477a7 7 0 0011.96-3.212.75.75 0 00-1.626-.632zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.48a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.02l-.478-.477a7 7 0 00-11.96 3.212.75.75 0 001.626.632z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          }
          label="Total Subscriptions"
          value={String(totalCount)}
        />

        {/* Card 2: Active */}
        <SummaryCard
          isLoading={loading}
          iconBg="bg-[#ecf9f0]"
          icon={
            <div className="flex h-5 w-5 items-center justify-center rounded-xs bg-[#1b5e3b] text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          }
          label="Active"
          value={String(activeCount)}
        />

        {/* Card 3: Paused */}
        <SummaryCard
          isLoading={loading}
          iconBg="bg-[#fef9c3]/80"
          icon={
            <div className="flex h-5 w-5 items-center justify-center rounded-xs bg-amber-500 text-white">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          }
          label="Paused"
          value={String(pausedCount)}
        />

        {/* Card 4: Monthly Spend */}
        <SummaryCard
          isLoading={loading}
          iconBg="bg-[#f0f9ff]"
          icon={<span className="text-sky-500 text-sm select-none">💳</span>}
          label="Monthly Spend"
          value={isMounted ? `₹${monthlySpend.toLocaleString("en-IN")}` : "₹0"}
        />
      </div>

      {/* ─── Filter Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            filterTab === "all"
              ? "bg-[#1b5e3b] text-white shadow-xs font-bold"
              : "border border-slate-200/90 bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          All Subscriptions ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            filterTab === "active"
              ? "bg-[#1b5e3b] text-white shadow-xs font-bold"
              : "border border-slate-200/90 bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          Active ({activeCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("paused")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            filterTab === "paused"
              ? "bg-[#1b5e3b] text-white shadow-xs font-bold"
              : "border border-slate-200/90 bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          Paused ({pausedCount})
        </button>
      </div>

      {/* ─── Main Content List ────────────────────────────────────────────── */}
      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-6 border border-slate-100 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 rounded-2xl bg-slate-100 shrink-0" />
                  <div className="space-y-2 pt-1">
                    <div className="h-4 w-40 bg-slate-200 rounded-md" />
                    <div className="h-3 w-28 bg-slate-100 rounded-md" />
                    <div className="h-3 w-20 bg-slate-100 rounded-md mt-2" />
                  </div>
                </div>
                <div className="h-5 w-24 bg-slate-200 rounded-md" />
              </div>
              <div className="grid grid-cols-4 gap-4 border-t border-slate-50 pt-4">
                {[1, 2, 3, 4].map((c) => (
                  <div key={c} className="space-y-1.5">
                    <div className="h-2.5 w-16 bg-slate-100 rounded-sm" />
                    <div className="h-3.5 w-24 bg-slate-200 rounded-sm" />
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-slate-50 pt-4">
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-slate-100 rounded-xl" />
                  <div className="h-8 w-28 bg-slate-100 rounded-xl" />
                  <div className="h-8 w-20 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-8 w-20 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="rounded-2xl bg-white p-8 border border-rose-100 shadow-xs text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mx-auto text-xl">
            ⚠️
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Unable to load subscriptions
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-2xl p-12 text-center space-y-4 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100/70 border border-emerald-200/60 text-2xl shadow-xs">
            💊
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {totalCount === 0 ? "No subscriptions yet" : `No ${filterTab} subscriptions`}
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              {totalCount === 0
                ? "Set up automatic medicine refills and never worry about running out of your essential medications."
                : `You currently do not have any ${filterTab} subscriptions.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/medicines"
              className="rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-sm active:scale-[0.98] transition-all"
            >
              + Add Subscription
            </Link>
            {totalCount > 0 ? (
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer"
              >
                View All Subscriptions
              </button>
            ) : (
              <Link
                href="/dashboard/medicines"
                className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
              >
                Browse Medicines
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Real Subscription Cards */
        <div className="space-y-4">
          {filteredSubscriptions.map((sub) => {
            const primaryItem = sub.items?.[0];
            const title = primaryItem?.product?.name || "Refill Item";
            const dosage =
              primaryItem?.product?.description ||
              (primaryItem
                ? `${primaryItem.quantity} ${primaryItem.quantity > 1 ? "Packs" : "Pack"}`
                : "1 Pack");

            const category = deriveCategory(title, primaryItem?.product?.description);

            const refillCost = (sub.items || []).reduce(
              (acc, it) => acc + Number(it.product?.price || 0) * (it.quantity || 1),
              0
            );
            const pricePerRefill = `₹${Math.round(refillCost)}/refill`;

            const nextRefillDate = formatRefillDate(sub.nextRefillDate);

            const deliveryAddress = sub.address
              ? `${sub.address.label || "Home"} • ${sub.address.city || sub.address.state || "India"}`
              : "Not set";

            const paymentMethod = "Not set";

            return (
              <SubscriptionCard
                key={sub.id}
                id={sub.id}
                title={title}
                dosage={dosage}
                category={category}
                status={sub.status}
                frequency={formatFrequency(sub.frequency)}
                nextRefillDate={nextRefillDate}
                autoPayStatus={sub.status === "ACTIVE" ? "Enabled" : sub.status === "PAUSED" ? "Paused" : "Disabled"}
                paymentMethod={paymentMethod}
                deliveryAddress={deliveryAddress}
                pricePerRefill={pricePerRefill}
                imageUrl={primaryItem?.product?.imageUrl}
                onSkip={() =>
                  setModalAction({
                    subId: sub.id,
                    action: "skip",
                    title,
                  })
                }
                onPause={() =>
                  setModalAction({
                    subId: sub.id,
                    action: "pause",
                    title,
                  })
                }
                onResume={() =>
                  setModalAction({
                    subId: sub.id,
                    action: "resume",
                    title,
                  })
                }
                onCancel={() =>
                  setModalAction({
                    subId: sub.id,
                    action: "cancel",
                    title,
                  })
                }
              />
            );
          })}
        </div>
      )}

      {/* ─── Bottom Benefits Strip matching reference design ─────────────── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/70">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Benefit 1: Automatic Refills */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-[#1b5e3b] shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                Automatic Refills
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Never run out of your medicines
              </p>
            </div>
          </div>

          {/* Benefit 2: Save More */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-[#1b5e3b] shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                Save More
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Get better prices with subscriptions
              </p>
            </div>
          </div>

          {/* Benefit 3: Secure Payments */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-[#1b5e3b] shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                Secure Payments
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                100% safe and encrypted
              </p>
            </div>
          </div>

          {/* Benefit 4: Need Help? */}
          <Link
            href="/dashboard/help-support"
            className="flex items-center gap-3 group transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#1b5e3b] transition-colors leading-tight">
                Need Help?
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Our support team is here for you
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── Confirmation Modal Dialog ────────────────────────────────────── */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => !loadingAction && setModalAction(null)}
          />
          <div className="glass-panel modal-animate-in relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200/80 z-10 text-left">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  modalAction.action === "cancel"
                    ? "bg-rose-50 text-rose-600"
                    : modalAction.action === "pause"
                    ? "bg-amber-50 text-amber-600"
                    : modalAction.action === "skip"
                    ? "bg-sky-50 text-sky-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {modalAction.action === "cancel"
                  ? "❌"
                  : modalAction.action === "pause"
                  ? "⏸️"
                  : modalAction.action === "skip"
                  ? "⏭️"
                  : "▶️"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 capitalize">
                  {modalAction.action === "cancel"
                    ? "Cancel Subscription"
                    : modalAction.action === "pause"
                    ? "Pause Subscription"
                    : modalAction.action === "skip"
                    ? "Skip Next Refill"
                    : "Resume Subscription"}
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{modalAction.title}</p>
              </div>
            </div>

            <div className="py-4 text-xs text-slate-600 leading-relaxed">
              {modalAction.action === "cancel" && (
                <p>
                  Are you sure you want to cancel your subscription for{" "}
                  <span className="font-bold text-slate-900">{modalAction.title}</span>? No future refills
                  or orders will be generated.
                </p>
              )}
              {modalAction.action === "pause" && (
                <p>
                  Are you sure you want to pause refills for{" "}
                  <span className="font-bold text-slate-900">{modalAction.title}</span>? Your schedule will
                  be paused until you resume.
                </p>
              )}
              {modalAction.action === "resume" && (
                <p>
                  Would you like to resume refills for{" "}
                  <span className="font-bold text-slate-900">{modalAction.title}</span>? Your next refill
                  date will be scheduled automatically.
                </p>
              )}
              {modalAction.action === "skip" && (
                <p>
                  Are you sure you want to skip your upcoming scheduled refill for{" "}
                  <span className="font-bold text-slate-900">{modalAction.title}</span>? Your subscription will remain active, and your schedule will advance to the following period without generating an order.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => setModalAction(null)}
                className="rounded-xl border border-slate-200/90 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={executeSubscriptionAction}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                  modalAction.action === "cancel"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : modalAction.action === "pause"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : modalAction.action === "skip"
                    ? "bg-sky-600 hover:bg-sky-700"
                    : "bg-[#1b5e3b] hover:bg-[#154c30]"
                }`}
              >
                {loadingAction
                  ? "Processing..."
                  : modalAction.action === "cancel"
                  ? "Yes, Cancel"
                  : modalAction.action === "pause"
                  ? "Confirm Pause"
                  : modalAction.action === "skip"
                  ? "Confirm Skip"
                  : "Confirm Resume"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
