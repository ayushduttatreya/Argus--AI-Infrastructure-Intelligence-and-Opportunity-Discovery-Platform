'use client';

import React from 'react';
import { Compass, Sparkles, TrendingUp, Cpu, Server, Layers, ArrowUpRight } from 'lucide-react';
import { ArgusAsciiSkeleton } from './ArgusAsciiSkeleton';

interface IntelligenceOverviewProps {
  onOpenEvidence: (evidenceId: string) => void;
  onSelectOpportunity: (opportunityId: string) => void;
  onStartMission: () => void;
}

export const IntelligenceOverview: React.FC<IntelligenceOverviewProps> = ({
  onOpenEvidence,
  onSelectOpportunity,
  onStartMission,
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner / Mission Launcher */}
      <div className="p-8 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono font-medium text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>DISPATCH #04 — AI INFERENCE INFRASTRUCTURE</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink-primary leading-tight">
            The Disaggregation Whitespace: Why KV-Cache Bottlenecks Are Stalling Production Agent Fleets
          </h1>

          <p className="text-base text-ink-secondary leading-relaxed font-sans">
            Analysis of 18,400+ runtime tokens and GitHub issue threads across{' '}
            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-canvas-light text-ink-primary">
              vllm-project/vllm
            </span>{' '}
            and{' '}
            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-canvas-light text-ink-primary">
              sgl-project/sglang
            </span>{' '}
            reveals an acute structural breakdown: multi-turn agent conversations cause up to{' '}
            <strong>4.2x TTFT latency degradation</strong> due to GPU HBM prefix cache thrashing{' '}
            <button
              onClick={() => onOpenEvidence('evid-5480')}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
            >
              [EVID-5480]
            </button>
            . Meanwhile, disaggregating prefill nodes exhausts 100GbE NIC bandwidth{' '}
            <button
              onClick={() => onOpenEvidence('evid-6122')}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
            >
              [EVID-6122]
            </button>
            .
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectOpportunity('opp-1')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition shadow-sm"
            >
              <span>Inspect Prime Opportunity: KV-Cache Tiering</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onStartMission}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-canvas-light border border-hairline-light text-ink-primary text-xs font-medium hover:bg-hairline-light/40 transition"
            >
              <Compass className="w-3.5 h-3.5 text-ink-secondary" />
              <span>Launch Custom Research Mission</span>
            </button>
          </div>
        </div>
      </div>

      {/* Negative Space Matrix: Incumbents vs Reality */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-normal text-ink-primary">
              Negative Space Matrix
            </h2>
            <p className="text-xs text-ink-tertiary">
              Comparing incumbent industry engineering roadmaps against unaddressed developer friction.
            </p>
          </div>
          <span className="font-mono text-xs text-ink-tertiary">
            Coverage: 3 Open-Source Tier-1 Runtimes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-5 rounded-xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-ink-tertiary">
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>vLLM (PagedAttention)</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Score: 90/100
              </span>
            </div>
            <div>
              <div className="text-xs text-ink-tertiary uppercase tracking-wider font-mono">
                Incumbent Blindspot
              </div>
              <div className="text-sm font-medium text-ink-primary mt-0.5">
                LRU Eviction Spikes on Agentic Turns
              </div>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed font-sans">
              PagedAttention assumes requests finish linearly. When autonomous agents issue 5+ turns with seconds of think-time in between, intermediate blocks are discarded, forcing repeated expensive prefill recalculations.
            </p>
            <div className="pt-2 border-t border-hairline-light flex items-center justify-between text-[11px] font-mono">
              <button
                onClick={() => onOpenEvidence('evid-5480')}
                className="text-emerald-700 hover:underline"
              >
                [EVID-5480] Issue #5480
              </button>
              <span className="text-ink-tertiary">4.2x TTFT penalty</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-ink-tertiary">
              <span className="flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-500" />
                <span>Distributed Prefill/Decode</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Score: 88/100
              </span>
            </div>
            <div>
              <div className="text-xs text-ink-tertiary uppercase tracking-wider font-mono">
                Incumbent Blindspot
              </div>
              <div className="text-sm font-medium text-ink-primary mt-0.5">
                NIC Buffer Saturation via Raw Tensors
              </div>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed font-sans">
              Separating prompt compute from token generation sounds great on paper, but transferring 2.5 GB of raw KV-cache tensors per sequence over 100GbE networks exhausts cluster bandwidth, accounting for 42% of latency.
            </p>
            <div className="pt-2 border-t border-hairline-light flex items-center justify-between text-[11px] font-mono">
              <button
                onClick={() => onOpenEvidence('evid-6122')}
                className="text-emerald-700 hover:underline"
              >
                [EVID-6122] Issue #6122
              </button>
              <span className="text-ink-tertiary">42% transit overhead</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-ink-tertiary">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Speculative Decoding</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Score: 88/100
              </span>
            </div>
            <div>
              <div className="text-xs text-ink-tertiary uppercase tracking-wider font-mono">
                Incumbent Blindspot
              </div>
              <div className="text-sm font-medium text-ink-primary mt-0.5">
                Tree Verification Memory Fragmentation
              </div>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed font-sans">
              Draft verification trees generate non-contiguous block allocations. When speculative branch candidates are rejected, dead pages cannot be reclaimed until termination, generating 35% memory bloat in 32k contexts.
            </p>
            <div className="pt-2 border-t border-hairline-light flex items-center justify-between text-[11px] font-mono">
              <button
                onClick={() => onOpenEvidence('evid-7331')}
                className="text-emerald-700 hover:underline"
              >
                [EVID-7331] Issue #7331
              </button>
              <span className="text-ink-tertiary">35% memory waste</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Telemetry & Live Pipeline Status */}
      <div className="p-6 rounded-xl bg-surface-light border border-hairline-light shadow-tactile flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-ink-tertiary">
            Continuous Intelligence Stream
          </div>
          <div className="text-sm font-medium text-ink-primary">
            Tracking 8 Specialist Engines against GitHub, ArXiv, and Developer Signals
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs font-mono text-emerald-700 font-semibold">
              0 Unverified Claims
            </div>
            <div className="text-[11px] text-ink-tertiary font-mono">
              100% Provenance Attributed
            </div>
          </div>
          <ArgusAsciiSkeleton lines={2} className="w-36 hidden sm:block" />
        </div>
      </div>
    </div>
  );
};
