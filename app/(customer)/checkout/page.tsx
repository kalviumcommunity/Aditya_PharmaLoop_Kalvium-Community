"use client";

import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FrequencySelector, {
  SupportedFrequency,
} from "@/components/dashboard/FrequencySelector";
import StartDateCalendar from "@/components/dashboard/StartDateCalendar";
import RefillTimeSelector from "@/components/dashboard/RefillTimeSelector";
import UpcomingRefillPreview from "@/components/dashboard/UpcomingRefillPreview";

// Hydration safety mount check
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface Address {
  id: string;
  userId?: string;
  label?: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

interface CartProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  stock?: number;
  dosage?: string;
  packaging?: string;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
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
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Medicine Thumbnail Visuals matching reference design
 */
function MedicineThumbnail({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 p-1 border border-slate-200/80 overflow-hidden shadow-2xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  const lower = title.toLowerCase();

  // Crocin blue tablet strip
  if (
    lower.includes("crocin") ||
    lower.includes("paracetamol") ||
    lower.includes("dolo")
  ) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe]/60 border border-[#bae6fd] p-1 shadow-2xs">
        <div className="w-8 h-6 bg-white rounded-sm border border-sky-300 shadow-2xs flex flex-col justify-between p-0.5 overflow-hidden">
          <div className="h-1.5 bg-[#0284c7] -mx-0.5 -mt-0.5" />
          <div className="text-center">
            <span className="text-[6px] font-black text-[#0369a1] leading-none block">
              Crocin
            </span>
          </div>
          <div className="flex justify-between items-center px-0.5">
            <span className="h-1 w-1 rounded-full bg-rose-500" />
            <span className="h-1 w-1 rounded-full bg-sky-500" />
          </div>
        </div>
      </div>
    );
  }

  // Vitamin D3 yellow bottle
  if (
    lower.includes("vitamin") ||
    lower.includes("d3") ||
    lower.includes("omega")
  ) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fef9c3]/70 border border-[#fef08a] p-1 shadow-2xs">
        <div className="w-5 h-7 bg-amber-400 rounded-sm border border-amber-500/80 shadow-2xs flex flex-col items-center justify-between p-0.5">
          <div className="w-3.5 h-1 bg-white rounded-xs" />
          <div className="w-4 h-3 bg-white rounded-xs flex items-center justify-center">
            <span className="text-[5px] font-black text-amber-700 leading-none">
              D3
            </span>
          </div>
          <div className="w-2.5 h-0.5 bg-amber-600 rounded-full" />
        </div>
      </div>
    );
  }

  // Amoxicillin capsule pack
  if (
    lower.includes("amox") ||
    lower.includes("antibiotic") ||
    lower.includes("cipro")
  ) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] border border-slate-200 p-1 shadow-2xs">
        <div className="w-8 h-6 bg-white rounded-sm border border-slate-300 shadow-2xs flex flex-col justify-between p-0.5 overflow-hidden">
          <div className="h-1 bg-rose-500 -mx-0.5 -mt-0.5" />
          <div className="text-center">
            <span className="text-[6px] font-bold text-slate-700 leading-none block">
              Amox
            </span>
          </div>
          <div className="flex justify-center gap-0.5">
            <div className="h-1.5 w-3 rounded-full bg-gradient-to-r from-red-500 to-amber-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8fafc] border border-slate-200 text-base shadow-2xs">
      💊
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  // Data states
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form & selection states
  const [purchaseType, setPurchaseType] = useState<"one_time" | "auto_refill">(
    "one_time",
  );
  const [frequency, setFrequency] = useState<SupportedFrequency>("WEEKLY");
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [refillTime, setRefillTime] = useState<string>("09:00");
  const [deliverySpeed, setDeliverySpeed] = useState<"express" | "standard">(
    "express",
  );
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">(
    "online",
  );
  // Modals
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);

  // New address form state
  const [newAddressForm, setNewAddressForm] = useState({
    label: "Home",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Order submission state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Concurrent initial data fetching with authentication verification
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch User Profile & enforce authentication
        try {
          const userRes = await fetch("/api/auth/me");
          if (!userRes.ok) {
            if (!isCancelled) router.push("/login");
            return;
          }
          const userJson = await userRes.json();
          if (!isCancelled && userJson.success && userJson.data) {
            setUserProfile(userJson.data);
          } else if (!isCancelled) {
            router.push("/login");
            return;
          }
        } catch {
          if (!isCancelled) {
            router.push("/login");
            return;
          }
        }

        // Fetch Addresses from PostgreSQL
        let loadedAddresses: Address[] = [];
        try {
          const addrRes = await fetch("/api/addresses");
          const addrJson = await addrRes.json();
          if (
            !isCancelled &&
            addrJson.success &&
            Array.isArray(addrJson.data)
          ) {
            loadedAddresses = addrJson.data;
            setAddresses(loadedAddresses);
            if (loadedAddresses.length > 0) {
              setSelectedAddressId((prev) => {
                const found = loadedAddresses.some((a) => a.id === prev);
                return found ? prev : loadedAddresses[0].id;
              });
            } else {
              setSelectedAddressId("");
            }
          }
        } catch {}

        if (loadedAddresses.length === 0 && !isCancelled) {
          setAddresses([]);
          setSelectedAddressId("");
        }

        // Fetch Cart from PostgreSQL
        try {
          const cartRes = await fetch("/api/cart");
          const cartJson = await cartRes.json();
          if (
            !isCancelled &&
            cartJson.success &&
            cartJson.data &&
            Array.isArray(cartJson.data.items)
          ) {
            setCartItems(cartJson.data.items);
          } else if (!isCancelled) {
            setCartItems([]);
          }
        } catch {
          if (!isCancelled) {
            setCartItems([]);
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  // Active address: strictly resolves to an existing database address
  const activeAddress = useMemo(() => {
    const found = addresses.find((a) => a.id === selectedAddressId);
    return found || addresses[0] || null;
  }, [addresses, selectedAddressId]);

  // Order Summary calculations: 100% derived from authoritative cart items
  const itemsTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = Number(item.product.price) || 0;
      return acc + price * (item.quantity || 1);
    }, 0);
  }, [cartItems]);

  // Total payable matches backend calculation (itemsTotal)
  const totalPayable = itemsTotal;

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cartItems]);

  // Handle adding new address: strictly persists to PostgreSQL via POST /api/addresses
  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newAddressForm.address.trim() ||
      !newAddressForm.city.trim() ||
      !newAddressForm.postalCode.trim() ||
      !newAddressForm.state.trim()
    ) {
      setAddressError("Please fill out all required address fields.");
      return;
    }

    setIsSavingAddress(true);
    setAddressError(null);

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddressForm),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const newAddr = json.data as Address;

        // Refetch address list from database to ensure PostgreSQL truth
        try {
          const refetchRes = await fetch("/api/addresses");
          const refetchJson = await refetchRes.json();
          if (refetchJson.success && Array.isArray(refetchJson.data)) {
            setAddresses(refetchJson.data);
          } else {
            setAddresses((prev) => [newAddr, ...prev]);
          }
        } catch {
          setAddresses((prev) => [newAddr, ...prev]);
        }

        setSelectedAddressId(newAddr.id);
        setIsAddAddressModalOpen(false);
        setNewAddressForm({
          label: "Home",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
        });
        setToastMessage("Address added successfully!");
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setAddressError(
          json.error || "Failed to save address. Please try again.",
        );
      }
    } catch {
      setAddressError(
        "Unable to save address. Please check your connection and try again.",
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const openRazorpayCheckout = async (orderId: string) => {
    const orderRes = await fetch(`/api/payments/${orderId}/razorpay-order`, {
      method: "POST",
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok || !orderJson.success || !orderJson.data) {
      throw new Error(orderJson.error || "Unable to start Razorpay checkout");
    }

    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay)
      throw new Error("Unable to load Razorpay Checkout");
    const RazorpayCheckout = window.Razorpay;

    await new Promise<void>((resolve) => {
      const checkout = new RazorpayCheckout({
        key: orderJson.data.keyId,
        amount: orderJson.data.amount,
        currency: orderJson.data.currency,
        name: "PharmaLoop",
        description: "Medicine order payment",
        order_id: orderJson.data.razorpayOrderId,
        config: {
          display: {
            blocks: {
              upi: {
                name: "UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (response: Record<string, string>) => {
          const verifyRes = await fetch(`/api/payments/${orderId}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyJson = await verifyRes.json();
          if (!verifyRes.ok || !verifyJson.success) {
            setErrorMessage(verifyJson.error || "Payment verification failed.");
            router.push(`/orders/${orderId}`);
            resolve();
            return;
          }
          router.push(`/orders/${orderId}`);
          resolve();
        },
        modal: {
          ondismiss: () => {
            setErrorMessage(
              "Payment was cancelled. You can retry it from the order page.",
            );
            router.push(`/orders/${orderId}`);
            resolve();
          },
        },
        theme: { color: "#166534" },
      });
      checkout.on?.("payment.failed", async (response) => {
        const error = response.error as
          | { code?: string; description?: string }
          | undefined;
        await fetch(`/api/payments/${orderId}/failure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: error?.code,
            description: error?.description,
          }),
        });
        setErrorMessage(
          "Payment failed. You can retry it from the order page.",
        );
        resolve();
      });
      checkout.open();
    });
  };

  // Place Order handler: creates the local order, then starts server-created Razorpay Checkout.
  const handlePlaceOrder = async () => {
    if (!userProfile) {
      router.push("/login");
      return;
    }

    if (!activeAddress) {
      setErrorMessage("Please choose or add a delivery address.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("Your cart is empty. Please add medicines to continue.");
      return;
    }

    setIsPlacingOrder(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: activeAddress.id,
          paymentMethod: paymentMethod === "cod" ? "COD" : "ONLINE",
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.data && json.data.id) {
        if (paymentMethod === "cod") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("pharmaloop_cart_updated", {
                detail: { count: 0 },
              }),
            );
          }
          router.push(`/orders/${json.data.id}`);
        } else {
          await openRazorpayCheckout(json.data.id);
        }
        return;
      }

      // If backend returns an error
      if (json.error) {
        if (json.error.includes("empty cart")) {
          setErrorMessage(
            "To complete order placement, add medicines to your active cart first.",
          );
        } else {
          setErrorMessage(json.error);
        }
      } else {
        setErrorMessage("Unable to place order. Please try again.");
      }
    } catch {
      setErrorMessage(
        "Unable to connect to order server. Please check your network and try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Handle Auto-Refill subscription creation via POST /api/subscriptions
  const handleStartAutoRefill = async () => {
    if (isPlacingOrder) return;

    if (!userProfile) {
      router.push("/login");
      return;
    }

    if (!activeAddress) {
      setErrorMessage("Please choose or add a delivery address.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("Your cart is empty. Please add medicines to continue.");
      return;
    }

    // Combine startDate with refillTime
    const [hours, minutes] = refillTime.split(":").map(Number);
    const targetDate = new Date(startDate);
    targetDate.setHours(hours || 0, minutes || 0, 0, 0);

    if (targetDate.getTime() <= Date.now()) {
      setErrorMessage("Please select a future refill date and time.");
      return;
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (targetDate.getTime() > oneYearFromNow.getTime()) {
      setErrorMessage(
        "Next refill date cannot be more than 1 year in the future.",
      );
      return;
    }

    setIsPlacingOrder(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: activeAddress.id,
          frequency,
          nextRefillDate: targetDate.toISOString(),
          refillTime,
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          clearCart: true,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success && json.data && json.data.id) {
        // Dispatch cart count reset event for DashboardHeader
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("pharmaloop_cart_updated", {
              detail: { count: 0 },
            }),
          );
        }
        router.push(`/subscriptions/${json.data.id}/success`);
        return;
      }

      // If backend returns an error
      if (json.error) {
        if (json.error === "PAST_DATE_NOT_ALLOWED") {
          setErrorMessage("Next refill date cannot be in the past.");
        } else if (json.error === "DATE_TOO_FAR_IN_FUTURE") {
          setErrorMessage(
            "Next refill date cannot be more than 1 year in the future.",
          );
        } else if (json.error.includes("empty cart")) {
          setErrorMessage(
            "To complete auto-refill setup, add medicines to your active cart first.",
          );
        } else {
          setErrorMessage(json.error);
        }
      } else {
        setErrorMessage("Unable to create subscription. Please try again.");
      }
    } catch {
      setErrorMessage(
        "Unable to connect to subscription server. Please check your network and try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-6 w-36 bg-slate-200 rounded-md" />
        <div className="h-10 w-64 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-5 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const customerName = userProfile?.name || "Recipient";
  const customerPhone = userProfile?.phone || "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 page-entrance">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/cart" className="hover:text-slate-800 transition-colors">
          Cart
        </Link>
        <span className="text-slate-300">›</span>
        <span className="text-slate-900 font-bold">Checkout</span>
      </div>

      {/* Header Row: Title & Safe/Secure Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            Checkout
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Confirm your delivery address and payment method to place your
            order.
          </p>
        </div>

        {/* Safe. Secure. Delivered. Banner */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#eef9f2] via-[#e8f7ed] to-[#dff3e6] border border-[#c8ebcf] px-5 py-3.5 shadow-2xs gap-4 max-w-md">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#0f5132] tracking-tight">
              Safe. Secure. Delivered.
            </h2>
            <p className="text-xs text-[#166534] font-medium mt-0.5">
              Your health is in safe hands. 💚
            </p>
          </div>

          {/* Shield & Medicine Bottle Graphic */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              className="h-11 w-11 text-emerald-600 drop-shadow-xs"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 4L8 10V22C8 32.5 14.8 42.3 24 45C33.2 42.3 40 32.5 40 22V10L24 4Z"
                fill="#16a34a"
                fillOpacity="0.88"
              />
              <path
                d="M24 7L11 12V22C11 31 16.5 39.5 24 42C31.5 39.5 37 31 37 22V12L24 7Z"
                fill="#22c55e"
              />
              <path
                d="M20.5 24.5L16.5 20.5L14 23L20.5 29.5L34 16L31.5 13.5L20.5 24.5Z"
                fill="white"
              />
            </svg>
            <div className="absolute -bottom-1 -right-1.5 h-6 w-5 bg-white rounded-xs border border-emerald-300 shadow-2xs flex flex-col items-center justify-between p-0.5">
              <div className="w-3 h-0.5 bg-emerald-600 rounded-full" />
              <span className="text-[6px] text-emerald-700 font-black">+</span>
              <div className="w-3 h-0.5 bg-emerald-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Delivery Address, Delivery Speed, Payment Method */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Delivery Address Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 text-sm border border-rose-100">
                  📍
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Delivery Address
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Choose where you want your order to be delivered.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddAddressModalOpen(true)}
                className="text-xs font-bold text-[#166534] hover:text-[#14532d] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>+</span>
                <span>Add New Address</span>
              </button>
            </div>

            {/* Address Selection Preview */}
            <div className="rounded-2xl border border-[#bbf7d0] bg-[#f4faf6]/80 p-4 sm:p-5 relative transition-all shadow-2xs">
              {activeAddress ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Radio indicator */}
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[#166534] bg-white">
                        <div className="h-2 w-2 rounded-full bg-[#166534]" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {customerName} ({activeAddress.label || "Address"})
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {activeAddress.address}, {activeAddress.city},{" "}
                          {activeAddress.state} - {activeAddress.postalCode}
                        </p>

                        {customerPhone && (
                          <p className="mt-1 text-[11px] text-slate-400 font-medium">
                            Phone: {customerPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-md bg-[#e2f3e8] px-2 py-0.5 text-[10px] font-bold text-[#166534] shadow-2xs">
                      Selected
                    </span>
                  </div>

                  {/* Change Address CTA */}
                  <div className="mt-3.5 pt-2 border-t border-[#d8eee0]/60 flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#166534] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <svg
                        className="h-3 w-3 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      <span>Change Address</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500 mb-2">
                    No delivery address found.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddAddressModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#166534] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#14532d] transition-all cursor-pointer"
                  >
                    + Add New Address
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Purchase Type Selection: One-Time Purchase vs Auto-Refill */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-sm border border-emerald-100/60">
                🔄
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  How would you like to receive your medicines?
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Choose between a one-time order or automated scheduled
                  refills.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Option 1: One-Time Purchase */}
              <div
                onClick={() => setPurchaseType("one_time")}
                className={`rounded-2xl p-4 border transition-all cursor-pointer relative ${
                  purchaseType === "one_time"
                    ? "border-2 border-[#166534] bg-[#f4faf6] shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 text-base shrink-0">
                      📦
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        One-Time Purchase
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Buy once · Standard delivery
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      purchaseType === "one_time"
                        ? "border-[#166534] bg-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {purchaseType === "one_time" && (
                      <div className="h-2 w-2 rounded-full bg-[#166534]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Auto-Refill */}
              <div
                onClick={() => {
                  setPurchaseType("auto_refill");
                  setPaymentMethod("online");
                }}
                className={`rounded-2xl p-4 border transition-all cursor-pointer relative ${
                  purchaseType === "auto_refill"
                    ? "border-2 border-[#166534] bg-[#f4faf6] shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold text-white tracking-wide shadow-2xs">
                  SAVE TIME &amp; NEVER RUN OUT
                </span>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-base shrink-0">
                      🔄
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Auto-Refill
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Automatically refill on your schedule
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      purchaseType === "auto_refill"
                        ? "border-[#166534] bg-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {purchaseType === "auto_refill" && (
                      <div className="h-2 w-2 rounded-full bg-[#166534]" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* When One-Time Purchase: Show Delivery Speed & Slot */}
          {purchaseType === "one_time" && (
            <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-sm border border-emerald-100/60">
                  🚚
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Delivery Speed &amp; Slot
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Choose a delivery speed preference for your order.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Express Delivery */}
                <div
                  onClick={() => setDeliverySpeed("express")}
                  className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between ${
                    deliverySpeed === "express"
                      ? "border-2 border-[#166534] bg-[#f4faf6] shadow-2xs"
                      : "border border-slate-200/80 bg-white/70 backdrop-blur-xs hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          deliverySpeed === "express"
                            ? "border-[#166534] bg-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {deliverySpeed === "express" && (
                          <div className="h-2 w-2 rounded-full bg-[#166534]" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-xs sm:text-sm font-bold ${
                              deliverySpeed === "express"
                                ? "text-[#166534]"
                                : "text-slate-800"
                            }`}
                          >
                            Express Delivery
                          </p>
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                            Fastest
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                          Delivered in 2 – 4 hours
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-600">
                        FREE
                      </span>
                      <span className="text-amber-500 text-xs">⚡</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-emerald-50/80 border border-emerald-100/60 py-1.5 px-2.5 text-center text-[10px] sm:text-[11px] font-bold text-[#166534]">
                    Recommended for urgent medicines
                  </div>
                </div>

                {/* Option 2: Standard Delivery */}
                <div
                  onClick={() => setDeliverySpeed("standard")}
                  className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between ${
                    deliverySpeed === "standard"
                      ? "border-2 border-[#166534] bg-[#f4faf6] shadow-2xs"
                      : "border border-slate-200/80 bg-white/70 backdrop-blur-xs hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          deliverySpeed === "standard"
                            ? "border-[#166534] bg-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {deliverySpeed === "standard" && (
                          <div className="h-2 w-2 rounded-full bg-[#166534]" />
                        )}
                      </div>

                      <div>
                        <p
                          className={`text-xs sm:text-sm font-bold ${
                            deliverySpeed === "standard"
                              ? "text-[#166534]"
                              : "text-slate-800"
                          }`}
                        >
                          Standard Delivery
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                          Standard courier shipping
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-600">
                        FREE
                      </span>
                      <span className="text-sky-600 text-xs">🚚</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-100/80 py-1.5 px-2.5 text-center text-[10px] sm:text-[11px] font-medium text-slate-600">
                    Reliable and convenient
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* When Auto-Refill: Show Refill Scheduler Components */}
          {purchaseType === "auto_refill" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StartDateCalendar
                  value={startDate}
                  onChange={setStartDate}
                  title="Next Refill Date"
                  subtitle="Select when your next automated refill should occur."
                />
                <div className="space-y-4">
                  <FrequencySelector
                    value={frequency}
                    onChange={setFrequency}
                    title="Refill Frequency"
                    subtitle="How often would you like to receive refills?"
                  />
                  <RefillTimeSelector
                    value={refillTime}
                    onChange={setRefillTime}
                    title="Preferred Refill Time"
                    subtitle="Choose your preferred delivery window."
                  />
                </div>
              </div>

              <UpcomingRefillPreview
                baseDate={startDate}
                frequency={frequency}
                refillTime={refillTime}
                title="Upcoming Refill Schedule Preview"
                subtitle="Here is how your future automated refills will be scheduled."
              />
            </div>
          )}

          {/* Payment choice; sensitive payment entry stays inside Razorpay Checkout. */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 text-sm border border-sky-100/60">
                💳
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Payment choice
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Online payment opens Razorpay after order review.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#f8fafc] border border-slate-200/80 p-4 space-y-1.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="checkout-payment-method"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                  className="mt-0.5 accent-[#166534]"
                />
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    Online Payment
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    UPI · Cards · Netbanking · Wallets
                  </span>
                </span>
              </label>
              {purchaseType === "one_time" && (
                <label className="flex items-start gap-3 cursor-pointer border-t border-slate-200 pt-3">
                  <input
                    type="radio"
                    name="checkout-payment-method"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="mt-0.5 accent-[#166534]"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-800">
                      Cash on Delivery
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Pay when your medicine is delivered
                    </span>
                  </span>
                </label>
              )}
              {purchaseType === "auto_refill" && (
                <p className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
                  Auto-Refill requires online payment through Razorpay Checkout.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Placement */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 sticky top-6">
            {/* Summary Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e2f3e8] text-[#166534] text-sm border border-emerald-200/60">
                  🔒
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Order Summary
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Review your items before placing the order.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200/60">
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Error notice if any */}
            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-3 divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <p>Your cart is empty.</p>
                  <Link
                    href="/dashboard/medicines"
                    className="mt-2 inline-block text-xs font-semibold text-[#166534] underline"
                  >
                    Browse medicines
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MedicineThumbnail
                        title={item.product.name}
                        imageUrl={item.product.imageUrl}
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.product.description ||
                            `${item.product.packaging || "Pack"} · ${item.product.dosage || ""}`}{" "}
                          × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs sm:text-sm font-bold text-slate-900 shrink-0">
                      ₹
                      {(
                        Number(item.product.price) * (item.quantity || 1)
                      ).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-slate-100/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Items Total</span>
                <span className="font-semibold text-slate-900">
                  ₹{itemsTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span className="font-semibold text-[#166534]">Free</span>
              </div>

              {purchaseType === "auto_refill" && (
                <>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Refill Frequency</span>
                    <span className="font-semibold text-slate-900">
                      {frequency === "WEEKLY"
                        ? "Weekly"
                        : frequency === "BIWEEKLY"
                          ? "Every 2 Weeks"
                          : "Monthly"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>First Refill</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at {refillTime}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Total Payable */}
            <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between">
              <div>
                <span className="text-sm sm:text-base font-bold text-slate-900 block">
                  {purchaseType === "auto_refill"
                    ? "Total per Refill"
                    : "Total Payable"}
                </span>
                {purchaseType === "auto_refill" && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    Billed per refill cycle
                  </span>
                )}
              </div>
              <span className="text-xl sm:text-2xl font-black text-[#166534]">
                ₹{totalPayable.toFixed(2)}
              </span>
            </div>

            {/* Place Order CTA Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={
                  purchaseType === "auto_refill"
                    ? handleStartAutoRefill
                    : handlePlaceOrder
                }
                disabled={
                  isPlacingOrder || cartItems.length === 0 || !activeAddress
                }
                className="w-full py-3.5 px-4 rounded-xl bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-white font-bold text-xs sm:text-sm text-center shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                {isPlacingOrder ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
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
                    <span>
                      {purchaseType === "auto_refill"
                        ? "Setting up Auto-Refill..."
                        : paymentMethod === "cod"
                          ? "Placing Order..."
                          : "Preparing payment..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {purchaseType === "auto_refill"
                        ? "🔄 Start Auto-Refill"
                        : paymentMethod === "cod"
                          ? "📦 Place Order"
                          : "Proceed to Payment"}
                    </span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>

              <p className="mt-2.5 text-center text-[10px] text-slate-400">
                {purchaseType === "auto_refill" ? (
                  <>
                    You can pause, reschedule, or cancel your auto-refill
                    subscription anytime from your dashboard.
                  </>
                ) : (
                  <>
                    By placing this order, you agree to our{" "}
                    <Link
                      href="/dashboard/help-support"
                      className="text-slate-600 underline"
                    >
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/dashboard/help-support"
                      className="text-slate-600 underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>

            {/* Trust Badges 2-column */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100/80">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 text-xs border border-sky-100/60 shadow-2xs">
                  🔒
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">
                    256-bit encrypted
                  </p>
                  <p className="text-[10px] text-slate-400 font-normal">
                    Your data is secure
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#166534] text-xs border border-emerald-100/60 shadow-2xs">
                  ✓
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">
                    100% genuine
                  </p>
                  <p className="text-[10px] text-slate-400 font-normal">
                    Medicines, always
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust & Care Card */}
          <div className="rounded-2xl glass-card border border-emerald-100/60 p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Trusted care, at your doorstep.
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                Genuine medicines. Faster delivery. A healthier you. 💚
              </p>
            </div>

            {/* App screen illustration */}
            <div className="h-10 w-8 bg-emerald-100 rounded-lg border border-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-emerald-700 text-xs">📱</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto modal-animate-in border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Select Delivery Address
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              {addresses.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No saved addresses found. Please add a new delivery address
                  below.
                </div>
              ) : (
                addresses.map((addr) => {
                  const isSelected = addr.id === selectedAddressId;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setIsAddressModalOpen(false);
                      }}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-200 ${
                        isSelected
                          ? "border-[#166534] bg-[#f4faf6] shadow-2xs"
                          : "border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[#166534] bg-white"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-[#166534]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {customerName} ({addr.label || "Address"})
                            </p>
                            <p className="text-[11px] text-slate-600 mt-0.5 font-normal">
                              {addr.address}, {addr.city}, {addr.state} -{" "}
                              {addr.postalCode}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsAddressModalOpen(false);
                  setIsAddAddressModalOpen(true);
                }}
                className="text-xs font-bold text-[#166534] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+ Add New Address</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-xl bg-slate-100/90 hover:bg-slate-200/90 active:scale-[0.98] px-4 py-2 text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Address Modal */}
      {isAddAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto modal-animate-in border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Add New Delivery Address
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {addressError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {addressError}
              </div>
            )}

            <form onSubmit={handleCreateAddress} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address Label
                </label>
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setNewAddressForm({ ...newAddressForm, label })
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                        newAddressForm.label === label
                          ? "border-[#166534] bg-[#e2f3e8] text-[#166534] shadow-2xs"
                          : "border-slate-200/80 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newAddressForm.address}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="Flat / House No., Street, Area, Landmark"
                  className="w-full rounded-xl bg-slate-50/80 border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#166534] focus:ring-2 focus:ring-emerald-500/15 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddressForm.city}
                    onChange={(e) =>
                      setNewAddressForm({
                        ...newAddressForm,
                        city: e.target.value,
                      })
                    }
                    placeholder="City"
                    className="w-full rounded-xl bg-slate-50/80 border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#166534] focus:ring-2 focus:ring-emerald-500/15 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddressForm.state}
                    onChange={(e) =>
                      setNewAddressForm({
                        ...newAddressForm,
                        state: e.target.value,
                      })
                    }
                    placeholder="State"
                    className="w-full rounded-xl bg-slate-50/80 border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#166534] focus:ring-2 focus:ring-emerald-500/15 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddressForm.postalCode}
                    onChange={(e) =>
                      setNewAddressForm({
                        ...newAddressForm,
                        postalCode: e.target.value,
                      })
                    }
                    placeholder="Postal Code (e.g. 560001)"
                    className="w-full rounded-xl bg-slate-50/80 border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#166534] focus:ring-2 focus:ring-emerald-500/15 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={newAddressForm.country}
                    className="w-full rounded-xl bg-slate-100 border border-slate-200 py-2 px-3 text-xs font-medium text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddAddressModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="rounded-xl bg-[#166534] hover:bg-[#14532d] text-white px-5 py-2 text-xs font-bold shadow-xs hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSavingAddress ? "Saving..." : "Save & Use Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
