"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: string | number;
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: string | number;
  };
}

interface OrderFeedback {
  id: string;
  orderId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  userId: string;
  addressId: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  total: string | number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string | null;
  address: {
    id: string;
    label?: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  payment?: {
    id: string;
    amount: string | number;
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
    paymentMethod: "ONLINE" | "COD";
    attempts?: Array<{
      id: string;
      status: string;
      createdAt: string;
    }>;
  } | null;
  feedback?: OrderFeedback | null;
}

interface UserProfile {
  id: string;
  name: string;
  phone?: string | null;
}

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (
        event: string,
        handler: (response: Record<string, unknown>) => void,
      ) => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderToast, setReorderToast] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  // Post-delivery feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch current user
        fetch("/api/auth/me")
          .then((res) => res.json())
          .then((json) => {
            if (!isCancelled && json.success && json.data) {
              setUser(json.data);
            }
          })
          .catch(() => {});

        // Fetch real order
        const res = await fetch(`/api/orders/${rawId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Order not found");
          if (res.status === 403)
            throw new Error("Access denied to this order");
          throw new Error("Failed to load order details");
        }

        const json = await res.json();
        if (json.success && json.data) {
          if (!isCancelled) setOrder(json.data);
        } else {
          throw new Error(json.message || "Order not found");
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("[OrderDetailPage] Error:", err);
          setError(err instanceof Error ? err.message : "Unable to load order");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [rawId]);

  // Polling for delivery progression while in active stages
  const orderId = order?.id;
  const orderStatus = order?.status;

  useEffect(() => {
    if (!orderId || !orderStatus) return;

    // Only active progression stages poll the server
    const requiresProgression =
      orderStatus === "CONFIRMED" ||
      orderStatus === "PROCESSING" ||
      orderStatus === "SHIPPED";

    if (!requiresProgression) return;

    // Poll every 5 seconds while delivery is in progress
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setOrder(json.data);
          }
        }
      } catch {
        // Silently ignore background polling connection drop
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [orderId, orderStatus]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || submittingFeedback) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setOrder((prev) => (prev ? { ...prev, feedback: json.data } : null));
      } else {
        setFeedbackError(
          json.error || json.message || "Failed to submit feedback",
        );
      }
    } catch {
      setFeedbackError("Network error submitting feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!order || retryingPayment) return;
    setRetryingPayment(true);
    setRetryMessage(null);
    try {
      const res = await fetch(`/api/payments/${order.id}/retry`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay)
          throw new Error("Unable to load Razorpay Checkout");
        const checkout = new window.Razorpay({
          key: json.data.keyId,
          amount: json.data.amount,
          currency: json.data.currency,
          name: "PharmaLoop",
          description: "Medicine order payment retry",
          order_id: json.data.razorpayOrderId,
          handler: async (response: Record<string, string>) => {
            const verifyRes = await fetch(`/api/payments/${order.id}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyJson = await verifyRes.json();
            setRetryMessage(
              verifyRes.ok && verifyJson.success
                ? "Payment successful! Your order has been confirmed."
                : verifyJson.error || "Payment verification failed.",
            );
            const orderRes = await fetch(`/api/orders/${order.id}`);
            const orderJson = await orderRes.json();
            if (orderJson.success && orderJson.data) setOrder(orderJson.data);
          },
          modal: {
            ondismiss: () =>
              setRetryMessage("Payment was cancelled. You can retry again."),
          },
          theme: { color: "#166534" },
        });
        checkout.on?.("payment.failed", async (response) => {
          const error = response.error as
            | { code?: string; description?: string }
            | undefined;
          await fetch(`/api/payments/${order.id}/failure`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: error?.code,
              description: error?.description,
            }),
          });
          setRetryMessage("Payment failed. You can retry again.");
        });
        checkout.open();
      } else {
        setRetryMessage(
          json.error || json.message || "Failed to retry payment",
        );
      }
    } catch {
      setRetryMessage(
        "Network error retrying payment. Please check your connection.",
      );
    } finally {
      setRetryingPayment(false);
    }
  };

  const handleReorder = async () => {
    if (!order || !order.items || order.items.length === 0 || reordering)
      return;
    setReordering(true);
    setReorderToast(null);

    const results: { success: boolean; name: string; error?: string }[] = [];

    for (const item of order.items) {
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity || 1,
          }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          results.push({ success: true, name: item.product?.name || "Item" });
        } else {
          results.push({
            success: false,
            name: item.product?.name || "Item",
            error: data.error || "Unavailable",
          });
        }
      } catch {
        results.push({
          success: false,
          name: item.product?.name || "Item",
          error: "Network error",
        });
      }
    }

    setReordering(false);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      window.dispatchEvent(new CustomEvent("pharmaloop_cart_updated"));
    }

    if (failed.length === 0) {
      setReorderToast({
        type: "success",
        message: "All items from this order have been added to your cart.",
      });
    } else if (successful.length > 0) {
      setReorderToast({
        type: "warning",
        message: `Some items were added. ${failed.length} item(s) could not be reordered (${failed.map((f) => f.name).join(", ")}).`,
      });
    } else {
      setReorderToast({
        type: "error",
        message: `Could not reorder items: ${failed.map((f) => f.name).join(", ")}. Products may be unavailable.`,
      });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse py-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-48 bg-white rounded-2xl border border-slate-100 p-6" />
            <div className="h-64 bg-white rounded-2xl border border-slate-100 p-6" />
          </div>
          <div className="lg:col-span-4 h-64 bg-white rounded-2xl border border-slate-100 p-6" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-xs space-y-4">
          <div className="text-3xl">📦</div>
          <h2 className="text-lg font-bold text-slate-900">
            Order Not Available
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "We could not locate this order in your account records."}
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
          >
            &larr; Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  // Format order date
  const createdDate = new Date(order.createdAt);
  const formattedCreatedDate = createdDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedCreatedTime = createdDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Dynamic tracking timeline based on real order status
  const statusLevels: Record<string, number> = {
    PENDING: 1,
    CONFIRMED: 2,
    PROCESSING: 3,
    SHIPPED: 4,
    DELIVERED: 5,
    CANCELLED: -1,
  };

  const currentLevel = statusLevels[order.status] ?? 1;

  const trackingSteps =
    order.status === "CANCELLED"
      ? [
          {
            title: "Order Placed",
            time: `${formattedCreatedDate} · ${formattedCreatedTime}`,
            completed: true,
          },
          {
            title: "Order Cancelled",
            time: "This order has been cancelled",
            completed: true,
            current: true,
          },
        ]
      : [
          {
            title: "Order Placed",
            time: `${formattedCreatedDate} · ${formattedCreatedTime}`,
            completed: currentLevel >= 1,
            current: currentLevel === 1,
          },
          {
            title: "Order Confirmed & Verified",
            time:
              currentLevel > 2
                ? "Confirmed & verified by pharmacy"
                : currentLevel === 2
                  ? "Confirmed by pharmacy · Processing underway"
                  : "Pending verification",
            completed: currentLevel >= 2,
            current: currentLevel === 2,
          },
          {
            title: "Dispatched from Pharmacy",
            time:
              currentLevel > 3
                ? "Dispatched from central pharmacy"
                : currentLevel === 3
                  ? "Medicines packaged & sealed at central pharmacy"
                  : "Awaiting dispatch",
            completed: currentLevel >= 3,
            current: currentLevel === 3,
          },
          {
            title: "Out for Delivery",
            time:
              currentLevel > 4
                ? "Handed to courier partner for delivery"
                : currentLevel === 4
                  ? "Out for delivery with courier partner"
                  : "In transit to local delivery hub",
            completed: currentLevel >= 4,
            current: currentLevel === 4,
          },
          {
            title: "Delivered",
            time:
              currentLevel >= 5
                ? "Package delivered to your doorstep"
                : "Final doorstep delivery",
            completed: currentLevel >= 5,
            current: false,
          },
        ];

  // Status badge styling
  const getStatusBadge = (status: OrderDetail["status"]) => {
    switch (status) {
      case "DELIVERED":
        return {
          label: "Delivered",
          className: "bg-emerald-50 text-[#166534] ring-emerald-600/20",
        };
      case "SHIPPED":
        return {
          label: "Out for Delivery",
          className: "bg-amber-50 text-amber-700 ring-amber-600/20",
        };
      case "PROCESSING":
        return {
          label: "Processing",
          className: "bg-blue-50 text-blue-700 ring-blue-600/20",
        };
      case "CONFIRMED":
        return {
          label: "Confirmed",
          className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          className: "bg-rose-50 text-rose-700 ring-rose-600/20",
        };
      default:
        return {
          label: "Pending",
          className: "bg-slate-100 text-slate-700 ring-slate-400/20",
        };
    }
  };

  const statusBadge = getStatusBadge(order.status);
  const totalAmount = Number(order.total);

  return (
    <div className="mx-auto max-w-7xl space-y-6 page-entrance">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link
              href="/orders"
              className="hover:text-slate-900 transition-colors"
            >
              &larr; Back to Orders
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Order #{order.id}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
            {order.id.startsWith("refill_") && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 flex items-center gap-1">
                <span>🔄</span>
                <span>Auto-Refill</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Placed on {formattedCreatedDate} at {formattedCreatedTime}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReorder}
            disabled={reordering}
            className="rounded-xl glass-card px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            <span>🔄</span>
            <span>{reordering ? "Reordering..." : "Reorder"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl glass-card px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <span>📄</span>
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {reorderToast && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 shadow-2xs backdrop-blur-xs ${
            reorderToast.type === "success"
              ? "bg-emerald-50/90 text-emerald-800 border border-emerald-200/80"
              : reorderToast.type === "warning"
                ? "bg-amber-50/90 text-amber-800 border border-amber-200/80"
                : "bg-rose-50/90 text-rose-800 border border-rose-200/80"
          }`}
        >
          <span>{reorderToast.message}</span>
          {reorderToast.type !== "error" && (
            <Link
              href="/cart"
              className="font-bold underline text-emerald-900 shrink-0"
            >
              View Cart →
            </Link>
          )}
        </div>
      )}

      {/* 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tracking Timeline, Items, Shipping */}
        <div className="lg:col-span-8 space-y-6">
          {/* Delivery Tracking Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50/80 border border-emerald-100/60 text-base">
                🚚
              </span>
              <span>Delivery Progress</span>
            </h2>

            <div className="space-y-4">
              {trackingSteps.map((step, idx) => {
                const isLast = idx === trackingSteps.length - 1;
                return (
                  <div
                    key={step.title}
                    className="relative flex items-start gap-3.5"
                  >
                    {!isLast && (
                      <div
                        className={`absolute left-[9px] top-4 bottom-0 w-[2px] ${
                          step.completed ? "bg-[#1b5e3b]" : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div className="z-10 shrink-0 mt-0.5">
                      {step.current ? (
                        <div className="h-5 w-5 rounded-full bg-[#1b5e3b] ring-4 ring-emerald-500/20 animate-pulse flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                          ✓
                        </div>
                      ) : step.completed ? (
                        <div className="h-5 w-5 rounded-full bg-[#1b5e3b] flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                          ✓
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
                      )}
                    </div>

                    <div className="flex-1 pb-2">
                      <p
                        className={`text-xs font-bold ${
                          step.current
                            ? "text-[#1b5e3b]"
                            : step.completed
                              ? "text-slate-900"
                              : "text-slate-400"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {step.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Delivered Completion Banner */}
          {order.status === "DELIVERED" && (
            <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200/80 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#1b5e3b] text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Order Delivered
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Your medication package has been safely delivered to your doorstep.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-100 text-[#1b5e3b] text-[11px] font-bold px-3 py-1 ring-1 ring-emerald-600/20">
                Delivered
              </span>
            </div>
          )}

          {/* Post-Delivery Feedback Card (Appears only when DELIVERED) */}
          {order.status === "DELIVERED" && (
            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 border border-emerald-100/90 bg-white/95 shadow-xs">
              {order.feedback ? (
                /* Submitted Feedback State */
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#1b5e3b] font-bold text-sm">
                        ✓
                      </span>
                      <h2 className="text-sm font-bold text-slate-900">
                        Thanks for your feedback!
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Submitted on{" "}
                      {new Date(order.feedback.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Your review helps us maintain high quality medication delivery and healthcare service.
                  </p>
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex text-amber-400 text-base">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star}>
                          {star <= order.feedback!.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {order.feedback.rating} / 5
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      (
                      {order.feedback.rating === 5
                        ? "Excellent"
                        : order.feedback.rating === 4
                          ? "Very Good"
                          : order.feedback.rating === 3
                            ? "Good"
                            : order.feedback.rating === 2
                              ? "Fair"
                              : "Poor"}
                      )
                    </span>
                  </div>
                  {order.feedback.comment && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 italic">
                      &ldquo;{order.feedback.comment}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                /* Feedback Submission Form */
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>⭐</span>
                      <span>How was your experience?</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Rate your order delivery experience to help us improve our pharmacy services.
                    </p>
                  </div>

                  {feedbackError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {feedbackError}
                    </div>
                  )}

                  {/* Star Rating Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Rate your order
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverRating ?? feedbackRating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="text-2xl transition-transform hover:scale-115 focus:outline-hidden cursor-pointer"
                              aria-label={`Rate ${star} star`}
                            >
                              <span
                                className={
                                  active ? "text-amber-400" : "text-slate-200"
                                }
                              >
                                ★
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {(hoverRating ?? feedbackRating) === 5
                          ? "Excellent"
                          : (hoverRating ?? feedbackRating) === 4
                            ? "Very Good"
                            : (hoverRating ?? feedbackRating) === 3
                              ? "Good"
                              : (hoverRating ?? feedbackRating) === 2
                                ? "Fair"
                                : "Poor"}
                      </span>
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Additional comments (optional)
                    </label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Share feedback on packaging, delivery speed, or overall service..."
                      className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]/20 focus:border-[#1b5e3b] transition-all"
                    />
                    <div className="text-right text-[10px] text-slate-400 mt-1">
                      {feedbackComment.length} / 500
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="rounded-xl bg-[#1b5e3b] hover:bg-[#154a2e] text-white text-xs font-bold px-4 py-2.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-98"
                  >
                    {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Items Ordered Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 mb-2">
              Items in this Order ({order.items.length})
            </h2>

            <div className="divide-y divide-slate-100/80">
              {order.items.map((item, idx) => {
                const itemTotal = Number(item.price) * item.quantity;
                const iconBg =
                  idx % 3 === 0
                    ? "bg-emerald-50/80 border border-emerald-100/60"
                    : idx % 3 === 1
                      ? "bg-amber-50/80 border border-amber-100/60"
                      : "bg-blue-50/80 border border-blue-100/60";

                return (
                  <div
                    key={item.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} shrink-0 text-sm shadow-2xs`}
                      >
                        💊
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {item.product?.name || "Prescription Item"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.product?.description || "Medicinal formulation"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">
                        ₹{itemTotal.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Qty: {item.quantity} &times; ₹
                        {Number(item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address Card */}
          {order.address && (
            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-2">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50/80 border border-rose-100/60 text-sm">
                  📍
                </span>
                <span>Delivery Address</span>
              </h2>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900">
                  {user?.name || "Recipient"}
                </p>
                <p className="text-slate-600">{order.address.address}</p>
                <p className="text-slate-600">
                  {order.address.city}, {order.address.state} &ndash;{" "}
                  {order.address.postalCode}, {order.address.country}
                </p>
                {user?.phone && (
                  <p className="text-slate-500 pt-1 font-medium">
                    Phone: {user.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Payment & Order Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              Payment Summary
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Items Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery Fee</span>
                <span className="font-semibold text-emerald-600">Free</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-semibold text-slate-900">
                  {order.payment?.paymentMethod === "COD"
                    ? "Cash on Delivery"
                    : "Online Payment"}
                </span>
              </div>

              <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">
                  {order.payment?.paymentMethod === "COD"
                    ? "Order Total"
                    : "Total Paid"}
                </span>
                <span className="text-base font-black text-[#1b5e3b]">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl glass-card p-3.5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200/80 text-sky-600 text-xs font-bold shrink-0 shadow-2xs">
                💳
              </div>
              <div className="text-xs flex-1">
                <p className="font-semibold text-slate-900">
                  {order.payment?.paymentMethod === "COD"
                    ? "Cash on Delivery"
                    : order.payment?.status === "SUCCESS"
                      ? "Payment Completed"
                      : order.payment?.status === "FAILED" ||
                          (order.payment?.attempts &&
                            order.payment.attempts.length >= 3)
                        ? "Payment Failed (Exhausted)"
                        : order.payment?.status === "PENDING"
                          ? "Payment Pending"
                          : "Payment Status"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {order.payment?.paymentMethod === "COD"
                    ? "Payment Pending"
                    : order.payment
                      ? order.payment.status === "FAILED" ||
                        (order.payment.attempts &&
                          order.payment.attempts.length >= 3)
                        ? "All retry attempts exhausted"
                        : `Status: ${order.payment.status}${order.payment.attempts?.length ? ` (${order.payment.attempts.length}/3)` : ""}`
                      : "Verified Order"}
                </p>
              </div>
              {order.payment?.status === "SUCCESS" ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50/90 border border-emerald-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                  Paid ✓
                </span>
              ) : null}
            </div>

            {retryMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium backdrop-blur-xs ${
                  order.payment?.status === "SUCCESS"
                    ? "bg-emerald-50/90 text-emerald-800 border border-emerald-200/80"
                    : "bg-amber-50/90 text-amber-800 border border-amber-200/80"
                }`}
              >
                {retryMessage}
              </div>
            )}

            {order.payment &&
              order.payment.paymentMethod !== "COD" &&
              order.payment.status !== "SUCCESS" &&
              (() => {
                const isExhausted =
                  order.payment.status === "FAILED" ||
                  (order.payment.attempts &&
                    order.payment.attempts.length >= 3);
                return (
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    disabled={retryingPayment || isExhausted}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isExhausted
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-[#1b5e3b] hover:bg-[#154c30] disabled:opacity-60 text-white cursor-pointer"
                    }`}
                  >
                    {retryingPayment ? (
                      <>
                        <svg
                          className="h-3.5 w-3.5 animate-spin text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Processing Retry...</span>
                      </>
                    ) : isExhausted ? (
                      <span>Payment Failed — Retry Limit Exceeded</span>
                    ) : (
                      <span>🔄 Retry Payment</span>
                    )}
                  </button>
                );
              })()}

            <div className="mt-5 space-y-2">
              <Link
                href="/dashboard/help-support"
                className="w-full py-2.5 px-3 rounded-xl glass-card hover:bg-white text-xs font-semibold text-slate-700 transition-all text-center block active:scale-[0.98]"
              >
                Need Help? Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
