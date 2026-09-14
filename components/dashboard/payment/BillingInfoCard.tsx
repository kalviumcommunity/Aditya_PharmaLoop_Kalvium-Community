"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Address {
  id: string;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone?: string | null;
}

interface BillingInfoCardProps {
  selectedAddressId?: string;
  onSelectAddress?: (addressId: string) => void;
  name?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
}

export default function BillingInfoCard({
  selectedAddressId,
  onSelectAddress,
  name,
  phone,
  email,
}: BillingInfoCardProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch User
        if (!name || !email) {
          try {
            const userRes = await fetch("/api/auth/me");
            if (userRes.ok) {
              const userJson = await userRes.json();
              if (!isCancelled && userJson.success && userJson.data) {
                setUser(userJson.data);
              }
            }
          } catch {}
        }

        // Fetch Addresses from PostgreSQL
        try {
          const addrRes = await fetch("/api/addresses");
          if (addrRes.ok) {
            const addrJson = await addrRes.json();
            if (!isCancelled && addrJson.success && Array.isArray(addrJson.data)) {
              setAddresses(addrJson.data);
              if (addrJson.data.length > 0 && !selectedAddressId && onSelectAddress) {
                onSelectAddress(addrJson.data[0].id);
              }
            }
          }
        } catch {}
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [name, email, selectedAddressId, onSelectAddress]);

  const fullName = name || user?.name || "Recipient";
  const userPhone = phone || user?.phone || "";
  const userEmail = email || user?.email || "";

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs space-y-5">
      <div>
        <h2 className="text-sm sm:text-base font-bold text-slate-900">
          Delivery &amp; Billing Information
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Select the delivery address where refills will be dispatched.
        </p>
      </div>

      {/* Recipient User Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-3">
          <span className="text-[10px] font-medium text-slate-400 block">Recipient</span>
          <span className="font-bold text-slate-800 block mt-0.5 truncate">{fullName}</span>
        </div>
        <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-3">
          <span className="text-[10px] font-medium text-slate-400 block">Phone</span>
          <span className="font-bold text-slate-800 block mt-0.5 truncate">
            {userPhone || "Not provided"}
          </span>
        </div>
        <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-3">
          <span className="text-[10px] font-medium text-slate-400 block">Email</span>
          <span className="font-bold text-slate-800 block mt-0.5 truncate">{userEmail}</span>
        </div>
      </div>

      {/* Saved Delivery Addresses */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">
            Delivery Address *
          </label>
          <Link
            href="/address-book"
            className="text-[11px] font-bold text-[#1b5e3b] hover:underline"
          >
            Manage Addresses &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="h-16 bg-slate-50 rounded-xl animate-pulse" />
        ) : addresses.length === 0 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800">
            <p className="font-semibold">No saved addresses found.</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Please add a delivery address in your Address Book before confirming your subscription.
            </p>
            <Link
              href="/address-book"
              className="inline-block mt-2 font-bold text-[#1b5e3b] underline"
            >
              + Add Address Now
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => onSelectAddress && onSelectAddress(addr.id)}
                  className={`rounded-xl p-3.5 border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? "border-2 border-[#1b5e3b] bg-[#f4fbf6] shadow-2xs"
                      : "border-slate-200 bg-white hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? "border-[#1b5e3b] bg-white" : "border-slate-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-[#1b5e3b]" />
                      )}
                    </div>

                    <div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
