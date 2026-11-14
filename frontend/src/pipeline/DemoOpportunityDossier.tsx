'use client';

import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  ExternalLink,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { DemoOpportunity } from './pipelineData';

interface DemoOpportunityDossierProps {
  opportunity: DemoOpportunity;
  onBack: () => void;
  onOpenEvidence: (evidenceId: string) => void;
}

export const DemoOpportunityDossier: React.FC<DemoOpportunityDossierProps> = ({
  opportunity,
  onBack,
  onOpenEvidence,
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Discovery Overview</span>
        </button>

        {/* Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                {opportunity.category}
              </span>
              <span className="font-mono text-xs text-zinc-400">
                ID: {opportunity.id.toUpperCase()}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] uppercase font-semibold">
                Strategic Opportunity Hypothesis
              </span>
            </div>

            {/* Score Indicators */}
            <div className="flex items-center space-x-3 text-right">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Confidence</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {Math.round(opportunity.evidence_confidence * 100)}%
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Impact</span>
                <span className="font-mono text-xs font-semibold text-indigo-300">
                  {Math.round(opportunity.market_impact * 100)}%
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Feasibility</span>
                <span className="font-mono text-xs font-semibold text-cyan-300">
                  {Math.round(opportunity.technical_feasibility * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white leading-tight">
              {opportunity.title}
            </h1>
            <p className="text-base text-zinc-300 font-sans leading-relaxed">
              {opportunity.summary}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-xs font-mono text-zinc-400">Technical Tags:</span>
            {opportunity.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Structural Market Gap Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h3 className="font-serif text-xl font-normal text-white">
            Structural Market Gap & Negative Space Analysis
          </h3>
        </div>
        <p className="text-sm text-zinc-300 font-sans leading-relaxed">
          {opportunity.gap_analysis}
        </p>
      </div>

      {/* Verified Cryptographic Citations (Primary Evidence) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-serif text-xl font-normal text-white">
              Primary Source Citations & Verbatim Proof
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {opportunity.citations.length} Ground Truth Sources
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {opportunity.citations.map((cite) => (
            <div
              key={cite.id}
              className="p-5 rounded-2xl bg-[#0B0E1B] border border-white/10 hover:border-emerald-500/40 transition shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  {cite.pill}
                </span>
                <button
                  onClick={() => onOpenEvidence(cite.id)}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition"
                >
                  <span>Inspect Ground Evidence</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <blockquote className="border-l-2 border-emerald-500/40 pl-3 font-mono text-xs text-zinc-300 leading-relaxed italic bg-emerald-950/20 py-2 rounded-r-lg">
                "{cite.label}"
              </blockquote>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                <span className="truncate max-w-md">{cite.source_name || cite.source_type}</span>
                <span className="text-zinc-500">@{cite.author || 'verified'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Approach Solution */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h3 className="font-serif text-xl font-normal text-white">
            Proposed Technical Architecture Solution
          </h3>
        </div>
        <div className="space-y-2 text-sm text-zinc-300 font-sans leading-relaxed">
          {opportunity.technical_approach.map((step, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-indigo-400 font-mono text-xs mt-0.5">{idx + 1}.</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Empirical Validation Experiments */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="font-serif text-xl font-normal text-white">
            Empirical Validation Protocol (Benchmark Harness)
          </h3>
        </div>
        <div className="space-y-2 text-sm text-zinc-300 font-sans leading-relaxed">
          {opportunity.validation_experiments.map((exp, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">✓</span>
              <p>{exp}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
