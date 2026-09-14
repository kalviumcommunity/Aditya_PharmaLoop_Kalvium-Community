import React from "react";
import Link from "next/link";

export default function NeedHelpCard() {
  return (
    <div className="glass-card glass-card-interactive p-5 text-left rounded-2xl">
      <div className="flex items-center gap-3 mb-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50/80 text-[#1b5e3b] text-base shrink-0 border border-emerald-100/60 shadow-xs">
          🎧
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900">Need Help?</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
            Our support team is here for you 24/7.
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/help-support"
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-xs py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50/70 hover:border-emerald-200 hover:text-[#1b5e3b] active:scale-[0.98] transition-all duration-200 shadow-2xs group"
      >
        <span>Visit Help &amp; Support</span>
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
      </Link>
    </div>
  );
}
