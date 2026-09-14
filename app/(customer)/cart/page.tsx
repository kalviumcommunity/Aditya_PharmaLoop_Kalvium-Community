"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Hydration safety mount check
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  stock?: number;
  isActive?: boolean;
}

interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface MedicineMeta {
  category: string;
  dosage: string;
  packaging: string;
  mrp?: number;
}

/**
 * Authoritative medicine metadata lookup matching PharmaLoop catalog
 */
const MEDICINE_METADATA_MAP: Record<string, MedicineMeta> = {
  crocin: {
    category: "Pain Relief",
    dosage: "650mg",
    packaging: "15 Tablets",
    mrp: 135,
  },
  dolo: {
    category: "Pain Relief",
    dosage: "650mg",
    packaging: "15 Tablets",
    mrp: 135,
  },
  calpol: {
    category: "Pain Relief",
    dosage: "500mg",
    packaging: "10 Tablets",
    mrp: 110,
  },
  vitamin: {
    category: "Bone Health",
    dosage: "1000 IU",
    packaging: "60 Tablets",
    mrp: 399,
  },
  d3: {
    category: "Bone Health",
    dosage: "1000 IU",
    packaging: "60 Tablets",
    mrp: 399,
  },
  amoxicillin: {
    category: "Antibiotic",
    dosage: "500mg",
    packaging: "10 Capsules",
    mrp: 99,
  },
  augmentin: {
    category: "Antibiotic",
    dosage: "625mg",
    packaging: "10 Tablets",
    mrp: 180,
  },
  azithral: {
    category: "Antibiotic",
    dosage: "500mg",
    packaging: "5 Tablets",
    mrp: 130,
  },
  pantocid: {
    category: "Digestive Health",
    dosage: "40mg",
    packaging: "15 Tablets",
    mrp: 155,
  },
  gelusil: {
    category: "Digestive Health",
    dosage: "Syrup",
    packaging: "200ml",
    mrp: 120,
  },
};

/**
 * Resolves dosage, packaging, category, and MRP for a product
 */
function resolveProductMeta(product: Product): {
  dosageText: string;
  category: string;
  mrp?: number;
} {
  const lower = product.name.toLowerCase();

  for (const [key, meta] of Object.entries(MEDICINE_METADATA_MAP)) {
    if (lower.includes(key)) {
      return {
        dosageText: `${meta.dosage} · ${meta.packaging}`,
        category: meta.category,
        mrp: meta.mrp,
      };
    }
  }

  // Fallback to description if available
  const desc = product.description?.trim();
  return {
    dosageText: desc || "Standard Pack",
    category: "General Health",
    mrp: undefined,
  };
}

/**
 * High-fidelity Medicine Thumbnail Visuals matching reference design
 */
function CartItemThumbnail({ product }: { product: Product }) {
  if (product.imageUrl) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-2 border border-slate-200/80 overflow-hidden shadow-2xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
      </div>
    );
  }

  const lower = product.name.toLowerCase();

  // Crocin / Paracetamol: soft red/pink container with 3D capsule
  if (lower.includes("crocin") || lower.includes("dolo") || lower.includes("calpol") || lower.includes("paracetamol")) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f2] border border-[#ffe4e6] p-2 shadow-2xs">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="w-9 h-5 rounded-full bg-gradient-to-r from-[#e11d48] via-[#f43f5e] to-white border border-rose-300 shadow-xs transform -rotate-45 flex items-center justify-center overflow-hidden">
            <div className="w-1/2 h-full bg-[#e11d48]" />
            <div className="w-1/2 h-full bg-white flex items-center justify-center">
              <span className="h-1 w-1 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vitamin D3 / Supplements: soft coral/pink container with bottle
  if (lower.includes("vitamin") || lower.includes("d3") || lower.includes("revital") || lower.includes("calcium")) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#fdf2f8] border border-[#fce7f3] p-2 shadow-2xs">
        <div className="w-6 h-9 bg-[#f472b6] rounded-md border border-[#ec4899] shadow-xs flex flex-col items-center justify-between p-1">
          <div className="w-4 h-1.5 bg-white rounded-xs" />
          <div className="flex items-center justify-center">
            <span className="text-[7px] font-black text-white leading-none">+</span>
          </div>
          <div className="w-3 h-0.5 bg-white/70 rounded-full" />
        </div>
      </div>
    );
  }

  // Amoxicillin / Antibiotic: soft blue container with blue/white capsule
  if (lower.includes("amox") || lower.includes("augmentin") || lower.includes("azithral") || lower.includes("antibiotic")) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#eff6ff] border border-[#dbeafe] p-2 shadow-2xs">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="w-9 h-5 rounded-full bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-white border border-blue-300 shadow-xs transform -rotate-45 flex items-center justify-center overflow-hidden">
            <div className="w-1/2 h-full bg-[#2563eb]" />
            <div className="w-1/2 h-full bg-white flex items-center justify-center">
              <span className="h-1 w-1 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generic healthcare product thumbnail
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f0fdf4] border border-[#dcfce7] p-2 shadow-2xs">
      <svg className="h-7 w-7 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const isMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mutation states
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // Fetch cart data
  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.items)) {
        setCartItems(json.data.items);
      } else if (json.error) {
        setError(json.error);
      } else {
        setCartItems([]);
      }
    } catch {
      setError("Unable to connect to the cart service. Please check your network.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    fetch("/api/cart")
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled) {
          if (json.success && json.data && Array.isArray(json.data.items)) {
            setCartItems(json.data.items);
          } else if (json.error) {
            setError(json.error);
          } else {
            setCartItems([]);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Unable to connect to the cart service. Please check your network.");
          setLoading(false);
        }
      });

    // Listen to external cart update events to keep in sync
    const handleCartSync = () => {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((json) => {
          if (!isCancelled && json.success && json.data && Array.isArray(json.data.items)) {
            setCartItems(json.data.items);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("pharmaloop_cart_updated", handleCartSync);
    return () => {
      isCancelled = true;
      window.removeEventListener("pharmaloop_cart_updated", handleCartSync);
    };
  }, []);

  // Semantics: Distinct Products vs Total Quantity
  const distinctProductCount = cartItems.length;
  const totalQuantity = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cartItems]);

  // Price calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = Number(item.product.price) || 0;
      return acc + price * (item.quantity || 1);
    }, 0);
  }, [cartItems]);

  const totalSavings = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const meta = resolveProductMeta(item.product);
      const price = Number(item.product.price) || 0;
      if (meta.mrp && meta.mrp > price) {
        return acc + (meta.mrp - price) * (item.quantity || 1);
      }
      return acc;
    }, 0);
  }, [cartItems]);

  const totalAmount = subtotal;

  // Quantity Update with Optimistic UI & Rollback
  const handleUpdateQuantity = async (item: CartItem, delta: number) => {
    const currentQty = item.quantity || 1;
    const newQty = currentQty + delta;

    if (newQty < 1) return;

    // Check stock limit if defined
    if (typeof item.product.stock === "number" && item.product.stock > 0 && newQty > item.product.stock) {
      showToast(`Only ${item.product.stock} units available in stock.`, "error");
      return;
    }

    setMutatingItemId(item.id);
    const prevItems = [...cartItems];

    // Optimistic update
    const updatedItems = cartItems.map((ci) =>
      ci.id === item.id ? { ...ci, quantity: newQty } : ci
    );
    setCartItems(updatedItems);

    try {
      const res = await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Rollback
        setCartItems(prevItems);
        showToast(json.error || "Failed to update quantity.", "error");
      } else {
        // Calculate new total quantity across all items
        const newTotalQty = updatedItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
        window.dispatchEvent(
          new CustomEvent("pharmaloop_cart_updated", { detail: { count: newTotalQty } })
        );
      }
    } catch {
      // Rollback on network failure
      setCartItems(prevItems);
      showToast("Network error. Quantity could not be updated.", "error");
    } finally {
      setMutatingItemId(null);
    }
  };

  // Remove Item with Optimistic UI & Rollback
  const handleRemoveItem = async (item: CartItem) => {
    setMutatingItemId(item.id);
    const prevItems = [...cartItems];

    // Optimistic removal
    const remainingItems = cartItems.filter((ci) => ci.id !== item.id);
    setCartItems(remainingItems);

    try {
      const res = await fetch(`/api/cart/items/${item.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Rollback
        setCartItems(prevItems);
        showToast(json.error || "Failed to remove item.", "error");
      } else {
        const newTotalQty = remainingItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
        window.dispatchEvent(
          new CustomEvent("pharmaloop_cart_updated", { detail: { count: newTotalQty } })
        );
        showToast(`Removed ${item.product.name} from cart.`);
      }
    } catch {
      // Rollback on network failure
      setCartItems(prevItems);
      showToast("Network error. Could not remove item.", "error");
    } finally {
      setMutatingItemId(null);
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse pb-12">
        <div className="h-5 w-32 bg-slate-200 rounded-md" />
        <div className="flex justify-between items-center">
          <div className="h-9 w-64 bg-slate-200 rounded-md" />
          <div className="h-16 w-52 bg-slate-200 rounded-2xl hidden md:block" />
        </div>
        <div className="h-16 w-full bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 h-96 bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-4 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-14 page-entrance">
      {/* Toast feedback */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toast.type === "error"
              ? "bg-rose-900 text-white"
              : "bg-slate-900 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <span className="text-rose-400">⚠️</span>
          ) : (
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Continue Shopping Link */}
      <div>
        <Link
          href="/dashboard/medicines"
          className="text-xs font-bold text-[#166534] hover:text-[#14532d] hover:underline inline-flex items-center gap-1.5 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Cart Header with Headline & Right Decorative Graphic */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Shopping Cart
            </h1>
            <span className="rounded-md bg-[#e2f3e8] border border-[#c6ebd3] px-2.5 py-0.5 text-xs font-bold text-[#166534]">
              {totalQuantity} {totalQuantity === 1 ? "Item" : "Items"}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Review your medicines and proceed to fast, doorstep delivery.
          </p>
        </div>

        {/* Decorative Graphic: Shopping Cart + Better Health Banner */}
        <div className="flex items-center gap-3.5 rounded-2xl glass-card border border-emerald-200/60 px-5 py-2.5 shadow-2xs self-start md:self-auto">
          {/* Cart with Green Cross Vector Illustration */}
          <div className="relative flex items-center justify-center">
            <svg className="h-9 w-9 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#166534] text-white text-[9px] font-black shadow-xs">
              +
            </div>
          </div>

          <div className="text-left">
            <p className="text-xs font-extrabold text-[#166534] tracking-tight leading-tight">
              Better Health
            </p>
            <p className="text-[10px] text-[#22c55e] font-semibold leading-tight">
              Brighter Tomorrow
            </p>
          </div>
        </div>
      </div>

      {/* Free Express Delivery Perks Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#eef8f1] via-[#f4faf5] to-[#e8f5ec] border border-[#d6eedd] p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#166534] shadow-xs text-base border border-emerald-100/60">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-900">
              Free Express Delivery Unlocked!
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Your order qualifies for guaranteed next-day delivery at no extra cost.
            </p>
          </div>
        </div>

        <span className="text-xs sm:text-sm font-extrabold text-[#166534] shrink-0">
          ₹0 Delivery
        </span>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => refreshCart()}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content: If Cart is Empty vs If Cart Has Items */}
      {cartItems.length === 0 ? (
        /* 10. Empty Cart State */
        <div className="rounded-2xl bg-white border border-slate-200/80 p-8 sm:p-12 text-center shadow-2xs space-y-4 max-w-xl mx-auto my-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0f9f3] border border-[#d6eedd] text-[#166534]">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-900">Your cart is empty</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Looks like you haven&apos;t added any medicines yet. Browse our verified pharmacy collection to get started.
          </p>

          <div className="pt-2">
            <Link
              href="/dashboard/medicines"
              className="inline-flex items-center gap-2 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-bold text-xs sm:text-sm px-6 py-3 shadow-xs transition-all active:scale-[0.99]"
            >
              <span>Browse Medicines</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Main 2-Column Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cart Items Card & Helper Panel */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Cart Items ({distinctProductCount})
              </h2>

              {/* Items List */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const meta = resolveProductMeta(item.product);
                  const price = Number(item.product.price) || 0;
                  const isMutating = mutatingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:bg-white/95 hover:shadow-2xs"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <CartItemThumbnail product={item.product} />

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {item.product.name}
                          </h3>

                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {meta.dosageText}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-md bg-[#e2f3e8] px-2 py-0.5 text-[10px] font-bold text-[#166534] shadow-2xs">
                              {meta.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Pricing, Quantity Stepper & Remove Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        {/* Price Display */}
                        <div className="text-left sm:text-right">
                          <span className="text-sm sm:text-base font-extrabold text-[#166534]">
                            ₹{(price * (item.quantity || 1)).toFixed(2)}
                          </span>
                          {meta.mrp && meta.mrp > price && (
                            <span className="text-xs text-slate-400 line-through block">
                              ₹{(meta.mrp * (item.quantity || 1)).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-100/70 p-0.5 shadow-2xs">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={isMutating || item.quantity <= 1}
                            onClick={() => handleUpdateQuantity(item, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-2xs text-xs font-bold active:scale-95"
                          >
                            &minus;
                          </button>

                          <span className="w-7 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={isMutating}
                            onClick={() => handleUpdateQuantity(item, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-2xs text-xs font-bold active:scale-95"
                          >
                            &#43;
                          </button>
                        </div>

                        {/* Trash Remove Button */}
                        <button
                          type="button"
                          aria-label={`Remove ${item.product.name} from cart`}
                          disabled={isMutating}
                          onClick={() => handleRemoveItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 13. Helper Section: Need something else? */}
              <div className="rounded-2xl bg-white/60 backdrop-blur-xs border border-slate-200/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[#166534] text-xs shrink-0 border border-emerald-200/60">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Need something else?
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal">
                      You can continue shopping and add more items to your cart.
                    </p>
                  </div>
                </div>

                <Link
                  href="/dashboard/medicines"
                  className="rounded-xl border border-slate-200/80 bg-white/80 hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#166534] text-slate-700 font-semibold text-xs px-4 py-2 text-center shadow-2xs transition-all active:scale-[0.98] self-start sm:self-auto"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Trust Panels */}
          <div className="lg:col-span-4 space-y-4">
            {/* 10. Order Summary Card */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Order Summary
              </h2>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? "item" : "items"})</span>
                  <span className="font-semibold text-slate-900">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-[#166534]">Free</span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Savings / Discount</span>
                    <span className="font-semibold text-[#166534]">
                      -₹{totalSavings.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-100/80 pt-3.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    Total Amount
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#166534]">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 11. Checkout CTA Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={cartItems.length === 0}
                  onClick={() => router.push("/checkout")}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-white font-bold text-xs sm:text-sm text-center shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <span>&rarr;</span>
                </button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-normal">
                  <svg className="h-3.5 w-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Safe &amp; Secure 256-Bit SSL Encrypted Checkout</span>
                </div>
              </div>
            </div>

            {/* 12. Why Shop with PharmaLoop? */}
            <div className="glass-card rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Why Shop with PharmaLoop?
              </h3>

              <div className="space-y-3">
                {/* 1. Genuine Medicines */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#166534] shrink-0 border border-emerald-100/60 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">
                      Genuine Medicines
                    </h4>
                    <p className="text-[10px] text-slate-400 font-normal">
                      100% authentic &amp; verified
                    </p>
                  </div>
                </div>

                {/* 2. Fast & Reliable Delivery */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100/60 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">
                      Fast &amp; Reliable Delivery
                    </h4>
                    <p className="text-[10px] text-slate-400 font-normal">
                      On-time, every time
                    </p>
                  </div>
                </div>

                {/* 3. Secure Payments */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0 border border-sky-100/60 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">
                      Secure Payments
                    </h4>
                    <p className="text-[10px] text-slate-400 font-normal">
                      Your data is always safe
                    </p>
                  </div>
                </div>

                {/* 4. Better Health, Always */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 shrink-0 border border-rose-100/60 shadow-2xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">
                      Better Health, Always
                    </h4>
                    <p className="text-[10px] text-slate-400 font-normal">
                      Trusted by thousands
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Care Banner */}
            <div className="rounded-2xl glass-card border border-emerald-100/60 p-4 shadow-2xs flex items-center justify-between gap-3 overflow-hidden relative">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e2f3e8] text-[#166534] shrink-0 border border-emerald-200/60 shadow-2xs">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Taking care of you,
                  </p>
                  <p className="text-xs font-medium text-slate-600 leading-tight">
                    one delivery at a time.
                  </p>
                </div>
              </div>

              {/* Decorative soft leaf outline */}
              <div className="text-emerald-100/80 opacity-60">
                <svg className="h-14 w-14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
