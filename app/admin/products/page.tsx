"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";
import SearchFilterBar from "@/components/admin/SearchFilterBar";
import LoadingSkeleton from "@/components/admin/LoadingSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import ErrorState from "@/components/admin/ErrorState";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  stock: number;
  isActive: boolean;
  imageUrl?: string | null;
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lowStockFilter, setLowStockFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "100",
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Toggling state: productId -> boolean
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (lowStockFilter === "LOW_STOCK") params.set("lowStock", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Admin authorization required (403)");
        throw new Error("Failed to load products");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setProducts(json.data.items);
        setTotalCount(json.data.pagination.totalCount);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching products");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, lowStockFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal]);

  const handleToggleActive = async (product: Product) => {
    setToggling((prev) => ({ ...prev, [product.id]: true }));
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update product");

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p))
      );
      setFeedback({
        type: "success",
        text: `Product "${product.name}" is now ${!product.isActive ? "active" : "deactivated"}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setToggling((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = parseFloat(formData.price);
    const stockNum = parseInt(formData.stock, 10);

    if (!formData.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Please enter a valid price greater than 0.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError("Please enter a valid stock quantity (0 or greater).");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: priceNum,
          stock: stockNum,
          isActive: formData.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create product");

      setShowAddModal(false);
      setFormData({ name: "", description: "", price: "", stock: "100", isActive: true });
      setFeedback({
        type: "success",
        text: `Medicine "${json.data.name}" added to platform catalog successfully!`,
      });
      fetchProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setFormSubmitting(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <AdminHeader
        title="Products &amp; Inventory"
        subtitle="Healthcare product catalog, stock inventory tracking, and medicine availability."
        breadcrumbs={[{ label: "Products" }]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-[#1b5e3b] hover:bg-[#154a2e] text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Add Medicine</span>
            </button>
            <button
              type="button"
              onClick={fetchProducts}
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

      {error && products.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchProducts}
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
        searchPlaceholder="Search medicines by name or description..."
        filters={[
          {
            key: "status",
            label: "Filter by status",
            value: statusFilter,
            options: [
              { value: "ALL", label: "All Statuses" },
              { value: "ACTIVE", label: "Active Only" },
              { value: "INACTIVE", label: "Inactive Only" },
            ],
            onChange: (st) => {
              setStatusFilter(st);
              setPage(1);
            },
          },
          {
            key: "lowStock",
            label: "Filter stock",
            value: lowStockFilter,
            options: [
              { value: "ALL", label: "All Inventory" },
              { value: "LOW_STOCK", label: "Low Stock Warnings (≤ 20)" },
            ],
            onChange: (ls) => {
              setLowStockFilter(ls);
              setPage(1);
            },
          },
        ]}
        onClear={() => {
          setSearchQuery("");
          setStatusFilter("ALL");
          setLowStockFilter("ALL");
          setPage(1);
        }}
      />

      {error && products.length === 0 ? (
        <ErrorState error={error} onRetry={fetchProducts} />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
          {loading && products.length === 0 ? (
            <LoadingSkeleton rows={8} />
          ) : products.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="💊"
              title="No Products Found"
              description="No healthcare products matched your filter criteria."
              action={
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-xl bg-[#1b5e3b] text-white px-4 py-2 text-xs font-semibold shadow-xs"
                >
                  Add Your First Medicine
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Medicine Product</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Inventory Status</th>
                  <th className="py-3 px-4">Storefront Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {products.map((prod) => {
                  const isLowStock = prod.stock <= 20 && prod.stock > 0;
                  const isOutOfStock = prod.stock === 0;
                  const stockLabel = isOutOfStock
                    ? "OUT OF STOCK"
                    : isLowStock
                    ? "LOW STOCK"
                    : "IN STOCK";

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <Link
                          href={`/admin/products/${prod.id}`}
                          className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                          {prod.name}
                        </Link>
                        {prod.description && (
                          <div className="text-[11px] font-normal text-slate-400 dark:text-zinc-500 truncate max-w-sm">
                            {prod.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(prod.price)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                        {prod.stock} units
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={stockLabel} type="STOCK" />
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(prod)}
                          disabled={toggling[prod.id]}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            prod.isActive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{prod.isActive ? "Active in Store" : "Deactivated"}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/products/${prod.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
                        >
                          Edit &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-product-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 id="modal-product-title" className="text-base font-bold text-slate-900 dark:text-white">
                Add New Medicine Product
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 650mg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. For pain relief and temperature reduction"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="35.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#1b5e3b]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-active-checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#1b5e3b] focus:ring-[#1b5e3b]"
                />
                <label htmlFor="modal-active-checkbox" className="font-semibold text-slate-700 dark:text-zinc-300">
                  Make available immediately in customer storefront
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-zinc-700 px-4 py-2 font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-[#1b5e3b] hover:bg-[#154a2e] text-white px-4 py-2 font-semibold shadow-xs disabled:opacity-50"
                >
                  {formSubmitting ? "Creating..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
