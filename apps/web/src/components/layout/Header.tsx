"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Search, Bell } from "lucide-react";

const NAV_LINKS = [
  { href: "/explorer", label: "Explorer" },
  { href: "/explorer?category=bricolage", label: "Services" },
  { href: "#how-it-works", label: "Comment ca marche" },
] as const;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-soft border-b border-slate-100"
            : "bg-transparent"
        }`}
      >
        <div className="container-tight">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-lg leading-none">F</span>
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Flo<span className="text-brand-600">Service</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg
                    hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="btn-ghost text-sm">
                Connexion
              </Link>
              <Link href="/register" className="btn-primary text-sm px-5 py-2.5">
                Commencer gratuitement
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
            mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white border-t border-slate-100 px-4 pb-6 pt-2 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 space-y-2">
              <Link href="/login" className="block text-center btn-secondary text-sm w-full">
                Connexion
              </Link>
              <Link href="/register" className="block text-center btn-primary text-sm w-full">
                Commencer gratuitement
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
