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
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Feed Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="font-serif text-2xl font-normal text-white">
            Discovery Feed
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Real opportunity hypotheses ranked by verifiable empirical evidence density and market asymmetry.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition ${
                selectedCategory === cat.id
                  ? 'bg-white text-zinc-950 font-medium shadow-sm'
                  : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800'
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
            className="p-6 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl hover:border-indigo-400/50 hover:bg-[#0E1324] transition group cursor-pointer backdrop-blur-xl"
            onClick={() => onSelectOpportunity(opp.id)}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-3 max-w-3xl">
                {/* Meta header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                    {opp.category}
                  </span>
                  {opp.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-white/5"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl font-normal text-white group-hover:text-indigo-300 transition leading-snug">
                  {opp.title}
                </h3>

                {/* Plain-English Summary */}
                <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                  {opp.summary}
                </p>

                {/* Citations Pill Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    Verifiable Citations:
                  </span>
                  {opp.citations.map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEvidence(c.id);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 transition"
                      title={c.label}
                    >
                      <span>{c.pill}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Score Column */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-white">
                    {opp.overallScore}
                    <span className="text-xs text-zinc-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Priority Score
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-400">
                  <span>Conf: <strong className="text-emerald-400">{(opp.confidenceScore * 100).toFixed(0)}%</strong></span>
                  <span>·</span>
                  <span>Feas: <strong className="text-cyan-300">{(opp.feasibilityScore * 100).toFixed(0)}%</strong></span>
                </div>

                <div className="inline-flex items-center space-x-1 text-xs font-medium text-indigo-400 group-hover:translate-x-0.5 transition font-mono">
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
