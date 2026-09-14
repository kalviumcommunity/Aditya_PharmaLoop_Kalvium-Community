"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Medicines", href: "/products" },
    { label: "Help & Support", href: "/help-support" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/products");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] transition-all nav-entrance">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1b5e3b] text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C7.03 2 3 6.03 3 11c0 3.58 2.12 6.67 5.19 8.07.41-.65.95-1.42 1.63-2.31 1.62-2.12 3.8-4.97 3.8-7.76 0-1.28-.43-2.45-1.15-3.37C12.82 5.23 13.43 5 14.1 5c2.76 0 5 2.24 5 5 0 2.51-1.02 4.41-2.47 5.76.15.52.37 1.02.66 1.49C19.34 15.68 21 13.53 21 11c0-4.97-4.03-9-9-9z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#1b5e3b] leading-tight">
                PharmaLoop
              </span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex md:items-center md:gap-7">
            {navLinks.map((link) => {
              const isHome = link.label === "Home";
              const active = isHome ? pathname === "/" : pathname.startsWith(link.href.split("?")[0]);

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-xs sm:text-sm font-medium transition-all relative py-1 ${
                    active
                      ? "text-[#1b5e3b] font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1b5e3b] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search, Login */}
        <div className="hidden md:flex md:items-center md:gap-4">
          {/* Search field form */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <button
              type="submit"
              aria-label="Search"
              className="absolute left-3 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines, health products..."
              className="w-52 lg:w-64 focus:w-64 lg:focus:w-72 rounded-full bg-slate-100/80 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 border border-slate-200/60 focus:border-[#1b5e3b] focus:bg-white focus:ring-2 focus:ring-emerald-500/15 focus:outline-none transition-all duration-300 ease-out"
            />
          </form>

          {/* Login / Sign Up Button */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-xl bg-[#1b5e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#154c30] hover:shadow-md hover:shadow-emerald-900/15 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span>Login / Sign Up</span>
          </Link>
        </div>

        {/* Mobile menu hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines, health products..."
                className="w-full rounded-full bg-[#f1f5f9] py-2 pl-4 pr-10 text-xs text-slate-700 placeholder-slate-400"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute right-3 text-slate-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-emerald-50 text-[#1b5e3b] font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-slate-100 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1b5e3b] py-2.5 text-xs font-bold text-white w-full"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>Login / Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
