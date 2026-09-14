"use client";

import React, { useState, useEffect, useCallback } from "react";

interface AddressItem {
  id: string;
  userId: string;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [label, setLabel] = useState<string>("Home");
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [country, setCountry] = useState<string>("India");

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/addresses");
      if (!res.ok) throw new Error("Failed to fetch addresses");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAddresses(json.data);
      }
    } catch (err: unknown) {
      console.error("[AddressBook] Error fetching addresses:", err);
      setError("Unable to load addresses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    fetch("/api/addresses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch addresses");
        return res.json();
      })
      .then((json) => {
        if (!isCancelled && json.success && Array.isArray(json.data)) {
          setAddresses(json.data);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("[AddressBook] Error fetching addresses:", err);
          setError("Unable to load addresses. Please try again.");
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && json.data) {
          setUser(json.data);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setLabel("Home");
    setStreetAddress("");
    setCity("");
    setState("");
    setPostalCode("");
    setCountry("India");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addr: AddressItem) => {
    setEditingAddress(addr);
    setLabel(addr.label || "Home");
    setStreetAddress(addr.address);
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setCountry(addr.country || "India");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!streetAddress.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setFormError("Please fill in all required address fields.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingAddress) {
        // Edit existing address
        const res = await fetch(`/api/addresses/${editingAddress.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            address: streetAddress.trim(),
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country: country.trim() || "India",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to update address");
        }
      } else {
        // Create new address
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            address: streetAddress.trim(),
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country: country.trim() || "India",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to add address");
        }
      }

      setIsModalOpen(false);
      await fetchAddresses();
    } catch (err: unknown) {
      console.error("[AddressBook] Save error:", err);
      setFormError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this delivery address?")) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || json.message || "Failed to delete address");
      }
      setError(null);
      await fetchAddresses();
    } catch (err: unknown) {
      console.error("[AddressBook] Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete address");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 page-entrance">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Address Book
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Manage your saved delivery addresses for automated refills and express shipments.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154a2e] transition-all self-start sm:self-auto flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <span>&#43;</span>
          <span>Add New Address</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="h-5 w-24 bg-slate-100 rounded-sm" />
              <div className="h-4 w-40 bg-slate-200 rounded-sm" />
              <div className="h-3 w-56 bg-slate-100 rounded-sm" />
              <div className="h-3 w-32 bg-slate-100 rounded-sm" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-xs font-medium text-rose-500">{error}</p>
          <button
            type="button"
            onClick={fetchAddresses}
            className="mt-3 text-xs font-bold text-[#1b5e3b] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-100/60 text-xl mb-3 shadow-2xs">
            📍
          </div>
          <h3 className="text-sm font-bold text-slate-900">No saved addresses yet</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Save a delivery address to ensure seamless checkout and prompt prescription deliveries.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#1b5e3b] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#154a2e] transition-all cursor-pointer active:scale-[0.98]"
          >
            &#43; Add Your First Address
          </button>
        </div>
      ) : (
        /* Addresses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map((addr) => {
            const type = addr.label || "Home";
            const icon = type.toLowerCase() === "office" ? "🏢" : "🏠";

            return (
              <div
                key={addr.id}
                className="glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100/80">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50/80 border border-emerald-100/60 text-sm shadow-2xs">
                        {icon}
                      </span>
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {type}
                      </span>
                    </div>
                  </div>

                  {/* Address Body */}
                  <div className="pt-3.5 space-y-1 text-xs">
                    <p className="font-bold text-slate-900 text-sm">
                      {user?.name || addr.label || "Saved Address"}
                    </p>
                    <p className="text-slate-600 leading-relaxed">{addr.address}</p>
                    <p className="text-slate-600">
                      {addr.city}, {addr.state} &ndash; {addr.postalCode}
                    </p>
                    {user?.phone ? (
                      <p className="text-slate-500 pt-2 font-medium">
                        Phone: {user.phone}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100/80 flex items-center justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(addr)}
                    className="font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl modal-animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
              <h2 className="text-base font-bold text-slate-900">
                {editingAddress ? "Edit Delivery Address" : "Add New Delivery Address"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl bg-rose-50/90 border border-rose-100/80 p-2.5 text-xs text-rose-600 font-medium backdrop-blur-xs">
                  {formError}
                </div>
              )}

              {/* Label selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Address Type
                </label>
                <div className="flex gap-2">
                  {["Home", "Office", "Other"].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                        label.toLowerCase() === l.toLowerCase()
                          ? "bg-[#1b5e3b] text-white shadow-xs"
                          : "glass-card text-slate-700 hover:bg-white"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street / Flat / Colony *
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Lotus Heights, Indiranagar"
                  required
                  className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b5e3b]"
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b5e3b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b5e3b]"
                  />
                </div>
              </div>

              {/* Postal Code and Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 560038"
                    required
                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b5e3b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b5e3b]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl glass-card px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154a2e] transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {submitting ? "Saving..." : editingAddress ? "Update Address" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
