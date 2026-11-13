'use client';

import React, { useState } from 'react';
import { Filter, Star, Sparkles, ChevronRight, ShieldAlert, Cpu, Database } from 'lucide-react';

export interface OpportunityItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  gap: string;
  overallScore: number;
  confidenceScore: number;
  feasibilityScore: number;
  impactScore: number;
  citations: Array<{ id: string; pill: string; label: string }>;
  tags: string[];
}

interface DiscoveryFeedProps {
  opportunities: OpportunityItem[];
  onSelectOpportunity: (id: string) => void;
  onOpenEvidence: (id: string) => void;
}

export const DiscoveryFeed: React.FC<DiscoveryFeedProps> = ({
  opportunities,
  onSelectOpportunity,
  onOpenEvidence,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Domains' },
    { id: 'kv-cache', label: 'Memory & KV-Cache' },
    { id: 'distributed', label: 'Distributed Systems' },
    { id: 'kernels', label: 'GPU Kernels & Compilers' },
  ];

  const filteredOpps = opportunities.filter((opp) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'kv-cache') return opp.category.includes('Memory') || opp.category.includes('KV-Cache');
    if (selectedCategory === 'distributed') return opp.category.includes('Distributed');
    if (selectedCategory === 'kernels') return opp.category.includes('Kernel') || opp.category.includes('Compiler');
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Feed Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-light">
        <div>
          <h2 className="font-serif text-2xl font-normal text-ink-primary">
            Discovery Feed
          </h2>
          <p className="text-xs text-ink-tertiary">
            Real opportunity hypotheses ranked by verifiable empirical evidence density and market asymmetry.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-ink-primary text-white shadow-sm'
                  : 'bg-surface-light border border-hairline-light text-ink-secondary hover:text-ink-primary hover:bg-canvas-light'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities Card Stream */}
      <div className="space-y-4">
        {filteredOpps.map((opp) => (
          <div
            key={opp.id}
            className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile hover:border-hairline-dark/60 transition group cursor-pointer"
            onClick={() => onSelectOpportunity(opp.id)}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2.5 max-w-3xl">
                {/* Meta header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {opp.category}
                  </span>
                  {opp.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[10px] text-ink-tertiary bg-canvas-light px-2 py-0.5 rounded border border-hairline-light"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl font-normal text-ink-primary group-hover:text-indigo-600 transition">
                  {opp.title}
                </h3>

                {/* Plain-English Summary */}
                <p className="text-sm text-ink-secondary leading-relaxed font-sans">
                  {opp.summary}
                </p>

                {/* Citations Pill Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-ink-tertiary">
                    Verifiable Citations:
                  </span>
                  {opp.citations.map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEvidence(c.id);
                      }}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
                      title={c.label}
                    >
                      <span>{c.pill}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Score Column */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-hairline-light">
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-ink-primary">
                    {opp.overallScore}
                    <span className="text-xs text-ink-tertiary font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-tertiary">
                    Priority Score
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-mono text-ink-tertiary">
                  <span>Conf: {(opp.confidenceScore * 100).toFixed(0)}%</span>
                  <span>·</span>
                  <span>Feas: {(opp.feasibilityScore * 100).toFixed(0)}%</span>
                </div>

                <div className="inline-flex items-center space-x-1 text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition">
                  <span>Explore Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
