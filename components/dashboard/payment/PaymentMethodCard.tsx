"use client";

export default function PaymentMethodCard() {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Refill Payment Handling
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Scheduled refills are processed through an authenticated payment
            retry.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-[#166534]">
          Test Mode
        </span>
      </div>

      <div className="rounded-xl bg-[#f8fafc] border border-slate-200/80 p-4 space-y-2">
        <p className="text-xs font-bold text-slate-800">
          Interactive payment required
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          The schedule is created without storing payment credentials. When a
          refill is due, the customer completes Razorpay Test Checkout from the
          pending order; background workers do not claim to charge a saved card
          or UPI mandate.
        </p>
      </div>
    </div>
  );
}
