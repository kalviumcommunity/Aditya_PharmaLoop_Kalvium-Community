"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
}

const CATEGORIES = [
  { label: "All", slug: "all", icon: "" },
  { label: "Pain Relief", slug: "pain-relief", icon: "💊" },
  { label: "Vitamins", slug: "vitamins", icon: "🌿" },
  { label: "Antibiotics", slug: "antibiotics", icon: "💊" },
  { label: "Cold & Flu", slug: "cold-flu", icon: "❄️" },
  { label: "Personal Care", slug: "personal-care", icon: "🧴" },
  { label: "Digestive Health", slug: "digestive-health", icon: "🫁" },
  { label: "More ▾", slug: "more", icon: "" },
];

function PublicMedicinesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = searchInput !== null ? searchInput : urlQuery;

  useEffect(() => {
    let isCancelled = false;

    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    fetch(`/api/products${query}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load medicines");
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          if (json.success && json.data && Array.isArray(json.data.items)) {
            setProducts(json.data.items);
          } else {
            setProducts([]);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("[PublicProducts] Error:", err);
          setError("Unable to load medicines catalog.");
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [search]);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAddToCart = async (prod: ApiProduct) => {
    if (addingId) return;
    setAddingId(prod.id);

    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: prod.id, quantity: 1 }),
      });

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/products")}`);
        return;
      }

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        window.dispatchEvent(new Event("pharmaloop_cart_updated"));
        showToast(`Added ${prod.name} to cart!`, "success");
      } else {
        const errorMsg = json?.error || json?.message || "Failed to add to cart";
        showToast(errorMsg, "error");
      }
    } catch {
      showToast("Network error. Could not add medicine to cart.", "error");
    } finally {
      setAddingId(null);
    }
  };

  const getProductVisuals = (name: string, index: number) => {
    const lower = name.toLowerCase();
    if (lower.includes("crocin") || lower.includes("dolo") || lower.includes("calpol")) {
      return {
        bgClass: "bg-[#eef8f1]",
        category: "Pain Relief",
        categorySlug: "pain-relief",
        iconType: "crocin",
      };
    }
    if (lower.includes("vitamin") || lower.includes("d3") || lower.includes("revital") || lower.includes("becosules") || lower.includes("neurobion")) {
      return {
        bgClass: "bg-[#fef9c3]/70",
        category: "Vitamins",
        categorySlug: "vitamins",
        iconType: "vitamin",
      };
    }
    if (lower.includes("amoxicillin") || lower.includes("augmentin") || lower.includes("azithromycin")) {
      return {
        bgClass: "bg-[#e0f2fe]/70",
        category: "Antibiotic",
        categorySlug: "antibiotics",
        iconType: "amoxicillin",
      };
    }
    if (lower.includes("cetirizine") || lower.includes("vicks") || lower.includes("cough") || lower.includes("honitus")) {
      return {
        bgClass: "bg-[#fce7f3]/60",
        category: "Cold & Flu",
        categorySlug: "cold-flu",
        iconType: "cetirizine",
      };
    }
    if (lower.includes("inhaler") || lower.includes("salbutamol")) {
      return {
        bgClass: "bg-[#e0f2fe]/70",
        category: "Respiratory",
        categorySlug: "cold-flu",
        iconType: "inhaler",
      };
    }
    if (lower.includes("omega") || lower.includes("fish oil")) {
      return {
        bgClass: "bg-[#f1f5f9]",
        category: "Supplements",
        categorySlug: "vitamins",
        iconType: "omega",
      };
    }
    if (lower.includes("sanitizer") || lower.includes("cetaphil")) {
      return {
        bgClass: "bg-[#fef9c3]/60",
        category: "Personal Care",
        categorySlug: "personal-care",
        iconType: "sanitizer",
      };
    }

    const bgColors = ["bg-[#eef8f1]", "bg-[#fef9c3]/70", "bg-[#e0f2fe]/70", "bg-[#fce7f3]/60"];
    return {
      bgClass: bgColors[index % bgColors.length],
      category: "Healthcare",
      categorySlug: "all",
      iconType: "general",
    };
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod, idx) => {
      const visuals = getProductVisuals(prod.name, idx);
      const matchesCategory =
        activeCategory === "all" ||
        activeCategory === "more" ||
        visuals.categorySlug === activeCategory;

      return matchesCategory;
    });
  }, [products, activeCategory]);

  return (
    <div className="w-full bg-[#fbfdfa] flex flex-col page-entrance">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {/* Top Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text & Search Area (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-slate-900 leading-tight">
                Medicines for everyday health.
              </h1>
              <p className="text-xl sm:text-2xl font-black text-[#1b5e3b] mt-1">
                Simple. Trusted. On time.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
                Browse trusted medicines and healthcare products for you and your loved ones.
              </p>
            </div>

            {/* Large Search Bar */}
            <div className="relative flex items-center max-w-xl">
              <div className="pointer-events-none absolute left-4 flex items-center text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search medicines, health products..."
                className="w-full rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/90 py-3 pl-11 pr-28 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-500/15 transition-all"
              />
              <button
                type="button"
                className="absolute right-1.5 rounded-full bg-[#1b5e3b] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] active:scale-[0.98] transition-all"
              >
                Search
              </button>
            </div>

            {/* Mini Trust Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#1b5e3b] text-base select-none">🚚</span>
                <div>
                  <p className="font-bold text-slate-900 leading-tight">Genuine Products</p>
                  <p className="text-[10px] text-slate-400 font-normal">100% authentic medicines</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#1b5e3b] text-base select-none">🛡️</span>
                <div>
                  <p className="font-bold text-slate-900 leading-tight">Safe &amp; Secure</p>
                  <p className="text-[10px] text-slate-400 font-normal">Your data is protected</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#1b5e3b] text-base select-none">💚</span>
                <div>
                  <p className="font-bold text-slate-900 leading-tight">Better Health</p>
                  <p className="text-[10px] text-slate-400 font-normal">Care for what matters</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Promo Banner Card (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-[#eaf6ee] via-[#e4f3e9] to-[#daf0e1] p-6 sm:p-7 border border-[#cbe8d4] shadow-sm overflow-hidden flex flex-col justify-between min-h-[220px] group">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/40 blur-xl" />
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  Your Health.<br />
                  Our Priority.
                </h2>
                <p className="text-xs text-slate-600 mt-2 max-w-[200px] leading-relaxed font-medium">
                  Quality medicines for a healthier tomorrow.
                </p>

                <div className="mt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs shadow-xs text-slate-700 group-hover:bg-[#1b5e3b] group-hover:text-white group-hover:translate-x-1 transition-all duration-300 cursor-pointer">
                    &rarr;
                  </div>
                </div>
              </div>

              {/* Decorative Pill/Bottle Graphic inside banner */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full drop-shadow-md" viewBox="0 0 160 160" fill="none">
                    <rect x="75" y="45" width="60" height="75" rx="14" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                    <rect x="85" y="32" width="40" height="15" rx="5" fill="#1b5e3b" />
                    <rect x="85" y="65" width="40" height="40" rx="6" fill="#f8fafc" />
                    <path d="M105 75v20M95 85h20" stroke="#1b5e3b" strokeWidth="4" strokeLinecap="round" />
                    <g transform="rotate(-20 40 80)">
                      <rect x="20" y="55" width="45" height="65" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                      <circle cx="32" cy="72" r="5" fill="#ffffff" />
                      <circle cx="50" cy="72" r="5" fill="#ffffff" />
                      <circle cx="32" cy="90" r="5" fill="#ffffff" />
                      <circle cx="50" cy="90" r="5" fill="#ffffff" />
                    </g>
                    <g transform="rotate(35 60 120)">
                      <rect x="45" y="115" width="28" height="12" rx="6" fill="#1b5e3b" />
                      <rect x="59" y="115" width="14" height="12" rx="6" fill="#ffffff" />
                    </g>
                  </svg>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end text-[10px] text-slate-500 font-medium italic">
                Small steps &hearts; Healthier tomorrows &hearts;
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-medium whitespace-nowrap transition-all duration-200 shadow-2xs cursor-pointer ${
                  isSelected
                    ? "bg-[#1b5e3b] text-white font-bold shadow-xs ring-2 ring-emerald-600/25"
                    : "bg-white/80 backdrop-blur-xs text-slate-700 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Product Grid Section */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Popular medicines
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Everyday essentials, carefully selected for you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("all");
                setSearchInput("");
              }}
              className="text-xs font-bold text-[#1b5e3b] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Loading & Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-white border border-slate-100 p-4 animate-pulse space-y-3"
                >
                  <div className="h-36 w-full rounded-2xl bg-slate-100" />
                  <div className="h-4 w-32 bg-slate-200 rounded-sm" />
                  <div className="h-3 w-20 bg-slate-100 rounded-sm" />
                  <div className="h-4 w-16 bg-slate-200 rounded-sm" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 shadow-xs">
              <p className="text-xs font-medium text-rose-500">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center border border-slate-100 shadow-xs">
              <p className="text-sm font-semibold text-slate-700">No medicines found</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for a different name or category.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setActiveCategory("all");
                }}
                className="mt-4 rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredProducts.map((prod, idx) => {
                const visuals = getProductVisuals(prod.name, idx);
                const priceFormatted = `₹${Number(prod.price).toFixed(2)}`;

                return (
                  <div
                    key={prod.id}
                    className="group glass-card glass-card-interactive rounded-3xl p-4 flex flex-col justify-between transition-all duration-300"
                  >
                    <div>
                      {/* Top Image Container */}
                      <div
                        className={`relative flex h-36 w-full items-center justify-center rounded-2xl ${visuals.bgClass} overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]`}
                      >
                        {/* Icon Graphics based on product */}
                        {visuals.iconType === "crocin" ? (
                          <svg className="h-14 w-14 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                            <g transform="rotate(-35 32 32)">
                              <rect x="22" y="10" width="20" height="22" rx="10" fill="#f43f5e" />
                              <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                              <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                              <rect x="25" y="14" width="4" height="12" rx="2" fill="#ffffff" fillOpacity="0.4" />
                            </g>
                          </svg>
                        ) : visuals.iconType === "vitamin" ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-9 h-5 rounded-full bg-amber-400/90 shadow-xs rotate-12" />
                            <div className="w-9 h-5 rounded-full bg-amber-500/90 shadow-xs -rotate-12" />
                          </div>
                        ) : visuals.iconType === "amoxicillin" ? (
                          <svg className="h-14 w-14 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                            <g transform="rotate(-35 32 32)">
                              <rect x="22" y="10" width="20" height="22" rx="10" fill="#0284c7" />
                              <rect x="22" y="32" width="20" height="22" rx="10" fill="#ffffff" />
                              <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth={1} />
                            </g>
                          </svg>
                        ) : visuals.iconType === "cetirizine" ? (
                          <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200/80 flex items-center justify-center">
                            <div className="w-8 h-[1.5px] bg-slate-200" />
                          </div>
                        ) : visuals.iconType === "inhaler" ? (
                          <div className="flex flex-col items-center">
                            <div className="w-5 h-8 rounded-t bg-slate-300" />
                            <div className="w-8 h-12 rounded bg-sky-500 shadow-xs" />
                          </div>
                        ) : visuals.iconType === "omega" ? (
                          <div className="w-12 h-16 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center p-1">
                            <div className="w-8 h-2 rounded-full bg-slate-300 mb-1" />
                            <span className="text-[7px] font-black text-slate-700 uppercase">OMEGA 3</span>
                          </div>
                        ) : visuals.iconType === "sanitizer" ? (
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-4 rounded-t bg-slate-400" />
                            <div className="w-9 h-14 rounded-xl bg-sky-100 border border-sky-200 shadow-xs flex items-center justify-center">
                              <span className="text-[9px]">🧴</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-3xl">💊</div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="mt-3 px-1 text-left">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#1b5e3b] transition-colors">
                          {prod.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium line-clamp-1">
                          {prod.description || visuals.category}
                        </p>

                        <div className="mt-2.5 flex items-baseline gap-1.5">
                          <span className="text-sm font-extrabold text-slate-900">
                            {priceFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-2.5 flex items-center gap-2 border-t border-slate-100/80">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(prod)}
                        disabled={addingId === prod.id || prod.stock <= 0 || !prod.isActive}
                        className="flex-1 rounded-xl bg-[#1b5e3b] py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {addingId === prod.id ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : prod.stock <= 0 || !prod.isActive ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <span>🛒</span>
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                      <Link
                        href={`/products/${prod.id}`}
                        className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xs px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#1b5e3b] active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Trust Features Row */}
        <div className="rounded-3xl glass-card border border-emerald-100/60 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1b5e3b] shadow-xs text-base shrink-0 border border-emerald-100/60">
              🛡️
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Secure Payments</p>
              <p className="text-[10px] text-slate-500 font-normal">Multiple safe payment options</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1b5e3b] shadow-xs text-base shrink-0 border border-emerald-100/60">
              📦
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Trusted Medicines</p>
              <p className="text-[10px] text-slate-500 font-normal">100% genuine products</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1b5e3b] shadow-xs text-base shrink-0 border border-emerald-100/60">
              🚚
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Fast &amp; Reliable</p>
              <p className="text-[10px] text-slate-500 font-normal">On time, every time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1b5e3b] shadow-xs text-base shrink-0 border border-emerald-100/60">
              🎧
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">24/7 Support</p>
              <p className="text-[10px] text-slate-500 font-normal">We&apos;re here to help</p>
            </div>
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

export default function PublicMedicinesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading catalog...</div>}>
      <PublicMedicinesContent />
    </Suspense>
  );
}
