"use client";

import React, { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import RefillProgressStepper from "@/components/dashboard/RefillProgressStepper";
import PaymentMethodCard from "@/components/dashboard/payment/PaymentMethodCard";
import BillingInfoCard from "@/components/dashboard/payment/BillingInfoCard";
import OrderSummaryCard from "@/components/dashboard/payment/OrderSummaryCard";

interface SubscriptionItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: string | number;
  };
}

interface SubscriptionData {
  id: string;
  addressId?: string;
  frequency: string;
  nextRefillDate: string;
  refillTime: string;
  address?: {
    id?: string;
    postalCode: string;
  } | null;
  items: SubscriptionItem[];
}

interface ProductData {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
}

interface PaymentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PaymentPage({ params }: PaymentPageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;
  const searchParams = useSearchParams();

  const queryProductId = searchParams.get("productId");
  const queryQty = searchParams.get("qty");
  const queryFreq = searchParams.get("freq");
  const queryDate = searchParams.get("date");
  const queryTime = searchParams.get("time");

  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);

        const targetProductId = queryProductId || rawId;

        // 1. Try to fetch as product
        let foundProduct: ProductData | null = null;
        try {
          const prodRes = await fetch(`/api/products/${targetProductId}`);
          if (prodRes.ok) {
            const prodJson = await prodRes.json();
            if (prodJson.success && prodJson.data) {
              foundProduct = prodJson.data;
            }
          }
        } catch {}

        // 2. If not product, try to fetch as subscription
        if (!foundProduct) {
          try {
            const subRes = await fetch(`/api/subscriptions/${rawId}`);
            if (subRes.ok) {
              const subJson = await subRes.json();
              if (subJson.success && subJson.data) {
                if (!isCancelled) {
                  setSub(subJson.data);
                  if (subJson.data.addressId) {
                    setSelectedAddressId(subJson.data.addressId);
                  }
                }
                const firstItem = subJson.data.items?.[0];
                if (firstItem?.product) {
                  foundProduct = firstItem.product;
                }
              }
            }
          } catch {}
        }

        if (!isCancelled && foundProduct) {
          setProduct(foundProduct);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [rawId, queryProductId]);

  const primaryItem = sub?.items?.[0];
  const effectiveProductId = product?.id || primaryItem?.productId || queryProductId || rawId;
  const medicineName = product?.name || primaryItem?.product?.name || "Refill Pack";
  const medicineDesc = product?.description || primaryItem?.product?.description || undefined;
  const unitPrice = product?.price || primaryItem?.product?.price || 35.0;
  const quantity = queryQty ? Math.max(1, parseInt(queryQty, 10)) : (primaryItem?.quantity || 1);
  const rawFrequency = queryFreq || sub?.frequency || "WEEKLY";
  const refillTime = queryTime || sub?.refillTime || "09:00";
  const startDateISO = queryDate || sub?.nextRefillDate || undefined;

  const startDateFormatted = startDateISO
    ? new Date(startDateISO).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  const formatFrequency = (freq?: string) => {
    if (!freq) return "Weekly";
    const upper = freq.toUpperCase();
    if (upper.includes("BI")) return "Bi-Weekly";
    if (upper.includes("MONTH")) return "Monthly";
    return "Weekly";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Payment &amp; Auto-Pay
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Review your refill schedule, choose delivery address, and confirm subscription.
          </p>
        </div>

        <div>
          <RefillProgressStepper currentStep={2} entityId={effectiveProductId} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-48 bg-white rounded-2xl border border-slate-100 p-6" />
            <div className="h-56 bg-white rounded-2xl border border-slate-100 p-6" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-96 bg-white rounded-2xl border border-slate-100 p-6" />
          </div>
        </div>
      ) : (
        /* Main 2-Column Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Payment Method & Billing Information */}
          <div className="lg:col-span-7 space-y-6">
            <PaymentMethodCard />
            <BillingInfoCard
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
              postalCode={sub?.address?.postalCode}
            />
          </div>

          {/* Right Column: Order Summary, Security Notice, & Confirmation */}
          <div className="lg:col-span-5">
            <OrderSummaryCard
              subscriptionId={sub?.id}
              productId={effectiveProductId}
              addressId={selectedAddressId}
              quantity={quantity}
              medicineName={medicineName}
              description={medicineDesc}
              frequency={formatFrequency(rawFrequency)}
              startDate={startDateFormatted}
              startDateISO={startDateISO}
              deliveryTime={refillTime}
              price={unitPrice}
            />
          </div>
        </div>
      )}
    </div>
  );
}
