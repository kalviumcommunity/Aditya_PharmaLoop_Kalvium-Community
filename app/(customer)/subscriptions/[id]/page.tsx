"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: string | number;
  };
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

interface SubscriptionDetail {
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

interface PastOrder {
  id: string;
  status: string;
  total: string | number;
  createdAt: string;
}

interface SubscriptionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;
  const searchParams = useSearchParams();

  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lifecycle Action Modal State
  const [modalAction, setModalAction] = useState<"pause" | "resume" | "skip" | "cancel" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(() => {
    if (searchParams.get("updated") === "true") {
      return {
        type: "success",
        text: "Refill schedule updated successfully!",
      };
    }
    return null;
  });

  // Edit Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Refetch subscription
  const reloadSubscription = useCallback(async () => {
    try {
      const res = await fetch(`/api/subscriptions/${rawId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Subscription not found");
        if (res.status === 403) throw new Error("Access denied: You do not have permission to view or manage this subscription.");
        throw new Error("Failed to load subscription details");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setSub(json.data);
        setSelectedAddressId(json.data.addressId || "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load subscription");
    }
  }, [rawId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/subscriptions/${rawId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Subscription not found");
          if (res.status === 403) throw new Error("Access denied: You do not have permission to view or manage this subscription.");
          throw new Error("Failed to load subscription details");
        }
        const json = await res.json();
        if (!isCancelled && json.success && json.data) {
          setSub(json.data);
          setSelectedAddressId(json.data.addressId || "");
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("[SubscriptionDetailPage] Error:", err);
          setError(err instanceof Error ? err.message : "Unable to load subscription");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    fetch("/api/orders")
      .then((res) => res.json())
      .then((ordersJson) => {
        if (!isCancelled && ordersJson.success && Array.isArray(ordersJson.data)) {
          setPastOrders(ordersJson.data.slice(0, 3));
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [rawId]);

  // Open address modal and fetch user's saved addresses
  const handleOpenAddressModal = async () => {
    setIsAddressModalOpen(true);
    setLoadingAddresses(true);
    setAddressError(null);

    try {
      const res = await fetch("/api/addresses");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAddresses(json.data);
        if (sub?.addressId) {
          setSelectedAddressId(sub.addressId);
        } else if (json.data.length > 0) {
          setSelectedAddressId(json.data[0].id);
        }
      }
    } catch {
      setAddressError("Failed to load saved addresses.");
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Execute lifecycle action (pause, resume, skip, cancel)
  const executeLifecycleAction = async () => {
    if (!sub || !modalAction) return;

    try {
      setActionLoading(true);
      setActionMessage(null);

      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: modalAction }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || `Failed to ${modalAction} subscription`);
      }

      const actionPastTense =
        modalAction === "skip"
          ? "skipped"
          : modalAction === "pause"
          ? "paused"
          : modalAction === "resume"
          ? "resumed"
          : "cancelled";

      setActionMessage({
        type: "success",
        text: `Subscription ${actionPastTense} successfully.`,
      });

      setModalAction(null);
      await reloadSubscription();
    } catch (err: unknown) {
      console.error("[SubscriptionAction] Error:", err);
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : `Failed to perform action`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute address change
  const handleSaveAddress = async () => {
    if (!sub) return;
    if (!selectedAddressId) {
      setAddressError("Please select a delivery address.");
      return;
    }

    try {
      setSavingAddress(true);
      setAddressError(null);

      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddressId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Failed to update delivery address");
      }

      setActionMessage({
        type: "success",
        text: "Delivery address updated successfully.",
      });

      setIsAddressModalOpen(false);
      await reloadSubscription();
    } catch (err: unknown) {
      console.error("[handleSaveAddress] Error:", err);
      setAddressError(err instanceof Error ? err.message : "Failed to update delivery address");
    } finally {
      setSavingAddress(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse py-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-48 bg-white rounded-2xl border border-slate-100 p-6" />
            <div className="h-48 bg-white rounded-2xl border border-slate-100 p-6" />
          </div>
          <div className="lg:col-span-4 h-64 bg-white rounded-2xl border border-slate-100 p-6" />
        </div>
      </div>
    );
  }

  if (error || !sub) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-xs space-y-4">
          <div className="text-3xl">🔄</div>
          <h2 className="text-lg font-bold text-slate-900">Subscription Notice</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "We could not find the requested prescription subscription."}
          </p>
          <Link
            href="/subscriptions"
            className="inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
          >
            &larr; Back to Subscriptions
          </Link>
        </div>
      </div>
    );
  }

  const primaryItem = sub.items?.[0];
  const medicineName = primaryItem?.product?.name || "Refill Medication";
  const medicineDesc = primaryItem?.product?.description || "Medicinal formulation";
  const itemQty = primaryItem?.quantity || 1;
  const unitPrice = Number(primaryItem?.product?.price || 0);
  const refillTotal = unitPrice * itemQty;

  const refillDate = new Date(sub.nextRefillDate);
  const formattedRefillDate = refillDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

  const statusColor =
    sub.status === "ACTIVE"
      ? "bg-[#1b5e3b] text-white"
      : sub.status === "PAUSED"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 page-entrance">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/subscriptions" className="hover:text-slate-900 transition-colors">
              &larr; Back to Subscriptions
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Subscription #{sub.id}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                sub.status === "ACTIVE"
                  ? "bg-emerald-50 text-[#166534] ring-1 ring-emerald-600/20"
                  : sub.status === "PAUSED"
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-400/20"
              }`}
            >
              {sub.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Auto-refill scheduled {formatFrequency(sub.frequency).toLowerCase()} · Next delivery {formattedRefillDate}
          </p>
        </div>

        {/* Quick Actions Header CTAs */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/subscriptions/${sub.id}/schedule`}
            className="rounded-xl bg-[#1b5e3b] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Change Refill Schedule</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Action feedback toast */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center justify-between gap-2 ${
            actionMessage.type === "success"
              ? "bg-[#ecfdf5] border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold px-2 py-0.5 opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Details & History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Subscription Overview Card */}
          <div className="glass-card rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-5 sm:p-6 border-b border-emerald-100/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-emerald-100/70 shadow-xs shrink-0">
                  <svg className="h-8 w-8 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
                      <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                      <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                      <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
                    </g>
                  </svg>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {medicineName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {medicineDesc} {itemQty > 1 ? `· Quantity: ${itemQty}` : ""}
                  </p>
                  <p className="text-xs font-black text-[#1b5e3b] mt-1">
                    ₹{refillTotal.toFixed(2)} / refill
                  </p>
                </div>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-xs ${statusColor}`}>
                {sub.status}
              </span>
            </div>

            {/* Configured Parameters */}
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-white/70 backdrop-blur-xs p-3.5 border border-slate-200/60 shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Refill Frequency</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{formatFrequency(sub.frequency)}</p>
              </div>

              <div className="rounded-xl bg-white/70 backdrop-blur-xs p-3.5 border border-slate-200/60 shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Next Refill Date</p>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {formattedRefillDate} ({sub.refillTime ? `${sub.refillTime} slot` : "09:00 slot"})
                </p>
              </div>

              <div className="rounded-xl bg-white/70 backdrop-blur-xs p-3.5 border border-slate-200/60 shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Auto-Pay Method</p>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {sub.status === "ACTIVE" ? "Enabled · Online Auto-Pay" : sub.status === "PAUSED" ? "Paused" : "Disabled"}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 backdrop-blur-xs p-3.5 border border-slate-200/60 shadow-2xs flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400 font-medium">Delivery Address</p>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {sub.address ? `${sub.address.address}, ${sub.address.city}` : "Saved Address"}
                  </p>
                </div>
                {sub.status !== "CANCELLED" && (
                  <button
                    type="button"
                    onClick={handleOpenAddressModal}
                    className="mt-0.5 text-[11px] font-bold text-[#1b5e3b] hover:underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Refill Cycle History */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Refill Fulfillment History</span>
              <span className="text-xs font-normal text-slate-400">
                {pastOrders.length} past fulfillment order(s)
              </span>
            </h2>

            {pastOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Your first refill delivery will be scheduled for {formattedRefillDate}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pastOrders.map((order) => {
                  const d = new Date(order.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={order.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Fulfillment on {d}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#166534]">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Order ID: #{order.id}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">
                          ₹{Number(order.total).toFixed(2)}
                        </p>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-[11px] font-semibold text-[#1b5e3b] hover:underline"
                        >
                          View Order &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manage Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Quick Subscription Actions
            </h2>

            <div className="space-y-2.5">
              <Link
                href={`/subscriptions/${sub.id}/schedule`}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1b5e3b] hover:bg-[#154a2e] text-white font-bold text-xs text-center shadow-xs hover:shadow-sm active:scale-[0.98] transition-all block"
              >
                Change Refill Schedule &rarr;
              </Link>

              {/* Skip Next Refill Button (Active only) */}
              {sub.status === "ACTIVE" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setModalAction("skip")}
                  className="w-full py-2.5 px-3 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-50 active:scale-[0.98] text-xs font-semibold text-sky-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>⏭️</span>
                  <span>Skip Next Refill</span>
                </button>
              )}

              {/* Pause / Resume Button */}
              {sub.status === "ACTIVE" ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setModalAction("pause")}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200/90 bg-white/90 hover:bg-slate-50 active:scale-[0.98] text-xs font-semibold text-amber-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>⏸️</span>
                  <span>Pause Subscription</span>
                </button>
              ) : sub.status === "PAUSED" ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setModalAction("resume")}
                  className="w-full py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 active:scale-[0.98] text-xs font-semibold text-emerald-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>▶️</span>
                  <span>Resume Subscription</span>
                </button>
              ) : null}

              {/* Change Address Button */}
              {sub.status !== "CANCELLED" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleOpenAddressModal}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200/90 bg-white/90 hover:bg-slate-50 active:scale-[0.98] text-xs font-semibold text-slate-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>📍</span>
                  <span>Change Delivery Address</span>
                </button>
              )}

              {/* Cancel Button */}
              {sub.status !== "CANCELLED" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setModalAction("cancel")}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 active:scale-[0.98] text-xs font-semibold text-rose-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>❌</span>
                  <span>Cancel Subscription</span>
                </button>
              )}

              {sub.status === "CANCELLED" && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center text-xs text-slate-500">
                  This subscription is cancelled. No further refills or orders will be generated.
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center pt-2">
              You can pause, resume, skip, or cancel your recurring prescription anytime without penalties.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Confirmation Modal Dialog for Lifecycle Actions ───────────────── */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => !actionLoading && setModalAction(null)}
          />
          <div className="glass-panel modal-animate-in relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200/80 z-10 text-left">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  modalAction === "cancel"
                    ? "bg-rose-50 text-rose-600"
                    : modalAction === "pause"
                    ? "bg-amber-50 text-amber-600"
                    : modalAction === "skip"
                    ? "bg-sky-50 text-sky-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {modalAction === "cancel" ? "❌" : modalAction === "pause" ? "⏸️" : modalAction === "skip" ? "⏭️" : "▶️"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 capitalize">
                  {modalAction === "cancel"
                    ? "Cancel Subscription"
                    : modalAction === "pause"
                    ? "Pause Subscription"
                    : modalAction === "skip"
                    ? "Skip Next Refill"
                    : "Resume Subscription"}
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{medicineName}</p>
              </div>
            </div>

            <div className="py-4 text-xs text-slate-600 leading-relaxed">
              {modalAction === "cancel" && (
                <p>
                  Are you sure you want to cancel your recurring subscription for{" "}
                  <span className="font-bold text-slate-900">{medicineName}</span>? No future refills or orders will be generated. All past fulfillment records remain preserved.
                </p>
              )}
              {modalAction === "pause" && (
                <p>
                  Are you sure you want to pause refills for{" "}
                  <span className="font-bold text-slate-900">{medicineName}</span>? Your schedule will be paused until you resume. No automatic orders will be placed.
                </p>
              )}
              {modalAction === "resume" && (
                <p>
                  Would you like to resume refills for{" "}
                  <span className="font-bold text-slate-900">{medicineName}</span>? Your next refill date will be recalculated automatically according to your {formatFrequency(sub.frequency).toLowerCase()} schedule.
                </p>
              )}
              {modalAction === "skip" && (
                <p>
                  Are you sure you want to skip your upcoming scheduled refill for{" "}
                  <span className="font-bold text-slate-900">{medicineName}</span> on {formattedRefillDate}? Your subscription will remain active and advance to the subsequent cycle without creating an order.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setModalAction(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeLifecycleAction}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  modalAction === "cancel"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : modalAction === "pause"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : modalAction === "skip"
                    ? "bg-sky-600 hover:bg-sky-700"
                    : "bg-[#1b5e3b] hover:bg-[#154c30]"
                }`}
              >
                {actionLoading && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>
                  {actionLoading
                    ? "Processing..."
                    : modalAction === "cancel"
                    ? "Yes, Cancel"
                    : modalAction === "pause"
                    ? "Confirm Pause"
                    : modalAction === "skip"
                    ? "Confirm Skip"
                    : "Confirm Resume"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Change Delivery Address Modal Dialog ──────────────────────────── */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => !savingAddress && setIsAddressModalOpen(false)}
          />
          <div className="glass-panel modal-animate-in relative w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200/80 z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Change Delivery Address
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select where future refills for this subscription should be delivered.
                </p>
              </div>
              <button
                type="button"
                disabled={savingAddress}
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addressError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {addressError}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {loadingAddresses ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No saved addresses found.{" "}
                  <Link href="/address-book" className="font-bold text-[#1b5e3b] underline">
                    Add one in your Address Book
                  </Link>
                  .
                </div>
              ) : (
                addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`rounded-xl p-3 border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "border-2 border-[#1b5e3b] bg-[#f4fbf6]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? "border-[#1b5e3b] bg-white" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-[#1b5e3b]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {addr.label || "Delivery Location"}
                          </span>
                          {isSelected && (
                            <span className="rounded-md bg-[#e2f3e8] px-1.5 py-0.2 text-[9px] font-bold text-[#166534]">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {addr.address}, {addr.city}, {addr.state} &ndash; {addr.postalCode}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Link
                href="/address-book"
                className="text-[11px] font-bold text-[#1b5e3b] hover:underline"
              >
                + Manage Addresses
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingAddress}
                  onClick={() => setIsAddressModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingAddress || addresses.length === 0}
                  onClick={handleSaveAddress}
                  className="rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingAddress && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>{savingAddress ? "Saving..." : "Save Address"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
