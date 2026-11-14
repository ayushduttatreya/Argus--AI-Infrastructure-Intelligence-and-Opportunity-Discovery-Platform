'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Database,
  Search,
  Compass,
  Zap,
  Activity,
  GitBranch,
  FileCode2,
  Lock,
} from 'lucide-react';
import { SupasteNavbar } from './SupasteNavbar';
import { ScenicSceneryBackground } from './ScenicSceneryBackground';
import { AsciiSkeletonCard } from './AsciiSkeletonCard';
import { ArgusSpiderLogo } from './ArgusSpiderLogo';

const SeamlessAsciiArt = dynamic(
  () => import('./SeamlessAsciiArt').then((m) => m.SeamlessAsciiArt),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full rounded-2xl bg-[#07080f] flex flex-col items-center justify-center font-mono text-xs text-zinc-500 space-y-2 border border-zinc-800">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>[synthesizing procedural halftone canvas...]</span>
      </div>
    ),
  }
);

interface LandingPageProps {
  onEnterPlatform?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [activeArtTab, setActiveArtTab] = useState<'saturn' | 'kyoto' | 'skeleton'>('saturn');
  const [skeletonLines, setSkeletonLines] = useState<number>(3);

  // Curated list of pieces from ascii.rest
  const ASCII_REST_PIECES = [
    { name: 'amer fort', url: 'https://ascii.rest/amer-fort/', isNew: true },
    { name: 'aurora fjord', url: 'https://ascii.rest/aurora-fjord/', isNew: false },
    { name: 'black prism', url: 'https://ascii.rest/black-prism/', isNew: true },
    { name: 'cloud sea', url: 'https://ascii.rest/cloud-sea/', isNew: true },
    { name: 'command city', url: 'https://ascii.rest/command-city/', isNew: true },
    { name: 'deep reef', url: 'https://ascii.rest/deep-reef/', isNew: false },
    { name: 'desert night', url: 'https://ascii.rest/desert-night/', isNew: false },
    { name: 'earthrise', url: 'https://ascii.rest/earthrise/', isNew: false },
    { name: 'edge orbit', url: 'https://ascii.rest/edge-orbit/', isNew: true },
    { name: 'green storm', url: 'https://ascii.rest/green-storm/', isNew: true },
    { name: 'jal mahal', url: 'https://ascii.rest/jal-mahal/', isNew: true },
    { name: 'tokyo rain', url: 'https://ascii.rest/tokyo-rain/', isNew: false },
    { name: 'varanasi ghats', url: 'https://ascii.rest/varanasi-ghats/', isNew: false },
    { name: 'saturn rise', url: 'https://ascii.rest/saturn-rise/', isNew: true },
  ];

  return (
    <div className="min-h-screen bg-[#07080F] text-zinc-100 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* 1. Supaste MacBook Notch Navbar with 8-Limbed Spider Logo */}
      <SupasteNavbar currentPath="/" />

      {/* 2. Hero Section with Authentic Mountain Scenery Wallpaper */}
      <section id="overview" className="relative min-h-[95vh] flex flex-col justify-start items-center pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 border-b border-white/5">
        {/* Authentic Mountain Horizon Scenery Background */}
        <ScenicSceneryBackground />

        {/* Hero Foreground Content */}
        <div className="relative z-10 max-w-4xl mx-auto w-full space-y-6 sm:space-y-7 text-center">
          {/* Top Pill Beacon Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-mono text-zinc-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-medium tracking-wider text-[11px] uppercase">
              AUTONOMOUS AI INFRASTRUCTURE INTELLIGENCE
            </span>
          </div>

          {/* Master Headline with Instrument Serif Accent Typography */}
          <h1 className="font-sans text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-[-0.03em] leading-[1.08] drop-shadow-md">
            Discover Structural Whitespaces in AI Inference{' '}
            <span className="font-serif italic font-normal text-indigo-200 tracking-[-0.02em] block sm:inline drop-shadow-[0_0_30px_rgba(165,180,252,0.35)]">
              Infrastructure.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans max-w-2xl mx-auto drop-shadow-sm">
            ARGUS turns raw GitHub commits, issue regressions, runtime traces, and ArXiv preprints
            into verifiable, empirical opportunity hypotheses. Zero hallucinated confidence scores.
            Every claim links directly to primary sources.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/mission"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-200 transition shadow-[0_0_30px_rgba(255,255,255,0.35)] active:scale-95 group"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Execute Research Mission</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition text-zinc-950" />
            </Link>

            <Link
              href="/platform"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white text-sm font-medium transition backdrop-blur-md shadow-lg group active:scale-95"
            >
              <span>Enter Mission Control</span>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {/* Trust Badges Strip (Supaste 3-Item Trust Row) */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>62/62 Tests Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Hashed Ground Truth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>PostgreSQL RLS Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>8 Autonomous Engines</span>
            </div>
          </div>
        </div>

        {/* 3. Floating Mac App Showcase Frame (Supaste App Hero Window Replica) */}
        <div id="telemetry" className="relative z-20 max-w-5xl mx-auto w-full mt-12 sm:mt-16 scroll-mt-28">
          <div className="relative rounded-3xl bg-[#090C16]/95 border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden ring-1 ring-white/10">
            {/* Window Title Bar */}
            <div className="h-11 px-4 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between">
              {/* Traffic Light Dots */}
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                <span className="ml-2 text-xs font-mono text-zinc-400 font-medium">
                  ARGUS Telemetry Matrix · Live Observer v2.4
                </span>
              </div>

              {/* Viewport Scene Switcher */}
              <div className="flex items-center p-0.5 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setActiveArtTab('saturn')}
                  className={`px-3 py-1 rounded-full transition text-[11px] ${
                    activeArtTab === 'saturn'
                      ? 'bg-white text-zinc-950 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  saturn rise
                </button>
                <button
                  onClick={() => setActiveArtTab('kyoto')}
                  className={`px-3 py-1 rounded-full transition text-[11px] ${
                    activeArtTab === 'kyoto'
                      ? 'bg-white text-zinc-950 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  kyoto dusk
                </button>
                <button
                  onClick={() => setActiveArtTab('skeleton')}
                  className={`px-3 py-1 rounded-full transition text-[11px] ${
                    activeArtTab === 'skeleton'
                      ? 'bg-white text-zinc-950 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  skeleton
                </button>
              </div>
            </div>

            {/* Showcase Viewport Content */}
            <div className="p-4 sm:p-6 bg-[#07080F]">
              {activeArtTab === 'saturn' && <SeamlessAsciiArt scene="saturn" />}
              {activeArtTab === 'kyoto' && <SeamlessAsciiArt scene="kyoto" />}
              {activeArtTab === 'skeleton' && (
                <div className="p-8 rounded-2xl bg-[#0B0D18] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-3 max-w-md font-mono text-xs text-zinc-300">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 font-semibold border border-indigo-700/60">
                      ui/skeleton • 52×23 Matrix
                    </span>
                    <h3 className="font-serif text-2xl text-white font-normal">
                      Tactile Zero-CLS Loading Shimmer
                    </h3>
                    <p className="text-zinc-400 font-sans leading-relaxed text-sm">
                      Exact implementation of <code className="text-indigo-300 font-mono bg-zinc-900 px-1 py-0.5 rounded border border-white/10">skeleton.ts</code> from ascii.rest. Sweeps a procedural 24 FPS halftone gradient across card blocks.
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => setSkeletonLines(skeletonLines === 3 ? 5 : 3)}
                        className="px-4 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-mono font-medium shadow-sm transition"
                      >
                        Toggle Lines ({skeletonLines})
                      </button>
                    </div>
                  </div>
                  <div className="w-full max-w-md flex justify-center">
                    <AsciiSkeletonCard
                      lines={skeletonLines}
                      image={true}
                      avatar={true}
                      className="w-full bg-[#0E1322] border border-white/10 text-zinc-100 shadow-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Curated Pieces Strip */}
            <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs font-mono">
              <span className="text-zinc-400 shrink-0 text-[11px] font-semibold">
                Curated ascii.rest scenes:
              </span>
              {ASCII_REST_PIECES.map((p, idx) => (
                <a
                  key={idx}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition shrink-0 text-[11px]"
                >
                  <span>{p.name}</span>
                  {p.isNew && (
                    <span className="text-[9px] px-1 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">
                      new
                    </span>
                  )}
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Page Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24 sm:space-y-32">
        {/* ========================================================= */}
        {/* SPECIALIST INTELLIGENCE ENGINES GRID                     */}
        {/* ========================================================= */}
        <section id="intelligence-fleet" className="space-y-6 scroll-mt-28">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="font-mono text-xs text-indigo-400 uppercase tracking-wider font-semibold">
                Autonomous Research Fleet
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white mt-1">
                8 Specialist Intelligence Engines
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              Durable Orchestration via Temporal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                id: '01',
                title: 'Company Scanner',
                desc: 'Mines SEC 10-K filings, enterprise pricing changes, and cloud hardware capital allocations.',
                tag: 'Enterprise',
                repo: 'vllm-project/vllm',
              },
              {
                id: '02',
                title: 'Open-Source Intel',
                desc: 'Surfaces developer bottlenecks, memory regressions, and compiler issues from tier-1 runtimes.',
                tag: 'Codebases',
                repo: 'sgl-project/sglang',
              },
              {
                id: '03',
                title: 'Research Scanner',
                desc: 'Indexes ArXiv preprints, attention variants, algorithmic efficiency bounds, and kernel papers.',
                tag: 'Literature',
                repo: 'arXiv:2407.00079',
              },
              {
                id: '04',
                title: 'Community Scanner',
                desc: 'Synthesizes authentic developer complaints, OOM lock-in debates from GitHub and forums.',
                tag: 'Friction',
                repo: 'issues/vllm-5480',
              },
              {
                id: '05',
                title: 'Hiring Intelligence',
                desc: 'Analyzes technical requirements, CUDA/Triton specialization shortages, and cluster team growth.',
                tag: 'Headcount',
                repo: 'talent/compilers',
              },
              {
                id: '06',
                title: 'Market Intelligence',
                desc: 'Tracks cloud GPU spot rates, cluster demand vs supply, and inference token pricing trends.',
                tag: 'Economics',
                repo: 'mlcommons/inference',
              },
              {
                id: '07',
                title: 'Architecture Extractor',
                desc: 'Normalizes systems into dataflow components, latency paths, and hardware boundary graphs.',
                tag: 'Synthesis',
                repo: 'triton-lang/triton',
              },
              {
                id: '08',
                title: 'Negative Space Engine',
                desc: 'Isolates high-conviction product opportunities that market incumbents systematically ignore.',
                tag: 'Opportunity',
                repo: 'synthesis/negative_space',
              },
            ].map((engine) => (
              <Link
                key={engine.id}
                href="/platform?tab=feed"
                className="p-5 sm:p-6 rounded-3xl bg-[#090C16]/80 border border-white/10 shadow-xl hover:border-indigo-400/50 hover:bg-[#0E1324] transition cursor-pointer group flex flex-col justify-between space-y-4 backdrop-blur-md"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">engine/{engine.id}</span>
                    <span className="text-[10px] uppercase font-semibold text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700/50">
                      {engine.tag}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-medium text-white group-hover:text-indigo-300 transition leading-snug">
                    {engine.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    {engine.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between font-mono text-[11px] text-zinc-400">
                  <span className="truncate max-w-[140px] text-zinc-500">{engine.repo}</span>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition font-medium flex items-center space-x-0.5">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* PROOF OF WORK & EVIDENCE VERIFICATION SECTION            */}
        {/* ========================================================= */}
        <section id="epistemic-rigor" className="p-8 sm:p-12 rounded-3xl bg-[#090C16] border border-white/10 shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center scroll-mt-28">
          <div className="space-y-5">
            <span className="font-mono text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
              ZERO-FABRICATION GUARANTEE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white leading-tight">
              Empirical Proof vs. Synthetic Guesses
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed font-sans">
              Unlike generic LLM wrappers, ARGUS never answers from hallucinated training weights.
              Every single claim is bound to an exact character-offset span from authentic public records,
              validated by PostgreSQL row-level security and SHA-256 document version hashes.
            </p>

            <ul className="space-y-2.5 text-xs font-sans text-zinc-300">
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Primary source URLs with verbatim quote highlighting and git commit SHAs</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Separate argus_dispatcher role restricted strictly to column-level updates</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Isolated LiteLLM virtual keys with hard dollar spend controls</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/mission"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-full bg-white text-zinc-950 text-xs font-medium hover:bg-zinc-200 transition shadow-sm"
              >
                <span>Launch Autonomous Investigation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Real-Time Loading State Protocol</span>
              <span>ascii.rest/skeleton</span>
            </div>
            <AsciiSkeletonCard lines={4} image={false} avatar={true} className="w-full bg-[#0E1322] border border-white/10 text-zinc-100 shadow-xl" />
          </div>
        </section>

        {/* ========================================================= */}
        {/* FINAL CALL TO ACTION BANNER                               */}
        {/* ========================================================= */}
        <section className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-[#0F1426] to-[#07080F] text-white text-center space-y-6 relative overflow-hidden shadow-2xl border border-white/15">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PRODUCTION MISSION PIPELINE ACTIVE</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Ready to unearth the next infrastructure breakthrough?
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 font-sans max-w-xl mx-auto leading-relaxed">
              Execute a targeted research mission against vLLM, SGLang, and Triton to discover disaggregated
              KV-cache tiering opportunities with verified cryptographic provenance.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/mission"
                className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition font-medium text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] group"
              >
                <span>Execute Research Mission</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition text-zinc-950" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-full bg-zinc-900 border border-white/15 text-zinc-200 hover:text-white hover:bg-zinc-800 transition text-sm font-medium"
              >
                <span>Enter Mission Control</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Minimalist Footer */}
      <footer className="border-t border-white/10 bg-[#05060B] py-10 text-xs font-mono text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center space-x-3">
            <ArgusSpiderLogo size={20} glow={false} />
            <span className="font-bold text-white">ARGUS 8-Fleet</span>
            <span>·</span>
            <span>PostgreSQL 16 RLS Protected</span>
            <span>·</span>
            <span>Temporal Workflows</span>
            <span>·</span>
            <span>
              ASCII pieces from{' '}
              <a
                href="https://ascii.rest"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline"
              >
                ascii.rest
              </a>{' '}
              by @Shubham
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/mission" className="hover:text-white transition">
              [execute mission]
            </Link>
            <Link href="/platform" className="hover:text-white transition">
              [enter platform]
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
