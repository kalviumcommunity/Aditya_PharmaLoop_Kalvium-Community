"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

const emptySubscribe = () => () => {};
const getServerSnapshot = () => null;

function getLoginOAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const oauthError = searchParams.get("error");
  if (oauthError === "google_not_configured") {
    return "Google sign-in is currently unavailable. Please sign in with your email and password.";
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
    return "Your sign-in session expired. Please try again.";
  }
  if (oauthError) {
    return "Google sign-in failed. Please try again or log in with your email and password.";
  }
  return null;
}

export default function LoginPage() {

  // Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [manualErrorMessage, setManualErrorMessage] = useState<string | null>(null);
  const [oauthDismissed, setOauthDismissed] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Hydration-safe external store sync for URL query params without cascading setState effects
  const urlOAuthError = useSyncExternalStore(emptySubscribe, getLoginOAuthError, getServerSnapshot);
  const errorMessage = manualErrorMessage ?? (oauthDismissed ? null : urlOAuthError);

  const setErrorMessage = (msg: string | null) => {
    setManualErrorMessage(msg);
    if (msg === null) setOauthDismissed(true);
  };

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
          const redirectParam =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("redirect")
              : null;
          const defaultRoute =
            json.data.role === "ADMIN" ? "/admin" : "/dashboard";
          const destination =
            redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
              ? redirectParam
              : defaultRoute;
          router.push(destination);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setErrorMessage("Please enter your email or phone number.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    // Backend login contract requires a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedIdentifier)) {
      setErrorMessage(
        "Please enter a valid email address (e.g. name@example.com) to log in."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedIdentifier,
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(
          json.error || json.message || "Invalid credentials. Please try again."
        );
        setLoading(false);
        return;
      }

      // Persist user in localStorage for client state
      if (typeof window !== "undefined" && json.data?.user) {
        localStorage.setItem(
          "pharmaloop_user",
          JSON.stringify(json.data.user)
        );
      }

      // Backend Set-Cookie for auth_token is automatically handled by the browser
      const redirectParam =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      const defaultRoute =
        json.data?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
      const destination =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : defaultRoute;

      // Force a full document navigation to invalidate RSC client-side router cache
      // and ensure cookies are sent cleanly on the initial server component request.
      window.location.href = destination;
    } catch (err: unknown) {
      console.error("[Login Error]", err);
      setErrorMessage(
        "Network connection error. Please check your internet and try again."
      );
      setLoading(false);
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b5e3b] text-white shadow-sm">
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
              Join thousands who trust PharmaLoop for a healthier, hassle-free tomorrow.
            </p>

            {/* 3 Horizontal Medicine Cards */}
            <div className="mt-7 grid grid-cols-3 gap-3.5 max-w-xl">
              
              {/* Card 1: Crocin 650 */}
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

              {/* Card 2: Vitamin D3 1000IU */}
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
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Vitamin D3 1000IU</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">60 Tablets</p>
                </div>
              </div>

              {/* Card 3: Amoxicillin 500mg */}
              <div className="rounded-2xl bg-white p-3 shadow-xs border border-slate-100 flex flex-col transition-transform hover:-translate-y-0.5">
                <div className="h-16 w-full rounded-xl bg-[#e0f2fe]/60 flex items-center justify-center overflow-hidden">
                  <svg className="h-10 w-9 drop-shadow-xs" viewBox="0 0 48 48" fill="none">
                    {/* Blue asthma inhaler SVG */}
                    <path d="M18 10h12v12H18z" fill="#0284c7" />
                    <path d="M18 22h12v16H18z" fill="#38bdf8" />
                    <path d="M22 6h4v4h-4z" fill="#94a3b8" />
                    <path d="M18 34l-8 4v-8l8-2z" fill="#0284c7" />
                    <ellipse cx="10" cy="34" rx="2.5" ry="4" fill="#0369a1" />
                  </svg>
                </div>
                <div className="mt-2 text-left">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Amoxicillin 500mg</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">10 Capsules</p>
                </div>
              </div>

            </div>

            {/* Middle decorative composition: Trust Pills on Left & 3D Pack/Leaves on Right */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              
              {/* 4 Trust Badges */}
              <div className="sm:col-span-5 grid grid-cols-2 gap-3.5">
                {/* 1. Secure Payments */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-700">Secure Payments</span>
                </div>

                {/* 2. Auto-refill Reminders */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-700">Auto-refill Reminders</span>
                </div>

                {/* 3. 100% Data Privacy */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-700">100% Data Privacy</span>
                </div>

                {/* 4. 24/7 Expert Support */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-[#1b5e3b]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-700">24/7 Expert Support</span>
                </div>
              </div>

              {/* Decorative 3D Medicine Box & Pills */}
              <div className="sm:col-span-7 relative flex items-center justify-center">
                {/* Handwritten Callout */}
                <div className="absolute -top-7 right-4 text-center z-10 hidden sm:block">
                  <p className="font-serif italic text-emerald-800 text-xs font-semibold leading-tight">
                    Care<br />On Time<br />Always 💚
                  </p>
                  <svg className="h-6 w-6 text-emerald-600 mx-auto mt-0.5 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* Simulated 3D Box + Blister Pack + Leaves */}
                <div className="relative flex items-center justify-center py-4">
                  {/* PharmaLoop Box */}
                  <div className="relative rounded-2xl bg-white p-4 shadow-lg border border-slate-200/80 w-44 text-center transform -rotate-3 hover:rotate-0 transition-transform">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <div className="h-5 w-5 rounded-md bg-[#1b5e3b] text-white flex items-center justify-center text-[10px]">
                        🍃
                      </div>
                      <span className="text-xs font-extrabold text-[#1b5e3b]">PharmaLoop</span>
                    </div>
                    <div className="h-1 w-12 bg-emerald-300 rounded-full mx-auto my-1" />
                    <p className="text-[9px] text-slate-400">Clinical Formulation</p>
                  </div>

                  {/* Blister pack overlay */}
                  <div className="absolute -left-4 -bottom-3 rounded-xl bg-slate-100 p-2.5 shadow-md border border-slate-200/90 transform rotate-12">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-4 w-4 rounded-full bg-white shadow-inner border border-slate-200" />
                      ))}
                    </div>
                  </div>

                  {/* Green Leaf Accent */}
                  <div className="absolute -right-2 -bottom-2 text-2xl filter drop-shadow-xs">
                    🌿
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Left Hand-drawn Tagline */}
            <div className="mt-8 hidden sm:block">
              <span className="font-serif italic text-emerald-800 text-sm font-semibold tracking-wide">
                Small steps ♡ Healthier tomorrows
              </span>
              <div className="h-0.5 w-44 bg-emerald-400/60 rounded-full mt-0.5" />
            </div>

          </div>

          {/* Right Column: Rounded White Login Card */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[440px] rounded-[28px] glass-card p-8 sm:p-10 shadow-xl shadow-emerald-950/5 relative">
              
              {/* Card Header */}
              <div className="text-left">
                <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Welcome Back</span>
                  <span className="text-emerald-500 text-2xl">💚</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Log in to your PharmaLoop account
                </p>
              </div>

              {/* Inline Error Banner */}
              {errorMessage && (
                <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                  <svg className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                
                {/* Email or Phone Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email or Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter your email or phone number"
                      disabled={loading}
                      required
                      className="w-full rounded-xl bg-white py-3 pl-10 pr-3.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
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
                      placeholder="Enter your password"
                      disabled={loading}
                      required
                      className="w-full rounded-xl bg-white py-3 pl-10 pr-10 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/90 focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
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
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1b5e3b] focus:ring-emerald-500 accent-[#1b5e3b]"
                  />
                  <label htmlFor="rememberMe" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                    Remember me
                  </label>
                </div>

                {/* Primary Action Button: Log In */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-[#1b5e3b] py-3 text-sm font-bold text-white shadow-md shadow-emerald-900/10 hover:bg-[#154c30] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <span>Log In</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>

              </form>

              {/* Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  OR CONTINUE WITH
                </span>
              </div>

              {/* Google OAuth Login Button */}
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

              {/* Bottom Register Link */}
              <p className="mt-6 text-center text-xs text-slate-500 font-medium">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors underline-offset-2 hover:underline"
                >
                  Register here
                </Link>
              </p>

            </div>

            {/* Below Card Security Assurance Badge */}
            <div className="mt-5 flex items-center gap-2.5 max-w-sm px-2 text-left">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#1b5e3b]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-slate-700">Your data is safe with us.</p>
                <p className="text-slate-400 mt-0.5">We use industry-standard security to protect your information.</p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Real Interactive Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={identifier.includes("@") ? identifier.trim() : ""}
        onSuccess={(verifiedEmail) => {
          setIdentifier(verifiedEmail);
          setPassword("");
          setErrorMessage(null);
        }}
      />

    </div>
  );
}
