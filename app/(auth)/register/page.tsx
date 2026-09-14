"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const emptySubscribe = () => () => {};
const getServerSnapshot = () => null;

function getRegisterOAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const oauthError = searchParams.get("error");
  if (oauthError === "google_not_configured") {
    return "Google sign-in is currently unavailable. Please register with your email below.";
  }
  if (oauthError === "oauth_cancelled") {
    return "Google sign-in was cancelled.";
  }
  if (oauthError === "local_email_not_verified") {
    return "An account with this email exists but is not verified yet. Please complete verification or log in with your password.";
  }
  if (oauthError === "unverified_google_email") {
    return "Your email address is not verified by Google.";
  }
  if (oauthError === "invalid_state") {
    return "Your sign-up session expired. Please try again.";
  }
  if (oauthError) {
    return "Google sign-in failed. Please try again or register with your email below.";
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  // Wizard Step: "FORM" (Enter details) | "OTP" (Verify email)
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP State: 6 individual digit cells
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown & Timer State
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [manualErrorMessage, setManualErrorMessage] = useState<string | null>(null);
  const [oauthDismissed, setOauthDismissed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hydration-safe external store sync for URL query params without cascading setState effects
  const urlOAuthError = useSyncExternalStore(emptySubscribe, getRegisterOAuthError, getServerSnapshot);
  const errorMessage = manualErrorMessage ?? (oauthDismissed ? null : urlOAuthError);

  const setErrorMessage = (msg: string | null) => {
    setManualErrorMessage(msg);
    if (msg === null) setOauthDismissed(true);
  };

  // Countdown timer effect for Resend Cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Defense-in-depth: If already authenticated, redirect to role destination
  useEffect(() => {
    let isCancelled = false;

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (!isCancelled && json?.success && json?.data?.role) {
          const defaultRoute =
            json.data.role === "ADMIN" ? "/admin" : "/dashboard";
          router.push(defaultRoute);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    const redirectParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect")
        : null;
    const target =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/dashboard";
    // Initiates server-side OAuth flow which 302-redirects to Google accounts
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${window.location.origin}/api/auth/google?redirect=${encodeURIComponent(target)}`);
  };

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "OTP") {
      const timer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Handle Form Submission (Step 1 -> Step 2)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setErrorMessage("Full name must be at least 2 characters.");
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-check.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || undefined,
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(
          json.error || json.message || "Registration failed. Please check your details."
        );
        setLoading(false);
        return;
      }

      // Transition to OTP verification state
      setStep("OTP");
      setOtpValues(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setSuccessMessage(
        `Verification code sent to ${trimmedEmail}. Please check your inbox.`
      );
      setLoading(false);
    } catch (err: unknown) {
      console.error("[Registration Error]", err);
      setErrorMessage("Network connection error. Please check your internet and try again.");
      setLoading(false);
    }
  };

  // OTP Input Handlers
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpValues];
    updated[index] = digit;
    setOtpValues(updated);
    if (errorMessage) setErrorMessage(null);

    // Auto-advance to next input if digit entered
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const updated = [...otpValues];
    for (let i = 0; i < 6; i++) {
      updated[i] = pastedData[i] || "";
    }
    setOtpValues(updated);

    // Focus last filled box
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // Verify Email Submission (Step 2 -> Success & Dashboard)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullOtp = otpValues.join("");
    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: fullOtp,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(
          json.error || json.message || "Invalid verification code. Please try again."
        );
        setLoading(false);
        return;
      }

      setSuccessMessage("Email verified! Redirecting to your dashboard...");

      // Persist user in localStorage for client state
      if (typeof window !== "undefined" && json.data?.user) {
        localStorage.setItem("pharmaloop_user", JSON.stringify(json.data.user));
      }

      // Redirect to dashboard or destination
      const redirectParam =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      const destination =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : "/dashboard";

      setTimeout(() => {
        router.push(destination);
      }, 600);
    } catch (err: unknown) {
      console.error("[OTP Verification Error]", err);
      setErrorMessage("Network error verifying code. Please try again.");
      setLoading(false);
    }
  };

  // Resend OTP Handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.error || "Failed to resend code. Please wait and try again.");
        setResending(false);
        return;
      }

      setSuccessMessage("A fresh verification code has been sent to your email.");
      setOtpValues(["", "", "", "", "", ""]);
      setResendCooldown(60);
      otpInputRefs.current[0]?.focus();
      setResending(false);
    } catch (err: unknown) {
      console.error("[Resend Error]", err);
      setErrorMessage("Failed to resend verification code. Please check your connection.");
      setResending(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col justify-center bg-[#f3f9f5] min-h-screen py-10 px-4 sm:px-6 lg:px-10 overflow-hidden page-entrance">
      {/* Decorative background mint circles */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-[400px] w-[400px] rounded-full bg-emerald-200/30 blur-2xl" />

      <div className="mx-auto w-full max-w-7xl relative z-10">
        {/* Top: Back to Home Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#1b5e3b] hover:text-[#154c30] transition-colors group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Marketing Panel with Branding, Medicine Cards & 3D Visual */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b5e3b] text-white shadow-xs">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C7.03 2 3 6.03 3 11c0 3.58 2.12 6.67 5.19 8.07.41-.65.95-1.42 1.63-2.31 1.62-2.12 3.8-4.97 3.8-7.76 0-1.28-.43-2.45-1.15-3.37C12.82 5.23 13.43 5 14.1 5c2.76 0 5 2.24 5 5 0 2.51-1.02 4.41-2.47 5.76.15.52.37 1.02.66 1.49C19.34 15.68 21 13.53 21 11c0-4.97-4.03-9-9-9z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                  PharmaLoop
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1">
                  Healthier Today. Brighter Tomorrow.
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
              Your Health.<br />
              Always on <span className="text-[#1b5e3b]">Loop.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="mt-4 text-sm sm:text-base font-semibold text-slate-700">
              Smart refills. Timely care. Better you.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mt-0.5 leading-relaxed">
              Join thousands who trust PharmaLoop for automatic prescription refills and a healthier tomorrow.
            </p>

            {/* 3 Horizontal Medicine Cards */}
            <div className="mt-7 grid grid-cols-3 gap-3.5 max-w-xl">
              <div className="rounded-2xl bg-white p-3 shadow-xs border border-slate-100 flex flex-col transition-transform hover:-translate-y-0.5">
                <div className="h-16 w-full rounded-xl bg-[#ecf9f0] flex items-center justify-center overflow-hidden">
                  <svg className="h-9 w-9 drop-shadow-xs" viewBox="0 0 64 64" fill="none">
                    <g transform="rotate(-35 32 32)">
                      <rect x="22" y="12" width="20" height="20" rx="10" fill="#f43f5e" />
                      <rect x="22" y="32" width="20" height="20" rx="10" fill="#ffffff" />
                      <line x1="22" y1="32" x2="42" y2="32" stroke="#e2e8f0" strokeWidth="1" />
                    </g>
                  </svg>
                </div>
                <div className="mt-2 text-left">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Crocin 650</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">15 Tablets</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-xs border border-slate-100 flex flex-col transition-transform hover:-translate-y-0.5">
                <div className="h-16 w-full rounded-xl bg-[#fef9c3]/70 flex items-center justify-center overflow-hidden">
                  <svg className="h-8 w-14 drop-shadow-xs" viewBox="0 0 56 32" fill="none">
                    <ellipse cx="22" cy="16" rx="12" ry="8" transform="rotate(-15 22 16)" fill="#f59e0b" />
                    <ellipse cx="20" cy="14" rx="10" ry="6" transform="rotate(-15 20 14)" fill="#fbbf24" />
                    <ellipse cx="18" cy="13" rx="4" ry="2" transform="rotate(-15 18 13)" fill="#fef3c7" fillOpacity="0.8" />
                    <ellipse cx="36" cy="18" rx="12" ry="8" transform="rotate(10 36 18)" fill="#f59e0b" />
                    <ellipse cx="34" cy="16" rx="10" ry="6" transform="rotate(10 34 16)" fill="#fbbf24" />
                    <ellipse cx="32" cy="15" rx="4" ry="2" transform="rotate(10 32 15)" fill="#fef3c7" fillOpacity="0.8" />
                  </svg>
                </div>
                <div className="mt-2 text-left">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Vitamin D3</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">60 Tablets</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-xs border border-slate-100 flex flex-col transition-transform hover:-translate-y-0.5">
                <div className="h-16 w-full rounded-xl bg-[#e0f2fe]/60 flex items-center justify-center overflow-hidden">
                  <svg className="h-10 w-9 drop-shadow-xs" viewBox="0 0 48 48" fill="none">
                    <path d="M18 10h12v12H18z" fill="#0284c7" />
                    <path d="M18 22h12v16H18z" fill="#38bdf8" />
                    <path d="M22 6h4v4h-4z" fill="#94a3b8" />
                    <path d="M18 34l-8 4v-8l8-2z" fill="#0284c7" />
                    <ellipse cx="10" cy="34" rx="2.5" ry="4" fill="#0369a1" />
                  </svg>
                </div>
                <div className="mt-2 text-left">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Amoxicillin</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">10 Capsules</p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-xl">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="mt-2 text-[11px] font-bold text-slate-700">Verified Pharmacy</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <span className="mt-2 text-[11px] font-bold text-slate-700">Auto-Refill Schedule</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="mt-2 text-[11px] font-bold text-slate-700">100% Data Privacy</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <span className="mt-2 text-[11px] font-bold text-slate-700">24/7 Expert Support</span>
              </div>
            </div>
          </div>

          {/* Right Column: Rounded White Glass Card */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[440px] rounded-[28px] glass-card p-8 sm:p-9 shadow-xl shadow-emerald-950/5 relative">
              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                  <svg className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
                  <svg className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">{successMessage}</span>
                </div>
              )}

              {/* STATE 1: INITIAL SIGNUP FORM */}
              {step === "FORM" && (
                <>
                  <div className="text-left">
                    <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                      <span>Create Your Account</span>
                      <span className="text-emerald-500 text-2xl">💚</span>
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 font-medium">
                      Join PharmaLoop and stay on top of your health.
                    </p>
                  </div>

                  <form className="mt-5 space-y-3.5" onSubmit={handleFormSubmit}>
                    {/* 1. Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Enter your full name"
                          disabled={loading}
                          required
                          className="w-full rounded-xl bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-hidden focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* 2. Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Enter your email address"
                          disabled={loading}
                          required
                          className="w-full rounded-xl bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-hidden focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* 3. Phone Number (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="+91 98765 43210"
                          disabled={loading}
                          className="w-full rounded-xl bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-hidden focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* 4. Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Password
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          Min 8 characters
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Create a strong password"
                          disabled={loading}
                          required
                          className="w-full rounded-xl bg-white py-2.5 pl-10 pr-10 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-hidden focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 5. Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Re-enter your password"
                          disabled={loading}
                          required
                          className="w-full rounded-xl bg-white py-2.5 pl-10 pr-10 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-hidden focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Primary Action Button: Create Account */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full !mt-5 rounded-xl bg-[#1b5e3b] py-3 text-sm font-bold text-white shadow-md shadow-emerald-900/10 hover:bg-[#154c30] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Sending Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <span>&rarr;</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-5 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      OR REGISTER WITH
                    </span>
                  </div>

                  {/* Google OAuth Registration Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                      aria-label="Continue with Google"
                      className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200/90 bg-white py-3 px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {googleLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-[#1b5e3b]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Connecting to Google...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bottom Login Link */}
                  <p className="mt-5 text-center text-xs text-slate-500 font-medium">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors underline-offset-2 hover:underline"
                    >
                      Log in here
                    </Link>
                  </p>
                </>
              )}

              {/* STATE 2: EMAIL OTP VERIFICATION SCREEN */}
              {step === "OTP" && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-left">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-[#1b5e3b] mb-2 border border-emerald-200">
                      ✉️
                    </div>
                    <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900">
                      Verify Your Email
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      We sent a 6-digit verification code to:
                    </p>
                    <p className="text-xs font-bold text-slate-800 break-all bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 mt-1 inline-block">
                      {email}
                    </p>
                  </div>

                  <form className="mt-6" onSubmit={handleVerifyOtp}>
                    {/* 6 Digit Input Cells */}
                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {otpValues.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={1}
                          value={digit}
                          disabled={loading}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          aria-label={`Digit ${idx + 1} of verification code`}
                          className="h-12 w-11 sm:h-13 sm:w-12 text-center text-xl font-extrabold text-slate-900 bg-white border border-slate-200/90 rounded-xl focus:outline-hidden focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 shadow-2xs transition-all"
                        />
                      ))}
                    </div>

                    <p className="mt-2.5 text-[11px] text-slate-400 text-center">
                      Code expires in 10 minutes.
                    </p>

                    {/* Verify Button */}
                    <button
                      type="submit"
                      disabled={loading || otpValues.join("").length !== 6}
                      className="w-full mt-5 rounded-xl bg-[#1b5e3b] py-3 text-sm font-bold text-white shadow-md shadow-emerald-900/10 hover:bg-[#154c30] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify &amp; Activate Account</span>
                          <span>&rarr;</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Resend & Edit Details Controls */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      {resendCooldown > 0 ? (
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <span>⏱️ Resend code in</span>
                          <span className="font-bold text-slate-600">{resendCooldown}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resending}
                          className="font-bold text-[#1b5e3b] hover:text-[#154c30] hover:underline transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {resending ? "Sending..." : "Resend OTP"}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStep("FORM");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Wrong email? Edit details
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Below Card Security Assurance Badge */}
            <div className="mt-5 flex items-center gap-2.5 max-w-sm px-2 text-left">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#1b5e3b]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-slate-700">Protected by Email OTP Verification</p>
                <p className="text-slate-400 mt-0.5">We verify every customer email to protect account privacy and prescription delivery.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
