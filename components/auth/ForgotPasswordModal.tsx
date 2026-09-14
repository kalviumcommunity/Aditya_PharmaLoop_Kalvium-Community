"use client";

import React, { useState, useEffect, useRef } from "react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  initialEmail?: string;
}

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleClose = () => {
    setStep("EMAIL");
    setOtpDigits(["", "", "", "", "", ""]);
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.remainingSeconds) {
          setCooldownSeconds(data.remainingSeconds);
          setErrorMessage(data.message || `Please wait ${data.remainingSeconds}s before requesting again.`);
        } else {
          setErrorMessage(data.message || "Failed to send verification code.");
        }
        setLoading(false);
        return;
      }

      // Success: advance to OTP stage
      setCooldownSeconds(60);
      setStep("OTP");
      setLoading(false);
      // Focus first OTP cell
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.error("[ForgotPassword] Error sending OTP:", err);
      setErrorMessage("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleOtpChange = (index: number, val: string) => {
    if (errorMessage) setErrorMessage(null);

    // Handle single character or paste
    const digitsOnly = val.replace(/\D/g, "");
    if (!digitsOnly) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // If pasted multiple digits
    if (digitsOnly.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6 && i < digitsOnly.length; i++) {
        next[i] = digitsOnly[i];
      }
      setOtpDigits(next);
      const nextIndex = Math.min(digitsOnly.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const next = [...otpDigits];
    next[index] = digitsOnly[0];
    setOtpDigits(next);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Invalid verification code.");
        setLoading(false);
        return;
      }

      // Success: advance to New Password stage
      setResetToken(data.data.resetToken);
      setStep("NEW_PASSWORD");
      setLoading(false);
    } catch (err) {
      console.error("[ForgotPassword] Error verifying OTP:", err);
      setErrorMessage("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ──────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to reset password. Please try again.");
        setLoading(false);
        return;
      }

      // Success: advance to Success stage
      setStep("SUCCESS");
      setLoading(false);
    } catch (err) {
      console.error("[ForgotPassword] Error resetting password:", err);
      setErrorMessage("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        {step !== "SUCCESS" && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ── STATE 1: Enter Email ─────────────────────────────────────────── */}
        {step === "EMAIL" && (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#1b5e3b] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900">Forgot Password?</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Enter your registered email address below. We will send a secure 6-digit verification code to reset your password.
            </p>

            {errorMessage && (
              <div className="mt-3.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                    placeholder="name@example.com"
                    disabled={loading}
                    required
                    autoFocus
                    className="w-full rounded-xl bg-white py-3 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || cooldownSeconds > 0}
                  className="rounded-xl bg-[#1b5e3b] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#154c30] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send Verification Code"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STATE 2: Verify OTP ───────────────────────────────────────────── */}
        {step === "OTP" && (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#1b5e3b] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900">Check Your Email</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              We sent a 6-digit code to <strong className="text-slate-800">{email}</strong>. Enter it below to proceed:
            </p>

            {errorMessage && (
              <div className="mt-3.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-5">
              {/* 6-Digit OTP Box Grid */}
              <div className="flex justify-between gap-2 sm:gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={loading}
                    className="h-12 w-11 sm:h-13 sm:w-13 text-center text-lg font-bold text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                  />
                ))}
              </div>

              {/* Resend Cooldown Countdown */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Didn&apos;t receive the email?</span>
                {cooldownSeconds > 0 ? (
                  <span className="font-semibold text-slate-400">
                    Resend in {cooldownSeconds}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="font-bold text-[#1b5e3b] hover:text-[#154c30] transition-colors"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("EMAIL")}
                  disabled={loading}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  &larr; Change email
                </button>
                <button
                  type="submit"
                  disabled={loading || otpDigits.join("").length !== 6}
                  className="rounded-xl bg-[#1b5e3b] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#154c30] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>Verify Code</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STATE 3: Create New Password ──────────────────────────────────── */}
        {step === "NEW_PASSWORD" && (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-[#1b5e3b] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900">Set New Password</h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Code verified! Please create a strong new password with at least 8 characters.
            </p>

            {errorMessage && (
              <div className="mt-3.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="At least 8 characters"
                    disabled={loading}
                    required
                    autoFocus
                    className="w-full rounded-xl bg-white py-3 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? (
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Repeat your new password"
                    disabled={loading}
                    required
                    className="w-full rounded-xl bg-white py-3 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#1b5e3b] focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
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

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="rounded-xl bg-[#1b5e3b] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#154c30] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STATE 4: Success ─────────────────────────────────────────────── */}
        {step === "SUCCESS" && (
          <div className="text-center py-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-[#1b5e3b] mb-4">
              <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900">Password Reset Complete!</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              Your password has been successfully updated. You can now log in to your account with your new credentials.
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  onSuccess(email.trim().toLowerCase());
                  handleClose();
                }}
                className="w-full rounded-xl bg-[#1b5e3b] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#154c30] transition-colors"
              >
                Back to Login &rarr;
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
