"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerMedicine {
  id: string;
  name: string;
  generic: string;
  category: string;
  categorySlug: string;
  secondaryCategorySlug?: string;
  packaging: string;
  price: number;
  mrp?: number;
  discount?: string;
  badgeType?: "discount" | "popular" | "prescription";
  imageType: string;
  inStock: boolean;
  stock: number;
}

const CATEGORIES = [
  { label: "All", slug: "all" },
  { label: "Pain Relief", slug: "pain-relief" },
  { label: "Vitamins", slug: "vitamins" },
  { label: "Antibiotics", slug: "antibiotics" },
  { label: "Cold & Flu", slug: "cold-flu" },
  { label: "Personal Care", slug: "personal-care" },
  { label: "Digestive Health", slug: "digestive-health" },
  { label: "Respiratory", slug: "respiratory" },
  { label: "Diabetes", slug: "diabetes" },
  { label: "Skin Care", slug: "skin-care" },
  { label: "Feminine Care", slug: "feminine-care" },
  { label: "More ▾", slug: "more" },
];

function inferProductMetadata(name: string, description: string | null): {
  generic: string;
  category: string;
  categorySlug: string;
  secondaryCategorySlug?: string;
  packaging: string;
  imageType: string;
  badgeType?: "discount" | "popular" | "prescription";
} {
  const lowerName = name.toLowerCase();
  const lowerDesc = (description || "").toLowerCase();
  const combined = `${lowerName} ${lowerDesc}`;

  // Image Type for custom illustrations
  let imageType = "default";
  if (lowerName.includes("crocin")) imageType = "crocin";
  else if (lowerName.includes("dolo")) imageType = "dolo";
  else if (lowerName.includes("calpol")) imageType = "calpol";
  else if (lowerName.includes("augmentin")) imageType = "augmentin";
  else if (lowerName.includes("neurobion")) imageType = "neurobion";
  else if (lowerName.includes("revital")) imageType = "revital";
  else if (lowerName.includes("vicks")) imageType = "vicks";
  else if (lowerName.includes("cetaphil")) imageType = "cetaphil";
  else if (lowerName.includes("azithromycin")) imageType = "azithromycin";
  else if (lowerName.includes("cetirizine")) imageType = "cetirizine";
  else if (lowerName.includes("inhaler") || lowerName.includes("salbutamol")) imageType = "inhaler";
  else if (lowerName.includes("omega")) imageType = "omega";
  else if (lowerName.includes("metformin")) imageType = "metformin";
  else if (lowerName.includes("pantoprazole")) imageType = "pantoprazole";
  else if (lowerName.includes("gelusil")) imageType = "gelusil";
  else if (lowerName.includes("allegra")) imageType = "allegra";
  else if (lowerName.includes("limcee")) imageType = "limcee";
  else if (lowerName.includes("digene")) imageType = "digene";
  else if (lowerName.includes("montair")) imageType = "montair";
  else if (lowerName.includes("glimepiride")) imageType = "glimepiride";
  else if (lowerName.includes("budecort")) imageType = "budecort";
  else if (lowerName.includes("volini")) imageType = "volini";

  // Category & Category Slug
  let category = "General Health";
  let categorySlug = "all";
  let secondaryCategorySlug: string | undefined;

  if (
    combined.includes("pain") ||
    combined.includes("paracetamol") ||
    combined.includes("crocin") ||
    combined.includes("dolo") ||
    combined.includes("calpol") ||
    combined.includes("volini")
  ) {
    category = "Pain Relief";
    categorySlug = "pain-relief";
  } else if (
    combined.includes("vitamin") ||
    combined.includes("omega") ||
    combined.includes("neurobion") ||
    combined.includes("revital") ||
    combined.includes("limcee")
  ) {
    category = "Vitamins";
    categorySlug = "vitamins";
  } else if (
    combined.includes("antibiotic") ||
    combined.includes("augmentin") ||
    combined.includes("azithromycin") ||
    combined.includes("amoxicillin")
  ) {
    category = "Antibiotics";
    categorySlug = "antibiotics";
  } else if (
    combined.includes("cold") ||
    combined.includes("flu") ||
    combined.includes("cough") ||
    combined.includes("cetirizine") ||
    combined.includes("allegra") ||
    combined.includes("vicks")
  ) {
    category = "Cold & Flu";
    categorySlug = "cold-flu";
  } else if (
    combined.includes("digestive") ||
    combined.includes("antacid") ||
    combined.includes("pantoprazole") ||
    combined.includes("digene") ||
    combined.includes("gelusil")
  ) {
    category = "Digestive Health";
    categorySlug = "digestive-health";
  } else if (
    combined.includes("respiratory") ||
    combined.includes("inhaler") ||
    combined.includes("salbutamol") ||
    combined.includes("budecort") ||
    combined.includes("montair")
  ) {
    category = "Respiratory";
    categorySlug = "respiratory";
  } else if (
    combined.includes("diabet") ||
    combined.includes("metformin") ||
    combined.includes("glimepiride")
  ) {
    category = "Diabetes";
    categorySlug = "diabetes";
  } else if (
    combined.includes("skin") ||
    combined.includes("clean") ||
    combined.includes("cetaphil") ||
    combined.includes("face")
  ) {
    category = "Skin Care";
    categorySlug = "skin-care";
    secondaryCategorySlug = "personal-care";
  } else if (
    combined.includes("wash") ||
    combined.includes("hygiene") ||
    combined.includes("personal")
  ) {
    category = "Personal Care";
    categorySlug = "personal-care";
  }

  // Packaging & Generic Display
  const generic = description && description.trim().length > 0 ? description : name;
  const packaging = combined.includes("syrup") || combined.includes("liquid") || combined.includes("wash")
    ? "Liquid Bottle"
    : combined.includes("gel") || combined.includes("cream")
    ? "Ointment Tube"
    : combined.includes("inhaler")
    ? "Aerosol Inhaler"
    : combined.includes("capsule")
    ? "10 Capsules"
    : "15 Tablets";

  // Badge classification
  let badgeType: "discount" | "popular" | "prescription" | undefined;
  if (categorySlug === "antibiotics" || categorySlug === "respiratory" || categorySlug === "diabetes") {
    badgeType = "prescription";
  }

  return {
    generic,
    category,
    categorySlug,
    secondaryCategorySlug,
    packaging,
    imageType,
    badgeType,
  };
}

function mapApiProductToUi(p: ApiProduct): CustomerMedicine {
  const metadata = inferProductMetadata(p.name, p.description);
  const numPrice = typeof p.price === "number" ? p.price : parseFloat(p.price) || 0;

  return {
    id: p.id, // REAL DB ID
    name: p.name,
    generic: metadata.generic,
    category: metadata.category,
    categorySlug: metadata.categorySlug,
    secondaryCategorySlug: metadata.secondaryCategorySlug,
    packaging: metadata.packaging,
    price: numPrice,
    imageType: metadata.imageType,
    badgeType: metadata.badgeType,
    inStock: p.stock > 0 && p.isActive,
    stock: p.stock,
  };
}

function getPastelBackground(type: string): string {
  switch (type) {
    case "crocin":
      return "bg-[#f0f9ff]/70";
    case "dolo":
      return "bg-[#fff1f2]/60";
    case "calpol":
      return "bg-[#faf5ff]/80";
    case "augmentin":
      return "bg-[#eef2ff]/80";
    case "neurobion":
      return "bg-[#f0fdf4]/70";
    case "revital":
      return "bg-[#fefce8]/80";
    case "vicks":
      return "bg-[#ecfeff]/70";
    case "cetaphil":
      return "bg-[#f8fafc]";
    default:
      return "bg-[#f0fdf4]/60";
  }
}

function MedicineCardVisual({ type }: { type: string }) {
  const pastelBg = getPastelBackground(type);

  switch (type) {
    case "crocin":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-40 h-24 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-4 bg-[#0284c7] flex items-center justify-between px-2">
              <span className="text-[7px] text-white font-black tracking-widest">GSK CONSUMER</span>
              <span className="text-[6px] text-sky-100 font-bold">PARACETAMOL</span>
            </div>
            <div className="mt-3 text-center">
              <div className="inline-block bg-[#0284c7] px-2 py-0.5 rounded-full mb-0.5">
                <span className="text-xs font-black text-white tracking-tight">Crocin</span>
              </div>
              <span className="text-[9px] font-extrabold text-[#0369a1] block">Advance 650</span>
            </div>
            <div className="absolute bottom-1 right-2 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            </div>
          </div>
        </div>
      );
    case "dolo":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-40 h-24 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#dc2626]" />
            <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#2563eb]" />
            <div className="text-center px-4">
              <span className="text-base font-black text-[#dc2626] tracking-tight block">Dolo 650</span>
              <span className="text-[9px] font-bold text-slate-500 block -mt-0.5">Paracetamol Tablets IP</span>
              <span className="text-[7px] text-slate-400 block mt-1">Micro Labs Limited</span>
            </div>
          </div>
        </div>
      );
    case "calpol":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-40 h-24 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-4 bg-[#db2777] flex items-center px-2">
              <span className="text-[7px] text-white font-bold">GlaxoSmithKline</span>
            </div>
            <div className="mt-3 text-center px-2">
              <span className="text-sm font-black text-[#db2777] tracking-tight block">Calpol</span>
              <span className="text-[8px] font-bold text-slate-500 block -mt-0.5">500 Paracetamol</span>
              <div className="mt-1 h-1 w-16 bg-pink-200 mx-auto rounded-full" />
            </div>
          </div>
        </div>
      );
    case "augmentin":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-40 h-24 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#581c87]" />
            <div className="text-center pl-3 pr-2">
              <span className="text-xs font-black text-slate-900 tracking-tight block">Augmentin</span>
              <span className="text-[8px] font-black text-[#6b21a8] block">625 Duo</span>
              <span className="text-[6px] text-slate-400 block mt-0.5">Amoxicillin + Clavulanate</span>
            </div>
          </div>
        </div>
      );
    case "neurobion":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-40 h-24 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500" />
            <div className="text-center mt-2 px-2">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-black text-[#1e3a8a] tracking-tight">Neurobion</span>
                <span className="text-xs font-black text-rose-600">Forte</span>
              </div>
              <span className="text-[7px] text-slate-400 block mt-0.5">Vitamin B-Complex with B12</span>
            </div>
          </div>
        </div>
      );
    case "revital":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-24 h-26 bg-[#fef3c7] rounded-xl border border-amber-300 shadow-xs flex flex-col items-center justify-center p-2 text-center">
            <div className="w-10 h-3 bg-amber-500 rounded-sm -mt-2 mb-1 shadow-xs" />
            <span className="text-xs font-black text-amber-950 tracking-tight">Revital H</span>
            <span className="text-[7px] text-amber-800 font-bold mt-0.5">Daily Health</span>
            <div className="mt-1 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            </div>
          </div>
        </div>
      );
    case "vicks":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-22 h-22 bg-[#1e3a8a] rounded-2xl border-2 border-blue-950 shadow-md flex flex-col items-center justify-center text-center">
            <div className="w-18 h-3.5 bg-[#10b981] rounded-xs -mt-2 mb-1 shadow-xs" />
            <span className="text-xs font-black text-white tracking-wider">VICKS</span>
            <span className="text-[8px] text-[#6ee7b7] font-bold">VapoRub</span>
            <span className="text-[6px] text-blue-200 mt-0.5">Cold Relief</span>
          </div>
        </div>
      );
    case "cetaphil":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-20 h-26 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-between p-2 text-center">
            <div className="w-6 h-2.5 bg-[#0284c7] rounded-t-md -mt-1" />
            <div>
              <div className="border border-[#0284c7] rounded-full px-1 py-0.2 mb-0.5">
                <span className="text-[9px] font-black text-[#0284c7] block">Cetaphil</span>
              </div>
              <span className="text-[6px] text-slate-500 block">Gentle Skin Cleanser</span>
            </div>
            <div className="w-full h-1 bg-[#10b981] rounded-full" />
          </div>
        </div>
      );
    case "inhaler":
    case "budecort":
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-18 h-26 flex flex-col items-center justify-center">
            <div className="w-8 h-18 bg-gradient-to-b from-sky-400 to-sky-600 rounded-t-xl shadow-xs" />
            <div className="w-14 h-9 bg-sky-800 rounded-r-2xl -mt-2 shadow-xs flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className={`flex h-36 w-full items-center justify-center p-3 rounded-2xl ${pastelBg}`}>
          <div className="relative w-36 h-22 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💊</span>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">PharmaLoop</span>
                <span className="text-[8px] text-[#1b5e3b] font-semibold block">Quality Tested</span>
              </div>
            </div>
          </div>
        </div>
      );
  }
}

function CustomerMedicinesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState<string | null>(null);
  const search = searchInput !== null ? searchInput : queryParam;

  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "name_asc">("recommended");
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const itemsPerPage = 8;

  // Real backend products state
  const [products, setProducts] = useState<CustomerMedicine[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Cart & UI state
  const [cartCount, setCartCount] = useState<number>(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch real products from GET /api/products
  useEffect(() => {
    let isCancelled = false;

    const loadProducts = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        const params = new URLSearchParams();
        const currentQuery = (searchInput !== null ? searchInput : queryParam).trim();
        if (currentQuery) {
          params.set("search", currentQuery);
        }
        params.set("page", String(currentPage));
        params.set("limit", String(itemsPerPage));

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load medicines (Status: ${res.status})`);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || "Failed to load medicines");
        }

        if (isCancelled) return;

        const rawItems: ApiProduct[] = Array.isArray(json.data.items) ? json.data.items : [];
        const mapped = rawItems.map(mapApiProductToUi);

        setProducts(mapped);
        setTotalItems(typeof json.data.total === "number" ? json.data.total : mapped.length);
        setTotalPages(typeof json.data.totalPages === "number" ? Math.max(1, json.data.totalPages) : 1);
      } catch (err: unknown) {
        if (isCancelled) return;
        console.error("[fetchProducts]", err);
        setApiError(err instanceof Error ? err.message : "Unable to load medicines");
        setProducts([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      if (!isCancelled) {
        loadProducts();
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [searchInput, queryParam, currentPage, itemsPerPage, reloadKey]);

  // Authentication check & initial cart fetch
  useEffect(() => {
    let isCancelled = false;

    // Check user auth
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
        }
        return res.json();
      })
      .catch(() => {});

    // Fetch real cart count
    const fetchCartCount = () => {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((json) => {
          if (!isCancelled && json.success && json.data && Array.isArray(json.data.items)) {
            const totalQty = json.data.items.reduce(
              (sum: number, item: { quantity?: number }) => sum + (item.quantity || 1),
              0
            );
            setCartCount(totalQty);
          }
        })
        .catch(() => {});
    };

    fetchCartCount();

    // Listen to external cart update events
    const handleCartSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === "number") {
        setCartCount(customEvent.detail.count);
      } else {
        fetchCartCount();
      }
    };
    window.addEventListener("pharmaloop_cart_updated", handleCartSync);

    return () => {
      isCancelled = true;
      window.removeEventListener("pharmaloop_cart_updated", handleCartSync);
    };
  }, [router]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    const newUrl = search.trim()
      ? `/dashboard/medicines?search=${encodeURIComponent(search.trim())}`
      : `/dashboard/medicines`;
    router.push(newUrl, { scroll: false });
  };

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  // Filter & Sort
  const displayProducts = useMemo(() => {
    let list = [...products];

    // Filter by Category
    if (activeCategory !== "all" && activeCategory !== "more") {
      list = list.filter(
        (p) =>
          p.categorySlug === activeCategory ||
          p.secondaryCategorySlug === activeCategory
      );
    }

    // Sort
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, activeCategory, sortBy]);

  // Add to cart handler with real backend ID
  const handleAddToCart = async (product: CustomerMedicine) => {
    if (addingId) return; // Prevent duplicate clicks
    setAddingId(product.id);

    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        const nextCount = cartCount + 1;
        setCartCount(nextCount);

        // Dispatch real-time event for DashboardHeader
        window.dispatchEvent(
          new CustomEvent("pharmaloop_cart_updated", { detail: { count: nextCount } })
        );
        window.dispatchEvent(new Event("pharmaloop_cart_updated"));

        showToast(`Added ${product.name} to cart!`, "success");
      } else {
        const errorMsg = json?.error || "Failed to add to cart";
        showToast(errorMsg, "error");
      }
    } catch {
      showToast("Network error. Could not add medicine to cart.", "error");
    } finally {
      setAddingId(null);
    }
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const updated = !prev[id];
      showToast(updated ? "Added to wishlist" : "Removed from wishlist", "success");
      return { ...prev, [id]: updated };
    });
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 page-entrance">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl transition-all animate-bounce ${
            toastMessage.type === "error" ? "bg-rose-600" : "bg-[#1b5e3b]"
          }`}
        >
          <span>{toastMessage.type === "error" ? "✕" : "✓"}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Link href="/dashboard" className="hover:text-[#1b5e3b] transition-colors">
          Dashboard
        </Link>
        <span className="text-slate-300">&rsaquo;</span>
        <span className="text-slate-800 font-semibold">Medicines</span>
      </div>

      {/* Page Header + Hero Banner Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Title, Subtitle, and 4 Mini Trust Badges */}
        <div className="lg:col-span-7 space-y-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Medicines
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
              Find the medicines and healthcare products you need.
            </p>
          </div>

          {/* 4 Mini Trust Badges matching reference design */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] text-sm">
                🛡️
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Trusted Brands</p>
                <p className="text-[10px] text-slate-400">100% genuine products</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] text-sm">
                🚚
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Fast Delivery</p>
                <p className="text-[10px] text-slate-400">At your doorstep</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fffbeb] text-amber-600 text-sm">
                🏷️
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Best Prices</p>
                <p className="text-[10px] text-slate-400">Great offers &amp; discounts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eff6ff] text-blue-600 text-sm">
                🎧
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">24/7 Support</p>
                <p className="text-[10px] text-slate-400">We&apos;re here for you</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Promo Banner Card ("Better Health Starts Here") */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#e8f5ec] via-[#ebf7ee] to-[#e4f4e8] border border-[#d2edd8] p-5 sm:p-6 flex items-center justify-between shadow-xs">
            <div className="relative z-10 max-w-[210px]">
              <h3 className="text-base sm:text-lg font-black text-[#1b5e3b] italic tracking-tight font-serif leading-snug">
                Better Health<br />
                Starts Here
              </h3>
              <p className="mt-1 text-[11px] text-slate-600 font-medium leading-relaxed">
                Quality medicines. Healthier tomorrows. 💚
              </p>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("medicines-catalog-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors cursor-pointer"
              >
                <span>Shop Now</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* Glossy Medicine Bottle Illustration + Calligraphic Note */}
            <div className="relative flex items-center gap-2">
              <div className="relative h-22 w-24 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md" fill="none">
                  {/* Mint leaves background */}
                  <ellipse cx="26" cy="38" rx="16" ry="24" transform="rotate(-30 26 38)" fill="#a7f3d0" fillOpacity="0.8" />
                  <ellipse cx="74" cy="40" rx="15" ry="22" transform="rotate(35 74 40)" fill="#6ee7b7" fillOpacity="0.75" />
                  {/* Bottle body */}
                  <rect x="34" y="26" width="40" height="56" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  <rect x="40" y="16" width="28" height="13" rx="3" fill="#1b5e3b" />
                  {/* White Cross inside green square */}
                  <rect x="44" y="42" width="20" height="20" rx="5" fill="#10b981" />
                  <path d="M54 47v10M49 52h10" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
                </svg>
              </div>

              <div className="hidden sm:flex flex-col text-right text-[10px] font-semibold text-[#1b5e3b] leading-tight select-none italic font-serif opacity-90">
                <span>Care</span>
                <span>Today</span>
                <span>for a</span>
                <span>Healthier</span>
                <span>Tomorrow 💚</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input & Cart Summary Row */}
      <div id="medicines-catalog-section" className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center pt-2">
        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="md:col-span-8 lg:col-span-9 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search medicines, health products, brands..."
              className="w-full rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/90 py-2.5 pl-10 pr-26 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-500/15 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-[#1b5e3b] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] active:scale-[0.98] transition-all cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Adjacent Cart Box */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="glass-card rounded-2xl p-2.5 px-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5ec] text-[#1b5e3b] border border-emerald-100/60 shadow-xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 leading-none">Your Cart</p>
                <p className="text-xs font-black text-slate-900 mt-0.5">{cartCount} items</p>
              </div>
            </div>

            <Link
              href="/cart"
              className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xs px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#1b5e3b] active:scale-[0.98] transition-all flex items-center gap-1 shadow-2xs"
            >
              <span>View Cart</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => {
                setActiveCategory(cat.slug);
                setCurrentPage(1);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[#1b5e3b] text-white shadow-xs ring-2 ring-emerald-600/25"
                  : "bg-white/80 backdrop-blur-xs text-slate-600 border border-slate-200/80 hover:bg-white hover:text-slate-900 shadow-2xs"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Count & Sort Dropdown */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <p className="font-semibold text-slate-600">
          Showing <span className="font-bold text-slate-900">{totalItems}</span> products
        </p>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as "recommended" | "price_asc" | "price_desc" | "name_asc");
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-xs py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-500/15 focus:outline-none cursor-pointer transition-all"
          >
            <option value="recommended">Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A–Z</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-2xs animate-pulse flex flex-col justify-between"
            >
              <div>
                <div className="h-4 w-16 bg-slate-200 rounded-full mb-3" />
                <div className="h-36 w-full bg-slate-100 rounded-2xl mb-3" />
                <div className="h-4 w-3/4 bg-slate-200 rounded-md mb-1.5" />
                <div className="h-3 w-1/2 bg-slate-100 rounded-md mb-2" />
                <div className="h-4 w-20 bg-slate-200 rounded-md mb-3" />
              </div>
              <div className="h-9 w-full bg-slate-100 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : apiError ? (
        /* API Error State with Retry */
        <div className="rounded-[20px] border border-rose-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl mb-3">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load medicines</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {apiError}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-xl bg-[#1b5e3b] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : displayProducts.length === 0 ? (
        /* Empty State */
        <div className="rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl mb-3">
            🔍
          </div>
          <h3 className="text-base font-bold text-slate-900">No medicines found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            We couldn&apos;t find any products matching &quot;{search}&quot;. Try adjusting your keywords or clearing category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setActiveCategory("all");
              setCurrentPage(1);
              router.push("/dashboard/medicines");
            }}
            className="mt-4 rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* 4-Column Real Product Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {displayProducts.map((product) => {
            const isWishlisted = !!wishlist[product.id];
            const isAdding = addingId === product.id;

            return (
              <div
                key={product.id}
                className="group glass-card glass-card-interactive rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges & Wishlist Heart */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      {product.badgeType === "discount" && product.discount && (
                        <span className="rounded-full bg-[#fff1f2] px-2.5 py-0.5 text-[10px] font-bold text-[#e11d48] border border-rose-100 shadow-2xs">
                          {product.discount}
                        </span>
                      )}
                      {product.badgeType === "popular" && (
                        <span className="rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-[10px] font-bold text-[#059669] border border-emerald-100 shadow-2xs">
                          Popular
                        </span>
                      )}
                      {product.badgeType === "prescription" && (
                        <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[10px] font-bold text-[#2563eb] border border-blue-100 flex items-center gap-1 shadow-2xs">
                          <span className="text-[11px]">ⓘ</span> Prescription Required
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(product.id)}
                      aria-label="Toggle wishlist"
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                    >
                      <svg
                        className={`h-4 w-4 ${
                          isWishlisted ? "fill-rose-500 text-rose-500" : "fill-none stroke-current"
                        }`}
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Product Visual with pastel background & subtle zoom */}
                  <div className="overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]">
                    <MedicineCardVisual type={product.imageType} />
                  </div>

                  {/* Title & Details */}
                  <div className="mt-3 text-left">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1b5e3b] transition-colors leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                      {product.generic}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                        {product.category}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                      {product.packaging}
                    </p>

                    {/* Price row */}
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-base font-black text-slate-900">
                        ₹{product.price}
                      </span>
                      {product.mrp && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{product.mrp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100/80">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={isAdding || !product.inStock}
                    className="flex-1 rounded-xl bg-[#1b5e3b] py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isAdding ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : !product.inStock ? (
                      <span>Out of Stock</span>
                    ) : (
                      <>
                        <span>Add to Cart</span>
                        <span className="text-[11px]">🛒</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/products/${product.id}`}
                    className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xs py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#1b5e3b] active:scale-[0.98] transition-all text-center shadow-2xs"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            &lsaquo;
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#1b5e3b] text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            &rsaquo;
          </button>
        </div>
      )}

      {/* Bottom Trust/Feature Cards (4 in a row) */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Fast Delivery */}
        <div className="rounded-2xl glass-card glass-card-interactive p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f5ec] text-[#1b5e3b] shrink-0 text-lg border border-emerald-100/60 shadow-xs">
            🚚
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Fast Delivery</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight font-normal">
              Get your medicines delivered at your doorstep
            </p>
          </div>
        </div>

        {/* Card 2: Genuine Products */}
        <div className="rounded-2xl glass-card glass-card-interactive p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f5ec] text-[#1b5e3b] shrink-0 text-lg border border-emerald-100/60 shadow-xs">
            🛡️
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Genuine Products</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight font-normal">
              100% authentic &amp; quality assured
            </p>
          </div>
        </div>

        {/* Card 3: Best Prices */}
        <div className="rounded-2xl glass-card glass-card-interactive p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fef9c3] text-amber-700 shrink-0 text-lg font-black border border-amber-200/60 shadow-xs">
            %
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Best Prices</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight font-normal">
              Great discounts and offers
            </p>
          </div>
        </div>

        {/* Card 4: 24/7 Support */}
        <div className="rounded-2xl glass-card glass-card-interactive p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0f2fe] text-sky-600 shrink-0 text-lg border border-sky-100/60 shadow-xs">
            🎧
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">24/7 Support</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight font-normal">
              We&apos;re here for your health journey
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerMedicinesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-slate-200 rounded-md" />
          <div className="h-10 w-64 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-72 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <CustomerMedicinesInner />
    </Suspense>
  );
}
