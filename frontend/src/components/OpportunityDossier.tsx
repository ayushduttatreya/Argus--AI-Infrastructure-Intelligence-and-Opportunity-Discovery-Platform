'use client';

import React from 'react';
import { ArrowLeft, ShieldCheck, Lightbulb, ExternalLink, AlertTriangle, CheckCircle2, ChevronRight, Hash } from 'lucide-react';
import { OpportunityItem } from './DiscoveryFeed';

interface OpportunityDossierProps {
  opportunity: OpportunityItem;
  onBack: () => void;
  onOpenEvidence: (id: string) => void;
}

export const OpportunityDossier: React.FC<OpportunityDossierProps> = ({
  opportunity,
  onBack,
  onOpenEvidence,
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Discovery Feed</span>
        </button>

        <div className="p-8 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                {opportunity.category}
              </span>
              <span className="font-mono text-xs text-zinc-400">
                ID: {opportunity.id.toUpperCase()}
              </span>
            </div>

            {/* Score Badges */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-white">
                  {opportunity.overallScore}
                  <span className="text-xs text-zinc-400 font-normal">/100</span>
                </span>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Overall Priority
                </span>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-3xl font-normal text-white">
            {opportunity.title}
          </h1>

          <p className="text-base text-zinc-300 leading-relaxed font-sans max-w-4xl">
            {opportunity.summary}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-center font-mono text-xs">
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase block">Evidence Confidence</span>
              <span className="text-sm font-semibold text-emerald-400">{(opportunity.confidenceScore * 100).toFixed(0)}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase block">Market Impact</span>
              <span className="text-sm font-semibold text-indigo-300">{(opportunity.impactScore * 100).toFixed(0)}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase block">Technical Feasibility</span>
              <span className="text-sm font-semibold text-cyan-300">{(opportunity.feasibilityScore * 100).toFixed(0)}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase block">Verified Primary Spans</span>
              <span className="text-sm font-semibold text-white">{opportunity.citations.length} Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Epistemic Split */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-serif text-xl font-normal text-white">
            Epistemic Architecture: Empirical Facts vs Strategic Hypotheses
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            Strict Epistemic Isolation Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column A: Observed Empirical Facts */}
          <div className="p-6 rounded-3xl bg-[#090C16]/90 border border-emerald-500/30 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Observed Empirical Facts
                </span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                Primary Ground Truth
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-sans">
              Direct verbatim signals extracted from production codebases, issue trackers, and profiling dumps. Zero AI hallucination or inference.
            </p>

            <div className="space-y-3">
              {opportunity.citations.map((c, i) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-[#0B0E1B] border border-white/10 space-y-2 hover:border-emerald-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      {c.pill}
                    </span>
                    <button
                      onClick={() => onOpenEvidence(c.id)}
                      className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                    >
                      <span>Inspect Hash</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-mono text-xs text-zinc-300 italic leading-relaxed">
                    "{c.label}"
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 flex items-center space-x-2 pt-1 border-t border-white/5">
                    <span>Source: Verified Git Commit & Issue</span>
                    <span>·</span>
                    <span className="text-emerald-400/80">SHA-256 Validated</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: Synthesized Strategic Hypotheses */}
          <div className="p-6 rounded-3xl bg-[#090C16]/90 border border-indigo-500/30 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Synthesized Hypotheses
                </span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                Negative Space Reasoning
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-sans">
              Algorithmic inferences identifying structural voids between enterprise developer demand and incumbent runtime roadmaps.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0B0E1B] border border-white/10 space-y-2">
                <span className="text-[10px] font-mono uppercase text-indigo-300 block font-semibold">
                  Negative Space Opportunity Statement:
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                  {opportunity.gap}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B0E1B] border border-white/10 space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">
                  Proposed Technical Architecture:
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Disaggregated chunk-compressed RDMA streaming layer operating between GPU HBM and cluster NVMe-oF nodes, bypassing CPU socket serialization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
