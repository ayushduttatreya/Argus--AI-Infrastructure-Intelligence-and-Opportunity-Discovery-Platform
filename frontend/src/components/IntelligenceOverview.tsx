'use client';

import React from 'react';
import {
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Database,
  Search,
  Activity,
  Terminal,
} from 'lucide-react';
import { OpportunityItem } from './DiscoveryFeed';

interface IntelligenceOverviewProps {
  onOpenEvidence: (evidenceId: string) => void;
  onSelectOpportunity: (opportunityId: string) => void;
  onStartMission: () => void;
  opportunities: OpportunityItem[];
}

export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({
  onOpenEvidence,
  onSelectOpportunity,
  onStartMission,
  opportunities,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Mission Launcher */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-5 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-xs font-mono font-medium text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
            <span>DISPATCH #04 — AI INFERENCE INFRASTRUCTURE</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-white leading-tight">
            The Disaggregation Whitespace: Why KV-Cache Bottlenecks Are Stalling Production Agent Fleets
          </h1>

          <p className="text-base text-zinc-300 leading-relaxed font-sans">
            Analysis of 18,400+ runtime tokens and GitHub issue threads across{' '}
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-white">
              vllm-project/vllm
            </span>{' '}
            and{' '}
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-white">
              sgl-project/sglang
            </span>{' '}
            reveals an acute structural breakdown: multi-turn agent conversations cause up to{' '}
            <strong className="text-emerald-400 font-semibold">4.2x TTFT latency degradation</strong> due to GPU HBM prefix cache thrashing{' '}
            <button
              onClick={() => onOpenEvidence('evid-5480')}
              className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition"
            >
              [EVID-5480]
            </button>
            . Meanwhile, disaggregating prefill nodes exhausts 100GbE NIC bandwidth{' '}
            <button
              onClick={() => onOpenEvidence('evid-6122')}
              className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition"
            >
              [EVID-6122]
            </button>
            .
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectOpportunity('opp-1')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-medium hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.25)]"
            >
              <span>Inspect Prime Opportunity: KV-Cache Tiering</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-950" />
            </button>
            <button
              onClick={onStartMission}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-full bg-zinc-900 border border-white/15 text-zinc-200 text-xs font-medium hover:bg-zinc-800 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure Target Scope</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Market Space</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
              High Conviction
            </span>
          </div>
          <div className="font-serif text-3xl font-normal text-white">Disaggregated Memory</div>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            GPU HBM limits make local prefix caching infeasible beyond 8 dialogue turns. CXL/NVMe offload tiering is open whitespace.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Primary Evidence</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold">
              SHA-256 Hashed
            </span>
          </div>
          <div className="font-serif text-3xl font-normal text-emerald-400">100% Verifiable</div>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Zero hallucinated confidence metrics. Every claim links to primary source character-offsets and GitHub issue threads.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Active Hypotheses</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/50 font-semibold">
              Live Feed
            </span>
          </div>
          <div className="font-serif text-3xl font-normal text-white">3 Opportunities</div>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Ranked by structural gap size, competitive defensibility, and Triton/CUDA technical implementation feasibility.
          </p>
        </div>
      </div>

      {/* Featured Strategic Hypotheses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-serif text-2xl font-normal text-white">
            Top Discovered Opportunities
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            Ranked by Empirical Conviction
          </span>
        </div>

        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity(opp.id)}
              className="p-6 rounded-3xl bg-[#090C16]/90 border border-white/10 hover:border-indigo-400/50 hover:bg-[#0E1324] transition cursor-pointer shadow-xl backdrop-blur-xl space-y-4 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                    {opp.category}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">ID: {opp.id.toUpperCase()}</span>
                </div>
                <div className="flex items-center space-x-3 font-mono text-xs">
                  <span className="text-zinc-400">Score: <strong className="text-white">{opp.overallScore}</strong>/100</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">Confidence: <strong className="text-emerald-400">{Math.round(opp.confidenceScore * 100)}%</strong></span>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-xl font-normal text-white group-hover:text-indigo-300 transition leading-snug">
                  {opp.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 font-sans mt-1.5 leading-relaxed">
                  {opp.summary}
                </p>
              </div>

              {/* Citations Preview */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                <span className="text-xs font-mono text-zinc-500">Supporting Evidence:</span>
                {opp.citations.map((cite) => (
                  <button
                    key={cite.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEvidence(cite.id);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition"
                  >
                    <span>{cite.pill}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
