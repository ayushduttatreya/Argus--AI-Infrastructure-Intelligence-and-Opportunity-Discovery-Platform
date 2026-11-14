'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Menu, X, Sparkles } from 'lucide-react';
import { ArgusSpiderLogo } from './ArgusSpiderLogo';

interface SupasteNavbarProps {
  currentPath?: '/' | '/mission' | '/platform' | string;
  activePlatformTab?: 'overview' | 'feed' | 'dossier';
  onPlatformTabChange?: (tab: 'overview' | 'feed' | 'dossier') => void;
}

/**
 * Authentic Supaste Notch Navbar (MacBook Dynamic Island / Top Bezel Dock)
 * Reverse-engineered from https://www.supaste.com/
 * Features signature inverted curved corner fillets and high-contrast pill typography.
 */
export const SupasteNavbar: React.FC<SupasteNavbarProps> = ({
  currentPath = '/',
  activePlatformTab = 'overview',
  onPlatformTabChange,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none">
      {/* Signature Top-Pinned Notch Bar */}
      <div
        className={`pointer-events-auto relative flex items-center justify-between h-[48px] sm:h-[52px] px-4 sm:px-6 transition-all duration-300 ${
          scrolled
            ? 'w-[96%] max-w-4xl top-3 sm:top-4 rounded-full bg-[#080B14]/92 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]'
            : 'w-auto min-w-[320px] sm:min-w-[720px] max-w-4xl top-0 rounded-b-[20px] bg-black border-b border-x border-white/[0.08] shadow-[0_10px_35px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Supaste Signature Inverted Corner Fillets (Only visible when attached to top) */}
        {!scrolled && (
          <>
            {/* Left Inverted Curve Fillet */}
            <svg
              className="absolute top-0 -left-[20px] w-5 h-5 pointer-events-none text-black hidden sm:block"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z" />
            </svg>

            {/* Right Inverted Curve Fillet */}
            <svg
              className="absolute top-0 -right-[20px] w-5 h-5 pointer-events-none text-black hidden sm:block"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M 20 0 L 0 0 C 11.046 0 20 8.954 20 20 Z" />
            </svg>
          </>
        )}

        {/* Left: Brand Identity with 8-Limbed Spider Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shadow-inner group-hover:border-indigo-500/50 transition">
            <ArgusSpiderLogo size={22} glow={false} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-white group-hover:text-indigo-200 transition">
              ARGUS
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              8-Fleet
            </span>
          </div>
        </Link>

        {/* Center: Clean Supaste Menu Links */}
        <nav className="hidden md:flex items-center gap-6 sm:gap-7 font-sans text-[13px] font-medium text-white/70">
          {currentPath === '/' && (
            <>
              <a
                href="#overview"
                className="hover:text-white transition tracking-tight"
              >
                Overview
              </a>
              <a
                href="#telemetry"
                className="hover:text-white transition tracking-tight flex items-center gap-1.5"
              >
                <span>Telemetry</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </a>
              <a
                href="#intelligence-fleet"
                className="hover:text-white transition tracking-tight"
              >
                8 Engines
              </a>
              <a
                href="#epistemic-rigor"
                className="hover:text-white transition tracking-tight"
              >
                Provenance
              </a>
              <a
                href="https://ascii.rest"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition text-xs font-mono flex items-center gap-1"
              >
                <span>[ascii.rest]</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            </>
          )}

          {currentPath === '/mission' && (
            <>
              <Link
                href="/"
                className="text-white/50 hover:text-white transition text-xs font-mono"
              >
                ← Landing
              </Link>
              <a href="#mission-brief" className="hover:text-white transition tracking-tight">
                Mission Brief
              </a>
              <a href="#workstreams" className="hover:text-white transition tracking-tight flex items-center gap-1.5">
                <span>8 Engines</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </a>
              <a href="#timeline" className="hover:text-white transition tracking-tight">
                Execution Log
              </a>
            </>
          )}

          {currentPath === '/platform' && (
            <>
              <Link
                href="/"
                className="text-white/50 hover:text-white transition text-xs font-mono"
              >
                ← Landing
              </Link>
              <button
                onClick={() => onPlatformTabChange?.('overview')}
                className={`transition tracking-tight ${
                  activePlatformTab === 'overview' ? 'text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => onPlatformTabChange?.('feed')}
                className={`transition tracking-tight flex items-center gap-1.5 ${
                  activePlatformTab === 'feed' ? 'text-white font-semibold' : 'hover:text-white'
                }`}
              >
                <span>Discovery Feed</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </button>
              <button
                onClick={() => onPlatformTabChange?.('dossier')}
                className={`transition tracking-tight ${
                  activePlatformTab === 'dossier' ? 'text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Dossier
              </button>
            </>
          )}
        </nav>

        {/* Right: Actions / Pill CTAs */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentPath !== '/platform' && (
            <Link
              href="/platform"
              className="hidden sm:inline-flex items-center text-xs text-white/70 hover:text-white font-mono px-2.5 py-1 rounded-full transition hover:bg-white/5"
            >
              <span>Platform</span>
            </Link>
          )}

          {currentPath !== '/mission' ? (
            <Link
              href="/mission"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-sm active:scale-95 group"
            >
              <span>Execute Mission</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          ) : (
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-sm active:scale-95 group"
            >
              <span>View Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto absolute top-14 inset-x-4 max-w-sm mx-auto p-4 rounded-3xl bg-black/95 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-3 font-sans text-xs md:hidden">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <ArgusSpiderLogo size={20} glow={false} />
            <span className="font-bold text-white text-sm">ARGUS 8-Fleet</span>
          </div>
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
          >
            Landing Page
          </Link>
          <Link
            href="/mission"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
          >
            Autonomous Mission Pipeline
          </Link>
          <Link
            href="/platform"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
          >
            Platform Intelligence Workspace
          </Link>
        </div>
      )}
    </header>
  );
};
