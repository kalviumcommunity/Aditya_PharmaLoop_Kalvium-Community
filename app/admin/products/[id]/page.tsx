"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import ErrorState from "@/components/admin/ErrorState";

interface ProductDetail {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  stock: number;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Product not found");
        if (res.status === 403) throw new Error("Admin authorization required");
        throw new Error("Failed to load product details");
      }

      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data;
        setProduct(p);
        setName(p.name);
        setDescription(p.description || "");
        setPrice(p.price.toString());
        setStock(p.stock.toString());
        setImageUrl(p.imageUrl || "");
        setIsActive(p.isActive);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching product");
    }
  }, [productId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        await fetchProduct();
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [fetchProduct]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);

    if (!name.trim()) {
      setFeedback({ type: "error", text: "Product name is required." });
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid price greater than 0." });
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFeedback({ type: "error", text: "Please enter a valid non-negative stock quantity." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          price: priceNum,
          stock: stockNum,
          imageUrl: imageUrl.trim() || null,
          isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update product");

      setProduct(json.data);
      setFeedback({
        type: "success",
        text: `Product "${json.data.name}" updated successfully!`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update product",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        <LoadingSkeleton variant="detail" rows={6} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        <ErrorState
          error={error || "The requested medicine could not be found."}
          onRetry={fetchProduct}
          backHref="/admin/products"
          backLabel="Return to Products Catalog"
        />
      </div>
    );
  }

  const stockNum = parseInt(stock || "0", 10);
  const stockLabel = stockNum === 0 ? "OUT OF STOCK" : stockNum <= 20 ? "LOW STOCK" : "IN STOCK";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <AdminHeader
        title={`Edit: ${product.name}`}
        subtitle="Manage product description, pricing, inventory stock, and availability."
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: product.name }]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              &larr; Back to Catalog
            </Link>
          </div>
        }
      />

      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 ml-3">
            ✕
          </button>
        </div>
      )}

      {/* Overview Stat Badges */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Inventory Status:</span>
          <StatusBadge status={stockLabel} type="STOCK" />
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {isActive ? "✓ Active in Store" : "✕ Deactivated"}
          </span>
        </div>

        <div className="text-xs text-slate-400 dark:text-zinc-500">
          Product ID: <span className="font-mono text-slate-600 dark:text-zinc-300">{product.id}</span>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
            General Information
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dosage form, packaging, usage..."
                className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
            Pricing &amp; Inventory Management
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Products with stock &le; 20 units generate low stock reporting warnings.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-[#1b5e3b] focus:ring-[#1b5e3b]"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Active &amp; purchasable by customers in storefront
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#1b5e3b] hover:bg-[#154a2e] text-white px-6 py-2.5 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Product Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
