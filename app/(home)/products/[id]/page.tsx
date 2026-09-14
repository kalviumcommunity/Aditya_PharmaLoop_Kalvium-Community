"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RefillStatusCard from "@/components/dashboard/RefillStatusCard";
import DeliveryInfoCard from "@/components/dashboard/DeliveryInfoCard";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
}

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<{
    label?: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  } | null>(null);

  const [catalogHref, setCatalogHref] = useState("/products");

  useEffect(() => {
    let isCancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isCancelled && json?.success && json?.data?.role) {
          if (json.data.role === "ADMIN") {
            setCatalogHref("/admin/products");
          } else {
            setCatalogHref("/dashboard/medicines");
          }
        }
      })
      .catch(() => {});

    fetch("/api/addresses")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isCancelled && json?.success && Array.isArray(json.data) && json.data.length > 0) {
          setDeliveryAddress(json.data[0]);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAddToCart = async () => {
    if (!product || isAdding) return;
    setIsAdding(true);

    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
        return;
      }

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        window.dispatchEvent(new Event("pharmaloop_cart_updated"));
        showToast(`Added ${quantity} × ${product.name} to cart!`, "success");
      } else {
        const msg = json?.error || json?.message || "Failed to add to cart";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error. Please check your connection.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || isBuying) return;
    setIsBuying(true);

    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/checkout")}`);
        return;
      }

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        window.dispatchEvent(new Event("pharmaloop_cart_updated"));
        router.push("/checkout");
      } else {
        const msg = json?.error || json?.message || "Failed to proceed to checkout";
        showToast(msg, "error");
        setIsBuying(false);
      }
    } catch {
      showToast("Network error. Please check your connection.", "error");
      setIsBuying(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    fetch(`/api/products/${rawId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Product not found");
          throw new Error("Failed to load medicine details");
        }
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          if (json.success && json.data) {
            setProduct(json.data);
          } else {
            throw new Error(json.message || "Product not found");
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("[ProductDetail] Error:", err);
          setError(err instanceof Error ? err.message : "Unable to load product");
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [rawId]);

  if (loading) {
    return (
      <div className="w-full bg-[#fbfdfa] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-slate-200 rounded-sm" />
        <div className="h-8 w-64 bg-slate-200 rounded-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-white rounded-2xl border border-slate-100 p-6" />
          <div className="lg:col-span-4 h-96 bg-white rounded-2xl border border-slate-100 p-6" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="w-full bg-[#fbfdfa] py-16 px-4 text-center max-w-xl mx-auto">
        <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-xs space-y-4">
          <div className="text-3xl">💊</div>
          <h2 className="text-lg font-bold text-slate-900">Medicine Not Found</h2>
          <p className="text-xs text-slate-500">
            {error || "The requested medicine could not be found in our catalog."}
          </p>
          <Link
            href={catalogHref}
            className="inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors"
          >
            &larr; Back to All Medicines
          </Link>
        </div>
      </div>
    );
  }

  const priceNum = Number(product.price);
  const priceFormatted = `₹${priceNum.toFixed(2)}`;

  return (
    <div className="w-full bg-[#fbfdfa] flex flex-col page-entrance">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb / Back Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link
            href={catalogHref}
            className="hover:text-[#1b5e3b] transition-colors flex items-center gap-1"
          >
            <span>&larr;</span>
            <span>Back to All Medicines</span>
          </Link>
        </div>

        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {product.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
              View formulation details, dosage instructions, and recurring delivery options.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Quantity Selector */}
            <div className="flex items-center rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-xs p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isAdding || isBuying}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span className="w-8 text-center text-xs font-bold text-slate-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                disabled={quantity >= (product.stock || 99) || isAdding || isBuying}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                aria-label="Increase quantity"
              >
                &#43;
              </button>
            </div>

            {/* Add to Cart */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding || isBuying || product.stock <= 0 || !product.isActive}
              className="rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>🛒</span>
              )}
              <span>{product.stock <= 0 ? "Out of Stock" : "Add to Cart"}</span>
            </button>

            {/* Buy Now */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isAdding || isBuying || product.stock <= 0 || !product.isActive}
              className="rounded-xl border border-[#1b5e3b] bg-white/90 backdrop-blur-xs px-4 py-2.5 text-xs font-bold text-[#1b5e3b] shadow-xs hover:bg-[#1b5e3b] hover:text-white active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isBuying ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <span>⚡</span>
              )}
              <span>Buy Now</span>
            </button>

            {/* Schedule Refill */}
            <Link
              href={`/subscriptions/${product.id}/schedule?qty=${quantity}`}
              className="rounded-xl border border-[#1b5e3b]/40 bg-[#eef8dd]/80 backdrop-blur-xs px-4 py-2.5 text-xs font-bold text-[#1b5e3b] shadow-xs hover:bg-[#1b5e3b] hover:text-white active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔄</span>
              <span>Schedule Refill</span>
            </Link>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Large Medicine Details Card */}
          <div className="lg:col-span-8">
            <div className="glass-card rounded-2xl p-6 sm:p-7 shadow-xs">
              {/* Top Medicine Visual & Core Details */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                {/* Medicine Image Container */}
                <div className="flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-2xl bg-[#eef8dd]/80 shrink-0 mx-auto sm:mx-0">
                  <svg className="h-20 w-20 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
                      <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                      <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                      <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
                    </g>
                  </svg>
                </div>

                {/* Product Info & Metrics */}
                <div className="flex-1 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      {product.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        product.stock > 0
                          ? "bg-[#dcfce7] text-[#166534]"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {product.stock > 0 ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    {product.description || "Trusted healthcare formulation"}
                  </p>

                  {/* 3 Metric Boxes */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-400 block">
                        Availability
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {product.stock} units
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-400 block">
                        Status
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-400 block">
                        Price
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {priceFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Product Overview */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold text-slate-900 mb-4">
                  Product Overview
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <span className="text-xs">🛡️</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">
                        Quality Assurance
                      </span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5">
                        100% Genuine Pharmacy Sourced
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <span className="text-xs">🚚</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">
                        Fulfillment Slot
                      </span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5">
                        Express Same-Day Dispatch
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Usage Guidelines */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold text-slate-900 mb-3">
                  Usage Instructions &amp; Safety
                </h3>
                <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
                  <p>&bull; Use strictly as directed by your physician or healthcare provider.</p>
                  <p>&bull; Keep medications out of reach of children and store in a cool, dry place.</p>
                  <p>&bull; Verify expiry dates and packaging integrity upon receipt.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Refill Status, Delivery Info, Action Buttons */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <RefillStatusCard productId={product.id} />
            <DeliveryInfoCard
              label={deliveryAddress?.label}
              addressLine={deliveryAddress?.address}
              city={deliveryAddress?.city}
              state={deliveryAddress?.state}
              postalCode={deliveryAddress?.postalCode}
            />

            {/* Purchase Action Buttons */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isAdding || isBuying || product.stock <= 0 || !product.isActive}
              className="w-full rounded-xl bg-[#1b5e3b] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isBuying ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>⚡</span>
              )}
              <span>Buy Now &rarr;</span>
            </button>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding || isBuying || product.stock <= 0 || !product.isActive}
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xs py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#1b5e3b] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-2xs"
            >
              {isAdding ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
              ) : (
                <span>🛒</span>
              )}
              <span>Add to Cart</span>
            </button>

            <Link
              href={`/subscriptions/${product.id}/schedule?qty=${quantity}`}
              className="w-full rounded-xl bg-[#eef8dd]/80 border border-[#bbf7d0] py-2.5 text-xs font-bold text-[#1b5e3b] shadow-xs hover:bg-[#1b5e3b] hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🔄</span>
              <span>Schedule Refill &rarr;</span>
            </Link>

            <Link
              href={catalogHref}
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xs py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] transition-all flex items-center justify-center shadow-2xs"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-lg ${
              toastMessage.type === "success" ? "bg-[#1b5e3b]" : "bg-rose-600"
            }`}
          >
            <span>{toastMessage.type === "success" ? "✓" : "⚠️"}</span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
