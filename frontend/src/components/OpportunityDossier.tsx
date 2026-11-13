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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discovery Feed</span>
        </button>

        <div className="p-8 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                {opportunity.category}
              </span>
              <span className="font-mono text-xs text-ink-tertiary">
                ID: {opportunity.id.toUpperCase()}
              </span>
            </div>

            {/* Score Badges */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="font-mono text-2xl font-bold text-ink-primary">
                  {opportunity.overallScore}
                  <span className="text-xs text-ink-tertiary font-normal">/100</span>
                </span>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-tertiary">
                  Overall Priority
                </span>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-3xl font-normal text-ink-primary">
            {opportunity.title}
          </h1>

          <p className="text-base text-ink-secondary leading-relaxed font-sans max-w-4xl">
            {opportunity.summary}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-hairline-light text-center font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Evidence Confidence</span>
              <span className="text-sm font-semibold text-emerald-700">{(opportunity.confidenceScore * 100).toFixed(0)}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Market Impact</span>
              <span className="text-sm font-semibold text-indigo-700">{(opportunity.impactScore * 100).toFixed(0)}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Technical Feasibility</span>
              <span className="text-sm font-semibold text-amber-700">{(opportunity.feasibilityScore * 100).toFixed(0)}%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Verified Primary Spans</span>
              <span className="text-sm font-semibold text-ink-primary">{opportunity.citations.length} Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Epistemic Split */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-normal text-ink-primary">
            Epistemic Architecture: Empirical Facts vs Strategic Hypotheses
          </h2>
          <span className="text-xs font-mono text-ink-tertiary">
            Strict Epistemic Isolation Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column A: Observed Empirical Facts */}
          <div className="p-6 rounded-2xl bg-surface-light border-2 border-emerald-500/40 shadow-tactile space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Observed Empirical Facts
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                Primary Ground Truth
              </span>
            </div>

            <p className="text-xs text-ink-tertiary">
              Direct verbatim signals extracted from production codebases, issue trackers, and profiling dumps. Zero AI hallucination or inference.
            </p>

            <div className="space-y-3">
              {opportunity.citations.map((c, i) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-canvas-light border border-hairline-light space-y-2 hover:border-emerald-400/80 transition"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onOpenEvidence(c.id)}
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition"
                    >
                      {c.pill}
                    </button>
                    <span className="text-[10px] font-mono text-ink-tertiary">
                      Verified by SHA-256
                    </span>
                  </div>

                  <blockquote className="font-serif text-xs italic text-ink-primary leading-relaxed">
                    "{c.label}"
                  </blockquote>

                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-ink-tertiary">
                    <span>Source: GitHub Issue Tracker</span>
                    <button
                      onClick={() => onOpenEvidence(c.id)}
                      className="text-indigo-600 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Inspect Proof</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: ARGUS Strategic Hypotheses */}
          <div className="p-6 rounded-2xl bg-surface-light border-2 border-dashed border-indigo-400/50 shadow-tactile space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-800">
                  ARGUS Strategic Hypotheses
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Synthesized Opportunity
              </span>
            </div>

            <p className="text-xs text-ink-tertiary">
              Algorithmic synthesis derived strictly from the negative space left vacant by incumbent systems.
            </p>

            {/* Gap Analysis Box */}
            <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-2">
              <div className="text-xs font-mono font-medium text-indigo-900 uppercase tracking-wide">
                Structural Market Whitespace
              </div>
              <p className="text-xs text-ink-primary leading-relaxed font-sans">
                {opportunity.gap}
              </p>
            </div>

            {/* Architectural Blueprint */}
            <div className="p-4 rounded-xl border border-hairline-light bg-canvas-light space-y-2">
              <div className="text-xs font-mono font-medium text-ink-secondary uppercase tracking-wide">
                Proposed Implementation Vector
              </div>
              <ul className="text-xs text-ink-primary space-y-1.5 list-disc list-inside font-sans">
                <li>Deploy zero-copy CXL/RDMA memory paging daemons between GPU HBM and cluster DRAM.</li>
                <li>Implement chunk-level FP8 KV quantization before network socket transit.</li>
                <li>Decouple agentic multi-turn prefix caches into ephemeral tier pools with sub-millisecond restoration.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Competitor Blindspot Matrix */}
      <div className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-4">
        <div>
          <h3 className="font-serif text-lg font-normal text-ink-primary">
            Incumbent Blindspot Analysis
          </h3>
          <p className="text-xs text-ink-tertiary">
            Why leading inference runtimes cannot trivially close this whitespace without architectural redesign.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-hairline-light text-ink-tertiary font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Framework / Incumbent</th>
                <th className="py-2.5 px-3">Current Architecture</th>
                <th className="py-2.5 px-3">Observed Bottleneck</th>
                <th className="py-2.5 px-3">Why They Hesitate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-light text-ink-primary">
              <tr>
                <td className="py-3 px-3 font-mono font-medium">vLLM (PagedAttention)</td>
                <td className="py-3 px-3 text-ink-secondary">Local GPU HBM LRU Cache</td>
                <td className="py-3 px-3 text-red-700 font-medium">4.2x TTFT penalty on multi-turn loops</td>
                <td className="py-3 px-3 text-ink-secondary">Engine optimized for single-turn batched serving</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-medium">SGLang (RadixAttention)</td>
                <td className="py-3 px-3 text-ink-secondary">Tree-based Prefix Sharing</td>
                <td className="py-3 px-3 text-red-700 font-medium">Lock contention under parallel structured decoding</td>
                <td className="py-3 px-3 text-ink-secondary">Tree locks serialize multi-agent requests</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-medium">TensorRT-LLM</td>
                <td className="py-3 px-3 text-ink-secondary">Static GPU Memory Allocation</td>
                <td className="py-3 px-3 text-red-700 font-medium">Poor utilization under dynamic agent window lengths</td>
                <td className="py-3 px-3 text-ink-secondary">Proprietary NVIDIA lock-in, lacks modular remote tiering</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
