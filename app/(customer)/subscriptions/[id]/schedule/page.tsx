"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import RefillProgressStepper from "@/components/dashboard/RefillProgressStepper";
import MedicineSummaryCard from "@/components/dashboard/MedicineSummaryCard";
import StartDateCalendar from "@/components/dashboard/StartDateCalendar";
import FrequencySelector, { SupportedFrequency } from "@/components/dashboard/FrequencySelector";
import RefillTimeSelector from "@/components/dashboard/RefillTimeSelector";
import UpcomingRefillPreview from "@/components/dashboard/UpcomingRefillPreview";
import HowItWorksCard from "@/components/dashboard/HowItWorksCard";

interface ProductData {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  stock?: number;
  isActive?: boolean;
}

interface ScheduleRefillPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ScheduleRefillPage({ params }: ScheduleRefillPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;

  // Real product & mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Subscription configuration state
  const initialQty = Math.max(1, parseInt(searchParams.get("qty") || "1", 10) || 1);
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [frequency, setFrequency] = useState<SupportedFrequency>("WEEKLY");

  // Default start date: tomorrow
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [refillTime, setRefillTime] = useState<string>("09:00");

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Explicit status check for existing subscription
        const subRes = await fetch(`/api/subscriptions/${rawId}`);

        if (subRes.status === 200) {
          const subJson = await subRes.json();
          if (subJson.success && subJson.data) {
            if (isCancelled) return;

            const subData = subJson.data;

            if (subData.status === "CANCELLED") {
              setError("This subscription is cancelled and cannot be rescheduled.");
              return;
            }

            setIsEditMode(true);
            const subItem = subData.items?.[0];
            if (subItem?.product) {
              setProduct(subItem.product);
            } else {
              setProduct({
                id: rawId,
                name: "Prescription Medicine",
                price: subData.totalAmount || 0,
              });
            }

            if (subData.frequency) {
              setFrequency(subData.frequency as SupportedFrequency);
            }
            if (subData.refillTime) {
              setRefillTime(subData.refillTime);
            }
            if (subItem?.quantity) {
              setQuantity(subItem.quantity);
            }
            if (subData.nextRefillDate) {
              const parsedDate = new Date(subData.nextRefillDate);
              if (!isNaN(parsedDate.getTime())) {
                const now = new Date();
                if (parsedDate < now) {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  setStartDate(tomorrow);
                } else {
                  setStartDate(parsedDate);
                }
              }
            }
            return;
          }
        }

        if (subRes.status === 401) {
          if (!isCancelled) {
            router.push(`/login?redirect=${encodeURIComponent(`/subscriptions/${rawId}/schedule`)}`);
          }
          return;
        }

        if (subRes.status === 403) {
          if (!isCancelled) {
            setError("You do not have permission to view or manage this subscription.");
          }
          return;
        }

        if (subRes.status === 404) {
          // 2. Not a subscription - check if rawId is a Product ID (Creation flow)
          const prodRes = await fetch(`/api/products/${rawId}`);

          if (prodRes.status === 200) {
            const prodJson = await prodRes.json();
            if (prodJson.success && prodJson.data) {
              if (!isCancelled) {
                setIsEditMode(false);
                setProduct(prodJson.data);
              }
              return;
            }
          }

          if (prodRes.status === 401) {
            if (!isCancelled) {
              router.push(`/login?redirect=${encodeURIComponent(`/subscriptions/${rawId}/schedule`)}`);
            }
            return;
          }

          if (!isCancelled) {
            setError("Medicine or subscription not found in catalog.");
          }
          return;
        }

        // Any other error (e.g. 500)
        if (!isCancelled) {
          setError("Failed to load subscription details. Please try again later.");
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[ScheduleRefillPage] Error:", err);
          setError("An unexpected error occurred while loading schedule information.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [rawId, router]);

  // Handle saving changes for EXISTING subscription (Edit Mode)
  const handleSaveSchedule = async () => {
    if (!product) return;
    setActionError(null);

    // Combine startDate with refillTime
    const [hours, minutes] = refillTime.split(":").map(Number);
    const combinedDate = new Date(startDate);
    combinedDate.setHours(hours || 0, minutes || 0, 0, 0);

    if (combinedDate.getTime() <= Date.now()) {
      setActionError("Please choose a future date and time for your next refill.");
      return;
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (combinedDate.getTime() > oneYearFromNow.getTime()) {
      setActionError("Next refill date cannot be more than 1 year in the future.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/subscriptions/${rawId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency,
          nextRefillDate: combinedDate.toISOString(),
          refillTime,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "Failed to update subscription schedule.");
        setSubmitting(false);
        return;
      }

      // Success: navigate back to subscription details with updated indicator
      router.push(`/subscriptions/${rawId}?updated=true`);
    } catch (err) {
      console.error("[handleSaveSchedule] Error:", err);
      setActionError("Network error while updating schedule. Please try again.");
      setSubmitting(false);
    }
  };

  // Handle proceed to payment for NEW subscription (Creation Mode)
  const handleProceedToPayment = () => {
    if (!product) return;
    const targetId = product.id;
    const dateISO = startDate.toISOString();
    const query = new URLSearchParams({
      productId: targetId,
      qty: String(quantity),
      freq: frequency,
      date: dateISO,
      time: refillTime,
    }).toString();

    router.push(`/subscriptions/${targetId}/payment?${query}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse py-6">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-slate-100 p-6" />
          <div className="h-96 bg-white rounded-2xl border border-slate-100 p-6" />
          <div className="h-96 bg-white rounded-2xl border border-slate-100 p-6" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-xs space-y-4">
          <div className="text-3xl">💊</div>
          <h2 className="text-lg font-bold text-slate-900">
            {error?.includes("permission") ? "Access Denied" : "Medicine Not Found"}
          </h2>
          <p className="text-xs text-slate-500">
            {error || "We could not find the medicine for scheduling."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/subscriptions"
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              My Subscriptions
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
            >
              &larr; Browse Medicines
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header & Stepper / Edit Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {isEditMode ? "Update Refill Schedule" : "Schedule Your Refill"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            {isEditMode
              ? `Modify your delivery frequency, next refill date, or preferred time for ${product.name}.`
              : `Set up your recurring refill schedule for ${product.name}.`}
          </p>
        </div>

        <div>
          {isEditMode ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Editing Subscription #{rawId.slice(-6).toUpperCase()}</span>
            </div>
          ) : (
            <RefillProgressStepper currentStep={1} entityId={product.id} />
          )}
        </div>
      </div>

      {/* 3-Column Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Medicine Summary & Start Date Calendar */}
        <div className="space-y-4">
          <MedicineSummaryCard
            name={product.name}
            description={product.description || undefined}
            price={product.price}
            quantity={quantity}
            onQuantityChange={isEditMode ? undefined : setQuantity}
          />
          <StartDateCalendar value={startDate} onChange={setStartDate} />
        </div>

        {/* Column 2: Choose Frequency & Preferred Refill Time */}
        <div className="space-y-4">
          <FrequencySelector value={frequency} onChange={setFrequency} />
          <RefillTimeSelector value={refillTime} onChange={setRefillTime} />
        </div>

        {/* Column 3: Upcoming Refill Preview, How It Works, & Action CTA */}
        <div className="space-y-4">
          <UpcomingRefillPreview
            baseDate={startDate}
            frequency={frequency}
            refillTime={refillTime}
          />
          <HowItWorksCard />

          {/* Action error message */}
          {actionError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-2">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold text-sm"
              >
                &times;
              </button>
            </div>
          )}

          {/* Action CTA */}
          {isEditMode ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1b5e3b] hover:bg-[#154c30] text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <span>Save Schedule Changes</span>
                    <span>✓</span>
                  </>
                )}
              </button>
              <Link
                href={`/subscriptions/${rawId}`}
                className="block text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2"
              >
                Cancel and return to subscription
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleProceedToPayment}
              className="w-full py-3.5 px-4 rounded-xl bg-[#1b5e3b] hover:bg-[#154c30] text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>Continue to Payment &amp; Auto-Pay</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
