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
} from 'lucide-react';
import { AsciiSkeletonCard } from './AsciiSkeletonCard';
import { ArgusAsciiTelemetry } from './ArgusAsciiTelemetry';

const SeamlessAsciiArt = dynamic(
  () => import('./SeamlessAsciiArt').then((m) => m.SeamlessAsciiArt),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 flex items-center justify-center font-mono text-xs text-ink-tertiary">
        [synthesizing procedural halftone canvas...]
      </div>
    ),
  }
);

interface LandingPageProps {
  onEnterPlatform: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterPlatform }) => {
  const [activeArtTab, setActiveArtTab] = useState<'saturn' | 'kyoto' | 'skeleton'>('saturn');
  const [demoSkeletonLines, setDemoSkeletonLines] = useState<number>(3);

  return (
    <div className="min-h-screen bg-canvas-light text-ink-primary font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Sticky Minimalist Header */}
      <header className="border-b border-hairline-light bg-surface-light/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-ink-primary text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm">
              A
            </div>
            <div>
              <span className="font-serif text-lg font-medium text-ink-primary tracking-tight">
                ARGUS
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-mono text-ink-tertiary">
                Evidence-Driven AI Platform
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <div className="hidden lg:block">
              <ArgusAsciiTelemetry />
            </div>

            <a
              href="https://ascii.rest"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-ink-tertiary hover:text-ink-primary transition hidden sm:inline"
            >
              [ascii.rest]
            </a>

            <Link
              href="/demo"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition shadow-sm group"
            >
              <span>Execute Mission</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>

            <button
              onClick={onEnterPlatform}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface-light border border-hairline-light text-ink-primary hover:bg-canvas-light text-xs font-medium transition shadow-sm"
            >
              <span>Mission Control</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24">
        {/* HERO SECTION — Juicy Style High-Impact Headline & Badges */}
        <section className="space-y-6 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>DISCOVER STRUCTURAL MARKET WHITESPACES IN AI INFRASTRUCTURE</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal text-ink-primary tracking-tight leading-[1.08]">
            The Autonomous AI Infrastructure Intelligence Engine.
          </h1>

          <p className="text-base sm:text-xl text-ink-secondary leading-relaxed font-sans max-w-3xl">
            ARGUS turns raw GitHub issues, runtime telemetry, profiling dumps, and ArXiv papers
            into verifiable, empirical opportunity hypotheses. Zero fabricated profiles. Zero
            hallucinated confidence scores. Every assertion links directly to primary sources.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-ink-primary text-white text-sm font-medium hover:bg-black transition shadow-sm group"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Execute Research Mission</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
            <button
              onClick={onEnterPlatform}
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-xl bg-surface-light border border-hairline-light text-ink-primary text-sm font-medium hover:bg-canvas-light transition shadow-sm group"
            >
              <span>Enter Mission Control</span>
            </button>
            <a
              href="#ascii-gallery"
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-xl bg-surface-light border border-hairline-light text-ink-secondary hover:text-ink-primary hover:bg-canvas-light transition text-sm font-mono"
            >
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>[interactive ascii studio]</span>
            </a>
          </div>

          {/* Micro stats ticker */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-hairline-light text-xs font-mono">
            <div>
              <span className="text-ink-tertiary block text-[10px] uppercase">Test Verification</span>
              <span className="text-sm font-semibold text-emerald-700">62/62 Passed (100%)</span>
            </div>
            <div>
              <span className="text-ink-tertiary block text-[10px] uppercase">Primary Provenance</span>
              <span className="text-sm font-semibold text-ink-primary">SHA-256 Hashed</span>
            </div>
            <div>
              <span className="text-ink-tertiary block text-[10px] uppercase">Multi-Tenancy</span>
              <span className="text-sm font-semibold text-ink-primary">PostgreSQL RLS</span>
            </div>
            <div>
              <span className="text-ink-tertiary block text-[10px] uppercase">Specialist Agents</span>
              <span className="text-sm font-semibold text-indigo-700">8 Temporal Engines</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE ASCII STUDIO SECTION — Featuring saturn-rise, kyoto-dusk, and skeleton */}
        <section id="ascii-gallery" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                  ASCII.REST SHOWCASE
                </span>
                <span className="text-xs font-mono text-ink-tertiary">
                  Tactile Procedural Halftone Renderers
                </span>
              </div>
              <h2 className="font-serif text-2xl font-normal text-ink-primary mt-1">
                Visual Telemetry & Ambient Art Studio
              </h2>
            </div>

            {/* Tab switchers */}
            <div className="inline-flex p-1 rounded-xl bg-surface-light border border-hairline-light shadow-sm text-xs font-mono">
              <button
                onClick={() => setActiveArtTab('saturn')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeArtTab === 'saturn'
                    ? 'bg-ink-primary text-white font-medium'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                ● saturn rise [200×100]
              </button>
              <button
                onClick={() => setActiveArtTab('kyoto')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeArtTab === 'kyoto'
                    ? 'bg-ink-primary text-white font-medium'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                ● kyoto dusk [200×100]
              </button>
              <button
                onClick={() => setActiveArtTab('skeleton')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeArtTab === 'skeleton'
                    ? 'bg-ink-primary text-white font-medium'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                ● skeleton [52×23]
              </button>
            </div>
          </div>

          {/* Curated Pieces Strip */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-tertiary">
            <span className="text-ink-secondary font-semibold mr-1">ascii.rest scenes:</span>
            {[
              { name: 'amer fort', url: 'https://ascii.rest/amer-fort/' },
              { name: 'aurora fjord', url: 'https://ascii.rest/aurora-fjord/' },
              { name: 'black prism', url: 'https://ascii.rest/black-prism/' },
              { name: 'cloud sea', url: 'https://ascii.rest/cloud-sea/' },
              { name: 'earthrise', url: 'https://ascii.rest/earthrise/' },
              { name: 'edge orbit', url: 'https://ascii.rest/edge-orbit/' },
              { name: 'tokyo rain', url: 'https://ascii.rest/tokyo-rain/' },
              { name: 'varanasi ghats', url: 'https://ascii.rest/varanasi-ghats/' },
            ].map((p, idx) => (
              <a
                key={idx}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded border border-hairline-light bg-surface-light hover:bg-canvas-light text-ink-tertiary hover:text-ink-primary transition"
              >
                {p.name} ↗
              </a>
            ))}
          </div>

          {/* Render Active Art Piece — Seamlessly blended, living colors, zero box frames */}
          <div className="w-full relative min-h-[360px] sm:min-h-[500px] flex items-center justify-center">
            {activeArtTab === 'saturn' && <SeamlessAsciiArt scene="saturn" />}
            {activeArtTab === 'kyoto' && <SeamlessAsciiArt scene="kyoto" />}
            {activeArtTab === 'skeleton' && (
              <div className="w-full py-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-md font-mono text-xs text-ink-secondary">
                  <div className="inline-block px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                    ui/skeleton • 52×23 • 24 fps
                  </div>
                  <h3 className="font-serif text-2xl text-ink-primary font-normal">
                    Tactile Zero-CLS Loading Shimmer
                  </h3>
                  <p className="text-ink-secondary font-sans leading-relaxed text-sm">
                    Exact implementation of the award-winning <code className="text-ink-primary font-mono bg-canvas-dark/5 px-1 py-0.5 rounded">skeleton.ts</code>{' '}
                    from ascii.rest. Sweeps a 24 FPS halftone gradient across card blocks, avatar circles,
                    and text paragraph lines without any heavy card borders.
                  </p>
                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      onClick={() => setDemoSkeletonLines(demoSkeletonLines === 3 ? 5 : 3)}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-light hover:bg-canvas-light text-ink-primary border border-hairline-light shadow-sm transition"
                    >
                      Toggle Lines ({demoSkeletonLines})
                    </button>
                  </div>
                </div>

                <div className="w-full max-w-md flex justify-center">
                  <AsciiSkeletonCard
                    lines={demoSkeletonLines}
                    image={true}
                    avatar={true}
                    className="w-full bg-transparent border-hairline-light text-ink-primary shadow-none"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* JUICY STYLE FEATURE GRID — 8 Specialist Engines in Editorial Cards */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-hairline-light pb-4">
            <div>
              <span className="font-mono text-xs text-indigo-700 uppercase tracking-wider font-semibold">
                Autonomous Research Fleet
              </span>
              <h2 className="font-serif text-3xl font-normal text-ink-primary mt-1">
                8 Specialist Intelligence Engines
              </h2>
            </div>
            <span className="font-mono text-xs text-ink-tertiary">
              Coordinated via Durable Temporal Workflows
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: '01',
                title: 'Company Scanner',
                desc: 'Mines SEC 10-K filings, enterprise pricing changes, and capital allocation patterns.',
                tag: 'Enterprise',
              },
              {
                id: '02',
                title: 'Open-Source Intel',
                desc: 'Surfaces developer bottlenecks, memory regressions, and issues from tier-1 runtimes.',
                tag: 'Codebases',
              },
              {
                id: '03',
                title: 'Research Scanner',
                desc: 'Indexes ArXiv preprints, algorithmic efficiency claims, and GPU kernel benchmarks.',
                tag: 'Literature',
              },
              {
                id: '04',
                title: 'Community Scanner',
                desc: 'Synthesizes authentic developer complaints and lock-in debates from Reddit and HackerNews.',
                tag: 'Friction',
              },
              {
                id: '05',
                title: 'Hiring Intelligence',
                desc: 'Analyzes technical requirements and cluster engineering team expansion patterns.',
                tag: 'Headcount',
              },
              {
                id: '06',
                title: 'Market Intelligence',
                desc: 'Tracks cloud GPU spot rates, cluster demand vs supply, and inference token pricing.',
                tag: 'Economics',
              },
              {
                id: '07',
                title: 'Architecture Extractor',
                desc: 'Normalizes systems into dataflow components, latency paths, and boundary graphs.',
                tag: 'Synthesis',
              },
              {
                id: '08',
                title: 'Negative Space Engine',
                desc: 'Isolates high-conviction product opportunities that market incumbents systematically ignore.',
                tag: 'Opportunity',
              },
            ].map((engine) => (
              <div
                key={engine.id}
                onClick={onEnterPlatform}
                className="p-5 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile hover:border-indigo-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-ink-tertiary mb-2">
                    <span className="font-semibold text-ink-secondary">engine/{engine.id}</span>
                    <span className="text-[10px] uppercase font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {engine.tag}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-medium text-ink-primary group-hover:text-indigo-600 transition">
                    {engine.title}
                  </h3>
                  <p className="text-xs text-ink-secondary mt-1 font-sans leading-relaxed">
                    {engine.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-hairline-light/60 flex items-center justify-between font-mono text-[11px] text-ink-tertiary">
                  <span>Temporal Activity</span>
                  <span className="text-indigo-600 group-hover:translate-x-0.5 transition">Explore →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PROOF OF WORK & EVIDENCE SKELETON DEMO */}
        <section className="p-8 sm:p-10 rounded-3xl bg-surface-light border border-hairline-light shadow-tactile grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              ZERO-FABRICATION GUARANTEE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink-primary">
              Empirical Proof vs. Synthetic Guesses
            </h2>
            <p className="text-sm text-ink-secondary leading-relaxed font-sans">
              Unlike generic LLM wrappers, ARGUS never answers from hallucinated training weights.
              Every single claim is bound to an exact character-offset span from authentic public records,
              validated by PostgreSQL row-level security and SHA-256 document version hashes.
            </p>

            <ul className="space-y-2 text-xs font-sans text-ink-secondary">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Primary source URLs with verbatim quote highlighting</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Separate argus_dispatcher role restricted to column-level updates</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Isolated LiteLLM virtual keys with hard dollar spend controls</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                onClick={onEnterPlatform}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition"
              >
                <span>Inspect Verified Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-ink-tertiary">
              <span>Real-Time Loading State Simulation</span>
              <span>ascii.rest/skeleton</span>
            </div>
            <AsciiSkeletonCard lines={4} image={false} avatar={true} className="w-full" />
          </div>
        </section>

        {/* FINAL CTA BANNER */}
        <section className="p-8 sm:p-12 rounded-3xl bg-ink-primary text-white text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Ready to unearth the next infrastructure breakthrough?
            </h2>
            <p className="text-sm sm:text-base text-ink-tertiary font-sans max-w-xl mx-auto">
              Launch a research mission against vLLM, SGLang, and Triton to discover disaggregated
              KV-cache tiering opportunities with verified provenance.
            </p>
            <div className="pt-4 flex justify-center">
              <button
                onClick={onEnterPlatform}
                className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-white text-ink-primary hover:bg-canvas-light transition font-medium text-sm shadow-md group"
              >
                <span>Launch ARGUS Platform</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition text-ink-primary" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline-light bg-surface-light py-8 text-xs font-mono text-ink-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-ink-primary">ARGUS v0.3.0</span>
            <span>·</span>
            <span>PostgreSQL 16 RLS Protected</span>
            <span>·</span>
            <span>
              ASCII pieces from{' '}
              <a
                href="https://ascii.rest"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                ascii.rest
              </a>{' '}
              by @Shubham
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={onEnterPlatform} className="hover:text-ink-primary transition">
              [enter platform]
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
